import Image from "next/image";
import { webAssets } from "../lib/web-assets";
import "./card-art.css";

export function CardArt({
  game,
  id,
  sizes = "(max-width: 760px) 150px, 220px",
}: {
  game: "workshop" | "council" | "signal" | "garden";
  id: string;
  sizes?: string;
}) {
  const art = webAssets[`${game}/${id}`];
  if (!art) return null;
  return (
    <span className="game-card-art" aria-hidden="true">
      <Image
        src={art.src}
        alt=""
        fill
        sizes={sizes}
        quality={85}
        draggable={false}
      />
    </span>
  );
}
