"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Flag,
  GripHorizontal,
  Trophy,
} from "lucide-react";
import type {
  PlayerView,
  RoomView,
  StarCommand,
  Suit,
} from "@moyeotable/contracts";
import { suits, suitNames } from "../lib/client";
import { Modal, PlayingCard, SuitIcon } from "./primitives";
import { useStarCardDrag } from "./use-star-card-drag";
import { CardStack } from "./star-card-stack";
import "./star-board.css";

type PublicPlayer = PlayerView["players"][number];

/** Animate only public changes in the accepted server View. */
function useBoardMotion(version: number) {
  const ref = useRef<HTMLDivElement>(null);
  const previous = useRef<Map<string, string>>(new Map());
  const firstRender = useRef(true);
  const systemReduced = useReducedMotion();
  useEffect(() => {
    const next = new Map<string, string>();
    const animations: Animation[] = [];
    ref.current
      ?.querySelectorAll<HTMLElement>("[data-motion-slot]")
      .forEach((element) => {
        const slot = element.dataset.motionSlot!;
        const value = element.dataset.motionValue ?? "";
        next.set(slot, value);
        if (
          !firstRender.current &&
          value &&
          previous.current.get(slot) !== value &&
          !systemReduced
        ) {
          animations.push(
            element.animate(
              [
                { transform: "translateY(-7px)" },
                { transform: "translateY(0)" },
              ],
              { duration: 200, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
            ),
          );
        }
      });
    previous.current = next;
    firstRender.current = false;
    return () => animations.forEach((animation) => animation.cancel());
  }, [version, systemReduced]);
  return ref;
}

export function GameBoard({
  view,
  busy,
  connected,
  onCommand,
  onRules,
  onResign,
}: {
  view: RoomView<"star-trails">;
  busy: boolean;
  connected: boolean;
  onCommand: (command: StarCommand) => void;
  onRules: () => void;
  onResign: () => void;
}) {
  const game = view.game!;
  const boardRef = useBoardMotion(game.version);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [laneDetail, setLaneDetail] = useState<{
    playerId: string;
    suit: Suit;
  } | null>(null);
  const [discardDetail, setDiscardDetail] = useState<Suit | null>(null);
  const you = game.players.find((p) => p.id === game.you)!;
  const other = game.players.find((p) => p.id !== game.you)!;
  const selected = game.yourHand.find((card) => card.id === selectedId);
  const yourTurn = game.activePlayerId === game.you;
  const name = (id: string) =>
    view.table.members.find((m) => m.userId === id)?.nickname || "친구";
  const activeName = name(game.activePlayerId);
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
  const canSelect = !locked && yourTurn && game.phase === "PLACE";
  const act = (command: StarCommand) => {
    if (locked) return;
    onCommand(command);
    // Keep selection and the physical card in place until the server changes the View.
  };
  const { drag, announcement, start, resetClickSuppression, suppressClick } =
    useStarCardDrag({
      enabled: canSelect,
      version: game.version,
      legalCommands: game.legalCommands,
      onSelect: setSelectedId,
      onCommand: act,
    });
  useEffect(() => {
    if (!game.yourHand.some((card) => card.id === selectedId))
      setSelectedId(null);
  }, [game.yourHand, selectedId]);
  const detailedPlayer =
    laneDetail &&
    game.players.find((player) => player.id === laneDetail.playerId);
  // Older open clients/servers can briefly coexist during a rolling update.
  const discardedCards = (suit: Suit) =>
    game.discards[suit].cards ??
    (game.discards[suit].top ? [game.discards[suit].top!] : []);
  const canTakeDiscard = (suit: Suit) =>
    game.legalCommands.some(
      (command) =>
        command.type === "STAR_DRAW_DISCARD" && command.payload.suit === suit,
    );

  function lanes(player: PublicPlayer, mine: boolean) {
    return (
      <div className={`lane-row ${mine ? "mine" : "theirs"}`}>
        {suits.map((suit) => {
          const cards = player.lanes[suit];
          const score = player.score.lanes[suit];
          const target = mine && selected?.suit === suit && canPlay && !locked;
          return (
            <button
              key={suit}
              className={`lane ${suit} ${target ? "target-lane" : ""} ${drag?.target === `play:${suit}` && mine ? "drop-hover" : ""}`}
              data-star-drop={mine ? "play" : undefined}
              data-suit={suit}
              onClick={() => setLaneDetail({ playerId: player.id, suit })}
              aria-label={`${mine ? "내" : "상대"} ${suitNames[suit]} 길, ${cards.length}장, ${score.total}점, 자세히 보기`}
            >
              <span className="lane-label">
                <SuitIcon suit={suit} />
                <span>{suitNames[suit]}</span>
              </span>
              <div
                className={`lane-slot ${cards.length ? "occupied" : ""}`}
                data-motion-slot={`lane:${player.id}:${suit}`}
                data-motion-value={cards.at(-1)?.id ?? ""}
              >
                {cards.length ? (
                  <CardStack cards={cards} />
                ) : (
                  <span className="empty-lane">
                    <SuitIcon suit={suit} />
                  </span>
                )}
                {target && (
                  <span className="lane-target-hint">
                    <ArrowRight size={16} />
                  </span>
                )}
              </div>
              <span className="lane-score">
                <b>
                  {score.total > 0 ? "+" : ""}
                  {score.total}
                </b>
                <small>점</small>
                <span>
                  {cards.length}장
                  {score.supports ? ` · ×${score.multiplier}` : ""}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="play-layout star-animal-board"
      ref={boardRef}
      data-dragging={Boolean(drag)}
      onPointerDownCapture={resetClickSuppression}
      onClickCapture={(event) => {
        if (event.detail > 0 && suppressClick()) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <div className="game-surface">
        <div className="opponent-header">
          <div className="player-identity">
            <span className="avatar opponent">
              {name(other.id).slice(0, 1)}
            </span>
            <div>
              <strong>{name(other.id)}</strong>
              <span>상대 손패 {other.handCount}장</span>
            </div>
            {!yourTurn && <span className="turn-pill">생각하는 중</span>}
          </div>
          <div className="player-total">
            <span>점수</span>
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
                const enabled = canTakeDiscard(suit);
                const discardTarget =
                  selected?.suit === suit && canDiscard && !locked;
                return (
                  <div
                    key={suit}
                    className={`discard-pile ${suit} ${enabled || discardTarget ? "available" : ""} ${drag?.target === `discard:${suit}` ? "drop-hover" : ""}`}
                    data-star-drop="discard"
                    data-suit={suit}
                  >
                    <button
                      type="button"
                      className={`discard ${suit}`}
                      onClick={() => setDiscardDetail(suit)}
                      disabled={pile.count === 0}
                      aria-label={`${suitNames[suit]} 버림 더미, ${pile.count}장, 자세히 보기`}
                    >
                      <span
                        className={`discard-face ${pile.count ? "occupied" : ""}`}
                        data-motion-slot={`discard:${suit}`}
                        data-motion-value={pile.top?.id ?? ""}
                      >
                        {pile.top ? (
                          <CardStack cards={discardedCards(suit)} compact />
                        ) : (
                          <span className="discard-empty">
                            <SuitIcon suit={suit} />
                            <span>{suitNames[suit]}</span>
                          </span>
                        )}
                      </span>
                      <small>{pile.count}장</small>
                    </button>
                    {pile.count > 0 && (
                      <button
                        type="button"
                        className="discard-take"
                        disabled={!enabled || locked}
                        onClick={() =>
                          act({ type: "STAR_DRAW_DISCARD", payload: { suit } })
                        }
                        aria-label={`${suitNames[suit]} 버림 더미에서 가져오기, 마지막 카드 ${pile.top?.kind === "support" ? "지원 ×2" : pile.top?.value}`}
                      >
                        가져오기
                      </button>
                    )}
                  </div>
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
              <span>링구링구</span>
            </div>
            <span>
              <b>{game.deckCount}</b>장 남음
            </span>
          </button>
        </div>
        <div className="my-path-title">
          <strong>나의 길</strong>
          <span>길을 누르면 전체 카드를 볼 수 있어요</span>
        </div>
        {lanes(you, true)}
      </div>
      <div className="star-personal-zone">
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
              <span>점수</span>
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
              <div
                key={card.id}
                className={`hand-card-holder ${drag?.card.id === card.id ? "drag-origin" : ""}`}
                onPointerDown={(event) => start(event, card)}
              >
                <PlayingCard
                  card={card}
                  motionSlot={`hand:${card.id}`}
                  selected={selected?.id === card.id}
                  disabled={!canSelect}
                  onClick={() =>
                    setSelectedId(selectedId === card.id ? null : card.id)
                  }
                />
                <button
                  type="button"
                  className="card-drag-handle"
                  disabled={!canSelect}
                  aria-label={`${suitNames[card.suit]} ${card.kind === "support" ? "지원 ×2" : card.value} 카드 끌기, 누르면 선택`}
                  onClick={() => setSelectedId(card.id)}
                >
                  <GripHorizontal size={16} />
                  <span>끌기</span>
                </button>
              </div>
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
                    ? "놓기·버리기"
                    : "가져오기"
                  : "대기"}
              </span>
              <strong>
                {!connected
                  ? "테이블에 다시 연결하고 있어요"
                  : !allConnected
                    ? "친구가 돌아오기를 기다리고 있어요"
                    : busy
                      ? "카드 이동을 확인하고 있어요"
                      : !yourTurn
                        ? activeBot
                          ? `${activeName}이 생각하고 있어요…`
                          : `${activeName}님의 선택을 기다려요`
                        : game.phase === "DRAW"
                          ? "카드 한 장을 가져오세요"
                          : selected
                            ? `${suitNames[selected.suit]} ${selected.kind === "support" ? "지원 ×2" : selected.value} 카드를 선택했어요`
                            : "손패에서 카드 한 장을 골라 주세요"}
              </strong>
              <span>
                {yourTurn && game.phase === "DRAW"
                  ? "덱을 누르거나 버림 더미 아래 ‘가져오기’를 눌러요."
                  : yourTurn && selected && !canPlay
                    ? "이 카드는 지금 길에 놓을 수 없어요. 버릴 수는 있어요."
                    : "카드를 고른 뒤 버튼으로 놓거나, 원하는 곳으로 끌어 주세요."}
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
                    놓기 <ArrowRight size={17} />
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
          <span className="star-drag-status" role="status">
            {announcement}
          </span>
        </div>
        <aside className="game-aside">
          <div className="game-aside-title">
            <h2>로스트 팻츠</h2>
            <p>다섯 동물과 한 장씩 이어 가는 길</p>
          </div>
          <div className="turn-summary">
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
            <h3>지원 카드의 배수</h3>
            <p>
              지원 1장은 ×2, 2장은 ×3, 3장은 ×4. 숫자 카드보다 먼저 놓아 주세요.
            </p>
            <p>
              모든 길을 시작할 필요는 없어요. 잘할 수 있는 길에 집중해 보세요.
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
      </div>
      {drag && (
        <div
          className="star-drag-preview"
          aria-hidden="true"
          style={{ left: drag.x, top: drag.y, width: drag.width }}
        >
          <PlayingCard card={drag.card} />
        </div>
      )}
      {laneDetail && detailedPlayer && (
        <Modal
          title={`${name(detailedPlayer.id)}님의 ${suitNames[laneDetail.suit]} 길`}
          onClose={() => setLaneDetail(null)}
          wide
        >
          <div className="detail-cards">
            {detailedPlayer.lanes[laneDetail.suit].length ? (
              detailedPlayer.lanes[laneDetail.suit].map((card) => (
                <PlayingCard key={card.id} card={card} small />
              ))
            ) : (
              <p>아직 시작하지 않은 길이에요. 현재 점수는 0점입니다.</p>
            )}
          </div>
          <div className="score-formula">
            <span>이 길의 점수</span>
            <strong>
              {detailedPlayer.score.lanes[laneDetail.suit].count
                ? `(${detailedPlayer.score.lanes[laneDetail.suit].sum} − 20) × ${detailedPlayer.score.lanes[laneDetail.suit].multiplier} + ${detailedPlayer.score.lanes[laneDetail.suit].bonus} = ${detailedPlayer.score.lanes[laneDetail.suit].total}점`
                : "0점"}
            </strong>
          </div>
        </Modal>
      )}
      {discardDetail && (
        <Modal
          title={`${suitNames[discardDetail]} 버림 더미 · ${game.discards[discardDetail].count}장`}
          onClose={() => setDiscardDetail(null)}
          wide
        >
          <p className="modal-description">
            먼저 버린 카드부터 순서대로 보여요. 맨 마지막 카드만 가져올 수
            있어요.
          </p>
          <div className="detail-cards">
            {discardedCards(discardDetail).map((card) => (
              <PlayingCard key={card.id} card={card} small />
            ))}
          </div>
          {game.discards[discardDetail].count > 0 ? (
            <button
              className="button mint"
              disabled={!canTakeDiscard(discardDetail) || locked}
              onClick={() => {
                act({
                  type: "STAR_DRAW_DISCARD",
                  payload: { suit: discardDetail },
                });
                setDiscardDetail(null);
              }}
            >
              마지막 카드 가져오기
            </button>
          ) : (
            <p>다른 친구가 마지막 카드를 가져갔어요.</p>
          )}
        </Modal>
      )}
    </div>
  );
}
export function ResultPanel({
  view,
  userId,
  busy,
  onReady,
  onRematch,
}: {
  view: RoomView<"star-trails">;
  userId: string;
  busy: boolean;
  onReady: () => void;
  onRematch: () => void;
}) {
  const resultRef = useRef<SVGSVGElement>(null);
  const systemReduced = useReducedMotion();
  useEffect(() => {
    if (systemReduced) return;
    const animation = resultRef.current?.animate(
      [
        { transform: "scale(0.8) rotate(-12deg)" },
        { transform: "scale(1) rotate(0deg)" },
      ],
      { duration: 480, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
    );
    return () => animation?.cancel();
  }, [systemReduced]);
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
              <span className="winner-badge">승리</span>
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
