import available from "./card-art-ready.json";

/** Presentation only: original resource keys and server rules stay unchanged. */
export const workshopResources = {
  white: { name: "꿀단지", animal: "호랑이" },
  blue: { name: "연어", animal: "수달" },
  green: { name: "캣닢", animal: "고양이" },
  red: { name: "생고기", animal: "강아지" },
  black: { name: "도토리", animal: "카피바라" },
  gold: { name: "황금 뼈다귀", animal: null },
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
  return (names.get(id) ?? "숲속 친구").replaceAll("\u00b7", "/");
}
