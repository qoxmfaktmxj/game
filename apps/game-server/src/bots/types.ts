import type { InputCommand } from "@moyeotable/game-core/multigame";

export type BotRandom = (maxExclusive: number) => number;
export type BotCommand = InputCommand;
export interface Rated<T> {
  item: T;
  score: number;
}

/** Small bounded variation among near-best moves; neither search nor hidden information. */
export function pickRated<T>(
  candidates: Rated<T>[],
  randomInt: BotRandom,
  tolerance = 1.5,
): T | null {
  if (!candidates.length) return null;
  const ordered = [...candidates].sort((a, b) => b.score - a.score);
  const near = ordered
    .filter((candidate) => candidate.score >= ordered[0]!.score - tolerance)
    .slice(0, 3);
  return near[randomInt(near.length)]!.item;
}
export const action = (
  type: string,
  payload: Record<string, unknown> = {},
): BotCommand => ({ type, payload });
