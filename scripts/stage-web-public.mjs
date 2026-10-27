import { readFile, mkdir, copyFile, rm } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "apps/web/public");
const target = resolve(root, "apps/web/.web-public");
const manifest = JSON.parse(
  await readFile(resolve(root, "apps/web/lib/web-assets.json"), "utf8"),
);
const fonts = JSON.parse(
  await readFile(resolve(source, "fonts/subsets/manifest.json"), "utf8"),
);
const allowed = new Set([
  ...Object.values(manifest).map((asset) => asset.src.slice(1)),
  "fonts/fonts.css",
  "fonts/Pretendard-LICENSE.txt",
  ...fonts.files.map((file) => `fonts/subsets/${file}`),
]);
// Only this fixed generated directory is replaced; original artwork stays intact.
await rm(target, { recursive: true, force: true });
let bytes = 0;
for (const path of allowed) {
  const data = await readFile(resolve(source, path));
  bytes += data.length;
  await mkdir(dirname(resolve(target, path)), { recursive: true });
  await copyFile(resolve(source, path), resolve(target, path));
}
console.log(
  `배포 public: ${allowed.size}개, ${(bytes / 1024 / 1024).toFixed(2)} MiB. 원본 PNG와 이전 아트 제외.`,
);
