import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import ready from "../apps/web/lib/card-art-ready.json";
import selected from "../docs/art/sky-hop-final-selection.json";
import { GAME_CATALOG } from "../packages/game-core/src/catalog";
import { webAssets } from "../apps/web/lib/web-assets";

test("웹용 이미지가 확정 281면, 표지 5개, 간식 6개를 모두 포함한다", async () => {
  const keys = [
    ...["red", "blue", "green", "black", "white", "gold"].map(
      (token) => `workshop-token/${token}`,
    ),
    ...ready.map((item) => `${item.game}/${item.key}`),
    ...selected.assets.map((asset) => asset.url),
    ...Object.values(GAME_CATALOG).map((game) => game.art),
  ];
  assert.deepEqual(Object.keys(webAssets).sort(), keys.sort());
  for (const key of keys) {
    const asset = webAssets[key];
    const bytes = await readFile(`apps/web/public${asset.src}`);
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.format, "webp", key);
    assert.equal(metadata.width, asset.width, key);
    assert.equal(metadata.height, asset.height, key);
    assert.equal(bytes.length, asset.bytes, key);
    assert.ok(
      asset.width >= (key.startsWith("workshop-token/") ? 192 : 320),
      key,
    );
  }
});

test("배포 public은 현재 웹용 이미지와 글꼴만 포함하고 원본을 노출하지 않는다", async () => {
  execFileSync(process.execPath, ["scripts/stage-web-public.mjs"]);
  const root = "apps/web/.web-public";
  const files = (
    await readdir(root, { recursive: true, withFileTypes: true })
  ).filter((entry) => entry.isFile());
  assert.equal(
    files.filter((entry) => entry.name.endsWith(".webp")).length,
    292,
  );
  assert.ok(files.every((entry) => !/\.(png|jpg|jpeg)$/i.test(entry.name)));
  assert.ok(
    files.every(
      (entry) =>
        !entry.name.startsWith("Gowun") &&
        entry.name !== "PretendardVariable.woff2",
    ),
  );
  const css = await readFile(`${root}/fonts/fonts.css`, "utf8");
  for (const match of css.matchAll(/url\('\.\/([^']+)'\)/g)) {
    assert.ok((await readFile(`${root}/fonts/${match[1]}`)).length > 0);
  }
  const fonts = JSON.parse(
    await readFile("apps/web/public/fonts/subsets/manifest.json", "utf8"),
  );
  assert.equal(fonts.codepoints, 14336);
  assert.ok(fonts.commonBytes < 180_000);
});
