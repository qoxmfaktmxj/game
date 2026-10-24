"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Crosshair,
  Heart,
  Radio,
  Shield,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { BoardFrame, memberName, type BoardProps } from "./game-ui";
import "./signal-board.css";
import { CardArt } from "./card-art";

type SignalGame = NonNullable<BoardProps<"signal">["view"]["game"]>;
type Card = SignalGame["yourHand"][number];
const roles = {
  captain: {
    name: "기지 대장",
    goal: "황혼단과 독행자가 모두 탈락하면 수호대와 함께 승리해요.",
  },
  ally: {
    name: "수호대",
    goal: "기지 대장을 지켜요. 황혼단과 독행자가 모두 탈락하면 함께 승리해요.",
  },
  raider: {
    name: "황혼단",
    goal: "기지 대장이 탈락하면 승리해요. 독행자가 홀로 남는 경우는 제외해요.",
  },
  drifter: {
    name: "독행자",
    goal: "기지 대장을 마지막으로 꺾고 홀로 남으면 승리해요.",
  },
} as const;
const suits = { spades: "♠", hearts: "♥", diamonds: "♦", clubs: "♣" } as const;
const rank = (n: number) =>
  n === 11 ? "J" : n === 12 ? "Q" : n === 13 ? "K" : n === 14 ? "A" : String(n);
const targeted = new Set([
  "strike",
  "evade",
  "challenge",
  "jam",
  "snatch",
  "quarantine",
]);

function CardFace({
  card,
  selected = false,
  disabled = false,
  onClick,
  compact = false,
}: {
  card: Card;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  compact?: boolean;
}) {
  const icon = card.equipment ? (
    <Shield size={25} />
  ) : ["tonic", "pulse"].includes(card.kind) ? (
    <Heart size={25} />
  ) : ["strike", "barrage", "raiders", "challenge"].includes(card.kind) ? (
    <Zap size={25} />
  ) : (
    <Radio size={25} />
  );
  const content = (
    <>
      <span
        className={`signal-card-rank ${card.suit === "hearts" || card.suit === "diamonds" ? "is-red" : ""}`}
      >
        {rank(card.rank)} {suits[card.suit]}
      </span>
      <span className="signal-card-emblem" aria-hidden="true">
        {icon}
      </span>
      <CardArt game="signal" id={card.kind} />
      <strong>{card.name}</strong>
      {!compact && <span className="signal-card-copy">{card.text}</span>}
      {selected && (
        <span className="signal-card-check" aria-hidden="true">
          <Check size={14} />
        </span>
      )}
    </>
  );
  return onClick ? (
    <button
      type="button"
      className={`signal-card ${card.equipment ? "is-equipment" : ""} ${selected ? "is-selected" : ""} ${compact ? "is-compact" : ""}`}
      aria-pressed={selected}
      aria-label={`${card.name}, ${rank(card.rank)} ${suits[card.suit]}. ${card.text}`}
      disabled={disabled}
      onClick={onClick}
    >
      {content}
    </button>
  ) : (
    <div
      className={`signal-card ${card.equipment ? "is-equipment" : ""} ${compact ? "is-compact" : ""}`}
    >
      {content}
    </div>
  );
}

export function SignalBoard({
  view,
  busy,
  connected,
  onCommand,
  onRules,
}: BoardProps<"signal">) {
  const game = view.game;
  const [selected, setSelected] = useState<string[]>([]);
  const [choices, setChoices] = useState<string[]>([]);
  const [targetId, setTargetId] = useState("");
  const [targetCardId, setTargetCardId] = useState("");
  const [showRole, setShowRole] = useState(false);
  const [healing, setHealing] = useState(false);
  const [deathOrder, setDeathOrder] = useState<string[]>([]);
  useEffect(() => {
    setSelected([]);
    setChoices([]);
    setHealing(false);
    setTargetCardId("");
    setDeathOrder([]);
  }, [game?.version]);
  if (!game) return null;
  const me = game.players.find((p) => p.id === game.you)!;
  const disabled = busy || !connected || view.paused;
  const allowed = (action: string) => game.legalActions.includes(action);
  const selectedCards = game.yourHand.filter((c) => selected.includes(c.id));
  const card = selectedCards[0];
  const inDiscard =
    game.phase === "DISCARD" && game.activePlayerId === game.you;
  const inDying = game.phase === "DYING" && game.activePlayerId === game.you;
  const inResponse =
    game.phase === "RESPONSE" && game.activePlayerId === game.you;
  const needed = healing
    ? 2
    : inDiscard
      ? me.handCount - me.health
      : inDying
        ? Math.max(1, 1 - me.health)
        : 1;
  const isMulti = healing || inDiscard || inDying;
  const target = game.players.find((p) => p.id === targetId && p.alive);
  const needsTarget = !!card && targeted.has(card.kind);
  const targetCandidates = game.players.filter(
    (p) =>
      p.alive &&
      (card?.kind === "jam" ||
        card?.kind === "snatch" ||
        card?.kind === "quarantine" ||
        p.id !== game.you) &&
      (card?.kind !== "quarantine" || p.role !== "captain"),
  );
  const send = (type: string, payload: Record<string, unknown> = {}) => {
    if (!disabled) onCommand({ type, payload });
  };
  const toggle = (id: string) =>
    setSelected((ids) =>
      ids.includes(id)
        ? ids.filter((x) => x !== id)
        : isMulti
          ? [...ids, id].slice(-needed)
          : [id],
    );
  const responseMatches = (c: Card) => {
    const dodge =
      game.pending?.mode === "strike" || game.pending?.mode === "barrage";
    return dodge
      ? c.kind === "evade" ||
          (me.character.id === "versatile" && c.kind === "strike")
      : c.kind === "strike" ||
          (me.character.id === "versatile" && c.kind === "evade");
  };
  const canChooseHand = (c: Card) =>
    !disabled &&
    me.alive &&
    (healing || inDiscard || inDying
      ? healing || inDiscard || c.kind === "tonic"
      : inResponse
        ? responseMatches(c)
        : true);
  const personalCards = [...game.yourHand, ...me.equipment];
  const finalOrder =
    deathOrder.length === personalCards.length
      ? deathOrder
      : personalCards.map((c) => c.id);
  const moveDeathCard = (i: number, step: number) => {
    const ids = [...finalOrder],
      j = i + step;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setDeathOrder(ids);
  };
  const signalStatus =
    game.phase === "FINISHED"
      ? "이번 신호가 끝났어요"
      : !me.alive
        ? "진영의 마지막 신호를 지켜봐요"
        : inDying
          ? "치명적인 피해를 받았어요"
          : inResponse
            ? "나에게 신호가 도착했어요"
            : game.activePlayerId === game.you
              ? "어떤 신호를 보낼까요?"
              : `${memberName(view, game.activePlayerId)}님의 선택을 기다려요`;

  return (
    <BoardFrame view={view} onRules={onRules}>
      <div className="signal-command-center">
        <div className="signal-center-title">
          <Radio size={19} />
          <span>OUTPOST / 황혼 관측소</span>
          <span className="signal-live-dot" aria-hidden="true" />
        </div>
        <div className="signal-role-row">
          <div>
            <CardArt
              game="signal"
              id={`character-${me.character.id}`}
              sizes="75px"
            />
            <span className="signal-overline">나의 관측자</span>
            <h3>{me.character.name}</h3>
            <p>{me.character.text}</p>
          </div>
          <button
            type="button"
            className="button secondary"
            aria-expanded={showRole}
            onClick={() => setShowRole((x) => !x)}
          >
            <Shield size={16} />
            {showRole ? "진영 가리기" : "내 진영 보기"}
          </button>
        </div>
        <AnimatePresence>
          {showRole && (
            <motion.div
              className="signal-secret"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <CardArt game="signal" id={`role-${game.yourRole}`} />
              <strong>{roles[game.yourRole].name}</strong>
              <p>{roles[game.yourRole].goal}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <section className="signal-players" aria-label="관측소 참가자">
        {game.players.map((p, i) => (
          <article
            className={`signal-player ${p.id === game.activePlayerId ? "is-active" : ""} ${!p.alive ? "is-eliminated" : ""}`}
            key={p.id}
          >
            <div className="signal-player-top">
              <span className="signal-seat">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3>
                  {memberName(view, p.id)}
                  {p.id === game.you && <span> 나</span>}
                </h3>
                <p>
                  {p.character.name} ·{" "}
                  {p.role &&
                  (p.id !== game.you ||
                    showRole ||
                    p.role === "captain" ||
                    !p.alive ||
                    game.phase === "FINISHED")
                    ? roles[p.role].name
                    : "비밀 진영"}
                </p>
              </div>
              <span
                className="signal-player-count"
                aria-label={`손패 ${p.handCount}장`}
              >
                {p.handCount}
                <span>장</span>
              </span>
            </div>
            <div className="signal-vitals">
              <span
                className="signal-health"
                aria-label={`안정도 ${Math.max(0, p.health)} / ${p.maxHealth}`}
              >
                {Array.from({ length: p.maxHealth }, (_, index) => (
                  <Heart
                    size={13}
                    key={index}
                    fill={index < p.health ? "currentColor" : "none"}
                    opacity={index < p.health ? 1 : 0.25}
                  />
                ))}
              </span>
              <span>
                {!p.alive
                  ? "탈락"
                  : p.distance
                    ? `거리 ${p.distance}`
                    : "내 관측소"}
              </span>
            </div>
            <details className="signal-character-detail">
              <summary>관측자 능력</summary>
              <CardArt game="signal" id={`character-${p.character.id}`} />
              <p>{p.character.text}</p>
            </details>
            <div
              className="signal-equipment"
              aria-label={`${memberName(view, p.id)}의 장비`}
            >
              {p.equipment.length ? (
                p.equipment.map((c) => (
                  <span key={c.id} title={c.text}>
                    <Shield size={11} />
                    {c.name}
                  </span>
                ))
              ) : (
                <span className="signal-no-equipment">장착한 장비 없음</span>
              )}
            </div>
          </article>
        ))}
      </section>

      <div className="signal-field">
        <div className="signal-radar" aria-hidden="true">
          <i />
          <i />
          <i />
          <Radio size={31} />
        </div>
        <div className="signal-field-status">
          <span className="signal-overline">
            {game.turnPlayerId === game.you ? "MY TRANSMISSION" : "ON AIR"}
          </span>
          <h3 aria-live="polite">{signalStatus}</h3>
          <p>
            광선 사거리 {game.weaponRange} · 이번 차례 광선 {game.strikesPlayed}
            회
          </p>
        </div>
        <div className="signal-piles">
          <div className="signal-deck">
            <Radio size={24} />
            <strong>{game.deckCount}</strong>
            <span>남은 카드</span>
          </div>
          {game.discardTop ? (
            <CardFace card={game.discardTop} compact />
          ) : (
            <div className="signal-empty-discard">버린 카드</div>
          )}
        </div>
      </div>

      {game.pending?.cards.length ? (
        <section
          className="signal-choices"
          aria-label="공개 또는 나에게 허용된 선택 카드"
        >
          <div>
            <h3>
              {game.pending.kind === "draw-pick"
                ? "세 장 중 두 장을 골라요"
                : game.pending.kind === "check"
                  ? "사용할 판정 결과를 골라요"
                  : "보급함에서 한 장을 골라요"}
            </h3>
            <p>
              {game.activePlayerId === game.you
                ? `${game.pending.chooseCount}장 선택`
                : `${memberName(view, game.activePlayerId)}님이 선택 중이에요`}
            </p>
          </div>
          <div className="signal-card-row">
            {game.pending.cards.map((c) => (
              <CardFace
                key={c.id}
                card={c}
                selected={choices.includes(c.id)}
                disabled={disabled || !allowed("SIGNAL_CHOOSE")}
                onClick={() =>
                  setChoices((ids) =>
                    ids.includes(c.id)
                      ? ids.filter((x) => x !== c.id)
                      : [...ids, c.id].slice(-game.pending!.chooseCount),
                  )
                }
              />
            ))}
          </div>
          {allowed("SIGNAL_CHOOSE") && (
            <button
              className="button primary"
              disabled={disabled || choices.length !== game.pending.chooseCount}
              onClick={() => send("SIGNAL_CHOOSE", { cardIds: choices })}
            >
              선택 확정
            </button>
          )}
        </section>
      ) : null}

      {allowed("SIGNAL_DRAW") && (
        <section className="signal-decision">
          <h3>이번 차례의 첫 카드를 가져와요</h3>
          <div className="signal-actions">
            <button
              className="button primary"
              disabled={disabled}
              onClick={() => send("SIGNAL_DRAW", { source: "deck" })}
            >
              덱에서 2장
            </button>
            {me.character.id === "recycler" && game.discardTop && (
              <button
                className="button secondary"
                disabled={disabled}
                onClick={() => send("SIGNAL_DRAW", { source: "discard" })}
              >
                버린 카드 + 덱 1장
              </button>
            )}
            {me.character.id === "scrounger" && (
              <>
                <label className="signal-select-label">
                  상대
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                  >
                    <option value="">참가자 선택</option>
                    {game.players
                      .filter(
                        (p) => p.alive && p.id !== game.you && p.handCount > 0,
                      )
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {memberName(view, p.id)}
                        </option>
                      ))}
                  </select>
                </label>
                <button
                  className="button secondary"
                  disabled={
                    disabled ||
                    !target ||
                    target.id === game.you ||
                    target.handCount === 0
                  }
                  onClick={() =>
                    send("SIGNAL_DRAW", { source: "player", targetId })
                  }
                >
                  상대 손패 1장 + 덱 1장
                </button>
              </>
            )}
          </div>
        </section>
      )}

      <section className="signal-hand-section" aria-label="내 손패">
        <div className="signal-hand-heading">
          <div>
            <h3>
              내 손패 <span>{game.yourHand.length}</span>
            </h3>
            <p>
              {healing
                ? "회복에 사용할 두 장을 고르세요."
                : inDiscard
                  ? `${needed}장을 골라 버리면 차례가 끝나요. 선택 순서대로 버립니다.`
                  : inDying
                    ? `안정도 1까지 ${needed}회 회복이 필요해요.`
                    : inResponse
                      ? game.pending?.mode === "raiders" ||
                        game.pending?.mode === "duel"
                        ? "광선 카드를 버리거나 피해를 받으세요."
                        : `회피 ${game.pending?.remaining}회가 필요해요.`
                      : "카드를 선택하면 자세한 효과와 행동이 나타나요."}
            </p>
          </div>
          {allowed("SIGNAL_HEAL") && (
            <button
              className={`button ${healing ? "primary" : "secondary"}`}
              aria-pressed={healing}
              onClick={() => {
                setHealing((x) => !x);
                setSelected([]);
              }}
              disabled={disabled}
            >
              <Heart size={15} />
              {healing ? "회복 선택 취소" : "두 장으로 회복"}
            </button>
          )}
        </div>
        <div className="signal-card-row signal-hand">
          {game.yourHand.map((c) => (
            <CardFace
              key={c.id}
              card={c}
              selected={selected.includes(c.id)}
              disabled={!canChooseHand(c)}
              onClick={() => toggle(c.id)}
            />
          ))}
          {!game.yourHand.length && (
            <p className="signal-hand-empty">지금은 손패가 비어 있어요.</p>
          )}
        </div>
        <div className="signal-decision" aria-label="게임 행동">
          {card && !healing && !inDiscard && !inDying && !inResponse && (
            <div className="signal-selected-copy">
              <strong>{card.name}</strong>
              <p>{card.text}</p>
            </div>
          )}
          {healing ? (
            <div className="signal-actions">
              <span>{selected.length}/2장 선택</span>
              <button
                className="button primary"
                disabled={disabled || selected.length !== 2}
                onClick={() => send("SIGNAL_HEAL", { cardIds: selected })}
              >
                두 장을 버리고 안정도 1 회복
              </button>
            </div>
          ) : inDiscard ? (
            <div className="signal-actions">
              <span>
                {selected.length}/{needed}장 선택
              </span>
              <button
                className="button primary"
                disabled={disabled || selected.length !== needed}
                onClick={() => send("SIGNAL_DISCARD", { cardIds: selected })}
              >
                선택한 카드 버리기
              </button>
            </div>
          ) : inDying ? (
            <>
              <div className="signal-actions">
                {allowed("SIGNAL_RESCUE") && (
                  <button
                    className="button primary"
                    disabled={
                      disabled ||
                      selected.length < 1 ||
                      selectedCards.some((c) => c.kind !== "tonic")
                    }
                    onClick={() => send("SIGNAL_RESCUE", { cardIds: selected })}
                  >
                    응급 전지 {selected.length || ""}장 사용
                  </button>
                )}
                <button
                  className="button secondary signal-danger"
                  disabled={disabled}
                  onClick={() =>
                    send("SIGNAL_ACCEPT_ELIMINATION", {
                      discardOrder: finalOrder,
                    })
                  }
                >
                  회복 없이 탈락 확정
                </button>
              </div>
              {personalCards.length > 1 && (
                <details className="signal-discard-order">
                  <summary>탈락 시 버릴 카드 순서 조정</summary>
                  <p>아래쪽 카드가 버림 더미 맨 위에 놓여요.</p>
                  <ol>
                    {finalOrder.map((id, i) => (
                      <li key={id}>
                        <span>
                          {personalCards.find((c) => c.id === id)?.name}
                        </span>
                        <button
                          aria-label={`${i + 1}번째 카드 위로`}
                          disabled={i === 0 || disabled}
                          onClick={() => moveDeathCard(i, -1)}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          aria-label={`${i + 1}번째 카드 아래로`}
                          disabled={i === finalOrder.length - 1 || disabled}
                          onClick={() => moveDeathCard(i, 1)}
                        >
                          <ArrowDown size={14} />
                        </button>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </>
          ) : inResponse ? (
            <div className="signal-actions">
              {allowed("SIGNAL_RESPOND") && (
                <button
                  className="button primary"
                  disabled={
                    disabled ||
                    selected.length !== 1 ||
                    !card ||
                    !responseMatches(card)
                  }
                  onClick={() =>
                    send("SIGNAL_RESPOND", { cardId: selected[0] })
                  }
                >
                  선택 카드로 대응
                </button>
              )}
              {allowed("SIGNAL_SHIELD") && (
                <button
                  className="button secondary"
                  disabled={disabled}
                  onClick={() => send("SIGNAL_SHIELD")}
                >
                  <Shield size={15} />
                  방패 판정
                </button>
              )}
              <button
                className="button secondary signal-danger"
                disabled={disabled}
                onClick={() => send("SIGNAL_TAKE_HIT")}
              >
                피해 1 받기
              </button>
            </div>
          ) : allowed("SIGNAL_PLAY") ? (
            <div className="signal-actions">
              {card && needsTarget && (
                <>
                  <label className="signal-select-label">
                    <Users size={14} />
                    대상
                    <select
                      value={targetId}
                      onChange={(e) => {
                        setTargetId(e.target.value);
                        setTargetCardId("");
                      }}
                    >
                      <option value="">참가자 선택</option>
                      {targetCandidates.map((p) => (
                        <option key={p.id} value={p.id}>
                          {memberName(view, p.id)}
                          {p.distance ? ` · 거리 ${p.distance}` : " · 나"}
                        </option>
                      ))}
                    </select>
                  </label>
                  {(card.kind === "jam" || card.kind === "snatch") &&
                    target && (
                      <label className="signal-select-label">
                        카드
                        <select
                          value={targetCardId}
                          onChange={(e) => setTargetCardId(e.target.value)}
                        >
                          <option value="" disabled={target.handCount === 0}>
                            무작위 손패
                          </option>
                          {target.equipment.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                </>
              )}
              <button
                className="button primary"
                disabled={
                  disabled ||
                  !card ||
                  (needsTarget &&
                    !targetCandidates.some((p) => p.id === targetId)) ||
                  (card.kind === "evade" && me.character.id !== "versatile") ||
                  ((card.kind === "jam" || card.kind === "snatch") &&
                    !!target &&
                    !targetCardId &&
                    target.handCount === 0)
                }
                onClick={() =>
                  card &&
                  send("SIGNAL_PLAY", {
                    cardId: card.id,
                    ...(needsTarget ? { targetId } : {}),
                    ...((card.kind === "jam" || card.kind === "snatch") &&
                    targetCardId
                      ? { targetCardId }
                      : {}),
                  })
                }
              >
                <Crosshair size={15} />
                카드 사용
              </button>
              <button
                className="button secondary"
                disabled={disabled}
                onClick={() => send("SIGNAL_END_TURN")}
              >
                차례 마치기
              </button>
            </div>
          ) : (
            <p className="signal-waiting">
              <Sparkles size={15} />
              {!me.alive
                ? "탈락해도 같은 진영이 승리할 수 있어요."
                : "다른 관측자의 행동을 지켜봐요."}
            </p>
          )}
        </div>
      </section>
      <details className="signal-history">
        <summary>
          관측소 기록 <span>{game.publicLog.length}</span>
        </summary>
        <ol>
          {game.publicLog.map((entry, i) => (
            <li key={`${i}-${entry}`}>{entry}</li>
          ))}
        </ol>
      </details>
    </BoardFrame>
  );
}
