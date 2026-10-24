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
