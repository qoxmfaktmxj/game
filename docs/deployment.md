# 자체 리눅스 서버 배포

2026-10-24 사용자 결정: Vercel 대신 약 8GB RAM의 자체 리눅스 서버에서 Docker Compose와 PostgreSQL을 사용한다. 공개 도메인은 **game.minseok91.cloud**. 실제 원격 실행은 사용자의 오픈클로에서 이어간다. 여기서는 원격 서버·DNS·인증서·운영 DB를 변경하지 않았다.

## 구성

인터넷 → Caddy(80/443, 자동 HTTPS) → Next.js(3000) 또는 Colyseus(2567) → PostgreSQL(5432). 호스트에 노출하는 포트는 Caddy의80/443뿐이다. `deploy/Caddyfile`은 같은 도메인에서 `/auth`, `/tables`, `/matchmake`, 상태 검사, WebSocket을 게임 서버로 전달한다. 웹은 `NEXT_PUBLIC_GAME_SERVER_URL=https://game.minseok91.cloud`로 빌드된다.

게임 서버는 **단일 프로세스·인스턴스**로 운영한다. 현재 테이블 소유권은 다중 인스턴스용 공유 presence/driver/임대가 아니므로 `--scale game=2`, PM2 cluster를 적용하지 않는다. 100명 목표의 단일 서버를 먼저 실제 장비에서 검증한다. [Colyseus 배포 공식 문서](https://docs.colyseus.io/deployment)

Next.js는 standalone 출력과 역방향 프록시를 사용한다. Caddy가 TLS를 처리하고 게임 소켓도 WSS로 연결된다. [Next.js 자체 호스팅](https://nextjs.org/docs/app/guides/self-hosting), [Caddy WebSocket 프록시](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy), [자동 HTTPS](https://caddyserver.com/docs/automatic-https)

## 최초 실행

Docker Engine와 Compose v2가 설치된 리눅스에서 저장소 루트로 이동한다. 서버에 같은 도메인을 제공하는 프록시가 이미 있다면 기존 프록시에 아래 경로를 연결하거나 충돌하는 포트를 먼저 조정한다. 기존 서비스를 중지하거나 덮어쓰지 않는다.

1. DNS A 레코드 `game.minseok91.cloud`를 서버의 공인 IPv4로 지정한다. AAAA 레코드가 있다면 실제로 도달 가능한 IPv6인지도 확인한다.
2. 방화벽/NAT에서 TCP80·443을 Caddy로 연결한다. UDP443은 HTTP/3용 선택 사항이다.
3. 서버에서 다음을 실행한다.

```bash
bash deploy/setup.sh
docker compose --env-file .env.self-host -f deploy/compose.yaml config --quiet
docker compose --env-file .env.self-host -f deploy/compose.yaml build
docker compose --env-file .env.self-host -f deploy/compose.yaml up -d
docker compose --env-file .env.self-host -f deploy/compose.yaml ps
curl --fail https://game.minseok91.cloud/readyz
```

`setup.sh`는600 권한의 `.env.self-host`를 한 번 만들고 기존 파일은 덮어쓰지 않는다. DB 관리자/런타임 비밀번호와 게스트 서명키는 각각 무작위로 생성한다. 이 파일은 공개하거나 채팅·로그에 출력하지 않는다. `config --quiet`를 빼면 확장된 비밀번호가 출력될 수 있다.

PostgreSQL healthcheck 후 migration 컨테이너가 버전 SQL과 런타임 역할을 적용한다. 게임 서버의 DB 역할 `ringuringu`에는 SELECT/INSERT/UPDATE와 서버 역할용 RLS 정책만 부여한다. 관리자 비밀번호는 게임 서버에 전달하지 않는다. DB 포트는 외부에 열지 않는다.

## 인증과 저장

`AUTH_MODE=guest`는 운영용 서명 게스트 모드다. 닉네임으로 서버가 UUID와 만료된 뒤 재사용할 수 없는 서명 토큰을 발급한다. `GUEST_SIGNING_SECRET`은 재배포할 때 유지해야 한다. 기본 유효기간은7일이며 소켓에도 만료가 적용된다. 브라우저는 탭의 sessionStorage에 프로필을 저장하므로 새로고침은 복구되지만 탭 저장소를 지우면 기존 자리를 자동 되찾지 못한다. 계정·비밀번호·소셜 로그인은 이번 운영 방식에 포함되지 않는다.

게임의 비공개 손패·덱·결과·명령 영수증은 PostgreSQL JSONB에 저장된다. 매 행동의 저장 성공 후 ACK와 개인 View가 전달된다. 동일한 DB와 서명키로 게임 서버를 다시 띄우면 같은 브라우저에서 이어갈 수 있다. 서버 재시작 중에는 진행이 일시정지한다.

`DATABASE_SSL_MODE=disable` + `DATABASE_ALLOW_PRIVATE_NETWORK=true`는 이 구성의 외부에 노출되지 않는 Docker 내부 PostgreSQL 연결에만 사용한다. 외부 DB로 옮기면 `verify-full`과 필요한 CA를 사용한다. `TRUST_PROXY=1`은 공개 포트를 Caddy만 소유하는 한 홉 구성을 전제로 한다. 게임 컨테이너의 포트를 직접 외부에 공개하면 안 된다.

## 8GB와 100명 목표

현재 Compose 메모리 상한은 웹1GB·게임2GB·DB1.5GB·Caddy256MB다. 이는 예약량이나100명 수용 보증이 아니다. 빌드는 런타임 상한과 별도로 메모리를 사용하며 같은 서버의 OpenClaw·다른 서비스 사용량도 고려해야 한다. 봇의 숫자 조합 탐색은 일반 카드 명령보다 CPU 비용이 크므로 봇이 많은 상황도 따로 관찰한다.

현재 로컬 측정: WebSocket100개·2인 테이블50개·60.08초·명령4,557개, 오류0·예상치 못한 연결 종료0. 명령 전송부터 양쪽 View 갱신까지 p95 **39.06ms**, p99 **89.88ms**. Windows 로컬 JSON 저장 측정이며 리눅스/PostgreSQL/인터넷 성능 결과가 아니다. [검증 보고서](verification-multigame.md)

서버가 실제 올라온 뒤 Node.js24 환경에서:

```bash
npm ci
LOAD_URL=https://game.minseok91.cloud LOAD_CLIENTS=100 LOAD_SECONDS=300 npx tsx scripts/load-test.ts
```

이 명령은 테스트용 게스트100명과 테이블50개를 실제 생성한다. 운영용 게스트 발급 제한을 존중해20명씩 천천히 연결하므로 준비에 약4분, 그 뒤 지정한 측정 시간이 걸린다. 새 테스트용 데이터는 자동 삭제하지 않는다. 결과는 `artifacts/verification/load-test.json`에 쓴다. 화면 렌더링·모든 게임 혼합·오랜 누적 데이터 비용은 별도 검증한다.

검증 중 `docker stats --no-stream`, 게임 로그, `/readyz`, 디스크 잔여량을 확인한다. 명령 오류·저장 실패·불규칙한 긴 지연이 없고 실제 두 기기의 플레이·재접속이 확인된 뒤100명 목표 충족 여부를 판단한다.

## 업데이트와 백업

DB를 지우는 `docker compose down -v`는 일반 업데이트 절차에 쓰지 않는다. 새 소스를 받은 뒤 같은 `.env.self-host`로 build와 up을 다시 수행한다. migration은 현재 버전에서 재실행 가능하며 새 SQL이 추가되면 릴리스 내용을 먼저 검토한다.

```bash
umask 077
mkdir -p backups
docker compose --env-file .env.self-host -f deploy/compose.yaml exec -T postgres \
  pg_dump -U postgres -d ringuringu -Fc > "backups/ringuringu-$(date +%Y%m%d-%H%M%S).dump"
```

덤프와 `.env.self-host`를 서버 밖의 비공개 백업 저장소에 보관한다. 덤프에는 비공개 게임 상태가 들어 있다. 복구는 먼저 별도 DB에서 `pg_restore --exit-on-error`로 시험하고 테이블·초대·개인 View를 확인한다. 이 세션에서 실제 백업 복원은 실행하지 않았다.

현재 테이블별 영수증과 결과 기록의 자동 보관 기간은 설정하지 않았다. 장기간 사용으로 문서가 커지면 DB 크기·쓰기 지연을 관찰하고 명시적인 보관 정책을 추가해야 한다.

## 여기서 확인하지 못한 것

현재 개발 컴퓨터에는 Docker·리눅스 실행 환경·PostgreSQL이 없어 실제 Compose 이미지 빌드와 migration, Caddy 인증서 발급은 실행하지 않았다. 소스 빌드·타입·규칙·브라우저·실제 로컬 소켓 검증과 Docker 설정 정적 검토를 구분한다. 아직 공개 서비스 URL이 활성화되었다고 주장하지 않는다.
