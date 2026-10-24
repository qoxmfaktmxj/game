# 계약 파일의 상태

- game-module.ts: TypeScript 5.8.3 strict 타입 검사 통과. 이것만으로 서버가 구현되는 것은 아닙니다.
- command.schema.json: JSON Schema draft 2020-12. 5개 정상 입력과 10개 잘못된 입력 검증 통과. 프로덕션에서는 UUID format 검증을 켠 validator를 실제 소켓 처리에 연결하세요.
- 001_initial.sql: Supabase 환경을 위한 검토 초안. 실제 PostgreSQL에 적용하거나 RLS/트랜잭션 통합 검증하지 않았습니다. migrations 시스템에서 1회 실행하는 파일이며, 동일 policy 이름으로 재실행하는 idempotent 설치 스크립트가 아닙니다.

게임 명령은 평평한 type/payload 봉투입니다. actorId는 봉투에 없습니다. 연결의 인증 정보에서 얻습니다. 테이블 생성/초대/준비/복구 API는 별도 서비스 계약을 작성해야 합니다.
