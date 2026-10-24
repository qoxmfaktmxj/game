# 링구링구 개발 규칙

- 기준 자료는 `moyeotable_build_pack_v1/START_HERE.md`와 `docs/00_decisions.md`다. 후자는 패키지 내부 경로이며, 첫 게임 규칙은 같은 폴더의 `docs/05_game01_star_trails.md`를 따른다.
- 구현은 저장소 루트의 `apps/`, `packages/`에서 한다. 원본 패키지는 참조용으로 보존한다.
- 플랫폼 이름은 링구링구이며, 첫 2인 카드게임 이름은 별길 탐험이다. 기존 명세와 내부 `star-trails` 식별자를 유지한다. 추가 네 게임은 사용자의 2026-10-23 결정에 따라 공식 기본판 규칙과 자체 이름·그림으로 구현한다. 해당 게임을 변경할 때 `docs/game-expansion-sources.md`의 판본·콘텐츠 근거를 먼저 확인한다.
- TypeScript strict, 런타임 입력 검증, 순수 규칙 함수를 사용한다. 이미지 속 숫자보다 텍스트 명세를 우선한다.
- 프런트에는 플레이어에게 허용된 View만 보낸다. 전체 손패와 덱은 서버에 남긴다.
- 행동 주체는 인증된 연결에서 가져온다. 클라이언트 actorId를 신뢰하지 않는다.
- 명령은 직렬 처리하고, 저장 성공 후 승인과 View를 전송한다. commandId 중복과 버전 충돌을 처리한다.
- 게임 동기화는 Colyseus를 사용한다. 로컬 게스트는 명시적인 개발 모드에서만 허용한다. 운영은 사용자의 2026-10-24 결정에 따라 자체 리눅스 서버의 Docker Compose·PostgreSQL·서명 게스트 인증을 사용한다. 도메인은 `game.minseok91.cloud`다. 배포 작업에서는 `docs/deployment.md`와 `docs/openclaw-handoff.md`를 먼저 읽는다. 원격 배포 실행은 사용자의 오픈클로에서 이어간다.
- `references/`, 개인 사진, 비밀 스냅샷, 인증 키를 공개 저장소·public·빌드 산출물에 포함하지 않는다.
- 원작 이름·카드 이미지·설명 문장을 서비스 콘텐츠로 복사하지 않는다.
- 규칙의 빈칸은 임의로 채우지 않고 작업 문서에 남긴다.
- 의존성은 공식 안정판과 peer dependency를 확인하고 lockfile로 고정한다.
- 완료 주장은 실행한 검증 범위에 한정한다. 두 브라우저 자연 종료·재접속과 외부 인증·DB·배포 검증을 구분한다.

## Agent skills

### Issue tracker

작업은 `.scratch/<feature>/`의 로컬 Markdown으로 추적한다. 작업을 만들거나 갱신할 때 `docs/agents/issue-tracker.md`를 읽는다.

### Triage labels

기본 5개 라벨을 사용한다. 작업을 분류할 때 `docs/agents/triage-labels.md`를 읽는다.

### Domain docs

하나의 도메인 문맥을 사용한다. 도메인을 탐색할 때 `docs/agents/domain.md`를 읽는다.
