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
    assert.equal(bytes.readUInt32BE(16), 1024, item.src);
    assert.equal(bytes.readUInt32BE(20), 1536, item.src);
    hashes.add(createHash("sha256").update(bytes).digest("hex"));
  }
  assert.equal(hashes.size, expected.length);
});
