"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  Link2,
  Pause,
  Play,
  BookOpen,
} from "lucide-react";
import { useInView, useReducedMotion } from "motion/react";

export const clubGames = [
  {
    key: "star-trails",
    name: "별길 탐험",
    art: "orbit",
    genre: "2명 · 카드 전략",
    description: "한 장의 선택, 다섯 갈래의 승부.",
    tone: "lime",
  },
  {
    key: "workshop",
    name: "빛의 공방",
    art: "workshop",
    genre: "2–4명 · 자원 전략",
    description: "빛을 모으고, 나만의 공방을 완성해요.",
    tone: "coral",
  },
  {
    key: "council",
    name: "밤의 의회",
    art: "council",
    genre: "2–7명 · 역할 선택",
    description: "누가 어떤 역할일까? 밤의 수를 읽어요.",
    tone: "lilac",
  },
  {
    key: "signal",
    name: "황혼의 신호",
    art: "signal",
    genre: "4–7명 · 공격과 대응",
    description: "날카로운 한 수와 아슬아슬한 반격.",
    tone: "amber",
  },
  {
    key: "garden",
    name: "넘버가든",
    art: "garden",
    genre: "2–4명 · 숫자 조합",
    description: "흩어진 숫자에서 멋진 조합을 찾아요.",
    tone: "sky",
  },
] as const;

function ClubScene({
  reduceMotion: appReducedMotion = false,
}: {
  reduceMotion?: boolean;
}) {
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
  const reduceMotion = appReducedMotion || (ready && !!osReducedMotion);
  const playing = ready && inView && tabVisible && !paused && !reduceMotion;
  return (
    <figure className="club-scene" ref={ref} data-playing={playing}>
      <div className="club-scene-art" aria-hidden="true">
        <Image
          src="/art/club-orbit.png"
          alt=""
          fill
          sizes="(max-width: 760px) 100vw, 65vw"
          priority
          quality={75}
        />
        <svg className="club-scene-path" viewBox="0 0 800 580" fill="none">
          <ellipse
            cx="405"
            cy="285"
            rx="360"
            ry="228"
            transform="rotate(-18 405 285)"
            pathLength="100"
          />
        </svg>
      </div>
      <figcaption className="club-scene-caption">
        <span className="club-caption-dot" />
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
  reduceMotion = false,
}: {
  onCreate: (gameKey?: string) => void;
  onJoin: () => void;
  onRules: (gameKey?: string) => void;
  reduceMotion?: boolean;
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
        <ClubScene reduceMotion={reduceMotion} />
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
                  src={`/art/club-${game.art}.png`}
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
                <span className="club-game-genre">{game.genre}</span>
                <h3>
                  <button onClick={() => onCreate(game.key)}>
                    {game.name}
                  </button>
                </h3>
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
        <span>
          GOOD FRIENDS.
          <br />
          GREAT GAMES.
        </span>
        <a href="#games">
          다음 한 판 고르기 <ArrowUpRight size={17} />
        </a>
      </footer>
    </div>
  );
}
