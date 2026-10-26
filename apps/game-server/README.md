# 링구링구 게임 서버

테이블과 한 판의 세션을 분리한 서버 권위형 다중 게임 서비스다. 브라우저에는 인증된 사람의 개인 View만 보낸다. 규칙은 `@moyeotable/game-core`, 공개 계약은 `@moyeotable/contracts`, 서버 전용 영속화는 `@moyeotable/db`에 있다.

| 게임 | 내부 식별자 | 인원 |
|---|---|---:|
| 별길 탐험 | star-trails | 2 |
| 와일드 스플렌더 | workshop | 2–4 |
| 밤의 의회 | council | 2–7 |
| 황혼의 신호 | signal | 4–7 |
| 넘버가든 | garden | 2–4 |

## 로컬 실행

저장소 루트에서 `npm run dev`를 실행한다. 서버를 직접 실행할 때의 PowerShell 예시는 다음과 같다.

```powershell
$env:AUTH_MODE='local'
$env:ALLOW_LOCAL_GUEST='true'
$env:GAME_HOST='127.0.0.1'
$env:WEB_ORIGIN='http://localhost:3000'
npm run dev --workspace @moyeotable/game-server
```

기본 포트는2567이다. local 모드는 loopback bind·`ALLOW_LOCAL_GUEST=true`·비production을 요구한다. `LOCAL_DATA_DIR` 아래 JSON 파일과 HMAC 서명키를 보관하며, 같은 브라우저 토큰으로 재시작 후 멤버십을 복원한다. 이 디렉터리에는 전체 손패와 덱이 있으므로 공개·커밋·정적 배포 대상에 넣지 않는다.

## 자체 Linux 서버

현재 배포 대상은 `game.minseok91.cloud`의 Docker Compose다. Caddy·Next.js·게임 서버·PostgreSQL을 구성하는 `deploy/`와 `docs/deployment.md`를 먼저 읽는다. 외부 계정 로그인 없이 운영용 서명 게스트를 사용하는 명시적 모드다.

| 환경 변수 | 운영 설정 |
|---|---|
| AUTH_MODE | guest |
| GUEST_SIGNING_SECRET | 32–64 random bytes를 hex로 인코딩한64–128자리 키 |
| GUEST_TOKEN_TTL_SECONDS | 60–604800초, 기본604800(7일) |
| WEB_ORIGIN | https://game.minseok91.cloud |
| TRUST_PROXY | Caddy만 외부 진입점일 때1, 직결은0/미설정 |
| DATABASE_URL | Compose 내부 PostgreSQL의 전용 runtime 계정 |
| DATABASE_SSL_MODE | 내부 격리 네트워크는disable, 외부DB는verify-full |
| DATABASE_ALLOW_PRIVATE_NETWORK | 격리된 Docker 네트워크에서만true |
| DATABASE_POOL_SIZE | 기본5, 허용1–20, Compose10 |

`deploy/setup.sh`가 `.env.self-host`에 난수 키와 DB 암호를 만들며 기존 키를 덮어쓰지 않는다. 키는 재시작에도 유지하고 백업한다. 키를 바꾸면 기존 게스트 토큰은 무효가 된다. 토큰은 서버가 새 UUID와 닉네임으로 발급하고 HMAC·audience·버전·만료를 검사한다. 브라우저가 user ID나 봇 ID를 골라 인증할 수 없다. 실제 소켓도 만료 시 `4001 / AUTH_EXPIRED`로 닫힌다. 게스트는 이메일·비밀번호 계정이 아니므로 토큰 만료·브라우저 저장소 삭제 후 옛 멤버십을 자동 복구하는 계정 복구 기능은 없다.

`TRUST_PROXY=1`은 정확히 한 홉을 신뢰한다. Compose에서 game·web·postgres 포트를 외부에 노출하지 않고 Caddy만80/443을 받는다. Caddy 뒤에서 HTTP 요청 제한은 실제 클라이언트 IP를 사용한다. 게스트 발급은 IP당 분당20회, 일반 API는10초당300회이며 소켓 명령은 사용자당10초당300회다. 여러 개의 리버스 프록시나 CDN을 추가하면 이 설정부터 재검토한다.

DB TLS 인증서 검증이 기본이다. `DATABASE_SSL_CA`는 선택한 호스트의 PEM 신뢰 루트를 받는다. disable 예외는 loopback 또는 명시적으로 허용한 단일 Docker DNS 이름/RFC1918/ULA 주소에만 적용된다. 공인 호스트는 이 플래그로 검증을 끌 수 없다. URL query는 `application_name`만 허용한다. `ssl*`, `host`, `hostaddr`, `port` 등의 재정의를 거절해 pg가 검증한 접속 대상·TLS 정책을 덮어쓰지 못하게 한다.

기존 `AUTH_MODE=supabase` 어댑터도 남아 있다. 선택하면 `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `DATABASE_URL`, `WEB_ORIGIN`이 필요하다. Auth 서버 getUser 검증 후 issuer/audience/expiry/subject를 확인하며, 5xx·429·연결 실패는 `AUTH_UNAVAILABLE`/503으로 구분한다. 이 어댑터는 현재 Compose에서 사용하지 않는다.

## HTTP와 소켓

`/tables` 경로는 모두 Bearer 토큰이 필요하다.

| 경로 | 입력 | 응답 |
|---|---|---|
| GET /health | 없음 | ok, authMode, gameKey, games |
| GET /readyz | 없음 | 저장소 접근 가능 시200, 실패 시503 |
| POST /auth/guest | nickname | accessToken, user · local/guest 모드 |
| GET /tables | 없음 | 내 tables |
| POST /tables | title, gameKey 선택 | table, inviteToken |
| GET /tables/:id | 없음 | table · 사람 멤버만 |
| POST /tables/:id/join | inviteToken | table |
| POST /tables/:id/invite | 없음 · 방장만 | 새 inviteToken |

초대 토큰은 암호학적 난수32바이트다. SHA-256 해시만 저장하며24시간·발급 시 빈자리 수만큼 사용 가능하다. 이미 가입한 사람의 재접속은 사용 횟수를 소모하지 않는다. 정원이 찼으면 봇이 있어도 자동으로 제거하지 않는다. 방장이 대기실에서 봇을 빼면 친구가 그 자리에 입장할 수 있다.

`new Client(url).joinOrCreate('table', {tableId,accessToken})`로 입장한다. view/ack/error 리스너를 등록한 뒤 `send('sync', {})`로 상태를 요청한다. 전체 상태를 Colyseus Schema에 넣지 않으며 추가 탭은 같은 멤버의 연결로 센다.

- table_command: commandId, expectedRevision과 READY(ready), START, REMATCH, LEAVE, SELECT_GAME(gameKey), ADD_BOT, REMOVE_BOT(userId).
- game_command: protocolVersion:1, tableId, sessionId, commandId, expectedVersion, type, payload. actor는 인증된 연결에서 가져온다.
- view: protocolVersion:1, gameKey, table, game, result, paused. gameKey로 좁힐 수 있는 게임별 개인 View다.
- ack: commandId, status accepted/duplicate, acceptedVersion/revision.
- error: commandId 선택, code, 한국어 message. 버전 충돌 때 최신 view도 전송한다.

새 ID는 UUID로 만든다. 응답이 유실되면 동일 ID·봉투를 재전송하며 같은 ID에 다른 내용을 붙이면 거절한다. 방장은 정원 범위의 접속·준비 인원이 모이면 시작한다. 재경기는 새 세션만 만들고 테이블과 멤버를 유지한다. 게임 선택은 LOBBY/RESULT에서만 가능하며 선택한 게임 정원을 초과하면 거절한다. 선택·멤버 변경은 사람의 준비를 해제하고 이전 세션을 지운다. 별길 탐험만 자발적 RESIGN을 지원한다.

## 중간 난이도 연습 봇

방장만 LOBBY/RESULT의 빈자리에 추가하거나 제거할 수 있다. `control: human|bot`을 영속화하며 봇은 자동 준비·접속 상태다. 예전 저장 파일의 control 누락은 human으로 읽는다. 마지막 사람이 테이블에서 탈퇴하면 남은 봇 자리도 정리한다. 봇은 방장이 될 수 없고 인증된 사람의 view/table_command/game_command 경로로 사칭할 수 없다.

정책은 자기 개인 View와 난수 함수만 받는다. 서버가 덱이나 상대 손패를 전달하지 않는다. 지연800–1600ms 후 현재 세션·버전을 확인하고 같은 직렬 명령 검증·저장 경로로 실행한다. 대응자가 턴 주체와 다른 게임도 개인 View의 합법 행동으로 처리한다. 실제 접속한 사람이 없거나 필요한 사람이 끊기면 예약을 취소한다. 복귀하면 저장된 봇 ID·손패·턴에서 계속한다. 정책은 제한된 평가와 작은 난수 변화를 사용하며 최적 플레이나 숙련자 수준을 주장하지 않는다.

## 저장·복원

테이블별 큐 → 입력·인증·중복·버전 검사 → 순수 규칙 계산 → CAS 저장 → 개인 View/ACK 순서다. 영수증·현재 세션·결과 이력은 하나의 JSONB aggregate에 들어간다. `revision`과 `owner_epoch`를 함께 비교하므로 부분 저장과 이전 프로세스의 쓰기를 막는다. 저장에 실패한 움직임이나 봇 행동은 공개하지 않는다.

`packages/db/migrations/001_table_aggregates.sql`과 `deploy/runtime-role.sql`을 사용한다. 원본 패키지의 정규화 SQL 초안과 함께 적용하지 않는다. `game_private`는 브라우저/Data API에 노출하지 않고 전용 runtime 역할에 필요한 권한과 RLS 정책만 준다. readiness는 관계·권한·읽기를 점검하며 실제 쓰기/복원 테스트를 대신하지 않는다.

aggregate schemaVersion은1을 유지했다. 예전 별길 탐험 session.gameKey 누락을 명시적으로 보정하고, 새 세션은 게임별 rulesVersion/contentVersion/schemaVersion과 상태·결과를 검사한다. 읽기만으로 원본 파일을 덮어쓰지 않는다. 새 게임 네 종의 첫 규칙·콘텐츠 버전은1.0.0이다.

로컬 JSON 저장은 임시 파일 fsync 후 rename한다. JSON과 PostgreSQL 모두 단일 게임 서버 프로세스 운영 범위다. 자동 소유권 임대 갱신·다중 인스턴스 확장은 구현하지 않았다. 접속 Room이 사라져도 인증·저장된 멤버십으로 다시 만들어 게임을 복원한다.

필요한 사람의 단절 중 게임 행동은 일시정지한다. 황혼의 신호 탈락자는 더 이상 필수 연결 인원이 아니다. 넘버가든의60초는 서버 시계가 판정하며 단절 동안 남은 시간을 저장하고 복귀하면 이어간다. 중복 ACK와 별길 탐험의 자발적 기권은 단절 중에도 허용한다.

## 빌드와 검증

```text
npm run typecheck --workspace @moyeotable/game-server
npm run test --workspace @moyeotable/game-server
npm run build --workspace @moyeotable/game-server
npm run test:built --workspace @moyeotable/game-server
```

esbuild가 workspace 소스를 dist/index.mjs로 묶고 Node.js24로 실행한다. 서버는 전체 규칙 데이터를 포함하므로 웹 public/정적 경로에 넣지 않는다. production 의존성이 필요하며 tsx는 운영에 필요 없다.

자동 검증은 실제 Colyseus2인 별길 탐험과4인 공방·신호·의회의 프로세스 종료/복원·자연 종료, 봇5종 진행과 재시작·저장 실패, 입력·권한·중복·CAS, guest 서명/만료, 프록시 IP 처리와 DB TLS 정책을 포함한다. 로컬100소켓 부하 시험은 운영 PostgreSQL·TLS·실제 인터넷100사용자 보장과 구분한다. 최종 실행 기록은 저장소의 검증 보고서를 따른다.

자동 방장 위임60초, 단절180초 후 무효 종료,24시간 오프라인 종료, 기록 보관기간별 삭제는 아직 구현하지 않았다. 서버 장애나 단절을 임의 패배로 바꾸지 않는다. 운영에서는 DNS·TLS·마이그레이션·전용 역할·백업 복원·로그·배포 후 부하를 실제 서버에서 점검한다.

설정 근거: [Colyseus 서버](https://docs.colyseus.io/server), [Express 프록시 설정](https://expressjs.com/en/guide/behind-proxies.html), [node-postgres SSL](https://node-postgres.com/features/ssl), [Node HMAC](https://nodejs.org/api/crypto.html#cryptocreatehmacalgorithm-key-options).
