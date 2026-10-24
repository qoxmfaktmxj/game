import type { CommonGameResult, Entropy, InputCommand } from "../entropy.js";

export const SIGNAL_RULES_VERSION = "1.0.0";
export const SIGNAL_CONTENT_VERSION = "1.0.0";
export const SUITS = ["spades", "hearts", "diamonds", "clubs"] as const;
export type SignalSuit = (typeof SUITS)[number];
export type SignalRole = "captain" | "ally" | "raider" | "drifter";
export const CARD_INFO = {
  strike: {
    name: "광선",
    text: "사거리 안의 한 명에게 피해 1. 기본적으로 차례당 한 번.",
    equipment: false,
  },
  evade: {
    name: "잔상",
    text: "자신에게 향한 광선 효과를 한 번 피합니다.",
    equipment: false,
  },
  tonic: {
    name: "응급 전지",
    text: "안정도 1 회복. 치명적인 피해 직후에도 사용 가능. 생존자가 둘이면 효과 없음.",
    equipment: false,
  },
  pulse: {
    name: "충전 파동",
    text: "살아 있는 모두의 안정도를 1 회복합니다.",
    equipment: false,
  },
  challenge: {
    name: "주파수 결투",
    text: "상대부터 광선을 번갈아 버립니다. 먼저 포기한 사람이 피해 1.",
    equipment: false,
  },
  jam: {
    name: "신호 교란",
    text: "거리와 관계없이 한 사람의 손패 한 장을 무작위로, 또는 장비 한 장을 골라 버립니다.",
    equipment: false,
  },
  snatch: {
    name: "자력 회수",
    text: "거리 1 이내의 손패 한 장을 무작위로, 또는 장비 한 장을 골라 가져옵니다.",
    equipment: false,
  },
  cache: {
    name: "공용 보급함",
    text: "생존자 수만큼 공개하고 자신부터 차례로 한 장씩 가져갑니다.",
    equipment: false,
  },
  supply: {
    name: "보급 신호",
    text: "카드 2장을 가져옵니다.",
    equipment: false,
  },
  caravan: {
    name: "보급 열차",
    text: "카드 3장을 가져옵니다.",
    equipment: false,
  },
  barrage: {
    name: "확산 광선",
    text: "다른 생존자 모두에게 광선 효과 1회. 거리 제한 없음.",
    equipment: false,
  },
  raiders: {
    name: "모래 폭풍",
    text: "다른 생존자는 광선 한 장을 버리거나 피해 1을 받습니다.",
    equipment: false,
  },
  shield: {
    name: "굴절 방패",
    text: "광선 효과마다 한 번 판정. 하트면 회피 1회.",
    equipment: true,
  },
  detour: {
    name: "유령 항로",
    text: "다른 사람이 자신까지 계산하는 거리 +1.",
    equipment: true,
  },
  lens: {
    name: "추적 렌즈",
    text: "자신이 다른 사람까지 계산하는 거리 −1. 최소 1.",
    equipment: true,
  },
  quarantine: {
    name: "격리장",
    text: "대장에게는 사용 불가. 다음 차례 시작에 하트면 정상 진행, 아니면 차례 생략.",
    equipment: true,
  },
  reactor: {
    name: "불안정 코어",
    text: "차례 시작 판정이 스페이드 2–9면 피해 3. 아니면 다음 생존자에게 이동.",
    equipment: true,
  },
  repeater: {
    name: "연속 발진기",
    text: "사거리 1. 광선 횟수 제한을 없앱니다.",
    equipment: true,
  },
  range2: { name: "접이식 안테나", text: "광선 사거리 2.", equipment: true },
  range3: { name: "장거리 안테나", text: "광선 사거리 3.", equipment: true },
  range4: { name: "위성 안테나", text: "광선 사거리 4.", equipment: true },
  range5: { name: "지평선 안테나", text: "광선 사거리 5.", equipment: true },
} as const;
export type SignalCardKind = keyof typeof CARD_INFO;
export interface SignalCard {
  id: string;
  kind: SignalCardKind;
  suit: SignalSuit;
  rank: number;
}
export const CHARACTER_INFO = {
  resilient: {
    name: "다온",
    health: 4,
    text: "피해를 받고 살아남으면 피해 1마다 카드 1장을 받습니다.",
  },
  redreader: {
    name: "루아",
    health: 4,
    text: "차례의 두 번째 드로우를 공개합니다. 붉은 수트면 한 장 더 받습니다.",
  },
  versatile: {
    name: "시온",
    health: 4,
    text: "광선과 잔상을 서로 바꾸어 사용할 수 있습니다.",
  },
  retaliator: {
    name: "미르",
    health: 3,
    text: "다른 사람의 카드로 피해를 받고 살아남으면 피해 1마다 그 사람의 손패 한 장을 가져옵니다.",
  },
  scrounger: {
    name: "여울",
    health: 4,
    text: "차례의 첫 드로우 대신 다른 사람의 무작위 손패 한 장을 가져올 수 있습니다.",
  },
  warded: {
    name: "아람",
    health: 4,
    text: "자신만의 굴절 방패가 있습니다. 장비 방패와 함께 쓸 수 있습니다.",
  },
  surveyor: {
    name: "모아",
    health: 4,
    text: "차례마다 위 세 장을 보고 두 장을 가져온 뒤 한 장은 덱 위에 돌려놓습니다.",
  },
  fortunate: {
    name: "나린",
    health: 4,
    text: "판정 카드를 두 장 보고 원하는 결과 하나를 고릅니다. 두 장 모두 버립니다.",
  },
  elusive: {
    name: "소리",
    health: 3,
    text: "다른 사람이 자신까지 계산하는 거리가 1 늘어납니다.",
  },
  recycler: {
    name: "누리",
    health: 4,
    text: "차례의 첫 드로우를 버린 카드 맨 위에서 가져올 수 있습니다.",
  },
  tracker: {
    name: "가온",
    health: 4,
    text: "자신이 다른 사람까지 계산하는 거리가 1 줄어듭니다. 최소 1.",
  },
  medic: {
    name: "이든",
    health: 4,
    text: "언제든 자신의 손패 두 장을 버려 안정도 1을 회복할 수 있습니다.",
  },
  piercer: {
    name: "도담",
    health: 4,
    text: "자신이 쏜 광선을 피하려면 회피가 두 번 필요합니다.",
  },
  resourceful: {
    name: "세나",
    health: 4,
    text: "손패가 비면 한 장을 받습니다. 결투 중에는 결투가 끝날 때 받습니다.",
  },
  salvager: {
    name: "해온",
    health: 4,
    text: "누군가 탈락하면 그 사람의 손패와 장비를 전부 가져옵니다.",
  },
  rapid: { name: "라온", health: 4, text: "차례의 광선 횟수 제한이 없습니다." },
} as const;
export type SignalCharacter = keyof typeof CHARACTER_INFO;
export interface SignalPlayer {
  id: string;
  role: SignalRole;
  character: SignalCharacter;
  health: number;
  maxHealth: number;
  alive: boolean;
  hand: SignalCard[];
  equipment: SignalCard[];
}
interface Attack {
  kind: "attack";
  mode: "strike" | "barrage" | "raiders" | "duel";
  sourceId: string;
  targets: string[];
  at: number;
  remaining: number;
  shieldUsed: number;
  duelOtherId: string | null;
}
interface Dying {
  kind: "dying";
  playerId: string;
  sourceId: string | null;
  amount: number;
  resume: Attack | null;
  after: "attack" | "start";
}
interface Check {
  kind: "check";
  playerId: string;
  purpose: "shield" | "quarantine" | "reactor";
  cards: SignalCard[];
  resume: Attack | null;
}
interface DrawPick {
  kind: "draw-pick";
  playerId: string;
  cards: SignalCard[];
}
interface Market {
  kind: "market";
  playerIds: string[];
  at: number;
  cards: SignalCard[];
}
type Pending = Attack | Dying | Check | DrawPick | Market;
export interface SignalState {
  gameKey: "signal";
  rulesVersion: string;
  contentVersion: string;
  version: number;
  playerIds: string[];
  activePlayerIds: string[];
  players: SignalPlayer[];
  phase:
    | "DRAW"
    | "ACTION"
    | "RESPONSE"
    | "DYING"
    | "CHOICE"
    | "DISCARD"
    | "FINISHED";
  turnPlayerId: string;
  strikesPlayed: number;
  startChecks: ("reactor" | "quarantine")[];
  deck: SignalCard[];
  discard: SignalCard[];
  pending: Pending | null;
  result: CommonGameResult | null;
  publicLog: string[];
}

function fail(code: string, message: string): never {
  throw Object.assign(new Error(message), { code });
}
function need(
  condition: unknown,
  code = "BAD_PAYLOAD",
  message = "허용되지 않는 선택입니다.",
): asserts condition {
  if (!condition) fail(code, message);
}
function random(max: number, entropy: Entropy): number {
  const n = entropy.randomInt(max);
  need(
    Number.isInteger(n) && n >= 0 && n < max,
    "BAD_STATE",
    "난수 범위가 올바르지 않습니다.",
  );
  return n;
}
function shuffle<T>(items: T[], entropy: Entropy): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = random(i + 1, entropy);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
function player(state: SignalState, id: string): SignalPlayer {
  const p = state.players.find((p) => p.id === id);
  need(p, "NOT_MEMBER", "참가자가 아닙니다.");
  return p;
}
function alive(state: SignalState): SignalPlayer[] {
  return state.players.filter((p) => p.alive);
}
function log(state: SignalState, text: string) {
  state.publicLog = [...state.publicLog.slice(-11), text];
}
const ranges: Partial<Record<SignalCardKind, number>> = {
  repeater: 1,
  range2: 2,
  range3: 3,
  range4: 4,
  range5: 5,
};
function equipped(p: SignalPlayer, kind: SignalCardKind): boolean {
  return p.equipment.some((c) => c.kind === kind);
}
function weapon(p: SignalPlayer): number {
  return (
    p.equipment
      .map((c) => ranges[c.kind])
      .find((n): n is number => n !== undefined) ?? 1
  );
}
export function distance(state: SignalState, from: string, to: string): number {
  const ps = alive(state),
    a = ps.findIndex((p) => p.id === from),
    b = ps.findIndex((p) => p.id === to);
  need(
    a >= 0 && b >= 0 && a !== b,
    "INVALID_TARGET",
    "다른 생존자를 선택하세요.",
  );
  const source = ps[a],
    target = ps[b];
  return Math.max(
    1,
    Math.min(Math.abs(a - b), ps.length - Math.abs(a - b)) +
      Number(equipped(target, "detour")) +
      Number(target.character === "elusive") -
      Number(equipped(source, "lens")) -
      Number(source.character === "tracker"),
  );
}
function nextAlive(state: SignalState, after: string): SignalPlayer {
  const start = state.playerIds.indexOf(after);
  for (let i = 1; i <= state.playerIds.length; i++) {
    const p = player(
      state,
      state.playerIds[(start + i) % state.playerIds.length],
    );
    if (p.alive) return p;
  }
  return fail("BAD_STATE", "생존자가 없습니다.");
}
function drawOne(state: SignalState, entropy: Entropy): SignalCard | null {
  if (!state.deck.length && state.discard.length)
    state.deck = shuffle(state.discard.splice(0), entropy);
  return state.deck.pop() ?? null;
}
function draw(
  state: SignalState,
  p: SignalPlayer,
  count: number,
  entropy: Entropy,
) {
  for (let i = 0; i < count; i++) {
    const c = drawOne(state, entropy);
    if (c) p.hand.push(c);
  }
}
function takeHand(p: SignalPlayer, id: unknown): SignalCard {
  need(typeof id === "string");
  const i = p.hand.findIndex((c) => c.id === id);
  need(i >= 0, "CARD_NOT_OWNED", "내 손패의 카드를 선택하세요.");
  return p.hand.splice(i, 1)[0];
}
function removeEquipment(
  p: SignalPlayer,
  kind: SignalCardKind,
): SignalCard | null {
  const i = p.equipment.findIndex((c) => c.kind === kind);
  return i < 0 ? null : p.equipment.splice(i, 1)[0];
}
function isStrike(p: SignalPlayer, c: SignalCard) {
  return (
    c.kind === "strike" || (p.character === "versatile" && c.kind === "evade")
  );
}
function isEvade(p: SignalPlayer, c: SignalCard) {
  return (
    c.kind === "evade" || (p.character === "versatile" && c.kind === "strike")
  );
}
function cardsInPending(p: Pending | null): SignalCard[] {
  return p && "cards" in p ? p.cards : [];
}
function refill(state: SignalState, entropy: Entropy) {
  const duel =
    (state.pending?.kind === "attack" && state.pending.mode === "duel") ||
    (state.pending?.kind === "dying" && state.pending.resume?.mode === "duel");
  if (duel || state.result) return;
  for (const p of alive(state))
    if (p.health > 0 && p.character === "resourceful" && p.hand.length === 0)
      draw(state, p, 1, entropy);
}
function finishIfWon(state: SignalState): boolean {
  const living = alive(state),
    captain = state.players.find((p) => p.role === "captain")!;
  let winningRoles: SignalRole[] | null = null,
    reason = "";
  if (!captain.alive) {
    winningRoles =
      living.length === 1 && living[0].role === "drifter"
        ? ["drifter"]
        : ["raider"];
    reason = winningRoles[0] === "drifter" ? "LAST_SIGNAL" : "CAPTAIN_FALLEN";
  } else if (!living.some((p) => p.role === "raider" || p.role === "drifter")) {
    winningRoles = ["captain", "ally"];
    reason = "OUTPOST_SECURED";
  }
  if (!winningRoles) return false;
  // A check/choice can hold cards outside the deck. A finished state retains all 80 cards.
  if (state.pending && "cards" in state.pending)
    state.discard.push(...state.pending.cards);
  state.pending = null;
  state.phase = "FINISHED";
  state.startChecks = [];
  state.result = {
    winners: state.players
      .filter((p) => winningRoles!.includes(p.role))
      .map((p) => p.id),
    tied: false,
    reason,
    scores: [],
  };
  return true;
}
function actionPhase(state: SignalState) {
  state.pending = null;
  state.phase = "ACTION";
}
function beginTurn(state: SignalState, id: string, entropy: Entropy) {
  if (state.result) return;
  state.turnPlayerId = id;
  state.strikesPlayed = 0;
  state.pending = null;
  const p = player(state, id);
  state.startChecks = ["reactor", "quarantine"].filter((k) =>
    equipped(p, k as SignalCardKind),
  ) as SignalState["startChecks"];
  continueStart(state, entropy);
}
function continueStart(state: SignalState, entropy: Entropy) {
  if (state.result) return;
  const p = player(state, state.turnPlayerId);
  if (!p.alive) {
    beginTurn(state, nextAlive(state, p.id).id, entropy);
    return;
  }
  const check = state.startChecks.shift();
  if (check) {
    startCheck(state, p, check, null, entropy);
    return;
  }
  if (["scrounger", "recycler"].includes(p.character)) {
    state.phase = "DRAW";
    state.pending = null;
    return;
  }
  if (p.character === "surveyor") {
    const cards: SignalCard[] = [];
    for (let i = 0; i < 3; i++) {
      const c = drawOne(state, entropy);
      if (c) cards.push(c);
    }
    if (cards.length > 2) {
      state.pending = { kind: "draw-pick", playerId: p.id, cards };
      state.phase = "CHOICE";
    } else {
      p.hand.push(...cards);
      actionPhase(state);
    }
    return;
  }
  draw(state, p, 1, entropy);
  const second = drawOne(state, entropy);
  if (second) {
    p.hand.push(second);
    if (p.character === "redreader") {
      log(
        state,
        `${CHARACTER_INFO[p.character].name}의 두 번째 카드: ${CARD_INFO[second.kind].name} · ${second.suit} ${second.rank}`,
      );
      if (second.suit === "hearts" || second.suit === "diamonds")
        draw(state, p, 1, entropy);
    }
  }
  actionPhase(state);
}
function startCheck(
  state: SignalState,
  p: SignalPlayer,
  purpose: Check["purpose"],
  resume: Attack | null,
  entropy: Entropy,
) {
  const cards: SignalCard[] = [];
  for (let i = 0; i < (p.character === "fortunate" ? 2 : 1); i++) {
    const c = drawOne(state, entropy);
    if (c) cards.push(c);
  }
  const check: Check = {
    kind: "check",
    playerId: p.id,
    purpose,
    cards,
    resume,
  };
  state.pending = check;
  state.phase = "CHOICE";
  if (cards.length < 2) resolveCheck(state, check, cards[0] ?? null, entropy);
}
function resolveCheck(
  state: SignalState,
  check: Check,
  chosen: SignalCard | null,
  entropy: Entropy,
) {
  state.discard.push(...check.cards);
  state.pending = null;
  if (chosen) log(state, `판정: ${chosen.suit} ${chosen.rank}`);
  const p = player(state, check.playerId),
    heart = chosen?.suit === "hearts";
  if (check.purpose === "shield") {
    const attack = check.resume!;
    if (heart) attack.remaining--;
    state.pending = attack;
    state.phase = "RESPONSE";
    if (attack.remaining <= 0) advanceAttack(state, attack, entropy);
    return;
  }
  if (check.purpose === "quarantine") {
    const card = removeEquipment(p, "quarantine");
    if (card) state.discard.push(card);
    if (heart) continueStart(state, entropy);
    else {
      log(state, "격리장으로 이번 차례를 쉽니다.");
      beginTurn(state, nextAlive(state, p.id).id, entropy);
    }
    return;
  }
  const card = removeEquipment(p, "reactor");
  if (chosen?.suit === "spades" && chosen.rank >= 2 && chosen.rank <= 9) {
    if (card) state.discard.push(card);
    damage(state, p.id, 3, null, null, "start", entropy);
  } else {
    if (card) nextAlive(state, p.id).equipment.push(card);
    continueStart(state, entropy);
  }
}
function startAttack(
  state: SignalState,
  source: SignalPlayer,
  mode: Attack["mode"],
  targets: string[],
) {
  state.pending = {
    kind: "attack",
    mode,
    sourceId: source.id,
    targets,
    at: 0,
    remaining: mode === "strike" && source.character === "piercer" ? 2 : 1,
    shieldUsed: 0,
    duelOtherId: mode === "duel" ? source.id : null,
  };
  state.phase = "RESPONSE";
}
function advanceAttack(state: SignalState, attack: Attack, entropy: Entropy) {
  if (state.result) return;
  attack.at++;
  attack.remaining = 1;
  attack.shieldUsed = 0;
  while (
    attack.at < attack.targets.length &&
    !player(state, attack.targets[attack.at]).alive
  )
    attack.at++;
  if (
    attack.mode === "duel" ||
    attack.at >= attack.targets.length ||
    !player(state, state.turnPlayerId).alive
  ) {
    actionPhase(state);
    refill(state, entropy);
    if (!player(state, state.turnPlayerId).alive)
      beginTurn(state, nextAlive(state, state.turnPlayerId).id, entropy);
  } else {
    state.pending = attack;
    state.phase = "RESPONSE";
  }
}
function damageHooks(
  state: SignalState,
  p: SignalPlayer,
  amount: number,
  sourceId: string | null,
  entropy: Entropy,
) {
  if (!p.alive || p.health <= 0) return;
  if (p.character === "resilient") draw(state, p, amount, entropy);
  if (p.character === "retaliator" && sourceId && sourceId !== p.id) {
    const source = player(state, sourceId);
    for (let i = 0; i < amount && source.hand.length; i++)
      p.hand.push(
        source.hand.splice(random(source.hand.length, entropy), 1)[0],
      );
  }
}
function afterDamage(state: SignalState, pending: Dying, entropy: Entropy) {
  if (state.result) return;
  if (pending.after === "start") continueStart(state, entropy);
  else if (pending.resume) advanceAttack(state, pending.resume, entropy);
  else actionPhase(state);
}
function damage(
  state: SignalState,
  id: string,
  amount: number,
  sourceId: string | null,
  resume: Attack | null,
  after: Dying["after"],
  entropy: Entropy,
) {
  const p = player(state, id);
  p.health -= amount;
  const pending: Dying = {
    kind: "dying",
    playerId: id,
    sourceId,
    amount,
    resume,
    after,
  };
  if (p.health <= 0) {
    state.pending = pending;
    state.phase = "DYING";
  } else {
    damageHooks(state, p, amount, sourceId, entropy);
    afterDamage(state, pending, entropy);
  }
}
function orderCards(cards: SignalCard[], raw: unknown): SignalCard[] {
  if (raw === undefined) return cards;
  need(
    Array.isArray(raw) &&
      raw.length === cards.length &&
      new Set(raw).size === cards.length &&
      raw.every(
        (id) => typeof id === "string" && cards.some((c) => c.id === id),
      ),
  );
  return raw.map((id) => cards.find((c) => c.id === id)!);
}
function eliminate(
  state: SignalState,
  pending: Dying,
  order: unknown,
  entropy: Entropy,
) {
  const p = player(state, pending.playerId);
  p.alive = false;
  const cards = orderCards([...p.hand, ...p.equipment], order);
  p.hand = [];
  p.equipment = [];
  state.activePlayerIds = alive(state).map((p) => p.id);
  const salvage = alive(state).find((p) => p.character === "salvager");
  if (salvage) salvage.hand.push(...cards);
  else state.discard.push(...cards);
  log(state, `${CHARACTER_INFO[p.character].name} 탈락. 진영이 공개됩니다.`);
  state.pending = null;
  if (finishIfWon(state)) return;
  if (pending.sourceId && pending.sourceId !== p.id) {
    const source = player(state, pending.sourceId);
    if (source.alive) {
      if (p.role === "raider") draw(state, source, 3, entropy);
      if (source.role === "captain" && p.role === "ally") {
        state.discard.push(...source.hand, ...source.equipment);
        source.hand = [];
        source.equipment = [];
      }
    }
  }
  afterDamage(state, pending, entropy);
  refill(state, entropy);
}

/** Factual base-card distribution, checked against the publisher's complete card list. */
export function definitions(): Omit<SignalCard, "id">[] {
  const cards: Omit<SignalCard, "id">[] = [];
  const add = (kind: SignalCardKind, suit: SignalSuit, ranks: number[]) =>
    ranks.forEach((rank) => cards.push({ kind, suit, rank }));
  const seq = (a: number, b: number) =>
    Array.from({ length: b - a + 1 }, (_, i) => a + i);
  add("shield", "spades", [12, 13]);
  add("reactor", "hearts", [2]);
  add("quarantine", "spades", [11, 10]);
  add("quarantine", "hearts", [4]);
  add("detour", "hearts", [8, 9]);
  add("range3", "clubs", [13]);
  add("range4", "clubs", [14]);
  add("range2", "clubs", [11, 12]);
  add("range2", "spades", [13]);
  add("lens", "spades", [14]);
  add("repeater", "spades", [10]);
  add("repeater", "clubs", [10]);
  add("range5", "spades", [8]);
  add("strike", "spades", [14]);
  add("strike", "diamonds", seq(2, 14));
  add("strike", "clubs", seq(2, 9));
  add("strike", "hearts", [12, 13, 14]);
  add("tonic", "hearts", seq(6, 11));
  add("jam", "hearts", [13]);
  add("jam", "diamonds", [9, 10, 11]);
  add("challenge", "diamonds", [12]);
  add("challenge", "spades", [11]);
  add("challenge", "clubs", [8]);
  add("barrage", "hearts", [10]);
  add("cache", "clubs", [9]);
  add("cache", "spades", [12]);
  add("raiders", "diamonds", [13, 14]);
  add("evade", "clubs", seq(10, 14));
  add("evade", "spades", seq(2, 8));
  add("snatch", "hearts", [11, 12, 14]);
  add("snatch", "diamonds", [8]);
  add("pulse", "hearts", [5]);
  add("supply", "spades", [9, 9]);
  add("caravan", "hearts", [3]);
  return cards;
}
function roleDeck(count: number): SignalRole[] {
  return [
    "captain",
    "drifter",
    "raider",
    "raider",
    ...(count >= 5 ? ["ally" as const] : []),
    ...(count >= 6 ? ["raider" as const] : []),
    ...(count >= 7 ? ["ally" as const] : []),
  ];
}
export function create(playerIds: string[], entropy: Entropy): SignalState {
  need(
    playerIds.length >= 4 &&
      playerIds.length <= 7 &&
      new Set(playerIds).size === playerIds.length &&
      playerIds.every((id) => typeof id === "string" && id.length > 0),
    "INVALID_PLAYERS",
    "황혼의 신호는 4–7명이 플레이합니다.",
  );
  const roles = shuffle(roleDeck(playerIds.length), entropy),
    characters = shuffle(
      Object.keys(CHARACTER_INFO) as SignalCharacter[],
      entropy,
    );
  const players = playerIds.map((id, i): SignalPlayer => {
    const character = characters[i],
      role = roles[i],
      health = CHARACTER_INFO[character].health + Number(role === "captain");
    return {
      id,
      character,
      role,
      health,
      maxHealth: health,
      alive: true,
      hand: [],
      equipment: [],
    };
  });
  const state: SignalState = {
    gameKey: "signal",
    rulesVersion: SIGNAL_RULES_VERSION,
    contentVersion: SIGNAL_CONTENT_VERSION,
    version: 0,
    playerIds: [...playerIds],
    activePlayerIds: [...playerIds],
    players,
    phase: "ACTION",
    turnPlayerId: players.find((p) => p.role === "captain")!.id,
    strikesPlayed: 0,
    startChecks: [],
    deck: shuffle(
      definitions().map((c) => ({ ...c, id: entropy.createId() })),
      entropy,
    ),
    discard: [],
    pending: null,
    result: null,
    publicLog: [],
  };
  for (const p of players) draw(state, p, p.maxHealth, entropy);
  beginTurn(state, state.turnPlayerId, entropy);
  return validate(state);
}

function input(payload: Record<string, unknown>, keys: string[]) {
  need(
    payload &&
      typeof payload === "object" &&
      !Array.isArray(payload) &&
      Object.keys(payload).every((k) => keys.includes(k)),
    "BAD_PAYLOAD",
    "명령에 허용되지 않은 입력이 있습니다.",
  );
}
function target(state: SignalState, raw: unknown): SignalPlayer {
  need(typeof raw === "string");
  const p = player(state, raw);
  need(p.alive, "INVALID_TARGET", "생존한 참가자를 선택하세요.");
  return p;
}
function actorFor(state: SignalState): string {
  const p = state.pending;
  if (!p) return state.turnPlayerId;
  if (p.kind === "attack") return p.targets[p.at];
  if (p.kind === "market") return p.playerIds[p.at];
  return p.playerId;
}
function playCard(
  state: SignalState,
  p: SignalPlayer,
  data: Record<string, unknown>,
  entropy: Entropy,
) {
  input(data, ["cardId", "targetId", "targetCardId"]);
  const card = takeHand(p, data.cardId),
    kind = card.kind;
  if (CARD_INFO[kind].equipment) {
    need(data.targetCardId === undefined);
    const owner = kind === "quarantine" ? target(state, data.targetId) : p;
    if (kind !== "quarantine") need(data.targetId === undefined);
    need(
      kind !== "quarantine" || owner.role !== "captain",
      "INVALID_TARGET",
      "대장에게 격리장을 놓을 수 없습니다.",
    );
    need(
      !equipped(owner, kind),
      "DUPLICATE_EQUIPMENT",
      "같은 장비는 하나만 놓을 수 있습니다.",
    );
    if (ranges[kind]) {
      const old = owner.equipment.find((c) => ranges[c.kind]);
      if (old) {
        owner.equipment.splice(owner.equipment.indexOf(old), 1);
        state.discard.push(old);
      }
    }
    owner.equipment.push(card);
    log(state, `${CARD_INFO[kind].name} 장착`);
    return;
  }
  state.discard.push(card);
  // The empty-hand ability happens immediately except while a duel is unresolved.
  if (kind !== "challenge") refill(state, entropy);
  log(state, `${CHARACTER_INFO[p.character].name}: ${CARD_INFO[kind].name}`);
  if (isStrike(p, card)) {
    const t = target(state, data.targetId);
    need(
      t.id !== p.id && distance(state, p.id, t.id) <= weapon(p),
      "OUT_OF_RANGE",
      "광선 사거리 밖입니다.",
    );
    need(
      data.targetCardId === undefined &&
        (state.strikesPlayed === 0 ||
          p.character === "rapid" ||
          equipped(p, "repeater")),
      "STRIKE_LIMIT",
      "이번 차례의 광선을 이미 사용했습니다.",
    );
    state.strikesPlayed++;
    startAttack(state, p, "strike", [t.id]);
    return;
  }
  if (["challenge", "jam", "snatch"].includes(kind)) {
    const t = target(state, data.targetId);
    if (kind === "challenge") {
      need(t.id !== p.id && data.targetCardId === undefined, "INVALID_TARGET");
      startAttack(state, p, "duel", [t.id]);
      return;
    }
    if (kind === "snatch" && t.id !== p.id)
      need(
        distance(state, p.id, t.id) <= 1,
        "OUT_OF_RANGE",
        "자력 회수는 거리 1 이내에만 사용합니다.",
      );
    let chosen: SignalCard;
    if (data.targetCardId !== undefined) {
      need(typeof data.targetCardId === "string");
      const i = t.equipment.findIndex((c) => c.id === data.targetCardId);
      need(i >= 0, "INVALID_TARGET", "공개된 장비를 선택하세요.");
      chosen = t.equipment.splice(i, 1)[0];
    } else {
      need(t.hand.length > 0, "EMPTY_HAND", "상대 손패가 비어 있습니다.");
      chosen = t.hand.splice(random(t.hand.length, entropy), 1)[0];
    }
    if (kind === "jam") state.discard.push(chosen);
    else p.hand.push(chosen);
    return;
  }
  need(data.targetId === undefined && data.targetCardId === undefined);
  if (kind === "tonic") {
    if (alive(state).length > 2) p.health = Math.min(p.maxHealth, p.health + 1);
    return;
  }
  if (kind === "pulse") {
    for (const t of alive(state))
      t.health = Math.min(t.maxHealth, t.health + 1);
    return;
  }
  if (kind === "supply" || kind === "caravan") {
    draw(state, p, kind === "supply" ? 2 : 3, entropy);
    return;
  }
  const others: string[] = [];
  let cursor = p.id;
  for (let i = 1; i < alive(state).length; i++) {
    cursor = nextAlive(state, cursor).id;
    others.push(cursor);
  }
  if (kind === "barrage" || kind === "raiders") {
    startAttack(state, p, kind, others);
    return;
  }
  if (kind === "cache") {
    const cards: SignalCard[] = [];
    for (let i = 0; i < alive(state).length; i++) {
      const c = drawOne(state, entropy);
      if (c) cards.push(c);
    }
    if (cards.length) {
      state.pending = {
        kind: "market",
        playerIds: [p.id, ...others],
        at: 0,
        cards,
      };
      state.phase = "CHOICE";
    }
    return;
  }
  fail("WRONG_PHASE", "이 카드는 대응할 때 사용합니다.");
}

export function apply(
  original: SignalState,
  actorId: string,
  command: InputCommand,
  entropy: Entropy,
): SignalState {
  validate(original);
  need(
    command &&
      typeof command.type === "string" &&
      command.payload &&
      typeof command.payload === "object",
    "BAD_PAYLOAD",
  );
  need(
    Object.keys(command).every((k) => k === "type" || k === "payload"),
    "BAD_PAYLOAD",
  );
  const state = structuredClone(original),
    p = player(state, actorId),
    data = command.payload;
  need(!state.result, "GAME_FINISHED", "종료된 게임입니다.");
  need(p.alive, "PLAYER_ELIMINATED", "이미 탈락했습니다.");
  if (command.type === "SIGNAL_HEAL") {
    input(data, ["cardIds"]);
    need(p.character === "medic", "ABILITY_UNAVAILABLE");
    need(
      Array.isArray(data.cardIds) &&
        data.cardIds.length === 2 &&
        new Set(data.cardIds).size === 2,
    );
    for (const id of data.cardIds) state.discard.push(takeHand(p, id));
    p.health = Math.min(p.maxHealth, p.health + 1);
    if (
      state.pending?.kind === "dying" &&
      state.pending.playerId === p.id &&
      p.health > 0
    ) {
      const dying = state.pending;
      damageHooks(state, p, dying.amount, dying.sourceId, entropy);
      afterDamage(state, dying, entropy);
    }
    if (
      state.phase === "DISCARD" &&
      p.id === state.turnPlayerId &&
      p.hand.length <= p.health
    )
      beginTurn(state, nextAlive(state, p.id).id, entropy);
  } else {
    need(
      actorFor(state) === actorId,
      "NOT_YOUR_TURN",
      "지금 행동할 참가자가 아닙니다.",
    );
    switch (command.type) {
      case "SIGNAL_PLAY":
        need(state.phase === "ACTION" && !state.pending, "WRONG_PHASE");
        playCard(state, p, data, entropy);
        break;
      case "SIGNAL_DRAW": {
        input(data, ["source", "targetId"]);
        need(state.phase === "DRAW" && !state.pending, "WRONG_PHASE");
        need(["deck", "discard", "player"].includes(String(data.source)));
        if (data.source === "discard") {
          need(
            p.character === "recycler" &&
              state.discard.length &&
              data.targetId === undefined,
            "ABILITY_UNAVAILABLE",
          );
          p.hand.push(state.discard.pop()!);
        } else if (data.source === "player") {
          need(p.character === "scrounger", "ABILITY_UNAVAILABLE");
          const t = target(state, data.targetId);
          need(t.id !== p.id && t.hand.length > 0, "INVALID_TARGET");
          p.hand.push(t.hand.splice(random(t.hand.length, entropy), 1)[0]);
          refill(state, entropy);
        } else {
          need(data.targetId === undefined);
          draw(state, p, 1, entropy);
        }
        draw(state, p, 1, entropy);
        actionPhase(state);
        break;
      }
      case "SIGNAL_CHOOSE": {
        input(data, ["cardIds"]);
        need(
          state.phase === "CHOICE" && state.pending && "cards" in state.pending,
          "WRONG_PHASE",
        );
        need(
          Array.isArray(data.cardIds) &&
            data.cardIds.every((x) => typeof x === "string") &&
            new Set(data.cardIds).size === data.cardIds.length,
        );
        const pending = state.pending,
          selected = data.cardIds as string[];
        need(
          selected.every((id) => pending.cards.some((c) => c.id === id)),
          "INVALID_TARGET",
        );
        if (pending.kind === "draw-pick") {
          need(selected.length === Math.min(2, pending.cards.length));
          p.hand.push(...pending.cards.filter((c) => selected.includes(c.id)));
          state.deck.push(
            ...pending.cards.filter((c) => !selected.includes(c.id)),
          );
          actionPhase(state);
        } else if (pending.kind === "check") {
          need(selected.length === 1);
          resolveCheck(
            state,
            pending,
            pending.cards.find((c) => c.id === selected[0])!,
            entropy,
          );
        } else if (pending.kind === "market") {
          need(selected.length === 1);
          p.hand.push(
            pending.cards.splice(
              pending.cards.findIndex((c) => c.id === selected[0]),
              1,
            )[0],
          );
          pending.at++;
          if (!pending.cards.length || pending.at >= pending.playerIds.length) {
            state.discard.push(...pending.cards);
            actionPhase(state);
          }
        }
        break;
      }
      case "SIGNAL_RESPOND": {
        input(data, ["cardId"]);
        need(
          state.pending?.kind === "attack" && state.phase === "RESPONSE",
          "WRONG_PHASE",
        );
        const attack = state.pending,
          card = takeHand(p, data.cardId);
        need(
          attack.mode === "duel" || attack.mode === "raiders"
            ? isStrike(p, card)
            : isEvade(p, card),
          "INVALID_RESPONSE",
          "이 효과에 사용할 수 없는 대응 카드입니다.",
        );
        state.discard.push(card);
        if (attack.mode === "duel") {
          const next = attack.duelOtherId!;
          attack.duelOtherId = p.id;
          attack.targets = [next];
          attack.at = 0;
        } else {
          attack.remaining--;
          if (attack.remaining === 0) advanceAttack(state, attack, entropy);
        }
        break;
      }
      case "SIGNAL_SHIELD": {
        input(data, []);
        need(
          state.pending?.kind === "attack" && state.phase === "RESPONSE",
          "WRONG_PHASE",
        );
        const attack = state.pending;
        need(
          (attack.mode === "strike" || attack.mode === "barrage") &&
            attack.shieldUsed <
              Number(equipped(p, "shield")) + Number(p.character === "warded"),
          "ABILITY_UNAVAILABLE",
        );
        attack.shieldUsed++;
        startCheck(state, p, "shield", attack, entropy);
        break;
      }
      case "SIGNAL_TAKE_HIT": {
        input(data, []);
        need(
          state.pending?.kind === "attack" && state.phase === "RESPONSE",
          "WRONG_PHASE",
        );
        const attack = state.pending;
        damage(state, p.id, 1, attack.sourceId, attack, "attack", entropy);
        break;
      }
      case "SIGNAL_RESCUE": {
        input(data, ["cardIds"]);
        need(
          state.pending?.kind === "dying" && state.phase === "DYING",
          "WRONG_PHASE",
        );
        need(
          alive(state).length > 2,
          "RESCUE_UNAVAILABLE",
          "생존자가 둘일 때 응급 전지는 회복하지 않습니다.",
        );
        need(
          Array.isArray(data.cardIds) &&
            data.cardIds.length > 0 &&
            new Set(data.cardIds).size === data.cardIds.length &&
            data.cardIds.length <= 1 - p.health,
        );
        const pending = state.pending;
        for (const id of data.cardIds) {
          const card = takeHand(p, id);
          need(card.kind === "tonic", "INVALID_RESPONSE");
          state.discard.push(card);
          p.health++;
        }
        if (p.health > 0) {
          damageHooks(state, p, pending.amount, pending.sourceId, entropy);
          afterDamage(state, pending, entropy);
        }
        break;
      }
      case "SIGNAL_ACCEPT_ELIMINATION": {
        input(data, ["discardOrder"]);
        need(
          state.pending?.kind === "dying" && state.phase === "DYING",
          "WRONG_PHASE",
        );
        eliminate(state, state.pending, data.discardOrder, entropy);
        break;
      }
      case "SIGNAL_END_TURN": {
        input(data, []);
        need(state.phase === "ACTION" && !state.pending, "WRONG_PHASE");
        if (p.hand.length > p.health) state.phase = "DISCARD";
        else beginTurn(state, nextAlive(state, p.id).id, entropy);
        break;
      }
      case "SIGNAL_DISCARD": {
        input(data, ["cardIds"]);
        need(state.phase === "DISCARD" && !state.pending, "WRONG_PHASE");
        need(
          Array.isArray(data.cardIds) &&
            data.cardIds.length === p.hand.length - p.health &&
            new Set(data.cardIds).size === data.cardIds.length &&
            data.cardIds.length > 0,
        );
        for (const id of data.cardIds) state.discard.push(takeHand(p, id));
        beginTurn(state, nextAlive(state, p.id).id, entropy);
        break;
      }
      default:
        fail("UNKNOWN_COMMAND", "지원하지 않는 황혼의 신호 명령입니다.");
    }
  }
  refill(state, entropy);
  state.version++;
  return validate(state);
}

export function getResult(state: SignalState): CommonGameResult | null {
  return state.result ? structuredClone(state.result) : null;
}
function publicCard(c: SignalCard) {
  return {
    id: c.id,
    kind: c.kind,
    suit: c.suit,
    rank: c.rank,
    name: CARD_INFO[c.kind].name,
    text: CARD_INFO[c.kind].text,
    equipment: CARD_INFO[c.kind].equipment,
  };
}
export function project(state: SignalState, actorId: string) {
  const p = player(state, actorId),
    active = actorFor(state),
    actions: string[] = [];
  if (!state.result && p.alive) {
    if (p.character === "medic" && p.hand.length >= 2)
      actions.push("SIGNAL_HEAL");
    if (active === actorId) {
      if (state.phase === "ACTION")
        actions.push("SIGNAL_PLAY", "SIGNAL_END_TURN");
      if (state.phase === "DRAW") actions.push("SIGNAL_DRAW");
      if (state.phase === "DISCARD") actions.push("SIGNAL_DISCARD");
      if (state.phase === "CHOICE") actions.push("SIGNAL_CHOOSE");
      if (state.pending?.kind === "attack") {
        const attack = state.pending,
          evasion = attack.mode === "strike" || attack.mode === "barrage";
        if (p.hand.some((c) => (evasion ? isEvade(p, c) : isStrike(p, c))))
          actions.push("SIGNAL_RESPOND");
        if (
          evasion &&
          attack.shieldUsed <
            Number(equipped(p, "shield")) + Number(p.character === "warded")
        )
          actions.push("SIGNAL_SHIELD");
        actions.push("SIGNAL_TAKE_HIT");
      }
      if (state.pending?.kind === "dying") {
        if (alive(state).length > 2 && p.hand.some((c) => c.kind === "tonic"))
          actions.push("SIGNAL_RESCUE");
        actions.push("SIGNAL_ACCEPT_ELIMINATION");
      }
    }
  }
  const pending = state.pending;
  const choiceCards =
    pending &&
    "cards" in pending &&
    (pending.kind === "market" ||
      pending.kind === "check" ||
      pending.playerId === actorId)
      ? pending.cards.map(publicCard)
      : [];
  return {
    gameKey: "signal" as const,
    version: state.version,
    rulesVersion: state.rulesVersion,
    phase: state.phase,
    activePlayerId: active,
    turnPlayerId: state.turnPlayerId,
    you: actorId,
    players: state.players.map((t) => ({
      id: t.id,
      alive: t.alive,
      health: t.health,
      maxHealth: t.maxHealth,
      character: { id: t.character, ...CHARACTER_INFO[t.character] },
      role:
        t.id === actorId || t.role === "captain" || !t.alive || state.result
          ? t.role
          : null,
      handCount: t.hand.length,
      equipment: t.equipment.map(publicCard),
      distance:
        t.alive && p.alive && t.id !== p.id
          ? distance(state, p.id, t.id)
          : null,
    })),
    yourHand: p.hand.map(publicCard),
    yourRole: p.role,
    weaponRange: weapon(p),
    strikesPlayed: state.strikesPlayed,
    deckCount: state.deck.length,
    discardCount: state.discard.length,
    discardTop: state.discard.length
      ? publicCard(state.discard[state.discard.length - 1])
      : null,
    legalActions: actions,
    pending: pending
      ? {
          kind: pending.kind,
          targetId: active,
          sourceId: "sourceId" in pending ? pending.sourceId : null,
          mode: pending.kind === "attack" ? pending.mode : null,
          remaining: pending.kind === "attack" ? pending.remaining : null,
          purpose: pending.kind === "check" ? pending.purpose : null,
          chooseCount:
            pending.kind === "draw-pick" && active === actorId
              ? Math.min(2, pending.cards.length)
              : 1,
          cards: choiceCards,
        }
      : null,
    result: getResult(state),
    publicLog: [...state.publicLog],
  };
}
export type SignalView = ReturnType<typeof project>;

export function validate(raw: unknown): SignalState {
  need(raw && typeof raw === "object" && !Array.isArray(raw), "BAD_STATE");
  const s = raw as SignalState;
  need(
    s.gameKey === "signal" &&
      s.rulesVersion === SIGNAL_RULES_VERSION &&
      s.contentVersion === SIGNAL_CONTENT_VERSION &&
      Number.isInteger(s.version) &&
      s.version >= 0,
    "BAD_STATE",
  );
  need(
    Array.isArray(s.playerIds) &&
      s.playerIds.length >= 4 &&
      s.playerIds.length <= 7 &&
      new Set(s.playerIds).size === s.playerIds.length &&
      s.playerIds.every((id) => typeof id === "string" && id.length > 0),
    "BAD_STATE",
  );
  need(
    Array.isArray(s.players) &&
      s.players.length === s.playerIds.length &&
      s.players.every((p, i) => p?.id === s.playerIds[i]),
    "BAD_STATE",
  );
  need(
    s.players.every(
      (p) =>
        Object.hasOwn(CHARACTER_INFO, p.character) &&
        ["captain", "ally", "raider", "drifter"].includes(p.role) &&
        typeof p.alive === "boolean" &&
        Number.isInteger(p.health) &&
        Number.isInteger(p.maxHealth) &&
        p.maxHealth ===
          CHARACTER_INFO[p.character].health + Number(p.role === "captain") &&
        p.health <= p.maxHealth &&
        p.health >= -2 &&
        Array.isArray(p.hand) &&
        Array.isArray(p.equipment),
    ),
    "BAD_STATE",
  );
  need(
    new Set(s.players.map((p) => p.character)).size === s.players.length &&
      [...s.players.map((p) => p.role)].sort().join() ===
        roleDeck(s.players.length).sort().join(),
    "BAD_STATE",
  );
  need(
    Array.isArray(s.activePlayerIds) &&
      s.activePlayerIds.join() ===
        alive(s)
          .map((p) => p.id)
          .join(),
    "BAD_STATE",
  );
  need(
    s.playerIds.includes(s.turnPlayerId) &&
      Number.isInteger(s.strikesPlayed) &&
      s.strikesPlayed >= 0 &&
      Array.isArray(s.startChecks) &&
      new Set(s.startChecks).size === s.startChecks.length &&
      s.startChecks.every((x) => x === "reactor" || x === "quarantine"),
    "BAD_STATE",
  );
  need(
    Array.isArray(s.deck) &&
      Array.isArray(s.discard) &&
      Array.isArray(s.publicLog) &&
      s.publicLog.length <= 12 &&
      s.publicLog.every((x) => typeof x === "string" && x.length < 300),
    "BAD_STATE",
  );
  need(
    [
      "DRAW",
      "ACTION",
      "RESPONSE",
      "DYING",
      "CHOICE",
      "DISCARD",
      "FINISHED",
    ].includes(s.phase),
    "BAD_STATE",
  );
  need(
    s.pending === null ||
      (typeof s.pending === "object" &&
        ["attack", "dying", "check", "draw-pick", "market"].includes(
          s.pending.kind,
        )),
    "BAD_STATE",
  );
  const checkAttack = (a: Attack) => {
    need(
      a &&
        a.kind === "attack" &&
        ["strike", "barrage", "raiders", "duel"].includes(a.mode) &&
        s.playerIds.includes(a.sourceId) &&
        Array.isArray(a.targets) &&
        a.targets.length > 0 &&
        new Set(a.targets).size === a.targets.length &&
        a.targets.every((id) => s.playerIds.includes(id)) &&
        Number.isInteger(a.at) &&
        a.at >= 0 &&
        a.at < a.targets.length &&
        Number.isInteger(a.remaining) &&
        a.remaining >= 1 &&
        a.remaining <= 2 &&
        Number.isInteger(a.shieldUsed) &&
        a.shieldUsed >= 0 &&
        a.shieldUsed <= 2,
      "BAD_STATE",
    );
    need(
      a.mode === "duel"
        ? typeof a.duelOtherId === "string" &&
            s.playerIds.includes(a.duelOtherId) &&
            a.duelOtherId !== a.targets[a.at]
        : a.duelOtherId === null,
      "BAD_STATE",
    );
  };
  const pending = s.pending;
  if (pending?.kind === "attack") {
    checkAttack(pending);
    need(
      s.phase === "RESPONSE" && player(s, pending.targets[pending.at]).alive,
      "BAD_STATE",
    );
  }
  if (pending?.kind === "dying") {
    need(
      s.phase === "DYING" &&
        s.playerIds.includes(pending.playerId) &&
        player(s, pending.playerId).alive &&
        player(s, pending.playerId).health <= 0 &&
        (pending.sourceId === null || s.playerIds.includes(pending.sourceId)) &&
        (pending.amount === 1 || pending.amount === 3) &&
        ["attack", "start"].includes(pending.after),
      "BAD_STATE",
    );
    if (pending.resume) checkAttack(pending.resume);
  }
  if (pending?.kind === "check") {
    need(
      s.phase === "CHOICE" &&
        s.playerIds.includes(pending.playerId) &&
        ["shield", "quarantine", "reactor"].includes(pending.purpose) &&
        Array.isArray(pending.cards) &&
        pending.cards.length === 2 &&
        player(s, pending.playerId).character === "fortunate",
      "BAD_STATE",
    );
    if (pending.resume) checkAttack(pending.resume);
  }
  if (pending?.kind === "draw-pick")
    need(
      s.phase === "CHOICE" &&
        s.playerIds.includes(pending.playerId) &&
        player(s, pending.playerId).character === "surveyor" &&
        Array.isArray(pending.cards) &&
        pending.cards.length === 3,
      "BAD_STATE",
    );
  if (pending?.kind === "market")
    need(
      s.phase === "CHOICE" &&
        Array.isArray(pending.playerIds) &&
        pending.playerIds.length > 0 &&
        new Set(pending.playerIds).size === pending.playerIds.length &&
        pending.playerIds.every((id) => s.playerIds.includes(id)) &&
        Number.isInteger(pending.at) &&
        pending.at >= 0 &&
        pending.at < pending.playerIds.length &&
        Array.isArray(pending.cards) &&
        pending.cards.length > 0,
      "BAD_STATE",
    );
  if (!pending)
    need(
      ["DRAW", "ACTION", "DISCARD", "FINISHED"].includes(s.phase),
      "BAD_STATE",
    );
  if (s.phase === "DRAW")
    need(
      ["scrounger", "recycler"].includes(player(s, s.turnPlayerId).character),
      "BAD_STATE",
    );
  if (s.phase === "DISCARD")
    need(
      player(s, s.turnPlayerId).hand.length > player(s, s.turnPlayerId).health,
      "BAD_STATE",
    );
  if (s.phase !== "FINISHED")
    need(
      player(s, s.turnPlayerId).alive ||
        (pending?.kind === "dying" && pending.playerId === s.turnPlayerId),
      "BAD_STATE",
    );
  if (pending?.kind === "attack")
    need(
      pending.mode === "duel" || !pending.targets.includes(pending.sourceId),
      "BAD_STATE",
    );
  if (pending?.kind === "dying" && pending.resume)
    need(
      pending.resume.targets[pending.resume.at] === pending.playerId,
      "BAD_STATE",
    );
  if (pending?.kind === "check")
    need(
      pending.purpose === "shield"
        ? pending.resume?.targets[pending.resume.at] === pending.playerId
        : pending.resume === null && pending.playerId === s.turnPlayerId,
      "BAD_STATE",
    );
  for (const p of s.players) {
    need(
      p.alive
        ? p.health > 0 ||
            (pending?.kind === "dying" && pending.playerId === p.id)
        : p.health <= 0 && !p.hand.length && !p.equipment.length,
      "BAD_STATE",
    );
    need(
      new Set(p.equipment.map((c) => c.kind)).size === p.equipment.length &&
        p.equipment.filter((c) => ranges[c.kind]).length <= 1 &&
        p.equipment.every((c) => CARD_INFO[c.kind]?.equipment) &&
        !(p.role === "captain" && equipped(p, "quarantine")),
      "BAD_STATE",
    );
  }
  const cards = [
    ...s.deck,
    ...s.discard,
    ...s.players.flatMap((p) => [...p.hand, ...p.equipment]),
    ...cardsInPending(pending),
  ];
  need(
    cards.length === 80 &&
      cards.every(
        (c) =>
          c &&
          typeof c.id === "string" &&
          c.id.length > 0 &&
          Object.hasOwn(CARD_INFO, c.kind) &&
          SUITS.includes(c.suit) &&
          Number.isInteger(c.rank) &&
          c.rank >= 2 &&
          c.rank <= 14,
      ) &&
      new Set(cards.map((c) => c.id)).size === 80,
    "BAD_STATE",
  );
  const signature = (c: Omit<SignalCard, "id">) =>
    `${c.kind}:${c.suit}:${c.rank}`;
  need(
    cards.map(signature).sort().join() ===
      definitions().map(signature).sort().join(),
    "BAD_STATE",
  );
  need(
    s.result === null
      ? s.phase !== "FINISHED"
      : s.phase === "FINISHED" &&
          !pending &&
          Array.isArray(s.result.winners) &&
          s.result.winners.length > 0 &&
          s.result.winners.every((id) => s.playerIds.includes(id)) &&
          s.result.tied === false &&
          Array.isArray(s.result.scores) &&
          s.result.scores.length === 0 &&
          ["LAST_SIGNAL", "CAPTAIN_FALLEN", "OUTPOST_SECURED"].includes(
            s.result.reason,
          ),
    "BAD_STATE",
  );
  const survivorRoles = alive(s).map((p) => p.role),
    captainAlive = survivorRoles.includes("captain");
  if (s.result) {
    const expectedRoles: SignalRole[] = !captainAlive
      ? survivorRoles.length === 1 && survivorRoles[0] === "drifter"
        ? ["drifter"]
        : ["raider"]
      : ["captain", "ally"];
    need(
      !captainAlive ||
        !survivorRoles.some((r) => r === "raider" || r === "drifter"),
      "BAD_STATE",
    );
    const reason = captainAlive
      ? "OUTPOST_SECURED"
      : expectedRoles[0] === "drifter"
        ? "LAST_SIGNAL"
        : "CAPTAIN_FALLEN";
    need(
      s.result.reason === reason &&
        s.result.winners.join() ===
          s.players
            .filter((p) => expectedRoles.includes(p.role))
            .map((p) => p.id)
            .join(),
      "BAD_STATE",
    );
  } else
    need(
      captainAlive &&
        survivorRoles.some((r) => r === "raider" || r === "drifter"),
      "BAD_STATE",
    );
  return s;
}
