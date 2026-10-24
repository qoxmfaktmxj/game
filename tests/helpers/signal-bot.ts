import type { GameViewMap } from "@moyeotable/contracts";

/** Deterministic smoke-test opponent. Uses only the view received by this player. */
export function signalBotCommand(
  view: GameViewMap["signal"],
): { type: string; payload: Record<string, unknown> } | null {
  const actions = view.legalActions;
  const me = view.players.find((p) => p.id === view.you)!;
  if (!actions.length || view.phase === "FINISHED") return null;
  if (actions.includes("SIGNAL_DRAW"))
    return { type: "SIGNAL_DRAW", payload: { source: "deck" } };
  if (actions.includes("SIGNAL_CHOOSE"))
    return {
      type: "SIGNAL_CHOOSE",
      payload: {
        cardIds: view
          .pending!.cards.slice(0, view.pending!.chooseCount)
          .map((c) => c.id),
      },
    };
  if (actions.includes("SIGNAL_ACCEPT_ELIMINATION"))
    return { type: "SIGNAL_ACCEPT_ELIMINATION", payload: {} };
  if (actions.includes("SIGNAL_TAKE_HIT"))
    return { type: "SIGNAL_TAKE_HIT", payload: {} };
  if (actions.includes("SIGNAL_DISCARD"))
    return {
      type: "SIGNAL_DISCARD",
      payload: {
        cardIds: view.yourHand
          .slice(0, me.handCount - me.health)
          .map((c) => c.id),
      },
    };
  if (!actions.includes("SIGNAL_PLAY")) return null;
  const others = view.players.filter((p) => p.alive && p.id !== me.id);
  for (const c of view.yourHand) {
    if (
      c.kind === "strike" ||
      (c.kind === "evade" && me.character.id === "versatile")
    ) {
      if (
        view.strikesPlayed > 0 &&
        me.character.id !== "rapid" &&
        !me.equipment.some((c) => c.kind === "repeater")
      )
        continue;
      const target = others.find(
        (p) => p.distance !== null && p.distance <= view.weaponRange,
      );
      if (target)
        return {
          type: "SIGNAL_PLAY",
          payload: { cardId: c.id, targetId: target.id },
        };
      continue;
    }
    if (c.kind === "evade" || c.kind === "tonic" || c.kind === "pulse")
      continue;
    if (c.kind === "challenge")
      return {
        type: "SIGNAL_PLAY",
        payload: { cardId: c.id, targetId: others[0].id },
      };
    if (c.kind === "jam" || c.kind === "snatch") {
      const target = others.find(
        (p) =>
          (p.handCount > 0 || p.equipment.length > 0) &&
          (c.kind === "jam" || (p.distance !== null && p.distance <= 1)),
      );
      if (target)
        return {
          type: "SIGNAL_PLAY",
          payload: {
            cardId: c.id,
            targetId: target.id,
            ...(target.handCount === 0
              ? { targetCardId: target.equipment[0].id }
              : {}),
          },
        };
      continue;
    }
    if (c.kind === "quarantine") {
      const target = others.find(
        (p) =>
          p.role !== "captain" &&
          !p.equipment.some((c) => c.kind === "quarantine"),
      );
      if (target)
        return {
          type: "SIGNAL_PLAY",
          payload: { cardId: c.id, targetId: target.id },
        };
      continue;
    }
    if (c.equipment && me.equipment.some((gear) => gear.kind === c.kind))
      continue;
    return { type: "SIGNAL_PLAY", payload: { cardId: c.id } };
  }
  return { type: "SIGNAL_END_TURN", payload: {} };
}
