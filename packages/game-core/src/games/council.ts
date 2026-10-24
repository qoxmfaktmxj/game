import type { Entropy, InputCommand } from "../entropy.js";

export const CATEGORIES = ["gold", "blue", "green", "red", "purple"] as const;
export type Category = (typeof CATEGORIES)[number];
export const ROLES = [
  { rank: 1, name: "밤그림자", text: "다른 역할 하나가 이번 라운드를 쉬게 합니다." },
  { rank: 2, name: "은빛 손", text: "지목한 역할이 나타나면 그 사람의 금을 가져옵니다." },
  { rank: 3, name: "가면술사", text: "다른 사람과 손패를 바꾸거나 내 카드를 새 카드로 바꿉니다." },
  { rank: 4, name: "달의 대리인", text: "왕관을 받고 황금 구역에서 수입을 얻습니다." },
  { rank: 5, name: "서약지기", text: "푸른 구역에서 수입을 얻고 이번 라운드의 도시를 보호합니다." },
  { rank: 6, name: "교역사", text: "자원 획득 뒤 금 1을 더 받고 초록 구역에서 수입을 얻습니다." },
  { rank: 7, name: "설계가", text: "자원 획득 뒤 카드 2장을 더 받고 건물 3개까지 세웁니다." },
  { rank: 8, name: "성벽 지휘자", text: "붉은 구역에서 수입을 얻고 차례 끝에 건물 하나를 철거합니다." },
] as const;
interface Definition { kind: string; name: string; category: Category; cost: number; copies: number; effect: string | null; text: string }
const district = (kind: string, name: string, category: Category, cost: number, copies: number, effect: string | null = null, text = "") => ({ kind, name, category, cost, copies, effect, text });
/** Numeric manifest: FFG 2010 Basic Game, 54 ordinary + 12 special cards. */
export const DISTRICTS: Definition[] = [
  district("estate", "달빛 저택", "gold", 3, 5), district("citadel", "백야 성관", "gold", 4, 4), district("palace", "별빛 궁정", "gold", 5, 3),
  district("shrine", "새벽 제단", "blue", 1, 3), district("chapel", "청람 예배당", "blue", 2, 3), district("cloister", "고요한 회랑", "blue", 3, 3), district("sanctum", "천상의 전당", "blue", 5, 2),
  district("inn", "초승달 주막", "green", 1, 5), district("bazaar", "등불 시장", "green", 2, 4), district("exchange", "유리 교역소", "green", 2, 3), district("pier", "은하 선착장", "green", 3, 3), district("port", "청록 항만", "green", 4, 3), district("hall", "이야기 광장", "green", 5, 2),
  district("outpost", "초소의 불빛", "red", 1, 3), district("vault", "침묵의 수용소", "red", 2, 3), district("barracks", "붉은 훈련장", "red", 3, 3), district("bastion", "철빛 요새", "red", 5, 2),
  district("memory", "기억 정원", "purple", 2, 1, "haunted", "마지막 라운드 전에 세웠다면 최종 색상 보너스에 필요한 색 하나로 셉니다."),
  district("seal", "봉인 탑", "purple", 3, 2, "keep", "성벽 지휘자가 철거할 수 없습니다."),
  district("laboratory", "빛 연구소", "purple", 5, 1, "laboratory", "차례마다 한 번, 손패 1장을 돌려놓고 금 1을 받습니다."),
  district("forge", "황금 작업실", "purple", 5, 1, "smithy", "차례마다 한 번, 금 2를 내고 카드 3장을 받습니다."),
  district("observatory", "별 관측소", "purple", 5, 1, "observatory", "자원으로 카드를 받을 때 3장 중에서 고를 수 있습니다."),
  district("memorial", "기억 저장소", "purple", 5, 1, "graveyard", "다른 사람의 철거 직후 금 1로 철거된 카드를 가져올 수 있습니다. 자기 자신은 구하지 못합니다."),
  district("gate", "달무리 관문", "purple", 6, 1, "bonus", "완성된 이 건물은 최종 계산에서 8점입니다."),
  district("academy", "새벽 학당", "purple", 6, 1, "bonus", "완성된 이 건물은 최종 계산에서 8점입니다."),
  district("archive", "청람 서고", "purple", 6, 1, "library", "자원으로 카드를 받을 때 2장을 보관합니다. 별 관측소와 함께 쓰면 3장 중 2장을 고릅니다."),
  district("rampart", "반달 성벽", "purple", 6, 1, "wall", "도시의 다른 건물을 철거하는 비용이 금 1 늘어납니다."),
  district("prism", "색채 연구원", "purple", 6, 1, "school", "역할 수입을 받을 때 현재 역할에 맞는 색으로 셉니다."),
];
export interface DistrictCard { id: string; kind: string }
export interface BuiltDistrict extends DistrictCard { builtRound: number }
interface Citizen { id: string; gold: number; hand: DistrictCard[]; city: BuiltDistrict[] }
export interface CouncilState {
  version: number; playerIds: string[];
  phase: "CROWN" | "DRAFT" | "RESOURCE" | "CHOOSE_CARDS" | "ACTION" | "GRAVEYARD" | "FINISHED";
  players: Citizen[]; deck: DistrictCard[]; round: number; crownIndex: number; activePlayerIndex: number; activeRole: number;
  roles: number[][]; revealedRoles: number[]; faceUpRoles: number[]; hiddenRoles: number[]; draftPool: number[]; draftStep: number; draftOrder: number[];
  assassinatedRole: number | null; robbedRole: number | null;
  resourceTaken: boolean; incomeTaken: boolean; abilityUsed: boolean; buildsUsed: number; laboratoryUsed: boolean; smithyUsed: boolean;
  choice: DistrictCard[]; keepCount: number; recovery: { playerId: string; card: DistrictCard } | null;
  firstCompleteId: string | null; endingRound: number | null;
}
export interface CouncilResult {
  winners: string[]; tied: boolean; reason: "CITY_COMPLETE";
  scores: { playerId: string; total: number; districts: number; diversity: number; completion: number; gold: number }[];
}
function fail(code = "INVALID_INPUT"): never { throw Object.assign(new Error(code), { code }); }
function info(card: DistrictCard) { const value = DISTRICTS.find((item) => item.kind === card.kind); if (!value) fail("INVALID_STATE"); return value; }
function has(player: Citizen, effect: string) { return player.city.some((card) => info(card).effect === effect); }
function ownsRole(state: CouncilState, rank: number) { return state.roles.findIndex((roles) => roles.includes(rank)); }
function shuffled<T>(source: T[], entropy: Entropy): T[] {
  const copy = [...source];
  for (let i = copy.length - 1; i > 0; i--) { const j = entropy.randomInt(i + 1); if (!Number.isInteger(j) || j < 0 || j > i) fail("INVALID_RNG"); [copy[i], copy[j]] = [copy[j]!, copy[i]!]; }
  return copy;
}
export function createDeck(): DistrictCard[] {
  return DISTRICTS.flatMap((item) => Array.from({ length: item.copies }, (_, index) => ({ id: `c-${item.kind}-${index}`, kind: item.kind })));
}
export function create(playerIds: string[], entropy: Entropy): CouncilState {
  if (playerIds.length < 2 || playerIds.length > 7 || new Set(playerIds).size !== playerIds.length || playerIds.some((id) => typeof id !== "string" || !id)) fail("INVALID_PLAYERS");
  const deck = shuffled(createDeck(), entropy);
  return {
    version: 0, playerIds: [...playerIds], phase: "CROWN", players: playerIds.map((id) => ({ id, gold: 2, hand: deck.splice(0, 4), city: [] })), deck,
    round: 0, crownIndex: 0, activePlayerIndex: 0, activeRole: 0, roles: playerIds.map(() => []), revealedRoles: [], faceUpRoles: [], hiddenRoles: [], draftPool: ROLES.map((role) => role.rank), draftStep: 0, draftOrder: [],
    assassinatedRole: null, robbedRole: null, resourceTaken: false, incomeTaken: false, abilityUsed: false, buildsUsed: 0, laboratoryUsed: false, smithyUsed: false, choice: [], keepCount: 0, recovery: null, firstCompleteId: null, endingRound: null,
  };
}
function beginRound(state: CouncilState, entropy: Entropy) {
  state.round++; state.phase = "DRAFT"; state.activeRole = 0;
  state.roles = state.playerIds.map(() => []); state.revealedRoles = []; state.faceUpRoles = []; state.hiddenRoles = [];
  state.assassinatedRole = null; state.robbedRole = null; state.draftPool = shuffled(ROLES.map((role) => role.rank), entropy);
  state.hiddenRoles.push(state.draftPool.shift()!);
  const visible = state.playerIds.length === 4 ? 2 : state.playerIds.length === 5 ? 1 : 0;
  for (let i = 0; i < visible; i++) {
    const index = state.draftPool.findIndex((rank) => rank !== 4);
    state.faceUpRoles.push(state.draftPool.splice(index, 1)[0]!);
  }
  state.draftStep = 0;
  const length = state.playerIds.length <= 3 ? state.playerIds.length * 2 : state.playerIds.length;
  state.draftOrder = Array.from({ length }, (_, i) => (state.crownIndex + i) % state.playerIds.length);
  state.activePlayerIndex = state.draftOrder[0]!;
}
function resetTurn(state: CouncilState) {
  state.resourceTaken = false; state.incomeTaken = false; state.abilityUsed = false; state.buildsUsed = 0; state.laboratoryUsed = false; state.smithyUsed = false; state.choice = []; state.keepCount = 0;
}
function nextRole(state: CouncilState, entropy: Entropy) {
  for (let rank = state.activeRole + 1; rank <= 8; rank++) {
    const index = ownsRole(state, rank);
    if (index < 0 || rank === state.assassinatedRole) continue;
    state.activeRole = rank; state.activePlayerIndex = index; state.revealedRoles.push(rank); resetTurn(state);
    if (rank === 4) state.crownIndex = index;
    if (rank === state.robbedRole) {
      const thief = ownsRole(state, 2);
      if (thief >= 0 && thief !== index) { state.players[thief]!.gold += state.players[index]!.gold; state.players[index]!.gold = 0; }
    }
    state.phase = "RESOURCE"; return;
  }
  if (state.assassinatedRole === 4 && ownsRole(state, 4) >= 0) state.crownIndex = ownsRole(state, 4);
  if (state.endingRound !== null) { state.phase = "FINISHED"; return; }
  beginRound(state, entropy);
}
function afterResource(state: CouncilState) {
  state.resourceTaken = true; state.phase = "ACTION";
  const player = state.players[state.activePlayerIndex]!;
  if (state.activeRole === 6) player.gold++;
  if (state.activeRole === 7) player.hand.push(...state.deck.splice(0, 2));
}
function exact(value: Record<string, unknown>, fields: string[]) { if (Object.keys(value).some((key) => !fields.includes(key))) fail(); }
function strings(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.length > 66 || raw.some((item) => typeof item !== "string") || new Set(raw).size !== raw.length) fail();
  return raw;
}
function target(state: CouncilState, id: unknown): Citizen {
  const player = state.players.find((value) => value.id === id); if (!player) fail(); return player;
}
function ordinaryPhase(state: CouncilState) { if (state.phase !== "RESOURCE" && state.phase !== "ACTION") fail("WRONG_PHASE"); }
export function apply(original: CouncilState, actorId: string, command: InputCommand, entropy: Entropy): CouncilState {
  if (original.phase === "FINISHED") fail("GAME_FINISHED");
  if (original.playerIds[original.activePlayerIndex] !== actorId) fail("NOT_YOUR_TURN");
  if (!command || typeof command !== "object" || !command.payload || typeof command.payload !== "object" || Array.isArray(command.payload)) fail();
  exact(command as unknown as Record<string, unknown>, ["type", "payload"]);
  const state = structuredClone(original), player = state.players[state.activePlayerIndex]!, p = command.payload;
  switch (command.type) {
    case "COUNCIL_CROWN": {
      exact(p, ["playerId"]); if (state.phase !== "CROWN") fail("WRONG_PHASE");
      state.crownIndex = state.playerIds.indexOf(target(state, p.playerId).id); beginRound(state, entropy); break;
    }
    case "COUNCIL_DRAFT": {
      exact(p, ["role", "discardRole"]); if (state.phase !== "DRAFT") fail("WRONG_PHASE");
      if (typeof p.role !== "number" || !state.draftPool.includes(p.role)) fail();
      const requiresDiscard = state.playerIds.length === 2 && [1, 2].includes(state.draftStep);
      if (requiresDiscard ? typeof p.discardRole !== "number" || p.discardRole === p.role || !state.draftPool.includes(p.discardRole) : p.discardRole !== undefined) fail();
      state.roles[state.activePlayerIndex]!.push(p.role);
      state.draftPool.splice(state.draftPool.indexOf(p.role), 1);
      if (requiresDiscard) { state.draftPool.splice(state.draftPool.indexOf(p.discardRole as number), 1); state.hiddenRoles.push(p.discardRole as number); }
      state.draftStep++;
      if (state.draftStep === state.draftOrder.length) {
        state.hiddenRoles.push(...state.draftPool); state.draftPool = []; state.activeRole = 0; nextRole(state, entropy);
      } else {
        state.activePlayerIndex = state.draftOrder[state.draftStep]!;
        if (state.playerIds.length === 7 && state.draftStep === 6) state.draftPool.push(state.hiddenRoles.shift()!);
      }
      break;
    }
    case "COUNCIL_RESOURCE": {
      exact(p, ["kind", "useObservatory", "useLibrary"]); if (state.phase !== "RESOURCE") fail("WRONG_PHASE");
      if ([p.useObservatory, p.useLibrary].some((v) => v !== undefined && typeof v !== "boolean")) fail();
      if (p.kind === "gold") { if (p.useObservatory !== undefined || p.useLibrary !== undefined) fail(); player.gold += 2; afterResource(state); }
      else if (p.kind === "cards") {
        const amount = has(player, "observatory") && p.useObservatory !== false ? 3 : 2;
        state.choice = state.deck.splice(0, amount);
        state.keepCount = Math.min(state.choice.length, has(player, "library") && p.useLibrary !== false ? 2 : 1);
        if (state.choice.length <= state.keepCount) { player.hand.push(...state.choice); state.choice = []; state.keepCount = 0; afterResource(state); }
        else state.phase = "CHOOSE_CARDS";
      } else fail();
      break;
    }
    case "COUNCIL_KEEP": {
      exact(p, ["cardIds", "bottomOrder"]); if (state.phase !== "CHOOSE_CARDS") fail("WRONG_PHASE");
      const chosen = strings(p.cardIds);
      if (chosen.length !== state.keepCount || chosen.some((id) => !state.choice.some((card) => card.id === id))) fail();
      const remainder = state.choice.filter((card) => !chosen.includes(card.id));
      const order = p.bottomOrder === undefined ? remainder.map((card) => card.id) : strings(p.bottomOrder);
      if (order.length !== remainder.length || order.some((id) => !remainder.some((card) => card.id === id))) fail();
      player.hand.push(...chosen.map((id) => state.choice.find((card) => card.id === id)!));
      state.deck.push(...order.map((id) => remainder.find((card) => card.id === id)!)); state.choice = []; state.keepCount = 0; afterResource(state); break;
    }
    case "COUNCIL_BUILD": {
      exact(p, ["cardId"]); if (state.phase !== "ACTION") fail("WRONG_PHASE");
      const card = player.hand.find((value) => value.id === p.cardId); if (!card) fail("CARD_NOT_OWNED");
      const definition = info(card);
      if (state.buildsUsed >= (state.activeRole === 7 ? 3 : 1)) fail("BUILD_LIMIT");
      if (player.city.some((built) => built.kind === card.kind)) fail("DUPLICATE_DISTRICT");
      if (player.gold < definition.cost) fail("INSUFFICIENT_GOLD");
      player.gold -= definition.cost; player.hand = player.hand.filter((value) => value.id !== card.id);
      player.city.push({ ...card, builtRound: state.round }); state.buildsUsed++;
      if (player.city.length >= 8 && !state.firstCompleteId) { state.firstCompleteId = player.id; state.endingRound = state.round; }
      break;
    }
    case "COUNCIL_INCOME": {
      exact(p, []); ordinaryPhase(state);
      const category = ({ 4: "gold", 5: "blue", 6: "green", 8: "red" } as Record<number, Category>)[state.activeRole];
      if (!category || state.incomeTaken) fail("WRONG_PHASE");
      player.gold += player.city.filter((card) => info(card).category === category || info(card).effect === "school").length;
      state.incomeTaken = true; break;
    }
    case "COUNCIL_POWER": {
      exact(p, ["targetRole", "targetPlayerId", "cardIds", "kind"]); ordinaryPhase(state);
      if (state.abilityUsed) fail("WRONG_PHASE");
      if (state.activeRole === 1 || state.activeRole === 2) {
        exact(p, ["targetRole"]);
        if (!Number.isInteger(p.targetRole) || (p.targetRole as number) < 2 || (p.targetRole as number) > 8 || state.activeRole === 2 && p.targetRole === state.assassinatedRole) fail();
        if (state.activeRole === 1) state.assassinatedRole = p.targetRole as number;
        else state.robbedRole = p.targetRole as number;
      } else if (state.activeRole === 3) {
        if (p.kind === "swap") {
          exact(p, ["kind", "targetPlayerId"]); const other = target(state, p.targetPlayerId); if (other.id === actorId) fail();
          [player.hand, other.hand] = [other.hand, player.hand];
        } else if (p.kind === "cycle") {
          exact(p, ["kind", "cardIds"]); const ids = strings(p.cardIds);
          if (ids.some((id) => !player.hand.some((card) => card.id === id))) fail("CARD_NOT_OWNED");
          state.deck.push(...ids.map((id) => player.hand.find((card) => card.id === id)!));
          player.hand = player.hand.filter((card) => !ids.includes(card.id)); player.hand.push(...state.deck.splice(0, ids.length));
        } else fail();
      } else fail("UNSUPPORTED_ACTION");
      state.abilityUsed = true; break;
    }
    case "COUNCIL_LAB": {
      exact(p, ["cardId"]); ordinaryPhase(state); if (!has(player, "laboratory") || state.laboratoryUsed) fail("WRONG_PHASE");
      const card = player.hand.find((value) => value.id === p.cardId); if (!card) fail("CARD_NOT_OWNED");
      player.hand = player.hand.filter((value) => value.id !== card.id); state.deck.push(card); player.gold++; state.laboratoryUsed = true; break;
    }
    case "COUNCIL_SMITHY": {
      exact(p, []); ordinaryPhase(state); if (!has(player, "smithy") || state.smithyUsed) fail("WRONG_PHASE");
      if (player.gold < 2) fail("INSUFFICIENT_GOLD"); player.gold -= 2; player.hand.push(...state.deck.splice(0, 3)); state.smithyUsed = true; break;
    }
    case "COUNCIL_DESTROY": {
      exact(p, ["targetPlayerId", "cardId"]); if (state.phase !== "ACTION" || state.activeRole !== 8) fail("WRONG_PHASE");
      const other = target(state, p.targetPlayerId), card = other.city.find((value) => value.id === p.cardId); if (!card) fail("CARD_NOT_AVAILABLE");
      if (other.city.length >= 8 || info(card).effect === "keep" || state.assassinatedRole !== 5 && state.roles[state.playerIds.indexOf(other.id)]!.includes(5)) fail("DISTRICT_PROTECTED");
      const cost = info(card).cost - 1 + (has(other, "wall") && info(card).effect !== "wall" ? 1 : 0);
      if (player.gold < cost) fail("INSUFFICIENT_GOLD"); player.gold -= cost; other.city = other.city.filter((value) => value.id !== card.id);
      const recovered = { id: card.id, kind: card.kind };
      const keeper = state.players.find((value) => value.id !== actorId && value.gold >= 1 && has(value, "graveyard"));
      if (keeper) { state.recovery = { playerId: keeper.id, card: recovered }; state.activePlayerIndex = state.playerIds.indexOf(keeper.id); state.phase = "GRAVEYARD"; }
      else { state.deck.push(recovered); nextRole(state, entropy); }
      break;
    }
    case "COUNCIL_RECOVER": {
      exact(p, ["take"]); if (state.phase !== "GRAVEYARD" || !state.recovery || state.recovery.playerId !== actorId || typeof p.take !== "boolean") fail("WRONG_PHASE");
      if (p.take) { if (player.gold < 1) fail("INSUFFICIENT_GOLD"); player.gold--; player.hand.push(state.recovery.card); }
      else state.deck.push(state.recovery.card);
      state.recovery = null; nextRole(state, entropy); break;
    }
    case "COUNCIL_END": exact(p, []); if (state.phase !== "ACTION") fail("WRONG_PHASE"); nextRole(state, entropy); break;
    default: fail("INVALID_INPUT");
  }
  state.version++; return state;
}
function score(state: CouncilState, player: Citizen) {
  const districts = player.city.reduce((total, card) => total + info(card).cost + (info(card).effect === "bonus" ? 2 : 0), 0);
  const flexible = player.city.find((card) => info(card).effect === "haunted" && card.builtRound < state.round);
  const colors = player.city.filter((card) => card !== flexible).map((card) => info(card).category);
  const diversity = (flexible ? CATEGORIES.some((color) => new Set([...colors, color]).size === 5) : new Set(colors).size === 5) ? 3 : 0;
  const completion = player.id === state.firstCompleteId ? 4 : player.city.length >= 8 ? 2 : 0;
  return { playerId: player.id, total: districts + diversity + completion, districts, diversity, completion, gold: player.gold };
}
export function getResult(state: CouncilState): CouncilResult | null {
  if (state.phase !== "FINISHED") return null;
  const scores = state.players.map((player) => score(state, player));
  const ordered = [...scores].sort((a, b) => b.total - a.total || b.districts - a.districts || b.gold - a.gold), best = ordered[0]!;
  const winners = scores.filter((value) => value.total === best.total && value.districts === best.districts && value.gold === best.gold).map((value) => value.playerId);
  return { winners, tied: winners.length > 1, reason: "CITY_COMPLETE", scores };
}
function publicCard(card: DistrictCard) {
  const item = info(card);
  return { id: card.id, kind: card.kind, name: item.name, category: item.category, cost: item.cost, effect: item.effect, text: item.text };
}
export function project(state: CouncilState, actorId: string) {
  const index = state.playerIds.indexOf(actorId); if (index < 0) fail("NOT_MEMBER");
  const mine = state.players[index]!, active = index === state.activePlayerIndex, legalActions: string[] = [];
  if (active && state.phase !== "FINISHED") {
    if (state.phase === "CROWN") legalActions.push("COUNCIL_CROWN");
    if (state.phase === "DRAFT") legalActions.push("COUNCIL_DRAFT");
    if (state.phase === "CHOOSE_CARDS") legalActions.push("COUNCIL_KEEP");
    if (state.phase === "GRAVEYARD") legalActions.push("COUNCIL_RECOVER");
    if (state.phase === "RESOURCE") legalActions.push("COUNCIL_RESOURCE");
    if (state.phase === "ACTION") {
      legalActions.push("COUNCIL_END");
      if (state.buildsUsed < (state.activeRole === 7 ? 3 : 1)) legalActions.push("COUNCIL_BUILD");
      if (state.activeRole === 8) legalActions.push("COUNCIL_DESTROY");
    }
    if (state.phase === "ACTION" || state.phase === "RESOURCE") {
      if ([1, 2, 3].includes(state.activeRole) && !state.abilityUsed) legalActions.push("COUNCIL_POWER");
      if ([4, 5, 6, 8].includes(state.activeRole) && !state.incomeTaken) legalActions.push("COUNCIL_INCOME");
      if (has(mine, "laboratory") && !state.laboratoryUsed && mine.hand.length) legalActions.push("COUNCIL_LAB");
      if (has(mine, "smithy") && !state.smithyUsed && mine.gold >= 2) legalActions.push("COUNCIL_SMITHY");
    }
  }
  return {
    version: state.version, phase: state.phase, you: actorId, activePlayerId: state.playerIds[state.activePlayerIndex]!,
    round: state.round, crownPlayerId: state.playerIds[state.crownIndex]!, activeRole: state.activeRole, roleGuide: ROLES.map((role) => ({ ...role })),
    faceUpRoles: [...state.faceUpRoles], yourRoles: [...state.roles[index]!],
    draftChoices: active && state.phase === "DRAFT" ? [...state.draftPool] : [],
    draftNeedsDiscard: active && state.phase === "DRAFT" && state.playerIds.length === 2 && [1, 2].includes(state.draftStep),
    players: state.players.map((player, i) => ({ id: player.id, gold: player.gold, handCount: player.hand.length, city: player.city.map((card) => ({ ...publicCard(card), builtRound: card.builtRound })), revealedRoles: state.roles[i]!.filter((rank) => state.revealedRoles.includes(rank)) })),
    yourHand: mine.hand.map(publicCard), choice: active && state.phase === "CHOOSE_CARDS" ? state.choice.map(publicCard) : [], keepCount: active ? state.keepCount : 0,
    recovery: state.recovery ? { playerId: state.recovery.playerId, card: publicCard(state.recovery.card) } : null,
    assassinatedRole: state.assassinatedRole, robbedRole: state.robbedRole, deckCount: state.deck.length,
    buildsUsed: state.buildsUsed, buildLimit: state.activeRole === 7 ? 3 : 1, endingRound: state.endingRound, legalActions, result: getResult(state),
  };
}
export function validate(raw: unknown): CouncilState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) fail("INVALID_STATE");
  const state = raw as CouncilState;
  if (!Array.isArray(state.playerIds) || state.playerIds.length < 2 || state.playerIds.length > 7 || state.playerIds.some((id) => typeof id !== "string" || !id) || new Set(state.playerIds).size !== state.playerIds.length || !Number.isSafeInteger(state.version) || state.version < 0 || !["CROWN", "DRAFT", "RESOURCE", "CHOOSE_CARDS", "ACTION", "GRAVEYARD", "FINISHED"].includes(state.phase)) fail("INVALID_STATE");
  const size = state.playerIds.length;
  if (![state.crownIndex, state.activePlayerIndex].every((value) => Number.isInteger(value) && value >= 0 && value < size) || !Number.isSafeInteger(state.round) || state.round < 0 || !Number.isInteger(state.activeRole) || state.activeRole < 0 || state.activeRole > 8 || !Array.isArray(state.players) || state.players.length !== size || !Array.isArray(state.deck) || !Array.isArray(state.choice)) fail("INVALID_STATE");
  if (state.players.some((player, i) => !player || player.id !== state.playerIds[i] || !Number.isSafeInteger(player.gold) || player.gold < 0 || !Array.isArray(player.hand) || !Array.isArray(player.city) || new Set(player.city.map((card) => card.kind)).size !== player.city.length || player.city.some((card) => !Number.isInteger(card.builtRound) || card.builtRound < 1 || card.builtRound > state.round))) fail("INVALID_STATE");
  if (state.recovery !== null && (!state.recovery || !state.playerIds.includes(state.recovery.playerId) || !state.recovery.card)) fail("INVALID_STATE");
  const all = [...state.deck, ...state.choice, ...state.players.flatMap((player) => [...player.hand, ...player.city]), ...(state.recovery ? [state.recovery.card] : [])], expected = createDeck();
  if (all.length !== 66 || new Set(all.map((card) => card?.id)).size !== 66 || all.some((card) => !card || !expected.some((value) => value.id === card.id && value.kind === card.kind))) fail("INVALID_STATE");
  if (!Array.isArray(state.roles) || state.roles.length !== size || state.roles.some((list) => !Array.isArray(list) || list.length > (size <= 3 ? 2 : 1)) || ![state.draftPool, state.hiddenRoles, state.faceUpRoles, state.revealedRoles].every(Array.isArray)) fail("INVALID_STATE");
  const roles = [...state.roles.flat(), ...state.draftPool, ...state.hiddenRoles, ...state.faceUpRoles];
  if (roles.length !== 8 || new Set(roles).size !== 8 || roles.some((rank) => !Number.isInteger(rank) || rank < 1 || rank > 8) || state.faceUpRoles.includes(4) || state.revealedRoles.some((rank) => !state.roles.flat().includes(rank)) || new Set(state.revealedRoles).size !== state.revealedRoles.length) fail("INVALID_STATE");
  if (!Array.isArray(state.draftOrder) || state.draftOrder.some((value) => !Number.isInteger(value) || value < 0 || value >= size) || !Number.isInteger(state.draftStep) || state.draftStep < 0 || state.draftStep > state.draftOrder.length || !Number.isInteger(state.keepCount) || state.keepCount < 0 || state.keepCount > 2 || !Number.isInteger(state.buildsUsed) || state.buildsUsed < 0 || state.buildsUsed > 3) fail("INVALID_STATE");
  if (![state.resourceTaken, state.incomeTaken, state.abilityUsed, state.laboratoryUsed, state.smithyUsed].every((value) => typeof value === "boolean") || [state.assassinatedRole, state.robbedRole].some((rank) => rank !== null && (!Number.isInteger(rank) || rank < 2 || rank > 8))) fail("INVALID_STATE");
  if ((state.phase === "CHOOSE_CARDS") !== (state.choice.length > 0) || (state.phase === "GRAVEYARD") !== (state.recovery !== null) || state.firstCompleteId !== null && !state.playerIds.includes(state.firstCompleteId) || state.endingRound !== null && state.endingRound !== state.round || (state.firstCompleteId === null) !== (state.endingRound === null) || state.phase === "FINISHED" && !state.firstCompleteId) fail("INVALID_STATE");
  return state;
}
