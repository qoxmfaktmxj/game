import type { GameViewMap } from "@moyeotable/contracts";
import { action, pickRated, type BotCommand, type BotRandom } from "./types.js";

type View = GameViewMap["council"];
export function chooseCouncilCommand(
  view: View,
  randomInt: BotRandom,
): BotCommand | null {
  if (!view.legalActions.length || view.phase === "FINISHED") return null;
  const can = (type: string) => view.legalActions.includes(type);
  const me = view.players.find((player) => player.id === view.you)!;
  const others = view.players.filter((player) => player.id !== view.you);
  const duplicate = (kind: string) =>
    me.city.some((card) => card.kind === kind);
  const useful = view.yourHand.filter((card) => !duplicate(card.kind));
  const rateCard = (card: View["yourHand"][number]) =>
    duplicate(card.kind)
      ? -20
      : 8 -
        Math.max(0, card.cost - me.gold) * 1.2 +
        (me.city.some((built) => built.category === card.category) ? 0 : 2) +
        (view.endingRound !== null
          ? card.cost * 1.5
          : card.effect &&
              ["library", "school", "laboratory"].includes(card.effect)
            ? 2
            : 0) -
        card.cost * (me.city.length >= 6 ? 0.6 : 0.2);
  if (view.phase === "CROWN")
    return action("COUNCIL_CROWN", { playerId: view.you });
  if (view.phase === "DRAFT") {
    const income = (category: string) =>
      me.city.filter(
        (card) => card.category === category || card.effect === "school",
      ).length;
    const scores: Record<number, number> = {
      1: 3 + Math.max(0, ...others.map((p) => p.city.length - 5)),
      2: 3 + Math.max(0, ...others.map((p) => p.gold)) / 3,
      3:
        2 +
        (useful.length < 2 ? 3 : 0) +
        Math.max(0, ...others.map((p) => p.handCount - me.handCount)),
      4: 5 + income("gold") * 1.6,
      5: 3 + income("blue") * 1.6 + (me.city.length >= 6 ? 2 : 0),
      6: 6 + income("green") * 1.6 + (me.gold < 3 ? 2 : 0),
      7: 4 + (me.gold >= 5 ? 4 : 0) + (useful.length < 2 ? 2 : 0),
      8:
        2 +
        income("red") * 1.6 +
        (others.some((p) => p.city.length >= 6) ? 2 : 0),
    };
    const role = pickRated(
      view.draftChoices.map((rank) => ({ item: rank, score: scores[rank]! })),
      randomInt,
      1.8,
    )!;
    const discardRole = view.draftNeedsDiscard
      ? pickRated(
          view.draftChoices
            .filter((rank) => rank !== role)
            .map((rank) => ({
              item: rank,
              score: rank === 1 || rank === 8 ? 6 : scores[rank]! * 0.4,
            })),
          randomInt,
        )
      : null;
    return action("COUNCIL_DRAFT", {
      role,
      ...(discardRole !== null ? { discardRole } : {}),
    });
  }
  if (view.phase === "CHOOSE_CARDS") {
    const sorted = view.choice
      .map((card) => ({ card, score: rateCard(card) + randomInt(3) * 0.2 }))
      .sort((a, b) => b.score - a.score);
    return action("COUNCIL_KEEP", {
      cardIds: sorted.slice(0, view.keepCount).map(({ card }) => card.id),
    });
  }
  if (view.phase === "GRAVEYARD")
    return action("COUNCIL_RECOVER", {
      take:
        !!view.recovery && !duplicate(view.recovery.card.kind) && me.gold >= 1,
    });
  if (
    can("COUNCIL_POWER") &&
    (view.activeRole === 1 || view.activeRole === 2)
  ) {
    const ranks = [2, 3, 4, 5, 6, 7, 8].filter(
      (rank) =>
        !view.faceUpRoles.includes(rank) &&
        !view.yourRoles.includes(rank) &&
        (view.activeRole !== 2 || rank !== view.assassinatedRole),
    );
    const rank = pickRated(
      ranks.map((rank) => ({
        item: rank,
        score: (
          { 2: 1, 3: 2, 4: 4, 5: 2, 6: 4, 7: 5, 8: 3 } as Record<number, number>
        )[rank]!,
      })),
      randomInt,
      2,
    );
    if (rank !== null) return action("COUNCIL_POWER", { targetRole: rank });
  }
  if (can("COUNCIL_POWER") && view.activeRole === 3) {
    const richestHand = [...others].sort(
      (a, b) => b.handCount - a.handCount,
    )[0];
    if (
      richestHand &&
      richestHand.handCount >= me.handCount + 2 &&
      useful.length <= 2
    )
      return action("COUNCIL_POWER", {
        kind: "swap",
        targetPlayerId: richestHand.id,
      });
    const cycle = view.yourHand.filter(
      (card) =>
        duplicate(card.kind) || (card.cost > me.gold + 4 && useful.length >= 3),
    );
    if (cycle.length)
      return action("COUNCIL_POWER", {
        kind: "cycle",
        cardIds: cycle.map((card) => card.id),
      });
  }
  const incomeCategory = (
    { 4: "gold", 5: "blue", 6: "green", 8: "red" } as Record<number, string>
  )[view.activeRole];
  const affordable = useful.filter((card) => card.cost <= me.gold);
  // Building a matching district before collecting income pays for itself this turn.
  if (can("COUNCIL_BUILD") && can("COUNCIL_INCOME")) {
    const matching = affordable.filter(
      (card) => card.category === incomeCategory || card.effect === "school",
    );
    if (matching.length)
      return action("COUNCIL_BUILD", {
        cardId: pickRated(
          matching.map((card) => ({ item: card, score: rateCard(card) })),
          randomInt,
        )!.id,
      });
  }
  if (can("COUNCIL_INCOME")) return action("COUNCIL_INCOME");
  if (view.phase === "RESOURCE")
    return action("COUNCIL_RESOURCE", {
      kind:
        useful.length === 0 ||
        (me.gold >= 7 && useful.length <= 1 && view.deckCount > 0)
          ? "cards"
          : "gold",
    });
  if (can("COUNCIL_BUILD") && affordable.length)
    return action("COUNCIL_BUILD", {
      cardId: pickRated(
        affordable.map((card) => ({
          item: card,
          score: rateCard(card) + (me.city.length === 7 ? 20 : 0),
        })),
        randomInt,
      )!.id,
    });
  if (can("COUNCIL_LAB")) {
    const waste = view.yourHand.find((card) => duplicate(card.kind));
    if (waste) return action("COUNCIL_LAB", { cardId: waste.id });
  }
  if (
    can("COUNCIL_SMITHY") &&
    useful.length < 2 &&
    me.gold >= 4 &&
    view.deckCount > 0
  )
    return action("COUNCIL_SMITHY");
  if (can("COUNCIL_DESTROY")) {
    const candidates = others
      .filter(
        (p) =>
          p.city.length >= 4 &&
          p.city.length < 8 &&
          (view.assassinatedRole === 5 || !p.revealedRoles.includes(5)),
      )
      .flatMap((p) =>
        p.city
          .filter((card) => card.effect !== "keep")
          .map((card) => ({
            player: p,
            card,
            cost:
              card.cost -
              1 +
              Number(
                card.effect !== "wall" &&
                  p.city.some((built) => built.effect === "wall"),
              ),
          })),
      )
      .filter((candidate) => candidate.cost <= me.gold);
    const victim = pickRated(
      candidates.map((candidate) => ({
        item: candidate,
        score:
          candidate.player.city.length * 2 -
          candidate.cost +
          (candidate.card.effect ? 1 : 0),
      })),
      randomInt,
    );
    if (victim)
      return action("COUNCIL_DESTROY", {
        targetPlayerId: victim.player.id,
        cardId: victim.card.id,
      });
  }
  return can("COUNCIL_END") ? action("COUNCIL_END") : null;
}
