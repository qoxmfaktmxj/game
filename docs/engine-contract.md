# 게임 엔진 계약

2026-10-23 다중 게임 구현에서 사용하는 코드 계약. 새 모듈은 `packages/game-core/src/games/{workshop,council,signal,garden}.ts`에 둔다. 각 게임의 공식 기본판·콘텐츠 근거는 해당 규칙 문서가 담당한다.

```ts
type Entropy = {
  randomInt(maxExclusive: number): number;
  createId(): string;
  now(): number;
};
type InputCommand = { type: string; payload: Record<string, unknown> };

export function create(playerIds: string[], entropy: Entropy): State;
export function apply(state: State, actorId: string, command: InputCommand, entropy: Entropy): State;
export function project(state: State, actorId: string): PlayerView;
export function validate(raw: unknown): State;
export function getResult(state: State): Result | null;
```

- `State`는 `version:number`, `playerIds:string[]`, `phase:string`을 포함한다. 종료 단계는 `FINISHED`다. 입력 state를 변경하지 않고 새 state를 반환한다. 승인되는 apply 한 번마다 version은 정확히 1 증가한다.
- `PlayerView`는 `version`, `phase`, `activePlayerId`, `you`, `legalActions:string[]`을 포함한다. 모든 비공개 데이터는 명시적 allowlist projection으로 보호한다. 손패·역할·덱 전체를 spread하지 않는다. 다른 참가자가 반응해야 할 때에도 실제 행동 가능 주체의 legalActions가 정확해야 한다.
- `Result`는 `winners:string[]`, `tied:boolean`, `reason:string`, `scores:{playerId:string;total:number}[]`를 최소 포함한다. 점수 없는 게임은 빈 scores 배열을 허용한다. 공동 팀 승리를 동점으로 표시하지 않는다.
- `signal` State의 `activePlayerIds:string[]`는 아직 게임에 참여하는 살아 있는 참가자다. 서버가 연결 중단 때문에 중지할 때 이 목록을 사용한다. 그 외 게임은 playerIds 전원을 사용한다.
- `validate`는 지원 스키마의 모든 상태 불변식을 검사한 뒤 typed state를 반환한다. 상태를 임의로 복구하거나 누락된 카드·역할을 생성하지 않는다.
- `apply`는 command.type·payload의 허용 키, 타입, 길이·개수, actor·대상·소유권·차례·단계를 검증한다. 자기 게임 외 명령과 actorId 같은 추가 입력을 거부한다.
- `RESIGN`은 새 게임에서 기본 지원하지 않는다. 지원하려면 해당 게임의 명시적 중도 종료 정책을 결정하고 엔진에 구현해야 한다. Star의 기존 기권 처리는 공통 adapter가 보존한다.
- 규칙 오류는 `Error`에 문자열 `code`를 붙인다. 알려진 코드는 서버의 한국어 오류 메시지로 연결한다. 알 수 없는 새 코드가 저장 실패로 처리되지 않도록 서버 작업자에게 코드 목록을 공유한다.
- create/apply에서 사용하는 모든 난수와 ID 생성은 entropy에서 받는다. Date.now, Math.random, crypto를 엔진에서 직접 호출하지 않는다.

공개 metadata는 `game-core/catalog`, 순수 규칙의 server-only dispatcher는 `game-core/multigame`에 분리한다. 프런트는 contracts의 공개 타입과 catalog만 import한다. private 상태와 게임별 데이터셋을 런타임 import하지 않는다.

RoomView는 `gameKey`를 루트 discriminator로 가진 union이다. StoredSession도 gameKey를 필수로 가진 union이다. aggregate schemaVersion=1은 유지하며, legacy session의 gameKey가 없는 경우에만 Star v1로 검사·upcast한다.
