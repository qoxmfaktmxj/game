import type { GameViewMap } from "@moyeotable/contracts";
import { action, pickRated, type BotCommand, type BotRandom } from "./types.js";

const colors = ["white", "blue", "green", "red", "black"] as const;
const tokens = [...colors, "gold"] as const;
type View = GameViewMap["workshop"];
type Work = View["market"][number][number];

export function chooseWorkshopCommand(
  view: View,
  randomInt: BotRandom,
): BotCommand | null {
  if (!view.legalActions.length || view.phase === "FINISHED") return null;
  const me = view.players.find((player) => player.id === view.you)!;
  const available = [...view.market.flat(), ...view.yourReserved];
  const cost = (work: Work) =>
    colors.reduce(
      (n, color) => n + Math.max(0, work.cost[color] - me.bonuses[color]),
      0,
    );
  const missing = (work: Work) =>
    colors.reduce(
      (n, color) =>
        n +
        Math.max(0, work.cost[color] - me.bonuses[color] - me.tokens[color]),
      0,
    );
  const patronValue = (work: Work) =>
    Math.max(
      0,
      ...view.patrons.map((patron) => {
        const left = colors.reduce(
          (n, color) => n + Math.max(0, patron.cost[color] - me.bonuses[color]),
          0,
        );
        return patron.cost[work.bonus] > me.bonuses[work.bonus]
          ? left === 1
            ? 9
            : 3 / Math.max(1, left)
          : 0;
      }),
    );
  const value = (work: Work) =>
    work.points * 3.2 +
    patronValue(work) +
    4 / (me.bonuses[work.bonus] + 1) -
    cost(work) * 0.25;
  if (view.phase === "PATRON")
    return action("WORKSHOP_PATRON", {
      patronId:
        view.eligiblePatronIds[randomInt(view.eligiblePatronIds.length)],
    });
  const target = pickRated(
    available.map((work) => ({
      item: work,
      score:
        value(work) * 0.35 - Math.max(0, missing(work) - me.tokens.gold) * 2,
    })),
    randomInt,
    0.8,
  );
  if (view.phase === "RETURN") {
    const returned = { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 };
    let excess = tokens.reduce((n, color) => n + me.tokens[color], 0) - 10;
    const keep = Object.fromEntries(
      colors.map((color) => [
        color,
        target ? Math.max(0, target.cost[color] - me.bonuses[color]) : 0,
      ]),
    ) as Record<(typeof colors)[number], number>;
    const stock = { ...me.tokens };
    while (excess > 0) {
      const color = pickRated(
        tokens
          .filter((color) => stock[color] > 0)
          .map((color) => ({
            item: color,
            score: color === "gold" ? -20 : stock[color] - keep[color],
          })),
        randomInt,
        0.3,
      )!;
      stock[color]--;
      returned[color]++;
      excess--;
    }
    return action("WORKSHOP_RETURN", { tokens: returned });
  }
  const affordable = available.filter(
    (work) => missing(work) <= me.tokens.gold,
  );
  if (affordable.length)
    return action("WORKSHOP_BUY", {
      cardId: pickRated(
        affordable.map((work) => ({
          item: work,
          score: value(work) + (me.points + work.points >= 15 ? 30 : 0),
        })),
        randomInt,
      )!.id,
    });
  // Occasionally protect a nearly affordable valuable card with a reservation.
  if (
    target &&
    me.reservedCount < 3 &&
    view.bank.gold > 0 &&
    view.market.flat().some((w) => w.id === target.id) &&
    missing(target) - me.tokens.gold <= 2 &&
    target.points >= 2 &&
    randomInt(5) === 0
  )
    return action("WORKSHOP_RESERVE", { cardId: target.id });
  const need = (color: (typeof colors)[number]) =>
    target ? target.cost[color] - me.bonuses[color] - me.tokens[color] : 0;
  const order = colors
    .filter((color) => view.bank[color] > 0)
    .sort((a, b) => need(b) - need(a));
  const first = order[0];
  if (first) {
    const take =
      view.bank[first] >= 4 &&
      need(first) >= 2 &&
      (order.length < 2 || need(order[1]!) <= 0)
        ? [first, first]
        : order.slice(0, 3);
    return action("WORKSHOP_TAKE", { colors: take });
  }
  const market = view.market.flat();
  if (me.reservedCount < 3 && market.length)
    return action("WORKSHOP_RESERVE", {
      cardId: pickRated(
        market.map((work) => ({
          item: work,
          score: value(work) - missing(work),
        })),
        randomInt,
      )!.id,
    });
  const level = view.deckCounts.findIndex((count) => count > 0);
  if (me.reservedCount < 3 && level >= 0)
    return action("WORKSHOP_RESERVE", { level: level + 1 });
  return null;
}
