import type { GameViewMap } from "@moyeotable/contracts";

/** Deterministic integration-test policy: it sees only one authenticated player's view. */
export function councilBotCommand(view: GameViewMap["council"]): { type: string; payload: Record<string, unknown> } | null {
  if (!view.legalActions.length) return null;
  const mine = view.players.find((player) => player.id === view.you)!;
  if (view.phase === "CROWN") return { type: "COUNCIL_CROWN", payload: { playerId: view.you } };
  if (view.phase === "DRAFT") {
    const role = [7, 6, 4, 5, 3, 2, 1, 8].find((rank) => view.draftChoices.includes(rank))!;
    return { type: "COUNCIL_DRAFT", payload: { role, ...(view.draftNeedsDiscard ? { discardRole: view.draftChoices.find((rank) => rank !== role) } : {}) } };
  }
  if (view.phase === "RESOURCE") {
    const useful = view.yourHand.filter((card) => !mine.city.some((built) => built.kind === card.kind));
    return { type: "COUNCIL_RESOURCE", payload: { kind: useful.length && mine.gold < 10 ? "gold" : "cards" } };
  }
  if (view.phase === "CHOOSE_CARDS") {
    const sorted = [...view.choice].sort((a, b) => Number(mine.city.some((card) => card.kind === a.kind)) - Number(mine.city.some((card) => card.kind === b.kind)) || a.cost - b.cost);
    return { type: "COUNCIL_KEEP", payload: { cardIds: sorted.slice(0, view.keepCount).map((card) => card.id) } };
  }
  if (view.phase === "GRAVEYARD") return { type: "COUNCIL_RECOVER", payload: { take: true } };
  if (view.legalActions.includes("COUNCIL_INCOME")) return { type: "COUNCIL_INCOME", payload: {} };
  const card = view.yourHand.filter((card) => !mine.city.some((built) => built.kind === card.kind) && card.cost <= mine.gold).sort((a, b) => a.cost - b.cost)[0];
  if (card && view.legalActions.includes("COUNCIL_BUILD")) return { type: "COUNCIL_BUILD", payload: { cardId: card.id } };
  if (view.activeRole === 3 && view.legalActions.includes("COUNCIL_POWER")) return { type: "COUNCIL_POWER", payload: { kind: "cycle", cardIds: view.yourHand.filter((card) => mine.city.some((built) => built.kind === card.kind)).map((card) => card.id) } };
  return { type: "COUNCIL_END", payload: {} };
}
