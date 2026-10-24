# 다섯 게임으로 확장하는 구조 제안

2026-10-23 코드 조사. 구현 결정이 아닌 제안이며, 이 문서 작성 중에는 애플리케이션 코드를 수정하지 않았다. 사용자가 추가 네 게임은 공식 기본판 규칙을 따르고 이름·그림을 자체 제작하기로 결정했다. 실제 기본판의 판본·카드 목록·특수 규칙 확정은 게임별 조사 문서가 담당한다. 기존 별길 탐험(`star-trails`)의 2인 단판 규칙은 그대로 둔다.

`codebase-design`의 깊은 Module 원칙을 적용한다. TableService가 알아야 하는 Interface를 줄이고, 게임별 차이를 한 Seam에 모은다. 저장·인증·명령 중복·멤버십의 구현을 게임별로 복제하지 않는다. 반대로 서로 다른 게임의 차례·반응·점수·승리를 억지로 하나의 규칙 함수에 합치지 않는다.

## 지금 강하게 결합된 위치

줄 번호는 조사 당시 기준이다.

| 위치 | 결합 내용 | 확장 시 영향 |
| --- | --- | --- |
| `packages/contracts/src/index.ts:29` | `gameKey`가 `star-trails` 리터럴 | 테이블 선택·목록·로비 모두 한 게임으로 고정 |
| `packages/contracts/src/index.ts:34` | ResultSummary가 2인 Star GameResult를 상속 | 다인 점수, 팀 승리, 역할 승리 표현 불가 |
| `packages/contracts/src/index.ts:41` | RoomView.game이 Star PlayerView | 모든 화면이 손패·별길·PLACE/DRAW를 전제 |
| `packages/contracts/src/index.ts:55` | TableCommand에 선택 변경 없음 | 같은 테이블에서 다른 게임 시작 불가 |
| `packages/contracts/src/index.ts:61` | 명령 종류가 STAR_*와 RESIGN | 다른 게임 명령을 런타임에서 거부 |
| `packages/db/src/index.ts:24` | StoredSession.state가 Star GameState, 버전 리터럴 고정 | 게임별 상태·복구 검증을 구별하지 못함 |
| `packages/db/src/index.ts:65` | validateRecord가 외곽 ID·revision·epoch만 검사 | JSON을 새 타입으로 단순 캐스팅하면 손상 상태를 수용 |
| `packages/db/migrations/001_table_aggregates.sql:11` | document.schemaVersion = 1 CHECK | aggregate v2를 쓰려면 별도 SQL migration 필요 |
| `apps/game-server/src/service.ts:86` | read에서 Star assertInvariants 직접 호출 | 다른 게임 저장 상태를 복구할 수 없음 |
| `apps/game-server/src/service.ts:148` | state.playerIds 전원의 연결 상태 사용 | 탈락한 참가자 이탈도 남은 게임을 멈춤 |
| `apps/game-server/src/service.ts:160` | Star projection 후 phase를 FINISHED로 수정 | 다른 단계 모델과 게임별 종료 투영이 깨짐 |
| `apps/game-server/src/service.ts:178` | 생성 입력 title만 허용, gameKey 고정 | 생성 다이얼로그에서 게임을 전달할 수 없음 |
| `apps/game-server/src/service.ts:202`, `:262` | 초대 링크 1회 사용 | 같은 링크로 여러 명을 초대할 수 없음 |
| `apps/game-server/src/service.ts:226`, `:234` | 정원 2명, 좌석 0/1 배정 | 세 번째 멤버부터 거부하거나 좌석 중복 |
| `apps/game-server/src/service.ts:275` | 명령 필드 allowlist에 gameKey 없음 | SELECT_GAME 추가만으로는 입력이 통과하지 않음 |
| `apps/game-server/src/service.ts:325` | 시작은 정확히 2명, 모두 준비·연결 | 게임별 최소·최대 인원 조건 적용 필요 |
| `apps/game-server/src/service.ts:340` | Star 덱·초기 상태·2인 선공 직접 생성 | 각 게임 setup·특수 인원 규칙을 호스트 모듈이 알게 됨 |
| `apps/game-server/src/service.ts:391` | parseStarCommand가 저장 세션 조회보다 먼저 실행 | 실제 세션의 gameKey로 파서를 선택할 수 없음 |
| `apps/game-server/src/service.ts:417` | apply/assert/FINISHED/getResult 직접 호출 | 다른 게임 규칙이 TableService에 퍼질 위험 |
| `apps/game-server/src/service.ts:426` | 기권 시 2인 점수 계산, 나머지 전원 승리 | 역할·팀·중도 탈락 게임에서 틀린 승리 발생 |
| `apps/game-server/src/server.ts:49` | maxClients=8, 2인 복수 탭 가정 | 최대 인원 테이블의 복수 탭·재접속 수용 부족 |
| `apps/game-server/src/server.ts:201` | health에 단일 gameKey | 실제 지원 목록과 다름 |
| `apps/web/components/moyeotable-app.tsx:429`, `:587` | title만 생성, StarCommand만 전송 | 게임 선택·일반 명령 전달 확장 필요 |
| `apps/web/components/moyeotable-app.tsx:639`, `:767`, `:864`, `:926` | 2인 준비, 인원 분모, [0,1] 좌석 | 로비를 게임 메타데이터 기준으로 전환 |
| `apps/web/components/moyeotable-app.tsx:964`, `:1014`, `:1025` | Star 소개·보드·결과 단일 렌더 | 게임별 렌더러 Seam 필요 |
| `apps/web/components/game-board.tsx:91` | players 중 나/상대 한 명 선택 | 기존 보드는 Star 전용으로 유지해야 함 |
| `apps/web/components/game-board.tsx:448` | 결과의 점수는 모두 다섯 별길 | 공통 결과 헤더와 게임별 상세를 분리 |
| `apps/game-server/src/errors.ts:9` | 알려지지 않은 규칙 오류는 SAVE_FAILED | 새 규칙의 유효하지 않은 행동이 저장 장애로 표시됨 |

## 권장하는 Module과 Seam

### 공개 계약은 판별 가능한 합집합

공개 모듈에는 GameKey, GameMetadata, 명령·View·결과 타입만 둔다. 게임별 순수 엔진의 런타임 함수·전체 덱·저장 상태가 프런트 빌드로 유입되지 않도록 서버 전용 registry와 공개 metadata를 별도 파일로 나눈다. `import type`은 실제 타입 소거를 확인한다.

타입의 형태는 다음처럼 게임 식별자와 내용을 함께 좁힐 수 있어야 한다.

```ts
type GameViews = {
  'star-trails': StarPlayerView;
  // 확정한 네 개의 내부 식별자: 각 게임의 PlayerView
};

type RoomView = {
  [K in GameKey]: {
    protocolVersion: 1;
    gameKey: K;
    table: TableView & { gameKey: K };
    game: GameViewMap[K] | null;
    result: GameResultMap[K] | null;
    paused: boolean;
  }
}[GameKey];
```

협의한 방향은 RoomView 자체를 discriminated union으로 만드는 것이다. 기존 Star PlayerView를 수정하지 않고 보드 진입점에서 `view.gameKey`를 좁힌 뒤 해당 렌더러를 호출한다. `TableView.gameKey`만 검사하면 별개의 `RoomView.game` 합집합은 TypeScript에서 자동으로 좁혀지지 않으므로 RoomView 루트에 discriminator를 둔다. GameStateMap·GameViewMap·GameResultMap·GameCommandMap으로 같은 key의 상관 관계를 보존한다.

공통 View의 최소 정보는 `version`, `you`, `gameKey` 정도다. `activePlayerId` 하나로 모든 유효 행동 주체를 표현하지 않는다. 진행 중인 플레이어 외의 대상이 반응해야 하는 게임이 있다. `phase`는 게임별 타입으로 남긴다.

Star의 `legalCommands`는 완성된 명령 목록이다. 타일 재배열의 모든 합법 배열은 열거할 수 없으므로 다른 게임에 동일한 목록을 강요하지 않는다. 해당 게임 View는 실행 가능한 행동 종류·선택 조건을 전달하고, 완성한 명령의 최종 합법 여부는 순수 엔진이 검증한다. 프런트의 임시 타일 배열은 확정 전 로컬 초안이며, 네트워크 버전이 바뀌면 재검증하거나 초안을 폐기한다.

### 서버 registry는 규칙을 숨기는 깊은 Module

아래는 Interface의 개념이다. TypeScript에서 상태·명령·View를 각각 무관한 union으로 받지 말고 GameKey별 매핑 또는 exhaustive switch로 상관 관계를 유지한다. 편의를 위한 `any`나 전체 상태의 `as` 캐스팅으로 해결하지 않는다.

```ts
interface GameEngine<K extends GameKey> {
  readonly metadata: GameMetadata<K>;
  create(players: string[], entropy: Entropy): GameStateMap[K];
  apply(state: GameStateMap[K], actorId: string, command: unknown, entropy: Entropy): {
    state: GameStateMap[K];
    result: GameResultMap[K] | null;
  };
  project(state: GameStateMap[K], actorId: string, session: {
    paused: boolean;
    result: GameResultMap[K] | null;
  }): GameViewMap[K];
  validate(snapshot: unknown, versions: StoredVersions): GameStateMap[K];
  requiredConnectedPlayers(state: GameStateMap[K]): readonly string[];
}

type Entropy = { randomInt(maxExclusive: number): number; createId(): string };
```

`apply`가 명령 파싱·턴/단계 검사·전이를 함께 담당한다. TableService는 이를 적용하기 전에 저장 세션의 gameKey와 버전으로 올바른 adapter를 찾는다. 네트워크 envelope 파싱은 테이블·세션·commandId·expectedVersion까지 담당하고, payload는 해당 adapter에서 정확한 필드 allowlist와 길이 제한을 검사한다. actorId는 연결 인증에서 가져온다.

공통 private state에는 version·playerIds·phase를 두되 phase의 값은 각 게임이 정의한다. `apply`가 종료 결과를, `requiredConnectedPlayers`가 진행에 필요한 참가자를 제공하므로 TableService는 각 엔진의 내부 `activePlayerIndex`, `players.alive` 등을 알 필요가 없다. 게임별 adapter는 Star에서는 전원, 탈락이 있는 게임에서는 실제로 계속 참여하는 사람 등 규칙에 맞는 값을 반환한다. 인원 검사와 게임별 종료 결과는 엔진이 소유한다. registry는 `{[K in GameKey]: GameEngine<K>}`로 정의하고 작은 exhaustive dispatcher에서 세션 gameKey를 좁혀 상태와 엔진의 타입 상관 관계를 보존한다.

난수와 카드 ID 생성은 주입한다. 새 게임 setup뿐 아니라 재셔플·무작위 대상 선택 등 이후에도 필요한 entropy를 지원한다. 순수 규칙 함수가 직접 Date.now/Math.random/crypto를 호출하지 않는다. 저장에 실패한 전이는 View로 보내지 않으며, 재시도에서 entropy가 달라져도 미승인 상태를 클라이언트가 본 적이 없다는 기존 보장을 유지한다. 승인된 명령 재실행은 receipt가 원래 ACK를 반환하므로 엔진을 다시 호출하지 않는다.

Star engine 자체를 일반화하지 않고 얇은 Star adapter가 기존 create/apply/assert/toPlayerView/getResult 함수를 사용한다. 실제 다른 엔진 네 개가 같은 Seam을 사용하므로 이 추상화는 가상의 확장이 아니다.

### 종료와 기권을 분리

공통 결과 헤더는 `gameKey`, `winners: string[]`, `tied`, 종료 사유와 게임별 결과 데이터다. 동점 승리와 같은 팀의 공동 승리를 같은 의미로 사용하지 않는다. 결과 화면에서 점수 순위와 실제 승리 판정을 혼동하지 않는다. 점수가 없는 게임에는 임의의 점수를 만들지 않는다.

Star 결과의 다섯 별길 상세는 전용 결과 renderer에 남긴다. 일반 헤더는 승리자 표시, 새 판 준비, 같은 테이블에서 다른 게임 선택을 담당한다. 기존 `RESIGN`은 Star의 현재 계약을 유지한다. 다른 게임의 기권을 ‘나머지 모두 승리’로 일반화하지 않는다. 공식 규칙으로 정의되지 않은 중도 종료 정책은 명시적으로 확정하기 전 기능을 노출하지 않는 편이 안전하다.

## 테이블 수명과 게임 선택

- Table은 멤버·초대·호스트를 계속 보유한다. GameSession은 시작마다 새 ID를 가진다.
- `create({title, gameKey?})`의 생략 기본값은 Star로 둔다. 기존 클라이언트와 테스트를 보존한다.
- host 전용 `SELECT_GAME`은 LOBBY 또는 RESULT에서만 허용한다. 진행 중에는 거부한다.
- 선택 변경은 같은 테이블과 멤버를 유지하고 현재 세션을 비운 뒤 LOBBY로 돌아간다. 완료된 결과는 history에 남긴다. 선택 변경·멤버 변경 시 모든 준비를 해제한다.
- 선택 대상의 정원보다 현재 멤버가 많으면 선택을 거부한다. 조용히 멤버를 내보내거나 임의로 관전자로 바꾸지 않는다.
- 게임 메타데이터에 확정된 `minPlayers`/`maxPlayers`를 둔다. 판본마다 인원별 특수 규칙이 있는 게임은 판본이 확정된 다음 값을 기록한다.
- 시작은 min 이상 max 이하이며 현재 참가자 전원이 준비·연결된 경우 허용한다. 최소 인원에 도달해도 준비하지 않은 멤버를 자동 제외하지 않는다.
- 좌석은 사용하지 않는 최소 정수를 배정하고, 게임 시작 시 seat로 정렬한 참가자 목록을 엔진에 전달한다. 인접 거리 계산 게임에서는 해당 세션의 참가자 순서를 고정한다.
- 다인 초대 링크의 remainingUses는 새 링크 생성 시 남은 자리 수로 설정한다. 기존 멤버 재접속은 사용 횟수를 줄이지 않는다. 게임 변경 뒤 초대 정원이 달라질 때 오래된 링크를 폐기하는 정책을 명시한다. 토큰 원문은 지금처럼 저장하지 않는다.
- WebSocket 클라이언트 수는 사람 수와 다르다. maxClients를 지원 최대 인원과 중복 탭·재접속 여유에 맞추고, 사용자별 연결 제한도 고려한다. 실제 입장 정원은 TableService의 영속 멤버 목록으로 검사한다.

## 저장 스키마와 기존 세션 복구

ADR 0001의 테이블 aggregate, 원자적 commit, revision·ownerEpoch CAS를 유지한다. 이 확장은 정규화 DB로 바꿀 이유가 아니다. 다만 `StoredSession`에는 gameKey와 해당 엔진의 규칙·콘텐츠·상태 스키마 버전을 고정하여 현재 선택 게임과 과거 결과를 구분해야 한다.

기존 v1에는 세션 gameKey가 없고 table.gameKey만 있으며 state는 Star다. 기존 파일을 삭제하거나 새 테이블로 대체하지 않는다.

1. raw aggregate를 unknown으로 읽어 외곽 구조를 검증한다.
2. v1에서만 table.gameKey = star-trails, 지원하는 rules/content/schemaVersion을 확인한다.
3. Star 전용 validator로 state를 검사한 뒤 명시적인 upcast로 세션 gameKey와 결과 discriminator를 채운다. history도 같은 변환을 한다.
4. 변환은 읽기 시 메모리에서 수행하고, 다음 정상 CAS commit 시 새 표현을 저장한다. 조회만으로 revision을 올리거나 임의 덮어쓰지 않는다.
5. 미래 버전·알 수 없는 게임·손상 상태는 거부한다. 새 게임으로 추정하거나 빈 세션으로 초기화하지 않는다.

협의한 방향은 aggregate 외곽 schemaVersion=1을 유지하는 것이다. 기존 DB CHECK를 바꾸지 않고 명시적 세션 decoder에서 legacy Star 상태를 upcast한다. 새로운 StoredSession 타입에서는 gameKey가 필수이고, raw legacy 입력에서만 선택적이다. 엔진별 state 스키마 버전은 각 decoder가 검증한다. 이후 aggregate schemaVersion을 올리기로 바뀐다면 DB CHECK를 수정하는 migration도 반드시 추가해야 한다. 현재 운영 DB는 미연결이므로 migration 작성과 적용 검증을 구분한다.

state 플레이어 목록은 session 참가자 목록과 일치해야 한다. 진행 중 상태에 없는 테이블 멤버가 게임 View를 조회할 수 없도록 검사한다. 완료 후 새 멤버 입장 시 이전 개인 정보가 노출되지 않게 세션을 비우는 기존 정책을 유지한다. history를 공개할 때는 저장된 전체 상태를 사용하지 않는다.

## 이행 순서와 검증

1. 공개 GameKey·metadata와 server-only registry를 만들고 Star adapter만 연결한다. 기존 동작을 유지한 상태에서 엔진 테스트 41개, 서비스·네트워크·브라우저 회귀를 통과시킨다.
2. stored session decoder와 v1 호환성 테스트를 추가한다. 기존 PLACE·DRAW·RESULT 및 기권 상태를 재시작 후 복구하고 승인된 commandId가 중복 ACK를 돌려주는지 검증한다.
3. SELECT_GAME·가변 인원·다인 초대를 넣는다. min/max, 정원 초과, 비호스트 선택, 진행 중 선택, 준비 초기화, 좌석 재배정, 새 세션 ID를 검사한다.
4. 게임별 확정 엔진을 하나씩 registry에 추가한다. 각 엔진의 공개 Interface로 규칙·보존·비공개 정보·자연 종료를 검사한다. 내부 필드에 맞춘 호출 순서를 테이블 코드나 테스트에 복사하지 않는다.
5. frontend 게임 선택·보드 dispatcher·게임별 결과·규칙 도움말을 연결한다. 타일 초안처럼 네트워크 상태와 별개인 로컬 상태는 sessionId/version 변경과 재접속에서 정리한다.
6. 최소 인원과 최대 인원에서 실제 독립 Colyseus 클라이언트로 전 판을 진행한다. 진행 중 반응 단계·역할 선택·타일 제출 단계에서 프로세스 재시작과 중복 요청을 검사한다.

반드시 확인할 회귀는 저장 실패 시 무승인·무방송, 사용자/세션/게임 명령 교차 위조 거부, 버전 충돌, 동시 명령 직렬화, 다른 사용자의 손패·역할·덱 비노출, 종료 후 비공개 정보 유지, 제거된 멤버의 View 차단, 같은 테이블의 다른 게임 재시작이다. 기존 자연 종료·재접속 브라우저 테스트를 새 게임 테스트로 대체하지 않는다.

## 구현 전에 특히 주의할 위험

- 공식 ‘기본판’은 판본과 인원에 따른 세부 규칙이 달라질 수 있다. 단순히 게임 이름만 확정하고 특수 카드/역할을 임의 축소하면 사용자 결정과 다르다.
- 장기 진행 게임은 현재 history와 receipts의 무제한 증가 문제를 키운다. 보관 정책은 별도 작업으로 기록하되 승인 중복 방지 기간을 자의적으로 줄이지 않는다.
- 기존 ownerEpoch는 단일 프로세스 운영을 전제로 한다. 게임 수 확대가 멀티 인스턴스 운영을 안전하게 만들지는 않는다.
- 큰 타일 배치 명령은 프레임/HTTP 16KB 제한과 계산량을 함께 점검한다. 서버 입력에 최대 타일 수·중복 ID·모든 타일의 소유권을 제한하고, 해를 찾는 무제한 탐색을 서버 validation에 넣지 않는다.
- 역할 선택과 반응은 손패보다 더 많은 비공개 정보 경로를 만든다. 공개 View는 허용 필드만 새 객체로 작성하고 private state를 spread하지 않는다.
- 새 규칙 오류를 공통 ERROR_MESSAGES에 등록하거나 adapter에서 알려진 공개 오류로 매핑한다. 유효하지 않은 선택을 SAVE_FAILED로 숨기지 않는다.
