"use client";
import type { ReactNode } from "react";
import type { GameKey, RoomView } from "@moyeotable/contracts";
import { GAME_CATALOG } from "@moyeotable/game-core/catalog";
import { BookOpen, WifiOff } from "lucide-react";
export type GameAction = { type: string; payload: Record<string, unknown> };
export interface BoardProps<K extends GameKey> {
  view: RoomView<K>;
  busy: boolean;
  connected: boolean;
  onCommand: (command: GameAction) => void;
  onRules: () => void;
}
export function BoardFrame({
  view,
  children,
  onRules,
}: {
  view: RoomView;
  children: ReactNode;
  onRules: () => void;
}) {
  const game = view.game;
  const current = view.table.members.find(
    (m) => m.userId === game?.activePlayerId,
  );
  return (
    <div className={`multi-board ${view.gameKey}-board`}>
      <div className="multi-board-heading">
        <div>
          <h2>{GAME_CATALOG[view.gameKey].name}</h2>
          <p aria-live="polite">
            {view.paused
              ? "친구가 다시 연결하면 계속해요"
              : game?.activePlayerId === game?.you
                ? "내 차례예요"
                : current?.control === "bot"
                  ? `${current.nickname}이 생각하고 있어요…`
                  : `${current?.nickname ?? "친구"}님의 차례`}
          </p>
        </div>
        <div className="board-help-links">
          <a
            href={
              view.gameKey === "star-trails"
                ? "/cards"
                : `/cards/${view.gameKey}`
            }
            target="_blank"
            rel="noreferrer"
          >
            카드 그림 ↗
          </a>
          <button className="button secondary" onClick={onRules}>
            <BookOpen size={17} /> 규칙
          </button>
        </div>
      </div>
      {view.paused && (
        <p className="game-notice" role="status">
          <WifiOff size={17} /> 연결을 기다리고 있어요. 현재 상태는 저장되어
          있어요.
        </p>
      )}
      {children}
    </div>
  );
}
export function memberName(view: RoomView, id: string) {
  return view.table.members.find((m) => m.userId === id)?.nickname ?? "친구";
}
