# 03. 아키텍처와 구현 경계

## 제안 스택
| 영역 | 선택 | 이유/경계 |
|---|---|---|
| Web | Next.js / React / TypeScript | 랜딩·로비·게임 UI. 서버 비밀 상태 import 금지 |
| Motion | Motion + CSS | 카드 이동. 규칙 판정에 관여하지 않음 |
| Realtime | Node.js LTS + Colyseus | 서버 권위형 Room·메시지·접속 수명 [S01] |
| Auth | Supabase Auth | JWT 발급. 게임 서버에서 서명/iss/aud/exp 검증 [S04] |
| DB | PostgreSQL(Supabase) | Table·Session·Snapshot·Command 영속화 |
| DB access | Drizzle 또는 SQL 어댑터 한 종류 | 계약 SQL을 기준으로 마이그레이션. 아래 예시는 ORM 비종속 |
| Tests | Node test / 이후 Vitest·Playwright | 순수 규칙, 통합, 실제 두 브라우저 |
| Deploy | 웹 Vercel / 게임 상주 Node.js | 호스팅 계약·제한 확인 후 선택. 무료 서비스가 서버 무료를 뜻하지 않음 |

버전은 공식 문서 확인 후 고정합니다. 확인 시 Colyseus 문서는 v0.18, Next.js 문서는 v16.4.2, Node.js 24는 LTS로 표시됐습니다 [S01,S08,S09]. 이 조합의 통합 호환성까지 실행 검증한 것은 아닙니다. 이 패키지의 참조 테스트는 실제 실행 환경 Node.js 22.16.0에서 검증합니다.

## 배치
Browser → HTTPS Web/API → Auth
Browser → WSS Colyseus TableRoom → Rules modules → DB transaction
DB에는 서버 전용 전체 스냅샷을 보관합니다. 브라우저는 API/소켓이 만들어준 허용된 View만 받습니다. Supabase Realtime으로 동일 상태를 다시 보내지 않습니다.

## 모노레포 제안
```
apps/web/             # Next.js, 화면/입력/렌더링
apps/game-server/     # Colyseus, 인증, 메시지 어댑터, 저장
packages/contracts/  # 공개 타입/스키마, 비밀 데이터 제외
packages/game-core/  # 게임 공통 인터페이스/오류/난수 주입
packages/games/star-trails/   # 순수 규칙·테스트
packages/ui/         # 카드/타일/좌석/대화상자
packages/db/         # SQL/마이그레이션/서버 전용 저장소
```

## 게임 모듈 계약
각 모듈은 `createInitialState`, `validateCommand`, `applyCommand`, `toPlayerView`, `isFinished`, `getResult`, `assertInvariants`를 구현합니다. 네트워크·DB·React·Date.now·Math.random에 직접 의존하지 않습니다. 시간과 난수는 입력으로 받아 재현 가능하게 합니다.

## 상태 전파의 안전한 기본값
Colyseus는 기본 상태가 모든 클라이언트에게 보일 수 있으므로 [S02], **전체 게임 객체를 동기화 Schema에 넣지 않습니다.** 비밀 덱/손패는 일반 서버 전용 객체에 둡니다. MVP는 공통 공개 메타데이터만 Schema로 보내고, 매 승인 후 `toPlayerView` 결과를 개별 메시지로 보냅니다. 이를 테스트한 뒤 StateView 최적화를 검토합니다. 게임 종료 후에도 자동 전체 손패 공개/전체 원본 로그 다운로드를 기본 기능으로 넣지 않습니다.

## 명령 처리 파이프라인
1. 연결에 바인딩된 인증 userId와 멤버십 검증. payload의 actorId를 신뢰하지 않습니다.
2. 런타임 스키마·길이·게임/세션 ID 확인.
3. `(sessionId,userId,commandId)`의 이미 승인된 결과가 있으면 재적용 없이 반환. payload 해시가 달라지면 거절.
4. 해당 Room 명령을 직렬 처리하고 expectedVersion 비교.
5. 원본을 변경하지 않고 후보 상태를 계산하고 불변식 검사.
6. 트랜잭션에서 session version과 ownerEpoch를 조건부 갱신하고 command 결과, 스냅샷, 필요한 결과를 함께 저장.
7. 커밋 성공 후 서버 메모리 교체 → 승인 응답 → 사용자별 View 송신.
8. 커밋 실패 시 기존 상태 유지. DB 저장 성공 여부를 모를 때는 commandId 조회로 확인 후 재시도.

자동 동기화 객체를 먼저 바꾸고 나중에 DB를 저장하면 미커밋 상태가 노출될 수 있으므로 금지합니다. 승인 후 브로드캐스트가 실패해도 재접속 때 커밋된 최신 상태로 복구합니다.

## 재접속과 서버 재시작은 별개
Colyseus 재접속 토큰은 페이지 새로고침 후 같은 서버 Room의 좌석 복귀에 사용합니다 [S03]. sessionStorage 저장·로그 마스킹·유예창 검증이 필요합니다. 서버 프로세스가 사라졌다면 그 토큰만으로 복구하지 않고 인증/멤버십 + DB snapshot으로 새 Room을 재생성합니다. 서버는 원래 덱 순서·DRAW 단계·마지막 버린 카드 ID까지 복원해야 합니다.

## 중복 서버 소유권
초기에는 단일 프로세스입니다. 복구 워커는 DB의 ownerEpoch를 갱신하고 모든 쓰기에 동일 epoch를 요구합니다. 두 Room이 같은 session을 살리는 경로가 생기면 DB 원자적 소유권 획득/임대 갱신을 추가하고 검증합니다. 검증 없이 인스턴스 수를 늘리지 않습니다.

## 부하·관측 제안
첫 부하 시나리오 10테이블/20접속, 이후 50테이블/100접속. 이는 목표 테스트 규모이지 지원 실적이 아닙니다. 저장 포함 command p95 500ms 이하를 초기 목표로 측정합니다. auth 실패, rule reject, DB latency, reconnect, version conflict, queue depth를 기록하되 카드 비밀값·JWT·초대 토큰은 로그에서 제외합니다.
