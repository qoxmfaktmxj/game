import test from "node:test";
import assert from "node:assert/strict";
import * as garden from "../../../packages/game-core/src/games/garden.js";
import type { Entropy } from "@moyeotable/game-core/multigame";
import { chooseGardenCommand } from "../src/bots/garden.js";

const id = (value: number, color = "coral", copy = 0) =>
  `g-${color}-${value}-${copy}`;
const entropy: Entropy = {
  randomInt: (max) => max - 1,
  now: () => 1_000,
  createId: () => "test",
};
function fixture(
  hand: string[],
  board: garden.PlacedTile[][] = [],
  opened = false,
) {
  const original = garden.createTiles();
  const used = new Set([...hand, ...board.flat().map((tile) => tile.id)]);
  const rest = original.filter((tile) => !used.has(tile.id));
  const state = garden.create(["bot", "friend"], entropy);
  state.activePlayerIndex = 0;
  state.racks = [
    hand.map((key) => original.find((tile) => tile.id === key)!),
    rest.splice(0, 14),
  ];
  state.pool = rest;
  state.board = board;
  state.opened[0] = opened;
  garden.validate(state);
  return state;
}
const row = (
  values: number[],
  color: garden.Color = "coral",
): garden.PlacedTile[] =>
  values.map((value) => ({ id: id(value, color), color, value }));
const joker = (
  value: number,
  color: garden.Color = "coral",
): garden.PlacedTile => ({
  id: "g-joker-0",
  color: null,
  value: null,
  jokerColor: color,
  jokerValue: value,
});
function takeTurn(state: garden.GardenState) {
  const actor = state.playerIds[state.activePlayerIndex];
  const view = garden.project(state, actor);
  const before = structuredClone(view);
  const command = chooseGardenCommand(view, () => 0);
  assert.ok(command, "an active bot must produce a command");
  const next = garden.apply(state, actor, command, entropy);
  assert.deepEqual(view, before, "policy must not mutate its projected input");
  return { next, command };
}

test("garden bot opens a legal run instead of merely drawing", () => {
  const state = fixture([id(9), id(10), id(11), id(2, "sky")]);
  const { next, command } = takeTurn(state);
  assert.equal(command.type, "GARDEN_PLAY");
  assert.equal(next.opened[0], true);
  assert.equal(next.racks[0].length, 1);
  assert.equal(next.board.length, 1);
});

test("garden bot combines separate rack melds to meet exactly 30", () => {
  const state = fixture([
    id(6),
    id(6, "sky"),
    id(6, "leaf"),
    ...[3, 4, 5].map((n) => id(n, "violet")),
    id(13),
  ]);
  const { next, command } = takeTurn(state);
  assert.equal(command.type, "GARDEN_PLAY");
  assert.equal(next.board.length, 2);
  assert.equal(next.racks[0].length, 1);
  assert.equal(
    next.board.flat().reduce((sum, tile) => sum + tile.value!, 0),
    30,
  );
});

test("garden bot cannot use existing board points or duplicate colors for its first meld", () => {
  for (const state of [
    fixture([id(12), id(13)], [row([9, 10, 11])]),
    fixture([id(5), id(5, "coral", 1), id(5, "sky")]),
    fixture([id(7), id(8), id(9)]),
  ]) {
    const { next, command } = takeTurn(state);
    assert.equal(command.type, "GARDEN_DRAW");
    assert.deepEqual(next.board, state.board);
    assert.equal(next.opened[0], false);
  }
});

test("garden bot assigns one or two rack jokers explicitly and legally", () => {
  for (const hand of [
    [id(11), id(12), "g-joker-0"],
    [id(13), "g-joker-0", "g-joker-1"],
  ]) {
    const { next, command } = takeTurn(fixture(hand));
    assert.equal(command.type, "GARDEN_PLAY");
    assert.equal(next.phase, "FINISHED");
    for (const tile of next.board
      .flat()
      .filter((tile) => tile.value === null)) {
      assert.ok(tile.jokerColor);
      assert.ok(Number.isInteger(tile.jokerValue));
    }
  }
});

test("garden bot extends both ends of a public run after opening", () => {
  const state = fixture(
    [id(3), id(7), id(8), id(1, "sky")],
    [row([4, 5, 6])],
    true,
  );
  const { next } = takeTurn(state);
  assert.equal(next.racks[0].length, 1);
  assert.deepEqual(
    next.board[0].map((tile) => tile.value),
    [3, 4, 5, 6, 7, 8],
  );
});

test("garden bot adds the fourth color to a public group", () => {
  const group = [...row([9]), ...row([9], "sky"), ...row([9], "leaf")];
  const { next } = takeTurn(fixture([id(9, "violet"), id(2)], [group], true));
  assert.equal(next.board[0].length, 4);
  assert.equal(next.racks[0].length, 1);
});

test("garden bot replaces a public joker and reuses it in a new meld in the same command", () => {
  const state = fixture(
    [id(11), id(3, "sky"), id(3, "leaf"), id(1, "violet")],
    [[...row([10]), joker(11), ...row([12])]],
    true,
  );
  const { next } = takeTurn(state);
  assert.equal(next.racks[0].length, 1);
  assert.equal(next.board.length, 2);
  assert.ok(next.board[0].every((tile) => tile.value !== null));
  assert.equal(
    next.board[1].find((tile) => tile.id === "g-joker-0")!.jokerValue,
    3,
  );
});

test("garden bot can reuse a loose end joker while preserving all board tiles", () => {
  const state = fixture(
    [id(8, "sky"), id(8, "leaf"), id(1, "violet")],
    [[...row([3, 4, 5]), joker(6)]],
    true,
  );
  const { next } = takeTurn(state);
  assert.equal(next.racks[0].length, 1);
  assert.deepEqual(next.board[0], row([3, 4, 5]));
  assert.equal(
    next.board[1].find((tile) => tile.id === "g-joker-0")!.jokerValue,
    8,
  );
  assert.equal(new Set(next.board.flat().map((tile) => tile.id)).size, 6);
});

test("garden bot abstains for another player's turn, paused view or finished game", () => {
  const state = fixture([id(10), id(11), id(12)]);
  assert.equal(
    chooseGardenCommand(garden.project(state, "friend"), () => 0),
    null,
  );
  const paused = structuredClone(state);
  paused.remainingMs = 20_000;
  assert.equal(
    chooseGardenCommand(garden.project(paused, "bot"), () => 0),
    null,
  );
  const { next } = takeTurn(state);
  assert.equal(
    chooseGardenCommand(garden.project(next, "bot"), () => 0),
    null,
  );
});

test("garden bot decisions are independent of opponent racks and pool order", () => {
  const state = fixture([id(10), id(11), id(12), id(3, "sky")]);
  const alternative = structuredClone(state);
  [alternative.racks[1][0], alternative.pool[0]] = [
    alternative.pool[0],
    alternative.racks[1][0],
  ];
  alternative.pool.reverse();
  garden.validate(alternative);
  const first = garden.project(state, "bot"),
    second = garden.project(alternative, "bot");
  assert.deepEqual(first, second);
  assert.deepEqual(
    chooseGardenCommand(first, () => 2),
    chooseGardenCommand(second, () => 2),
  );
});

test("garden bots pass with an empty pool and finish a blocked table", () => {
  const state = garden.create(["bot", "friend"], entropy);
  const all = garden.createTiles();
  state.racks = [
    [all.find((tile) => tile.id === id(1))!],
    [all.find((tile) => tile.id === id(2, "sky"))!],
  ];
  state.pool = [];
  state.board = [];
  for (let copy = 0; copy < 2; copy++)
    for (let value = 1; value <= 13; value++) {
      state.board.push(
        garden.COLORS.map((color) => {
          const key = id(value, color, copy);
          if (key === id(1)) return joker(1);
          if (key === id(2, "sky"))
            return { ...joker(2, "sky"), id: "g-joker-1" };
          return all.find((tile) => tile.id === key)!;
        }),
      );
    }
  state.activePlayerIndex = 0;
  garden.validate(state);
  const first = takeTurn(state);
  assert.equal(first.command.type, "GARDEN_DRAW");
  const second = takeTurn(first.next);
  assert.equal(second.command.type, "GARDEN_DRAW");
  assert.equal(second.next.phase, "FINISHED");
  assert.equal(garden.getResult(second.next)!.reason, "BLOCKED");
});

test(
  "seeded 2–4 player garden bot games conserve tiles and finish with real plays",
  { timeout: 60_000 },
  () => {
    let totalPlays = 0;
    for (const count of [2, 3, 4])
      for (let seed = 1; seed <= 3; seed++) {
        let value = seed * 97 + count;
        const randomInt = (max: number) => {
          value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
          return value % max;
        };
        const rng: Entropy = { ...entropy, randomInt };
        let state = garden.create(
          Array.from({ length: count }, (_, index) => `bot-${index}`),
          rng,
        );
        let turns = 0,
          plays = 0;
        while (state.phase !== "FINISHED" && turns++ < 300) {
          const actor = state.playerIds[state.activePlayerIndex];
          const command = chooseGardenCommand(
            garden.project(state, actor),
            randomInt,
          );
          assert.ok(command);
          state = garden.apply(state, actor, command, rng);
          if (command.type === "GARDEN_PLAY") plays++;
        }
        assert.equal(
          state.phase,
          "FINISHED",
          `${count} players, seed ${seed}, ${turns} turns`,
        );
        assert.ok(
          plays > 1,
          "bots must build and extend melds, not only drain the pool",
        );
        garden.validate(state);
        totalPlays += plays;
      }
    assert.ok(totalPlays > 40);
  },
);
