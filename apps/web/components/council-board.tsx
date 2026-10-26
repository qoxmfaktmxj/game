"use client";
import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Building2,
  Check,
  Coins,
  Crown,
  Moon,
  Shield,
  Sparkles,
} from "lucide-react";
import { BoardFrame, memberName, type BoardProps } from "./game-ui";
import "./council-board.css";
import { CardArt } from "./card-art";

const categoryNames: Record<string, string> = {
  gold: "황금",
  blue: "푸른",
  green: "초록",
  red: "붉은",
  purple: "보랏빛",
};
export function CouncilBoard({
  view,
  busy,
  connected,
  onCommand,
  onRules,
}: BoardProps<"council">) {
  const game = view.game!;
  const mine = game.players.find((player) => player.id === game.you)!;
  const [role, setRole] = useState<number | null>(null),
    [discardRole, setDiscardRole] = useState<number | null>(null);
  const [chosen, setChosen] = useState<string[]>([]),
    [bottomOrder, setBottomOrder] = useState<string[]>([]);
  const [targetPlayer, setTargetPlayer] = useState("");
  const [targetRole, setTargetRole] = useState(2);
  const [demolition, setDemolition] = useState<{
    playerId: string;
    cardId: string;
  } | null>(null);
  const [useObservatory, setUseObservatory] = useState(true),
    [useLibrary, setUseLibrary] = useState(true);
  useEffect(() => {
    setRole(null);
    setDiscardRole(null);
    setChosen([]);
    setBottomOrder([]);
    setDemolition(null);
  }, [view.table.sessionId, game.version]);
  const locked = busy || !connected || view.paused;
  const can = (type: string) => !locked && game.legalActions.includes(type);
  const act = (type: string, payload: Record<string, unknown> = {}) => {
    if (can(type)) onCommand({ type, payload });
  };
  const roleName = (rank: number) =>
    game.roleGuide.find((item) => item.rank === rank)?.name ?? "비공개";
  const availableTarget =
    targetPlayer && game.players.some((player) => player.id === targetPlayer)
      ? targetPlayer
      : (game.players.find((player) => player.id !== game.you)?.id ?? game.you);
  const toggle = (id: string, limit = 66) =>
    setChosen((items) =>
      items.includes(id)
        ? items.filter((item) => item !== id)
        : items.length < limit
          ? [...items, id]
          : items,
    );
  const remaining = game.choice
    .filter((card) => !chosen.includes(card.id))
    .map((card) => card.id);
  const orderedRemaining = [
    ...bottomOrder.filter((id) => remaining.includes(id)),
    ...remaining.filter((id) => !bottomOrder.includes(id)),
  ];
  const shiftBottom = (index: number, direction: number) => {
    const order = [...orderedRemaining];
    [order[index], order[index + direction]] = [
      order[index + direction]!,
      order[index]!,
    ];
    setBottomOrder(order);
  };
  const turn = game.activePlayerId === game.you;
  return (
    <BoardFrame view={view} onRules={onRules}>
      <div className="council-roundline">
        <span>
          <Moon size={16} />{" "}
          {game.round ? `${game.round}번째 밤` : "도시의 첫날"}
        </span>
        <span>
          <Crown size={16} /> {memberName(view, game.crownPlayerId)}
        </span>
        <span>남은 건물 {game.deckCount}장</span>
        {game.endingRound !== null && <strong>마지막 라운드</strong>}
      </div>
      <div className="council-roles-strip" aria-label="역할 호출 순서">
        {game.roleGuide.map((item) => (
          <div
            key={item.rank}
            className={`${game.activeRole === item.rank ? "current" : ""} ${game.faceUpRoles.includes(item.rank) || game.assassinatedRole === item.rank ? "unavailable" : ""}`}
            title={item.text}
          >
            <b>{item.rank}</b>
            <span>{item.name}</span>
            {game.yourRoles.includes(item.rank) && <small>나</small>}
          </div>
        ))}
      </div>
      <div className="multi-players">
        {game.players.map((player) => (
          <div
            key={player.id}
            className={`multi-player ${player.id === game.activePlayerId ? "active-player" : ""}`}
          >
            <strong>
              {memberName(view, player.id)}{" "}
              {player.id === game.you && <small>나</small>}
            </strong>
            <span className="council-gold">
              <Coins size={15} /> {player.gold}
              <Building2 size={15} /> {player.city.length}/8
              <span>손패 {player.handCount}</span>
            </span>
            <small>
              {player.revealedRoles.length
                ? player.revealedRoles.map(roleName).join(", ")
                : "역할을 비밀리에 고르는 중"}
            </small>
          </div>
        ))}
      </div>
      <div className="multi-workspace">
        <div className="multi-main">
          {game.phase === "CROWN" && (
            <section className="multi-panel council-step">
              <h3>첫 왕관은 누구에게?</h3>
              <p>
                가장 연장자를 골라 주세요. 첫 왕관을 받은 사람이 역할을 먼저
                고릅니다.
              </p>
              {turn ? (
                <div className="multi-actions">
                  <select
                    aria-label="첫 왕관을 받을 사람"
                    value={targetPlayer || game.you}
                    onChange={(event) => setTargetPlayer(event.target.value)}
                  >
                    {game.players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {memberName(view, player.id)}
                      </option>
                    ))}
                  </select>
                  <button
                    className="button primary"
                    disabled={!can("COUNCIL_CROWN")}
                    onClick={() =>
                      act("COUNCIL_CROWN", {
                        playerId: targetPlayer || game.you,
                      })
                    }
                  >
                    <Crown size={17} /> 왕관 건네기
                  </button>
                </div>
              ) : (
                <p>
                  {memberName(view, game.activePlayerId)}님이 첫 왕관의 주인을
                  고르고 있어요.
                </p>
              )}
            </section>
          )}
          {game.phase === "DRAFT" && (
            <section className="multi-panel council-step">
              <h3>
                {turn ? "오늘 밤, 당신의 역할은?" : "역할을 고르고 있어요"}
              </h3>
              <p>
                {turn
                  ? game.draftNeedsDiscard
                    ? "가질 역할 하나와 이번 밤에 제외할 역할 하나를 골라 주세요."
                    : "다른 사람에게는 역할이 공개되지 않아요."
                  : `${memberName(view, game.activePlayerId)}님의 선택을 기다려요.`}
              </p>
              {turn && (
                <>
                  <div className="council-role-grid">
                    {game.draftChoices.map((rank) => {
                      const item = game.roleGuide.find(
                        (item) => item.rank === rank,
                      )!;
                      return (
                        <button
                          key={rank}
                          className={`council-role-card ${role === rank ? "selected" : ""}`}
                          aria-pressed={role === rank}
                          disabled={locked}
                          onClick={() => {
                            setRole(rank);
                            if (discardRole === rank) setDiscardRole(null);
                          }}
                        >
                          <CardArt game="council" id={`role-${rank}`} />
                          <span>{rank.toString().padStart(2, "0")}</span>
                          <strong>{item.name}</strong>
                          <p>{item.text}</p>
                          {role === rank && <Check size={18} />}
                        </button>
                      );
                    })}
                  </div>
                  {game.draftNeedsDiscard && (
                    <label className="council-select-label">
                      이번 밤에 제외할 역할
                      <select
                        aria-label="제외할 역할"
                        value={discardRole ?? ""}
                        onChange={(event) =>
                          setDiscardRole(Number(event.target.value))
                        }
                      >
                        <option value="" disabled>
                          역할을 고르세요
                        </option>
                        {game.draftChoices
                          .filter((rank) => rank !== role)
                          .map((rank) => (
                            <option key={rank} value={rank}>
                              {rank}. {roleName(rank)}
                            </option>
                          ))}
                      </select>
                    </label>
                  )}
                  <button
                    className="button primary"
                    disabled={
                      !can("COUNCIL_DRAFT") ||
                      role === null ||
                      (game.draftNeedsDiscard && discardRole === null)
                    }
                    onClick={() =>
                      act("COUNCIL_DRAFT", {
                        role,
                        ...(game.draftNeedsDiscard ? { discardRole } : {}),
                      })
                    }
                  >
                    선택 확정 <Check size={17} />
                  </button>
                </>
              )}
            </section>
          )}
          {can("COUNCIL_RESOURCE") && (
            <section className="multi-panel council-step">
              <h3>도시를 위한 자원을 골라요</h3>
              <p>금을 모으거나, 새로운 건물 카드를 받아 보세요.</p>
              <div className="multi-actions">
                <button
                  className="button primary"
                  onClick={() => act("COUNCIL_RESOURCE", { kind: "gold" })}
                >
                  <Coins size={17} /> 금 2 받기
                </button>
                <button
                  className="button secondary"
                  onClick={() =>
                    act("COUNCIL_RESOURCE", {
                      kind: "cards",
                      useObservatory,
                      useLibrary,
                    })
                  }
                >
                  건물 카드 받기
                </button>
              </div>
              {mine.city.some((card) => card.effect === "observatory") && (
                <label className="council-check">
                  <input
                    type="checkbox"
                    checked={useObservatory}
                    onChange={(event) =>
                      setUseObservatory(event.target.checked)
                    }
                  />{" "}
                  별 관측소 사용 · 3장 보기
                </label>
              )}
              {mine.city.some((card) => card.effect === "library") && (
                <label className="council-check">
                  <input
                    type="checkbox"
                    checked={useLibrary}
                    onChange={(event) => setUseLibrary(event.target.checked)}
                  />{" "}
                  청람 서고 사용 · 2장 보관
                </label>
              )}
            </section>
          )}
          {game.phase === "CHOOSE_CARDS" && turn && (
            <section className="multi-panel council-step">
              <h3>가져갈 건물 {game.keepCount}장을 골라요</h3>
              <div className="multi-card-grid">
                {game.choice.map((card) => (
                  <button
                    className={`council-district ${chosen.includes(card.id) ? "selected" : ""}`}
                    data-category={card.category}
                    key={card.id}
                    aria-pressed={chosen.includes(card.id)}
                    disabled={locked}
                    onClick={() => toggle(card.id, game.keepCount)}
                  >
                    <CardArt game="council" id={card.kind} />
                    <span>{categoryNames[card.category]} 구역</span>
                    <strong>{card.name}</strong>
                    <b>
                      <Coins size={15} /> {card.cost}
                    </b>
                    <p>
                      {card.text ||
                        "도시에 세우면 건설 비용만큼 점수를 얻어요."}
                    </p>
                  </button>
                ))}
              </div>
              {orderedRemaining.length > 1 && (
                <div className="council-bottom-order">
                  <p>남은 카드가 덱 아래로 들어가는 순서</p>
                  {orderedRemaining.map((id, index) => (
                    <div key={id}>
                      <span>
                        {index + 1}.{" "}
                        {game.choice.find((card) => card.id === id)?.name}
                      </span>
                      <button
                        className="icon-button"
                        aria-label="덱 아래 순서 앞으로"
                        disabled={index === 0 || locked}
                        onClick={() => shiftBottom(index, -1)}
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label="덱 아래 순서 뒤로"
                        disabled={
                          index === orderedRemaining.length - 1 || locked
                        }
                        onClick={() => shiftBottom(index, 1)}
                      >
                        <ArrowDown size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                className="button primary"
                disabled={
                  !can("COUNCIL_KEEP") || chosen.length !== game.keepCount
                }
                onClick={() =>
                  act("COUNCIL_KEEP", {
                    cardIds: chosen,
                    bottomOrder: orderedRemaining,
                  })
                }
              >
                {chosen.length}/{game.keepCount}장 · 가져오기
              </button>
            </section>
          )}
          {game.phase === "GRAVEYARD" && game.recovery && (
            <section className="multi-panel council-step">
              <h3>기억 속 건물을 되찾을까요?</h3>
              <p>
                {game.recovery.card.name}이 철거됐어요.{" "}
                {memberName(view, game.recovery.playerId)}님은 금 1을 내고
                손패로 가져올 수 있어요.
              </p>
              {turn && (
                <div className="multi-actions">
                  <button
                    className="button primary"
                    disabled={!can("COUNCIL_RECOVER")}
                    onClick={() => act("COUNCIL_RECOVER", { take: true })}
                  >
                    금 1 · 가져오기
                  </button>
                  <button
                    className="button secondary"
                    disabled={!can("COUNCIL_RECOVER")}
                    onClick={() => act("COUNCIL_RECOVER", { take: false })}
                  >
                    지나가기
                  </button>
                </div>
              )}
            </section>
          )}
          <section className="multi-panel">
            <div className="multi-panel-heading">
              <h3>우리들의 도시</h3>
              {can("COUNCIL_DESTROY") && (
                <span>철거할 건물을 선택할 수 있어요</span>
              )}
            </div>
            <div className="council-cities">
              {game.players.map((player) => (
                <div className="council-city" key={player.id}>
                  <h4>
                    {memberName(view, player.id)}{" "}
                    <span>{player.city.length}개 구역</span>
                    {player.revealedRoles.includes(5) && <Shield size={15} />}
                  </h4>
                  {player.city.length ? (
                    <div className="council-city-cards">
                      {player.city.map((card) => (
                        <button
                          key={card.id}
                          className={`council-district compact ${demolition?.cardId === card.id ? "selected" : ""}`}
                          data-category={card.category}
                          disabled={
                            !can("COUNCIL_DESTROY") ||
                            player.city.length >= 8 ||
                            card.effect === "keep" ||
                            player.revealedRoles.includes(5)
                          }
                          title={card.text || `${card.cost}점의 구역`}
                          aria-pressed={demolition?.cardId === card.id}
                          onClick={() =>
                            setDemolition({
                              playerId: player.id,
                              cardId: card.id,
                            })
                          }
                        >
                          <CardArt game="council" id={card.kind} />
                          <span>{categoryNames[card.category]}</span>
                          <strong>{card.name}</strong>
                          <b>{card.cost}</b>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="council-empty-city">
                      첫 번째 건물을 기다리는 자리
                    </p>
                  )}
                </div>
              ))}
            </div>
            {demolition && (
              <div className="multi-actions">
                <button
                  className="button danger"
                  disabled={!can("COUNCIL_DESTROY")}
                  onClick={() =>
                    act("COUNCIL_DESTROY", {
                      targetPlayerId: demolition.playerId,
                      cardId: demolition.cardId,
                    })
                  }
                >
                  선택한 건물 철거하고 차례 끝내기
                </button>
                <button
                  className="button secondary"
                  onClick={() => setDemolition(null)}
                >
                  선택 취소
                </button>
              </div>
            )}
          </section>
          <div className="council-hand-workspace">
            <section className="multi-panel multi-hand">
              <div className="multi-panel-heading">
                <h3>
                  나의 건물 카드 <span>{game.yourHand.length}</span>
                </h3>
                <span>
                  <Coins size={16} /> 금 {mine.gold}
                </span>
              </div>
              <p>
                건설은 자원을 받은 뒤에 할 수 있어요. 교환이나 연구소에 쓸
                카드는 체크해서 골라 주세요.
              </p>
              <div className="council-hand">
                {game.yourHand.map((card) => (
                  <div
                    key={card.id}
                    className={`council-hand-card council-district ${chosen.includes(card.id) ? "selected" : ""}`}
                    data-category={card.category}
                  >
                    <CardArt game="council" id={card.kind} />
                    <label className="council-card-select">
                      <input
                        type="checkbox"
                        aria-label={`${card.name} 선택`}
                        disabled={
                          locked || !turn || game.phase === "CHOOSE_CARDS"
                        }
                        checked={chosen.includes(card.id)}
                        onChange={() => toggle(card.id)}
                      />
                      <span>{categoryNames[card.category]} 구역</span>
                    </label>
                    <strong>{card.name}</strong>
                    <b>
                      <Coins size={15} /> {card.cost}
                    </b>
                    <p>
                      {card.text ||
                        "도시에 세우면 건설 비용만큼 점수를 얻어요."}
                    </p>
                    <button
                      className="button secondary"
                      disabled={
                        !can("COUNCIL_BUILD") ||
                        mine.gold < card.cost ||
                        mine.city.some((built) => built.kind === card.kind)
                      }
                      onClick={() => act("COUNCIL_BUILD", { cardId: card.id })}
                    >
                      금 {card.cost} · 건설
                    </button>
                  </div>
                ))}
              </div>
            </section>
            {turn && (game.phase === "RESOURCE" || game.phase === "ACTION") && (
              <section className="multi-panel council-action-panel">
                <h3>역할과 도시의 능력</h3>
                {can("COUNCIL_INCOME") && (
                  <button
                    className="button secondary full"
                    onClick={() => act("COUNCIL_INCOME")}
                  >
                    <Coins size={16} /> 구역 수입 받기
                  </button>
                )}
                {can("COUNCIL_POWER") && [1, 2].includes(game.activeRole) && (
                  <div className="council-power">
                    <label>
                      지목할 역할
                      <select
                        aria-label="능력 대상으로 지목할 역할"
                        value={targetRole}
                        onChange={(event) =>
                          setTargetRole(Number(event.target.value))
                        }
                      >
                        {game.roleGuide
                          .filter((role) => role.rank >= 2)
                          .map((role) => (
                            <option
                              key={role.rank}
                              value={role.rank}
                              disabled={
                                game.activeRole === 2 &&
                                role.rank === game.assassinatedRole
                              }
                            >
                              {role.rank}. {role.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <button
                      className="button secondary full"
                      disabled={
                        game.activeRole === 2 &&
                        targetRole === game.assassinatedRole
                      }
                      onClick={() => act("COUNCIL_POWER", { targetRole })}
                    >
                      이 역할 지목하기
                    </button>
                  </div>
                )}
                {can("COUNCIL_POWER") && game.activeRole === 3 && (
                  <div className="council-power">
                    <label>
                      손패를 바꿀 사람
                      <select
                        aria-label="손패를 교환할 사람"
                        value={availableTarget}
                        onChange={(event) =>
                          setTargetPlayer(event.target.value)
                        }
                      >
                        {game.players
                          .filter((player) => player.id !== game.you)
                          .map((player) => (
                            <option key={player.id} value={player.id}>
                              {memberName(view, player.id)} ({player.handCount}
                              장)
                            </option>
                          ))}
                      </select>
                    </label>
                    <button
                      className="button secondary full"
                      onClick={() =>
                        act("COUNCIL_POWER", {
                          kind: "swap",
                          targetPlayerId: availableTarget,
                        })
                      }
                    >
                      손패 전체 교환
                    </button>
                    <p>또는 손패에서 바꿀 카드를 선택하세요.</p>
                    <button
                      className="button secondary full"
                      disabled={!chosen.length}
                      onClick={() =>
                        act("COUNCIL_POWER", { kind: "cycle", cardIds: chosen })
                      }
                    >
                      선택한 {chosen.length}장 새로 받기
                    </button>
                  </div>
                )}
                {can("COUNCIL_LAB") && (
                  <button
                    className="button secondary full"
                    disabled={chosen.length !== 1}
                    onClick={() => act("COUNCIL_LAB", { cardId: chosen[0] })}
                  >
                    빛 연구소 · 선택한 1장 → 금 1
                  </button>
                )}
                {can("COUNCIL_SMITHY") && (
                  <button
                    className="button secondary full"
                    onClick={() => act("COUNCIL_SMITHY")}
                  >
                    <Sparkles size={16} /> 금 2 → 카드 3장
                  </button>
                )}
                {can("COUNCIL_END") && (
                  <div className="council-end-turn">
                    <p>
                      이번 차례 건설 {game.buildsUsed}/{game.buildLimit}
                    </p>
                    <button
                      className="button primary full"
                      onClick={() => act("COUNCIL_END")}
                    >
                      차례 마치기
                    </button>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
        <aside className="multi-sidebar">
          <section className="multi-panel">
            <h3>나의 역할</h3>
            {game.yourRoles.length ? (
              game.yourRoles.map((rank) => (
                <div className="council-my-role" key={rank}>
                  <CardArt game="council" id={`role-${rank}`} />
                  <b>
                    {rank}. {roleName(rank)}
                  </b>
                  <p>
                    {game.roleGuide.find((role) => role.rank === rank)?.text}
                  </p>
                </div>
              ))
            ) : (
              <p>아직 역할을 고르지 않았어요.</p>
            )}
            {turn && game.activeRole > 0 && (
              <span className="council-active-role">
                지금은 {roleName(game.activeRole)}의 차례
              </span>
            )}
          </section>
        </aside>
      </div>
    </BoardFrame>
  );
}
