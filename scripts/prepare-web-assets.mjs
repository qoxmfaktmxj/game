import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = resolve(root, "apps/web/public");
const json = async (path) =>
  JSON.parse(await readFile(resolve(root, path), "utf8"));
const ready = await json("apps/web/lib/card-art-ready.json");
const selected = await json("docs/art/sky-hop-final-selection.json");
const catalog = await readFile(
  resolve(root, "packages/game-core/src/catalog.ts"),
  "utf8",
);
const entries = [
  ...["red", "blue", "green", "black", "white", "gold"].map((token, index) => ({
    key: `workshop-token/${token}`,
    src: "/art/cards/wild-splendor-cartoon/resources.png",
    maxWidth: 192,
    atlas: {
      columns: 3,
      rows: 2,
      column: index % 3,
      row: Math.floor(index / 3),
    },
  })),
  ...ready.map((item) => ({
    ...item,
    key: `${item.game}/${item.key}`,
    maxWidth: 768,
  })),
  ...selected.assets.map((item) => ({
    key: item.url,
    src: item.url,
    maxWidth: 768,
  })),
  ...[...catalog.matchAll(/art: "([^"]+)"/g)].map((match) => ({
    key: match[1],
    src: match[1],
    maxWidth: 1280,
  })),
];
const manifest = {};
await mkdir(resolve(publicDir, "optimized"), { recursive: true });
for (const item of entries) {
  const source = await readFile(resolve(publicDir, `.${item.src}`));
  const digest = createHash("sha256")
    .update(source)
    .update(JSON.stringify([item.atlas, item.maxWidth, 90]))
    .digest("hex")
    .slice(0, 16);
  const name = `${item.key
    .replace(/^\/art\//, "")
    .replace(/\.[^.]+$/, "")
    .replaceAll("/", "-")}-${digest}.webp`;
  let pipeline = sharp(source);
  if (item.atlas) {
    const { width, height } = await pipeline.metadata();
    const a = item.atlas;
    const crop = a.crop ?? {
      left: a.column / a.columns,
      top: a.row / a.rows,
      width: 1 / a.columns,
      height: 1 / a.rows,
    };
    const left = Math.round(crop.left * width);
    const top = Math.round(crop.top * height);
    pipeline = pipeline.extract({
      left,
      top,
      width: Math.min(width - left, Math.round(crop.width * width)),
      height: Math.min(height - top, Math.round(crop.height * height)),
    });
  }
  const output = await pipeline
    .resize({ width: item.maxWidth, withoutEnlargement: true })
    .webp({ quality: 90, effort: 6 })
    .toBuffer({ resolveWithObject: true });
  await writeFile(resolve(publicDir, "optimized", name), output.data);
  manifest[item.key] = {
    src: `/optimized/${name}`,
    width: output.info.width,
    height: output.info.height,
    bytes: output.data.length,
  };
}
await writeFile(
  resolve(root, "apps/web/lib/web-assets.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  `웹용 이미지 ${entries.length}개, ${(Object.values(manifest).reduce((n, a) => n + a.bytes, 0) / 1024 / 1024).toFixed(2)} MiB`,
);
