import Link from "next/link";
import { GAME_CATALOG } from "@moyeotable/game-core/catalog";
export const artGames = {
  workshop: GAME_CATALOG.workshop.name,
  council: "밤의 의회",
  signal: "황혼의 신호",
  garden: "넘버가든",
};
export function CardGalleryNav({
  current = "star-trails",
}: {
  current?: string;
}) {
  return (
    <nav className="card-game-nav" aria-label="게임별 카드 그림">
      <Link
        href="/cards"
        aria-current={current === "star-trails" ? "page" : undefined}
      >
        로스트 팻츠
      </Link>
      {Object.entries(artGames).map(([key, name]) => (
        <Link
          key={key}
          href={`/cards/${key}`}
          aria-current={current === key ? "page" : undefined}
        >
          {name}
        </Link>
      ))}
    </nav>
  );
}
