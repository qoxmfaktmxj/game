# 오픈클로 배포 인계

2026-10-26 업데이트: 확정된 하늘 깡총 카드50종(멍이10은 회색 보더콜리)과 홈/게임별 탭 제목을 적용했다. [릴리스 기록](art/sky-hop-release.md)을 읽고 `git pull --ff-only origin main` 후 기존 배포 문서의 build/up으로 반영한다. 이번 변경에 DB migration은 없으며 `.env.self-host`와 DB 볼륨은 유지한다. 실험 일러스트는 배포 대상에서 제외되어 있다.

프로젝트 루트와 이 문서를 오픈클로에 전달한다. 실행 목표는 리눅스 약8GB RAM 서버에 **링구링구**를 `https://game.minseok91.cloud`로 제공하는 것이다. 사용자가 자체 서버의 Docker Compose·PostgreSQL 사용을 선택했다.

먼저 `AGENTS.md`, `docs/deployment.md`, `docs/verification-multigame.md`를 읽고 현재 서버의 포트·메모리·디스크·기존 프록시를 확인한다. 기존 OpenClaw나 다른 서비스를 덮어쓰지 않는다. 원본 `moyeotable_build_pack_v1`과 사진·개인 자료는 업로드하지 않아도 된다. Docker build context에서는 `.dockerignore`로 제외한다.

1. 저장소 소스, lockfile, apps, packages, deploy, scripts, docs를 비공개 작업 폴더에 둔다. Docker/Compose v2를 확인한다.
2. DNS `game.minseok91.cloud`의 A/AAAA가 이 서버를 가리키는지 확인한다. TCP80/443 접근을 확인한다.
3. `bash deploy/setup.sh`로 비밀 환경 파일을 생성한다. 기존 키는 보존하며 비밀번호·토큰·DB 문서를 출력하지 않는다.
4. 배포 문서의 config/build/up 명령을 실행한다. 실패하면 실제 로그에서 원인을 해결한다. DB 볼륨을 삭제하여 재시도하지 않는다.
5. `/readyz`, HTTPS, 브라우저 홈을 검사한다. 닉네임 입장→친구 초대→준비→실제 두 기기의 플레이→결과→재경기를 확인한다. 혼자 검수할 때는 대기실의 연습 봇을 추가한다.
6. 비공개 손패가 보존되는지 확인하며 게임 서버를 재시작하고 다시 접속한다. 이후 같은 테이블·멤버·게임 상태로 복원되는지 검증한다.
7. `scripts/load-test.ts`를 실제 서버에 실행하고 PostgreSQL을 포함한100명 연결 결과와 CPU·메모리·명령 지연을 기록한다. 기본 부하 시험은 별길 탐험50테이블이며 다른 게임·다수 봇 부하는 별도로 확인한다.
8. DB 백업을 생성하고 별도 DB에 복구 시험한다. 최종 보고에는 실제 성공한 URL, 서비스 상태, 테스트 결과, 남은 제한만 기록한다.

호스팅은 단일 Colyseus 인스턴스다. 임의로 game을 여러 개 scale하거나 Supabase/Vercel 프로젝트를 만들지 않는다. 사용자의 도메인·DB 선택을 유지한다. 현재 닉네임 게스트 인증은 계정 복구 기능이 없으며 탭 저장소가 사용자 자리를 유지한다.
