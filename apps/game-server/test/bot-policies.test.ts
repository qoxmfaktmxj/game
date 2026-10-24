import test from "node:test";
import assert from "node:assert/strict";
import type { GameKey, GameViewMap } from "@moyeotable/contracts";
import {
  applyGame,
  createGame,
  projectGame,
  type Entropy,
  type GameSnapshot,
} from "@moyeotable/game-core/multigame";
import { chooseBotCommand } from "../src/bots/index.js";

function random(seed: number) {
  return (max: number) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed % max;
  };
}
function entropy(seed: number): Entropy {
  let id = 0;
  return {
    randomInt: random(seed),
    createId: () => `bot-${seed}-${id++}`,
    now: () => 1000,
  };
}
function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const nested of Object.values(value)) freeze(nested);
  }
  return value;
}
function play(gameKey: GameKey, count: number, seed: number, max = 10000) {
  const e = entropy(seed),
    rng = random(seed + 700);
  let game = createGame(
    gameKey,
    Array.from({ length: count }, (_, i) => `p${i}`),
    e,
  );
  const used = new Set<string>();
  let steps = 0;
  while (!game.result && steps < max) {
    const views = game.state.playerIds.map(
      (id) => projectGame(game, id, false).game,
    );
    const view = views.find((value) => value.activePlayerId === value.you)!;
    const before = JSON.stringify(view);
    const command = chooseBotCommand(gameKey, freeze(view), rng);
    assert.ok(
      command,
      `${gameKey} seed ${seed} phase ${view.phase} has no bot action`,
    );
    assert.equal(
      JSON.stringify(view),
      before,
      "policy must not mutate its projected input",
    );
    used.add(command.type);
    try {
      game = applyGame(game, view.you, command, e);
    } catch (error) {
      throw new Error(
        `${gameKey} seed ${seed}, step ${steps}, ${JSON.stringify(command)}: ${String(error)}`,
        { cause: error },
      );
    }
    steps++;
  }
  assert.ok(
    game.result,
    `${gameKey} seed ${seed} did not finish after ${steps} commands`,
  );
  assert.ok(game.result.winners.length > 0);
  for (const id of game.state.playerIds)
    assert.equal(
      chooseBotCommand(gameKey, projectGame(game, id, false).game, rng),
      null,
    );
  return { steps, used, game };
}

for (const config of [
  { key: "star-trails", min: 2, max: 2, seeds: 10 },
  { key: "workshop", min: 2, max: 4, seeds: 12 },
  { key: "council", min: 2, max: 7, seeds: 18 },
  { key: "signal", min: 4, max: 7, seeds: 16 },
  { key: "garden", min: 2, max: 4, seeds: 9 },
] as const)
  test(`medium ${config.key} bots finish seeded games at every supported seat count using only public views`, () => {
    const used = new Set<string>();
    for (let seed = 1; seed <= config.seeds; seed++) {
      const played = play(
        config.key,
        config.min + ((seed - 1) % (config.max - config.min + 1)),
        seed,
      );
      for (const type of played.used) used.add(type);
    }
    const expected: Record<GameKey, string[]> = {
      "star-trails": ["STAR_PLAY", "STAR_DRAW_DECK"],
      workshop: ["WORKSHOP_BUY", "WORKSHOP_TAKE"],
      council: ["COUNCIL_DRAFT", "COUNCIL_BUILD", "COUNCIL_POWER"],
      signal: ["SIGNAL_PLAY", "SIGNAL_RESPOND", "SIGNAL_ACCEPT_ELIMINATION"],
      garden: ["GARDEN_PLAY", "GARDEN_DRAW"],
    };
    for (const type of expected[config.key])
      assert.ok(used.has(type), `${config.key} must exercise ${type}`);
  });

test("identical permitted views and RNG produce identical choices despite a different concealed deck", () => {
  for (const key of [
    "star-trails",
    "workshop",
    "council",
    "signal",
    "garden",
  ] as GameKey[]) {
    const game = createGame(
      key,
      Array.from({ length: key === "signal" ? 4 : 2 }, (_, i) => `p${i}`),
      entropy(100),
    );
    const copy: GameSnapshot = structuredClone(game);
    if (copy.gameKey === "workshop")
      for (const deck of copy.state.decks) deck.reverse();
    else if (copy.gameKey === "garden") copy.state.pool.reverse();
    else copy.state.deck.reverse();
    const id = game.state.playerIds.find((id) => {
      const v = projectGame(game, id, false).game;
      return v.activePlayerId === id;
    })!;
    const first = projectGame(game, id, false).game,
      second = projectGame(copy, id, false).game;
    assert.deepEqual(first, second);
    assert.deepEqual(
      chooseBotCommand(key, first, random(25)),
      chooseBotCommand(key, second, random(25)),
    );
    const paused = projectGame(game, id, true).game;
    assert.equal(chooseBotCommand(key, paused, random(25)), null);
  }
});

test("signal bots rescue themselves and an ally never deliberately shoots the revealed captain", () => {
  const game = createGame("signal", ["a", "b", "c", "d"], entropy(11));
  const v = projectGame(game, "a", false).game as GameViewMap["signal"];
  const me = v.players.find((p) => p.id === "a")!;
  const tonic: GameViewMap["signal"]["yourHand"][number] = {
    ...v.yourHand[0]!,
    id: "tonic-test",
    kind: "tonic",
    suit: "hearts",
    rank: 6,
    equipment: false,
  };
  const rescue = {
    ...v,
    phase: "DYING" as const,
    activePlayerId: "a",
    legalActions: ["SIGNAL_RESCUE", "SIGNAL_ACCEPT_ELIMINATION"],
    yourHand: [tonic],
    players: v.players.map((p) => (p.id === "a" ? { ...p, health: 0 } : p)),
  };
  assert.deepEqual(chooseBotCommand("signal", rescue, random(1)), {
    type: "SIGNAL_RESCUE",
    payload: { cardIds: [tonic.id] },
  });
  const attack = structuredClone(v);
  attack.phase = "ACTION";
  attack.legalActions = ["SIGNAL_PLAY", "SIGNAL_END_TURN"];
  attack.activePlayerId = "a";
  attack.yourRole = "ally";
  attack.strikesPlayed = 0;
  attack.weaponRange = 1;
  attack.yourHand = [{ ...tonic, id: "strike-test", kind: "strike" }];
  attack.players = attack.players.map((p, i) => ({
    ...p,
    role: p.id === "a" ? "ally" : i === 1 ? "captain" : null,
    distance: p.id === "a" ? null : i === 1 ? 1 : 2,
  }));
  assert.equal(
    chooseBotCommand("signal", attack, random(1))?.type,
    "SIGNAL_END_TURN",
  );
  assert.ok(me);
});
