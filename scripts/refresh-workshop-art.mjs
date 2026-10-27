// Rebuild public presentation metadata from the verified card IDs, never game rules.
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const cards = JSON.parse(
  readFileSync("packages/game-core/src/games/workshop-cards.json", "utf8"),
);
const path = "apps/web/lib/card-art-ready.json";
const ready = JSON.parse(readFileSync(path, "utf8"));
const families = {
  red: {
    key: "dog",
    names: [
      "리트리버",
      "포메라니안",
      "비글",
      "코기",
      "진돗개",
      "셰퍼드",
      "보더콜리",
      "래브라도",
    ],
  },
  green: {
    key: "cat",
    names: [
      "치즈냥",
      "은빛 줄무늬냥",
      "삼색냥",
      "샴고양이",
      "벵갈냥",
      "까만 고양이",
      "하얀 장모냥",
      "회색 고양이",
    ],
  },
  blue: { key: "otter", names: Array(8).fill("수달") },
  white: {
    key: "tiger",
    names: [
      "벵골 호랑이",
      "시베리아 호랑이",
      "백호",
      "수마트라 호랑이",
      "벵골 호랑이",
      "시베리아 호랑이",
      "백호",
      "수마트라 호랑이",
    ],
  },
  black: { key: "capybara", names: Array(8).fill("카피바라") },
};
const scenes = {
  1: [
    "포근한 단잠",
    "둥지 밖 빼꼼",
    "기분 좋은 기지개",
    "포근한 낮잠",
    "나뭇잎 장난",
    "호기심 가득한 눈",
    "느긋한 하품",
    "작은 안식처",
  ],
  2: [
    "숲길 첫 모험",
    "통나무 건너기",
    "개울 탐험",
    "나비를 따라서",
    "언덕 오르기",
    "폭포 앞의 용기",
  ],
  3: ["능선의 파수꾼", "오래된 숲의 친구", "강줄기의 길잡이", "초록 숲의 주인"],
};
const guardians = [
  "현자의 부엉이",
  "산맥의 그리즐리",
  "하늘의 흰머리수리",
  "기억의 코끼리",
  "달빛의 회색늑대",
  "숲왕 사슴",
  "고요한 큰거북",
  "설원의 북극여우",
  "밀림의 고릴라",
  "눈산의 설표",
];
const counters = new Map();
const works = new Map(cards.map((card) => [card.id, card]));
for (const item of ready) {
  if (item.game !== "workshop") continue;
  const card = works.get(item.key);
  if (card) {
    const family = families[card.bonus];
    const group = `${family.key}-${card.level}`;
    const index = counters.get(group) ?? 0;
    counters.set(group, index + 1);
    const columns = 2;
    item.name = `${["", "아기", "청소년", "어른"][card.level]} ${family.names[index]} / ${scenes[card.level][index]}`;
    item.src = `/art/cards/wild-splendor-cartoon/${group}.png`;
    item.atlas = {
      columns,
      rows: { 1: 4, 2: 3, 3: 2 }[card.level],
      column: index % columns,
      row: Math.floor(index / columns),
    };
    item.stage = card.level;
  } else {
    const index = Number(item.key.slice(2)) - 1;
    if (!guardians[index]) throw new Error(`Unknown guardian ${item.key}`);
    item.name = guardians[index];
    item.src = "/art/cards/wild-splendor-cartoon/guardians.png";
    item.atlas = {
      columns: 2,
      rows: 5,
      column: index % 2,
      row: Math.floor(index / 2),
    };
    item.stage = 4;
  }
  const { width, height } = await sharp(
    `apps/web/public${item.src}`,
  ).metadata();
  const atlas = item.atlas;
  const rowBounds =
    item.stage === 4
      ? [0, 305 / 1619, 606 / 1619, 924 / 1619, 1240 / 1619, 1]
      : Array.from({ length: atlas.rows + 1 }, (_, i) => i / atlas.rows);
  const cellLeft = (atlas.column * width) / atlas.columns + 2;
  const cellTop = rowBounds[atlas.row] * height + 2;
  const cellWidth = width / atlas.columns - 4;
  const cellHeight =
    (rowBounds[atlas.row + 1] - rowBounds[atlas.row]) * height - 4;
  const cropWidth = Math.min(cellWidth, cellHeight * 1.5);
  const cropHeight = cropWidth / 1.5;
  atlas.crop = {
    left: (cellLeft + (cellWidth - cropWidth) / 2) / width,
    top: (cellTop + (cellHeight - cropHeight) / 2) / height,
    width: cropWidth / width,
    height: cropHeight / height,
  };
}
for (const [group, count] of counters) {
  if (count !== { 1: 8, 2: 6, 3: 4 }[group.at(-1)])
    throw new Error(`Unexpected group ${group}: ${count}`);
}
writeFileSync(path, `${JSON.stringify(ready, null, 2)}\n`);
console.log(
  `Updated ${cards.length} animal cards and ${guardians.length} guardians.`,
);
