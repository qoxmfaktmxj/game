import type { GameViewMap } from "@moyeotable/contracts";
import type { InputCommand } from "@moyeotable/game-core/multigame";

type View = GameViewMap["garden"];
type Tile = View["board"][number][number];
type Color = NonNullable<Tile["color"]>;
type Face = { color: Color; value: number };
type Candidate = {
  used: bigint;
  rows: bigint;
  changes: { index: number; tiles: Tile[] }[];
  additions: Tile[][];
  points: number;
  score: number;
};
const colors: Color[] = ["coral", "sky", "leaf", "violet"];
const limits = { candidates: 600, beam: 20, depth: 12, expansions: 60_000 };
const face = (tile: Tile): Face => ({
  color: (tile.color ?? tile.jokerColor)!,
  value: (tile.value ?? tile.jokerValue)!,
});
const points = (tiles: Tile[]) =>
  tiles.reduce((sum, tile) => sum + face(tile).value, 0);

/** A handful of duplicate/joker allocations keeps the search bounded, not omniscient. */
function assign(faces: Face[], tiles: Tile[]): Tile[][] {
  const result: Tile[][] = [];
  const seen = new Set<string>();
  const jokers = tiles.filter((tile) => tile.value === null);
  const forced = jokers.length ? [-1, ...faces.map((_, index) => index)] : [-1];
  for (const forceJoker of forced) {
    for (let variant = 0; variant < 4; variant++) {
      const used = new Set<string>();
      const row: Tile[] = [];
      for (let index = 0; index < faces.length; index++) {
        const target = faces[index];
        const matching = tiles.filter(
          (tile) =>
            !used.has(tile.id) &&
            tile.color === target.color &&
            tile.value === target.value,
        );
        const flip = (variant >> (index % 2)) & 1;
        let chosen =
          index === forceJoker
            ? undefined
            : matching[flip % Math.max(1, matching.length)];
        if (!chosen) {
          const remaining = jokers.filter((tile) => !used.has(tile.id));
          const joker = remaining[flip % Math.max(1, remaining.length)];
          if (joker)
            chosen = {
              ...joker,
              jokerColor: target.color,
              jokerValue: target.value,
            };
        }
        if (!chosen) break;
        used.add(chosen.id);
        row.push(chosen);
      }
      if (row.length !== faces.length) continue;
      const key = row
        .map(
          (tile) =>
            `${tile.id}:${tile.jokerColor ?? ""}:${tile.jokerValue ?? ""}`,
        )
        .join("|");
      if (!seen.has(key)) {
        seen.add(key);
        result.push(row);
      }
    }
  }
  return result;
}

function rackMelds(tiles: Tile[]): Tile[][] {
  const rows: Tile[][] = [];
  const jokerCount = tiles.filter((tile) => tile.value === null).length;
  const available = new Set(
    tiles
      .filter((tile) => tile.value !== null)
      .map((tile) => `${tile.color}:${tile.value}`),
  );
  const offer = (faces: Face[]) => {
    if (faces.length > tiles.length) return;
    if (
      faces.filter(
        (target) => !available.has(`${target.color}:${target.value}`),
      ).length > jokerCount
    )
      return;
    rows.push(...assign(faces, tiles));
  };
  for (let value = 1; value <= 13; value++) {
    for (let omitted = -1; omitted < colors.length; omitted++) {
      offer(
        colors
          .filter((_, index) => index !== omitted)
          .map((color) => ({ color, value })),
      );
    }
  }
  for (const color of colors) {
    for (let start = 1; start <= 11; start++) {
      for (let end = start + 2; end <= 13; end++) {
        offer(
          Array.from({ length: end - start + 1 }, (_, index) => ({
            color,
            value: start + index,
          })),
        );
      }
    }
  }
  return rows;
}

function extensions(row: Tile[], rack: Tile[]): Tile[][] {
  const faces = row.map(face);
  const result: Tile[][] = [];
  if (faces.every((tile) => tile.value === faces[0].value)) {
    if (row.length === 3) {
      const missing = colors.find(
        (color) => !faces.some((tile) => tile.color === color),
      );
      if (missing) {
        for (const addition of assign(
          [{ color: missing, value: faces[0].value }],
          rack,
        ))
          result.push([...row, ...addition]);
      }
    }
    return result;
  }
  const sorted = [...row].sort((a, b) => face(a).value - face(b).value);
  const first = face(sorted[0]),
    last = face(sorted[sorted.length - 1]);
  for (let start = 1; start <= first.value; start++) {
    for (let end = last.value; end <= 13; end++) {
      if (start === first.value && end === last.value) continue;
      const needed: Face[] = [];
      for (let value = start; value < first.value; value++)
        needed.push({ color: first.color, value });
      for (let value = last.value + 1; value <= end; value++)
        needed.push({ color: first.color, value });
      if (needed.length > rack.length) continue;
      for (const addition of assign(needed, rack))
        result.push(
          [...sorted, ...addition].sort(
            (a, b) => face(a).value - face(b).value,
          ),
        );
    }
  }
  return result;
}

function removableJoker(row: Tile[], joker: Tile): boolean {
  if (row.length < 4) return false;
  const remaining = row.filter((tile) => tile.id !== joker.id).map(face);
  if (remaining.every((tile) => tile.value === remaining[0].value)) return true;
  const sorted = remaining.sort((a, b) => a.value - b.value);
  return sorted.every(
    (tile, index) =>
      tile.color === sorted[0].color && tile.value === sorted[0].value + index,
  );
}

/** Uses only this player's rack, public board and public legal-action list. */
export function chooseGardenCommand(
  view: View,
  randomInt: (maxExclusive: number) => number,
): InputCommand | null {
  if (
    view.phase !== "PLAY" ||
    view.you !== view.activePlayerId ||
    !view.legalActions.length ||
    view.remainingMs !== null
  )
    return null;
  const opened = view.players.find((player) => player.id === view.you)?.opened;
  const rack = view.yourRack;
  const bits = new Map(
    rack.map((tile, index) => [tile.id, 1n << BigInt(index)]),
  );
  const mask = (tiles: Tile[]) =>
    tiles.reduce((value, tile) => value | (bits.get(tile.id) ?? 0n), 0n);
  const candidates = new Map<string, Candidate>();
  const offer = (
    changes: Candidate["changes"],
    additions: Tile[][],
    added: Tile[],
  ) => {
    const own = added.filter((tile) => bits.has(tile.id));
    const used = mask(own);
    if (!used) return;
    const rows = changes.reduce(
      (value, change) => value | (1n << BigInt(change.index)),
      0n,
    );
    const value = points(additions.flat());
    const score =
      own.length * 100 +
      own.reduce((sum, tile) => sum + (tile.value ?? 30), 0) +
      randomInt(5);
    const candidate: Candidate = {
      used,
      rows,
      changes,
      additions,
      points: value,
      score,
    };
    const key = `${used}/${rows}`;
    const existing = candidates.get(key);
    // Same consumed tiles/rows cannot combine differently later in this bounded plan.
    // Before opening, prefer the joker assignment that reaches the 30-point threshold.
    if (
      !existing ||
      (!opened && value > existing.points) ||
      (value === existing.points && score > existing.score)
    )
      candidates.set(key, candidate);
  };
  if (view.legalActions.includes("GARDEN_PLAY")) {
    for (const row of rackMelds(rack)) offer([], [row], row);
    if (opened) {
      for (let index = 0; index < view.board.length; index++) {
        const original = view.board[index];
        for (const row of extensions(original, rack))
          offer(
            [{ index, tiles: row }],
            [],
            row.filter((tile) => bits.has(tile.id)),
          );
        for (const joker of original.filter((tile) => tile.value === null)) {
          const represented = face(joker);
          const replacements: (Tile | null)[] = rack.filter(
            (tile) =>
              tile.color === represented.color &&
              tile.value === represented.value,
          );
          if (removableJoker(original, joker)) replacements.push(null);
          for (const replacement of replacements) {
            const source = rack.filter((tile) => tile.id !== replacement?.id);
            const available = [
              ...source,
              { id: joker.id, color: null, value: null },
            ];
            for (const row of rackMelds(available).filter((meld) =>
              meld.some((tile) => tile.id === joker.id),
            )) {
              const repaired = original.flatMap((tile) =>
                tile.id === joker.id
                  ? replacement
                    ? [replacement]
                    : []
                  : [tile],
              );
              offer(
                [{ index, tiles: repaired }],
                [row],
                [...row, ...(replacement ? [replacement] : [])],
              );
            }
          }
        }
      }
    }
  }
  const choices = [...candidates.values()]
    .sort((a, b) => b.score - a.score || b.points - a.points)
    .slice(0, limits.candidates);
  type Plan = {
    used: bigint;
    rows: bigint;
    points: number;
    score: number;
    picks: Candidate[];
  };
  let beam: Plan[] = [{ used: 0n, rows: 0n, points: 0, score: 0, picks: [] }];
  let best: Plan | null = null;
  let expansions = 0;
  for (
    let depth = 0;
    depth < limits.depth && beam.length && expansions < limits.expansions;
    depth++
  ) {
    const next = new Map<string, Plan>();
    for (const plan of beam) {
      for (const candidate of choices) {
        if (++expansions > limits.expansions) break;
        if (plan.used & candidate.used || plan.rows & candidate.rows) continue;
        const combined: Plan = {
          used: plan.used | candidate.used,
          rows: plan.rows | candidate.rows,
          points: plan.points + candidate.points,
          score: plan.score + candidate.score,
          picks: [...plan.picks, candidate],
        };
        if (
          (opened || combined.points >= 30) &&
          (!best || combined.score > best.score)
        )
          best = combined;
        const key = `${combined.used}/${combined.rows}`;
        const old = next.get(key);
        if (
          !old ||
          combined.score > old.score ||
          (!opened && combined.points > old.points)
        )
          next.set(key, combined);
      }
    }
    beam = [...next.values()]
      .sort((a, b) => b.score - a.score || b.points - a.points)
      .slice(0, limits.beam);
  }
  if (best) {
    const board = view.board.map((row) => [...row]);
    for (const candidate of best.picks) {
      for (const change of candidate.changes)
        board[change.index] = change.tiles;
      board.push(...candidate.additions);
    }
    return {
      type: "GARDEN_PLAY",
      payload: {
        board: board.map((row) =>
          row.map((tile) => ({
            id: tile.id,
            ...(tile.value === null
              ? { jokerColor: tile.jokerColor, jokerValue: tile.jokerValue }
              : {}),
          })),
        ),
      },
    };
  }
  return view.legalActions.includes("GARDEN_DRAW")
    ? { type: "GARDEN_DRAW", payload: {} }
    : null;
}
