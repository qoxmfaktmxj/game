import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
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
  const groups =
    key === "workshop"
      ? [
          {
            title: "1단계 · 아기들의 안식처",
            cards: cards.filter((card) => "stage" in card && card.stage === 1),
          },
          {
            title: "2단계 · 청소년의 첫 모험",
            cards: cards.filter((card) => "stage" in card && card.stage === 2),
          },
          {
            title: "3단계 · 다 자란 숲속 친구",
            cards: cards.filter((card) => "stage" in card && card.stage === 3),
          },
          {
            title: "숲의 수호자",
            cards: cards.filter((card) => "stage" in card && card.stage === 4),
          },
        ]
      : [{ title: `${artGames[key]} 전체 그림`, cards }];
  return (
    <main className="card-gallery page-width">
      <header className="card-gallery-nav">
        <Link href="/" aria-label="링구링구 홈">
          <Logo />
        </Link>
        <Link href="/">
          <ArrowLeft size={16} aria-hidden="true" /> 홈으로
        </Link>
      </header>
      <div className="card-gallery-intro">
        <h1>{artGames[key]}</h1>
        <p>링구링구 카드 컬렉션</p>
        <p>{cards.length}개의 그림, 하나의 작은 세계.</p>
        {key === "workshop" && (
          <p>
            강아지 · 고양이 · 수달 · 호랑이 · 카피바라. 아기부터 어른까지 세
            모습으로 만나요.
          </p>
        )}
        <CardGalleryNav current={key} />
      </div>
      {groups.map((group) => (
        <section
          className="card-gallery-section"
          aria-label={group.title}
          key={group.title}
        >
          {key === "workshop" && (
            <div className="card-gallery-heading">
              <h2>{group.title}</h2>
              <p>{group.cards.length}장</p>
            </div>
          )}
          <div className="card-gallery-grid other-card-gallery">
            {group.cards.map((card) => (
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
      ))}
      <footer className="card-gallery-footer">
        <p>
          같은 종류의 복사본은 같은 그림을 사용해요. 숫자와 효과는 게임 화면에서
          확인하세요.
        </p>
        <Link className="button primary" href="/">
          게임 하러 가기 <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </footer>
    </main>
  );
}
