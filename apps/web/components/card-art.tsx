import Image from "next/image";
import available from "../lib/card-art-ready.json";
import "./card-art.css";

const ready = new Set(available.map((item) => `${item.game}/${item.key}`));
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
  if (!ready.has(`${game}/${id}`)) return null;
  return (
    <span className="game-card-art" aria-hidden="true">
      <Image
        src={`/art/cards/${game}/${id}.png`}
        alt=""
        fill
        sizes={sizes}
        draggable={false}
      />
    </span>
  );
}
