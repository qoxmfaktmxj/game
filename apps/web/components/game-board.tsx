"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Flag,
  Layers,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import type {
  Card,
  PlayerView,
  RoomView,
  StarCommand,
  Suit,
} from "@moyeotable/contracts";
import { suits, suitNames } from "../lib/client";
import { Modal, PlayingCard, SuitIcon } from "./primitives";

type PublicPlayer = PlayerView["players"][number];

/** Animate only new public cards and changed scores after the server accepts them. */
function useBoardMotion(version: number, reduceMotion: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const previous = useRef<Map<string, string>>(new Map());
  const firstRender = useRef(true);
  const systemReduced = useReducedMotion();
  useEffect(() => {
    const elements =
      ref.current?.querySelectorAll<HTMLElement>("[data-motion-slot]");
    const next = new Map<string, string>();
    const animations: Animation[] = [];
    elements?.forEach((element) => {
      const slot = element.dataset.motionSlot!;
      const value = element.dataset.motionValue ?? "";
      next.set(slot, value);
      if (
        !firstRender.current &&
        value &&
        previous.current.get(slot) !== value &&
        !reduceMotion &&
        !systemReduced
      ) {
        animations.push(
          element.animate(
            [
              { transform: "translateY(-9px) scale(0.97)" },
              { transform: "translateY(0) scale(1)" },
            ],
            { duration: 220, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
          ),
        );
      }
    });
    previous.current = next;
    firstRender.current = false;
    return () => animations.forEach((animation) => animation.cancel());
  }, [version, reduceMotion, systemReduced]);
  return ref;
}

export function GameBoard({
  view,
  busy,
  connected,
  reduceMotion,
  onCommand,
  onRules,
  onResign,
}: {
  view: RoomView<"star-trails">;
  busy: boolean;
  connected: boolean;
  reduceMotion: boolean;
  onCommand: (command: StarCommand) => void;
  onRules: () => void;
  onResign: () => void;
}) {
  const game = view.game!;
  const boardRef = useBoardMotion(game.version, reduceMotion);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [laneDetail, setLaneDetail] = useState<{
    player: PublicPlayer;
    suit: Suit;
  } | null>(null);
  const you = game.players.find((p) => p.id === game.you)!;
  const other = game.players.find((p) => p.id !== game.you)!;
  const selected = game.yourHand.find((card) => card.id === selectedId);
  const yourTurn = game.activePlayerId === game.you;
  const activeName =
    view.table.members.find((m) => m.userId === game.activePlayerId)
      ?.nickname || "친구";
  const activeBot = view.table.members.some(
    (member) =>
      member.userId === game.activePlayerId && member.control === "bot",
  );
  const allConnected = view.table.members.every((m) => m.connected);
  const locked = busy || !connected || !allConnected;
  const canPlay =
    !!selected &&
    game.legalCommands.some(
      (c) => c.type === "STAR_PLAY" && c.payload.cardId === selected.id,
    );
  const canDiscard =
    !!selected &&
    game.legalCommands.some(
      (c) => c.type === "STAR_DISCARD" && c.payload.cardId === selected.id,
    );
  const canDraw = game.legalCommands.some((c) => c.type === "STAR_DRAW_DECK");
  const name = (id: string) =>
    view.table.members.find((m) => m.userId === id)?.nickname || "친구";
  const act = (command: StarCommand) => {
    onCommand(command);
    setSelectedId(null);
  };

  function lanes(player: PublicPlayer, mine: boolean) {
    return (
      <div className={`lane-row ${mine ? "mine" : "theirs"}`}>
        {suits.map((suit) => {
          const cards = player.lanes[suit];
          const last = cards.at(-1);
          const score = player.score.lanes[suit];
          const target = mine && selected?.suit === suit && canPlay && !locked;
          return (
            <button
              key={suit}
              className={`lane ${suit} ${target ? "target-lane" : ""}`}
              onClick={() =>
                target
                  ? act({
                      type: "STAR_PLAY",
                      payload: { cardId: selected!.id },
                    })
                  : setLaneDetail({ player, suit })
              }
              aria-label={
                target
                  ? `${suitNames[suit]} 길에 선택한 카드 놓기`
                  : `${mine ? "내" : "상대"} ${suitNames[suit]} 길, ${cards.length}장, ${score.total}점`
              }
            >
              <div className="lane-label">
                <SuitIcon suit={suit} />
                <span>{suitNames[suit]}</span>
              </div>
              <div
                className={`lane-slot ${cards.length ? "occupied" : ""}`}
                data-motion-slot={`lane:${player.id}:${suit}`}
                data-motion-value={last?.id ?? ""}
              >
                {last ? (
                  <>
                    <span className="lane-card-value">
                      {last.kind === "support" ? "+" : last.value}
                    </span>
                    <SuitIcon suit={suit} />
                    <span className="lane-card-count">
                      {cards.length}장{" "}
                      {score.supports ? `· 지원 ${score.supports}` : ""}
                    </span>
                  </>
                ) : (
                  <span className="empty-lane">
                    <SuitIcon suit={suit} />
                    <span>{target ? "여기에 놓기" : "아직 비어 있어요"}</span>
                  </span>
                )}
                {target && (
                  <span className="lane-target-hint">
                    <ArrowRight size={20} />
                  </span>
                )}
              </div>
              <span className="lane-score">
                {score.total > 0 ? "+" : ""}
                {score.total}
                <small>점</small>
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="play-layout" ref={boardRef}>
      <div className="game-surface">
        <div className="opponent-header">
          <div className="player-identity">
            <span className="avatar opponent">
              {name(other.id).slice(0, 1)}
            </span>
            <div>
              <strong>{name(other.id)}</strong>
              <span>손패 {other.handCount}장</span>
            </div>
            {!yourTurn && <span className="turn-pill">생각하는 중</span>}
          </div>
          <div className="player-total">
            <span>탐험 점수</span>
            <b
              data-motion-slot="opponent-score"
              data-motion-value={other.score.total}
            >
              {other.score.total}
            </b>
          </div>
        </div>
        {lanes(other, false)}
        <div className="shared-center">
          <div className="discard-area">
            <div className="board-row-label">함께 쓰는 버림 더미</div>
            <div className="discard-row">
              {suits.map((suit) => {
                const pile = game.discards[suit];
                const enabled = game.legalCommands.some(
                  (c) =>
                    c.type === "STAR_DRAW_DISCARD" && c.payload.suit === suit,
                );
                return (
                  <button
                    key={suit}
                    className={`discard ${suit} ${enabled ? "available" : ""}`}
                    disabled={!enabled || locked}
                    onClick={() =>
                      act({ type: "STAR_DRAW_DISCARD", payload: { suit } })
                    }
                    aria-label={`${suitNames[suit]} 버림 더미에서 가져오기${pile.top ? `, ${pile.top.kind === "support" ? "지원" : pile.top.value}` : ""}`}
                  >
                    <SuitIcon suit={suit} />
                    <b>
                      {pile.top
                        ? pile.top.kind === "support"
                          ? "+"
                          : pile.top.value
                        : "—"}
                    </b>
                    <small>{pile.count}장</small>
                  </button>
                );
              })}
            </div>
          </div>
          <button
            className={`draw-deck ${canDraw ? "available" : ""}`}
            disabled={!canDraw || locked}
            onClick={() => act({ type: "STAR_DRAW_DECK", payload: {} })}
            aria-label={`덱에서 뽑기, ${game.deckCount}장 남음`}
          >
            <div className="deck-back">
              <SuitIcon suit="dusk" />
              <span>
                RINGU
                <br />
                RINGU
              </span>
            </div>
            <span>
              <b>{game.deckCount}</b>장 남음
            </span>
          </button>
        </div>
        <div className="my-path-title">
          <span>나의 별길</span>
          <span>길을 누르면 자세히 볼 수 있어요</span>
        </div>
        {lanes(you, true)}
        <div className="hand-area">
          <div className="hand-heading">
            <div className="player-identity">
              <span className="avatar">{name(you.id).slice(0, 1)}</span>
              <strong>
                {name(you.id)} <small>나</small>
              </strong>
              {yourTurn && <span className="turn-pill mine-turn">내 차례</span>}
            </div>
            <div className="player-total">
              <span>탐험 점수</span>
              <b
                data-motion-slot="my-score"
                data-motion-value={you.score.total}
              >
                {you.score.total}
              </b>
            </div>
          </div>
          <div className="hand" aria-label="내 손패">
            {game.yourHand.map((card) => (
              <PlayingCard
                key={card.id}
                card={card}
                motionSlot={`hand:${card.id}`}
                selected={selected?.id === card.id}
                disabled={locked || !yourTurn || game.phase !== "PLACE"}
                onClick={() =>
                  setSelectedId(selectedId === card.id ? null : card.id)
                }
              />
            ))}
          </div>
          <div
            className={`action-bar ${yourTurn ? "active" : ""}`}
            aria-live="polite"
          >
            <div>
              <span className="action-step">
                {yourTurn
                  ? game.phase === "PLACE"
                    ? "1 / 2"
                    : "2 / 2"
                  : "WAIT"}
              </span>
              <strong>
                {!connected
                  ? "테이블에 다시 연결하고 있어요"
                  : !allConnected
                    ? "친구가 돌아오기를 기다리고 있어요"
                    : !yourTurn
                      ? activeBot
                        ? `${activeName}이 생각하고 있어요…`
                        : `${activeName}님의 선택을 기다려요`
                      : game.phase === "DRAW"
                        ? "카드 한 장을 가져오세요"
                        : selected
                          ? `${suitNames[selected.suit]} ${selected.kind === "support" ? "지원" : selected.value} 카드를 선택했어요`
                          : "손패에서 카드 한 장을 골라 주세요"}
              </strong>
              <span>
                {yourTurn && game.phase === "DRAW"
                  ? "덱 또는 버림 더미를 눌러 차례를 마쳐요."
                  : yourTurn && selected && !canPlay
                    ? "이 카드는 지금 길에 놓을 수 없어요. 버릴 수는 있어요."
                    : "숫자는 더 크게, 지원 카드는 숫자보다 먼저."}
              </span>
            </div>
            <div className="action-buttons">
              {yourTurn && game.phase === "PLACE" && (
                <>
                  <button
                    className="button discard-button"
                    disabled={!canDiscard || locked}
                    onClick={() =>
                      selected &&
                      act({
                        type: "STAR_DISCARD",
                        payload: { cardId: selected.id },
                      })
                    }
                  >
                    버리기
                  </button>
                  <button
                    className="button mint"
                    disabled={!canPlay || locked}
                    onClick={() =>
                      selected &&
                      act({
                        type: "STAR_PLAY",
                        payload: { cardId: selected.id },
                      })
                    }
                  >
                    길에 놓기 <ArrowRight size={17} />
                  </button>
                </>
              )}
              {yourTurn && game.phase === "DRAW" && (
                <button
                  className="button mint"
                  disabled={!canDraw || locked}
                  onClick={() => act({ type: "STAR_DRAW_DECK", payload: {} })}
                >
                  덱에서 뽑기 <ArrowRight size={17} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <aside className="game-aside">
        <div className="game-aside-title">
          <SuitIcon suit="dusk" />
          <h2>별길 탐험</h2>
          <p>우리의 작은 우주</p>
        </div>
        <div className="turn-summary">
          <span>지금은</span>
          <h3>
            {yourTurn ? "당신의 차례예요." : `${activeName}님의 차례예요.`}
          </h3>
          <ol>
            <li className={game.phase === "PLACE" ? "current" : ""}>
              <span>1</span>카드 놓기 또는 버리기{" "}
              {game.phase === "DRAW" && <Check size={15} />}
            </li>
            <li className={game.phase === "DRAW" ? "current" : ""}>
              <span>2</span>카드 한 장 가져오기
            </li>
          </ol>
        </div>
        <div className="aside-rule">
          <h3>작은 탐험 팁</h3>
          <p>
            모든 길을 시작할 필요는 없어요. 잘할 수 있는 길에 집중하는 것도 좋은
            선택이에요.
          </p>
        </div>
        <button className="aside-button" onClick={onRules}>
          <BookOpen size={17} /> 게임 규칙 <ArrowRight size={15} />
        </button>
        <button className="aside-button muted" onClick={onResign}>
          <Flag size={16} /> 이번 게임 기권하기
        </button>
        <div className="saved-note">
          <Check size={13} /> 매 행동이 자동으로 저장돼요.
        </div>
      </aside>
      {laneDetail && (
        <Modal
          title={`${name(laneDetail.player.id)}님의 ${suitNames[laneDetail.suit]} 길`}
          onClose={() => setLaneDetail(null)}
          wide
        >
          <div className="detail-cards">
            {laneDetail.player.lanes[laneDetail.suit].length ? (
              laneDetail.player.lanes[laneDetail.suit].map((card) => (
                <PlayingCard key={card.id} card={card} small />
              ))
            ) : (
              <p>아직 시작하지 않은 길이에요. 현재 점수는 0점입니다.</p>
            )}
          </div>
          <div className="score-formula">
            <span>이 길의 점수</span>
            <strong>
              {laneDetail.player.score.lanes[laneDetail.suit].count
                ? `(${laneDetail.player.score.lanes[laneDetail.suit].sum} − 20) × ${laneDetail.player.score.lanes[laneDetail.suit].multiplier} + ${laneDetail.player.score.lanes[laneDetail.suit].bonus} = ${laneDetail.player.score.lanes[laneDetail.suit].total}점`
                : "0점"}
            </strong>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function ResultPanel({
  view,
  userId,
  busy,
  reduceMotion,
  onReady,
  onRematch,
}: {
  view: RoomView<"star-trails">;
  userId: string;
  busy: boolean;
  reduceMotion: boolean;
  onReady: () => void;
  onRematch: () => void;
}) {
  const resultRef = useRef<SVGSVGElement>(null);
  const systemReduced = useReducedMotion();
  useEffect(() => {
    if (reduceMotion || systemReduced) return;
    const animation = resultRef.current?.animate(
      [
        { transform: "scale(0.8) rotate(-12deg)" },
        { transform: "scale(1) rotate(0deg)" },
      ],
      { duration: 480, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
    );
    return () => animation?.cancel();
  }, [reduceMotion, systemReduced]);
  const result = view.result!;
  const mine = view.table.members.find((m) => m.userId === userId)!;
  const isHost = view.table.hostId === userId;
  const allReady =
    view.table.members.length === 2 &&
    view.table.members.every((m) => m.ready && m.connected);
  return (
    <section className="result-panel">
      <div className="result-celebration">
        <Trophy ref={resultRef} size={40} strokeWidth={1.2} />
        <p>한 장 한 장, 멋진 탐험이었어요.</p>
        <h1>
          {result.tied
            ? "함께 이룬 승리!"
            : result.winners.includes(userId)
              ? "당신의 별길이 빛났어요."
              : "다음 탐험을 기대해요."}
        </h1>
        <span>
          {result.reason === "RESIGN"
            ? "기권으로 마친 게임"
            : "덱의 마지막 카드까지, 탐험 완료"}
        </span>
      </div>
      <div className="result-scores">
        {result.scores.map((score) => (
          <div
            className={`result-person ${result.winners.includes(score.playerId) ? "winner" : ""}`}
            key={score.playerId}
          >
            <span>
              {
                view.table.members.find((m) => m.userId === score.playerId)
                  ?.nickname
              }
              {score.playerId === userId ? " (나)" : ""}
            </span>
            <strong>
              {score.total}
              <small>점</small>
            </strong>
            {result.winners.includes(score.playerId) && (
              <span className="winner-badge">WINNER</span>
            )}
          </div>
        ))}
      </div>
      <div className="score-table-wrap">
        <table className="score-table">
          <caption>다섯 별길의 점수</caption>
          <thead>
            <tr>
              <th>별길</th>
              {result.scores.map((score) => (
                <th key={score.playerId}>
                  {
                    view.table.members.find((m) => m.userId === score.playerId)
                      ?.nickname
                  }
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {suits.map((suit) => (
              <tr key={suit}>
                <th>
                  <span className={suit}>
                    <SuitIcon suit={suit} />
                    {suitNames[suit]}
                  </span>
                </th>
                {result.scores.map((score) => (
                  <td key={score.playerId}>
                    <b>{score.lanes[suit].total}점</b>
                    <small>
                      {score.lanes[suit].count
                        ? `(${score.lanes[suit].sum}−20) × ${score.lanes[suit].multiplier}${score.lanes[suit].bonus ? " +20" : ""}`
                        : "시작하지 않은 길"}
                    </small>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rematch-actions">
        <p>같은 테이블, 같은 친구. 한 판 더 할까요?</p>
        <div>
          <button
            className={`button ${mine.ready ? "secondary" : "primary"}`}
            disabled={busy}
            onClick={onReady}
          >
            {mine.ready ? (
              <>
                <Check size={18} /> 재경기 준비 완료
              </>
            ) : (
              "재경기 준비하기"
            )}
          </button>
          {isHost && (
            <button
              className="button primary"
              disabled={!allReady || busy}
              onClick={onRematch}
            >
              새 탐험 시작 <ArrowRight size={18} />
            </button>
          )}
        </div>
        <span>
          {view.table.members.filter((m) => m.ready).length}/2 준비 완료 ·{" "}
          {isHost
            ? "모두 준비하면 시작할 수 있어요."
            : "방장이 새 탐험을 시작해요."}
        </span>
      </div>
    </section>
  );
}
