/** Server-only engine dispatcher. Import the catalogue or types from the web. */
import {
  applyCommand, assertInvariants, createDeck, createInitialState,
  getResult as starResult, parseStarCommand, RuleError, scorePlayer,
  shuffleDeck, toPlayerView,
} from "./engine.js";
import type { GameResult, GameState, PlayerView } from "./types.js";
import { GAME_CATALOG, isGameKey, type GameKey } from "./catalog.js";
import type { Entropy, InputCommand } from "./entropy.js";
import * as workshop from "./games/workshop.js";
import * as council from "./games/council.js";
import * as signal from "./games/signal.js";
import * as garden from "./games/garden.js";

export type { Entropy, InputCommand } from "./entropy.js";
export type StarResultSummary = Omit<GameResult, "reason"> & {
  reason: "DECK_EXHAUSTED" | "RESIGN";
  resignedPlayerId?: string;
};
export interface GameStateMap {
  "star-trails": GameState;
  workshop: ReturnType<typeof workshop.create>;
  council: ReturnType<typeof council.create>;
  signal: ReturnType<typeof signal.create>;
  garden: ReturnType<typeof garden.create>;
}
export interface GameViewMap {
  "star-trails": PlayerView;
  workshop: ReturnType<typeof workshop.project>;
  council: ReturnType<typeof council.project>;
  signal: ReturnType<typeof signal.project>;
  garden: ReturnType<typeof garden.project>;
}
export interface GameResultMap {
  "star-trails": StarResultSummary;
  workshop: NonNullable<ReturnType<typeof workshop.getResult>>;
  council: NonNullable<ReturnType<typeof council.getResult>>;
  signal: NonNullable<ReturnType<typeof signal.getResult>>;
  garden: NonNullable<ReturnType<typeof garden.getResult>>;
}
export type GameSnapshot = {
  [K in GameKey]: {
    gameKey: K;
    state: GameStateMap[K];
    result: GameResultMap[K] | null;
  }
}[GameKey];
export type GameProjection = {
  [K in GameKey]: {
    gameKey: K;
    game: GameViewMap[K];
    result: GameResultMap[K] | null;
  }
}[GameKey];
export type GameCommand = InputCommand;

function failure(code: string): never {
  throw Object.assign(new Error(code), { code });
}
function same(value: unknown, other: unknown): boolean {
  const canonical = (item: unknown): string => {
    if (Array.isArray(item)) return `[${item.map(canonical).join(",")}]`;
    if (item && typeof item === "object")
      return `{${Object.entries(item).sort(([a], [b]) => a.localeCompare(b))
        .map(([key, val]) => `${JSON.stringify(key)}:${canonical(val)}`).join(",")}}`;
    return JSON.stringify(item);
  };
  return canonical(value) === canonical(other);
}
function assertPlayers(gameKey: GameKey, players: readonly string[]) {
  const { minPlayers, maxPlayers } = GAME_CATALOG[gameKey];
  if (players.length < minPlayers || players.length > maxPlayers ||
    new Set(players).size !== players.length ||
    players.some((player) => typeof player !== "string" || !player.trim()))
    failure("INVALID_PLAYERS");
}

export function createGame(gameKey: GameKey, players: string[], entropy: Entropy): GameSnapshot {
  assertPlayers(gameKey, players);
  switch (gameKey) {
    case "star-trails": return {
      gameKey, result: null,
      state: createInitialState({
        playerIds: [players[0]!, players[1]!],
        deck: shuffleDeck(createDeck(() => entropy.createId()), entropy.randomInt),
        firstPlayerIndex: entropy.randomInt(2) as 0 | 1,
      }),
    };
    case "workshop": return { gameKey, state: workshop.create(players, entropy), result: null };
    case "council": return { gameKey, state: council.create(players, entropy), result: null };
    case "signal": return { gameKey, state: signal.create(players, entropy), result: null };
    case "garden": return { gameKey, state: garden.create(players, entropy), result: null };
  }
}

export function applyGame(snapshot: GameSnapshot, actorId: string, command: InputCommand, entropy: Entropy): GameSnapshot {
  if (snapshot.result) failure("GAME_FINISHED");
  if (!snapshot.state.playerIds.includes(actorId)) failure("NOT_MEMBER");
  if (command.type === "RESIGN" && !GAME_CATALOG[snapshot.gameKey].supportsResign)
    failure("UNSUPPORTED_ACTION");
  switch (snapshot.gameKey) {
    case "star-trails": {
      if (command.type === "RESIGN") {
        if (Object.keys(command.payload).length) throw new RuleError("BAD_PAYLOAD");
        const state = structuredClone(snapshot.state);
        state.version++;
        return { gameKey: snapshot.gameKey, state, result: {
          scores: [scorePlayer(state, 0), scorePlayer(state, 1)],
          winners: state.playerIds.filter((id) => id !== actorId), tied: false,
          reason: "RESIGN", resignedPlayerId: actorId,
        } };
      }
      const state = applyCommand(snapshot.state, actorId, parseStarCommand(command));
      assertInvariants(state);
      return { gameKey: snapshot.gameKey, state, result: state.phase === "FINISHED" ? starResult(state) : null };
    }
    case "workshop": {
      const state = workshop.apply(snapshot.state, actorId, command, entropy);
      workshop.validate(state);
      return { gameKey: snapshot.gameKey, state, result: workshop.getResult(state) };
    }
    case "council": {
      const state = council.apply(snapshot.state, actorId, command, entropy);
      council.validate(state);
      return { gameKey: snapshot.gameKey, state, result: council.getResult(state) };
    }
    case "signal": {
      const state = signal.apply(snapshot.state, actorId, command, entropy);
      signal.validate(state);
      return { gameKey: snapshot.gameKey, state, result: signal.getResult(state) };
    }
    case "garden": {
      const state = garden.apply(snapshot.state, actorId, command, entropy);
      garden.validate(state);
      return { gameKey: snapshot.gameKey, state, result: garden.getResult(state) };
    }
  }
}

function actions<T extends { legalActions: string[] }>(view: T, paused: boolean): T {
  if (paused) view.legalActions = [];
  return view;
}
export function projectGame(snapshot: GameSnapshot, actorId: string, paused: boolean): GameProjection {
  switch (snapshot.gameKey) {
    case "star-trails": {
      const game = toPlayerView(snapshot.state, actorId);
      if (snapshot.result) game.phase = "FINISHED";
      if (snapshot.result || paused) game.legalCommands = [];
      return { gameKey: snapshot.gameKey, game, result: snapshot.result };
    }
    case "workshop": return { gameKey: snapshot.gameKey, game: actions(workshop.project(snapshot.state, actorId), paused), result: snapshot.result };
    case "council": return { gameKey: snapshot.gameKey, game: actions(council.project(snapshot.state, actorId), paused), result: snapshot.result };
    case "signal": return { gameKey: snapshot.gameKey, game: actions(signal.project(snapshot.state, actorId), paused), result: snapshot.result };
    case "garden": return { gameKey: snapshot.gameKey, game: actions(garden.project(snapshot.state, actorId), paused), result: snapshot.result };
  }
}

export function requiredConnectedPlayers(snapshot: GameSnapshot): readonly string[] {
  return snapshot.gameKey === "signal" ? snapshot.state.activePlayerIds : snapshot.state.playerIds;
}

/** Clock changes are server initiated and use the same persistence path as commands. */
export function tickGame(snapshot: GameSnapshot, paused: boolean, entropy: Entropy): GameSnapshot | null {
  if (snapshot.result || snapshot.gameKey !== "garden") return null;
  const state = garden.tick(snapshot.state, paused, entropy);
  if (!state) return null;
  garden.validate(state);
  return { gameKey: "garden", state, result: garden.getResult(state) };
}

export function validateGame(input: {
  gameKey: unknown; state: unknown; result: unknown;
  rulesVersion: unknown; contentVersion: unknown; schemaVersion: unknown;
}): GameSnapshot {
  if (!isGameKey(input.gameKey)) failure("BAD_STATE");
  const metadata = GAME_CATALOG[input.gameKey];
  if (input.rulesVersion !== metadata.rulesVersion || input.contentVersion !== metadata.contentVersion || input.schemaVersion !== metadata.schemaVersion)
    failure("BAD_STATE");
  let snapshot: GameSnapshot;
  switch (input.gameKey) {
    case "star-trails": {
      assertInvariants(input.state);
      const state = input.state;
      let result: StarResultSummary | null = state.phase === "FINISHED" ? starResult(state) : null;
      if (input.result && typeof input.result === "object" && "reason" in input.result && input.result.reason === "RESIGN") {
        if (!("resignedPlayerId" in input.result) || typeof input.result.resignedPlayerId !== "string" || !state.playerIds.includes(input.result.resignedPlayerId))
          failure("BAD_STATE");
        const resignedPlayerId = input.result.resignedPlayerId;
        result = {
          scores: [scorePlayer(state, 0), scorePlayer(state, 1)],
          winners: state.playerIds.filter((id) => id !== resignedPlayerId),
          tied: false, reason: "RESIGN", resignedPlayerId,
        };
      }
      if (!same(result, input.result)) failure("BAD_STATE");
      snapshot = { gameKey: "star-trails", state, result };
      break;
    }
    case "workshop": {
      const state = workshop.validate(input.state), result = workshop.getResult(state);
      if (!same(result, input.result)) failure("BAD_STATE");
      snapshot = { gameKey: "workshop", state, result }; break;
    }
    case "council": {
      const state = council.validate(input.state), result = council.getResult(state);
      if (!same(result, input.result)) failure("BAD_STATE");
      snapshot = { gameKey: "council", state, result }; break;
    }
    case "signal": {
      const state = signal.validate(input.state), result = signal.getResult(state);
      if (!same(result, input.result)) failure("BAD_STATE");
      snapshot = { gameKey: "signal", state, result }; break;
    }
    case "garden": {
      const state = garden.validate(input.state), result = garden.getResult(state);
      if (!same(result, input.result)) failure("BAD_STATE");
      snapshot = { gameKey: "garden", state, result }; break;
    }
  }
  assertPlayers(snapshot.gameKey, snapshot.state.playerIds);
  if (!Number.isSafeInteger(snapshot.state.version) || snapshot.state.version < 0 || typeof snapshot.state.phase !== "string") failure("BAD_STATE");
  const connected = requiredConnectedPlayers(snapshot);
  if (!Array.isArray(connected) || new Set(connected).size !== connected.length || connected.some((id) => !snapshot.state.playerIds.includes(id))) failure("BAD_STATE");
  return snapshot;
}
