# 자체 서버 배포 구성 검토

검토일: 2026-10-24. 대상은 `deploy/`의 Dockerfile·Compose·Caddy·초기화 스크립트와 이 설정을 받는 Next.js·게임 서버·DB 어댑터다. 공개 주소는 `https://game.minseok91.cloud`, 배포 단위는 게임 서버 한 개다.

이 문서는 **로컬 정적 검토와 초기화 스크립트 실행 결과**다. 현재 Windows 환경에는 Docker 엔진·WSL·PostgreSQL·Caddy 실행 파일이 없어 컨테이너 빌드, 실제 DB 마이그레이션, 공개 HTTPS/WSS 연결을 실행하지 않았다. 원격 실행 절차와 운영 판단은 `deployment.md` 및 `openclaw-handoff.md`를 따른다.

## 확인 결과

| 항목             | 검토 결과                                                                                                   | 검증 수준                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Compose 문법     | 설치된 Prettier YAML 파서로 구문 오류 없이 읽음                                                             | YAML 구문 검사. `docker compose config` 실행은 아님      |
| Bash 스크립트    | `setup.sh`, `migrate.sh` 각각 `bash -n` 통과. 원본 LF, BOM 없음                                             | Git Bash 실행                                            |
| 비밀값 초기화    | 32·32·48바이트 길이의 hex 문자열 생성, 재실행 시 기존 파일 보존                                             | 별도 임시 폴더에서 실제 OpenSSL 실행. 값은 출력하지 않음 |
| 초기화 실패      | OpenSSL 첫 번째·세 번째 호출 실패 시 종료 코드 70, 환경 파일 미생성                                         | 오류 주입 실행                                           |
| 서비스 시작 순서 | PostgreSQL health → migration 정상 종료 → game readiness → gateway. 웹 readiness도 gateway의 선행 조건      | Compose 설정과 공식 동작 비교                            |
| 웹 이미지        | Next standalone, `.next/static`, `public`을 모두 복사하며 서버 경로는 `apps/web/server.js`                  | 빌드 설정·경로 정적 검토                                 |
| 외부 주소        | `NEXT_PUBLIC_GAME_SERVER_URL`을 이미지 빌드 시 도메인의 HTTPS 주소로 주입                                   | 빌드 인자와 클라이언트 설정 비교                         |
| 네트워크         | gateway만 80/443을 호스트에 공개. 게임·웹·DB는 Compose 서비스 주소 사용                                     | 포트·라우팅 정적 검토                                    |
| HTTP·WebSocket   | 인증·테이블·matchmake·health 경로 및 WebSocket Upgrade를 게임 서버로, 나머지를 웹으로 전달                  | Caddy 설정과 실제 서버 경로 비교                         |
| 인증·DB 설정     | `AUTH_MODE=guest`, 지속 서명 키, private DB 명시 허용, 풀 10개, `TRUST_PROXY=1`이 서버·어댑터의 입력과 일치 | 소스와 환경 변수 비교                                    |
| DB 권한          | migration은 관리자 역할, 앱은 `ringuringu` 역할. 앱에는 비공개 테이블 SELECT·INSERT·UPDATE만 부여           | SQL 정적 검토. 실제 역할/RLS 검사는 미실행               |
| 비공개 파일      | `.env*`, 로컬 저장 상태, 원본 자료 패키지, references, 개발 산출물을 빌드 컨텍스트에서 제외                 | `.dockerignore`와 COPY 범위 검토                         |

Compose의 `service_healthy`와 `service_completed_successfully`를 사용한 순서는 [Docker의 시작 순서 안내](https://docs.docker.com/compose/how-tos/startup-order/)와 일치한다. 컨테이너 실행 후의 DB 단절이나 서버 장애까지 자동으로 해결한다는 뜻은 아니다.

Next standalone은 `public`과 `.next/static`을 자동 포함하지 않으므로 Dockerfile에서 별도로 복사한다. 모노레포 상위 workspace는 `outputFileTracingRoot`에 포함했다. Windows의 standalone 심볼릭 링크 대신 Linux 빌드 단계에서 결과물을 만들도록 구성했다. [Next.js output 문서](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)

Caddy의 reverse proxy는 WebSocket을 지원하고 전달 헤더를 설정한다. 현재 `TRUST_PROXY=1`은 인터넷 → Caddy → 게임 서버라는 한 단계 프록시 구조에 맞춘다. CDN이나 별도 프록시를 앞에 추가할 때는 이 전제와 실제 클라이언트 IP 전달을 다시 검증해야 한다. [Caddy reverse_proxy 문서](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)

`.dockerignore`의 `*.png`는 컨텍스트 루트의 PNG에 적용된다. `apps/web/public/art/`의 자체 제작 카드 커버는 이 규칙으로 제외되지 않는다. [Docker 빌드 컨텍스트 문서](https://docs.docker.com/build/concepts/context/)

## 검토 중 수정한 내용

1. 기존 `setup.sh`는 `printf "$(openssl ...)"` 구조 때문에 난수 생성 실패가 성공 종료로 바뀌었다. 실제 오류 주입에서 빈 비밀값 3개가 있는 파일을 생성하고 종료 코드 0을 반환했다. 이제 세 값의 생성이 모두 성공한 뒤 파일을 쓴다. 첫 호출뿐 아니라 마지막 호출 실패도 환경 파일을 남기지 않는 것을 확인했다.
2. `deploy/*.sh`를 LF로 체크아웃하도록 `.gitattributes`에 지정했다. 실행 권한은 필요하지 않으며, 문서와 Compose에서 명시적으로 Bash로 실행한다.
3. `runtime-role.sql`은 기존 역할에도 로그인·비관리자·비복제·RLS 우회 금지 속성을 다시 적용한다. 역할 권한과 정책 교체는 하나의 트랜잭션으로 묶어 재실행 중 정책이 없는 상태를 노출하지 않는다. 이는 [PostgreSQL ALTER ROLE](https://www.postgresql.org/docs/17/sql-alterrole.html)의 지원 속성을 사용한다. 비밀번호는 psql의 인용된 변수와 SQL `format(... %L ...)`로 처리하며, `ON_ERROR_STOP` 상태의 `\gexec`로 실행한다. [psql 문서](https://www.postgresql.org/docs/17/app-psql.html)

## 원격에서 남은 검증

- Docker Compose 자체 구성 검사와 Linux 이미지 빌드. Next의 정적 파일·카드 커버·이미지 최적화가 최종 이미지에서 응답하는지 확인한다.
- PostgreSQL 17의 신규 마이그레이션과 재실행, 앱 역할의 실제 읽기·쓰기 및 비관리자 속성, readiness 확인. 현재 `001` SQL은 재실행을 고려하지만, 미래 마이그레이션의 범용 이력 관리가 구현된 것은 아니다.
- DNS·80/443·인증서·HTTPS/WSS, 다른 네트워크의 두 브라우저에서 초대·플레이·재접속 확인.
- 게임 컨테이너를 다시 만든 뒤 같은 서명 키와 PostgreSQL 볼륨으로 계정·테이블·손패를 복구하는지 확인. 서명 키를 바꾸면 기존 게스트 인증이 무효가 된다.
- 원격 Linux에서 환경 파일 권한 600과 DB 백업·복원 확인. Windows Git Bash 실행으로 Linux 파일 권한을 검증했다고 주장하지 않는다.
- 실제 호스트에서 100명 부하 검증. 상시 서비스 메모리 상한은 합계 약 4.75GiB이며 8GB 서버의 초기 배치 기준일 뿐이다. 빌드 순간 메모리와 호스트·다른 서비스 사용량, 응답 지연 및 동시 게임의 CPU 사용량은 별도 측정해야 한다. 게임 서버 복제본을 늘려 해결하는 구조는 현재 범위가 아니다.

공개 배포 성공이나 100명 수용 여부는 이 정적 검토만으로 확정하지 않는다.
