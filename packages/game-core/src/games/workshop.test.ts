import test from "node:test";
import assert from "node:assert/strict";
import * as g from "./workshop";
import type { Entropy } from "../entropy";
const entropy: Entropy = {
  randomInt: (n) => n - 1,
  createId: () => "",
  now: () => 1000,
};
const act = (
  s: g.WorkshopState,
  type: string,
  payload: Record<string, unknown> = {},
) => g.apply(s, s.playerIds[s.activePlayerIndex], { type, payload }, entropy);
function give(s: g.WorkshopState, index: number, tokens: Partial<g.Tokens>) {
  for (const color of g.TOKENS) {
    const n = tokens[color] ?? 0;
    s.players[index].tokens[color] += n;
    s.bank[color] -= n;
  }
}
function own(s: g.WorkshopState, index: number, id: string) {
  let card: g.Work | undefined;
  for (const rows of [s.market, s.decks])
    for (let level = 0; level < rows.length; level++) {
      const row = rows[level];
      const i = row.findIndex((w) => w.id === id);
      if (i >= 0) {
        card = row.splice(i, 1)[0];
        if (rows === s.market) {
          const replacement = s.decks[level].shift();
          if (replacement) row.splice(i, 0, replacement);
        }
      }
    }
  assert.ok(card);
  s.players[index].owned.push(card);
}
test("base data has 40/30/20 works and ten patrons, setup scales bank", () => {
  assert.deepEqual(
    [1, 2, 3].map((l) => g.WORKS.filter((w) => w.level === l).length),
    [40, 30, 20],
  );
  assert.equal(g.PATRONS.length, 10);
  for (const n of [2, 3, 4]) {
    const s = g.create(
      Array.from({ length: n }, (_, i) => String(i)),
      entropy,
    );
    g.validate(s);
    assert.equal(s.bank.white, n === 4 ? 7 : n + 2);
    assert.equal(s.patrons.length, n + 1);
    assert.deepEqual(
      s.decks.map((d) => d.length),
      [36, 26, 16],
    );
  }
});
test("different-three and same-two require correct supply", () => {
  let s = g.create(["a", "b"], entropy);
  const first = act(s, "WORKSHOP_TAKE", { colors: ["white", "blue", "green"] });
  assert.equal(first.players[0].tokens.white, 1);
  assert.equal(s.bank.white, 4);
  assert.throws(
    () => act(first, "WORKSHOP_TAKE", { colors: ["white", "white"] }),
    { code: "TOKEN_SUPPLY" },
  );
  assert.throws(() => act(first, "WORKSHOP_TAKE", { colors: ["gold"] }));
  assert.throws(() => act(first, "WORKSHOP_TAKE", { colors: ["red"] }), {
    code: "TOKEN_SELECTION",
  });
  s = act(first, "WORKSHOP_TAKE", { colors: ["red", "red"] });
  assert.equal(s.players[1].tokens.red, 2);
});
test("tokens can exceed ten during action then player chooses returns", () => {
  const s = g.create(["a", "b", "c", "d"], entropy);
  give(s, 0, { white: 3, blue: 3, green: 3, gold: 1 });
  const n = act(s, "WORKSHOP_TAKE", { colors: ["white", "blue", "red"] });
  assert.equal(n.phase, "RETURN");
  assert.equal(n.activePlayerIndex, 0);
  assert.throws(() => act(n, "WORKSHOP_BUY", { cardId: n.market[0][0].id }), {
    code: "WRONG_PHASE",
  });
  assert.throws(() => act(n, "WORKSHOP_RETURN", { tokens: { white: 2 } }), {
    code: "TOKEN_RETURN",
  });
  const r = act(n, "WORKSHOP_RETURN", {
    tokens: { gold: 1, white: 1, red: 1 },
  });
  assert.equal(r.phase, "ACTION");
  assert.equal(r.activePlayerIndex, 1);
  assert.equal(r.bank.gold, 5);
});
test("blind reserve hides identity, allows no gold, caps at three", () => {
  let s = g.create(["a", "b"], entropy);
  give(s, 1, { gold: 5 });
  for (let i = 0; i < 3; i++) {
    s = act(s, "WORKSHOP_RESERVE", { level: 1 });
    assert.equal(s.players[0].tokens.gold, 0);
    s.activePlayerIndex = 0;
  }
  const v = g.project(s, "b");
  assert.equal(v.players[0].reservedCount, 3);
  assert.equal(v.yourReserved.length, 0);
  assert.ok(!JSON.stringify(v).includes(s.players[0].reserved[0].id));
  assert.throws(() => act(s, "WORKSHOP_RESERVE", { level: 2 }), {
    code: "RESERVE_LIMIT",
  });
  g.validate(s);
});
test("buy supports voluntary gold, exact payment, permanent discounts", () => {
  const s = g.create(["a", "b"], entropy);
  const w = s.market[0].find((w) => w.cost.blue === 3)!;
  give(s, 0, { blue: 3, gold: 1 });
  assert.throws(
    () =>
      act(s, "WORKSHOP_BUY", { cardId: w.id, payment: { blue: 1, gold: 1 } }),
    { code: "INSUFFICIENT_TOKENS" },
  );
  const n = act(s, "WORKSHOP_BUY", {
    cardId: w.id,
    payment: { blue: 2, gold: 1 },
  });
  assert.equal(n.players[0].tokens.blue, 1);
  assert.equal(n.players[0].owned[0].id, w.id);
  assert.equal(g.bonuses(n.players[0]).white, 1);
  assert.equal(n.market[0].length, 4);
});
test("qualifying for multiple patrons requires choice and grants only one", () => {
  const s = g.create(["a", "b"], entropy);
  for (const c of ["green", "red", "blue"] as const)
    for (const w of g.WORKS.filter((w) => w.bonus === c).slice(0, 4))
      own(s, 0, w.id);
  assert.equal(s.patrons[0].id, "p-1");
  assert.equal(s.patrons[1].id, "p-2");
  const n = act(s, "WORKSHOP_TAKE", { colors: ["white", "blue", "black"] });
  assert.equal(n.phase, "PATRON");
  assert.equal(n.activePlayerIndex, 0);
  assert.throws(() => act(n, "WORKSHOP_PATRON", { patronId: "p-10" }), {
    code: "PATRON_NOT_ELIGIBLE",
  });
  const r = act(n, "WORKSHOP_PATRON", { patronId: "p-2" });
  assert.equal(r.players[0].patrons.length, 1);
  assert.equal(r.activePlayerIndex, 1);
});
test("15-point trigger completes round, ties break by fewer works", () => {
  const s = g.create(["a", "b", "c"], entropy);
  for (const w of g.WORKS.filter((w) => w.points === 5).slice(0, 3))
    own(s, 0, w.id);
  let n = act(s, "WORKSHOP_TAKE", { colors: ["white", "blue", "green"] });
  assert.equal(n.finalRound, true);
  assert.equal(n.phase, "ACTION");
  assert.equal(n.activePlayerIndex, 1);
  n = act(n, "WORKSHOP_TAKE", { colors: ["white", "blue", "green"] });
  assert.equal(n.phase, "ACTION");
  n = act(n, "WORKSHOP_TAKE", { colors: ["white", "blue", "green"] });
  assert.equal(n.phase, "FINISHED");
  assert.deepEqual(g.getResult(n)!.winners, ["a"]);
});
test("strict inputs, other player and physical-data corruption are rejected", () => {
  const s = g.create(["a", "b"], entropy);
  assert.throws(
    () =>
      g.apply(
        s,
        "b",
        {
          type: "WORKSHOP_TAKE",
          payload: { colors: ["white", "blue", "green"] },
        },
        entropy,
      ),
    { code: "NOT_YOUR_TURN" },
  );
  assert.throws(
    () =>
      act(s, "WORKSHOP_TAKE", {
        colors: ["white", "blue", "green"],
        actorId: "b",
      }),
    { code: "INVALID_INPUT" },
  );
  s.decks[0][0].points = 99;
  assert.throws(() => g.validate(s), { code: "INVALID_STATE" });
});

test("restore rejects forged final rounds, tier swaps and unearned patrons", () => {
  const fresh = () => g.create(["a", "b"], entropy);
  const falseFinished = fresh();
  falseFinished.phase = "FINISHED";
  assert.throws(() => g.validate(falseFinished), { code: "INVALID_STATE" });
  falseFinished.finalRound = true;
  assert.throws(() => g.validate(falseFinished), { code: "INVALID_STATE" });

  const wrongTier = fresh();
  [wrongTier.decks[0][0], wrongTier.decks[2][0]] = [
    wrongTier.decks[2][0],
    wrongTier.decks[0][0],
  ];
  assert.throws(() => g.validate(wrongTier), { code: "INVALID_STATE" });
  const wrongMarket = fresh();
  [wrongMarket.market[0][0], wrongMarket.market[2][0]] = [
    wrongMarket.market[2][0],
    wrongMarket.market[0][0],
  ];
  assert.throws(() => g.validate(wrongMarket), { code: "INVALID_STATE" });

  const unfilled = fresh();
  unfilled.decks[0].push(unfilled.market[0].pop()!);
  assert.throws(() => g.validate(unfilled), { code: "INVALID_STATE" });

  const unearned = fresh();
  unearned.players[0].patrons.push(unearned.patrons.pop()!);
  assert.throws(() => g.validate(unearned), { code: "INVALID_STATE" });

  const extraPatron = fresh();
  extraPatron.patrons.push(extraPatron.unusedPatrons.pop()!);
  assert.throws(() => g.validate(extraPatron), { code: "INVALID_STATE" });

  const missedTrigger = fresh();
  for (const work of g.WORKS.filter((w) => w.points === 5).slice(0, 3))
    own(missedTrigger, 0, work.id);
  assert.throws(() => g.validate(missedTrigger), { code: "INVALID_STATE" });
  const afterTurn = act(missedTrigger, "WORKSHOP_TAKE", {
    colors: ["white", "blue", "green"],
  });
  assert.doesNotThrow(() => g.validate(afterTurn));
  afterTurn.activePlayerIndex = 0;
  assert.throws(() => g.validate(afterTurn), { code: "INVALID_STATE" });
});
test("seeded complete games conserve cards/tokens through every serialized command", () => {
  for (let seed = 1; seed <= 12; seed++) {
    let rng = seed;
    const e: Entropy = {
      ...entropy,
      randomInt: (n) => {
        rng = (rng * 1664525 + 1013904223) >>> 0;
        return rng % n;
      },
    };
    let s = g.create(
        Array.from({ length: 2 + (seed % 3) }, (_, i) => String(i)),
        e,
      ),
      steps = 0;
    while (s.phase !== "FINISHED" && steps < 1600) {
      const p = s.players[s.activePlayerIndex],
        available = [...s.market.flat(), ...p.reserved];
      let command: { type: string; payload: Record<string, unknown> };
      if (s.phase === "PATRON")
        command = {
          type: "WORKSHOP_PATRON",
          payload: { patronId: g.project(s, p.id).eligiblePatronIds[0] },
        };
      else if (s.phase === "RETURN") {
        const returned = {
          white: 0,
          blue: 0,
          green: 0,
          red: 0,
          black: 0,
          gold: 0,
        };
        let excess = g.TOKENS.reduce((n, c) => n + p.tokens[c], 0) - 10;
        const target = available.sort(
          (a, b) =>
            g.COLORS.reduce(
              (n, c) =>
                n + Math.max(0, a.cost[c] - g.bonuses(p)[c] - p.tokens[c]),
              0,
            ) -
            g.COLORS.reduce(
              (n, c) =>
                n + Math.max(0, b.cost[c] - g.bonuses(p)[c] - p.tokens[c]),
              0,
            ),
        )[0];
        for (const c of [...g.COLORS].sort(
          (a, b) =>
            p.tokens[b] -
            Math.max(0, target.cost[b] - g.bonuses(p)[b]) -
            (p.tokens[a] - Math.max(0, target.cost[a] - g.bonuses(p)[a])),
        )) {
          const n = Math.min(excess, p.tokens[c]);
          returned[c] = n;
          excess -= n;
        }
        returned.gold = excess;
        command = { type: "WORKSHOP_RETURN", payload: { tokens: returned } };
      } else {
        const affordable = available
          .filter((w) => g.price(p, w).gold <= p.tokens.gold)
          .sort((a, b) => b.points - a.points || b.level - a.level);
        if (affordable.length)
          command = {
            type: "WORKSHOP_BUY",
            payload: { cardId: affordable[0].id },
          };
        else {
          const bonus = g.bonuses(p);
          const target = available.sort(
            (a, b) =>
              g.COLORS.reduce(
                (n, c) => n + Math.max(0, a.cost[c] - bonus[c] - p.tokens[c]),
                0,
              ) -
              g.COLORS.reduce(
                (n, c) => n + Math.max(0, b.cost[c] - bonus[c] - p.tokens[c]),
                0,
              ),
          )[0];
          const order = g.COLORS.filter((c) => s.bank[c] > 0).sort(
            (a, b) =>
              target.cost[b] -
              bonus[b] -
              p.tokens[b] -
              (target.cost[a] - bonus[a] - p.tokens[a]),
          );
          const c = order[0];
          const take =
            c && s.bank[c] >= 4 && target.cost[c] - bonus[c] - p.tokens[c] >= 2
              ? [c, c]
              : order.slice(0, 3);
          if (take.length)
            command = { type: "WORKSHOP_TAKE", payload: { colors: take } };
          else if (p.reserved.length < 3 && available.length)
            command = {
              type: "WORKSHOP_RESERVE",
              payload: { cardId: s.market.flat()[0].id },
            };
          else throw Error("No action in test policy");
        }
      }
      s = g.apply(s, p.id, command, e);
      s = g.validate(JSON.parse(JSON.stringify(s)));
      steps++;
    }
    assert.equal(s.phase, "FINISHED", `seed ${seed} after ${steps} actions`);
    assert.ok(g.getResult(s)!.winners.length);
  }
});
