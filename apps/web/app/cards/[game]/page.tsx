import Link from "next/link";
import { notFound } from "next/navigation";
import "../../card-gallery.css";
import { Logo } from "../../../components/primitives";
import { CardArt } from "../../../components/card-art";
import { CardGalleryNav, artGames } from "../../../components/card-gallery-nav";
import available from "../../../lib/card-art-ready.json";

type ArtGame = keyof typeof artGames;
export function generateStaticParams() {
  return Object.keys(artGames).map((game) => ({ game }));
}
export default async function GameCardsPage({
  params,
}: {
  params: Promise<{ game: string }>;
}) {
  const { game } = await params;
  if (!Object.hasOwn(artGames, game)) notFound();
  const key = game as ArtGame;
  const cards = available.filter((item) => item.game === game);
  return (
    <main className="card-gallery page-width">
      <header className="card-gallery-nav">
        <Link href="/" aria-label="링구링구 홈">
          <Logo />
        </Link>
        <Link href="/">← 홈으로</Link>
      </header>
      <div className="card-gallery-intro">
        <p>링구링구 카드 컬렉션</p>
        <h1>{artGames[key]}</h1>
        <p>{cards.length}개의 그림, 하나의 작은 세계.</p>
        <CardGalleryNav current={key} />
      </div>
      <section
        className="card-gallery-section"
        aria-label={`${artGames[key]} 전체 그림`}
      >
        <div className="card-gallery-grid other-card-gallery">
          {cards.map((card) => (
            <figure key={card.key} data-art-key={card.key}>
              <CardArt
                game={key}
                id={card.key}
                sizes="(max-width: 760px) 45vw, 240px"
              />
              <figcaption>{card.name}</figcaption>
            </figure>
          ))}
        </div>
      </section>
      <footer className="card-gallery-footer">
        <p>
          같은 종류의 복사본은 같은 그림을 사용해요. 숫자와 효과는 게임 화면에서
          확인하세요.
        </p>
        <Link className="button primary" href="/">
          게임 하러 가기 ↗
        </Link>
      </footer>
    </main>
  );
}
