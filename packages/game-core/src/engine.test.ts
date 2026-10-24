import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import test from "node:test";
import {
  RULES_VERSION,
  SUITS,
  RuleError,
  applyCommand,
  assertInvariants,
  canPlaceCard,
  createDeck,
  createInitialState,
  getResult,
  listLegalCommands,
  parseStarCommand,
  scoreLane,
  scorePlayer,
  shuffleDeck,
  toPlayerView,
  validateCardSet,
  type Card,
  type CardIdFactory,
  type GameState,
  type Lanes,
  type RandomInt,
  type RuleErrorCode,
  type StarCommand,
  type Suit,
} from "./index.js";

const testDeck = (): Card[] =>
  createDeck(
    ({ suit, kind, value, copy }) => `TEST-${suit}-${kind}-${value ?? copy}`,
  );
const cardId = (suit: Suit, value: number | "s0" | "s1" | "s2"): string =>
  typeof value === "number"
    ? `TEST-${suit}-number-${value}`
    : `TEST-${suit}-support-${value.slice(1)}`;
const number = (value: number) => ({ kind: "number", value }) as const;
const support = () => ({ kind: "support", value: null }) as const;
const play = (card: Card): StarCommand => ({
  type: "STAR_PLAY",
  payload: { cardId: card.id },
});
const discard = (card: Card): StarCommand => ({
  type: "STAR_DISCARD",
  payload: { cardId: card.id },
});
const drawDeck = (): StarCommand => ({ type: "STAR_DRAW_DECK", payload: {} });
const drawDiscard = (suit: Suit): StarCommand => ({
  type: "STAR_DRAW_DISCARD",
  payload: { suit },
});
const failWith = (run: () => unknown, code: RuleErrorCode): void => {
  assert.throws(
    run,
    (error: unknown) => error instanceof RuleError && error.code === code,
  );
};
const first = <T>(values: readonly T[]): T => {
  const value = values[0];
  assert.notEqual(value, undefined);
  return value as T;
};

function seededRandom(initial: number): RandomInt {
  let seed = initial >>> 0;
  return (max) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed % max;
  };
}

function fixture(
  options: {
    hand0?: string[];
    hand1?: string[];
    lanes0?: Partial<Record<Suit, string[]>>;
    lanes1?: Partial<Record<Suit, string[]>>;
    discards?: Partial<Record<Suit, string[]>>;
  } = {},
): GameState {
  const cards = testDeck();
  const byId = new Map(cards.map((card) => [card.id, card]));
  const used = new Set<string>();
  const take = (ids: readonly string[]): Card[] =>
    ids.map((id) => {
      const card = byId.get(id);
      assert.ok(card, `Fixture card exists: ${id}`);
      assert.ok(!used.has(id), `Fixture card used once: ${id}`);
      used.add(id);
      return card;
    });
  const lanes = (ids: Partial<Record<Suit, string[]>> = {}): Lanes => ({
    aurora: take(ids.aurora ?? []),
    ember: take(ids.ember ?? []),
    tide: take(ids.tide ?? []),
    moss: take(ids.moss ?? []),
    dusk: take(ids.dusk ?? []),
  });
  const state: GameState = {
    rulesVersion: RULES_VERSION,
    version: 0,
    playerIds: ["A", "B"],
    activePlayerIndex: 0,
    phase: "PLACE",
    hands: [take(options.hand0 ?? []), take(options.hand1 ?? [])],
    lanes: [lanes(options.lanes0), lanes(options.lanes1)],
    discards: lanes(options.discards),
    deck: [],
    justDiscardedId: null,
  };
  const remaining = cards.filter((card) => !used.has(card.id));
  for (const player of [0, 1] as const) {
    while (state.hands[player].length < 8) {
      const card = remaining.shift();
      assert.ok(card);
      state.hands[player].push(card);
    }
  }
  state.deck = remaining;
  assertInvariants(state);
  return state;
}

function rejectsWithoutMutation(
  state: GameState,
  actor: string,
  command: unknown,
  code: RuleErrorCode,
): void {
  const before = structuredClone(state);
  failWith(() => applyCommand(state, actor, command), code);
  assert.deepEqual(state, before);
}

function finishWithDiscardPiles(state: GameState): GameState {
  const next = structuredClone(state);
  for (const card of next.deck) next.discards[card.suit].push(card);
  next.deck = [];
  next.phase = "FINISHED";
  assertInvariants(next);
  return next;
}

test("deck contains exactly 60 distinct cards: nine numbers and three supports per suit", () => {
  const cards = testDeck();
  assert.equal(cards.length, 60);
  assert.equal(new Set(cards.map((card) => card.id)).size, 60);
  for (const suit of SUITS) {
    assert.deepEqual(
      cards
        .filter((card) => card.suit === suit && card.kind === "number")
        .map((card) => card.value),
      [2, 3, 4, 5, 6, 7, 8, 9, 10],
    );
    assert.equal(
      cards.filter((card) => card.suit === suit && card.kind === "support")
        .length,
      3,
    );
  }
});

test("production adapters can inject secure opaque IDs, shuffle, and the first player", () => {
  const state = createInitialState({
    playerIds: ["A", "B"],
    deck: shuffleDeck(
      createDeck(() => randomUUID()),
      randomInt,
    ),
    firstPlayerIndex: randomInt(2),
  });
  assertInvariants(state);
  for (const card of [...state.deck, ...state.hands.flat()]) {
    assert.match(card.id, /^[0-9a-f-]{36}$/);
    assert.ok(!card.id.includes(card.suit));
  }
});

test("deck creation requires an ID factory and rejects duplicate identities", () => {
  failWith(
    () => createDeck(undefined as unknown as CardIdFactory),
    "BAD_ID_FACTORY",
  );
  failWith(() => createDeck(() => "same"), "DUPLICATE_OR_BAD_ID");
});

test("initial deal alternates eight cards to each player, preserves input, and leaves 44", () => {
  const deck = testDeck();
  const before = structuredClone(deck);
  const state = createInitialState({
    playerIds: ["A", "B"],
    deck,
    firstPlayerIndex: 1,
  });
  assert.deepEqual(
    state.hands.map((hand) => hand.length),
    [8, 8],
  );
  assert.equal(state.deck.length, 44);
  assert.equal(state.activePlayerIndex, 1);
  assert.equal(first(state.hands[0]).id, deck.at(-1)?.id);
  assert.equal(first(state.hands[1]).id, deck.at(-2)?.id);
  assert.deepEqual(deck, before);
});

test("setup rejects missing, duplicate, blank, or excess players and invalid first player", () => {
  for (const playerIds of [[], ["A"], ["A", "A"], ["A", ""], ["A", "B", "C"]]) {
    failWith(
      () => createInitialState({ playerIds, deck: testDeck() }),
      "INVALID_PLAYERS",
    );
  }
  for (const firstPlayerIndex of [-1, 2, 0.5, NaN]) {
    failWith(
      () =>
        createInitialState({
          playerIds: ["A", "B"],
          deck: testDeck(),
          firstPlayerIndex,
        }),
      "INVALID_FIRST_PLAYER",
    );
  }
});

test("shuffle is deterministic under injected RNG, copies cards, and preserves all identities", () => {
  const deck = testDeck();
  const before = structuredClone(deck);
  const bounds: number[] = [];
  const shuffled = shuffleDeck(deck, (max) => {
    bounds.push(max);
    return 0;
  });
  assert.deepEqual(
    bounds,
    Array.from({ length: 59 }, (_, index) => 60 - index),
  );
  assert.deepEqual(
    new Set(shuffled.map((card) => card.id)),
    new Set(deck.map((card) => card.id)),
  );
  assert.notDeepEqual(shuffled, deck);
  assert.notEqual(
    first(shuffled),
    deck.find((card) => card.id === first(shuffled).id),
  );
  assert.deepEqual(deck, before);
  assert.deepEqual(
    shuffleDeck(deck, seededRandom(13)),
    shuffleDeck(deck, seededRandom(13)),
  );
});

test("shuffle rejects missing and out-of-range RNG values", () => {
  failWith(
    () => shuffleDeck(testDeck(), undefined as unknown as RandomInt),
    "RNG_REQUIRED",
  );
  for (const value of [-1, 60, 0.5, NaN, Infinity]) {
    failWith(() => shuffleDeck(testDeck(), () => value), "INVALID_RNG");
  }
});

const scoringCases: Array<
  [
    string,
    Array<ReturnType<typeof number> | ReturnType<typeof support>>,
    number,
  ]
> = [
  ["empty lane", [], 0],
  ["one support only", [support()], -40],
  ["three supports only", [support(), support(), support()], -80],
  ["numbers 5, 8, 10", [number(5), number(8), number(10)], 3],
  [
    "negative score is multiplied",
    [support(), number(3), number(5), number(7)],
    -10,
  ],
  [
    "eight-card bonus counts supports and applies after multiplication",
    [support(), support(), ...[2, 3, 5, 7, 8, 10].map(number)],
    65,
  ],
  [
    "complete lane maximum",
    [
      support(),
      support(),
      support(),
      ...[2, 3, 4, 5, 6, 7, 8, 9, 10].map(number),
    ],
    156,
  ],
];
for (const [label, cards, expected] of scoringCases) {
  test(`scoring: ${label}`, () =>
    assert.equal(scoreLane(cards).total, expected));
}

test("seven cards have no length bonus", () => {
  assert.equal(
    scoreLane([support(), ...[2, 3, 4, 5, 6, 7].map(number)]).bonus,
    0,
  );
});

test("player scoring combines five lanes and ignores the hand", () => {
  const state = fixture({
    lanes0: {
      aurora: [5, 8, 10].map((value) => cardId("aurora", value)),
      ember: [cardId("ember", "s0")],
      tide: ["s0", 3, 5, 7].map((value) =>
        cardId("tide", value as number | "s0"),
      ),
      moss: ["s0", "s1", 2, 3, 5, 7, 8, 10].map((value) =>
        cardId("moss", value as number | "s0" | "s1"),
      ),
    },
  });
  assert.equal(scorePlayer(state, 0).total, 18);
  assert.equal(scorePlayer(state, 1).total, 0);
  failWith(() => scorePlayer(state, 2), "INVALID_PLAYER");
});

test("playing commits exactly one owned card into its own lane and enters DRAW", () => {
  const state = fixture({ hand0: [cardId("aurora", 2)] });
  const next = applyCommand(state, "A", play(first(state.hands[0])));
  assert.equal(next.phase, "DRAW");
  assert.equal(next.hands[0].length, 7);
  assert.equal(next.hands[1].length, 8);
  assert.equal(next.lanes[0].aurora.at(-1)?.value, 2);
  assert.equal(next.lanes[1].aurora.length, 0);
  assert.equal(next.activePlayerIndex, 0);
  assert.equal(next.version, 1);
});

test("lower numbers are rejected; higher numbers may skip values", () => {
  const state = fixture({
    hand0: [cardId("aurora", 3), cardId("aurora", 9)],
    lanes0: { aurora: [cardId("aurora", 5)] },
  });
  rejectsWithoutMutation(
    state,
    "A",
    { type: "STAR_PLAY", payload: { cardId: cardId("aurora", 3) } },
    "LOWER_OR_EQUAL",
  );
  const next = applyCommand(state, "A", {
    type: "STAR_PLAY",
    payload: { cardId: cardId("aurora", 9) },
  });
  assert.deepEqual(
    next.lanes[0].aurora.map((card) => card.value),
    [5, 9],
  );
  assert.equal(
    canPlaceCard(state.lanes[0].aurora, first(state.lanes[0].aurora)),
    false,
  );
});

test("supports can precede numbers and other supports but never follow a number", () => {
  const state = fixture({
    hand0: [cardId("aurora", "s1")],
    lanes0: { aurora: [cardId("aurora", "s0")] },
  });
  const next = applyCommand(state, "A", play(first(state.hands[0])));
  assert.equal(next.lanes[0].aurora.length, 2);
  const blocked = fixture({
    hand0: [cardId("aurora", "s0")],
    lanes0: { aurora: [cardId("aurora", 2)] },
  });
  rejectsWithoutMutation(
    blocked,
    "A",
    play(first(blocked.hands[0])),
    "SUPPORT_AFTER_NUMBER",
  );
});

test("an unplayable card can still be discarded", () => {
  const state = fixture({
    hand0: [cardId("aurora", 3)],
    lanes0: { aurora: [cardId("aurora", 5)] },
  });
  const next = applyCommand(state, "A", discard(first(state.hands[0])));
  assert.equal(next.discards.aurora.at(-1)?.value, 3);
  assert.equal(next.justDiscardedId, cardId("aurora", 3));
  assert.equal(next.phase, "DRAW");
});

test("only the active authenticated member can issue a command", () => {
  const state = fixture();
  rejectsWithoutMutation(
    state,
    "B",
    discard(first(state.hands[1])),
    "NOT_YOUR_TURN",
  );
  rejectsWithoutMutation(state, "outsider", drawDeck(), "NOT_MEMBER");
  rejectsWithoutMutation(
    state,
    "A",
    play(first(state.hands[1])),
    "CARD_NOT_OWNED",
  );
});

test("draw before placement and a second placement during DRAW are rejected", () => {
  const state = fixture();
  rejectsWithoutMutation(state, "A", drawDeck(), "WRONG_PHASE");
  rejectsWithoutMutation(state, "A", drawDiscard("dusk"), "WRONG_PHASE");
  const next = applyCommand(state, "A", discard(first(state.hands[0])));
  rejectsWithoutMutation(next, "A", play(first(next.hands[0])), "WRONG_PHASE");
  rejectsWithoutMutation(
    next,
    "A",
    discard(first(next.hands[0])),
    "WRONG_PHASE",
  );
});

test("the just-discarded card blocks its pile even when an older card is underneath", () => {
  const state = fixture({
    hand0: [cardId("aurora", 3)],
    discards: { aurora: [cardId("aurora", 2)] },
  });
  const next = applyCommand(state, "A", discard(first(state.hands[0])));
  rejectsWithoutMutation(next, "A", drawDiscard("aurora"), "JUST_DISCARDED");
  assert.ok(
    !listLegalCommands(next, "A").some(
      (command) =>
        command.type === "STAR_DRAW_DISCARD" &&
        command.payload.suit === "aurora",
    ),
  );
});

test("drawing another discard takes only the top, keeps deck size, and ends the turn", () => {
  const state = fixture({
    hand0: [cardId("aurora", 3)],
    discards: { ember: [cardId("ember", 4), cardId("ember", 9)] },
  });
  const draw = applyCommand(state, "A", discard(first(state.hands[0])));
  const next = applyCommand(draw, "A", drawDiscard("ember"));
  assert.ok(next.hands[0].some((card) => card.id === cardId("ember", 9)));
  assert.deepEqual(
    next.discards.ember.map((card) => card.value),
    [4],
  );
  assert.equal(next.deck.length, state.deck.length);
  assert.equal(next.activePlayerIndex, 1);
  assert.equal(next.justDiscardedId, null);
  assert.equal(next.version, 2);
});

test("an opponent can retrieve the previous turn’s discarded card", () => {
  const state = fixture({
    hand0: [cardId("aurora", 3)],
    hand1: [cardId("ember", 2)],
  });
  const placed = applyCommand(state, "A", discard(first(state.hands[0])));
  const drawn = applyCommand(placed, "A", drawDeck());
  const opponentPlaced = applyCommand(drawn, "B", play(first(drawn.hands[1])));
  const next = applyCommand(opponentPlaced, "B", drawDiscard("aurora"));
  assert.ok(next.hands[1].some((card) => card.id === cardId("aurora", 3)));
});

test("empty discard piles are rejected", () => {
  const state = fixture();
  const draw = applyCommand(state, "A", play(first(state.hands[0])));
  rejectsWithoutMutation(draw, "A", drawDiscard("dusk"), "EMPTY_DISCARD");
});

test("deck draw restores eight cards, decreases deck, and advances to the other player", () => {
  const state = fixture();
  const top = state.deck.at(-1);
  const draw = applyCommand(state, "A", discard(first(state.hands[0])));
  const next = applyCommand(draw, "A", drawDeck());
  assert.equal(next.hands[0].length, 8);
  assert.deepEqual(next.hands[0].at(-1), top);
  assert.equal(next.deck.length, state.deck.length - 1);
  assert.equal(next.activePlayerIndex, 1);
  assert.equal(next.phase, "PLACE");
  assert.equal(next.justDiscardedId, null);
});

test("last deck card finishes immediately with no final play or extra turn", () => {
  const state = fixture();
  const removed = state.deck.splice(0, state.deck.length - 1);
  for (const suit of SUITS) {
    state.lanes[1][suit] = removed
      .filter((card) => card.suit === suit)
      .sort((a, b) => (a.value ?? 0) - (b.value ?? 0));
  }
  assertInvariants(state);
  const draw = applyCommand(state, "A", discard(first(state.hands[0])));
  const lastCard = first(draw.deck);
  const next = applyCommand(draw, "A", drawDeck());
  assert.equal(next.phase, "FINISHED");
  assert.equal(next.deck.length, 0);
  assert.equal(next.activePlayerIndex, 0);
  assert.equal(next.hands[0].at(-1)?.id, lastCard.id);
  assert.equal(getResult(next).reason, "DECK_EXHAUSTED");
  assert.deepEqual(listLegalCommands(next, "A"), []);
  rejectsWithoutMutation(next, "A", play(lastCard), "GAME_FINISHED");
});

test("equal totals produce shared victory; a result is unavailable before finish", () => {
  const state = fixture();
  failWith(() => getResult(state), "NOT_FINISHED");
  const finished = finishWithDiscardPiles(state);
  const result = getResult(finished);
  assert.deepEqual(result.winners, ["A", "B"]);
  assert.equal(result.tied, true);
  assert.deepEqual(
    result.scores.map((score) => score.total),
    [0, 0],
  );
});

test("successful transitions cannot mutate the previous persisted snapshot", () => {
  const state = fixture();
  const before = structuredClone(state);
  const next = applyCommand(state, "A", discard(first(state.hands[0])));
  assert.deepEqual(state, before);
  next.hands[1].pop();
  next.deck.pop();
  next.playerIds[0] = "changed";
  assert.deepEqual(state, before);
});

test("player views hide opponent hands, deck identities, and buried discard identities", () => {
  const state = fixture({
    discards: { dusk: [cardId("dusk", 2), cardId("dusk", 4)] },
  });
  for (const player of [0, 1] as const) {
    const view = toPlayerView(state, state.playerIds[player]);
    const serialized = JSON.stringify(view);
    const opponent = player === 0 ? 1 : 0;
    for (const card of [
      ...state.hands[opponent],
      ...state.deck,
      first(state.discards.dusk),
    ]) {
      assert.ok(
        !serialized.includes(card.id),
        `${card.id} must remain private`,
      );
    }
    assert.deepEqual(view.yourHand, state.hands[player]);
    assert.equal(view.players[opponent].handCount, 8);
    assert.equal(view.discards.dusk.count, 2);
    assert.equal(view.discards.dusk.top?.id, cardId("dusk", 4));
    assert.equal("deck" in view, false);
    assert.equal("hands" in view, false);
    assert.equal(view.result, null);
  }
});

test("view cards and nested arrays cannot mutate the private game state", () => {
  const state = fixture({
    lanes0: { aurora: [cardId("aurora", 2)] },
    discards: { ember: [cardId("ember", 2)] },
  });
  const before = structuredClone(state);
  const view = toPlayerView(state, "A");
  view.yourHand.pop();
  view.players[0].lanes.aurora.pop();
  view.players[0].score.total = 999;
  view.discards.ember.count = 999;
  view.legalCommands.length = 0;
  assert.deepEqual(state, before);
});

test("explicit view projection strips unexpected private fields from public cards", () => {
  const state = fixture();
  Object.assign(first(state.hands[0]), { secretNote: "do-not-send-this" });
  assert.ok(
    !JSON.stringify(toPlayerView(state, "A")).includes("do-not-send-this"),
  );
});

test("nonmembers cannot get player views; waiting players have no legal commands", () => {
  const state = fixture();
  failWith(() => toPlayerView(state, "outsider"), "NOT_MEMBER");
  assert.deepEqual(toPlayerView(state, "B").legalCommands, []);
  assert.deepEqual(listLegalCommands(state, "outsider"), []);
  assert.ok(toPlayerView(state, "A").legalCommands.length >= 8);
});

test("runtime parser accepts only documented command types and fields", () => {
  const commands: StarCommand[] = [
    { type: "STAR_PLAY", payload: { cardId: "opaque" } },
    { type: "STAR_DISCARD", payload: { cardId: "opaque" } },
    drawDeck(),
    drawDiscard("moss"),
  ];
  for (const command of commands)
    assert.deepEqual(parseStarCommand(command), command);
  failWith(
    () => parseStarCommand({ type: "RESIGN", payload: {} }),
    "UNKNOWN_COMMAND",
  );
  failWith(
    () =>
      parseStarCommand({
        type: "STAR_DRAW_DISCARD",
        payload: { suit: "unknown" },
      }),
    "INVALID_SUIT",
  );
});

test("runtime parser rejects identity spoofing, extra fields, missing fields, arrays, and malformed IDs", () => {
  const bad: unknown[] = [
    null,
    [],
    {},
    { type: "STAR_PLAY" },
    { type: "STAR_DRAW_DECK", payload: [] },
    { type: "STAR_DRAW_DECK", payload: {}, actorId: "B" },
    { type: "STAR_DRAW_DECK", payload: { actorId: "B" } },
    { type: "STAR_PLAY", payload: { cardId: "" } },
    { type: "STAR_PLAY", payload: { cardId: 2 } },
    { type: "STAR_PLAY", payload: { cardId: "x".repeat(129) } },
    { type: "STAR_PLAY", payload: { cardId: "opaque", lane: "dusk" } },
    { type: "STAR_DRAW_DISCARD", payload: { suit: "dusk", index: 0 } },
  ];
  for (const value of bad)
    failWith(() => parseStarCommand(value), "BAD_PAYLOAD");
});

test("card set validation rejects duplicate IDs, wrong counts, invalid values, kinds, and distribution", () => {
  failWith(() => validateCardSet(testDeck().slice(1)), "CARD_COUNT");
  const cases: Array<[Record<string, unknown>, RuleErrorCode]> = [
    [{ id: "" }, "DUPLICATE_OR_BAD_ID"],
    [{ id: "TEST-aurora-number-3" }, "DUPLICATE_OR_BAD_ID"],
    [{ suit: "other" }, "INVALID_SUIT"],
    [{ value: 1 }, "INVALID_VALUE"],
    [{ value: 2.5 }, "INVALID_VALUE"],
    [{ kind: "goal" }, "INVALID_KIND"],
    [{ kind: "support", value: 0 }, "INVALID_SUPPORT_VALUE"],
    [{ value: 3 }, "INVALID_DECK_DISTRIBUTION"],
  ];
  for (const [patch, error] of cases) {
    const deck = testDeck();
    Object.assign(first(deck), patch);
    failWith(() => validateCardSet(deck), error);
  }
});

test("snapshot validation rejects malformed structures with domain errors", () => {
  const cases: Array<[unknown, RuleErrorCode]> = [
    [null, "BAD_STATE"],
    [{ ...fixture(), version: -1 }, "BAD_STATE"],
    [{ ...fixture(), rulesVersion: "2.0.0" }, "BAD_STATE"],
    [{ ...fixture(), playerIds: ["", "B"] }, "BAD_PLAYERS"],
    [{ ...fixture(), hands: null }, "BAD_PLAYERS"],
    [{ ...fixture(), lanes: [] }, "BAD_PLAYERS"],
    [{ ...fixture(), deck: null }, "BAD_STATE"],
    [{ ...fixture(), discards: {} }, "BAD_STATE"],
    [{ ...fixture(), phase: "UNKNOWN" }, "BAD_PHASE"],
    [{ ...fixture(), justDiscardedId: undefined }, "BAD_JUST_DISCARDED"],
    [{ ...fixture(), phase: "FINISHED" }, "END_CONDITION"],
  ];
  for (const [state, code] of cases)
    failWith(() => assertInvariants(state), code);
});

test("snapshot invariants detect bad hands, invalid lane order, supports after numbers, and wrong piles", () => {
  const shortHand = fixture();
  shortHand.hands[0].pop();
  failWith(() => assertInvariants(shortHand), "HAND_COUNT");
  const laneOrder = fixture({
    lanes0: { aurora: [cardId("aurora", 2), cardId("aurora", 3)] },
  });
  laneOrder.lanes[0].aurora.reverse();
  failWith(() => assertInvariants(laneOrder), "LANE_ORDER");
  const supportOrder = fixture({
    lanes0: { aurora: [cardId("aurora", "s0"), cardId("aurora", 2)] },
  });
  supportOrder.lanes[0].aurora.reverse();
  failWith(() => assertInvariants(supportOrder), "LANE_SUPPORT_ORDER");
  const laneSuit = fixture({ lanes0: { aurora: [cardId("aurora", 2)] } });
  laneSuit.lanes[0].ember = laneSuit.lanes[0].aurora;
  laneSuit.lanes[0].aurora = [];
  failWith(() => assertInvariants(laneSuit), "LANE_SUIT");
  const discardSuit = fixture({ discards: { aurora: [cardId("aurora", 2)] } });
  discardSuit.discards.ember = discardSuit.discards.aurora;
  discardSuit.discards.aurora = [];
  failWith(() => assertInvariants(discardSuit), "DISCARD_SUIT");
});

test("repeated discard retrieval does not invent a forced end or consume the deck", () => {
  let state = fixture({
    hand0: [cardId("aurora", 2)],
    hand1: [cardId("ember", 2)],
    discards: { dusk: [cardId("dusk", 2)] },
  });
  const startDeckCount = state.deck.length;
  for (let turn = 0; turn < 12; turn += 1) {
    const actor = state.playerIds[state.activePlayerIndex];
    const hand = state.hands[state.activePlayerIndex];
    const card = turn < 2 ? first(hand) : hand.at(-1);
    assert.ok(card);
    state = applyCommand(state, actor, discard(card));
    const choices = listLegalCommands(state, actor).filter(
      (command) => command.type === "STAR_DRAW_DISCARD",
    );
    state = applyCommand(state, actor, first(choices));
    assert.equal(state.phase, "PLACE");
    assert.equal(state.deck.length, startDeckCount);
  }
});

test("100 seeded natural games preserve all card identities and privacy and finish in 44 deck draws", () => {
  const rng = seededRandom(20261023);
  for (let game = 0; game < 100; game += 1) {
    let state = createInitialState({
      playerIds: ["A", "B"],
      deck: shuffleDeck(testDeck(), rng),
      firstPlayerIndex: rng(2),
    });
    const initialIds = new Set(
      [...state.deck, ...state.hands.flat()].map((card) => card.id),
    );
    let steps = 0;
    while (state.phase !== "FINISHED") {
      const actor = state.playerIds[state.activePlayerIndex];
      const choices = listLegalCommands(state, actor);
      assert.ok(choices.length > 0);
      const command =
        state.phase === "DRAW" ? drawDeck() : choices[rng(choices.length)];
      assert.ok(command);
      state = applyCommand(state, actor, command);
      assertInvariants(state);
      assert.deepEqual(
        new Set(
          [
            ...state.deck,
            ...state.hands.flat(),
            ...state.lanes.flatMap((lanes) =>
              SUITS.flatMap((suit) => lanes[suit]),
            ),
            ...SUITS.flatMap((suit) => state.discards[suit]),
          ].map((card) => card.id),
        ),
        initialIds,
      );
      if (steps % 11 === 0) {
        for (const player of [0, 1] as const) {
          const view = JSON.stringify(
            toPlayerView(state, state.playerIds[player]),
          );
          for (const hidden of [
            ...state.deck,
            ...state.hands[player === 0 ? 1 : 0],
          ]) {
            assert.ok(!view.includes(`\"${hidden.id}\"`));
          }
        }
      }
      steps += 1;
      assert.ok(steps <= 88);
    }
    assert.equal(steps, 88);
    assert.equal(state.version, 88);
    assert.equal(state.deck.length, 0);
    assert.ok(getResult(state).winners.length >= 1);
    assert.deepEqual(toPlayerView(state, "A").result, getResult(state));
  }
});
