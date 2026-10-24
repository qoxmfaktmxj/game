import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const plan = JSON.parse(
  readFileSync("docs/art/remaining-card-prompts.json", "utf8"),
) as { game: string; key: string; name: string; src: string }[];
const ready = plan.filter((item) => existsSync(`apps/web/public${item.src}`));
writeFileSync(
  "apps/web/lib/card-art-ready.json",
  JSON.stringify(
    ready.map(({ game, key, name, src }) => ({
      game,
      key,
      name: name.replace(
        /^(white|blue|green|red|black|coral|sky|leaf|violet)\b/,
        (color) =>
          ({
            white: "백광",
            blue: "청광",
            green: "녹광",
            red: "홍광",
            black: "흑광",
            coral: "산호",
            sky: "하늘",
            leaf: "초록",
            violet: "보라",
          } as Record<string, string>)[color] ?? color,
      ),
      src,
    })),
    null,
    2,
  ) + "\n",
);
const hashes = ready.map((item) =>
  createHash("sha256")
    .update(readFileSync(`apps/web/public${item.src}`))
    .digest("hex"),
);
console.log(
  JSON.stringify({
    ready: ready.length,
    total: plan.length,
    unique: new Set(hashes).size,
    missing: plan.length - ready.length,
  }),
);
if (new Set(hashes).size !== ready.length)
  throw new Error("Duplicate illustrations");
