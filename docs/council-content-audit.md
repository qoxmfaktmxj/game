# 밤의 의회 콘텐츠 대조 기록

확인일: 2026-10-24. 구현은 `packages/game-core/src/games/council.ts`이다. 사용자가 승인한 공식 기본판 규칙과 자체 이름·그림 방침에 따라 **FFG 2010 영문 Basic Game의 8역할·66건물, 2–7인**으로 고정했다. 흰 별 확장14건물, 대체10역할, 2016 Classic/현행판은 포함하지 않는다. 내부 `rulesVersion`과 `contentVersion`은 이 첫 구현에서 각각 `1.0.0`이다. 기존에 다른 Council 저장 형식으로 배포한 버전은 없다.

## 근거와 대조 범위

- [FFG 공식 2010 규칙](https://images-cdn.fantasyflightgames.com/filer_public/f2/e7/f2e74a36-bed7-4a38-aff4-c2e968a1c369/citadels-rules-english.pdf): 80장 중 확장14장 제외, 시작 카드4·금2, 기본역할8개, 역할 선택·호출, 2/3/7인 특수 선택, 8건물 라운드 종료와 점수. [공식 FAQ v1.2](https://images-cdn.fantasyflightgames.com/ffg_content/Citadels/support/citadels-faq.pdf): 일괄 수입, 8개 초과 건설, 보호·철거, 두 특수건물의 결합, 동점 순서. PDF는 저장소 밖에서 확인했다.
- 공식 룰북에는 전체 카드별 매수·비용 표가 없다. [2006년 실물 소유자의 구성표](https://boardgamegeek.com/thread/93185/citadels-parts-manifest)의 **기본66장 전체 매수**를 대조했다. 일반54장과 특수12장(보호 탑만2장)이 일치한다. 검색 색인에서 본문을 확인했으며 직접 페이지 요청은403이었다.
- [독립 공개 구현의 카드 목록](https://github.com/la-urre/Citadels/blob/16b27cc3676913645a5a1487f343b2802fb11829/src/main/java/com/montaury/citadels/district/Card.java)에서 추가 `TREASURY`와 `MAP_ROOM`을 제외하면 동일한66장 매수다. [비용 목록](https://github.com/la-urre/Citadels/blob/16b27cc3676913645a5a1487f343b2802fb11829/src/main/java/com/montaury/citadels/district/District.java)의 일반17종 및 특수10종 비용도 일치한다. 이 구현은 다른 판본의 관측소 비용4·연구소 수입2를 사용하므로 해당 두 수치를 채택하지 않았다. 엔진 코드는 복사하지 않았다.
- [2008년 구판 카드별 비용·효과 기록](https://boardgamegeek.com/thread/296382/citadels-strategy-and-tactics-and-so-much-more)과 [2010년 카드 설명](https://forum.gamer.com.tw/Co.php?bsn=60537&sn=102)을 대조해 영문 구판의 관측소 비용5와 연구소 수입1을 선택했다. 특수능력은 구판 카드 설명과 공식 FAQ의 조합·제한을 함께 적용했다. 이 보조 자료를 공식 카드 데이터 배포본으로 표현하지 않는다.

## 전체 수치 매핑

원작 식별자는 아래 검수 문서에서만 사용한다. 서비스에는 자체 이름과 직접 작성한 한국어 설명을 보낸다. 비용은 금, 장수는 물리 카드 수다.

| 내부 종류 | 출처 식별자 | 자체 이름 | 색 | 비용 | 장수 |
|---|---|---|---|---:|---:|
| estate | Manor | 달빛 저택 | gold | 3 | 5 |
| citadel | Castle | 백야 성관 | gold | 4 | 4 |
| palace | Palace | 별빛 궁정 | gold | 5 | 3 |
| shrine | Temple | 새벽 제단 | blue | 1 | 3 |
| chapel | Church | 청람 예배당 | blue | 2 | 3 |
| cloister | Monastery | 고요한 회랑 | blue | 3 | 3 |
| sanctum | Cathedral | 천상의 전당 | blue | 5 | 2 |
| inn | Tavern | 초승달 주막 | green | 1 | 5 |
| bazaar | Market | 등불 시장 | green | 2 | 4 |
| exchange | Trading Post | 유리 교역소 | green | 2 | 3 |
| pier | Docks | 은하 선착장 | green | 3 | 3 |
| port | Harbor | 청록 항만 | green | 4 | 3 |
| hall | Town Hall | 이야기 광장 | green | 5 | 2 |
| outpost | Watchtower | 초소의 불빛 | red | 1 | 3 |
| vault | Prison | 침묵의 수용소 | red | 2 | 3 |
| barracks | Battlefield | 붉은 훈련장 | red | 3 | 3 |
| bastion | Fortress | 철빛 요새 | red | 5 | 2 |
| memory | Haunted City | 기억 정원 | purple | 2 | 1 |
| seal | Keep | 봉인 탑 | purple | 3 | 2 |
| laboratory | Laboratory | 빛 연구소 | purple | 5 | 1 |
| forge | Smithy | 황금 작업실 | purple | 5 | 1 |
| observatory | Observatory | 별 관측소 | purple | 5 | 1 |
| memorial | Graveyard | 기억 저장소 | purple | 5 | 1 |
| gate | Dragon Gate | 달무리 관문 | purple | 6 | 1 |
| academy | University | 새벽 학당 | purple | 6 | 1 |
| archive | Library | 청람 서고 | purple | 6 | 1 |
| rampart | Great Wall | 반달 성벽 | purple | 6 | 1 |
| prism | School of Magic | 색채 연구원 | purple | 6 | 1 |

일반 구역은 황금12·푸른11·초록20·붉은11장=54장, 특수 구역은12장, 총66장이다. `createDeck`은 종류와 복제번호로 서로 다른 ID를 만든다. 모든 카드가 덱·손패·도시·선택 대기·회수 대기 중 정확히 한 곳에 있어야 한다.

## 판정과 디지털 흐름

초기 왕관은 첫 좌석이 실제 최연장자를 지목한다. 생년월일을 추정하거나 무작위로 정하지 않는다. 2·3인은 인당 두 역할이며, 2인은 두 번째와 세 번째 선택자가 제외 역할도 직접 고른다. 7인은 마지막 선택자에게 최초 비공개 제외 역할을 함께 보여 준다. 자기 역할·손패·선택 중 카드만 개인 View에 포함한다.

기억 정원은 마지막 라운드에 지었으면 색 대체를 받지 않는다. 색 대체는 하나의 색만 담당하며 최종 보너스를 최대화하는 색으로 계산한다. 달무리 관문·새벽 학당은 비용6, 최종8점이다. 역할 수입은 한 번에 받으며 색채 연구원을 포함한다. 기억 저장소는 철거 직후 다른 플레이어가 응답하는 별도 단계이고, 철거 당한 자기 자신을 구하거나 철거자 본인이 사용하는 것은 불가능하다. 성벽 지휘자의 철거는 차례의 마지막 행동이다.

현재 단판의 점수·구역 점수·보유 금까지 모두 같은 경우에는 공동승리로 표시한다. 원문은 금 비교 이후의 추가 판정은 정하지 않는다. 명령·응답이 없는 상태에 임의의 시간 제한이나 자동 기권을 추가하지 않았다.

## 실행 검증

`council.test.ts`는 덱 구성, 2/7인 선택, 왕의 공개 제외 금지, 암살된 왕의 왕관, 도둑의 이체 시점, 손패 교환, 건축가의 건설 한도, 특수건물 조합과 수입, 철거·회수, 비밀정보 투영을 검사한다. 2–7인 각3seed의18판은 개인 View만 보는 정책으로 자연 종료했으며 매 명령 뒤 JSON 복원과66장 보존을 검사했다. 서버 SDK·브라우저 검증 결과는 최종 검증 보고서에서 별도로 기록한다.
