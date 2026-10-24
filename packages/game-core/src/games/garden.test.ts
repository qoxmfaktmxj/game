import test from "node:test";
import assert from "node:assert/strict";
import * as game from "./garden";
import type { Entropy } from "../entropy";
let now = 1000;
const entropy: Entropy = {
  now: () => now,
  randomInt: (n) => n - 1,
  createId: () => "test",
};
const id = (n: number, color = "coral", copy = 0) => `g-${color}-${n}-${copy}`;
function fixture(hand: string[], board: game.PlacedTile[][] = []) {
  now = 1000;
  const state = game.create(["a", "b"], entropy);
  state.activePlayerIndex = 0;
  const used = new Set([...hand, ...board.flat().map((t) => t.id)]);
  const rest = game.createTiles().filter((t) => !used.has(t.id));
  state.racks = [
    hand.map((key) => game.createTiles().find((t) => t.id === key)!),
    rest.splice(0, 14),
  ];
  state.pool = rest;
  state.board = board;
  return state;
}
function play(
  state: game.GardenState,
  rows: { id: string; jokerColor?: game.Color; jokerValue?: number }[][],
) {
  return game.apply(
    state,
    "a",
    { type: "GARDEN_PLAY", payload: { board: rows } },
    entropy,
  );
}
test("106 unique tiles, 14 per rack, concealed pool and opponents", () => {
  const s = game.create(["a", "b", "c", "d"], entropy);
  game.validate(s);
  assert.equal(s.pool.length, 50);
  assert.deepEqual(
    s.racks.map((r) => r.length),
    [14, 14, 14, 14],
  );
  const v = game.project(s, "a");
  assert.equal(v.yourRack.length, 14);
  assert.ok(!("racks" in v));
  assert.ok(!("pool" in v));
  assert.equal(v.players[1].rackCount, 14);
});
test("initial meld needs 30 from rack, cannot wrap or duplicate a color", () => {
  const s = fixture([id(8), id(9), id(10), id(11)]);
  assert.throws(() => play(s, [[8, 9, 10].map((n) => ({ id: id(n) }))]), {
    code: "INITIAL_MELD",
  });
  const next = play(s, [[9, 10, 11].map((n) => ({ id: id(n) }))]);
  assert.equal(next.opened[0], true);
  assert.equal(next.racks[0].length, 1);
  game.validate(next);
  assert.equal(s.version, 0);
  assert.equal(s.racks[0].length, 4);
  assert.equal(
    game.validMeld(
      [12, 13, 1].map((n) => ({ id: id(n), color: "coral", value: n })),
    ),
    false,
  );
  assert.equal(
    game.validMeld(
      [0, 1, 2].map((_, i) => ({ id: String(i), color: "coral", value: 5 })),
    ),
    false,
  );
});
test("atomic board rejects duplicate, missing and opponent tiles", () => {
  const board = [
    [10, 11, 12].map((n) => ({ id: id(n), color: "coral" as const, value: n })),
  ];
  const s = fixture([id(13), id(3, "sky")], board);
  s.opened[0] = true;
  assert.throws(() =>
    play(s, [
      [...board[0].map((t) => ({ id: t.id })), { id: id(13) }, { id: id(13) }],
    ]),
  );
  assert.throws(
    () => play(s, [[{ id: id(11) }, { id: id(12) }, { id: id(13) }]]),
    { code: "INVALID_MELD" },
  );
  assert.throws(
    () => play(s, [[{ id: s.racks[1][0].id }, { id: id(12) }, { id: id(13) }]]),
    { code: "CARD_NOT_OWNED" },
  );
  const n = play(s, [[...board[0].map((t) => ({ id: t.id })), { id: id(13) }]]);
  assert.equal(n.board[0].length, 4);
});
test("joker has an explicit face and can be retrieved into another valid set", () => {
  const board: game.PlacedTile[][] = [
    [
      { id: id(10), color: "coral", value: 10 },
      {
        id: "g-joker-0",
        color: null,
        value: null,
        jokerColor: "coral",
        jokerValue: 11,
      },
      { id: id(12), color: "coral", value: 12 },
    ],
  ];
  const s = fixture(
    [id(11), id(3, "sky"), id(3, "leaf"), id(2, "violet")],
    board,
  );
  s.opened[0] = true;
  const n = play(s, [
    [10, 11, 12].map((v) => ({ id: id(v) })),
    [
      { id: id(3, "sky") },
      { id: id(3, "leaf") },
      { id: "g-joker-0", jokerColor: "violet", jokerValue: 3 },
    ],
  ]);
  assert.equal(n.racks[0].length, 1);
  game.validate(n);
  s.opened[0] = false;
  assert.throws(
    () =>
      play(
        s,
        n.board.map((r) =>
          r.map((t) => ({
            id: t.id,
            ...(t.value === null
              ? { jokerColor: t.jokerColor, jokerValue: t.jokerValue }
              : {}),
          })),
        ),
      ),
    { code: "INITIAL_MELD" },
  );
});
test("last rack meld ends game with zero-sum scores and joker penalty", () => {
  const s = fixture([id(10), id(11), id(12)]);
  const n = play(s, [[10, 11, 12].map((v) => ({ id: id(v) }))]);
  const result = game.getResult(n)!;
  assert.equal(n.phase, "FINISHED");
  assert.deepEqual(result.winners, ["a"]);
  assert.equal(
    result.scores.reduce((sum, s) => sum + s.total, 0),
    0,
  );
  assert.equal(result.reason, "EMPTY_RACK");
  assert.throws(
    () => game.apply(n, "b", { type: "GARDEN_DRAW", payload: {} }, entropy),
    { code: "GAME_FINISHED" },
  );
});
test("server clock pauses with connection loss and resumes remaining time", () => {
  const s = fixture([id(10), id(11), id(12)]);
  now += 25_000;
  const paused = game.tick(s, true, entropy)!;
  assert.equal(paused.remainingMs, 35_000);
  now += 100_000;
  assert.equal(game.tick(paused, true, entropy), null);
  const resumed = game.tick(paused, false, entropy)!;
  assert.equal(resumed.deadline, now + 35_000);
  now += 35_000;
  const expired = game.tick(resumed, false, entropy)!;
  assert.equal(expired.racks[0].length, 4);
  assert.equal(expired.activePlayerIndex, 1);
});
test("unfinished manipulation timeout rolls back board and draws three", () => {
  const s = fixture([id(10), id(11), id(12)]);
  const editing = game.apply(
    s,
    "a",
    { type: "GARDEN_BEGIN", payload: {} },
    entropy,
  );
  now += 60_000;
  const expired = game.tick(editing, false, entropy)!;
  assert.equal(expired.racks[0].length, 6);
  assert.deepEqual(expired.board, []);
  assert.equal(expired.editing, false);
});
test("empty-pool no-play declarations complete only after every player", () => {
  const s = fixture([id(1)]);
  s.racks[1].push(...s.pool);
  s.pool = [];
  const one = game.apply(s, "a", { type: "GARDEN_DRAW", payload: {} }, entropy);
  assert.equal(one.phase, "PLAY");
  const two = game.apply(
    one,
    "b",
    { type: "GARDEN_DRAW", payload: {} },
    entropy,
  );
  assert.equal(two.phase, "FINISHED");
  assert.deepEqual(game.getResult(two)!.winners, ["a"]);
  game.validate(two);
});
test("persisted states reject corrupt physical tiles and metadata", () => {
  const s = fixture([id(1)]);
  s.pool[0].value = 100;
  assert.throws(() => game.validate(s), { code: "INVALID_STATE" });
  assert.throws(
    () =>
      game.validate({
        ...game.create(["a", "b"], entropy),
        remainingMs: undefined,
      }),
    { code: "INVALID_STATE" },
  );
});

test("user-selected blocked tie is a shared win with no score for every player", () => {
  const s = game.create(["a", "b", "c"], entropy);
  const all = game.createTiles();
  const a = all.find((t) => t.id === id(1))!,
    b = all.find((t) => t.id === id(1, "sky"))!;
  s.racks = [[a], [b], all.filter((t) => t.id !== a.id && t.id !== b.id)];
  s.pool = [];
  s.board = [];
  s.phase = "FINISHED";
  s.passes = ["a", "b", "c"];
  game.validate(s);
  const result = game.getResult(s)!;
  assert.deepEqual(result.winners, ["a", "b"]);
  assert.equal(result.reason, "BLOCKED_TIE");
  assert.deepEqual(
    result.scores.map((p) => p.total),
    [0, 0, 0],
  );
});

test("restored terminal states require a real empty rack or an exhausted-pool agreement", () => {
  const fresh = () => game.create(["a", "b"], entropy);
  const falseBlocked = fresh();
  falseBlocked.phase = "FINISHED";
  falseBlocked.passes = ["a", "b"];
  assert.throws(() => game.validate(falseBlocked), { code: "INVALID_STATE" });

  const prematurePass = fresh();
  prematurePass.passes = ["a"];
  assert.throws(() => game.validate(prematurePass), { code: "INVALID_STATE" });

  const playingEmpty = fresh();
  playingEmpty.pool.push(...playingEmpty.racks[0]);
  playingEmpty.racks[0] = [];
  assert.throws(() => game.validate(playingEmpty), { code: "INVALID_STATE" });

  const playingWinner = structuredClone(playingEmpty);
  playingWinner.winnerId = "a";
  playingWinner.opened[0] = true;
  assert.throws(() => game.validate(playingWinner), { code: "INVALID_STATE" });

  const blockedEmpty = structuredClone(playingEmpty);
  blockedEmpty.phase = "FINISHED";
  blockedEmpty.racks[1].push(...blockedEmpty.pool);
  blockedEmpty.pool = [];
  blockedEmpty.passes = ["a", "b"];
  assert.throws(() => game.validate(blockedEmpty), { code: "INVALID_STATE" });

  const ended = play(fixture([id(10), id(11), id(12)]), [
    [10, 11, 12].map((n) => ({ id: id(n) })),
  ]);
  assert.doesNotThrow(() => game.validate(ended));
  ended.remainingMs = 1000;
  assert.throws(() => game.validate(ended), { code: "INVALID_STATE" });
});
