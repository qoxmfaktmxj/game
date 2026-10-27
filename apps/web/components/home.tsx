"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { webImage } from "../lib/web-assets";
import {
  ArrowRight,
  ArrowUpRight,
  Link2,
  Pause,
  Play,
  BookOpen,
} from "lucide-react";
import { useInView, useReducedMotion } from "motion/react";
import { GAME_CATALOG } from "@moyeotable/game-core/catalog";
import { starCardArt } from "../lib/star-card-art";

export const clubGames = [
  {
    key: "star-trails",
    name: GAME_CATALOG["star-trails"].name,
    genre: "2명 / 카드 전략",
    description: "한 장의 선택, 다섯 갈래의 승부.",
    tone: "lime",
  },
  {
    key: "workshop",
    name: GAME_CATALOG.workshop.name,
    genre: "2~4명 / 자원 전략",
    description: "작은 아기부터 든든한 어른까지, 숲속 친구들.",
    tone: "coral",
  },
  {
    key: "council",
    name: "밤의 의회",
    genre: "2~7명 / 역할 선택",
    description: "누가 어떤 역할일까? 밤의 수를 읽어요.",
    tone: "lilac",
  },
  {
    key: "signal",
    name: "황혼의 신호",
    genre: "4~7명 / 공격과 대응",
    description: "날카로운 한 수와 아슬아슬한 반격.",
    tone: "amber",
  },
  {
    key: "garden",
    name: "넘버가든",
    genre: "2~4명 / 숫자 조합",
    description: "흩어진 숫자에서 멋진 조합을 찾아요.",
    tone: "sky",
  },
] as const;

function ClubScene() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.15 });
  const osReducedMotion = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  useEffect(() => {
    setReady(true);
    const update = () => setTabVisible(!document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  const reduceMotion = ready && !!osReducedMotion;
  const playing = ready && inView && tabVisible && !paused && !reduceMotion;
  return (
    <figure className="club-scene" ref={ref} data-playing={playing}>
      <div
        className="club-scene-art"
        aria-label={`${GAME_CATALOG["star-trails"].name}의 동물 카드`}
      >
        {(
          [
            { suit: "aurora", rank: "6", family: "멍이" },
            { suit: "ember", rank: "10", family: "냥이" },
            { suit: "moss", rank: "8", family: "수달" },
          ] as const
        ).map(({ suit, rank, family }) => (
          <div className="club-sample-card" key={suit}>
            <span className="club-sample-rank">{rank}</span>
            <div className="club-sample-art">
              <Image
                src={webImage(starCardArt[suit][rank]!.src)}
                alt={starCardArt[suit][rank]!.name}
                fill
                sizes="(max-width: 760px) 120px, 180px"
                priority
              />
            </div>
            <span className="club-sample-name">{family}</span>
          </div>
        ))}
      </div>
      <figcaption className="club-scene-caption">
        같은 테이블, 다른 즐거움.
      </figcaption>
      <button
        className="club-motion-control"
        type="button"
        onClick={() => setPaused((v) => !v)}
        disabled={reduceMotion}
        aria-pressed={paused || reduceMotion}
        aria-label={
          reduceMotion
            ? "모션 감소 설정 사용 중"
            : paused
              ? "홈 카드 모션 재생"
              : "홈 카드 모션 일시 정지"
        }
      >
        {paused || reduceMotion ? <Play size={13} /> : <Pause size={13} />}
        <span>
          {reduceMotion ? "모션 줄임" : paused ? "모션 재생" : "모션 멈춤"}
        </span>
      </button>
    </figure>
  );
}

export function Home({
  onCreate,
  onJoin,
  onRules,
}: {
  onCreate: (gameKey?: string) => void;
  onJoin: () => void;
  onRules: (gameKey?: string) => void;
}) {
  return (
    <div className="club-home">
      <section className="club-hero page-width">
        <div className="club-hero-copy">
          <h1>
            좋은 친구들과
            <br />
            <span>즐거운 게임.</span>
          </h1>
          <div className="club-hero-actions">
            <button className="button primary large" onClick={() => onCreate()}>
              <span>우리 테이블 만들기</span>
              <ArrowUpRight size={21} />
            </button>
            <button className="club-join" onClick={onJoin}>
              <Link2 size={17} />
              초대받았어요
            </button>
          </div>
        </div>
        <ClubScene />
      </section>
      <section
        className="club-collection page-width"
        id="games"
        aria-labelledby="club-games-title"
      >
        <div className="club-section-heading">
          <div>
            <h2 id="club-games-title">오늘은 무슨 게임?</h2>
          </div>
        </div>
        <div className="club-game-shelf">
          {clubGames.map((game) => (
            <article
              className={`club-game club-game-${game.tone}`}
              key={game.key}
            >
              <button
                className="club-game-cover"
                onClick={() => onCreate(game.key)}
                aria-label={`${game.name} 테이블 만들기`}
              >
                <Image
                  src={webImage(GAME_CATALOG[game.key].art)}
                  alt=""
                  fill
                  sizes="(max-width: 760px) 50vw, 23vw"
                  quality={75}
                />
                <span className="club-game-go">
                  <ArrowUpRight size={21} />
                </span>
              </button>
              <div className="club-game-copy">
                <h3>
                  <button onClick={() => onCreate(game.key)}>
                    {game.name}
                  </button>
                </h3>
                <span className="club-game-genre">{game.genre}</span>
                <p>{game.description}</p>
                <div className="club-game-actions">
                  <button onClick={() => onCreate(game.key)}>
                    플레이 <ArrowRight size={15} />
                  </button>
                  <button
                    onClick={() => onRules(game.key)}
                    aria-label={`${game.name} 규칙 보기`}
                  >
                    <BookOpen size={17} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
      <footer className="club-footer page-width">
        <div>
          <strong>
            링구링구<span>.</span>
          </strong>
          <p>좋은 친구들과 즐거운 게임.</p>
        </div>
        <span>같은 테이블, 다른 즐거움.</span>
        <a href="#games">
          다음 한 판 고르기 <ArrowUpRight size={17} />
        </a>
      </footer>
    </div>
  );
}
