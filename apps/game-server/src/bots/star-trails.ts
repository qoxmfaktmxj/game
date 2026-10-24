import type { GameViewMap, Card } from "@moyeotable/contracts";
import { pickRated, type BotCommand, type BotRandom } from "./types.js";

type View = GameViewMap["star-trails"];
/** Develop promising lanes in order, and avoid financing an opponent's public lane. */
export function chooseStarCommand(
  view: View,
  randomInt: BotRandom,
): BotCommand | null {
  if (view.phase === "FINISHED" || !view.legalCommands.length) return null;
  const me = view.players.find((player) => player.id === view.you)!;
  const opponent = view.players.find((player) => player.id !== view.you)!;
  const usefulness = (card: Card) => {
    const lane = me.lanes[card.suit],
      hand = view.yourHand.filter((c) => c.suit === card.suit);
    const last = lane.filter((c) => c.kind === "number").at(-1)?.value ?? 0;
    const future = hand.filter((c) => c.kind === "number" && c.value > last);
    const potential = future.reduce((sum, c) => sum + (c.value ?? 0), 0);
    if (card.kind === "support")
      return last ? -12 : (potential - 20) * 0.6 + (lane.length ? 4 : 0);
    if (card.value <= last) return -15;
    if (!lane.length)
      return potential >= 20
        ? 5 + potential / 8 - card.value / 3
        : potential / 3 - 9;
    const skipped = future
      .filter((c) => c.kind === "number" && c.value < card.value)
      .reduce((sum, c) => sum + (c.value ?? 0), 0);
    return 9 + card.value * 0.6 - skipped * 1.5 + (lane.length >= 5 ? 2 : 0);
  };
  const rated = view.legalCommands.map((command) => {
    if (command.type === "STAR_DRAW_DECK")
      return { item: command, score: 3 + (view.deckCount <= 5 ? 1 : 0) };
    if (command.type === "STAR_DRAW_DISCARD") {
      const card = view.discards[command.payload.suit].top!;
      // Taking only clear improvements prevents cycling unwanted discards forever.
      return { item: command, score: usefulness(card) - 4 };
    }
    const card = view.yourHand.find((c) => c.id === command.payload.cardId)!;
    const own = usefulness(card);
    if (command.type === "STAR_PLAY") return { item: command, score: own };
    const enemyLane = opponent.lanes[card.suit];
    const enemyLast =
      enemyLane.filter((c) => c.kind === "number").at(-1)?.value ?? 0;
    const feedsEnemy =
      enemyLane.length &&
      (card.kind === "support" ? !enemyLast : card.value > enemyLast);
    return { item: command, score: 1 - own * 0.7 - (feedsEnemy ? 4 : 0) };
  });
  return pickRated<BotCommand>(rated, randomInt, 0.8);
}
