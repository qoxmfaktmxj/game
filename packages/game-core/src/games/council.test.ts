import assert from "node:assert/strict";
import { test } from "node:test";
import { create, createDeck, apply, project, validate, getResult, DISTRICTS, ROLES, type CouncilState, type DistrictCard } from "./council.js";
import type { Entropy, InputCommand } from "../entropy.js";

function entropy(seed = 1): Entropy { let s = seed, id = 0; return { randomInt(max) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s % max; }, createId: () => `id-${++id}`, now: () => 1_000 }; }
function move(state: CouncilState, type: string, payload: Record<string, unknown> = {}, random = entropy()): CouncilState { const before = structuredClone(state); const next = apply(state, state.playerIds[state.activePlayerIndex]!, { type, payload }, random); assert.deepEqual(state, before); assert.equal(next.version, state.version + 1); return validate(next); }
function assignRoles(state: CouncilState, roles: number[][]) { state.roles = roles; state.draftPool = []; state.faceUpRoles = []; state.hiddenRoles = ROLES.map((role) => role.rank).filter((rank) => !roles.flat().includes(rank)); state.revealedRoles = roles.flat().filter((rank) => rank <= state.activeRole); }
function turn(rank: number): CouncilState {
  const state = create(["A", "B", "C", "D"], entropy());
  state.round = 1; state.phase = "RESOURCE"; state.activeRole = rank; state.activePlayerIndex = 0;
  assignRoles(state, [[rank], ...ROLES.map((role) => role.rank).filter((r) => r !== rank).slice(0, 3).map((r) => [r])]);
  return validate(state);
}
function give(state: CouncilState, playerIndex: number, kind: string, built = false, round = 1): DistrictCard {
  const locations = [state.deck, ...state.players.flatMap((player) => [player.hand, player.city])];
  const location = locations.find((cards) => cards.some((card) => card.kind === kind));
  if (!location) throw new Error(`Missing ${kind}`);
  const index = location.findIndex((card) => card.kind === kind), original = location.splice(index, 1)[0]!;
  const card = { id: original.id, kind: original.kind };
  if (built) state.players[playerIndex]!.city.push({ ...card, builtRound: round }); else state.players[playerIndex]!.hand.push(card);
  return card;
}
test("council manifest has 66 unique cards with the old base edition's 54 ordinary and 12 special cards", () => {
  const cards = createDeck(); assert.equal(cards.length, 66); assert.equal(new Set(cards.map((card) => card.id)).size, 66);
  assert.equal(DISTRICTS.filter((card) => card.category !== "purple").reduce((n, card) => n + card.copies, 0), 54);
  assert.equal(DISTRICTS.filter((card) => card.category === "purple").reduce((n, card) => n + card.copies, 0), 12);
  assert.equal(DISTRICTS.find((card) => card.effect === "keep")!.copies, 2);
  for (let count = 2; count <= 7; count++) { const state = create(Array.from({ length: count }, (_, i) => `P${i}`), entropy(count)); validate(state); assert.ok(state.players.every((p) => p.gold === 2 && p.hand.length === 4)); }
});
test("two-player draft assigns two secret roles each and requires intermediate discard choices", () => {
  let state = move(create(["A", "B"], entropy()), "COUNCIL_CROWN", { playerId: "B" });
  assert.equal(state.activePlayerIndex, 1);
  for (let pick = 0; pick < 4; pick++) {
    const view = project(state, state.playerIds[state.activePlayerIndex]!);
    const other = project(state, state.playerIds[1 - state.activePlayerIndex]!);
    assert.deepEqual(other.draftChoices, []);
    if (pick === 1) assert.throws(() => apply(state, view.you, { type: "COUNCIL_DRAFT", payload: { role: view.draftChoices[0] } }, entropy()), { code: "INVALID_INPUT" });
    state = move(state, "COUNCIL_DRAFT", { role: view.draftChoices[0], ...(view.draftNeedsDiscard ? { discardRole: view.draftChoices[1] } : {}) });
  }
  assert.deepEqual(state.roles.map((roles) => roles.length), [2, 2]); assert.equal(state.hiddenRoles.length, 4); assert.equal(state.phase, "RESOURCE");
});
test("seven-player final chooser sees the first hidden role while other players cannot", () => {
  let state = move(create(["A", "B", "C", "D", "E", "F", "G"], entropy()), "COUNCIL_CROWN", { playerId: "A" });
  const hidden = state.hiddenRoles[0]!;
  for (let pick = 0; pick < 6; pick++) state = move(state, "COUNCIL_DRAFT", { role: state.draftPool[0] });
  assert.equal(state.draftPool.length, 2); assert.ok(project(state, "G").draftChoices.includes(hidden)); assert.deepEqual(project(state, "A").draftChoices, []);
  state = move(state, "COUNCIL_DRAFT", { role: hidden }); assert.ok(state.roles[6]!.includes(hidden)); assert.equal(state.hiddenRoles.length, 1);
});
test("face-up exclusions never contain the crown role", () => {
  for (let seed = 1; seed <= 80; seed++) for (const count of [4, 5]) {
    const random = entropy(seed), ids = Array.from({ length: count }, (_, i) => `P${i}`);
    const state = apply(create(ids, random), "P0", { type: "COUNCIL_CROWN", payload: { playerId: "P0" } }, random);
    assert.equal(state.faceUpRoles.length, count === 4 ? 2 : 1); assert.ok(!state.faceUpRoles.includes(4)); validate(state);
  }
});
test("an assassinated crown role loses its turn but inherits the crown at round end", () => {
  let state = turn(1); assignRoles(state, [[1], [4], [5], [8]]); const before = state.players[1]!.gold;
  state = move(state, "COUNCIL_POWER", { targetRole: 4 }); state = move(state, "COUNCIL_RESOURCE", { kind: "gold" }); state = move(state, "COUNCIL_END");
  assert.equal(state.activeRole, 5); assert.ok(!state.revealedRoles.includes(4));
  for (let i = 0; i < 2; i++) { state = move(state, "COUNCIL_RESOURCE", { kind: "gold" }); state = move(state, "COUNCIL_END"); }
  assert.equal(state.phase, "DRAFT"); assert.equal(state.crownIndex, 1); assert.equal(state.activePlayerIndex, 1); assert.equal(state.players[1]!.gold, before);
});
test("the thief transfers existing gold before the victim gathers resources", () => {
  let state = turn(2); assignRoles(state, [[2], [3], [4], [5]]); state.players[1]!.gold = 9;
  assert.throws(() => apply(state, "A", { type: "COUNCIL_POWER", payload: { targetRole: 1 } }, entropy()), { code: "INVALID_INPUT" });
  state = move(state, "COUNCIL_POWER", { targetRole: 3 }); state = move(state, "COUNCIL_RESOURCE", { kind: "gold" }); state = move(state, "COUNCIL_END");
  assert.equal(state.activeRole, 3); assert.equal(state.players[1]!.gold, 0); assert.equal(state.players[0]!.gold, 13);
});
test("magician exchanges entire hands privately and can cycle selected cards in chosen order", () => {
  let state = turn(3); const one = [...state.players[0]!.hand], two = [...state.players[1]!.hand];
  state = move(state, "COUNCIL_POWER", { kind: "swap", targetPlayerId: "B" }); assert.deepEqual(state.players[0]!.hand, two); assert.deepEqual(state.players[1]!.hand, one);
  const view = project(state, "A"); assert.equal("hand" in view.players[1]!, false);
  for (const card of one) assert.ok(!JSON.stringify(view).includes(card.id));
  state = turn(3); const ids = state.players[0]!.hand.slice(0, 2).map((card) => card.id); const top = state.deck.slice(0, 2);
  state = move(state, "COUNCIL_POWER", { kind: "cycle", cardIds: ids }); assert.deepEqual(state.players[0]!.hand.slice(-2), top); assert.deepEqual(state.deck.slice(-2).map((card) => card.id), ids);
});
test("architect receives two bonus cards, builds up to three, and rejects duplicates", () => {
  let state = turn(7); state.players[0]!.gold = 30;
  const cards = [give(state, 0, "inn"), give(state, 0, "shrine"), give(state, 0, "outpost")]; const handCount = state.players[0]!.hand.length;
  state = move(state, "COUNCIL_RESOURCE", { kind: "gold" }); assert.equal(state.players[0]!.hand.length, handCount + 2);
  state = move(state, "COUNCIL_BUILD", { cardId: cards[0]!.id });
  const duplicate = give(state, 0, "inn"); assert.throws(() => apply(state, "A", { type: "COUNCIL_BUILD", payload: { cardId: duplicate.id } }, entropy()), { code: "DUPLICATE_DISTRICT" });
  for (const card of cards.slice(1)) state = move(state, "COUNCIL_BUILD", { cardId: card.id });
  assert.equal(state.players[0]!.city.length, 3); assert.throws(() => apply(state, "A", { type: "COUNCIL_BUILD", payload: { cardId: duplicate.id } }, entropy()), { code: "BUILD_LIMIT" });
});
test("observatory and library combine into a private choice of two from three", () => {
  let state = turn(4); give(state, 0, "observatory", true); give(state, 0, "archive", true);
  state = move(state, "COUNCIL_RESOURCE", { kind: "cards" }); assert.equal(state.choice.length, 3); assert.equal(state.keepCount, 2); assert.deepEqual(project(state, "B").choice, []);
  const keep = state.choice.slice(0, 2).map((card) => card.id), bottom = state.choice[2]!.id;
  state = move(state, "COUNCIL_KEEP", { cardIds: keep, bottomOrder: [bottom] }); assert.equal(state.deck.at(-1)!.id, bottom); assert.equal(state.phase, "ACTION");
});
test("old laboratory trades one card for one gold and smithy trades two gold for three cards once per turn", () => {
  let state = turn(4); give(state, 0, "laboratory", true); give(state, 0, "forge", true); const cardId = state.players[0]!.hand[0]!.id, beforeGold = state.players[0]!.gold;
  state = move(state, "COUNCIL_LAB", { cardId }); assert.equal(state.players[0]!.gold, beforeGold + 1); assert.equal(state.deck.at(-1)!.id, cardId);
  assert.throws(() => apply(state, "A", { type: "COUNCIL_LAB", payload: { cardId: state.players[0]!.hand[0]!.id } }, entropy()), { code: "WRONG_PHASE" });
  const beforeCards = state.players[0]!.hand.length; state = move(state, "COUNCIL_SMITHY"); assert.equal(state.players[0]!.hand.length, beforeCards + 3); assert.equal(state.players[0]!.gold, beforeGold - 1);
});
test("income is one complete collection and school of magic contributes to that role's color", () => {
  let state = turn(4); give(state, 0, "prism", true); give(state, 0, "estate", true); const gold = state.players[0]!.gold;
  state = move(state, "COUNCIL_INCOME"); assert.equal(state.players[0]!.gold, gold + 2);
  assert.throws(() => apply(state, "A", { type: "COUNCIL_INCOME", payload: {} }, entropy()), { code: "WRONG_PHASE" });
});
test("warlord respects keep and bishop, charges the wall supplement, and ends the turn after destruction", () => {
  let state = turn(8); assignRoles(state, [[8], [5], [4], [3]]); state.players[0]!.gold = 20;
  const protectedCard = give(state, 1, "inn", true), keep = give(state, 2, "seal", true), victim = give(state, 3, "estate", true); give(state, 3, "rampart", true);
  state = move(state, "COUNCIL_RESOURCE", { kind: "gold" });
  for (const [targetPlayerId, cardId] of [["B", protectedCard.id], ["C", keep.id]]) assert.throws(() => apply(state, "A", { type: "COUNCIL_DESTROY", payload: { targetPlayerId, cardId } }, entropy()), { code: "DISTRICT_PROTECTED" });
  state = move(state, "COUNCIL_DESTROY", { targetPlayerId: "D", cardId: victim.id }); assert.equal(state.players[0]!.gold, 19); assert.equal(state.phase, "DRAFT"); assert.equal(state.players[3]!.city.length, 1);
});
test("graveyard recovery is a separate opponent response and cannot save itself", () => {
  let state = turn(8); assignRoles(state, [[8], [2], [4], [3]]); state.players[0]!.gold = 20;
  give(state, 1, "memorial", true); const victim = give(state, 2, "inn", true);
  state = move(state, "COUNCIL_RESOURCE", { kind: "gold" }); state = move(state, "COUNCIL_DESTROY", { targetPlayerId: "C", cardId: victim.id });
  assert.equal(state.phase, "GRAVEYARD"); assert.equal(state.activePlayerIndex, 1); assert.equal(state.recovery!.card.id, victim.id);
  state = move(state, "COUNCIL_RECOVER", { take: true }); assert.ok(state.players[1]!.hand.some((card) => card.id === victim.id)); assert.equal(state.players[1]!.gold, 1); assert.equal(state.phase, "DRAFT");
  state = turn(8); assignRoles(state, [[8], [2], [4], [3]]); state.players[0]!.gold = 20; const memorial = give(state, 1, "memorial", true);
  state = move(state, "COUNCIL_RESOURCE", { kind: "gold" }); state = move(state, "COUNCIL_DESTROY", { targetPlayerId: "B", cardId: memorial.id }); assert.equal(state.recovery, null); assert.equal(state.phase, "DRAFT");
});
test("projection rejects outsiders and strips injected private fields, and validation rejects lost cards", () => {
  const state = turn(4); Object.assign(state.players[0]!.hand[0]!, { privateNote: "hidden-data" });
  assert.ok(!JSON.stringify(project(state, "A")).includes("hidden-data"));
  assert.throws(() => project(state, "stranger"), { code: "NOT_MEMBER" });
  state.deck.pop(); assert.throws(() => validate(state), { code: "INVALID_STATE" });
});

function policy(view: ReturnType<typeof project>): InputCommand {
  const mine = view.players.find((player) => player.id === view.you)!;
  if (view.phase === "CROWN") return { type: "COUNCIL_CROWN", payload: { playerId: view.you } };
  if (view.phase === "DRAFT") {
    const role = [7, 6, 4, 5, 3, 2, 1, 8].find((rank) => view.draftChoices.includes(rank))!;
    return { type: "COUNCIL_DRAFT", payload: { role, ...(view.draftNeedsDiscard ? { discardRole: view.draftChoices.find((rank) => rank !== role) } : {}) } };
  }
  if (view.phase === "RESOURCE") { const useful = view.yourHand.filter((card) => !mine.city.some((built) => built.kind === card.kind)); return { type: "COUNCIL_RESOURCE", payload: { kind: useful.length && mine.gold < 10 ? "gold" : "cards" } }; }
  if (view.phase === "CHOOSE_CARDS") { const sorted = [...view.choice].sort((a, b) => Number(mine.city.some((card) => card.kind === a.kind)) - Number(mine.city.some((card) => card.kind === b.kind)) || a.cost - b.cost); return { type: "COUNCIL_KEEP", payload: { cardIds: sorted.slice(0, view.keepCount).map((card) => card.id) } }; }
  if (view.legalActions.includes("COUNCIL_INCOME")) return { type: "COUNCIL_INCOME", payload: {} };
  const card = view.yourHand.filter((card) => !mine.city.some((built) => built.kind === card.kind) && card.cost <= mine.gold).sort((a, b) => a.cost - b.cost)[0];
  if (card && view.legalActions.includes("COUNCIL_BUILD")) return { type: "COUNCIL_BUILD", payload: { cardId: card.id } };
  if (view.activeRole === 3 && view.legalActions.includes("COUNCIL_POWER")) return { type: "COUNCIL_POWER", payload: { kind: "cycle", cardIds: view.yourHand.filter((card) => mine.city.some((built) => built.kind === card.kind)).map((card) => card.id) } };
  return { type: "COUNCIL_END", payload: {} };
}
test("18 seeded public-view games across two through seven players preserve all cards and finish naturally", () => {
  for (let players = 2; players <= 7; players++) for (let seed = 1; seed <= 3; seed++) {
    const random = entropy(seed * 37 + players); let state = create(Array.from({ length: players }, (_, i) => `P${i}`), random), count = 0;
    while (state.phase !== "FINISHED" && count < 2200) {
      const view = project(state, state.playerIds[state.activePlayerIndex]!); const previous = structuredClone(state);
      state = validate(JSON.parse(JSON.stringify(apply(state, view.you, policy(view), random))));
      assert.equal(state.version, previous.version + 1); count++;
      for (const playerId of state.playerIds) { const publicView = project(state, playerId); assert.equal("deck" in publicView, false); assert.ok(publicView.players.every((player) => !("hand" in player))); }
    }
    assert.equal(state.phase, "FINISHED", `${players} players, seed ${seed}, ${count} commands`); const result = getResult(state)!;
    assert.ok(result.winners.length > 0); assert.ok(state.players.some((player) => player.city.length >= 8)); assert.equal(result.scores.length, players);
  }
});
