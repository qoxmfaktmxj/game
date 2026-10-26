import Image from "next/image";
import available from "../lib/card-art-ready.json";
import "./card-art.css";

type Art = {
  src: string;
  atlas?: {
    columns: number;
    rows: number;
    column: number;
    row: number;
    crop?: { left: number; top: number; width: number; height: number };
  };
};
const ready = new Map<string, Art>(
  available.map((item) => [`${item.game}/${item.key}`, item]),
);
/** Only public content IDs enter this component; never full game state. */
export function CardArt({
  game,
  id,
  sizes = "(max-width: 760px) 150px, 220px",
}: {
  game: "workshop" | "council" | "signal" | "garden";
  id: string;
  sizes?: string;
}) {
  const art = ready.get(`${game}/${id}`);
  if (!art) return null;
  if (art.atlas) {
    const { columns, rows, column, row } = art.atlas;
    const crop = art.atlas.crop ?? {
      left: column / columns,
      top: row / rows,
      width: 1 / columns,
      height: 1 / rows,
    };
    return (
      <span className="game-card-art is-atlas" aria-hidden="true">
        <span
          className="card-art-atlas"
          style={{
            width: `${100 / crop.width}%`,
            height: `${100 / crop.height}%`,
            left: `${(-crop.left / crop.width) * 100}%`,
            top: `${(-crop.top / crop.height) * 100}%`,
          }}
        >
          <Image
            src={art.src}
            alt=""
            fill
            sizes={`${columns * 240}px`}
            draggable={false}
          />
        </span>
      </span>
    );
  }
  return (
    <span className="game-card-art" aria-hidden="true">
      <Image src={art.src} alt="" fill sizes={sizes} draggable={false} />
    </span>
  );
}
