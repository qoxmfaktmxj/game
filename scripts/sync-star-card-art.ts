import { readFileSync, writeFileSync } from "node:fs";
import selection from "../docs/art/sky-hop-final-selection.json";

// Keep the runtime table small: provenance and local generation paths stay in docs.
const families = Object.fromEntries(
  ["aurora", "ember", "tide", "moss", "dusk"].map((suit) => [suit, {}]),
) as Record<string, Record<string, { src: string; name: string }>>;
for (const asset of selection.assets) {
  readFileSync(asset.relativePath);
  families[asset.suit][asset.face] = { src: asset.url, name: asset.variant };
}
if (
  selection.assets.length !== 50 ||
  Object.values(families).some((family) => Object.keys(family).length !== 10)
)
  throw new Error("Expected 50 selected Star Trails illustrations");
writeFileSync(
  "apps/web/lib/star-card-art.ts",
  `// Generated from docs/art/sky-hop-final-selection.json by scripts/sync-star-card-art.ts.\n` +
    `import type { Card, Suit } from "@moyeotable/contracts";\n\n` +
    `type CardArt = { src: string; name: string };\n` +
    `export const starCardArt: Record<Suit, Record<string, CardArt>> = ${JSON.stringify(families, null, 2)};\n\n` +
    `export function getStarCardArt(card: Card): CardArt {\n` +
    `  return starCardArt[card.suit][card.kind === "support" ? "support" : card.value];\n}\n`,
);
console.log("Selected 50 Star Trails illustrations for runtime use.");
