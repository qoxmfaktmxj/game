import type { GameKey } from "@moyeotable/game-core/catalog";
import type { GameViewMap, GameResultMap, GameCommand, StarResultSummary } from "@moyeotable/game-core/multigame";

export type { GameKey, GameMetadata } from "@moyeotable/game-core/catalog";
export type { GameViewMap, GameResultMap, GameCommand } from "@moyeotable/game-core/multigame";

export type {
  Card,
  Suit,
  StarCommand,
  PlayerView,
  GameResult,
  PlayerScore,
} from "@moyeotable/game-core";
export const PROTOCOL_VERSION = 1 as const;
// 4001 is Colyseus SERVER_SHUTDOWN; keep guest expiry in an application code.
export const AUTH_EXPIRED_CLOSE_CODE = 4401 as const;
export interface UserIdentity {
  id: string;
  nickname: string;
}
export interface TableMember {
  userId: string;
  nickname: string;
  control: "human" | "bot";
  seat: number;
  ready: boolean;
  connected: boolean;
}
export interface TableView {
  id: string;
  title: string;
  hostId: string;
  status: "LOBBY" | "PLAYING" | "RESULT";
  revision: number;
  gameKey: GameKey;
  sessionId: string | null;
  members: TableMember[];
  createdAt: string;
}
export type ResultSummary = GameResultMap[GameKey];
export type StarResult = StarResultSummary;
export type RoomView<K extends GameKey = GameKey> = {
  [Key in K]: {
    protocolVersion: 1;
    gameKey: Key;
    table: TableView;
    game: GameViewMap[Key] | null;
    result: GameResultMap[Key] | null;
    paused: boolean;
  }
}[K];
export interface CommandAck {
  commandId: string;
  status: "accepted" | "duplicate";
  acceptedVersion?: number;
  revision?: number;
}
export interface CommandError {
  commandId?: string;
  code: string;
  message: string;
}
interface TableCommandBase {
  commandId: string;
  expectedRevision: number;
}
export type TableCommand = TableCommandBase & (
  | { type: "READY"; ready: boolean }
  | { type: "START" | "REMATCH" | "LEAVE" | "ADD_BOT" }
  | { type: "REMOVE_BOT"; userId: string }
  | { type: "SELECT_GAME"; gameKey: GameKey }
);
export type GameCommandEnvelope = GameCommand & {
  protocolVersion: 1;
  tableId: string;
  sessionId: string;
  commandId: string;
  expectedVersion: number;
};

export const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "로그인이 필요해요. 다시 연결해 주세요.",
  AUTH_UNAVAILABLE:
    "로그인 서버에 잠시 연결할 수 없어요. 잠시 뒤 다시 시도해 주세요.",
  NOT_MEMBER: "초대 링크로 테이블에 입장해 주세요.",
  NOT_HOST: "테이블을 만든 사람만 사용할 수 있어요.",
  NOT_BOT: "제거할 연습 봇을 선택해 주세요.",
  TABLE_FULL: "선택한 게임의 자리가 모두 찼어요.",
  INVITE_EXPIRED: "초대 링크가 만료되었어요. 새 링크를 받아 주세요.",
  VERSION_CONFLICT: "테이블이 바뀌었어요. 최신 화면에서 다시 선택해 주세요.",
  DUPLICATE_COMMAND_MISMATCH: "이미 사용한 명령 번호예요. 다시 선택해 주세요.",
  NOT_READY: "필요한 인원이 모이고 모두 준비하면 시작할 수 있어요.",
  NOT_YOUR_TURN: "친구의 차례예요.",
  WRONG_PHASE: "현재 단계에 맞는 행동을 선택해 주세요.",
  CARD_NOT_OWNED: "내 손에 있는 카드를 선택해 주세요.",
  LOWER_OR_EQUAL: "같은 길의 마지막 숫자보다 큰 카드를 놓아 주세요.",
  SUPPORT_AFTER_NUMBER: "지원 카드는 숫자 카드보다 먼저 놓아야 해요.",
  EMPTY_DISCARD: "이 버림 더미에는 카드가 없어요.",
  JUST_DISCARDED: "방금 버린 카드는 바로 가져올 수 없어요.",
  GAME_FINISHED: "이번 게임은 끝났어요. 다시 준비해 새 게임을 시작해요.",
  GAME_RUNNING: "진행 중인 게임을 먼저 마쳐 주세요.",
  PLAYER_DISCONNECTED: "친구가 다시 연결하면 게임을 이어갈 수 있어요.",
  GAME_CAPACITY: "이 게임의 정원보다 테이블에 있는 사람이 많아요.",
  INVALID_PLAYERS: "선택한 게임에 필요한 인원을 확인해 주세요.",
  UNSUPPORTED_ACTION: "이 게임에서는 사용할 수 없는 행동이에요.",
  INVALID_ACTION: "현재 규칙에 맞지 않는 선택이에요. 다른 행동을 골라 주세요.",
  TURN_EXPIRED: "이번 차례의 시간이 지났어요. 최신 화면을 확인해 주세요.",
  INVALID_MELD: "모든 타일이 올바른 묶음이나 연속 숫자를 이루어야 해요.",
  INITIAL_MELD: "첫 등록은 내 타일만으로 합계 30 이상을 만들어 주세요.",
  PLAY_RACK_TILE: "내 타일을 한 개 이상 내려놓아야 해요.",
  CARD_NOT_AVAILABLE: "이 카드는 더 이상 선택할 수 없어요.",
  TOKEN_RETURN: "보관 한도에 맞게 돌려줄 자원을 골라 주세요.",
  PATRON_NOT_ELIGIBLE: "선택한 후원자를 맞이할 조건이 부족해요.",
  TOKEN_SUPPLY: "공용 자원이 부족해요. 다른 조합을 골라 주세요.",
  TOKEN_SELECTION: "가져올 수 있는 자원 조합을 확인해 주세요.",
  RESERVE_LIMIT: "예약할 수 있는 작품 수를 모두 채웠어요.",
  EMPTY_DECK: "남은 카드가 없어요.",
  INVALID_PAYMENT: "작품 비용에 맞는 자원을 선택해 주세요.",
  INSUFFICIENT_TOKENS: "이 작품을 완성할 자원이 부족해요.",
  INVALID_TARGET: "이 행동의 대상으로 선택할 수 없어요.",
  OUT_OF_RANGE: "지금 사거리로는 닿지 않아요.",
  DUPLICATE_EQUIPMENT: "같은 장비를 이미 사용하고 있어요.",
  STRIKE_LIMIT: "이번 차례에 사용할 수 있는 광선을 모두 사용했어요.",
  EMPTY_HAND: "선택한 사람의 손패가 비어 있어요.",
  PLAYER_ELIMINATED: "이번 게임에서 이미 탈락한 참가자예요.",
  ABILITY_UNAVAILABLE: "지금은 이 능력을 사용할 수 없어요.",
  INVALID_RESPONSE: "현재 효과에 맞는 대응을 선택해 주세요.",
  RESCUE_UNAVAILABLE: "지금은 이 회복으로 위기를 벗어날 수 없어요.",
  BUILD_LIMIT: "이번 차례에 세울 수 있는 건물을 모두 세웠어요.",
  DUPLICATE_DISTRICT: "도시에 같은 건물을 두 개 세울 수 없어요.",
  INSUFFICIENT_GOLD: "금을 더 모은 뒤에 선택해 주세요.",
  DISTRICT_PROTECTED: "이 건물이나 도시는 철거할 수 없어요.",
  SAVE_FAILED: "저장이 완료되지 않았어요. 잠시 뒤 다시 시도해 주세요.",
  INVALID_INPUT: "입력 내용을 확인해 주세요.",
  TABLE_NOT_FOUND: "테이블을 찾지 못했어요.",
  RATE_LIMITED: "잠시 쉬었다가 다시 시도해 주세요.",
};
