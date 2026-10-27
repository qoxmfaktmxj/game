# 추가 네 게임의 판본·규칙·데이터 조사

확인일: 2026-10-23~24. 사용자는 공식 기본판의 작동 규칙을 따르고 이름·그림·설명은 자체 제작하도록 결정했다. 이 문서는 그 결정에 필요한 근거와 남은 빈칸을 기록한다. 원작 이름은 출처를 식별하기 위해 개발 문서에서만 사용한다. 원문 문장·그림은 서비스 콘텐츠로 가져오지 않는다.

## 판본과 현재 데이터 게이트

| 자체 게임 | 기준 판본 | 인원 | 확인한 데이터 | 아직 확인해야 하는 데이터 |
|---|---|---:|---|---|
| 와일드 스플렌더 | Splendor 2024 refresh, 기본판 | 2–4 | 규칙, 개발90장 수치의 독립 데이터3종 전행 일치, 귀족10개 사진·목록 대조 | 외부 네트워크 검증은 별도 보고 |
| 밤의 의회 | Citadels FFG 2010의 **Basic Game**, 흰 별 확장 제외 | 2–7 | 기본8역할·66건물 전체 수치, 8건물 종료, 2·3인/7인 선택 규칙 | [전체 콘텐츠 대조 기록](council-content-audit.md); 네트워크 검증은 별도 보고 |
| 황혼의 신호 | BANG! Fourth Edition 기본판 | 4–7 | 80장 종류·수트·랭크, 16인물, 7역할, 공식 FAQ, 자체 명칭, 30개 규칙 시험과 공개 View 봇 60판 종료 | 외부 네트워크 검증은 별도 보고 |
| 넘버가든 | Rummikub Classic, D-2600-1236-0041 120819 | 2–4 | 숫자104개+조커2개, 조커/최초등록/점수; 단판 공동승리 정책은 사용자 확정 | 디지털 교착·편집·타이머 정책은 아래 구분 |

**공식 규칙 근거와 전체 카드 데이터의 검증 근거는 구분한다.** Splendor의 개발90장은 아래 독립 공개 데이터3종 전체가 일치했다. Citadels의66장 데이터는 [콘텐츠 대조 기록](council-content-audit.md)에 전체 행과 판본 차이를 기록했다. 총 장수만 맞추거나 생성식으로 비슷한 밸런스를 만드는 것은 사용자 요구와 다르다.

Citadels 최신 판매판은 27역할·84건물이므로, 그것을 기본8역할 판본과 혼합하지 않는다. Classic 2016은 68건물/7건물 종료 규칙이 포함된 다른 판본이다. 구 CDN의 Classic PDF는 검색되지만 이번 세션에서 본문 다운로드가 실패했다. 접근 가능한 FFG 2010 Basic Game을 조사 기준으로 고정했다. [현재 공식 제품](https://www.zmangames.com/game/citadels/), [FFG 2010 공식 규칙](https://images-cdn.fantasyflightgames.com/filer_public/f2/e7/f2e74a36-bed7-4a38-aff4-c2e968a1c369/citadels-rules-english.pdf)

## 와일드 스플렌더

2026-10-27 표시 이름 변경(이전 이름: 빛의 공방). 사용자가 포켓몬판을 시각 참고로 요청한 뒤 **기존 기본판 규칙을 유지하고 이름·그림만 성장 테마로 변경**하도록 확정했다. 따라서 아래 수치·판본·검증 근거는 그대로 적용한다. 아기→청소년→어른, 간식 자원, 숲의 수호자 표현은 [테마 결정](wild-splendor-theme.md)을 따른다. 포켓몬판의 진화·특수카드·18점 규칙은 적용하지 않는다.

출처: [Space Cowboys 기본판 규칙](https://cdn.svc.asmodee.net/production-spacecowboys/uploads/2025/10/SCSPL01EN_SPLENDOR_RULES_LIGHT.pdf), [공식 구성 안내](https://www.spacecowboys-games.com/game/splendor/).

- 자원: 일반색5종, 각 색 2/3/4인에서 4/5/7개. 와일드5개. 시장은 등급별4장, 귀족은 인원+1개.
- 한 차례 한 행동: 서로 다른 일반색3개(색 부족이면2/1개), 같은색2개(선택 전 은행4개 이상), 예약, 구매.
- 예약≤3장. 공개 시장 또는 비공개 덱 맨위. 와일드가 없어도 예약 가능. 예약 취소 불가.
- 구매 비용=`max(0,표시비용−영구할인)`. 와일드로 대체 가능. 지불한 자원은 은행으로 반환. 시장 즉시 보충, 덱 고갈이면 빈칸 유지.
- 종료 전 자원≤10개로 반환 선택. 귀족 조건은 보너스 수만 계산하며 차례당1개, 여러 후보면 선택.
- 점수≥15로 마지막 라운드 발동. 모두 같은 횟수 차례 후 점수→구매카드 적은 수→공동승리.

서버 설계 제안: `ACTION → RETURN_TOKENS? → CHOOSE_PATRON? → NEXT`. `BUY` 입력에는 지불 벡터를 받아 와일드를 아끼거나 일반 자원을 아끼는 합법적 선택을 보존한다. 예약 카드 내용과 덱 순서를 상대 View에 넣지 않는다. 시장에서 공개 예약한 카드의 과거 공개 여부와 현재 비공개 손패를 구분한다. 보유 자원·구매 카드·귀족은 공개다.

전체 데이터 스키마는 `Development{id,tier,bonus,cost[5],points}` 90행, `Patron{id,requirements[5],points}` 10행이다. `scripts/verify-workshop-data.mjs`가 [사진 대조 추출 수치](https://github.com/anicolao/splendor/blob/HEAD/data/verified_card_properties.csv), [splendimax CSV](https://github.com/bouk/splendimax/blob/HEAD/Splendor%20Cards.csv), [seal256 CSV](https://github.com/seal256/splendor/blob/HEAD/assets/cards.csv)를 정규화하여 전행 일치를 확인하고 `workshop-cards.json`을 생성했다. 이 셋은 공식 룰북의 대체물이 아닌 수치 검증 보조자료다. 외부 엔진의 코드는 복사하지 않았다.

귀족10개는 [seal256의 수치 목록](https://github.com/seal256/splendor/blob/HEAD/pysplendor/splendor.py)과 [Chris Conboy(Liumas)의 2014년 실물 카드 사진 정리, 3쪽](https://themindcafe.com.sg/wp-content/uploads/2018/05/Splendor.pdf)을 대조했다. 사진 PDF를 렌더링하여 모든10개 요구조건을 확인했다. `splendimax`의9개와도 해당9개가 일치하며, 그 목록에서 빠진 항목은 사진의 파랑4·흰색4/3점이다. 사진은 검증용으로만 저장소 밖에 보관한다. [공식 Print & Play](https://print-and-play.asmodee.fun/en/game/splendor)는 추가 귀족/프로모 자료이며 기본90장 데이터가 아니다. 공식 [Nobles List](https://cdn.svc.asmodee.net/production-spacecowboys/uploads/2026/08/2606_Splendor_nobles_doc_EN.pdf)는 렌더링 확인 결과 역사인물 소개 자료로, 비용/요구 수치를 포함하지 않는다.

플랫폼 정책: 생년월일을 받지 않으므로 공식의 최연소 선플레이어 대신 테이블의 첫 좌석부터 시작한다. 단판 플레이·선플레이어 선택은 플랫폼 선택이며 공식 기본판의 카드/점수 규칙과 별도로 표기한다.

검증 게이트: 자원 보존, 동색2개 은행 경계3/4, 예약3장 한도, 골드 부족, 할인 초과, 귀족 다중선택, 최종 라운드, 세 단계 동점, 비공개 예약 누출.

## 밤의 의회

출처: [FFG 2010 기본 규칙](https://images-cdn.fantasyflightgames.com/filer_public/f2/e7/f2e74a36-bed7-4a38-aff4-c2e968a1c369/citadels-rules-english.pdf), [공식 FAQ v1.2](https://images-cdn.fantasyflightgames.com/ffg_content/Citadels/support/citadels-faq.pdf).

시작: 손패4·금2. 80건물에서 확장14장을 빼66장. 기본역할8장. 4/5/6인 공개제외2/1/0장과 비공개제외1장; 왕은 공개제외 불가. 왕관부터 비밀선택하고 역할번호 순 호출. 자원은 금2 또는 카드2중1(나머지 덱바닥). 기본 건설1·동일건물 금지. 8건물 완성 라운드 종료. 점수=비용합+5색3점+최초완성4점/후속완성2점+특수효과. 동점은 건물점수→금. [규칙]

| 순번/원작 식별명 | 판정할 능력 |
|---|---|
| 1 Assassin | 지목역할 차례생략·비공개 유지 |
| 2 Thief | 지목역할 호출 때 전재산 이전; 암살자·암살대상 제외 |
| 3 Magician | 손패 전체교환 또는 선택카드 덱바닥/동수드로우 |
| 4 King | 노랑수입; 왕관; 암살돼도 라운드끝 왕관 |
| 5 Bishop | 파랑수입; 도시 파괴보호 |
| 6 Merchant | 초록수입; 자원획득후 금1 |
| 7 Architect | 자원획득후 카드2; 건설≤3 |
| 8 Warlord | 빨강수입; 차례끝 비용−1로 건물1개 파괴; 완성도시 제외 |

FAQ 판정: 수입은 건설 전/후 중 한 번에 받는다. 능력 선택은 강제하지 않는다. 8개를 넘어 건설할 수 있다. 암살된 성직자는 보호하지 않는다. 묘지는 자기 자신을 구하지 못한다. [FAQ](https://images-cdn.fantasyflightgames.com/ffg_content/Citadels/support/citadels-faq.pdf)

서버 설계 제안: `DRAFT → ROLE_CALL → RESOURCES → CARD_CHOICE? → ACTIONS → DESTROY_RESPONSE? → ROUND_END`. 비공개 제외 역할/선택 역할/역할 풀/손패는 각 허용된 플레이어만 받는다. 손패 교환은 서버가 원자적으로 처리한다. 금·도시·공개 역할은 공개다. `incomeTaken`, `buildsUsed`, `abilityUsed`, `assassinatedRole`, `robbedRole`, 왕관 소유자를 저장한다.

2·3인은 각자 두 역할을 사용하며 2인은 중간에 역할을 버리는 절차를 적용했다. 7인은 마지막 선택자만 초기 비공개제외 카드까지 보고 둘 중 선택한다. 구현 범위는2–7인 전체다. 기본8역할에9번역할·8인·최신판7건물 종료를 섞지 않는다.

전체 건물 데이터: `DistrictType{id,category,cost,copies,effectId}` 합계66과 유일ID를 [콘텐츠 대조 기록](council-content-audit.md)으로 확정했다. 공식 규칙서에 개별 매수표가 없어 구판 실물 구성 목록과 카드 수치 자료를 대조하고 공식2010 규칙/FAQ로 능력을 확인했다. Observatory는 구영문판 비용5, Laboratory는 카드1장 폐기→금1을 사용한다. 최신판/다른 언어판의 비용4·금2를 혼합하지 않는다. 특수건물 전체를 구현 범위에 포함한다.

## 황혼의 신호

출처: [공식 기본판 규칙](https://www.dvgiochi.com/giochi/bang/download/Bang_rules_ENG.pdf), [공식 전체 카드 목록](https://bang.dvgiochi.com/cardslist.php?id=1&lang=en), [공식 FAQ](https://www.dvgiochi.com/giochi/bang/download/Bang!_FAQ_ENG.pdf).

### 전체80장 데이터

기호는 ♠/♥/♦/♣, 순서는 2…10,J,Q,K,A. `2–A`는13개, `×2`는 같은 수트·랭크의 별개 물리카드다. 원작 식별명은 개발용으로만 보존하고 표시명은 자체 제작한다. 아래 수치 출처는 [공식 카드 목록](https://bang.dvgiochi.com/cardslist.php?id=1&lang=en)이다.

| 식별명 | 매수 | 수트·랭크 |
|---|---:|---|
| Barrel | 2 | ♠Q,K |
| Dynamite | 1 | ♥2 |
| Jail | 3 | ♠J,10; ♥4 |
| Mustang | 2 | ♥8,9 |
| Remington | 1 | ♣K |
| Rev. Carabine | 1 | ♣A |
| Schofield | 3 | ♣J,Q; ♠K |
| Scope | 1 | ♠A |
| Volcanic | 2 | ♠10; ♣10 |
| Winchester | 1 | ♠8 |
| Bang | 25 | ♠A; ♦2–A; ♣2–9; ♥Q,K,A |
| Beer | 6 | ♥6–J |
| Cat Balou | 4 | ♥K; ♦9–J |
| Duel | 3 | ♦Q; ♠J; ♣8 |
| Gatling | 1 | ♥10 |
| General Store | 2 | ♣9; ♠Q |
| Indians | 2 | ♦K,A |
| Missed | 12 | ♣10–A; ♠2–8 |
| Panic | 4 | ♥J,Q,A; ♦8 |
| Saloon | 1 | ♥5 |
| Stagecoach | 2 | ♠9×2 |
| Wells Fargo | 1 | ♥3 |

### 인물16개

숫자는 최대체력. 아래는 개발용 효과식이며 서비스에서는 자체 인물명으로 표시한다. [공식 규칙 pp.10–11](https://www.dvgiochi.com/giochi/bang/download/Bang_rules_ENG.pdf)

| 개발 식별명 | 체력 | 효과식 |
|---|---:|---|
| Bart Cassidy | 4 | 생존한 피해1당 드로우1 |
| Black Jack | 4 | 차례 두번째드로우 공개; ♥/♦면 추가1 |
| Calamity Janet | 4 | Bang↔Missed |
| El Gringo | 3 | 타인카드 피해1당 가해자 무작위손패1 |
| Jesse Jones | 4 | 첫드로우 대신 타인 무작위손패1 가능 |
| Jourdonnais | 4 | 내장Barrel; 장비와 중첩 |
| Kit Carlson | 4 | 위3장중2획득·1덱위 |
| Lucky Duke | 4 | 판정2장중1선택·둘다폐기 |
| Paul Regret | 3 | 자신에대한거리+1 |
| Pedro Ramirez | 4 | 첫드로우 대신 버림맨위 가능 |
| Rose Doolan | 4 | 자신의사거리계산−1, 최소1 |
| Sid Ketchum | 4 | 손패2폐기→회복1, 차례밖가능 |
| Slab the Killer | 4 | Bang대응2회 필요 |
| Suzy Lafayette | 4 | 빈손패→드로우1 |
| Vulture Sam | 4 | 탈락자 손패·장비 모두획득 |
| Willy the Kid | 4 | Bang횟수 무제한 |

### 흐름·판정

4/5/6/7인 역할분배(리더,조력자,무법자,변절자)=(1,0,2,1)/(1,1,2,1)/(1,1,3,1)/(1,2,3,1). 리더만 공개·체력+1. 초기손패=체력. 리더부터: 드로우2→행동→체력만큼 손패정리. 생존좌석 최단거리. 기본사거리1, 무기사거리1/2/3/4/5. 무기1개·같은장비1개. 기본Bang1회. 리더사망: 변절자 단독생존이면 단독승, 그외 무법자승. 무법자·변절자 전멸: 리더·조력자승. [공식 규칙](https://www.dvgiochi.com/giochi/bang/download/Bang_rules_ENG.pdf)

구현해야 할 효과군은 단일공격/다중공격, 대응, 카드훔치기·폐기, 회복, 공개선택드래프트, 결투, 턴전판정, 거리·무기다. 모든 수트·랭크는 판정에 쓰이므로 생략하지 않는다. 덱이 비면 버림을 섞는다. 전체효과가 끝나기 전 다음 행동을 받지 않는다.

서버 설계 제안: `TURN_START_CHECK → DRAW_CHOICE? → ACTION → RESPONSE → DYING? → DISCARD → NEXT`. `turnPlayerId`와 `responderId`가 다를 수 있다. `pendingEffect`에는 발동카드/행위자/대상큐/필요대응수/이미사용한판정/복귀단계를 저장한다. 탈락 후 승리판정을 효과 큐보다 먼저 확인한다. 역할은 본인·공개리더·탈락자만, 손패는 본인만 공개한다. 드로우 선택 패킷도 해당 플레이어에게만 전달한다.

FAQ가 요구하는 주요 회귀시험: Slab+Barrel은 대응1개만 차감; Gatling은 Slab추가대응 제외; 결투Bang은 차례횟수 제외; Panic의 거리와 무기사거리 분리; Beer는 생존2명에서 무효지만 Saloon은 유효; 빈손패 Suzy의 결투중 드로우는 결투종료후; 치명상 Bart/ElGringo는 선회복 후 능력; Vulture리더가 조력자제거시 먼저획득 후전부폐기; Dynamite는 가해자없음; 임의폐기금지; 무법자제거보상3·리더의조력자제거전부폐기. [공식 FAQ](https://www.dvgiochi.com/giochi/bang/download/Bang!_FAQ_ENG.pdf)

추가 직접 답변: [출판사 DV Games의 2015-03-16 답변](https://boardgamegeek.com/thread/560170/can-you-play-a-beer-when-your-at-full-life)은 Sid Ketchum이 최대 체력일 때도 두 장 폐기를 선택할 수 있다고 확인한다. 체력은 최대치에서 멈춘다. 손패 정리 단계에서 이 능력으로 제한 이하가 되면 차례를 종료한다. 해당 경계와 최대 체력 선택도 회귀시험에 포함했다.

카드 문장 전체를 이 문서로 옮기지 않았다. 각 효과 구현 시 위 공식 PDF의 해당 카드 단락과 FAQ를 함께 확인해야 한다. 80장을 만들어 놓고 일부 효과를 미구현한 상태는 기본판 완료가 아니다.

## 넘버가든

출처: [공식 Classic 영어 규칙 PDF](https://rummikub.com/wp-content/uploads/2019/12/2600-English-1.pdf), [공식 규칙 다운로드 페이지](https://rummikub.com/rules/). 이 PDF의 XP/Mini XP 160개 규칙은 제외한다.

전체데이터=`색4×숫자1…13×복제2 + 조커2 =106`. 타일 ID는 복제별로 다르게 부여한다. 초기랙14. 그룹=다른색·같은숫자3/4개; 런=같은색·연속숫자≥3개; 13→1 연결불가. 최초등록≥30은 자기랙만 사용하며 조커는 표현숫자로 합산. 첫등록 다음 차례부터 보드조작 가능. 뽑기1개면 즉시차례끝. 등록후 제출은 자기랙≥1개 추가·기존보드타일전량보존·모든묶음유효. 조커는 합법묶음을 유지하는 교체/재배열로 회수해 같은차례 새묶음에 사용; 등록전 회수불가. 랙조커벌점30. 빈랙승리; 상대잔여합이 승자점수, 상대는 각각음수. 주머니고갈 후 전원더이상진행불가이면 최소랙합승리, 차이로점수계산. 기본차례1분, 미완성재배열 복구벌점3개. [공식 PDF]

디지털 구현: 클라이언트 작업 보드는 로컬에 유지하고 `GARDEN_PLAY`에서 최종 보드를 원자적으로 검증한다. 각 조커의 최종 색·숫자는 서버가 검증한다. 다른 플레이어에게는 확정 보드·랙장수·주머니수만 공개한다. `GARDEN_BEGIN`으로 서버에 편집 시작을 알리고, 시간초과 시 편집중이면3개/그외1개를 뽑는다. `GARDEN_RESET`으로 로컬 작업과 편집 상태를 함께 되돌린다. 연결 이탈 중에는 남은 시간을 저장해 일시정지한다.

조커 재배열의 해석 근거: 2019 기본 규칙3쪽 예시2·3은 조커의 기존 표현 숫자와 같은 타일을 넣지 않고도 런을 나누거나 끝을 이동해 조커를 회수한다. 4쪽 예시4는 원래 조커가 있던 런 자체를 해체하여 다른 그룹들로 재배치한다. 따라서 원래 묶음을 보존하거나 정확히 같은 숫자 타일로만 교체하도록 제한하면 합법적 재배열을 막는다. 추가로 공식 홍콩·마카오 유통사가 심판을 맡은 [2026년 75주년 대회 규정의 조커 예시2·3](https://www.themills.com.hk/wp-content/uploads/2026/02/Rummikub-75th-Anniversary-Party-Championship_Important-Notes-for-Participants-and-Competition-Rules-1.pdf)은 `조커5·6·7 → 6·7·조커8·랙의9`처럼 같은 런 안에서 조커의 값이 바뀌는 조작도 허용한다. 이 대회 문서는 기본판을 대체하지 않고 해당 재배열 해석의 보조 근거로만 쓴다. 최종 보드가 모두 유효하고 기존 타일이 모두 남으며 자기 랙 타일을1개 이상 냈는지를 검사한다.

플랫폼 정책: 주머니가 빈 뒤 각 플레이어가 한 바퀴 동안 뽑기/진행불가를 선택하면 교착을 확정한다. 서버가 모든 합법 수를 탐색해 증명하는 방식은 아니다. 기본판 PDF에는 최저 랙 합 동률의 세부 판정이 명확하지 않다. 사용자가 **공동 승리로 표시하고 이번 판 점수는 합산하지 않기**를 선택했으므로, 최소 합 동률이면 `BLOCKED_TIE`로 공동 승리하고 모든 플레이어의 해당 판 점수는0이다. 2026년 대회 규정의 동률 점수 분할/최소 타일 수 비교는 적용하지 않는다. 이러한 디지털 정책은 공식 카드·타일 규칙과 구분한다.

검증 게이트: 106ID보존, ID복제/타인랙삽입/보드삭제 거부, 최초30경계, 최초등록과 보드조작분리, 조커두개·회수·런분할, 13/1금지, 뽑은즉시사용금지, 잘못된작업원자적거절, 고갈/점수, 모바일 키보드와 드래그 동일결과. 고정 valid/invalid fixture≥50개 요구는 원본 패키지의 검수 조건이다.

## 저장·통신 공통 제안

공식 룰북이 정하는 사항이 아니라 이 저장소의 네트워크 구현 요구다. 네 게임 모두 순수 `create/apply/view/result` 경계로 둔다. 모든 선택 대기 단계와 효과 큐를 저장하고, ACK는 저장 이후 전송한다. 액터는 인증 연결에서 결정한다. `commandId`, `expectedVersion`, `rulesVersion`, `contentVersion`을 유지한다. 재접속은 선택 중인 자신의 비공개 선택지만 복구한다. 연결 끊김을 게임 내 패배나 임의 카드소비로 바꾸지 않는다.

이번 조사에서 내려받은 공식 PDF와 추출 텍스트는 저장소 밖 `%TEMP%/ringuringu-rules-research/`에만 두었다. `public/`, 앱 빌드, Git에 포함하지 않았다. `splendor.pdf`, `bang.pdf`, `bang-faq.pdf`, `rummikub.pdf`, `citadels-2010.pdf`, `citadels-current.pdf`, `citadels-faq.pdf`, `splendor-nobles.pdf`가 해당한다. 이 문서는 출처 검토 기록이며 구현·네트워크 플레이 검증 완료 보고가 아니다.

## 2026-10-27 스플렌더 재검토

사용자가 제공한 카드 사진, WING 설명과 공식 기본판 PDF를 다시 확인했다. 모든 등급의 카드당 할인은 1이며, 점수와 별도로 누적되는 현행 판정이 맞다. 포켓몬판 복수 아이콘과 진화 규칙은 적용하지 않는다. 나무위키 직접 열기는 실패했다. [표시 변경과 재검토 근거](web-assets-and-workshop.md)에 기록했다.
