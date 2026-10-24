export const SUITS = ["aurora", "ember", "tide", "moss", "dusk"] as const;
export const GAME_KEY = "star-trails" as const;
export const RULES_VERSION = "1.0.0" as const;
export const CONTENT_VERSION = "1.0.0" as const;

export type Suit = (typeof SUITS)[number];
export type PlayerIndex = 0 | 1;
export type Phase = "PLACE" | "DRAW" | "FINISHED";

export type Card =
  | {
      readonly id: string;
      readonly suit: Suit;
      readonly kind: "number";
      readonly value: number;
    }
  | {
      readonly id: string;
      readonly suit: Suit;
      readonly kind: "support";
      readonly value: null;
    };

export type CardDefinition =
  | {
      readonly suit: Suit;
      readonly kind: "number";
      readonly value: number;
      readonly copy: 0;
    }
  | {
      readonly suit: Suit;
      readonly kind: "support";
      readonly value: null;
      readonly copy: number;
    };

export type CardIdFactory = (definition: CardDefinition) => string;
export type RandomInt = (maxExclusive: number) => number;
export type Lanes = Record<Suit, Card[]>;

export type StarCommand =
  | { type: "STAR_PLAY"; payload: { cardId: string } }
  | { type: "STAR_DISCARD"; payload: { cardId: string } }
  | { type: "STAR_DRAW_DECK"; payload: Record<string, never> }
  | { type: "STAR_DRAW_DISCARD"; payload: { suit: Suit } };

/** Private server state. Send only a PlayerView to a connected client. */
export interface GameState {
  rulesVersion: typeof RULES_VERSION;
  version: number;
  playerIds: [string, string];
  activePlayerIndex: PlayerIndex;
  phase: Phase;
  hands: [Card[], Card[]];
  lanes: [Lanes, Lanes];
  discards: Lanes;
  deck: Card[];
  justDiscardedId: string | null;
}

export interface LaneScore {
  sum: number;
  cost: 0 | -20;
  supports: number;
  multiplier: number;
  bonus: 0 | 20;
  count: number;
  total: number;
}

export interface PlayerScore {
  playerId: string;
  lanes: Record<Suit, LaneScore>;
  total: number;
}

export interface GameResult {
  scores: [PlayerScore, PlayerScore];
  winners: string[];
  tied: boolean;
  reason: "DECK_EXHAUSTED";
}

export interface PublicPlayer {
  id: string;
  handCount: number;
  lanes: Lanes;
  score: PlayerScore;
}

export interface PlayerView {
  rulesVersion: typeof RULES_VERSION;
  version: number;
  phase: Phase;
  activePlayerId: string;
  you: string;
  deckCount: number;
  players: [PublicPlayer, PublicPlayer];
  yourHand: Card[];
  discards: Record<Suit, { count: number; top: Card | null }>;
  legalCommands: StarCommand[];
  result: GameResult | null;
}

export type RuleErrorCode =
  | "BAD_ID_FACTORY"
  | "RNG_REQUIRED"
  | "INVALID_RNG"
  | "CARD_COUNT"
  | "DUPLICATE_OR_BAD_ID"
  | "INVALID_SUIT"
  | "INVALID_VALUE"
  | "INVALID_SUPPORT_VALUE"
  | "INVALID_KIND"
  | "INVALID_DECK_DISTRIBUTION"
  | "INVALID_PLAYERS"
  | "INVALID_FIRST_PLAYER"
  | "INVALID_PLAYER"
  | "INVALID_LANE"
  | "NOT_FINISHED"
  | "GAME_FINISHED"
  | "NOT_MEMBER"
  | "NOT_YOUR_TURN"
  | "BAD_PAYLOAD"
  | "WRONG_PHASE"
  | "CARD_NOT_OWNED"
  | "SUPPORT_AFTER_NUMBER"
  | "LOWER_OR_EQUAL"
  | "EMPTY_DECK"
  | "EMPTY_DISCARD"
  | "JUST_DISCARDED"
  | "UNKNOWN_COMMAND"
  | "BAD_STATE"
  | "BAD_PLAYERS"
  | "BAD_PHASE"
  | "HAND_COUNT"
  | "LANE_SUIT"
  | "LANE_ORDER"
  | "LANE_SUPPORT_ORDER"
  | "DISCARD_SUIT"
  | "END_CONDITION"
  | "BAD_JUST_DISCARDED";
