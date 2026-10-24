import assert from "node:assert/strict";
import test from "node:test";
import type { Entropy, InputCommand } from "../entropy.js";
import {
  apply,
  create,
  project,
  validate,
  definitions,
  distance,
  CHARACTER_INFO,
  getResult,
  type SignalState,
  type SignalCard,
  type SignalCharacter,
  type SignalCardKind,
  type SignalRole,
} from "./signal.js";
import { signalBotCommand } from "../../../../tests/helpers/signal-bot.js";

function entropy(seed = 13): Entropy {
  let id = 0;
  return {
    randomInt(max) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed % max;
    },
    createId: () => `s-${seed}-${id++}`,
    now: () => 0,
  };
}
function allCards(s: SignalState) {
  return [
    ...s.deck,
    ...s.discard,
    ...s.players.flatMap((p) => [...p.hand, ...p.equipment]),
    ...(s.pending && "cards" in s.pending ? s.pending.cards : []),
  ];
}
const baseCharacters: SignalCharacter[] = [
  "rapid",
  "versatile",
  "piercer",
  "fortunate",
  "elusive",
  "tracker",
  "warded",
];
function fixture(count = 4): SignalState {
  const s = create(
    Array.from({ length: count }, (_, i) => `p${i}`),
    entropy(),
  );
  const cards = allCards(s);
  const roles: SignalRole[] = [
    "captain",
    "drifter",
    "raider",
    "raider",
    ...(count >= 5 ? ["ally" as const] : []),
    ...(count >= 6 ? ["raider" as const] : []),
    ...(count >= 7 ? ["ally" as const] : []),
  ];
  s.players.forEach((p, i) => {
    p.role = roles[i];
    p.character = baseCharacters[i];
    p.maxHealth =
      CHARACTER_INFO[p.character].health + Number(p.role === "captain");
    p.health = p.maxHealth;
    p.hand = [];
    p.equipment = [];
    p.alive = true;
  });
  s.deck = cards;
  s.discard = [];
  s.pending = null;
  s.startChecks = [];
  s.phase = "ACTION";
  s.turnPlayerId = "p0";
  s.strikesPlayed = 0;
  s.publicLog = [];
  return validate(s);
}
function char(s: SignalState, id: number, character: SignalCharacter) {
  const old = s.players[id].character;
  const duplicate = s.players.findIndex((p) => p.character === character);
  if (duplicate >= 0) {
    s.players[duplicate].character = old;
    s.players[duplicate].maxHealth =
      CHARACTER_INFO[old].health +
      Number(s.players[duplicate].role === "captain");
    s.players[duplicate].health = s.players[duplicate].maxHealth;
  }
  s.players[id].character = character;
  s.players[id].maxHealth =
    CHARACTER_INFO[character].health + Number(s.players[id].role === "captain");
  s.players[id].health = s.players[id].maxHealth;
}
function give(
  s: SignalState,
  who: number,
  kind: SignalCardKind,
  equipment = false,
) {
  const i = s.deck.findIndex((c) => c.kind === kind);
  assert.ok(i >= 0, `missing ${kind}`);
  const card = s.deck.splice(i, 1)[0];
  (equipment ? s.players[who].equipment : s.players[who].hand).push(card);
  return card.id;
}
function top(s: SignalState, suit: SignalCard["suit"], rank?: number) {
  const i = s.deck.findIndex(
    (c) => c.suit === suit && (rank === undefined || c.rank === rank),
  );
  assert.ok(i >= 0);
  const card = s.deck.splice(i, 1)[0];
  s.deck.push(card);
  return card.id;
}
function command(
  s: SignalState,
  actor: number | string,
  type: string,
  payload: Record<string, unknown> = {},
  random = entropy(),
): SignalState {
  return apply(
    s,
    typeof actor === "string" ? actor : `p${actor}`,
    { type, payload },
    random,
  );
}

test("medic can heal during final hand reduction and completes the turn when under the limit", () => {
  let s = fixture();
  char(s, 0, "medic");
  s.players[0].health = 3;
  const first = give(s, 0, "strike"),
    second = give(s, 0, "strike");
  give(s, 0, "evade");
  give(s, 0, "tonic");
  s = command(s, 0, "SIGNAL_END_TURN");
  assert.equal(s.phase, "DISCARD");
  assert.ok(project(s, "p0").legalActions.includes("SIGNAL_HEAL"));
  s = command(s, 0, "SIGNAL_HEAL", { cardIds: [first, second] });
  assert.equal(s.players[0].health, 4);
  assert.equal(s.players[0].hand.length, 2);
  assert.equal(s.turnPlayerId, "p1");
  validate(s);
});

test("publisher clarification allows medic to discard two even at full health", () => {
  const s = fixture();
  char(s, 1, "medic");
  const first = give(s, 1, "strike"),
    second = give(s, 1, "evade");
  assert.ok(project(s, "p1").legalActions.includes("SIGNAL_HEAL"));
  const next = command(s, 1, "SIGNAL_HEAL", { cardIds: [first, second] });
  assert.equal(next.players[1].health, next.players[1].maxHealth);
  assert.equal(next.players[1].hand.length, 0);
  assert.equal(next.turnPlayerId, "p0");
});

test("stealing the resourceful character's last hand refills before the second turn draw", () => {
  const s = fixture();
  char(s, 0, "scrounger");
  char(s, 1, "resourceful");
  const stolen = give(s, 1, "strike");
  const resourcefulDraw = s.deck.at(-1)!.id;
  const scroungerDraw = s.deck.at(-2)!.id;
  s.phase = "DRAW";
  const next = command(s, 0, "SIGNAL_DRAW", {
    source: "player",
    targetId: "p1",
  });
  assert.deepEqual(
    next.players[0].hand.map((card) => card.id),
    [stolen, scroungerDraw],
  );
  assert.deepEqual(
    next.players[1].hand.map((card) => card.id),
    [resourcefulDraw],
  );
});
function play(
  s: SignalState,
  who: number,
  kind: SignalCardKind,
  targetId?: string,
  extra: Record<string, unknown> = {},
) {
  return command(s, who, "SIGNAL_PLAY", {
    cardId: give(s, who, kind),
    ...(targetId ? { targetId } : {}),
    ...extra,
  });
}
function kill(s: SignalState, who: number) {
  const p = s.players[who];
  s.discard.push(...p.hand, ...p.equipment);
  p.hand = [];
  p.equipment = [];
  p.health = 0;
  p.alive = false;
  s.activePlayerIds = s.players.filter((p) => p.alive).map((p) => p.id);
}

test("base dataset has 80 physical cards, 22 effects and all 16 characters", () => {
  assert.equal(definitions().length, 80);
  assert.equal(new Set(definitions().map((c) => c.kind)).size, 22);
  assert.equal(Object.keys(CHARACTER_INFO).length, 16);
  assert.equal(definitions().filter((c) => c.kind === "strike").length, 25);
  assert.equal(definitions().filter((c) => c.kind === "evade").length, 12);
  assert.deepEqual(
    definitions()
      .filter((c) => c.kind === "supply")
      .map((c) => [c.suit, c.rank]),
    [
      ["spades", 9],
      ["spades", 9],
    ],
  );
  for (let n = 4; n <= 7; n++) {
    const s = create(
      Array.from({ length: n }, (_, i) => `p${i}`),
      entropy(n),
    );
    assert.equal(allCards(s).length, 80);
    assert.equal(new Set(allCards(s).map((c) => c.id)).size, 80);
    assert.equal(s.players.filter((p) => p.role === "captain").length, 1);
    validate(s);
  }
  assert.throws(() => create(["a", "b", "c"], entropy()));
});

test("player projection hides roles, deck, other hands and independent state references", () => {
  const s = fixture();
  give(s, 1, "strike");
  give(s, 2, "evade");
  const v = project(s, "p1");
  assert.equal(v.players[0].role, "captain");
  assert.equal(v.players[1].role, "drifter");
  assert.equal(v.players[2].role, null);
  assert.equal("deck" in v, false);
  assert.equal("hand" in v.players[2], false);
  assert.equal(JSON.stringify(v).includes(s.players[2].hand[0].id), false);
  v.yourHand[0].rank = 99;
  assert.notEqual(s.players[1].hand[0].rank, 99);
  kill(s, 2);
  assert.equal(project(s, "p1").players[2].role, "raider");
});

test("invalid actor, forged fields, invalid card and copied snapshots fail without mutation", () => {
  const s = fixture(),
    before = JSON.stringify(s);
  const id = give(s, 0, "strike");
  const original = JSON.stringify(s);
  assert.throws(
    () => command(s, 1, "SIGNAL_PLAY", { cardId: id, targetId: "p2" }),
    { code: "NOT_YOUR_TURN" },
  );
  assert.throws(
    () =>
      command(s, 0, "SIGNAL_PLAY", {
        cardId: id,
        targetId: "p1",
        actorId: "p2",
      }),
    { code: "BAD_PAYLOAD" },
  );
  assert.equal(JSON.stringify(s), original);
  assert.notEqual(original, before);
  const bad = structuredClone(s);
  bad.deck[0].id = bad.deck[1].id;
  assert.throws(() => validate(bad), { code: "BAD_STATE" });
  const wrong = structuredClone(s);
  wrong.deck[0].rank = 7;
  assert.throws(() => validate(wrong), { code: "BAD_STATE" });
});

test("ordinary strike and response consume cards, limit shots and increment once", () => {
  let s = fixture();
  char(s, 0, "tracker");
  const strike = give(s, 0, "strike"),
    evade = give(s, 1, "evade");
  s = command(s, 0, "SIGNAL_PLAY", { cardId: strike, targetId: "p1" });
  assert.equal(project(s, "p1").activePlayerId, "p1");
  assert.ok(project(s, "p1").legalActions.includes("SIGNAL_RESPOND"));
  s = command(s, 1, "SIGNAL_RESPOND", { cardId: evade });
  assert.equal(s.players[1].health, 4);
  assert.equal(s.phase, "ACTION");
  assert.equal(s.version, 2);
  assert.throws(() => play(s, 0, "strike", "p1"), { code: "STRIKE_LIMIT" });
});

test("distance uses live seats, direction-specific gear, and weapons only for attacks", () => {
  const s = fixture(5);
  assert.equal(distance(s, "p0", "p2"), 2);
  give(s, 0, "range5", true);
  assert.throws(() => play(s, 0, "snatch", "p2"), { code: "OUT_OF_RANGE" });
  give(s, 2, "detour", true);
  assert.equal(distance(s, "p0", "p2"), 3);
  assert.equal(distance(s, "p2", "p0"), 2);
  give(s, 0, "lens", true);
  assert.equal(distance(s, "p0", "p2"), 2);
  kill(s, 1);
  assert.equal(distance(s, "p0", "p2"), 1);
});

test("one weapon and one copy of an equipment; repeater permits extra shots until replaced", () => {
  let s = fixture();
  char(s, 0, "tracker");
  s = play(s, 0, "repeater");
  s = play(s, 0, "strike", "p1");
  s = command(s, 1, "SIGNAL_TAKE_HIT");
  s = play(s, 0, "strike", "p1");
  s = command(s, 1, "SIGNAL_TAKE_HIT");
  s = play(s, 0, "range2");
  assert.equal(
    s.players[0].equipment.filter((c) => c.kind === "repeater").length,
    0,
  );
  assert.throws(() => play(s, 0, "strike", "p1"), { code: "STRIKE_LIMIT" });
  s = play(s, 0, "shield");
  assert.throws(() => play(s, 0, "shield"), { code: "DUPLICATE_EQUIPMENT" });
});

test("piercer needs two evasions; shield success consumes one and cannot repeat", () => {
  let s = fixture();
  char(s, 0, "piercer");
  const evade = give(s, 1, "evade");
  give(s, 1, "shield", true);
  top(s, "hearts");
  s = play(s, 0, "strike", "p1");
  s = command(s, 1, "SIGNAL_SHIELD");
  assert.equal(s.pending?.kind === "attack" && s.pending.remaining, 1);
  assert.throws(() => command(s, 1, "SIGNAL_SHIELD"), {
    code: "ABILITY_UNAVAILABLE",
  });
  s = command(s, 1, "SIGNAL_RESPOND", { cardId: evade });
  assert.equal(s.phase, "ACTION");
  assert.equal(s.players[1].health, 4);
});

test("warded character has an independent shield, fortunate chooses two public check cards", () => {
  let s = fixture();
  char(s, 1, "warded");
  give(s, 1, "shield", true);
  top(s, "spades");
  s = play(s, 0, "strike", "p1");
  s = command(s, 1, "SIGNAL_SHIELD");
  assert.ok(project(s, "p1").legalActions.includes("SIGNAL_SHIELD"));
  top(s, "hearts");
  s = command(s, 1, "SIGNAL_SHIELD");
  assert.equal(s.phase, "ACTION");
  s = fixture();
  char(s, 1, "fortunate");
  give(s, 1, "shield", true);
  top(s, "hearts");
  top(s, "spades");
  s = play(s, 0, "strike", "p1");
  s = command(s, 1, "SIGNAL_SHIELD");
  assert.equal(s.pending?.kind, "check");
  const choice = project(s, "p1").pending!.cards.find(
    (c) => c.suit === "hearts",
  )!;
  assert.equal(project(s, "p2").pending!.cards.length, 2);
  s = command(s, 1, "SIGNAL_CHOOSE", { cardIds: [choice.id] });
  assert.equal(s.phase, "ACTION");
});

test("barrage affects other living players clockwise and does not inherit piercer", () => {
  let s = fixture();
  char(s, 0, "piercer");
  const e = give(s, 1, "evade");
  s = play(s, 0, "barrage");
  s = command(s, 1, "SIGNAL_RESPOND", { cardId: e });
  assert.equal(project(s, "p0").activePlayerId, "p2");
  s = command(s, 2, "SIGNAL_TAKE_HIT");
  s = command(s, 3, "SIGNAL_TAKE_HIT");
  assert.equal(s.phase, "ACTION");
  assert.equal(s.strikesPlayed, 0);
  assert.equal(s.players[2].health, 3);
});

test("raiders require a strike and reject evasion or a shield", () => {
  let s = fixture();
  char(s, 1, "warded");
  const wrong = give(s, 1, "evade"),
    right = give(s, 1, "strike");
  s = play(s, 0, "raiders");
  assert.throws(() => command(s, 1, "SIGNAL_RESPOND", { cardId: wrong }), {
    code: "INVALID_RESPONSE",
  });
  assert.throws(() => command(s, 1, "SIGNAL_SHIELD"), {
    code: "ABILITY_UNAVAILABLE",
  });
  s = command(s, 1, "SIGNAL_RESPOND", { cardId: right });
  assert.equal(project(s, "p0").activePlayerId, "p2");
});

test("duel alternates responders, interchangeable cards work, and does not use shot quota", () => {
  let s = fixture();
  char(s, 0, "tracker");
  const janetEvade = give(s, 1, "evade"),
    shot = give(s, 0, "strike");
  s = play(s, 0, "challenge", "p1");
  s = command(s, 1, "SIGNAL_RESPOND", { cardId: janetEvade });
  assert.equal(project(s, "p0").activePlayerId, "p0");
  s = command(s, 0, "SIGNAL_RESPOND", { cardId: shot });
  s = command(s, 1, "SIGNAL_TAKE_HIT");
  assert.equal(s.strikesPlayed, 0);
  assert.equal(s.phase, "ACTION");
  s = play(s, 0, "strike", "p1");
  assert.equal(s.strikesPlayed, 1);
});

test("tonic can rescue a lethal hit, pulse cannot, and full-health tonic is permitted", () => {
  let s = fixture();
  s.players[1].health = 1;
  const tonic = give(s, 1, "tonic"),
    pulse = give(s, 1, "pulse");
  s = play(s, 0, "strike", "p1");
  s = command(s, 1, "SIGNAL_TAKE_HIT");
  assert.equal(s.phase, "DYING");
  assert.throws(() => command(s, 1, "SIGNAL_RESCUE", { cardIds: [pulse] }), {
    code: "INVALID_RESPONSE",
  });
  s = command(s, 1, "SIGNAL_RESCUE", { cardIds: [tonic] });
  assert.equal(s.players[1].health, 1);
  assert.equal(s.phase, "ACTION");
  s = play(s, 0, "tonic");
  assert.equal(s.players[0].health, s.players[0].maxHealth);
});

test("two survivors disable tonic but allow pulse and medic healing", () => {
  let s = fixture();
  kill(s, 2);
  kill(s, 3);
  char(s, 1, "medic");
  s.players[1].health = 1;
  const c = give(s, 1, "tonic"),
    a = give(s, 1, "evade"),
    b = give(s, 1, "evade");
  s = play(s, 0, "strike", "p1");
  s = command(s, 1, "SIGNAL_TAKE_HIT");
  assert.throws(() => command(s, 1, "SIGNAL_RESCUE", { cardIds: [c] }), {
    code: "RESCUE_UNAVAILABLE",
  });
  s = command(s, 1, "SIGNAL_HEAL", { cardIds: [a, b] });
  assert.equal(s.players[1].health, 1);
  s = play(s, 0, "pulse");
  assert.equal(s.players[1].health, 2);
});

test("damage abilities wait for survival and attribute duel damage to its initiator", () => {
  let s = fixture();
  char(s, 1, "resilient");
  s.players[1].health = 1;
  const beer = give(s, 1, "tonic");
  s = play(s, 0, "strike", "p1");
  s = command(s, 1, "SIGNAL_TAKE_HIT");
  assert.equal(s.players[1].hand.length, 1);
  s = command(s, 1, "SIGNAL_RESCUE", { cardIds: [beer] });
  assert.equal(s.players[1].hand.length, 1);
  s = fixture();
  char(s, 0, "retaliator");
  give(s, 1, "evade");
  s = play(s, 0, "challenge", "p1");
  const shot = give(s, 1, "strike");
  s = command(s, 1, "SIGNAL_RESPOND", { cardId: shot });
  s = command(s, 0, "SIGNAL_TAKE_HIT");
  assert.equal(s.players[0].hand.length, 0);
  assert.equal(s.players[1].hand.length, 1);
  s = fixture();
  char(s, 1, "retaliator");
  give(s, 0, "evade");
  s = play(s, 0, "strike", "p1");
  s = command(s, 1, "SIGNAL_TAKE_HIT");
  assert.equal(s.players[1].hand.length, 1);
  assert.equal(s.players[0].hand.length, 0);
});

test("resourceful waits until duel completes, but replenishes other empty hands", () => {
  let s = fixture();
  char(s, 0, "resourceful");
  s = play(s, 0, "challenge", "p1");
  assert.equal(s.players[0].hand.length, 0);
  s = command(s, 1, "SIGNAL_TAKE_HIT");
  assert.equal(s.players[0].hand.length, 1);
  s = fixture();
  char(s, 0, "resourceful");
  s = play(s, 0, "supply");
  assert.equal(s.players[0].hand.length, 3);
});

test("outlaw reward, explicit death discard ordering and role reveal persist", () => {
  let s = fixture();
  s.players[3].health = 1;
  const a = give(s, 3, "evade"),
    b = give(s, 3, "evade");
  s = play(s, 0, "strike", "p3");
  s = command(s, 3, "SIGNAL_TAKE_HIT");
  s = command(s, 3, "SIGNAL_ACCEPT_ELIMINATION", { discardOrder: [b, a] });
  assert.equal(s.players[0].hand.length, 3);
  assert.deepEqual(
    s.discard.slice(-2).map((c) => c.id),
    [b, a],
  );
  assert.equal(s.players[3].alive, false);
  assert.equal(project(s, "p1").players[3].role, "raider");
  assert.ok(!s.activePlayerIds.includes("p3"));
});

test("salvager captain inherits deputy cards before discarding all cards as penalty", () => {
  let s = fixture(5);
  char(s, 0, "salvager");
  s.players[4].health = 1;
  give(s, 0, "range3", true);
  give(s, 0, "evade");
  give(s, 4, "evade");
  give(s, 4, "detour", true);
  s = play(s, 0, "strike", "p4");
  s = command(s, 4, "SIGNAL_TAKE_HIT");
  s = command(s, 4, "SIGNAL_ACCEPT_ELIMINATION");
  assert.equal(s.players[0].hand.length, 0);
  assert.equal(s.players[0].equipment.length, 0);
});

test("team wins include eliminated teammates and drifter requires sole survival", () => {
  let s = fixture();
  kill(s, 2);
  kill(s, 3);
  s.players[0].health = 1;
  s.turnPlayerId = "p1";
  s = play(s, 1, "strike", "p0");
  s = command(s, 0, "SIGNAL_TAKE_HIT");
  s = command(s, 0, "SIGNAL_ACCEPT_ELIMINATION");
  assert.deepEqual(getResult(s)?.winners, ["p1"]);
  assert.equal(s.result?.reason, "LAST_SIGNAL");
  s = fixture(5);
  kill(s, 2);
  kill(s, 3);
  s.players[0].health = 1;
  s.turnPlayerId = "p1";
  s = play(s, 1, "strike", "p0");
  s = command(s, 0, "SIGNAL_TAKE_HIT");
  s = command(s, 0, "SIGNAL_ACCEPT_ELIMINATION");
  assert.deepEqual(s.result?.winners, ["p2", "p3"]);
  assert.equal(s.result?.tied, false);
  s = fixture(5);
  kill(s, 1);
  kill(s, 2);
  kill(s, 4);
  s.players[3].health = 1;
  s = play(s, 0, "strike", "p3");
  s = command(s, 3, "SIGNAL_TAKE_HIT");
  s = command(s, 3, "SIGNAL_ACCEPT_ELIMINATION");
  assert.deepEqual(s.result?.winners, ["p0", "p4"]);
});

test("snatch cannot address hidden card IDs and jam discards chosen public equipment", () => {
  let s = fixture();
  const hand = give(s, 1, "evade"),
    gear = give(s, 1, "range3", true),
    snatch = give(s, 0, "snatch");
  assert.throws(
    () =>
      command(s, 0, "SIGNAL_PLAY", {
        cardId: snatch,
        targetId: "p1",
        targetCardId: hand,
      }),
    { code: "INVALID_TARGET" },
  );
  s = command(s, 0, "SIGNAL_PLAY", { cardId: snatch, targetId: "p1" });
  assert.equal(s.players[0].hand[0].id, hand);
  s = play(s, 0, "jam", "p1", { targetCardId: gear });
  assert.equal(s.discard.at(-1)?.id, gear);
});

test("shared supply reveals choices to everyone and distributes clockwise", () => {
  let s = fixture();
  s = play(s, 0, "cache");
  assert.equal(project(s, "p2").pending?.cards.length, 4);
  for (let i = 0; i < 4; i++) {
    const v = project(s, `p${i}`);
    assert.equal(v.activePlayerId, `p${i}`);
    s = command(s, i, "SIGNAL_CHOOSE", { cardIds: [v.pending!.cards[0].id] });
  }
  assert.equal(s.phase, "ACTION");
  assert.deepEqual(
    s.players.map((p) => p.hand.length),
    [1, 1, 1, 1],
  );
});

test("surveyor private three-card selection keeps two and returns the third on top", () => {
  let s = fixture();
  char(s, 1, "surveyor");
  s = command(s, 0, "SIGNAL_END_TURN");
  const choices = project(s, "p1").pending!.cards;
  assert.equal(choices.length, 3);
  assert.equal(project(s, "p0").pending!.cards.length, 0);
  s = command(s, 1, "SIGNAL_CHOOSE", {
    cardIds: choices.slice(0, 2).map((c) => c.id),
  });
  assert.equal(s.players[1].hand.length, 2);
  assert.equal(s.deck.at(-1)?.id, choices[2].id);
});

test("scrounger, recycler and redreader each replace only their specified draw", () => {
  let s = fixture();
  char(s, 1, "scrounger");
  const stolen = give(s, 2, "evade");
  s = command(s, 0, "SIGNAL_END_TURN");
  s = command(s, 1, "SIGNAL_DRAW", { source: "player", targetId: "p2" });
  assert.ok(s.players[1].hand.some((c) => c.id === stolen));
  assert.equal(s.players[1].hand.length, 2);
  s = fixture();
  char(s, 1, "recycler");
  const discarded = s.deck.pop()!;
  s.discard.push(discarded);
  s = command(s, 0, "SIGNAL_END_TURN");
  s = command(s, 1, "SIGNAL_DRAW", { source: "discard" });
  assert.equal(s.players[1].hand[0].id, discarded.id);
  s = fixture();
  char(s, 1, "redreader");
  top(s, "hearts");
  top(s, "clubs");
  s = command(s, 0, "SIGNAL_END_TURN");
  assert.equal(s.players[1].hand.length, 3);
  assert.ok(s.publicLog[0].includes("두 번째"));
});

test("quarantine skips on nonheart and forbids captain target", () => {
  let s = fixture();
  assert.throws(() => play(s, 0, "quarantine", "p0"), {
    code: "INVALID_TARGET",
  });
  give(s, 1, "quarantine", true);
  top(s, "spades");
  s = command(s, 0, "SIGNAL_END_TURN");
  assert.equal(s.turnPlayerId, "p2");
  assert.equal(s.players[1].hand.length, 0);
  s = fixture();
  give(s, 1, "quarantine", true);
  top(s, "hearts");
  s = command(s, 0, "SIGNAL_END_TURN");
  assert.equal(s.turnPlayerId, "p1");
  assert.equal(s.players[1].hand.length, 2);
});

test("reactor resolves before quarantine, deals three and gives no killer reward", () => {
  let s = fixture();
  give(s, 1, "reactor", true);
  give(s, 1, "quarantine", true);
  top(s, "hearts");
  top(s, "spades", 2);
  s = command(s, 0, "SIGNAL_END_TURN");
  assert.equal(s.players[1].health, 1);
  assert.equal(s.turnPlayerId, "p1");
  assert.equal(s.players[1].equipment.length, 0);
  s = fixture();
  char(s, 3, "tracker");
  s.players[3].health = 2;
  give(s, 3, "reactor", true);
  top(s, "spades", 2);
  s.turnPlayerId = "p2";
  s = command(s, 2, "SIGNAL_END_TURN");
  assert.equal(s.phase, "DYING");
  assert.equal(s.players[3].health, -1);
  s = command(s, 3, "SIGNAL_ACCEPT_ELIMINATION");
  assert.equal(s.players[2].hand.length, 0);
  assert.equal(s.turnPlayerId, "p0");
});

test("reactor passes clockwise and lethal explosion needs enough rescue cards", () => {
  let s = fixture();
  give(s, 1, "reactor", true);
  top(s, "hearts");
  s = command(s, 0, "SIGNAL_END_TURN");
  assert.ok(s.players[2].equipment.some((c) => c.kind === "reactor"));
  s = fixture();
  s.players[1].health = 2;
  give(s, 1, "reactor", true);
  const a = give(s, 1, "tonic"),
    b = give(s, 1, "tonic");
  top(s, "spades", 2);
  s = command(s, 0, "SIGNAL_END_TURN");
  s = command(s, 1, "SIGNAL_RESCUE", { cardIds: [a] });
  assert.equal(s.phase, "DYING");
  s = command(s, 1, "SIGNAL_RESCUE", { cardIds: [b] });
  assert.equal(s.players[1].health, 1);
  assert.equal(s.players[1].hand.length, 2);
});

test("turn ending discards precisely excess, preserves chosen order and reshuffles", () => {
  let s = fixture();
  for (let i = 0; i < 7; i++) give(s, 0, "strike");
  s = command(s, 0, "SIGNAL_END_TURN");
  assert.equal(s.phase, "DISCARD");
  const ids = s.players[0].hand.slice(0, 2).map((c) => c.id);
  assert.throws(() =>
    command(s, 0, "SIGNAL_DISCARD", { cardIds: ids.slice(0, 1) }),
  );
  s = command(s, 0, "SIGNAL_DISCARD", { cardIds: ids });
  assert.equal(s.players[0].hand.length, 5);
  assert.equal(s.turnPlayerId, "p1");
  s = fixture();
  s.discard = s.deck;
  s.deck = [];
  s = command(s, 0, "SIGNAL_END_TURN");
  assert.equal(s.players[1].hand.length, 2);
  assert.equal(s.deck.length, 78);
});

function auto(s: SignalState): [string, InputCommand] {
  const v = project(s, project(s, s.turnPlayerId).activePlayerId);
  const choice = signalBotCommand(v);
  assert.ok(choice, `no public-view action in ${v.phase}`);
  return [v.you, choice];
}
test("60 seeded complete games conserve 80 cards through responses, deaths and restarts", () => {
  let commands = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const rng = entropy(seed),
      n = 4 + (seed % 4);
    let s = create(
      Array.from({ length: n }, (_, i) => `p${i}`),
      rng,
    );
    for (let step = 0; step < 1500 && !s.result; step++) {
      const [actor, c] = auto(s);
      s = apply(JSON.parse(JSON.stringify(s)), actor, c, rng);
      commands++;
    }
    assert.ok(s.result, `seed ${seed} did not finish`);
    validate(s);
    assert.equal(allCards(s).length, 80);
  }
  assert.ok(commands > 1000);
});
