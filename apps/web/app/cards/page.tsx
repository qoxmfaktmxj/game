import Link from "next/link";
import "../card-gallery.css";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import type { Card, Suit } from "@moyeotable/contracts";
import { PlayingCard, SuitIcon, Logo } from "../../components/primitives";
import { suitNames } from "../../lib/client";
import { CardGalleryNav } from "../../components/card-gallery-nav";

export const metadata = { title: "별길 탐험 카드 모아보기 — 링구링구" };
const suits: Suit[] = ["aurora", "ember", "tide", "moss", "dusk"];
const descriptions = {
  aurora: "고요한 얼음 위로 빛이 흐르는 길.",
  ember: "작은 불씨에서 시작하는 따뜻한 모험.",
  tide: "파도를 따라 더 멀리, 더 깊이.",
  moss: "초록의 틈에서 발견하는 작은 세계.",
  dusk: "해가 저물 때, 새로운 풍경이 열려요.",
};
export default function CardsPage() {
  return (
    <main className="card-gallery page-width">
      <header className="card-gallery-nav">
        <Link href="/" aria-label="링구링구 홈">
          <Logo />
        </Link>
        <Link href="/">
          <ArrowLeft size={17} /> 홈으로
        </Link>
      </header>
      <div className="card-gallery-intro">
        <p>별길 탐험</p>
        <h1>
          한 장마다,
          <br />
          새로운 풍경.
        </h1>
        <p>다섯 갈래의 길을 따라 50가지 그림을 만나보세요.</p>
        <CardGalleryNav />
        <nav aria-label="카드 계열">
          {suits.map((suit) => (
            <a href={`#${suit}`} key={suit}>
              <SuitIcon suit={suit} />
              {suitNames[suit]}
            </a>
          ))}
        </nav>
      </div>
      {suits.map((suit) => (
        <section className="card-gallery-section" id={suit} key={suit}>
          <div className="card-gallery-heading">
            <h2>
              <SuitIcon suit={suit} />
              {suitNames[suit]}
            </h2>
            <p>{descriptions[suit]}</p>
          </div>
          <div className="card-gallery-grid">
            {[
              ...Array.from(
                { length: 9 },
                (_, i) =>
                  ({
                    id: `gallery-${suit}-${i + 2}`,
                    kind: "number",
                    suit,
                    value: i + 2,
                  }) as const,
              ),
              {
                id: `gallery-${suit}-support`,
                kind: "support",
                suit,
                value: null,
              } as const,
            ].map((card: Card) => (
              <figure key={card.id}>
                <PlayingCard
                  card={card}
                  artSizes="(max-width: 760px) 45vw, 240px"
                />
                <figcaption>
                  {card.kind === "support"
                    ? "지원 · 같은 카드 3장"
                    : `${suitNames[suit]} ${card.value}`}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
      <footer className="card-gallery-footer">
        <p>숫자 카드 45장 + 지원 카드 15장. 총 60장으로 탐험해요.</p>
        <Link href="/" className="button primary">
          게임 하러 가기 <ArrowUpRight size={18} />
        </Link>
      </footer>
    </main>
  );
}
