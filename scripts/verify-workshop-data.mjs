// Read-only external numeric-data verification; never executes downloaded source.
// Original artwork, names and prose are deliberately excluded.
import { writeFile } from "node:fs/promises";
const urls = [
  "https://raw.githubusercontent.com/anicolao/splendor/HEAD/data/verified_card_properties.csv",
  "https://raw.githubusercontent.com/bouk/splendimax/HEAD/Splendor%20Cards.csv",
  "https://raw.githubusercontent.com/seal256/splendor/HEAD/assets/cards.csv",
];
const colors = ["white", "blue", "green", "red", "black"];
const aliases = { w: "white", b: "blue", g: "green", r: "red", k: "black" };
const csv = (text) => {
  const [header, ...lines] = text
    .trim()
    .split(/\r?\n/)
    .map((l) => l.split(","));
  return lines.map((row) =>
    Object.fromEntries(header.map((k, i) => [k, row[i]])),
  );
};
const fetched = await Promise.all(
  urls.map(async (u) => {
    const r = await fetch(u);
    if (!r.ok) throw Error(`Fetch failed ${r.status}`);
    return csv(await r.text());
  }),
);
const datasets = fetched.map((rows, i) =>
  rows.map((r) =>
    i === 0
      ? {
          level: Number(r.id.split("-")[1].slice(1)),
          bonus: r.id.split("-")[0],
          points: Number(r.prestige_points),
          cost: colors.map((c) => Number(r[c])),
        }
      : i === 1
        ? {
            level: Number(r.Level),
            bonus: r.Color.toLowerCase(),
            points: Number(r.PV),
            cost: colors.map((c) => Number(r[c[0].toUpperCase() + c.slice(1)])),
          }
        : {
            level: Number(r.level),
            bonus: aliases[r.gem],
            points: Number(r.points),
            cost: colors.map((c) =>
              Number(
                r[Object.keys(aliases).find((a) => aliases[a] === c)] || 0,
              ),
            ),
          },
  ),
);
const normalize = (rows) => rows.map((r) => JSON.stringify(r)).sort();
if (datasets.some((rows) => rows.length !== 90))
  throw Error("Expected 90 cards per source");
if (
  datasets
    .slice(1)
    .some(
      (rows) =>
        JSON.stringify(normalize(rows)) !==
        JSON.stringify(normalize(datasets[0])),
    )
)
  throw Error("Card data disagree; inspect differences before writing");
const cards = datasets[0].map((row, i) => ({
  id: `w-${i + 1}`,
  level: row.level,
  bonus: row.bonus,
  points: row.points,
  cost: Object.fromEntries(colors.map((c, j) => [c, row.cost[j]])),
}));
await writeFile(
  new URL(
    "../packages/game-core/src/games/workshop-cards.json",
    import.meta.url,
  ),
  JSON.stringify(cards, null, 2) + "\n",
);
console.log(
  "All 90 cards match in three independent numeric datasets (40/30/20).",
);
