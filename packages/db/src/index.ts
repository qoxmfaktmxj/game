import { randomUUID } from "node:crypto";
import {
  access,
  mkdir,
  readFile,
  open,
  rename,
  readdir,
} from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import { GAME_CATALOG, isGameKey, type GameKey } from "@moyeotable/game-core/catalog";
import { validateGame, type GameSnapshot, type GameResultMap } from "@moyeotable/game-core/multigame";
import type {
  CommandAck,
  TableView,
} from "@moyeotable/contracts";

export interface Receipt {
  payloadHash: string;
  response: CommandAck;
}
interface SessionMetadata {
  id: string;
  rulesVersion: string;
  contentVersion: string;
  schemaVersion: number;
  startedAt: string;
  finishedAt: string | null;
}
export type StoredSession = SessionMetadata & GameSnapshot;
export type HistoryEntry = {
  [K in GameKey]: { gameKey: K; sessionId: string; result: GameResultMap[K]; finishedAt: string }
}[GameKey];
export interface TableRecord {
  schemaVersion: 1;
  ownerEpoch: number;
  table: Omit<TableView, "members"> & {
    members: Omit<TableView["members"][number], "connected">[];
  };
  invite: { tokenHash: string; expiresAt: number; remainingUses: number };
  session: StoredSession | null;
  history: HistoryEntry[];
  receipts: Record<string, Receipt>;
}
export class PersistenceConflict extends Error {}
export interface TableRepository {
  checkHealth(): Promise<void>;
  create(record: TableRecord): Promise<void>;
  read(id: string): Promise<TableRecord | null>;
  listByUser(userId: string): Promise<TableRecord[]>;
  /** Atomic compare-and-swap. All snapshots, receipts and results commit together. */
  commit(
    record: TableRecord,
    expectedRevision: number,
    expectedEpoch: number,
  ): Promise<void>;
  close(): Promise<void>;
}
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function filename(id: string) {
  if (!uuidPattern.test(id)) throw new Error("Invalid table id");
  return `${id}.json`;
}
function plain(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function failSnapshot(): never {
  throw new Error("Unsupported or damaged table snapshot");
}
/** Decodes old Star snapshots explicitly; no read ever rewrites the file. */
export function decodeTableRecord(value: unknown): TableRecord {
  if (!plain(value) || !plain(value.table) || !plain(value.invite) || !plain(value.receipts) || !Array.isArray(value.history)) failSnapshot();
  const item = value;
  const table = value.table;
  if (
    item.schemaVersion !== 1 || typeof table.id !== "string" || !uuidPattern.test(table.id) ||
    !Number.isSafeInteger(table.revision) || (table.revision as number) < 0 ||
    !Number.isSafeInteger(item.ownerEpoch) || (item.ownerEpoch as number) < 1 ||
    !isGameKey(table.gameKey) || !Array.isArray(table.members) ||
    typeof table.title !== "string" || !table.title.trim() || table.title.length > 40 ||
    typeof table.hostId !== "string" || typeof table.createdAt !== "string" ||
    !["LOBBY", "PLAYING", "RESULT"].includes(String(table.status))
  ) failSnapshot();
  const members = table.members;
  if (members.length > GAME_CATALOG[table.gameKey].maxPlayers || members.some((member) =>
    !plain(member) || typeof member.userId !== "string" || !member.userId ||
    typeof member.nickname !== "string" || !Number.isSafeInteger(member.seat) ||
    (member.seat as number) < 0 || typeof member.ready !== "boolean" ||
    member.control !== undefined && member.control !== "human" && member.control !== "bot")) failSnapshot();
  if (new Set(members.map((member) => member.userId)).size !== members.length ||
    new Set(members.map((member) => member.seat)).size !== members.length ||
    (members.length && !members.some((member) => member.userId === table.hostId && member.control !== "bot"))) failSnapshot();
  if (typeof value.invite.tokenHash !== "string" || !/^[a-f0-9]{64}$/i.test(value.invite.tokenHash) ||
    !Number.isSafeInteger(value.invite.expiresAt) || !Number.isSafeInteger(value.invite.remainingUses) ||
    (value.invite.remainingUses as number) < 0) failSnapshot();
  let session: StoredSession | null = null;
  if (item.session !== null) {
    if (!plain(item.session)) failSnapshot();
    const stored = item.session;
    // Only legacy Star records omitted their session discriminator.
    const gameKey = stored.gameKey === undefined && table.gameKey === "star-trails" ? "star-trails" : stored.gameKey;
    if (gameKey !== table.gameKey || typeof stored.id !== "string" || !uuidPattern.test(stored.id) ||
      table.sessionId !== stored.id || typeof stored.startedAt !== "string" ||
      !(stored.finishedAt === null || typeof stored.finishedAt === "string")) failSnapshot();
    const snapshot = validateGame({
      gameKey, state: stored.state, result: stored.result,
      rulesVersion: stored.rulesVersion, contentVersion: stored.contentVersion, schemaVersion: stored.schemaVersion,
    });
    if (snapshot.state.playerIds.length !== members.length ||
      snapshot.state.playerIds.some((playerId: string) => !members.some((member) => member.userId === playerId)) ||
      (snapshot.result ? table.status !== "RESULT" || stored.finishedAt === null : table.status !== "PLAYING" || stored.finishedAt !== null)) failSnapshot();
    session = {
      ...snapshot, id: stored.id, rulesVersion: stored.rulesVersion as string,
      contentVersion: stored.contentVersion as string, schemaVersion: stored.schemaVersion as number,
      startedAt: stored.startedAt, finishedAt: stored.finishedAt,
    };
  } else if (table.sessionId !== null || table.status !== "LOBBY") failSnapshot();
  const history: HistoryEntry[] = value.history.map((entry: unknown) => {
    if (!plain(entry)) failSnapshot();
    const gameKey = entry.gameKey === undefined ? "star-trails" : entry.gameKey;
    if (!isGameKey(gameKey) || typeof entry.sessionId !== "string" || !uuidPattern.test(entry.sessionId) ||
      typeof entry.finishedAt !== "string" || !plain(entry.result) ||
      !Array.isArray(entry.result.winners) || entry.result.winners.some((winner) => typeof winner !== "string") ||
      typeof entry.result.tied !== "boolean" || typeof entry.result.reason !== "string" ||
      !Array.isArray(entry.result.scores) || entry.result.scores.some((score) =>
        !plain(score) || typeof score.playerId !== "string" || typeof score.total !== "number" || !Number.isFinite(score.total))) failSnapshot();
    // History is server-only and has no private game state. Current-session
    // results above are fully recomputed by the corresponding engine.
    return { ...entry, gameKey } as HistoryEntry;
  });
  for (const receipt of Object.values(value.receipts)) {
    if (!plain(receipt) || typeof receipt.payloadHash !== "string" || !plain(receipt.response) ||
      typeof receipt.response.commandId !== "string" || receipt.response.status !== "accepted") failSnapshot();
  }
  // The explicit checks establish the stable aggregate shape. Session variants
  // themselves are returned by the exhaustive, game-specific decoder.
  return { ...value, table: { ...table, members: members.map((member) => ({ ...member, control: member.control ?? "human" })) }, session, history } as TableRecord;
}

/** Local development only. A single server process owns this directory. */
export class JsonTableRepository implements TableRepository {
  constructor(
    readonly directory: string,
    private readonly beforeCommit?: () => void | Promise<void>,
  ) {}
  async checkHealth() {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    await access(this.directory, constants.R_OK | constants.W_OK);
  }
  async create(record: TableRecord) {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const target = join(this.directory, filename(record.table.id));
    const handle = await open(target, "wx", 0o600);
    try {
      await handle.writeFile(JSON.stringify(record));
      await handle.sync();
    } finally {
      await handle.close();
    }
  }
  async read(id: string) {
    try {
      return decodeTableRecord(
        JSON.parse(await readFile(join(this.directory, filename(id)), "utf8")),
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
  async listByUser(userId: string) {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const files = (await readdir(this.directory)).filter(
      (name) =>
        uuidPattern.test(name.replace(/\.json$/, "")) && name.endsWith(".json"),
    );
    const records = await Promise.all(
      files.map((name) => this.read(name.slice(0, -5))),
    );
    return records.filter(
      (item): item is TableRecord =>
        !!item?.table.members.some((member) => member.userId === userId),
    );
  }
  async commit(
    record: TableRecord,
    expectedRevision: number,
    expectedEpoch: number,
  ) {
    const current = await this.read(record.table.id);
    if (
      !current ||
      current.table.revision !== expectedRevision ||
      current.ownerEpoch !== expectedEpoch
    )
      throw new PersistenceConflict();
    await this.beforeCommit?.();
    const target = join(this.directory, filename(record.table.id));
    const temporary = `${target}.${randomUUID()}.tmp`;
    const handle = await open(temporary, "wx", 0o600);
    try {
      await handle.writeFile(JSON.stringify(record));
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporary, target);
  }
  async close() {}
}

/** Server-only PostgreSQL adapter. Do not bundle this package in the web app. */
export interface PostgresOptions {
  sslMode?: "verify-full" | "disable";
  sslCa?: string;
  poolSize?: number;
  /** Opt-in for a DB reachable only over an isolated private/container network. */
  allowPrivateNetwork?: boolean;
}
function privateDatabaseHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  // Docker service names are single DNS labels. Dotted public names are never
  // accepted through this exception, even if their current DNS resolves private.
  if (/^[a-z][a-z0-9-]*$/.test(host)) return true;
  if (/^\[(?:fc|fd)[0-9a-f:]+\]$/.test(host)) return true;
  const octets = host.split(".").map(Number);
  return octets.length === 4 && octets.every((value) => Number.isInteger(value) && value >= 0 && value <= 255) &&
    (octets[0] === 10 || octets[0] === 172 && octets[1]! >= 16 && octets[1]! <= 31 || octets[0] === 192 && octets[1] === 168);
}
export function postgresConnectionOptions(
  connectionString: string,
  options: PostgresOptions = {},
) {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new Error("DATABASE_URL must use the postgres protocol");
  // pg connection-string SSL options override the explicit ssl object. Keep
  // one source of truth so a URL cannot silently disable certificate checks.
  if ([...url.searchParams.keys()].some((key) => key.startsWith("ssl")))
    throw new Error(
      "Remove SSL options from DATABASE_URL; use DATABASE_SSL_MODE and DATABASE_SSL_CA",
    );
  if ([...url.searchParams.keys()].some((key) => ["host", "hostaddr", "port"].includes(key.toLowerCase())))
    throw new Error("DATABASE_URL must specify its host and port in the URL authority, without query overrides");
  if ([...url.searchParams.keys()].some((key) => key !== "application_name"))
    throw new Error("DATABASE_URL supports only the application_name query parameter; configure connection options explicitly");
  const sslMode = options.sslMode ?? "verify-full";
  if (sslMode !== "verify-full" && sslMode !== "disable")
    throw new Error("DATABASE_SSL_MODE must be verify-full or disable");
  if (
    sslMode === "disable" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
    !(options.allowPrivateNetwork === true && privateDatabaseHost(url.hostname))
  )
    throw new Error(
      "Disabling database TLS requires loopback or an explicitly trusted private network",
    );
  const max = options.poolSize ?? 5;
  if (!Number.isSafeInteger(max) || max < 1 || max > 20)
    throw new Error("DATABASE_POOL_SIZE must be an integer from 1 to 20");
  return {
    connectionString,
    max,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    statement_timeout: 10_000,
    query_timeout: 12_000,
    ssl:
      sslMode === "disable"
        ? (false as const)
        : {
            rejectUnauthorized: true,
            ...(options.sslCa
              ? { ca: options.sslCa.replace(/\\n/g, "\n") }
              : {}),
          },
    application_name: "ringuringu-game",
  };
}
export class PostgresTableRepository implements TableRepository {
  private readonly pool: Pool;
  constructor(connectionString: string, options: PostgresOptions = {}) {
    this.pool = new Pool(postgresConnectionOptions(connectionString, options));
    this.pool.on("error", () => {
      // An idle connection can fail after a network interruption. pg removes
      // it from the pool; never log connection strings, SQL or private state.
      console.error(
        "Database idle connection lost; the next request will reconnect.",
      );
    });
  }
  async checkHealth() {
    const { rows } = await this.pool.query<{ ready: boolean }>(
      `SELECT has_table_privilege(current_user, 'game_private.table_aggregates', 'SELECT')
        AND has_table_privilege(current_user, 'game_private.table_aggregates', 'INSERT')
        AND has_table_privilege(current_user, 'game_private.table_aggregates', 'UPDATE') AS ready`,
    );
    if (rows[0]?.ready !== true)
      throw new Error("Database runtime role is missing table permissions");
    await this.pool.query(
      "SELECT 1 FROM game_private.table_aggregates LIMIT 0",
    );
  }
  async create(record: TableRecord) {
    await this.pool.query(
      "INSERT INTO game_private.table_aggregates(id,revision,owner_epoch,document) VALUES($1,$2,$3,$4::jsonb)",
      [
        record.table.id,
        record.table.revision,
        record.ownerEpoch,
        JSON.stringify(record),
      ],
    );
  }
  async read(id: string) {
    const { rows } = await this.pool.query<{ document: unknown }>(
      "SELECT document FROM game_private.table_aggregates WHERE id=$1",
      [id],
    );
    return rows[0] ? decodeTableRecord(rows[0].document) : null;
  }
  async listByUser(userId: string) {
    const { rows } = await this.pool.query<{ document: unknown }>(
      "SELECT document FROM game_private.table_aggregates WHERE document->'table'->'members' @> $1::jsonb ORDER BY updated_at DESC LIMIT 100",
      [JSON.stringify([{ userId }])],
    );
    return rows.map((row) => decodeTableRecord(row.document));
  }
  async commit(
    record: TableRecord,
    expectedRevision: number,
    expectedEpoch: number,
  ) {
    const connection = await this.pool.connect();
    try {
      await connection.query("BEGIN");
      const result = await connection.query(
        "UPDATE game_private.table_aggregates SET revision=$1,owner_epoch=$2,document=$3::jsonb,updated_at=now() WHERE id=$4 AND revision=$5 AND owner_epoch=$6",
        [
          record.table.revision,
          record.ownerEpoch,
          JSON.stringify(record),
          record.table.id,
          expectedRevision,
          expectedEpoch,
        ],
      );
      if (result.rowCount !== 1) throw new PersistenceConflict();
      await connection.query("COMMIT");
    } catch (error) {
      await connection.query("ROLLBACK");
      throw error;
    } finally {
      connection.release();
    }
  }
  async close() {
    await this.pool.end();
  }
}
