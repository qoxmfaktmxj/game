import available from "./card-art-ready.json";

/** Presentation only: original resource keys and server rules stay unchanged. */
export const workshopResources = {
  white: { name: "꿀단지", short: "꿀", animal: "호랑이", column: 1, row: 1 },
  blue: { name: "연어", short: "연", animal: "수달", column: 1, row: 0 },
  green: { name: "캣닢", short: "캣", animal: "고양이", column: 2, row: 0 },
  red: { name: "생고기", short: "고", animal: "강아지", column: 0, row: 0 },
  black: { name: "도토리", short: "도", animal: "카피바라", column: 0, row: 1 },
  gold: { name: "황금 뼈다귀", short: "금", animal: null, column: 2, row: 1 },
} as const;

export const workshopStages: Record<number, string> = {
  1: "아기",
  2: "청소년",
  3: "어른",
};

const names = new Map(
  available
    .filter((item) => item.game === "workshop")
    .map((item) => [item.key, item.name]),
);
export function workshopCardName(id: string): string {
  return names.get(id) ?? "숲속 친구";
}
