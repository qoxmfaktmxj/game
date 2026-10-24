"use client";
import type { GameKey, RoomView } from "@moyeotable/contracts";
import { GAME_CATALOG } from "@moyeotable/game-core/catalog";
import { Trophy, Check, ArrowRight } from "lucide-react";
import { GardenBoard } from "./garden-board";
import { WorkshopBoard } from "./workshop-board";
import { SignalBoard } from "./signal-board";
import { CouncilBoard } from "./council-board";
import { memberName, type BoardProps } from "./game-ui";
import "./multigame.css";
export function MultiGameBoard(
  props: BoardProps<Exclude<GameKey, "star-trails">>,
) {
  const { view, ...rest } = props;
  switch (view.gameKey) {
    case "garden":
      return <GardenBoard view={view} {...rest} />;
    case "workshop":
      return <WorkshopBoard view={view} {...rest} />;
    case "signal":
      return <SignalBoard view={view} {...rest} />;
    case "council":
      return <CouncilBoard view={view} {...rest} />;
  }
}
export function MultiResultPanel({
  view,
  userId,
  busy,
  onReady,
  onRematch,
}: {
  view: RoomView;
  userId: string;
  busy: boolean;
  onReady: () => void;
  onRematch: () => void;
}) {
  const result = view.result!,
    me = view.table.members.find((m) => m.userId === userId),
    metadata = GAME_CATALOG[view.gameKey];
  const ready =
    view.table.members.length >= metadata.minPlayers &&
    view.table.members.every((m) => m.ready && m.connected);
  return (
    <section className="result-panel multi-results">
      <div className="result-celebration">
        <Trophy size={42} />
        <p>{metadata.name} · 한 판 완료</p>
        <h2>
          {result.tied
            ? "함께 나눈 승리"
            : result.winners.includes(userId)
              ? "멋진 한 판, 이겼어요!"
              : "다음 한 판에서 다시 만나요"}
        </h2>
        <p>
          {result.winners.map((id) => memberName(view, id)).join(" · ")} 승리
        </p>
      </div>
      {result.reason === "BLOCKED_TIE" && (
        <p className="game-notice">
          남은 타일 합계가 같은 공동 승리예요. 이번 판은 모두 점수 합산 없이
          마쳐요.
        </p>
      )}
      <div className="result-scores">
        {result.scores.map((score) => (
          <div
            className={`result-person ${result.winners.includes(score.playerId) ? "winner" : ""}`}
            key={score.playerId}
          >
            <h3>{memberName(view, score.playerId)}</h3>
            <strong>{score.total}점</strong>
          </div>
        ))}
      </div>
      <div className="action-tray">
        <button
          className={`button ${me?.ready ? "secondary" : "primary"}`}
          disabled={busy}
          onClick={onReady}
        >
          <Check size={17} />
          {me?.ready ? "준비 완료 · 취소" : "한 판 더 준비"}
        </button>
        {view.table.hostId === userId && (
          <button
            className="button primary"
            disabled={busy || !ready}
            onClick={onRematch}
          >
            같은 게임 다시 시작 <ArrowRight size={17} />
          </button>
        )}
      </div>
      <p>테이블과 멤버는 그대로예요. 위에서 다른 게임을 선택할 수도 있어요.</p>
    </section>
  );
}
const rules: Record<
  Exclude<GameKey, "star-trails">,
  { intro: string; steps: string[]; notes: string[] }
> = {
  workshop: {
    intro:
      "빛을 모아 작품을 완성하고, 영구 할인과 후원자로 15점을 향해 나아가요.",
    steps: [
      "서로 다른 색 3개를 가져오거나, 보관소에 4개 이상 남은 같은 색 2개를 가져와요. 세 색이 남지 않았다면 남은 색만 가져와요.",
      "작품을 예약하고 금빛 1개를 받아요. 금빛이 없어도 예약할 수 있고, 예약은 최대 3장까지예요. 덱에서 비공개로 예약할 수도 있어요.",
      "공개 작품 또는 내 예약 작품의 비용을 내고 완성해요. 완성한 작품은 같은 색 비용을 1씩 깎아 줘요. 금빛은 어느 색이든 대신할 수 있어요.",
      "턴이 끝날 때 토큰은 최대 10개. 후원자 조건을 달성하면 1명을 얻고, 여러 명이면 직접 선택해요.",
    ],
    notes: [
      "15점 이상이 나오면 마지막 라운드예요. 모두 같은 횟수의 차례를 진행한 뒤 높은 점수가 승리해요. 동점이면 완성한 작품이 적은 사람, 그래도 같으면 공동 승리예요.",
      "이 테이블은 호스트 자리부터 시작해요. 다른 사람의 예약 작품과 덱 순서는 공개하지 않아요.",
    ],
  },
  garden: {
    intro: "같은 숫자 또는 연속 숫자의 묶음을 만들고 내 타일을 먼저 비우세요.",
    steps: [
      "서로 다른 색의 같은 숫자 3~4개, 또는 같은 색의 연속 숫자 3개 이상이 한 묶음이에요. 13 다음에 1을 이을 수 없어요.",
      "첫 등록은 내 타일만으로 합계 30 이상을 만들어요. 조커는 대신하는 숫자만큼 계산해요. 기존 보드는 다음 차례부터 사용할 수 있어요.",
      "등록을 마친 뒤에는 보드의 타일을 나누고 다시 묶을 수 있어요. 내 타일을 최소 1개 내려놓고, 기존 타일을 모두 올바른 묶음에 남겨야 해요.",
      "타일을 눌러 선택하고 새 묶음을 만들거나 기존 묶음의 + 버튼으로 더해요. 조커는 색과 숫자를 지정해요. 배치 확정을 누르면 친구에게 반영돼요.",
    ],
    notes: [
      "한 차례는 60초예요. 조작 없이 시간이 지나면 1장, 미완성 조작 중 시간이 지나면 3장을 받고 원래 배치로 돌아가요. 뽑은 타일은 다음 차례부터 사용해요.",
      "타일을 모두 놓으면 종료해요. 남은 숫자는 감점, 조커는 30점 감점이며 승자는 상대의 감점 합계를 받아요. 풀이 비면 모두 더 놓을 수 없음을 확인한 뒤 남은 값이 가장 작은 사람이 승리해요.",
      "한 판씩 진행하며, 연결이 끊기면 남은 시간이 멈춰요.",
      "풀이 비고 모두 놓을 수 없을 때 남은 값까지 동률이면 공동 승리예요. 이 경우 이번 판은 전원 점수 합산 없이 마쳐요.",
    ],
  },
  council: {
    intro:
      "매 라운드 다른 역할을 고르고, 수입과 능력으로 나의 도시를 완성하세요.",
    steps: [
      "왕관을 가진 자리부터 역할을 비공개로 골라요. 인원에 따라 두 역할을 맡는 규칙도 적용돼요.",
      "역할 번호 순서대로 차례가 와요. 2골드를 받거나 건물 카드 2장 중 1장을 고른 뒤 비용을 내고 건물을 지어요.",
      "내 역할의 능력과 특수 건물의 효과를 사용해요. 같은 이름의 건물은 중복 건설할 수 없어요.",
      "암살·도둑질은 플레이어 이름 대신 역할을 지정해요. 누가 그 역할인지 공개되기 전에는 알 수 없어요.",
    ],
    notes: [
      "한 도시가 8개 건물에 도달하면 현재 라운드까지 진행해요. 건물 가치, 다섯 색 보너스, 완공 보너스와 특수 건물을 합산해요.",
      "기본 역할 8종과 FFG 2010 기본판의 건물을 사용해요. 역할·카드 이름과 그림은 링구링구 자체 콘텐츠예요.",
    ],
  },
  signal: {
    intro: "숨겨진 소속과 서로 다른 능력. 내 편을 찾고 목표를 달성하세요.",
    steps: [
      "기지 대장의 정체만 공개돼요. 수호대는 대장을 돕고, 황혼단은 대장을 쓰러뜨려요. 독행자는 마지막 한 사람이 되어야 해요.",
      "차례가 시작되면 지연 효과를 처리하고 카드 2장을 받아요. 카드를 사용한 뒤 남은 손패를 현재 체력 이하로 줄여 차례를 마쳐요.",
      "공격은 거리와 장비 범위 안의 대상을 골라요. 공격받은 사람은 방어하거나 피해를 받아요. 반응이 끝날 때까지 다음 행동은 기다려요.",
      "공개 장비와 인물 능력으로 거리·카드 수·방어 방식이 달라져요. 손에 든 카드 설명과 행동 메뉴를 확인하세요.",
    ],
    notes: [
      "역할 구성은 4~7명에 따라 달라져요. 생존 인원을 기준으로 거리를 계산하며, 탈락 후에도 테이블에는 남아 결과를 볼 수 있어요.",
      "자세한 인물·카드 효과는 게임 화면에서 확인할 수 있어요. 원작 기본판의 80장과 16인물 규칙을 따릅니다.",
    ],
  },
};
export function ExtraRules({
  gameKey,
}: {
  gameKey: Exclude<GameKey, "star-trails">;
}) {
  const r = rules[gameKey];
  return (
    <div className="extra-rules">
      <p>{r.intro}</p>
      <ol>
        {r.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {r.notes.map((note) => (
        <p key={note}>{note}</p>
      ))}
    </div>
  );
}
