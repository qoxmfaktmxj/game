import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { WORKS, PATRONS } from "../packages/game-core/src/games/workshop";
import { DISTRICTS, ROLES } from "../packages/game-core/src/games/council";
import {
  CARD_INFO,
  CHARACTER_INFO,
} from "../packages/game-core/src/games/signal";
import ready from "../apps/web/lib/card-art-ready.json";
import selected from "../docs/art/sky-hop-final-selection.json";
import { getStarCardArt, starCardArt } from "../apps/web/lib/star-card-art";
import { SUITS } from "../packages/game-core/src/types";

test("Star Trails ships all 50 approved faces, including the gray Border Collie", () => {
  const hashes = new Set<string>();
  assert.equal(selected.assets.length, 50);
  for (const suit of SUITS) {
    assert.equal(Object.keys(starCardArt[suit]).length, 10);
    for (const face of [
      "support",
      ...Array.from({ length: 9 }, (_, i) => String(i + 2)),
    ]) {
      const asset = selected.assets.find(
        (item) => item.suit === suit && item.face === face,
      );
      assert.ok(asset, `${suit}-${face}`);
      const card =
        face === "support"
          ? { id: "art-check", suit, kind: "support" as const, value: null }
          : {
              id: "art-check",
              suit,
              kind: "number" as const,
              value: Number(face),
            };
      assert.equal(getStarCardArt(card).src, asset.url);
      const bytes = readFileSync(`apps/web/public${asset.url}`);
      assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
      assert.equal(bytes.readUInt32BE(16), 1024);
      assert.equal(bytes.readUInt32BE(20), 1536);
      const hash = createHash("sha256").update(bytes).digest("hex");
      assert.equal(hash, asset.sha256, asset.url);
      hashes.add(hash);
    }
  }
  assert.equal(hashes.size, 50);
  assert.equal(
    starCardArt.aurora[10].src,
    "/art/cards/sky-hop/aurora-10-v5.png",
  );
});

test("every public card type has its own valid, distinct original illustration", () => {
  const expected = [
    ...[...WORKS, ...PATRONS].map((c) => `workshop/${c.id}`),
    ...DISTRICTS.map((c) => `council/${c.kind}`),
    ...ROLES.map((c) => `council/role-${c.rank}`),
    ...Object.keys(CARD_INFO).map((key) => `signal/${key}`),
    ...Object.keys(CHARACTER_INFO).map((key) => `signal/character-${key}`),
    ...["captain", "ally", "raider", "drifter"].map(
      (key) => `signal/role-${key}`,
    ),
    ...["coral", "sky", "leaf", "violet"].flatMap((color) =>
      Array.from({ length: 13 }, (_, i) => `garden/${color}-${i + 1}`),
    ),
    "garden/joker",
  ];
  assert.equal(expected.length, 231);
  assert.deepEqual(
    ready.map((c) => `${c.game}/${c.key}`).sort(),
    expected.sort(),
  );
  const hashes = new Set<string>();
  for (const item of ready) {
    const bytes = readFileSync(`apps/web/public${item.src}`);
    assert.equal(
      bytes.subarray(0, 8).toString("hex"),
      "89504e470d0a1a0a",
      item.src,
    );
    const hash = createHash("sha256").update(bytes).digest("hex");
    if ("atlas" in item && item.atlas) {
      const { columns, rows, column, row } = item.atlas;
      assert.equal(item.game, "workshop");
      assert.ok(
        Number.isInteger(column) && column >= 0 && column < columns,
        item.key,
      );
      assert.ok(Number.isInteger(row) && row >= 0 && row < rows, item.key);
      const crop = "crop" in item.atlas ? item.atlas.crop : undefined;
      const width = bytes.readUInt32BE(16) * (crop?.width ?? 1 / columns);
      const height = bytes.readUInt32BE(20) * (crop?.height ?? 1 / rows);
      // At least 320px per card, above the largest 240px gallery viewport.
      assert.ok(width >= 320 && height >= 210, item.src);
      if (crop) {
        assert.ok(crop.left >= 0 && crop.top >= 0);
        assert.ok(crop.left + crop.width <= 1 && crop.top + crop.height <= 1);
      }
      assert.ok(Math.abs(width / height - 1.5) < 0.01, item.src);
      hashes.add(`${hash}:${column}:${row}`);
    } else {
      assert.equal(bytes.readUInt32BE(16), 1024, item.src);
      assert.equal(bytes.readUInt32BE(20), 1536, item.src);
      hashes.add(hash);
    }
  }
  assert.equal(hashes.size, expected.length);
});

test("Wild Splendor maps all 90 original card IDs to the correct animal and growth stage", () => {
  const families = {
    red: "dog",
    green: "cat",
    blue: "otter",
    white: "tiger",
    black: "capybara",
  };
  for (const work of WORKS) {
    const art = ready.find(
      (item) => item.game === "workshop" && item.key === work.id,
    );
    assert.ok(art);
    assert.equal(art.stage, work.level);
    assert.equal(
      art.src,
      `/art/cards/wild-splendor-cartoon/${families[work.bonus]}-${work.level}.png`,
    );
    assert.ok(art.name.startsWith(["", "아기", "청소년", "어른"][work.level]));
  }
  for (const patron of PATRONS) {
    const art = ready.find(
      (item) => item.game === "workshop" && item.key === patron.id,
    );
    assert.equal(art?.stage, 4);
    assert.equal(art?.src, "/art/cards/wild-splendor-cartoon/guardians.png");
  }
});
