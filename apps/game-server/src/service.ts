import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
import { GAME_CATALOG, isGameKey } from "@moyeotable/game-core/catalog";
import {
  applyGame, createGame, projectGame, requiredConnectedPlayers, tickGame, validateGame,
  type Entropy, type GameSnapshot,
} from "@moyeotable/game-core/multigame";
import type {
  CommandAck,
  RoomView,
  TableView,
  UserIdentity,
} from "@moyeotable/contracts";
import {
  PersistenceConflict,
  type TableRecord,
  type TableRepository,
  type StoredSession,
  type HistoryEntry,
} from "@moyeotable/db";
import {
  boundedString,
  exact,
  id,
  object,
  ServiceError,
  version,
} from "./errors.js";
import { chooseBotCommand } from "./bots/index.js";

interface BotTurn {
  key: string;
  timer: ReturnType<typeof setTimeout>;
}
interface BotOptions {
  /** Injected by integration tests; the public server uses 800–1600ms. */
  delayMs?: () => number;
}

function hash(input: string) {
  return createHash("sha256").update(input).digest("hex");
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

export class TableService {
  private readonly queues = new Map<string, Promise<unknown>>();
  private readonly owned = new Map<string, number>();
  private readonly connections = new Map<string, Map<string, number>>();
  private readonly listeners = new Map<string, Set<() => void>>();
  private readonly clockTables = new Set<string>();
  private readonly botTables = new Set<string>();
  private readonly botTurns = new Map<string, BotTurn>();
  private closed = false;
  constructor(
    readonly repository: TableRepository,
    private readonly entropy: Entropy = { randomInt, createId: randomUUID, now: Date.now },
    private readonly botOptions: BotOptions = {},
  ) {}

  subscribe(tableId: string, listener: () => void) {
    const set = this.listeners.get(tableId) ?? new Set();
    set.add(listener);
    this.listeners.set(tableId, set);
    return () => {
      set.delete(listener);
      if (!set.size) this.listeners.delete(tableId);
    };
  }
  private changed(tableId: string) {
    for (const callback of this.listeners.get(tableId) ?? []) callback();
  }
  connected(tableId: string, userId: string, delta: 1 | -1) {
    const members = this.connections.get(tableId) ?? new Map<string, number>();
    const count = Math.max(0, (members.get(userId) ?? 0) + delta);
    if (count) members.set(userId, count);
    else members.delete(userId);
    if (members.size) this.connections.set(tableId, members);
    else this.connections.delete(tableId);
    this.changed(tableId);
    this.cancelBotTurn(tableId);
    // Membership and saved state are read in the same queue as game commands.
    void this.serial(tableId, async () => this.scheduleBotTurn(await this.read(tableId))).catch(() => {});
    if (this.clockTables.has(tableId)) void this.tickTable(tableId).catch(() => {});
  }
  private serial<T>(tableId: string, action: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(tableId) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(action);
    this.queues.set(tableId, next);
    void next
      .finally(() => {
        if (this.queues.get(tableId) === next) this.queues.delete(tableId);
      })
      .catch(() => {});
    return next;
  }
  private async read(tableId: string) {
    let record: TableRecord | null;
    try { record = await this.repository.read(id(tableId)); }
    catch { throw new ServiceError("SAVE_FAILED"); }
    if (!record) throw new ServiceError("TABLE_NOT_FOUND");
    if (record.session?.gameKey === "garden" && record.table.status === "PLAYING") this.clockTables.add(tableId);
    else this.clockTables.delete(tableId);
    if (record.table.status === "PLAYING" && record.table.members.some((member) => member.control === "bot")) this.botTables.add(tableId);
    else this.botTables.delete(tableId);
    return record;
  }
  private member(record: TableRecord, userId: string, control: "human" | "bot" = "human") {
    const member = record.table.members.find(
      (value) => value.userId === userId,
    );
    if (!member || member.control !== control) throw new ServiceError("NOT_MEMBER");
    return member;
  }
  private async writable(tableId: string) {
    const current = await this.read(tableId);
    if (!this.owned.has(tableId)) {
      const claimed = structuredClone(current);
      claimed.ownerEpoch++;
      // A new process invalidates old room writes. Deployment remains one process.
      await this.repository.commit(
        claimed,
        current.table.revision,
        current.ownerEpoch,
      );
      this.owned.set(tableId, claimed.ownerEpoch);
      return claimed;
    }
    if (this.owned.get(tableId) !== current.ownerEpoch)
      throw new ServiceError("VERSION_CONFLICT");
    return current;
  }
  private async commit(candidate: TableRecord, current: TableRecord) {
    try {
      await this.repository.commit(
        candidate,
        current.table.revision,
        current.ownerEpoch,
      );
    } catch (error) {
      if (error instanceof PersistenceConflict)
        throw new ServiceError("VERSION_CONFLICT");
      throw new ServiceError("SAVE_FAILED");
    }
    if (candidate.session?.gameKey === "garden" && candidate.table.status === "PLAYING") this.clockTables.add(candidate.table.id);
    else this.clockTables.delete(candidate.table.id);
    this.scheduleBotTurn(candidate);
    this.changed(candidate.table.id);
  }
  private tableView(record: TableRecord): TableView {
    return {
      ...record.table,
      members: record.table.members.map((member) => ({
        ...member,
        connected: member.control === "bot" ||
          (this.connections.get(record.table.id)?.get(member.userId) ?? 0) > 0,
      })),
    };
  }
  private playersConnected(record: TableRecord) {
    return (
      record.table.members.some((member) => member.control === "human" && (this.connections.get(record.table.id)?.get(member.userId) ?? 0) > 0) &&
      (record.session ? requiredConnectedPlayers(record.session) : []).every(
        (userId) =>
          record.table.members.some((member) => member.userId === userId && member.control === "bot") ||
          (this.connections.get(record.table.id)?.get(userId) ?? 0) > 0,
      )
    );
  }
  async list(userId: string) {
    return (await this.repository.listByUser(userId)).filter((record) => record.table.members.some((member) => member.userId === userId && member.control === "human")).map((record) =>
      this.tableView(record),
    );
  }
  async view(tableId: string, userId: string): Promise<RoomView> {
    const record = await this.read(tableId);
    this.member(record, userId);
    const table = this.tableView(record);
    const paused = record.table.status === "PLAYING" && !this.playersConnected(record);
    if (record.session) return {
      protocolVersion: 1, table, paused,
      ...projectGame(record.session, userId, paused),
    };
    return { protocolVersion: 1, gameKey: table.gameKey, table, paused: false, game: null, result: null };
  }
  async create(user: UserIdentity, input: unknown) {
    const body = object(input);
    exact(body, ["title", "gameKey"]);
    const gameKey = body.gameKey ?? "star-trails";
    if (!isGameKey(gameKey)) throw new ServiceError("INVALID_INPUT");
    const tableId = randomUUID();
    const inviteToken = randomBytes(32).toString("base64url");
    const record: TableRecord = {
      schemaVersion: 1,
      ownerEpoch: 1,
      table: {
        id: tableId,
        title: boundedString(body.title, 1, 40),
        hostId: user.id,
        status: "LOBBY",
        revision: 0,
        gameKey,
        sessionId: null,
        members: [
          { userId: user.id, nickname: user.nickname, control: "human", seat: 0, ready: false },
        ],
        createdAt: new Date().toISOString(),
      },
      invite: {
        tokenHash: hash(inviteToken),
        expiresAt: Date.now() + 86_400_000,
        remainingUses: GAME_CATALOG[gameKey].maxPlayers - 1,
      },
      session: null,
      history: [],
      receipts: {},
    };
    await this.repository.create(record);
    this.owned.set(tableId, record.ownerEpoch);
    return { table: this.tableView(record), inviteToken };
  }
  async join(tableId: string, user: UserIdentity, input: unknown) {
    const body = object(input);
    exact(body, ["inviteToken"]);
    return this.serial(tableId, async () => {
      const current = await this.writable(tableId);
      if (current.table.members.some((member) => member.userId === user.id && member.control === "bot")) throw new ServiceError("NOT_MEMBER");
      if (current.table.members.some((member) => member.userId === user.id))
        return { table: this.tableView(current) };
      const token = boundedString(body.inviteToken, 20, 100);
      if (
        current.invite.expiresAt <= Date.now() ||
        current.invite.remainingUses < 1 ||
        hash(token) !== current.invite.tokenHash
      )
        throw new ServiceError("INVITE_EXPIRED");
      if (current.table.members.length >= GAME_CATALOG[current.table.gameKey].maxPlayers)
        throw new ServiceError("TABLE_FULL");
      if (current.table.status === "PLAYING")
        throw new ServiceError("GAME_RUNNING");
      const next = structuredClone(current);
      next.table.members.push({
        userId: user.id,
        nickname: user.nickname,
        control: "human",
        seat: Array.from({ length: GAME_CATALOG[next.table.gameKey].maxPlayers }, (_, seat) => seat)
          .find((seat) => !next.table.members.some((member) => member.seat === seat))!,
        ready: false,
      });
      next.table.members.forEach((member) => {
        member.ready = member.control === "bot";
      });
      next.invite.remainingUses--;
      next.table.revision++;
      // A player replacement starts from the lobby; never share the previous game.
      if (next.session) {
        next.session = null;
        next.table.sessionId = null;
        next.table.status = "LOBBY";
      }
      await this.commit(next, current);
      return { table: this.tableView(next) };
    });
  }
  async invite(tableId: string, userId: string) {
    return this.serial(tableId, async () => {
      const current = await this.writable(tableId);
      this.member(current, userId);
      if (current.table.hostId !== userId) throw new ServiceError("NOT_HOST");
      const inviteToken = randomBytes(32).toString("base64url");
      const next = structuredClone(current);
      next.invite = {
        tokenHash: hash(inviteToken),
        expiresAt: Date.now() + 86_400_000,
        remainingUses: Math.max(0, GAME_CATALOG[next.table.gameKey].maxPlayers - next.table.members.length),
      };
      next.table.revision++;
      await this.commit(next, current);
      return { inviteToken };
    });
  }
  async tableCommand(
    tableId: string,
    userId: string,
    input: unknown,
  ): Promise<CommandAck> {
    const command = object(input);
    exact(command, ["commandId", "expectedRevision", "type", "ready", "gameKey", "userId"]);
    const commandId = id(command.commandId);
    const expectedRevision = version(command.expectedRevision);
    if (!["READY", "START", "REMATCH", "LEAVE", "SELECT_GAME", "ADD_BOT", "REMOVE_BOT"].includes(String(command.type)))
      throw new ServiceError("INVALID_INPUT");
    if (command.type === "SELECT_GAME" ? !isGameKey(command.gameKey) : command.gameKey !== undefined)
      throw new ServiceError("INVALID_INPUT");
    if (command.type === "REMOVE_BOT" ? typeof command.userId !== "string" : command.userId !== undefined)
      throw new ServiceError("INVALID_INPUT");
    if (
      command.type === "READY"
        ? typeof command.ready !== "boolean"
        : command.ready !== undefined
    )
      throw new ServiceError("INVALID_INPUT");
    return this.serial(tableId, async () => {
      const current = await this.writable(tableId);
      const key = `table:${userId}:${commandId}`;
      const payloadHash = hash(canonical(command));
      const receipt = current.receipts[key];
      if (receipt) {
        if (receipt.payloadHash !== payloadHash)
          throw new ServiceError("DUPLICATE_COMMAND_MISMATCH");
        return { ...receipt.response, status: "duplicate" };
      }
      this.member(current, userId);
      if (current.table.revision !== expectedRevision)
        throw new ServiceError("VERSION_CONFLICT");
      const next = structuredClone(current);
      if (command.type === "READY") {
        if (next.table.status === "PLAYING")
          throw new ServiceError("GAME_RUNNING");
        this.member(next, userId).ready = command.ready as boolean;
      } else if (command.type === "LEAVE") {
        if (next.table.status === "PLAYING")
          throw new ServiceError("GAME_RUNNING");
        next.table.members = next.table.members.filter(
          (member) => member.userId !== userId,
        );
        const nextHuman = next.table.members.find((member) => member.control === "human");
        if (!nextHuman) next.table.members = [];
        else if (next.table.hostId === userId) next.table.hostId = nextHuman.userId;
        next.table.members.forEach((member) => {
          member.ready = member.control === "bot";
        });
        next.table.status = "LOBBY";
        next.session = null;
        next.table.sessionId = null;
      } else if (command.type === "ADD_BOT" || command.type === "REMOVE_BOT") {
        if (next.table.hostId !== userId) throw new ServiceError("NOT_HOST");
        if (next.table.status === "PLAYING") throw new ServiceError("GAME_RUNNING");
        if (command.type === "ADD_BOT") {
          const capacity = GAME_CATALOG[next.table.gameKey].maxPlayers;
          if (next.table.members.length >= capacity) throw new ServiceError("TABLE_FULL");
          const seat = Array.from({ length: capacity }, (_, seat) => seat).find((seat) => !next.table.members.some((member) => member.seat === seat))!;
          next.table.members.push({ userId: randomUUID(), nickname: `링구봇 ${seat + 1}`, control: "bot", seat, ready: true });
        } else {
          const bot = next.table.members.find((member) => member.userId === command.userId && member.control === "bot");
          if (!bot) throw new ServiceError("NOT_BOT");
          next.table.members = next.table.members.filter((member) => member !== bot);
        }
        next.table.members.forEach((member) => { member.ready = member.control === "bot"; });
        next.table.status = "LOBBY";
        next.table.sessionId = null;
        next.session = null;
      } else if (command.type === "SELECT_GAME") {
        if (next.table.hostId !== userId) throw new ServiceError("NOT_HOST");
        if (next.table.status === "PLAYING") throw new ServiceError("GAME_RUNNING");
        if (!isGameKey(command.gameKey)) throw new ServiceError("INVALID_INPUT");
        if (next.table.members.length > GAME_CATALOG[command.gameKey].maxPlayers)
          throw new ServiceError("GAME_CAPACITY");
        next.table.gameKey = command.gameKey;
        next.table.status = "LOBBY";
        next.table.sessionId = null;
        next.session = null;
        next.table.members.sort((a, b) => a.seat - b.seat).forEach((member, seat) => {
          member.seat = seat; member.ready = member.control === "bot";
        });
        // A game switch invalidates old invitations. The host can issue a new
        // token for the newly selected capacity without exposing a raw token.
        next.invite.remainingUses = 0;
      } else {
        if (next.table.hostId !== userId) throw new ServiceError("NOT_HOST");
        if (next.table.status === "PLAYING")
          throw new ServiceError("GAME_RUNNING");
        if (command.type === "REMATCH" && next.table.status !== "RESULT")
          throw new ServiceError("WRONG_PHASE");
        if (
          next.table.members.length < GAME_CATALOG[next.table.gameKey].minPlayers ||
          next.table.members.length > GAME_CATALOG[next.table.gameKey].maxPlayers ||
          !next.table.members.every(
            (member) =>
              member.ready &&
              (member.control === "bot" || (this.connections.get(tableId)?.get(member.userId) ?? 0) > 0),
          )
        )
          throw new ServiceError("NOT_READY");
        const members = [...next.table.members].sort((a, b) => a.seat - b.seat);
        const sessionId = randomUUID();
        const metadata = GAME_CATALOG[next.table.gameKey];
        const initial = createGame(next.table.gameKey, members.map((member) => member.userId), this.entropy);
        const snapshot = validateGame({ ...initial, ...metadata });
        next.session = {
          ...snapshot,
          id: sessionId,
          rulesVersion: metadata.rulesVersion,
          contentVersion: metadata.contentVersion,
          schemaVersion: metadata.schemaVersion,
          startedAt: new Date(this.entropy.now()).toISOString(),
          finishedAt: null,
        };
        next.table.status = "PLAYING";
        next.table.sessionId = sessionId;
        next.table.members.forEach((member) => {
          member.ready = member.control === "bot";
        });
      }
      next.table.revision++;
      const response: CommandAck = {
        commandId,
        status: "accepted",
        revision: next.table.revision,
      };
      next.receipts[key] = { payloadHash, response };
      await this.commit(next, current);
      if (next.session?.gameKey === "garden" && next.table.status === "PLAYING") this.clockTables.add(tableId);
      else this.clockTables.delete(tableId);
      return response;
    });
  }
  async gameCommand(
    tableId: string,
    userId: string,
    input: unknown,
  ): Promise<CommandAck> {
    return this.executeGameCommand(tableId, userId, input, "human");
  }
  private async executeGameCommand(tableId: string, userId: string, input: unknown, control: "human" | "bot"): Promise<CommandAck> {
    const command = object(input);
    exact(command, [
      "protocolVersion",
      "tableId",
      "sessionId",
      "commandId",
      "expectedVersion",
      "type",
      "payload",
    ]);
    if (command.protocolVersion !== 1 || id(command.tableId) !== tableId)
      throw new ServiceError("INVALID_INPUT");
    const sessionId = id(command.sessionId),
      commandId = id(command.commandId),
      expectedVersion = version(command.expectedVersion);
    const payload = object(command.payload);
    const type = boundedString(command.type, 1, 64);
    return this.serial(tableId, async () => {
      if (control === "bot" && this.closed) throw new ServiceError("SAVE_FAILED");
      let current = await this.writable(tableId);
      this.member(current, userId, control);
      const key = `game:${sessionId}:${userId}:${commandId}`,
        payloadHash = hash(canonical(command));
      const receipt = current.receipts[key];
      if (receipt) {
        if (receipt.payloadHash !== payloadHash)
          throw new ServiceError("DUPLICATE_COMMAND_MISMATCH");
        return { ...receipt.response, status: "duplicate" };
      }
      current = await this.advanceClock(current);
      if (current.session?.id !== sessionId)
        throw new ServiceError("VERSION_CONFLICT");
      if (current.session.result || current.table.status !== "PLAYING")
        throw new ServiceError("GAME_FINISHED");
      if (current.session.state.version !== expectedVersion)
        throw new ServiceError("VERSION_CONFLICT");
      if (type === "RESIGN" && !GAME_CATALOG[current.session.gameKey].supportsResign)
        throw new ServiceError("UNSUPPORTED_ACTION");
      if (type !== "RESIGN" && !this.playersConnected(current))
        throw new ServiceError("PLAYER_DISCONNECTED");
      const next = structuredClone(current);
      const snapshot = applyGame(current.session, userId, { type, payload }, this.entropy);
      if (snapshot.state.version !== current.session.state.version + 1)
        throw new ServiceError("SAVE_FAILED");
      this.installSnapshot(next, snapshot);
      next.table.revision++;
      const response: CommandAck = {
        commandId,
        status: "accepted",
        acceptedVersion: snapshot.state.version,
        revision: next.table.revision,
      };
      next.receipts[key] = { payloadHash, response };
      await this.commit(next, current);
      return response;
    });
  }

  private installSnapshot(record: TableRecord, snapshot: GameSnapshot) {
    const previous = record.session!;
    const session: StoredSession = {
      id: previous.id, rulesVersion: previous.rulesVersion,
      contentVersion: previous.contentVersion, schemaVersion: previous.schemaVersion,
      startedAt: previous.startedAt, finishedAt: previous.finishedAt,
      ...snapshot,
    };
    record.session = session;
    if (session.result && !previous.result) {
      const finishedAt = new Date(this.entropy.now()).toISOString();
      session.finishedAt = finishedAt;
      record.table.status = "RESULT";
      // Each branch preserves the result type associated with its game key.
      let entry: HistoryEntry;
      switch (session.gameKey) {
        case "star-trails": entry = { gameKey: session.gameKey, result: session.result, sessionId: session.id, finishedAt }; break;
        case "workshop": entry = { gameKey: session.gameKey, result: session.result, sessionId: session.id, finishedAt }; break;
        case "council": entry = { gameKey: session.gameKey, result: session.result, sessionId: session.id, finishedAt }; break;
        case "signal": entry = { gameKey: session.gameKey, result: session.result, sessionId: session.id, finishedAt }; break;
        case "garden": entry = { gameKey: session.gameKey, result: session.result, sessionId: session.id, finishedAt }; break;
      }
      record.history.push(entry);
    }
  }

  private async advanceClock(current: TableRecord): Promise<TableRecord> {
    if (!current.session || current.table.status !== "PLAYING") return current;
    const snapshot = tickGame(current.session, !this.playersConnected(current), this.entropy);
    if (!snapshot) return current;
    if (snapshot.state.version !== current.session.state.version + 1)
      throw new ServiceError("SAVE_FAILED");
    const next = structuredClone(current);
    this.installSnapshot(next, snapshot);
    next.table.revision++;
    await this.commit(next, current);
    return next;
  }

  private cancelBotTurn(tableId: string) {
    const pending = this.botTurns.get(tableId);
    if (pending) clearTimeout(pending.timer);
    this.botTurns.delete(tableId);
  }

  private scheduleBotTurn(record: TableRecord) {
    const tableId = record.table.id;
    const ownedEpoch = this.owned.get(tableId);
    const bots = record.table.members.filter((member) => member.control === "bot");
    if (this.closed || !record.session || record.table.status !== "PLAYING" || !bots.length || ownedEpoch !== undefined && ownedEpoch !== record.ownerEpoch) {
      this.botTables.delete(tableId);
      this.cancelBotTurn(tableId);
      return;
    }
    this.botTables.add(tableId);
    if (!this.playersConnected(record)) { this.botTables.delete(tableId); this.cancelBotTurn(tableId); return; }
    // Reactions can belong to someone other than the turn owner (for example,
    // a shield response or a destroyed district's recovery).
    const bot = bots.find((member) => {
      const projection = projectGame(record.session!, member.userId, false);
      return projection.gameKey === "star-trails" ? projection.game.legalCommands.length > 0 : projection.game.legalActions.length > 0;
    });
    if (!bot) { this.cancelBotTurn(tableId); return; }
    const sessionId = record.session.id, stateVersion = record.session.state.version;
    const key = `${sessionId}:${stateVersion}:${bot.userId}`;
    if (this.botTurns.get(tableId)?.key === key) return;
    this.cancelBotTurn(tableId);
    const configuredDelay = this.botOptions.delayMs?.() ?? 800 + randomInt(801);
    const delay = Number.isFinite(configuredDelay) ? Math.max(0, configuredDelay) : 1_200;
    const timer = setTimeout(() => {
      if (this.botTurns.get(tableId)?.key !== key || this.closed) return;
      this.botTurns.delete(tableId);
      void this.runBotTurn(tableId, bot.userId, sessionId, stateVersion).catch(() => {
        // A later scheduler tick retries transient storage/ownership failures.
        // No uncommitted move is published or applied in memory.
      });
    }, delay);
    timer.unref();
    this.botTurns.set(tableId, { key, timer });
  }

  private async runBotTurn(tableId: string, botId: string, sessionId: string, expectedVersion: number) {
    if (this.closed) return;
    const record = await this.read(tableId);
    if (record.session?.id !== sessionId || record.session.state.version !== expectedVersion || record.table.status !== "PLAYING" || !this.playersConnected(record)) return;
    this.member(record, botId, "bot");
    const projection = projectGame(record.session, botId, false);
    const choice = chooseBotCommand(projection.gameKey, projection.game, this.entropy.randomInt);
    if (!choice) return;
    // This private entry is the only way to act as a bot. Public authenticated
    // commands, table membership and views explicitly require human control.
    await this.executeGameCommand(tableId, botId, {
      protocolVersion: 1, tableId, sessionId, commandId: randomUUID(), expectedVersion,
      type: choice.type, payload: choice.payload,
    }, "bot");
  }

  /** Stop delayed actions before closing the underlying repository. */
  async close() {
    this.closed = true;
    for (const tableId of this.botTurns.keys()) this.cancelBotTurn(tableId);
    this.botTables.clear();
    await Promise.allSettled([...this.queues.values()]);
  }

  private tickTable(tableId: string) {
    return this.serial(tableId, async () => {
      if (!this.clockTables.has(tableId) && !this.botTables.has(tableId)) return;
      const record = this.clockTables.has(tableId) ? await this.advanceClock(await this.writable(tableId)) : await this.read(tableId);
      this.scheduleBotTurn(record);
    });
  }

  /** Called by the server scheduler; failures retry without publishing unsaved state. */
  async tick(): Promise<void> {
    await Promise.allSettled([...new Set([...this.clockTables, ...this.botTables])].map((tableId) => this.tickTable(tableId)));
  }
}
