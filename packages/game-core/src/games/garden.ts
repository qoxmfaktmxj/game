import type { Entropy } from "../entropy";

export const COLORS = ["coral", "sky", "leaf", "violet"] as const;
export type Color = (typeof COLORS)[number];
export interface Tile {
  id: string;
  color: Color | null;
  value: number | null;
}
export interface PlacedTile extends Tile {
  jokerColor?: Color;
  jokerValue?: number;
}
export interface GardenState {
  version: number;
  playerIds: string[];
  phase: "PLAY" | "FINISHED";
  activePlayerIndex: number;
  racks: Tile[][];
  pool: Tile[];
  board: PlacedTile[][];
  opened: boolean[];
  passes: string[];
  winnerId: string | null;
  deadline: number;
  remainingMs: number | null;
  editing: boolean;
}
export interface GardenResult {
  winners: string[];
  tied: boolean;
  reason: "EMPTY_RACK" | "BLOCKED" | "BLOCKED_TIE";
  scores: { playerId: string; total: number; remaining: number }[];
}
function fail(code = "INVALID_INPUT"): never {
  throw Object.assign(new Error(code), { code });
}
const count = (tiles: Tile[]) => tiles.reduce((n, t) => n + (t.value ?? 30), 0);
export function createTiles(): Tile[] {
  return [
    ...COLORS.flatMap((color) =>
      [0, 1].flatMap((copy) =>
        Array.from({ length: 13 }, (_, i) => ({
          id: `g-${color}-${i + 1}-${copy}`,
          color,
          value: i + 1,
        })),
      ),
    ),
    { id: "g-joker-0", color: null, value: null },
    { id: "g-joker-1", color: null, value: null },
  ];
}
export function create(playerIds: string[], entropy: Entropy): GardenState {
  if (
    playerIds.length < 2 ||
    playerIds.length > 4 ||
    new Set(playerIds).size !== playerIds.length
  )
    fail();
  const pool = createTiles();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = entropy.randomInt(i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const racks = playerIds.map(() => pool.splice(0, 14));
  return {
    version: 0,
    playerIds: [...playerIds],
    phase: "PLAY",
    activePlayerIndex: entropy.randomInt(playerIds.length),
    racks,
    pool,
    board: [],
    opened: playerIds.map(() => false),
    passes: [],
    winnerId: null,
    deadline: entropy.now() + 60_000,
    remainingMs: null,
    editing: false,
  };
}
function face(t: PlacedTile): { color: Color; value: number } {
  const color = t.color ?? t.jokerColor,
    value = t.value ?? t.jokerValue;
  if (
    !color ||
    !COLORS.includes(color) ||
    !Number.isInteger(value) ||
    value! < 1 ||
    value! > 13
  )
    fail("INVALID_MELD");
  return { color: color!, value: value! };
}
export function validMeld(tiles: PlacedTile[]): boolean {
  if (tiles.length < 3 || tiles.length > 13) return false;
  let values: ReturnType<typeof face>[];
  try {
    values = tiles.map(face);
  } catch {
    return false;
  }
  const group =
    tiles.length <= 4 &&
    values.every((t) => t.value === values[0].value) &&
    new Set(values.map((t) => t.color)).size === tiles.length;
  const sorted = [...values].sort((a, b) => a.value - b.value);
  const run =
    sorted.every((t) => t.color === sorted[0].color) &&
    sorted.every((t, i) => t.value === sorted[0].value + i);
  return group || run;
}
function next(state: GardenState, entropy: Entropy) {
  state.editing = false;
  state.activePlayerIndex =
    (state.activePlayerIndex + 1) % state.playerIds.length;
  state.deadline = entropy.now() + 60_000;
  state.remainingMs = null;
}
function draw(state: GardenState, amount: number, entropy: Entropy) {
  const actor = state.playerIds[state.activePlayerIndex];
  if (state.pool.length) {
    state.racks[state.activePlayerIndex].push(...state.pool.splice(0, amount));
    state.passes = [];
  } else {
    state.passes = [...new Set([...state.passes, actor])];
  }
  if (state.passes.length === state.playerIds.length) state.phase = "FINISHED";
  next(state, entropy);
}
function keys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key))) fail();
}
export function apply(
  original: GardenState,
  actorId: string,
  command: { type: string; payload: Record<string, unknown> },
  entropy: Entropy,
): GardenState {
  if (original.phase === "FINISHED") fail("GAME_FINISHED");
  if (original.playerIds[original.activePlayerIndex] !== actorId)
    fail("NOT_YOUR_TURN");
  if (original.remainingMs !== null) fail("PLAYER_DISCONNECTED");
  if (entropy.now() >= original.deadline) fail("TURN_EXPIRED");
  if (
    !command.payload ||
    Array.isArray(command.payload) ||
    typeof command.payload !== "object"
  )
    fail();
  const state = structuredClone(original),
    index = state.activePlayerIndex;
  switch (command.type) {
    case "GARDEN_BEGIN":
      keys(command.payload, []);
      if (state.editing) fail("WRONG_PHASE");
      state.editing = true;
      break;
    case "GARDEN_RESET":
      keys(command.payload, []);
      if (!state.editing) fail("WRONG_PHASE");
      state.editing = false;
      break;
    case "GARDEN_DRAW":
      keys(command.payload, []);
      draw(state, 1, entropy);
      break;
    case "GARDEN_PLAY": {
      keys(command.payload, ["board"]);
      const raw = command.payload.board;
      if (!Array.isArray(raw) || raw.length > 35 || !raw.length) fail();
      const available = new Map(
        [...state.board.flat(), ...state.racks[index]].map((t) => [t.id, t]),
      );
      const seen = new Set<string>();
      const board: PlacedTile[][] = raw.map((row: unknown) => {
        if (!Array.isArray(row) || row.length < 3 || row.length > 13)
          fail("INVALID_MELD");
        return row.map((value: unknown) => {
          if (!value || typeof value !== "object" || Array.isArray(value))
            fail();
          const entry = value as Record<string, unknown>;
          keys(entry, ["id", "jokerColor", "jokerValue"]);
          if (typeof entry.id !== "string" || seen.has(entry.id))
            fail("INVALID_MELD");
          const tile = available.get(entry.id);
          if (!tile) fail("CARD_NOT_OWNED");
          seen.add(entry.id);
          if (tile.value !== null) {
            if ("jokerColor" in entry || "jokerValue" in entry) fail();
            return { id: tile.id, color: tile.color, value: tile.value };
          }
          const placed = {
            id: tile.id,
            color: null,
            value: null,
            jokerColor: entry.jokerColor as Color,
            jokerValue: entry.jokerValue as number,
          };
          face(placed);
          return placed;
        });
      });
      if (
        !board.every(validMeld) ||
        state.board.flat().some((t) => !seen.has(t.id))
      )
        fail("INVALID_MELD");
      const added = state.racks[index].filter((t) => seen.has(t.id));
      if (!added.length) fail("PLAY_RACK_TILE");
      if (!state.opened[index]) {
        // Initial meld stands on its own: every pre-existing set must remain exactly intact.
        const signature = (row: PlacedTile[]) =>
          row
            .map((t) => `${t.id}:${t.jokerColor ?? ""}:${t.jokerValue ?? ""}`)
            .sort()
            .join("|");
        const originalSets = new Set(state.board.map(signature));
        const newSets = board.filter(
          (row) => !originalSets.has(signature(row)),
        );
        if (
          state.board.some(
            (row) =>
              !board.some((newRow) => signature(row) === signature(newRow)),
          ) ||
          newSets
            .flat()
            .some((t) => !state.racks[index].some((r) => r.id === t.id))
        )
          fail("INITIAL_MELD");
        if (newSets.flat().reduce((sum, t) => sum + face(t).value, 0) < 30)
          fail("INITIAL_MELD");
        state.opened[index] = true;
      }
      state.board = board;
      state.racks[index] = state.racks[index].filter((t) => !seen.has(t.id));
      state.passes = [];
      if (!state.racks[index].length) {
        state.phase = "FINISHED";
        state.winnerId = actorId;
      }
      next(state, entropy);
      break;
    }
    default:
      fail();
  }
  state.version++;
  validate(state);
  return state;
}
/** Server calls this inside the same serialized, durable command queue. */
export function tick(
  original: GardenState,
  paused: boolean,
  entropy: Entropy,
): GardenState | null {
  if (original.phase === "FINISHED") return null;
  const state = structuredClone(original),
    now = entropy.now();
  if (paused) {
    if (state.remainingMs !== null) return null;
    state.remainingMs = Math.max(0, state.deadline - now);
  } else if (state.remainingMs !== null) {
    state.deadline = now + state.remainingMs;
    state.remainingMs = null;
  } else if (now >= state.deadline) draw(state, state.editing ? 3 : 1, entropy);
  else return null;
  state.version++;
  validate(state);
  return state;
}
export function getResult(state: GardenState): GardenResult | null {
  if (state.phase !== "FINISHED") return null;
  const values = state.racks.map(count),
    min = Math.min(...values);
  const winners = state.winnerId
    ? [state.winnerId]
    : state.playerIds.filter((_, i) => values[i] === min);
  const penalties = values.map((n, i) =>
    winners.includes(state.playerIds[i]) ? 0 : n - (state.winnerId ? 0 : min),
  );
  // User-approved platform policy: a blocked tie is a shared win, unscored for everyone.
  const tied = winners.length > 1;
  const gain = penalties.reduce((a, b) => a + b, 0);
  return {
    winners,
    tied,
    reason: state.winnerId ? "EMPTY_RACK" : tied ? "BLOCKED_TIE" : "BLOCKED",
    scores: state.playerIds.map((playerId, i) => ({
      playerId,
      total: tied ? 0 : winners.includes(playerId) ? gain : -penalties[i],
      remaining: values[i],
    })),
  };
}
export function project(state: GardenState, actorId: string) {
  const i = state.playerIds.indexOf(actorId);
  if (i < 0) fail("NOT_MEMBER");
  return {
    version: state.version,
    phase: state.phase,
    activePlayerId: state.playerIds[state.activePlayerIndex],
    you: actorId,
    yourRack: structuredClone(state.racks[i]),
    board: structuredClone(state.board),
    poolCount: state.pool.length,
    players: state.playerIds.map((id, index) => ({
      id,
      rackCount: state.racks[index].length,
      opened: state.opened[index],
    })),
    deadline: state.deadline,
    remainingMs: state.remainingMs,
    editing: state.editing,
    legalActions:
      state.phase === "PLAY" &&
      i === state.activePlayerIndex &&
      state.remainingMs === null
        ? [
            "GARDEN_PLAY",
            "GARDEN_DRAW",
            ...(state.editing ? ["GARDEN_RESET"] : ["GARDEN_BEGIN"]),
          ]
        : [],
    result: getResult(state),
  };
}
export function validate(raw: unknown): GardenState {
  if (!raw || typeof raw !== "object") fail("INVALID_STATE");
  const s = raw as GardenState;
  if (
    !Array.isArray(s.playerIds) ||
    s.playerIds.length < 2 ||
    s.playerIds.length > 4 ||
    s.playerIds.some((id) => typeof id !== "string") ||
    new Set(s.playerIds).size !== s.playerIds.length ||
    !Number.isSafeInteger(s.version) ||
    s.version < 0 ||
    !["PLAY", "FINISHED"].includes(s.phase) ||
    !Number.isInteger(s.activePlayerIndex) ||
    s.activePlayerIndex < 0 ||
    s.activePlayerIndex >= s.playerIds.length
  )
    fail("INVALID_STATE");
  if (
    !Array.isArray(s.racks) ||
    s.racks.length !== s.playerIds.length ||
    s.racks.some((r) => !Array.isArray(r)) ||
    !Array.isArray(s.pool) ||
    !Array.isArray(s.board) ||
    s.board.some((r) => !Array.isArray(r) || !validMeld(r)) ||
    !Array.isArray(s.opened) ||
    s.opened.length !== s.playerIds.length ||
    s.opened.some((v) => typeof v !== "boolean")
  )
    fail("INVALID_STATE");
  const all = [...s.pool, ...s.racks.flat(), ...s.board.flat()],
    originals = createTiles();
  if (
    all.length !== 106 ||
    all.some((t) => !t || typeof t !== "object" || Array.isArray(t)) ||
    new Set(all.map((t) => t.id)).size !== 106 ||
    all.some(
      (t) =>
        !originals.some(
          (o) => o.id === t.id && o.color === t.color && o.value === t.value,
        ),
    )
  )
    fail("INVALID_STATE");
  if (
    !Number.isFinite(s.deadline) ||
    s.deadline < 0 ||
    !(
      s.remainingMs === null ||
      (Number.isFinite(s.remainingMs) &&
        s.remainingMs >= 0 &&
        s.remainingMs <= 60_000)
    ) ||
    typeof s.editing !== "boolean" ||
    !Array.isArray(s.passes) ||
    s.passes.some((id) => !s.playerIds.includes(id)) ||
    new Set(s.passes).size !== s.passes.length ||
    !(s.winnerId === null || s.playerIds.includes(s.winnerId))
  )
    fail("INVALID_STATE");
  if (
    (s.passes.length > 0 && s.pool.length > 0) ||
    (s.phase === "PLAY" &&
      (s.winnerId !== null ||
        s.racks.some((rack) => rack.length === 0) ||
        s.passes.length === s.playerIds.length)) ||
    (s.phase === "FINISHED" &&
      (s.editing ||
        s.remainingMs !== null ||
        (s.winnerId === null &&
          (s.pool.length > 0 ||
            s.passes.length !== s.playerIds.length ||
            s.racks.some((rack) => rack.length === 0))))) ||
    (s.winnerId !== null &&
      (s.passes.length > 0 ||
        !s.opened[s.playerIds.indexOf(s.winnerId)] ||
        s.racks[s.playerIds.indexOf(s.winnerId)].length !== 0 ||
        s.racks.some(
          (rack, i) => rack.length === 0 && s.playerIds[i] !== s.winnerId,
        )))
  )
    fail("INVALID_STATE");
  return s;
}
