import type { GameKey, GameViewMap } from "@moyeotable/contracts";
import type { BotCommand, BotRandom } from "./types.js";
import { chooseStarCommand } from "./star-trails.js";
import { chooseWorkshopCommand } from "./workshop.js";
import { chooseCouncilCommand } from "./council.js";
import { chooseSignalCommand } from "./signal.js";
import { chooseGardenCommand } from "./garden.js";

export type { BotCommand, BotRandom } from "./types.js";
/** Medium-strength heuristics. This boundary accepts player projections, never snapshots. */
export function chooseBotCommand(
  gameKey: GameKey,
  view: GameViewMap[GameKey],
  randomInt: BotRandom,
): BotCommand | null {
  switch (gameKey) {
    case "star-trails":
      return chooseStarCommand(view as GameViewMap["star-trails"], randomInt);
    case "workshop":
      return chooseWorkshopCommand(view as GameViewMap["workshop"], randomInt);
    case "council":
      return chooseCouncilCommand(view as GameViewMap["council"], randomInt);
    case "signal":
      return chooseSignalCommand(view as GameViewMap["signal"], randomInt);
    case "garden":
      return chooseGardenCommand(view as GameViewMap["garden"], randomInt);
  }
}
