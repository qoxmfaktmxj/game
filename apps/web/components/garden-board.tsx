"use client";
import { useEffect, useState } from "react";
import type { GameViewMap } from "@moyeotable/contracts";
import { BoardFrame, memberName, type BoardProps } from "./game-ui";
import { Plus, RotateCcw, Check, Timer } from "lucide-react";
import { CardArt } from "./card-art";
type Tile = GameViewMap["garden"]["board"][number][number];
const colors = ["coral", "sky", "leaf", "violet"] as const;
const names = { coral: "산호", sky: "하늘", leaf: "초록", violet: "보라" };
function TileButton({
  tile,
  onClick,
  disabled,
  selected = false,
}: {
  tile: Tile;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
}) {
  const color = tile.color ?? tile.jokerColor;
  return (
    <button
      className={`number-tile ${color ?? "joker"} ${selected ? "selected" : ""}`}
      disabled={disabled}
      onClick={onClick}
      aria-label={`${tile.value === null ? "조커 · " : ""}${color ? names[color] : ""} ${tile.value ?? tile.jokerValue ?? "별"}`}
    >
      <CardArt
        game="garden"
        id={tile.value === null ? "joker" : `${tile.color}-${tile.value}`}
        sizes="60px"
      />
      <small>{color ? names[color] : "조커"}</small>
      <strong>{tile.value ?? tile.jokerValue ?? "★"}</strong>
      {tile.value === null && <span>★</span>}
    </button>
  );
}
export function GardenBoard({
  view,
  busy,
  connected,
  onCommand,
  onRules,
}: BoardProps<"garden">) {
  const game = view.game!;
  const [rows, setRows] = useState<Tile[][]>(game.board),
    [chosen, setChosen] = useState<Tile[]>([]),
    [now, setNow] = useState(0);
  const key = JSON.stringify([game.board, game.yourRack, game.activePlayerId]);
  useEffect(() => {
    setRows(structuredClone(game.board));
    setChosen([]);
  }, [key]);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  const active = game.activePlayerId === game.you && !view.paused && connected;
  const disabled = !active || busy;
  const used = new Set([...rows.flat(), ...chosen].map((t) => t.id));
  const rack = game.yourRack.filter((t) => !used.has(t.id));
  const open = game.players.find((p) => p.id === game.you)!.opened;
  const begin = () => {
    if (!game.editing) onCommand({ type: "GARDEN_BEGIN", payload: {} });
  };
  const choose = (tile: Tile, rowIndex?: number) => {
    if (disabled) return;
    begin();
    setChosen((old) => [...old, tile]);
    if (rowIndex !== undefined)
      setRows((old) =>
        old.map((row, i) =>
          i === rowIndex ? row.filter((t) => t.id !== tile.id) : row,
        ),
      );
  };
  const place = (rowIndex?: number) => {
    if (!chosen.length) return;
    setRows((old) =>
      rowIndex === undefined
        ? [...old, [...chosen]]
        : old.map((row, i) => (i === rowIndex ? [...row, ...chosen] : row)),
    );
    setChosen([]);
  };
  const reset = () => {
    setRows(structuredClone(game.board));
    setChosen([]);
    if (game.editing) onCommand({ type: "GARDEN_RESET", payload: {} });
  };
  const seconds = Math.max(
    0,
    Math.ceil(
      (game.remainingMs ?? game.deadline - (now || game.deadline)) / 1000,
    ),
  );
  return (
    <BoardFrame view={view} onRules={onRules}>
      <div className="player-strip">
        {game.players.map((p) => (
          <div
            className={`player-pill ${p.id === game.activePlayerId ? "active" : ""}`}
            key={p.id}
          >
            <strong>
              {memberName(view, p.id)}
              {p.id === game.you ? " · 나" : ""}
            </strong>
            <span>
              타일 {p.rackCount} · {p.opened ? "등록 완료" : "첫 등록 전"}
            </span>
          </div>
        ))}
      </div>
      <div className="board-section-heading">
        <p>
          {open
            ? "묶음을 자유롭게 다시 만들 수 있어요. 내 타일을 1개 이상 놓아 주세요."
            : "첫 등록은 내 타일만으로 30점 이상. 숫자가 같은 묶음이나 연속 숫자를 만드세요."}
        </p>
        <strong className="turn-timer" role="timer">
          <Timer size={16} />
          {seconds}초{game.remainingMs !== null ? " · 멈춤" : ""}
        </strong>
      </div>
      <section className="board-section" aria-label="공용 타일 보드">
        <div className="melds">
          {rows.map((row, i) => (
            <div className="meld-row" key={i}>
              {row.map((tile) => (
                <TileButton
                  key={tile.id}
                  tile={tile}
                  disabled={disabled || !open}
                  onClick={() => choose(tile, i)}
                />
              ))}
              {chosen.length > 0 && open && (
                <button
                  className="icon-button bordered"
                  disabled={disabled}
                  aria-label={`${i + 1}번 묶음에 선택 타일 추가`}
                  onClick={() => place(i)}
                >
                  <Plus size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
        {!rows.length && (
          <p className="board-empty">
            첫 묶음을 놓으면 이곳에서 모두의 숫자가 이어져요.
          </p>
        )}
      </section>
      {active && (
        <section className="tile-selection" aria-label="선택한 타일">
          <div className="tile-rack">
            {chosen.map((tile) => (
              <div key={tile.id}>
                <TileButton
                  tile={tile}
                  selected
                  onClick={() => {
                    if (game.yourRack.some((t) => t.id === tile.id))
                      setChosen((old) => old.filter((t) => t.id !== tile.id));
                  }}
                  disabled={
                    !game.yourRack.some((t) => t.id === tile.id) || busy
                  }
                />
                {tile.value === null && (
                  <div className="joker-settings">
                    <select
                      aria-label="조커 색"
                      value={tile.jokerColor ?? ""}
                      onChange={(e) =>
                        setChosen((old) =>
                          old.map((t) =>
                            t.id === tile.id
                              ? {
                                  ...t,
                                  jokerColor: e.target
                                    .value as Tile["jokerColor"],
                                }
                              : t,
                          ),
                        )
                      }
                    >
                      <option value="" disabled>
                        색
                      </option>
                      {colors.map((c) => (
                        <option key={c} value={c}>
                          {names[c]}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="조커 숫자"
                      value={tile.jokerValue ?? ""}
                      onChange={(e) =>
                        setChosen((old) =>
                          old.map((t) =>
                            t.id === tile.id
                              ? { ...t, jokerValue: Number(e.target.value) }
                              : t,
                          ),
                        )
                      }
                    >
                      <option value="" disabled>
                        숫자
                      </option>
                      {Array.from({ length: 13 }, (_, i) => (
                        <option key={i} value={i + 1}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            className="button secondary"
            disabled={disabled || !chosen.length}
            onClick={() => place()}
          >
            <Plus size={17} /> 선택 타일로 새 묶음
          </button>
          <small>
            보드의 타일을 누르면 이곳으로 가져와 다시 배치할 수 있어요. 조커는
            색과 숫자를 정해 주세요.
          </small>
        </section>
      )}
      <section className="board-section">
        <div className="board-section-heading">
          <h3>
            내 타일 <span>{rack.length}</span>
          </h3>
          <span>남은 풀 {game.poolCount}</span>
        </div>
        <div className="tile-rack">
          {[...rack]
            .sort(
              (a, b) =>
                (a.color ?? "z").localeCompare(b.color ?? "z") ||
                (a.value ?? 0) - (b.value ?? 0),
            )
            .map((tile) => (
              <TileButton
                key={tile.id}
                tile={tile}
                disabled={disabled}
                onClick={() => choose(tile)}
              />
            ))}
        </div>
      </section>
      <div className="action-tray">
        <button
          className="button secondary"
          disabled={disabled}
          onClick={reset}
        >
          <RotateCcw size={16} /> 되돌리기
        </button>
        <button
          className="button secondary"
          disabled={disabled}
          onClick={() => onCommand({ type: "GARDEN_DRAW", payload: {} })}
        >
          {game.poolCount ? "1장 뽑고 차례 마치기" : "놓을 타일 없음 · 통과"}
        </button>
        <button
          className="button primary"
          disabled={
            disabled ||
            chosen.length > 0 ||
            rack.length === game.yourRack.length
          }
          onClick={() =>
            onCommand({
              type: "GARDEN_PLAY",
              payload: {
                board: rows
                  .filter((row) => row.length)
                  .map((row) =>
                    row.map((t) => ({
                      id: t.id,
                      ...(t.value === null
                        ? { jokerColor: t.jokerColor, jokerValue: t.jokerValue }
                        : {}),
                    })),
                  ),
              },
            })
          }
        >
          <Check size={18} /> 배치 확정
        </button>
      </div>
      <p className="game-footnote">
        배치를 확정하기 전까지 친구의 보드는 바뀌지 않아요. 조작 중 60초를
        넘기면 원래 배치로 돌아가고 3장을 받아요.
      </p>
    </BoardFrame>
  );
}
