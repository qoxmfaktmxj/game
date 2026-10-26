import Link from "next/link";
import Image from "next/image";
import "../card-gallery.css";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import type { Card, Suit } from "@moyeotable/contracts";
import { PlayingCard, SuitIcon, Logo } from "../../components/primitives";
import { suitNames } from "../../lib/client";
import { getStarCardArt, starCardArt } from "../../lib/star-card-art";
import { CardGalleryNav } from "../../components/card-gallery-nav";

export const metadata = { title: "링구링구 - 로스트 팻츠" };
const suits: Suit[] = ["aurora", "ember", "tide", "moss", "dusk"];
const descriptions = {
  aurora: "꼬리를 흔들며 먼저 다가오는 강아지 친구.",
  ember: "호기심 가득한 눈으로 세상을 구경하는 고양이 친구.",
  tide: "동그란 눈과 작은 지느러미로 인사하는 바다 친구.",
  moss: "물 위에 둥실, 조약돌을 아끼는 수달 친구.",
  dusk: "선명한 줄무늬와 순한 표정의 호랑이 친구.",
};
export default function CardsPage() {
  return (
    <main className="card-gallery animal-card-gallery star-animal-theme page-width">
      <header className="card-gallery-nav">
        <Link href="/" aria-label="링구링구 홈">
          <Logo />
        </Link>
        <Link href="/">
          <ArrowLeft size={17} /> 홈으로
        </Link>
      </header>
      <div className="card-gallery-intro">
        <h1>
          다섯 친구와,
          <br />한 장 더 가까이.
        </h1>
        <p>
          로스트 팻츠에서 만나는 멍이, 냥이, 물개, 수달, 랑이. 품종과 포즈가 다른
          50가지 그림을 만나보세요.
        </p>
        <CardGalleryNav />
        <nav className="animal-gallery-friends" aria-label="카드 계열">
          {suits.map((suit) => (
            <a href={`#${suit}`} key={suit}>
              <span className="animal-friend-preview">
                <Image
                  src={starCardArt[suit].support.src}
                  alt=""
                  fill
                  sizes="(max-width: 760px) 16vw, 180px"
                />
              </span>
              <span>
                <SuitIcon suit={suit} />
                {suitNames[suit]}
              </span>
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
                    ? "지원 ×2 · 같은 카드 3장"
                    : `${suitNames[suit]} ${card.value} · ${getStarCardArt(card).name}`}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
      <footer className="card-gallery-footer">
        <div>
          <p>숫자 카드 45장 + 지원 카드 15장. 총 60장으로 함께해요.</p>
          <p>지원 카드 배수: 1장 ×2, 2장 ×3, 3장 ×4</p>
        </div>
        <Link href="/" className="button primary">
          게임 하러 가기 <ArrowUpRight size={18} />
        </Link>
      </footer>
    </main>
  );
}
