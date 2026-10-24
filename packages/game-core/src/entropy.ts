/** Dependencies supplied by the server; engines never access ambient randomness or time. */
export interface Entropy {
  randomInt(maxExclusive: number): number;
  createId(): string;
  now(): number;
}
export interface InputCommand {
  type: string;
  payload: Record<string, unknown>;
}
export interface CommonGameResult {
  winners: string[];
  tied: boolean;
  reason: string;
  scores: { playerId: string; total: number }[];
}
