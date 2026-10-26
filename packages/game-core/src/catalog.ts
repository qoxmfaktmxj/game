/** Browser-safe game catalogue. No private states, engines, or deck data. */
export const GAME_KEYS = [
  "star-trails",
  "workshop",
  "council",
  "signal",
  "garden",
] as const;
export type GameKey = (typeof GAME_KEYS)[number];
export interface GameMetadata<K extends GameKey = GameKey> {
  key: K;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  rulesVersion: string;
  contentVersion: string;
  schemaVersion: number;
  description: string;
  art: string;
  supportsResign: boolean;
}
export const GAME_CATALOG: { [K in GameKey]: GameMetadata<K> } = {
  "star-trails": {
    key: "star-trails",
    name: "로스트 팻츠",
    minPlayers: 2,
    maxPlayers: 2,
    rulesVersion: "1.0.0",
    contentVersion: "1.0.0",
    schemaVersion: 1,
    description: "다섯 별길에 쌓아 가는 두 사람의 탐험",
    art: "/art/club-lost-pets.png",
    supportsResign: true,
  },
  workshop: {
    key: "workshop",
    name: "와일드 스플렌더",
    minPlayers: 2,
    maxPlayers: 4,
    rulesVersion: "1.0.0",
    contentVersion: "1.0.0",
    schemaVersion: 1,
    description: "간식을 모으고 숲속 동물들과 함께하는 전략 게임",
    art: "/art/club-wild-splendor.png",
    supportsResign: false,
  },
  council: {
    key: "council",
    name: "밤의 의회",
    minPlayers: 2,
    maxPlayers: 7,
    rulesVersion: "1.0.0",
    contentVersion: "1.0.0",
    schemaVersion: 1,
    description: "역할을 고르고 나만의 도시를 세우는 게임",
    art: "/art/club-council.png",
    supportsResign: false,
  },
  signal: {
    key: "signal",
    name: "황혼의 신호",
    minPlayers: 4,
    maxPlayers: 7,
    rulesVersion: "1.0.0",
    contentVersion: "1.0.0",
    schemaVersion: 1,
    description: "정체를 숨긴 동료들과 펼치는 심리전",
    art: "/art/club-signal.png",
    supportsResign: false,
  },
  garden: {
    key: "garden",
    name: "넘버가든",
    minPlayers: 2,
    maxPlayers: 4,
    rulesVersion: "1.0.0",
    contentVersion: "1.0.0",
    schemaVersion: 1,
    description: "숫자 타일을 이어 만드는 우리만의 정원",
    art: "/art/club-garden.png",
    supportsResign: false,
  },
};
export const GAMES = GAME_KEYS.map((key) => GAME_CATALOG[key]);
export function isGameKey(value: unknown): value is GameKey {
  return typeof value === "string" && GAME_KEYS.some((key) => key === value);
}
export function gameMetadata(key: GameKey): GameMetadata {
  return GAME_CATALOG[key];
}
