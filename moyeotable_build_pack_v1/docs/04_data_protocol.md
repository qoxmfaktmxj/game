# 04. 데이터와 통신 명세

## 핵심 데이터
| 엔터티 | 핵심 필드 | 접근 |
|---|---|---|
| profiles | userId, nickname, createdAt | 본인 수정, 멤버에게 최소 이름 공개 |
| tables | id, hostId, status, gameKey, revision | 서버 전용 원본, 멤버 view |
| table_members | tableId, userId, seat, ready | 서버만 변경 |
| table_invites | tokenHash, expiry, remainingUses, revokedAt | 서버 전용 |
| game_sessions | id, tableId, gameKey, rulesVersion, schemaVersion, version, ownerEpoch, status | 서버 전용 |
| game_players | sessionId, userId, seat | 서버 전용 |
| game_snapshots | sessionId, version, stateJson, writtenAt | **덱/손패 포함, 서버 전용** |
| game_commands | sessionId, userId, commandId, payloadHash, acceptedVersion, response | 서버 전용 / 멱등성 |
| game_results | sessionId, summaryJson, finishReason | 참가자별 허용 요약 |

SQL 초안은 `contracts/001_initial.sql`에 있습니다. Supabase의 인증 스키마/역할이 존재하는 환경용이며 아직 실제 DB에 적용하지 않았습니다. 별도 `game_private` 스키마는 Data API 노출 대상에서 제외하고 일반 anon/authenticated에 권한을 주지 않습니다. RLS는 추가 방어이며 서버 역할 자체 권한도 최소화합니다 [S06].

## command 봉투
```
{
  protocolVersion: 1,
  tableId: 'uuid',
  sessionId: 'uuid',
  commandId: 'uuid',
  expectedVersion: 12,
  type: 'STAR_PLAY',
  payload: { cardId: 'opaque-card-id' }
}
```
actorId는 클라이언트 필드가 아니라 소켓의 검증된 userId입니다. 서버가 cardId에서 카드 정보를 찾습니다. color/value/score를 클라이언트가 결정해서 보내지 않습니다. 응답은 commandId, acceptedVersion, status, 공개 오류 코드만 담습니다.

## 게임 명령
| 명령 | 허용 단계 | payload | 성공 결과 |
|---|---|---|---|
| STAR_PLAY | PLACE | cardId | 내 경로에 배치, DRAW로 전환 |
| STAR_DISCARD | PLACE | cardId | 해당 버림 더미 맨 위에 추가, DRAW |
| STAR_DRAW_DECK | DRAW | 빈 객체 | 한 장 보충, 다음 차례 또는 즉시 종료 |
| STAR_DRAW_DISCARD | DRAW | suit | 맨 위 한 장 보충, 다음 차례 |
| RESIGN | 진행 중 | 빈 객체 | 룸 서비스에서 기권 결과 확정 |

`RESIGN`, 테이블 생성·준비·초대·복구는 순수 규칙 참조 코드가 아닌 서버 서비스가 구현해야 합니다.

## 공통 오류
UNAUTHENTICATED / NOT_MEMBER / TABLE_FULL / INVITE_EXPIRED / VERSION_CONFLICT / DUPLICATE_COMMAND_MISMATCH / WRONG_PHASE / NOT_YOUR_TURN / CARD_NOT_OWNED / LOWER_OR_EQUAL / SUPPORT_AFTER_NUMBER / EMPTY_DISCARD / JUST_DISCARDED / GAME_FINISHED / SAVE_FAILED.
로그에는 내부 추적 ID를 포함하되 다른 사람의 카드와 전체 DB 오류를 응답에 노출하지 않습니다. VERSION_CONFLICT 시 최신 허용 View를 다시 받고 사용자의 행동을 재확인합니다.

## 공개·비공개 분리
공개: 세션 ID, 현재 단계, 차례, 덱 장수, 각 손패 장수, 양쪽 배치 경로, 각 버림 더미 맨 위, 공개 점수 산식, 연결 상태.
개별: 내 손패의 카드 ID/색/값, 내게 가능한 행동 안내.
서버 전용: 상대 손패, 전체 덱 순서, 버림 더미 아래 카드 배열, 비밀 난수, 토큰 해시, 원본 스냅샷. 이미 보였던 버림 카드의 공개 행동 기록을 기억하는 것과 현재 아래 카드 전체를 API로 나열하는 것은 구분합니다.

## 커밋/복구 원칙
매 승인 명령마다 스냅샷을 저장합니다. PLACED→DRAW 사이에 브라우저/서버가 종료되어도 DRAW로 복구해야 합니다. event sourcing 전체 체계를 먼저 만들 필요는 없습니다. 최신 스냅샷+명령 멱등성+공개 행동 기록이면 첫 구현의 목적을 충족합니다. 이벤트 전체에 비밀값을 실어 일반 로그로 보내지 않습니다.

## 데이터 보관 제안
진행 스냅샷: 게임 중 유지. 종료된 비밀 스냅샷: 7일 후 삭제. 명령 멱등성 기록: 종료 후 7일. 공개 결과: 90일. 일반 운영 로그: 14일. 장애 조사 등 목적에 맞게 실제 공개 정책과 일치시켜야 하며, 이는 법정 기간이라고 주장하는 수치가 아닙니다.
