import type { Card, LaneScore } from "./types.js";

/** The public lane totals used for both an accepted score and a placement preview. */
export function scoreLaneTotals({
  sum,
  supports,
  count,
}: Pick<LaneScore, "sum" | "supports" | "count">): LaneScore {
  const cost = count === 0 ? 0 : -20;
  const multiplier = supports + 1;
  const bonus = count >= 8 ? 20 : 0;
  return {
    sum,
    cost,
    supports,
    multiplier,
    bonus,
    count,
    total: (sum + cost) * multiplier + bonus,
  };
}

export function scoreAfterPlacement(
  lane: LaneScore,
  card: Pick<Card, "kind" | "value">,
): LaneScore {
  return scoreLaneTotals({
    sum: lane.sum + (card.value ?? 0),
    supports: lane.supports + (card.kind === "support" ? 1 : 0),
    count: lane.count + 1,
  });
}
