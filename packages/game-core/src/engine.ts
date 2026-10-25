import {
  RULES_VERSION,
  SUITS,
  type Card,
  type CardIdFactory,
  type GameResult,
  type GameState,
  type LaneScore,
  type Lanes,
  type PlayerIndex,
  type PlayerScore,
  type PlayerView,
  type PublicPlayer,
  type RandomInt,
  type RuleErrorCode,
  type StarCommand,
  type Suit,
} from "./types.js";

export class RuleError extends Error {
  readonly code: RuleErrorCode;

  constructor(code: RuleErrorCode, message: string = code) {
    super(message);
    this.name = "RuleError";
    this.code = code;
  }
}

function fail(code: RuleErrorCode): never {
  throw new RuleError(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSuit(value: unknown): value is Suit {
  return typeof value === "string" && SUITS.some((suit) => suit === value);
}

function isPlayerIndex(value: unknown): value is PlayerIndex {
  return value === 0 || value === 1;
}

function hasExactKeys(
  record: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(record);
  return (
    actual.length === keys.length &&
    keys.every((key) => Object.hasOwn(record, key))
  );
}

function suitRecord<T>(factory: (suit: Suit) => T): Record<Suit, T> {
  return {
    aurora: factory("aurora"),
    ember: factory("ember"),
    tide: factory("tide"),
    moss: factory("moss"),
    dusk: factory("dusk"),
  };
}

function blankLanes(): Lanes {
  return suitRecord(() => []);
}

function copyCard(card: Card): Card {
  return card.kind === "number"
    ? { id: card.id, suit: card.suit, kind: "number", value: card.value }
    : { id: card.id, suit: card.suit, kind: "support", value: null };
}

/** Identity and randomness are injected; the server supplies crypto.randomUUID. */
export function createDeck(idFactory: CardIdFactory): Card[] {
  if (typeof idFactory !== "function") fail("BAD_ID_FACTORY");
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (let value = 2; value <= 10; value += 1) {
      cards.push({
        id: idFactory({ suit, kind: "number", value, copy: 0 }),
        suit,
        kind: "number",
        value,
      });
    }
    for (let copy = 0; copy < 3; copy += 1) {
      cards.push({
        id: idFactory({ suit, kind: "support", value: null, copy }),
        suit,
        kind: "support",
        value: null,
      });
    }
  }
  validateCardSet(cards);
  return cards;
}

/** Fisher–Yates; no Math.random or mutable RNG state is hidden in the engine. */
export function shuffleDeck(
  deck: readonly Card[],
  randomInt: RandomInt,
): Card[] {
  if (typeof randomInt !== "function") fail("RNG_REQUIRED");
  validateCardSet(deck);
  const result = deck.map(copyCard);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = randomInt(index + 1);
    if (!Number.isInteger(target) || target < 0 || target > index)
      fail("INVALID_RNG");
    const from = result[index];
    const to = result[target];
    if (!from || !to) fail("INVALID_RNG");
    result[index] = to;
    result[target] = from;
  }
  return result;
}

/** Validate the exact 60-card distribution, including unique opaque identities. */
export function validateCardSet(cards: unknown): asserts cards is Card[] {
  if (!Array.isArray(cards) || cards.length !== 60) fail("CARD_COUNT");
  const ids = new Set<string>();
  const counts = new Map<string, number>();
  for (const card of cards as unknown[]) {
    if (
      !isRecord(card) ||
      typeof card.id !== "string" ||
      !card.id ||
      card.id.length > 128 ||
      ids.has(card.id)
    ) {
      fail("DUPLICATE_OR_BAD_ID");
    }
    ids.add(card.id);
    if (!isSuit(card.suit)) fail("INVALID_SUIT");
    if (card.kind === "number") {
      if (
        typeof card.value !== "number" ||
        !Number.isInteger(card.value) ||
        card.value < 2 ||
        card.value > 10
      ) {
        fail("INVALID_VALUE");
      }
    } else if (card.kind === "support") {
      if (card.value !== null) fail("INVALID_SUPPORT_VALUE");
    } else {
      fail("INVALID_KIND");
    }
    const key = `${card.suit}:${card.kind}:${card.value}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const suit of SUITS) {
    for (let value = 2; value <= 10; value += 1) {
      if (counts.get(`${suit}:number:${value}`) !== 1)
        fail("INVALID_DECK_DISTRIBUTION");
    }
    if (counts.get(`${suit}:support:null`) !== 3)
      fail("INVALID_DECK_DISTRIBUTION");
  }
}

export function createInitialState(options: {
  playerIds: readonly string[];
  deck: readonly Card[];
  firstPlayerIndex?: number;
}): GameState {
  const { playerIds, deck, firstPlayerIndex = 0 } = options;
  if (
    !Array.isArray(playerIds) ||
    playerIds.length !== 2 ||
    playerIds.some((id) => typeof id !== "string" || !id) ||
    playerIds[0] === playerIds[1]
  ) {
    fail("INVALID_PLAYERS");
  }
  if (!isPlayerIndex(firstPlayerIndex)) fail("INVALID_FIRST_PLAYER");
  validateCardSet(deck);
  const first = playerIds[0];
  const second = playerIds[1];
  if (!first || !second) fail("INVALID_PLAYERS");
  const state: GameState = {
    rulesVersion: RULES_VERSION,
    version: 0,
    playerIds: [first, second],
    activePlayerIndex: firstPlayerIndex,
    phase: "PLACE",
    hands: [[], []],
    lanes: [blankLanes(), blankLanes()],
    discards: blankLanes(),
    deck: deck.map(copyCard),
    justDiscardedId: null,
  };
  for (let round = 0; round < 8; round += 1) {
    for (const player of [0, 1] as const) {
      const card = state.deck.pop();
      if (!card) fail("CARD_COUNT");
      state.hands[player].push(card);
    }
  }
  assertInvariants(state);
  return state;
}

/** Narrow an untrusted action only. The transport separately validates its envelope. */
export function parseStarCommand(value: unknown): StarCommand {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["type", "payload"]) ||
    typeof value.type !== "string" ||
    !isRecord(value.payload)
  ) {
    fail("BAD_PAYLOAD");
  }
  const { type, payload } = value;
  if (type === "STAR_PLAY" || type === "STAR_DISCARD") {
    if (
      !hasExactKeys(payload, ["cardId"]) ||
      typeof payload.cardId !== "string" ||
      payload.cardId.length === 0 ||
      payload.cardId.length > 128
    ) {
      fail("BAD_PAYLOAD");
    }
    return { type, payload: { cardId: payload.cardId } };
  }
  if (type === "STAR_DRAW_DECK") {
    if (!hasExactKeys(payload, [])) fail("BAD_PAYLOAD");
    return { type, payload: {} };
  }
  if (type === "STAR_DRAW_DISCARD") {
    if (!hasExactKeys(payload, ["suit"])) fail("BAD_PAYLOAD");
    if (!isSuit(payload.suit)) fail("INVALID_SUIT");
    return { type, payload: { suit: payload.suit } };
  }
  fail("UNKNOWN_COMMAND");
}

export function scoreLane(
  cards: readonly Pick<Card, "kind" | "value">[],
): LaneScore {
  if (!Array.isArray(cards)) fail("INVALID_LANE");
  if (cards.length === 0) {
    return {
      sum: 0,
      cost: 0,
      supports: 0,
      multiplier: 1,
      bonus: 0,
      count: 0,
      total: 0,
    };
  }
  let sum = 0;
  let supports = 0;
  for (const card of cards) {
    if (card.kind === "number" && typeof card.value === "number")
      sum += card.value;
    else if (card.kind === "support") supports += 1;
    else fail("INVALID_LANE");
  }
  const multiplier = supports + 1;
  const bonus = cards.length >= 8 ? 20 : 0;
  return {
    sum,
    cost: -20,
    supports,
    multiplier,
    bonus,
    count: cards.length,
    total: (sum - 20) * multiplier + bonus,
  };
}

export function scorePlayer(
  state: Readonly<GameState>,
  playerIndex: number,
): PlayerScore {
  if (!isPlayerIndex(playerIndex)) fail("INVALID_PLAYER");
  const lanes = suitRecord((suit) => scoreLane(state.lanes[playerIndex][suit]));
  return {
    playerId: state.playerIds[playerIndex],
    lanes,
    total: SUITS.reduce((total, suit) => total + lanes[suit].total, 0),
  };
}

export function getResult(state: Readonly<GameState>): GameResult {
  if (state.phase !== "FINISHED") fail("NOT_FINISHED");
  const scores: [PlayerScore, PlayerScore] = [
    scorePlayer(state, 0),
    scorePlayer(state, 1),
  ];
  const best = Math.max(scores[0].total, scores[1].total);
  const winners = scores
    .filter((score) => score.total === best)
    .map((score) => score.playerId);
  return {
    scores,
    winners,
    tied: winners.length === 2,
    reason: "DECK_EXHAUSTED",
  };
}

export function canPlaceCard(lane: readonly Card[], card: Card): boolean {
  let lastNumber: number | null = null;
  for (const current of lane) {
    if (current.kind === "number") lastNumber = current.value;
  }
  return card.kind === "support"
    ? lastNumber === null
    : lastNumber === null || card.value > lastNumber;
}

/** Actor identity must come from the authenticated connection, never a JSON payload. */
export function applyCommand(
  state: Readonly<GameState>,
  actorId: string,
  rawCommand: unknown,
): GameState {
  assertInvariants(state);
  if (state.phase === "FINISHED") fail("GAME_FINISHED");
  const actor = state.playerIds.indexOf(actorId);
  if (!isPlayerIndex(actor)) fail("NOT_MEMBER");
  if (actor !== state.activePlayerIndex) fail("NOT_YOUR_TURN");
  const command = parseStarCommand(rawCommand);
  const next: GameState = structuredClone(state);

  if (command.type === "STAR_PLAY" || command.type === "STAR_DISCARD") {
    if (state.phase !== "PLACE") fail("WRONG_PHASE");
    const index = next.hands[actor].findIndex(
      (card) => card.id === command.payload.cardId,
    );
    const card = next.hands[actor][index];
    if (!card) fail("CARD_NOT_OWNED");
    if (command.type === "STAR_PLAY") {
      const lane = next.lanes[actor][card.suit];
      if (!canPlaceCard(lane, card))
        fail(
          card.kind === "support" ? "SUPPORT_AFTER_NUMBER" : "LOWER_OR_EQUAL",
        );
      lane.push(card);
      next.justDiscardedId = null;
    } else {
      next.discards[card.suit].push(card);
      next.justDiscardedId = card.id;
    }
    next.hands[actor].splice(index, 1);
    next.phase = "DRAW";
  } else {
    if (state.phase !== "DRAW") fail("WRONG_PHASE");
    let card: Card | undefined;
    if (command.type === "STAR_DRAW_DECK") {
      card = next.deck.pop();
      if (!card) fail("EMPTY_DECK");
    } else {
      const pile = next.discards[command.payload.suit];
      const top = pile.at(-1);
      if (!top) fail("EMPTY_DISCARD");
      if (top.id === next.justDiscardedId) fail("JUST_DISCARDED");
      card = pile.pop();
      if (!card) fail("EMPTY_DISCARD");
    }
    next.hands[actor].push(card);
    next.justDiscardedId = null;
    if (next.deck.length === 0) {
      next.phase = "FINISHED";
    } else {
      next.activePlayerIndex = actor === 0 ? 1 : 0;
      next.phase = "PLACE";
    }
  }
  next.version += 1;
  assertInvariants(next);
  return next;
}

/** Suggestions contain only information already visible to this player. */
export function listLegalCommands(
  state: Readonly<GameState>,
  actorId: string,
): StarCommand[] {
  if (
    state.phase === "FINISHED" ||
    state.playerIds[state.activePlayerIndex] !== actorId
  )
    return [];
  const player = state.activePlayerIndex;
  const commands: StarCommand[] = [];
  if (state.phase === "PLACE") {
    for (const card of state.hands[player]) {
      if (canPlaceCard(state.lanes[player][card.suit], card)) {
        commands.push({ type: "STAR_PLAY", payload: { cardId: card.id } });
      }
      commands.push({ type: "STAR_DISCARD", payload: { cardId: card.id } });
    }
  } else {
    if (state.deck.length > 0)
      commands.push({ type: "STAR_DRAW_DECK", payload: {} });
    for (const suit of SUITS) {
      const top = state.discards[suit].at(-1);
      if (top && top.id !== state.justDiscardedId)
        commands.push({ type: "STAR_DRAW_DISCARD", payload: { suit } });
    }
  }
  return commands;
}

/** Explicit projection, including card fields, avoids leaking private state extensions. */
export function toPlayerView(
  state: Readonly<GameState>,
  viewerId: string,
): PlayerView {
  assertInvariants(state);
  const viewer = state.playerIds.indexOf(viewerId);
  if (!isPlayerIndex(viewer)) fail("NOT_MEMBER");
  const publicPlayer = (index: PlayerIndex): PublicPlayer => ({
    id: state.playerIds[index],
    handCount: state.hands[index].length,
    lanes: suitRecord((suit) => state.lanes[index][suit].map(copyCard)),
    score: scorePlayer(state, index),
  });
  return {
    rulesVersion: state.rulesVersion,
    version: state.version,
    phase: state.phase,
    activePlayerId: state.playerIds[state.activePlayerIndex],
    you: viewerId,
    deckCount: state.deck.length,
    players: [publicPlayer(0), publicPlayer(1)],
    yourHand: state.hands[viewer].map(copyCard),
    discards: suitRecord((suit) => {
      const pile = state.discards[suit];
      const top = pile.at(-1);
      return {
        count: pile.length,
        top: top ? copyCard(top) : null,
        cards: pile.map(copyCard),
      };
    }),
    legalCommands: listLegalCommands(state, viewerId),
    result: state.phase === "FINISHED" ? getResult(state) : null,
  };
}

/** Also guards deserialized snapshots before a server resumes a game. */
export function assertInvariants(value: unknown): asserts value is GameState {
  if (
    !isRecord(value) ||
    value.rulesVersion !== RULES_VERSION ||
    !Number.isSafeInteger(value.version) ||
    (value.version as number) < 0
  ) {
    fail("BAD_STATE");
  }
  if (
    !Array.isArray(value.playerIds) ||
    value.playerIds.length !== 2 ||
    value.playerIds.some(
      (id: unknown) => typeof id !== "string" || id.length === 0,
    ) ||
    value.playerIds[0] === value.playerIds[1] ||
    !isPlayerIndex(value.activePlayerIndex)
  ) {
    fail("BAD_PLAYERS");
  }
  if (
    value.phase !== "PLACE" &&
    value.phase !== "DRAW" &&
    value.phase !== "FINISHED"
  )
    fail("BAD_PHASE");
  if (
    !Array.isArray(value.hands) ||
    value.hands.length !== 2 ||
    !value.hands.every(Array.isArray) ||
    !Array.isArray(value.lanes) ||
    value.lanes.length !== 2 ||
    !value.lanes.every(isRecord)
  ) {
    fail("BAD_PLAYERS");
  }
  if (!Array.isArray(value.deck) || !isRecord(value.discards))
    fail("BAD_STATE");
  const all: unknown[] = [...value.deck, ...value.hands.flat()];
  for (const index of [0, 1] as const) {
    const expected =
      value.phase === "DRAW" && index === value.activePlayerIndex ? 7 : 8;
    if ((value.hands[index] as unknown[]).length !== expected)
      fail("HAND_COUNT");
    const lanes = value.lanes[index] as Record<string, unknown>;
    for (const suit of SUITS) {
      const lane = lanes[suit];
      if (!Array.isArray(lane)) fail("BAD_STATE");
      all.push(...lane);
    }
  }
  for (const suit of SUITS) {
    const pile = value.discards[suit];
    if (!Array.isArray(pile)) fail("BAD_STATE");
    all.push(...pile);
  }
  validateCardSet(all);
  // The container shape and every contained card were validated above.
  const state = value as unknown as GameState;
  for (const index of [0, 1] as const) {
    for (const suit of SUITS) {
      let lastNumber = 1;
      let hasNumber = false;
      for (const card of state.lanes[index][suit]) {
        if (card.suit !== suit) fail("LANE_SUIT");
        if (card.kind === "number") {
          if (card.value <= lastNumber) fail("LANE_ORDER");
          lastNumber = card.value;
          hasNumber = true;
        } else if (hasNumber) {
          fail("LANE_SUPPORT_ORDER");
        }
      }
    }
  }
  for (const suit of SUITS) {
    if (state.discards[suit].some((card) => card.suit !== suit))
      fail("DISCARD_SUIT");
  }
  if ((state.phase === "FINISHED") !== (state.deck.length === 0))
    fail("END_CONDITION");
  if (
    state.justDiscardedId !== null &&
    (typeof state.justDiscardedId !== "string" ||
      state.phase !== "DRAW" ||
      !SUITS.some(
        (suit) => state.discards[suit].at(-1)?.id === state.justDiscardedId,
      ))
  ) {
    fail("BAD_JUST_DISCARDED");
  }
}
