# G2 서버·DB
G1 완료 후 실행한다. Supabase Auth JWT를 검증하는 Colyseus TableRoom과 계약 스키마, 서버 전용 DB 저장소를 구현한다. docs/03_architecture.md와 docs/04_data_protocol.md의 처리 순서를 지킨다. 인증된 userId를 actor로 사용하고 전체 state를 Schema에 넣지 않는다.

DB 적용 전에 contracts/001_initial.sql을 대상 환경에 맞춰 검토하고 테스트 DB에서 검증한다. commandId 멱등성, expectedVersion CAS, 저장 전 전파 금지, 권한별 View, PLACE/DRAW 중간 복구를 통합 테스트한다. 서버 재시작 복구와 브라우저 재접속을 구분한다. 계정/비밀키는 환경 변수 예시만 작성하고 실제 키를 생성물에 넣지 않는다.
