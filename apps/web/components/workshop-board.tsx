"use client";
import { useEffect, useState } from "react";
import type { GameViewMap } from "@moyeotable/contracts";
import { BoardFrame, memberName, type BoardProps } from "./game-ui";
import { Gem, Bookmark, Check, X } from "lucide-react";
import { CardArt } from "./card-art";
type View = GameViewMap["workshop"];
type Work = View["market"][number][number];
type Color = Work["bonus"];
type Token = Color | "gold";
const colors: Color[] = ["white", "blue", "green", "red", "black"];
const tokens: Token[] = [...colors, "gold"];
const names: Record<Token, string> = {
  white: "백광",
  blue: "청광",
  green: "녹광",
  red: "홍광",
  black: "흑광",
  gold: "금빛",
};
const zero = () => ({ white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 });
function Cost({ cost }: { cost: Record<Color, number> }) {
  return (
    <span className="work-cost">
      {colors
        .filter((c) => cost[c] > 0)
        .map((c) => (
          <span
            className={`token token-${c}`}
            key={c}
            title={names[c]}
            aria-label={`${names[c]} ${cost[c]}`}
          >
            <span aria-hidden="true">{names[c].slice(0, 1)}</span>
            {cost[c]}
          </span>
        ))}
    </span>
  );
}
function WorkCard({
  work,
  selected,
  onClick,
  disabled,
}: {
  work: Work;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={`work-card work-${work.bonus} ${selected ? "selected" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={`${names[work.bonus]} 작품 ${work.id.slice(2)} · ${work.points}점 · 비용 ${
        colors
          .filter((c) => work.cost[c] > 0)
          .map((c) => `${names[c]} ${work.cost[c]}`)
          .join(", ") || "없음"
      } · ${names[work.bonus]} 영구 할인 1`}
    >
      <span className="work-card-top">
        <strong>
          {work.points}
          <small>점</small>
        </strong>
        <Gem size={24} />
      </span>
      <CardArt game="workshop" id={work.id} />
      <span className="work-card-name">
        {names[work.bonus]} 작품{" "}
        <small>{work.id.slice(2).padStart(2, "0")}</small>
      </span>
      <Cost cost={work.cost} />
      <span className="work-bonus">영구 할인 · {names[work.bonus]} +1</span>
    </button>
  );
}
export function WorkshopBoard({
  view,
  busy,
  connected,
  onCommand,
  onRules,
}: BoardProps<"workshop">) {
  const game = view.game!,
    mine = game.players.find((p) => p.id === game.you)!;
  const [selected, setSelected] = useState<string | null>(null),
    [take, setTake] = useState<Color[]>([]),
    [returned, setReturned] = useState(zero),
    [payment, setPayment] = useState(zero);
  useEffect(() => {
    setSelected(null);
    setTake([]);
    setReturned(zero());
  }, [game.version]);
  const disabled =
    busy || !connected || view.paused || game.activePlayerId !== game.you;
  const works = [...game.market.flat(), ...game.yourReserved],
    work = works.find((w) => w.id === selected);
  const choose = (w: Work) => {
    setSelected(w.id);
    const pay = zero();
    for (const c of colors) {
      const need = Math.max(0, w.cost[c] - mine.bonuses[c]);
      pay[c] = Math.min(need, mine.tokens[c]);
      pay.gold += need - pay[c];
    }
    setPayment(pay);
  };
  const excess = tokens.reduce((n, c) => n + mine.tokens[c], 0) - 10;
  const returnTotal = tokens.reduce((n, c) => n + returned[c], 0);
  const changePayment = (c: Color, value: number) => {
    if (!work) return;
    setPayment((old) => {
      const next = { ...old, [c]: value };
      next.gold = colors.reduce(
        (n, color) =>
          n + Math.max(0, work.cost[color] - mine.bonuses[color]) - next[color],
        0,
      );
      return next;
    });
  };
  const allTakeDistinct = new Set(take).size === take.length;
  const samePair =
    take.length === 2 && take[0] === take[1] && game.bank[take[0]] >= 4;
  const validTake =
    samePair ||
    (allTakeDistinct &&
      take.length ===
        Math.min(3, colors.filter((c) => game.bank[c] > 0).length) &&
      take.length > 0);
  return (
    <BoardFrame view={view} onRules={onRules}>
      <div className="player-strip">
        {game.players.map((p) => (
          <details
            className={`player-pill ${p.id === game.activePlayerId ? "active" : ""}`}
            key={p.id}
          >
            <summary>
              <strong>
                {memberName(view, p.id)}
                {p.id === game.you ? " · 나" : ""}
              </strong>
              <b>{p.points}점</b>
              <span>
                작품 {p.owned.length} · 예약 {p.reservedCount}
              </span>
            </summary>
            <div className="token-bar">
              {tokens.map((c) => (
                <span className={`token token-${c}`} key={c}>
                  {names[c]} {p.tokens[c]}
                </span>
              ))}
            </div>
            <p>영구 할인</p>
            <Cost cost={p.bonuses} />
            <div className="owned-works">
              {p.owned.map((w) => (
                <WorkCard work={w} key={w.id} disabled />
              ))}
            </div>
          </details>
        ))}
      </div>
      {game.finalRound && (
        <p className="game-notice">
          마지막 라운드예요. 모두 같은 횟수의 차례를 마치면 점수를 비교해요.
        </p>
      )}
      <section className="board-section">
        <div className="board-section-heading">
          <h3>후원자</h3>
          <span>조건 달성 시 한 차례에 한 명 · 각각 3점</span>
        </div>
        <div className="patron-row">
          {game.patrons.map((p) => (
            <button
              key={p.id}
              className={`patron-card ${game.eligiblePatronIds.includes(p.id) ? "eligible" : ""}`}
              disabled={
                disabled ||
                game.phase !== "PATRON" ||
                !game.eligiblePatronIds.includes(p.id)
              }
              onClick={() =>
                onCommand({
                  type: "WORKSHOP_PATRON",
                  payload: { patronId: p.id },
                })
              }
            >
              <CardArt game="workshop" id={p.id} />
              <strong>
                후원자 {p.id.slice(2)} <span>3점</span>
              </strong>
              <Cost cost={p.cost} />
              {game.phase === "PATRON" &&
                game.eligiblePatronIds.includes(p.id) && (
                  <small>이 후원자 선택</small>
                )}
            </button>
          ))}
        </div>
      </section>
      <section className="work-market" aria-label="공개 작품 시장">
        <p className="game-footnote">
          작품을 선택해 완성하거나 예약해요. 작은 화면에서는 각 줄을 옆으로 넘겨
          볼 수 있어요.
        </p>
        {[2, 1, 0].map((level) => (
          <div className="market-row" key={level}>
            <button
              className="work-deck"
              disabled={
                disabled ||
                game.phase !== "ACTION" ||
                mine.reservedCount >= 3 ||
                game.deckCounts[level] === 0
              }
              onClick={() =>
                onCommand({
                  type: "WORKSHOP_RESERVE",
                  payload: { level: level + 1 },
                })
              }
            >
              <Bookmark size={20} />
              <strong>{level + 1}단계</strong>
              <span>{game.deckCounts[level]}장</span>
              <small>비공개 예약</small>
            </button>
            {game.market[level].map((w) => (
              <WorkCard
                key={w.id}
                work={w}
                selected={w.id === selected}
                onClick={() => choose(w)}
                disabled={disabled || game.phase !== "ACTION"}
              />
            ))}
          </div>
        ))}
      </section>
      <section className="board-section">
        <div className="board-section-heading">
          <h3>빛 보관소</h3>
          <span>서로 다른 3개 또는 4개 이상 남은 색 2개</span>
        </div>
        <div className="token-bar bank-tokens">
          {colors.map((c) => (
            <button
              key={c}
              className={`token token-${c} ${take.includes(c) ? "selected" : ""}`}
              disabled={
                disabled ||
                game.phase !== "ACTION" ||
                game.bank[c] === 0 ||
                take.length >= 3
              }
              onClick={() => setTake((old) => [...old, c])}
            >
              <Gem size={20} />
              <strong>{names[c]}</strong>
              <span>{game.bank[c]}</span>
              {take.includes(c) && (
                <small>선택 {take.filter((x) => x === c).length}</small>
              )}
            </button>
          ))}
          <div className="token token-gold">
            <Gem size={20} />
            <strong>금빛</strong>
            <span>{game.bank.gold}</span>
            <small>예약할 때 받아요</small>
          </div>
        </div>
        {game.phase === "ACTION" && (
          <div className="action-tray">
            <span>
              {take.length
                ? take.map((c) => names[c]).join(" · ")
                : "가져올 빛을 골라 주세요"}
            </span>
            <button
              className="button secondary"
              onClick={() => setTake([])}
              disabled={disabled || !take.length}
            >
              <X size={16} /> 선택 취소
            </button>
            <button
              className="button primary"
              disabled={disabled || !validTake}
              onClick={() =>
                onCommand({ type: "WORKSHOP_TAKE", payload: { colors: take } })
              }
            >
              선택한 빛 가져오기
            </button>
          </div>
        )}
      </section>
      <section className="board-section">
        <div className="board-section-heading">
          <h3>나의 공방</h3>
          <span>{mine.points}점 / 15점</span>
        </div>
        <div className="token-bar">
          {tokens.map((c) => (
            <span className={`token token-${c}`} key={c}>
              {names[c]} <b>{mine.tokens[c]}</b>
            </span>
          ))}
        </div>
        <p>영구 할인</p>
        <Cost cost={mine.bonuses} />
        <h4>예약 작품 {game.yourReserved.length}/3</h4>
        <div className="reserved-works">
          {game.yourReserved.map((w) => (
            <WorkCard
              key={w.id}
              work={w}
              selected={w.id === selected}
              onClick={() => choose(w)}
              disabled={disabled || game.phase !== "ACTION"}
            />
          ))}
          {!game.yourReserved.length && <p>예약한 작품은 나에게만 보여요.</p>}
        </div>
      </section>
      {game.phase === "RETURN" && game.activePlayerId === game.you && (
        <section className="board-section action-panel">
          <h3>빛 {excess}개를 돌려주세요</h3>
          <p>
            차례가 끝날 때는 최대 10개까지 가질 수 있어요. 방금 받은 빛도 돌려줄
            수 있어요.
          </p>
          <div className="token-bar">
            {tokens.map((c) => (
              <label className={`game-field token token-${c}`} key={c}>
                {names[c]}
                <select
                  aria-label={`반환할 ${names[c]}`}
                  value={returned[c]}
                  onChange={(e) =>
                    setReturned((old) => ({
                      ...old,
                      [c]: Number(e.target.value),
                    }))
                  }
                >
                  {Array.from({ length: mine.tokens[c] + 1 }, (_, i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <button
            className="button primary"
            disabled={disabled || returnTotal !== excess}
            onClick={() =>
              onCommand({
                type: "WORKSHOP_RETURN",
                payload: { tokens: returned },
              })
            }
          >
            <Check size={17} /> {returnTotal}/{excess}개 반환
          </button>
        </section>
      )}
      {work && game.phase === "ACTION" && (
        <section className="board-section action-panel">
          <div className="board-section-heading">
            <h3>
              {names[work.bonus]} 작품 {work.id.slice(2)}
            </h3>
            <button
              className="icon-button"
              aria-label="작품 선택 닫기"
              onClick={() => setSelected(null)}
            >
              <X size={18} />
            </button>
          </div>
          <p>지불할 빛을 선택해요. 색 토큰 대신 금빛을 사용할 수도 있어요.</p>
          <div className="token-bar">
            {colors
              .filter((c) => work.cost[c] > mine.bonuses[c])
              .map((c) => (
                <label className={`game-field token token-${c}`} key={c}>
                  {names[c]}
                  <select
                    aria-label={`지불할 ${names[c]}`}
                    value={payment[c]}
                    onChange={(e) => changePayment(c, Number(e.target.value))}
                  >
                    {Array.from(
                      {
                        length:
                          Math.min(
                            mine.tokens[c],
                            Math.max(0, work.cost[c] - mine.bonuses[c]),
                          ) + 1,
                      },
                      (_, i) => (
                        <option key={i} value={i}>
                          {i}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              ))}
            <span className="token token-gold">
              금빛 {payment.gold} / 보유 {mine.tokens.gold}
            </span>
          </div>
          <div className="action-tray">
            <button
              className="button primary"
              disabled={disabled || payment.gold > mine.tokens.gold}
              onClick={() =>
                onCommand({
                  type: "WORKSHOP_BUY",
                  payload: { cardId: work.id, payment },
                })
              }
            >
              <Check size={17} /> 작품 완성
            </button>
            {!game.yourReserved.some((w) => w.id === work.id) && (
              <button
                className="button secondary"
                disabled={disabled || mine.reservedCount >= 3}
                onClick={() =>
                  onCommand({
                    type: "WORKSHOP_RESERVE",
                    payload: { cardId: work.id },
                  })
                }
              >
                <Bookmark size={17} /> 예약하고 금빛 받기
              </button>
            )}
          </div>
        </section>
      )}
    </BoardFrame>
  );
}
