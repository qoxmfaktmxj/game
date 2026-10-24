import type { GameViewMap } from "@moyeotable/contracts";
type View = GameViewMap["workshop"];
const colors = ["white", "blue", "green", "red", "black"] as const;
const tokens = [...colors, "gold"] as const;
export function workshopBotCommand(
  v: View,
): { type: string; payload: Record<string, unknown> } | null {
  if (!v.legalActions.length) return null;
  const p = v.players.find((p) => p.id === v.you)!,
    available = [...v.market.flat(), ...v.yourReserved];
  const need = (w: (typeof available)[number]) =>
    colors.reduce(
      (n, c) => n + Math.max(0, w.cost[c] - p.bonuses[c] - p.tokens[c]),
      0,
    );
  if (v.phase === "PATRON")
    return {
      type: "WORKSHOP_PATRON",
      payload: { patronId: v.eligiblePatronIds[0] },
    };
  const target = [...available].sort((a, b) => need(a) - need(b))[0];
  if (v.phase === "RETURN") {
    const returned = { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 };
    let excess = tokens.reduce((n, c) => n + p.tokens[c], 0) - 10;
    const order = [...colors].sort(
      (a, b) =>
        p.tokens[b] -
        Math.max(0, target.cost[b] - p.bonuses[b]) -
        (p.tokens[a] - Math.max(0, target.cost[a] - p.bonuses[a])),
    );
    for (const c of order) {
      const n = Math.min(excess, p.tokens[c]);
      returned[c] = n;
      excess -= n;
    }
    returned.gold = excess;
    return { type: "WORKSHOP_RETURN", payload: { tokens: returned } };
  }
  const affordable = available
    .filter((w) => need(w) <= p.tokens.gold)
    .sort((a, b) => b.points - a.points || b.level - a.level);
  if (affordable.length)
    return { type: "WORKSHOP_BUY", payload: { cardId: affordable[0].id } };
  const order = colors
    .filter((c) => v.bank[c] > 0)
    .sort(
      (a, b) =>
        target.cost[b] -
        p.bonuses[b] -
        p.tokens[b] -
        (target.cost[a] - p.bonuses[a] - p.tokens[a]),
    );
  const c = order[0],
    take =
      c && v.bank[c] >= 4 && target.cost[c] - p.bonuses[c] - p.tokens[c] >= 2
        ? [c, c]
        : order.slice(0, 3);
  if (take.length) return { type: "WORKSHOP_TAKE", payload: { colors: take } };
  if (p.reservedCount < 3 && v.market.flat().length)
    return {
      type: "WORKSHOP_RESERVE",
      payload: { cardId: v.market.flat()[0].id },
    };
  throw new Error("Test policy has no available move");
}
