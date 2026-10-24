/** Contracts proposal. Integrate and type-check in the real TypeScript workspace. */
export type UserId = string;
export type SessionId = string;
export type Suit = 'aurora' | 'ember' | 'tide' | 'moss' | 'dusk';
export type Card =
  | { readonly id: string; readonly suit: Suit; readonly kind: 'number'; readonly value: number }
  | { readonly id: string; readonly suit: Suit; readonly kind: 'support'; readonly value: null };
export type StarCommand =
  | { type: 'STAR_PLAY' | 'STAR_DISCARD'; payload: { cardId: string } }
  | { type: 'STAR_DRAW_DECK'; payload: Record<string, never> }
  | { type: 'STAR_DRAW_DISCARD'; payload: { suit: Suit } };
export type CommandEnvelope<T extends { type: string; payload: unknown }> = {
  protocolVersion: 1;
  tableId: string;
  sessionId: SessionId;
  commandId: string;
  expectedVersion: number;
} & T; // Same flattened type/payload layout as command.schema.json.
export interface AuthenticatedActor {
  readonly userId: UserId; // From verified connection, never client payload.
  readonly tableId: string;
}
export type RuleCheck = { ok: true } | { ok: false; code: string };
export interface RuleContext {
  readonly serverNowMs: number;
  readonly randomInt: (maxExclusive: number) => number;
  readonly opaqueId: () => string;
}
export interface GameModule<S, C, V, R, O> {
  readonly key: string;
  readonly rulesVersion: string;
  readonly supportedPlayers: readonly number[];
  createInitialState(players: readonly UserId[], options: O, ctx: RuleContext): S;
  validateCommand(state: Readonly<S>, actor: UserId, command: C): RuleCheck;
  applyCommand(state: Readonly<S>, actor: UserId, command: C, ctx: RuleContext): S;
  toPlayerView(state: Readonly<S>, viewer: UserId): V;
  isFinished(state: Readonly<S>): boolean;
  getResult(state: Readonly<S>): R;
  assertInvariants(state: Readonly<S>): void;
}
// The core must NOT assume only the turn owner can act: later games have responders.
export interface TurnContext {
  activeTurnPlayer: UserId;
  allowedResponders: readonly UserId[];
  phase: string;
  deadlineAt: number | null;
}
export type CommandReply =
  | { commandId: string; status: 'ACCEPTED'; acceptedVersion: number }
  | { commandId: string; status: 'REJECTED'; code: string; currentVersion?: number };
