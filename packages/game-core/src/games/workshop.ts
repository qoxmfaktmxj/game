import data from "./workshop-cards.json";
import type { Entropy, InputCommand } from "../entropy";
export const COLORS = ["white", "blue", "green", "red", "black"] as const;
export const TOKENS = [...COLORS, "gold"] as const;
export type Color = (typeof COLORS)[number];
export type Token = (typeof TOKENS)[number];
export type Tokens = Record<Token, number>;
export interface Work {
  id: string;
  level: number;
  bonus: Color;
  points: number;
  cost: Record<Color, number>;
}
export interface Patron {
  id: string;
  points: number;
  cost: Record<Color, number>;
}
export interface Artisan {
  id: string;
  tokens: Tokens;
  owned: Work[];
  reserved: Work[];
  patrons: Patron[];
}
export interface WorkshopState {
  version: number;
  playerIds: string[];
  phase: "ACTION" | "RETURN" | "PATRON" | "FINISHED";
  activePlayerIndex: number;
  bank: Tokens;
  players: Artisan[];
  decks: Work[][];
  market: Work[][];
  patrons: Patron[];
  unusedPatrons: Patron[];
  finalRound: boolean;
  round: number;
}
function fail(code = "INVALID_INPUT"): never {
  throw Object.assign(new Error(code), { code });
}
const zero = (): Tokens => ({
  white: 0,
  blue: 0,
  green: 0,
  red: 0,
  black: 0,
  gold: 0,
});
const sum = (tokens: Tokens) => TOKENS.reduce((n, c) => n + tokens[c], 0);
export const WORKS: Work[] = data.map((row) => ({
  ...row,
  bonus: row.bonus as Color,
}));
// Functional requirements verified against two independent datasets; names/art are original.
export const PATRONS: Patron[] = [
  [0, 0, 4, 4, 0],
  [0, 4, 4, 0, 0],
  [4, 4, 0, 0, 0],
  [4, 0, 0, 0, 4],
  [0, 0, 0, 4, 4],
  [0, 3, 3, 3, 0],
  [3, 3, 3, 0, 0],
  [3, 3, 0, 0, 3],
  [3, 0, 0, 3, 3],
  [0, 0, 3, 3, 3],
].map((cost, i) => ({
  id: `p-${i + 1}`,
  points: 3,
  cost: Object.fromEntries(COLORS.map((c, j) => [c, cost[j]])) as Record<
    Color,
    number
  >,
}));
const shuffled = <T>(items: T[], e: Entropy): T[] => {
  const a = structuredClone(items);
  for (let i = a.length - 1; i > 0; i--) {
    const j = e.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
export function create(playerIds: string[], entropy: Entropy): WorkshopState {
  if (
    playerIds.length < 2 ||
    playerIds.length > 4 ||
    new Set(playerIds).size !== playerIds.length
  )
    fail();
  const decks = [1, 2, 3].map((level) =>
      shuffled(
        WORKS.filter((c) => c.level === level),
        entropy,
      ),
    ),
    market = decks.map((d) => d.splice(0, 4));
  const patrons = shuffled(PATRONS, entropy),
    used = patrons.splice(0, playerIds.length + 1);
  const count = playerIds.length === 4 ? 7 : playerIds.length + 2;
  return {
    version: 0,
    playerIds: [...playerIds],
    phase: "ACTION",
    activePlayerIndex: 0,
    bank: {
      white: count,
      blue: count,
      green: count,
      red: count,
      black: count,
      gold: 5,
    },
    players: playerIds.map((id) => ({
      id,
      tokens: zero(),
      owned: [],
      reserved: [],
      patrons: [],
    })),
    decks,
    market,
    patrons: used,
    unusedPatrons: patrons,
    finalRound: false,
    round: 1,
  };
}
export function bonuses(player: Artisan): Record<Color, number> {
  return Object.fromEntries(
    COLORS.map((c) => [c, player.owned.filter((w) => w.bonus === c).length]),
  ) as Record<Color, number>;
}
export const points = (p: Artisan) =>
  p.owned.reduce((n, w) => n + w.points, 0) +
  p.patrons.reduce((n, w) => n + w.points, 0);
export function price(player: Artisan, work: Work): Tokens {
  const bonus = bonuses(player),
    payment = zero();
  for (const color of COLORS) {
    const need = Math.max(0, work.cost[color] - bonus[color]);
    payment[color] = Math.min(player.tokens[color], need);
    payment.gold += need - payment[color];
  }
  return payment;
}
function eligible(s: WorkshopState) {
  const bonus = bonuses(s.players[s.activePlayerIndex]);
  return s.patrons.filter((p) => COLORS.every((c) => bonus[c] >= p.cost[c]));
}
function finish(s: WorkshopState) {
  if (points(s.players[s.activePlayerIndex]) >= 15) s.finalRound = true;
  s.activePlayerIndex = (s.activePlayerIndex + 1) % s.playerIds.length;
  s.phase = s.finalRound && s.activePlayerIndex === 0 ? "FINISHED" : "ACTION";
  if (s.activePlayerIndex === 0) s.round++;
}
function afterAction(s: WorkshopState) {
  if (sum(s.players[s.activePlayerIndex].tokens) > 10) {
    s.phase = "RETURN";
    return;
  }
  const choices = eligible(s);
  if (choices.length === 1) {
    const p = choices[0];
    s.players[s.activePlayerIndex].patrons.push(p);
    s.patrons = s.patrons.filter((n) => n.id !== p.id);
    finish(s);
  } else if (choices.length > 1) s.phase = "PATRON";
  else finish(s);
}
function keys(p: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(p).some((k) => !allowed.includes(k))) fail();
}
function tokenInput(raw: unknown): Tokens {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) fail();
  const r = raw as Record<string, unknown>;
  keys(r, [...TOKENS]);
  const out = zero();
  for (const c of TOKENS) {
    if (
      r[c] !== undefined &&
      (!Number.isInteger(r[c]) || (r[c] as number) < 0 || (r[c] as number) > 10)
    )
      fail();
    out[c] = (r[c] as number | undefined) ?? 0;
  }
  return out;
}
function removeMarket(s: WorkshopState, id: string): Work {
  for (let i = 0; i < 3; i++) {
    const index = s.market[i].findIndex((w) => w.id === id);
    if (index >= 0) {
      const [w] = s.market[i].splice(index, 1);
      const replacement = s.decks[i].shift();
      if (replacement) s.market[i].splice(index, 0, replacement);
      return w;
    }
  }
  return fail("CARD_NOT_AVAILABLE");
}
export function apply(
  original: WorkshopState,
  actorId: string,
  command: InputCommand,
  _entropy: Entropy,
): WorkshopState {
  if (original.phase === "FINISHED") fail("GAME_FINISHED");
  if (original.playerIds[original.activePlayerIndex] !== actorId)
    fail("NOT_YOUR_TURN");
  if (
    !command.payload ||
    typeof command.payload !== "object" ||
    Array.isArray(command.payload)
  )
    fail();
  const s = structuredClone(original),
    p = s.players[s.activePlayerIndex],
    payload = command.payload;
  if (command.type === "WORKSHOP_RETURN") {
    keys(payload, ["tokens"]);
    if (s.phase !== "RETURN") fail("WRONG_PHASE");
    const returned = tokenInput(payload.tokens);
    if (
      sum(returned) !== sum(p.tokens) - 10 ||
      TOKENS.some((c) => returned[c] > p.tokens[c])
    )
      fail("TOKEN_RETURN");
    for (const c of TOKENS) {
      p.tokens[c] -= returned[c];
      s.bank[c] += returned[c];
    }
    afterAction(s);
  } else if (command.type === "WORKSHOP_PATRON") {
    keys(payload, ["patronId"]);
    if (s.phase !== "PATRON") fail("WRONG_PHASE");
    const patron = eligible(s).find((n) => n.id === payload.patronId);
    if (!patron) fail("PATRON_NOT_ELIGIBLE");
    p.patrons.push(patron);
    s.patrons = s.patrons.filter((n) => n.id !== patron.id);
    finish(s);
  } else {
    if (s.phase !== "ACTION") fail("WRONG_PHASE");
    if (command.type === "WORKSHOP_TAKE") {
      keys(payload, ["colors"]);
      if (
        !Array.isArray(payload.colors) ||
        payload.colors.length > 3 ||
        !payload.colors.length ||
        payload.colors.some((c) => !COLORS.includes(c as Color))
      )
        fail();
      const colors = payload.colors as Color[],
        distinct = new Set(colors);
      if (distinct.size === 1 && colors.length === 2) {
        if (s.bank[colors[0]] < 4) fail("TOKEN_SUPPLY");
      } else if (
        distinct.size !== colors.length ||
        colors.length !==
          Math.min(3, COLORS.filter((c) => s.bank[c] > 0).length)
      )
        fail("TOKEN_SELECTION");
      for (const c of colors) {
        if (s.bank[c] < 1) fail("TOKEN_SUPPLY");
        s.bank[c]--;
        p.tokens[c]++;
      }
    } else if (command.type === "WORKSHOP_RESERVE") {
      keys(payload, ["cardId", "level"]);
      if (p.reserved.length >= 3) fail("RESERVE_LIMIT");
      if ((payload.cardId === undefined) === (payload.level === undefined))
        fail();
      let work: Work;
      if (typeof payload.cardId === "string")
        work = removeMarket(s, payload.cardId);
      else {
        const level = payload.level;
        if (
          !Number.isInteger(level) ||
          (level as number) < 1 ||
          (level as number) > 3
        )
          fail();
        const card = s.decks[(level as number) - 1].shift();
        if (!card) fail("EMPTY_DECK");
        work = card;
      }
      p.reserved.push(work);
      if (s.bank.gold) {
        s.bank.gold--;
        p.tokens.gold++;
      }
    } else if (command.type === "WORKSHOP_BUY") {
      keys(payload, ["cardId", "payment"]);
      if (typeof payload.cardId !== "string") fail();
      const work = [...s.market.flat(), ...p.reserved].find(
        (w) => w.id === payload.cardId,
      );
      if (!work) fail("CARD_NOT_AVAILABLE");
      const payment =
          payload.payment === undefined
            ? price(p, work)
            : tokenInput(payload.payment),
        bonus = bonuses(p);
      let goldRequired = 0;
      for (const c of COLORS) {
        const need = Math.max(0, work.cost[c] - bonus[c]);
        if (payment[c] > need) fail("INVALID_PAYMENT");
        goldRequired += need - payment[c];
      }
      if (
        payment.gold !== goldRequired ||
        TOKENS.some((c) => payment[c] > p.tokens[c])
      )
        fail("INSUFFICIENT_TOKENS");
      for (const c of TOKENS) {
        p.tokens[c] -= payment[c];
        s.bank[c] += payment[c];
      }
      if (p.reserved.some((c) => c.id === work.id))
        p.reserved = p.reserved.filter((c) => c.id !== work.id);
      else removeMarket(s, work.id);
      p.owned.push(work);
    } else fail();
    afterAction(s);
  }
  s.version++;
  validate(s);
  return s;
}
export function getResult(s: WorkshopState) {
  if (s.phase !== "FINISHED") return null;
  const scores = s.players.map((p) => ({
      playerId: p.id,
      total: points(p),
      works: p.owned.length,
    })),
    best = Math.max(...scores.map((p) => p.total));
  const fewest = Math.min(
      ...scores.filter((p) => p.total === best).map((p) => p.works),
    ),
    winners = scores
      .filter((p) => p.total === best && p.works === fewest)
      .map((p) => p.playerId);
  return {
    winners,
    tied: winners.length > 1,
    reason: "PRESTIGE_LIMIT",
    scores,
  };
}
export function project(s: WorkshopState, actorId: string) {
  const p = s.players.find((p) => p.id === actorId);
  if (!p) fail("NOT_MEMBER");
  const active =
    s.playerIds[s.activePlayerIndex] === actorId && s.phase !== "FINISHED";
  return {
    version: s.version,
    phase: s.phase,
    activePlayerId: s.playerIds[s.activePlayerIndex],
    you: actorId,
    bank: { ...s.bank },
    market: structuredClone(s.market),
    deckCounts: s.decks.map((d) => d.length),
    patrons: structuredClone(s.patrons),
    yourReserved: structuredClone(p.reserved),
    players: s.players.map((player) => ({
      id: player.id,
      tokens: { ...player.tokens },
      bonuses: bonuses(player),
      owned: structuredClone(player.owned),
      reservedCount: player.reserved.length,
      patrons: structuredClone(player.patrons),
      points: points(player),
    })),
    finalRound: s.finalRound,
    round: s.round,
    eligiblePatronIds: active ? eligible(s).map((n) => n.id) : [],
    legalActions: !active
      ? []
      : s.phase === "RETURN"
        ? ["WORKSHOP_RETURN"]
        : s.phase === "PATRON"
          ? ["WORKSHOP_PATRON"]
          : ["WORKSHOP_TAKE", "WORKSHOP_RESERVE", "WORKSHOP_BUY"],
    result: getResult(s),
  };
}
export function validate(raw: unknown): WorkshopState {
  const s = raw as WorkshopState;
  if (
    !s ||
    !Array.isArray(s.playerIds) ||
    s.playerIds.length < 2 ||
    s.playerIds.length > 4 ||
    s.playerIds.some((id) => typeof id !== "string") ||
    new Set(s.playerIds).size !== s.playerIds.length ||
    !Number.isSafeInteger(s.version) ||
    s.version < 0 ||
    !["ACTION", "RETURN", "PATRON", "FINISHED"].includes(s.phase) ||
    !Number.isInteger(s.activePlayerIndex) ||
    s.activePlayerIndex < 0 ||
    s.activePlayerIndex >= s.playerIds.length ||
    !Number.isSafeInteger(s.round) ||
    s.round < 1 ||
    typeof s.finalRound !== "boolean"
  )
    fail("INVALID_STATE");
  const validTokens = (t: Tokens) =>
    t &&
    TOKENS.every((c) => Number.isInteger(t[c]) && t[c] >= 0 && t[c] <= 12) &&
    Object.keys(t).length === 6;
  if (
    !validTokens(s.bank) ||
    !Array.isArray(s.players) ||
    s.players.length !== s.playerIds.length ||
    s.players.some(
      (p, i) =>
        !p ||
        typeof p !== "object" ||
        Array.isArray(p) ||
        p.id !== s.playerIds[i] ||
        !validTokens(p.tokens) ||
        !Array.isArray(p.owned) ||
        !Array.isArray(p.reserved) ||
        p.reserved.length > 3 ||
        !Array.isArray(p.patrons),
    ) ||
    !Array.isArray(s.decks) ||
    s.decks.length !== 3 ||
    !Array.isArray(s.market) ||
    s.market.length !== 3 ||
    s.decks.some((d) => !Array.isArray(d)) ||
    s.market.some((d) => !Array.isArray(d) || d.length > 4) ||
    !Array.isArray(s.patrons) ||
    !Array.isArray(s.unusedPatrons)
  )
    fail("INVALID_STATE");
  const all = [
    ...s.decks.flat(),
    ...s.market.flat(),
    ...s.players.flatMap((p) => [...p.owned, ...p.reserved]),
  ];
  if (
    all.length !== 90 ||
    all.some((c) => !c || typeof c !== "object" || Array.isArray(c)) ||
    new Set(all.map((c) => c.id)).size !== 90 ||
    all.some(
      (c) =>
        !WORKS.some(
          (w) =>
            w.id === c.id &&
            w.level === c.level &&
            w.bonus === c.bonus &&
            w.points === c.points &&
            COLORS.every((color) => w.cost[color] === c.cost?.[color]),
        ),
    )
  )
    fail("INVALID_STATE");
  if (
    s.decks.some((deck, index) =>
      deck.some((card) => card.level !== index + 1),
    ) ||
    s.market.some(
      (row, index) =>
        row.some((card) => card.level !== index + 1) ||
        (s.decks[index].length > 0 && row.length !== 4),
    )
  )
    fail("INVALID_STATE");
  const patrons = [
    ...s.patrons,
    ...s.unusedPatrons,
    ...s.players.flatMap((p) => p.patrons),
  ];
  if (
    patrons.length !== 10 ||
    patrons.some((p) => !p || typeof p !== "object" || Array.isArray(p)) ||
    new Set(patrons.map((p) => p.id)).size !== 10 ||
    patrons.some(
      (p) =>
        !PATRONS.some(
          (n) =>
            n.id === p.id &&
            n.points === p.points &&
            COLORS.every((c) => n.cost[c] === p.cost?.[c]),
        ),
    )
  )
    fail("INVALID_STATE");
  if (
    s.unusedPatrons.length !== 9 - s.playerIds.length ||
    s.players.some((player) => {
      const bonus = bonuses(player);
      return player.patrons.some((patron) =>
        COLORS.some((color) => bonus[color] < patron.cost[color]),
      );
    })
  )
    fail("INVALID_STATE");
  const count = s.playerIds.length === 4 ? 7 : s.playerIds.length + 2;
  if (
    TOKENS.some(
      (c) =>
        s.bank[c] + s.players.reduce((n, p) => n + p.tokens[c], 0) !==
        (c === "gold" ? 5 : count),
    )
  )
    fail("INVALID_STATE");
  if (
    s.players.some(
      (p, i) =>
        sum(p.tokens) > 13 ||
        (sum(p.tokens) > 10 &&
          !(s.phase === "RETURN" && i === s.activePlayerIndex)),
    )
  )
    fail("INVALID_STATE");
  if (
    (s.phase === "PATRON" && eligible(s).length < 2) ||
    (s.phase === "RETURN" && sum(s.players[s.activePlayerIndex].tokens) <= 10)
  )
    fail("INVALID_STATE");
  const reachedLimit = s.players.filter((player) => points(player) >= 15);
  if (
    (s.finalRound && reachedLimit.length === 0) ||
    (s.phase === "FINISHED" && (!s.finalRound || s.activePlayerIndex !== 0)) ||
    (s.phase !== "FINISHED" && s.finalRound && s.activePlayerIndex === 0) ||
    (!s.finalRound &&
      reachedLimit.length > 0 &&
      (!(["RETURN", "PATRON"] as string[]).includes(s.phase) ||
        reachedLimit.some(
          (player) => player.id !== s.playerIds[s.activePlayerIndex],
        )))
  )
    fail("INVALID_STATE");
  return s;
}
