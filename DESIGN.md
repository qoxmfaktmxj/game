---
name: 링구링구
description: 친구들과 모이는 작고 선명한 게임 클럽
colors:
  canvas: "#fafafa"
  paper: "#ffffff"
  ink: "#252528"
  forest: "#f4f4f4"
  deep: "#252528"
  muted: "#66666c"
  line: "#e3e3e6"
  mint: "#345884"
  gold: "#345884"
  primary-fill: "#94b2df"
  primary-hover: "#83a5d6"
  primary-ink: "#182b45"
  accent-text: "#345884"
  brand: "#94b2df"
  brand-soft: "#f0f5fc"
  focus: "#345884"
  club-coral: "#f7cbb8"
  club-lilac: "#ded8f4"
  club-sky: "#cbe9f1"
  club-amber: "#f8e1ad"
  aurora: "#806018"
  ember: "#93462f"
  tide: "#26606c"
  moss: "#385c3c"
  dusk: "#655176"
  star-canvas: "#fafafa"
  star-paper: "#ffffff"
  star-table: "#ffffff"
  star-ink: "#252528"
  star-muted: "#66666c"
  star-line: "#e3e3e6"
  star-blue: "#345884"
  star-blue-hover: "#83a5d6"
  star-board-muted: "#66666c"
  star-board-line: "#e3e3e6"
  star-card-line: "#d4d4d9"
  star-aurora: "#8B591B"
  star-ember: "#A34734"
  star-tide: "#23677C"
  star-moss: "#407052"
  star-dusk: "#7354A2"
typography:
  display:
    fontFamily: "Pretendard, sans-serif"
    fontSize: "48px"
    fontWeight: 700
    lineHeight: 1.22
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Pretendard, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Pretendard, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  button:
    fontFamily: "Pretendard, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.4
  star-rank:
    fontFamily: "Pretendard, sans-serif"
    fontSize: "25px"
    fontWeight: 850
    lineHeight: 1
    letterSpacing: "-0.03em"
  star-card-label:
    fontFamily: "Pretendard, sans-serif"
    fontSize: "12px"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "-0.02em"
rounded:
  button: "10px"
  input: "9px"
  card: "7px"
  surface: "16px"
  dialog: "16px"
  star-card: "10px"
  star-stack: "9px"
spacing:
  page-gutter: "40px"
  phone-gutter: "20px"
  game-shelf-gap: "20px"
  star-stack-step: "32px"
  star-stack-step-phone: "24px"
  star-discard-stack-step: "25px"
  star-discard-stack-step-phone: "21px"
  star-lane-gap: "12px"
  star-hand-gap: "10px"
components:
  button-primary:
    backgroundColor: "{colors.primary-fill}"
    textColor: "{colors.primary-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "12px 20px"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "12px 20px"
  dialog:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.dialog}"
    padding: "32px"
  star-button-primary:
    backgroundColor: "{colors.primary-fill}"
    textColor: "{colors.primary-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "12px 20px"
  star-button-primary-hover:
    backgroundColor: "{colors.star-blue-hover}"
    textColor: "{colors.primary-ink}"
  star-button-secondary:
    backgroundColor: "{colors.star-paper}"
    textColor: "{colors.star-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "12px 20px"
  star-card:
    backgroundColor: "{colors.star-paper}"
    textColor: "{colors.star-ink}"
    rounded: "{rounded.star-card}"
    width: "88px"
    height: "148px"
  star-card-rank:
    backgroundColor: "{colors.star-paper}"
    textColor: "{colors.star-ink}"
    typography: "{typography.star-rank}"
    height: "32px"
    padding: "0 6px"
  star-dialog:
    backgroundColor: "{colors.star-paper}"
    textColor: "{colors.star-ink}"
    rounded: "{rounded.dialog}"
    padding: "32px"
---

# Design System: 링구링구 — Paper Club, Open Air

## Overview

**Creative North Star: "Paper Club — 담백한 종이 위에, 카드가 주인공."**

친구가 들어와 게임을 고르고 함께 앉는 작은 게임 클럽이다. **2026-10-26 첫 전면 재디자인**에서 밝은 Paper Club으로 바꿨고, 후속 색감 조정을 거쳤다. **2026-10-27 사용자는 초록 기가 있는 중성색을 거부하고 흰색에 가까운 오프화이트, 하나의 포인트색을 요청한 뒤 PANTONE 15-3922 Open Air를 선택했다.** 현재는 기존 배치를 유지하면서 무채색에 가까운 흰 표면과 Open Air 계열의 한 가지 강조색을 쓴다. 기존 두 고리 아이콘은 사용자의 교체 요청에 따라 겹쳐 펼친 카드 두 장의 벡터 표식으로 바꾼다. 한국어 이름과 게임이 바뀌어도 테이블을 유지하는 제품 개념은 보존한다.

홈은 실제 확정 동물 카드 샘플과 작은 다섯 게임 선반을 보여 준다. 대기실은 참가자·초대·준비를 가까이 놓고, 인게임은 카드·현재 차례·다음 행동을 우선한다. 존재하지 않는 이용자 수·랭킹·채팅·매칭 기능을 홍보하지 않는다. 현재 색·아이콘·문구 변경은 [Open Air 작업 기록](docs/open-air-refinement.md)에 정리한다. 이전 색감은 [Ink and Vermilion 기록](docs/ink-club-restyle.md), 첫 구성 변경은 [Paper Club 기록](docs/paper-club-redesign.md), 2026-10-23 사례 조사는 [기존 조사](docs/design-references-2026.md)에 역사로 보존한다.

2026-10-25부터 확정한 첫 게임의 동물 50면, 숫자·이름의 HTML 표찰, 공개 카드 스택은 그대로 사용한다. 원본 기준은 `docs/art/sky-hop-final-selection.json`이다. **2026-10-27 사용자는 첫 게임의 표시 이름을 정확히 `로스트 팻츠`로 확정했다.** 원본 명세의 별길 탐험과 같은 게임이며 내부 `star-trails`와 규칙은 유지한다. 대표그림은 같은 날 선택한 B안으로, 숫자 2–10의 3×3 배열과 오른쪽 큰 `×2` 수달 카드로 구성한다. 다른 네 게임은 기존 자체 이름과 그림을 쓴다.

**Key Characteristics:**

- 자체 호스팅 Pretendard와 읽을 수 있는 실제 카드 숫자.
- 흰색·오프화이트 중심의 공통 셸과 Open Air 한 계열의 행동·브랜드·포커스.
- 기존 두 고리를 대신하는 겹쳐 펼친 카드 두 장의 SVG 브랜드 표식.
- 확정 동물 카드와 기존 자체 게임 아트를 중심으로 한 게임 선택.
- 사람·차례·가능한 행동을 구별하는 이름, 도형, 문장.

## Colors

기본 토큰의 기준은 `apps/web/app/tokens.css`의 마지막 `:root` 블록이며, 실제 공통 배치는 `paper-club.css`가 정한다. `globals.css`의 `canvas`, `paper`, `ink`, `mint` 등은 호환용 이름으로 이 토큰을 참조한다. 게임별 세부 재료는 `star-theme.css`, `star-board.css`, `multigame.css`, `council-board.css`, `signal-board.css`에서 선언한 토큰을 따른다. 코드와 문서가 다르면 실행되는 CSS 값을 확인하고 문서를 갱신한다.

### Primary

주 행동과 브랜드 채움은 `--color-accent`의 Open Air 디지털 근사색 `#94b2df`, 호버는 `#83a5d6`다. 밝은 강조색 위에는 흰 글자 대신 `--color-accent-ink`의 `#182b45`를 쓴다. 작은 링크·상태 문장·포커스·필수 윤곽에는 같은 계열의 더 짙은 `--color-accent-text` `#345884`를 사용한다. 선택 배경은 `#f0f5fc`이며 넓은 바탕은 중성 흰색으로 유지한다. 이것은 두 개의 포인트색을 혼용하는 것이 아니라 한 색 계열을 채움과 읽기 역할에 맞춰 나눈 것이다.

사용자가 선택한 명칭은 **PANTONE 15-3922 Open Air**다. `#94b2df`는 보조 색상 자료의 디지털 근사값을 앱에 채택한 것이며, 공식 Pantone HEX나 화면·인쇄 색 일치를 검증했다는 뜻이 아니다. 근거와 한계는 [색상 선택 기록](docs/open-air-refinement.md)에 남긴다. 기존 `mint`·`gold`·`star-blue`·`--board-blue`는 호환용 식별자이며 필요한 텍스트·윤곽에 짙은 계열색을 전달한다. 수트·자원·게임 아트의 의미 있는 고유 색은 유지한다.

### Secondary

게임 표지의 부드러운 라임·코럴·라일락·앰버·스카이는 게임을 구분하는 배경이다. 카드의 숫자·이름은 흰 표면 위의 짙은 잉크로 읽힌다. 공방 자원, 의회 구역, 가든 타일의 색 의미는 자체 이름·도형·문장과 함께 전달한다. 첫 게임의 `star-aurora`·`star-ember`·`star-tide`·`star-moss`·`star-dusk`는 동물 계열의 범례·점수에 쓰며 카드 그림을 바꾸는 근거가 아니다.

### Neutral

전체 바탕 `canvas`는 `#fafafa`, 카드·대화상자 `paper`는 `#ffffff`, 본문 `ink`는 `#252528`이다. 보조 표면은 `#f4f4f4`, 비활성 표면은 `#e9e9eb`, 보조 글자는 `#66666c`, 경계는 `#e3e3e6`, 실제 카드 경계는 `#d4d4d9`다. 사용자가 원하는 흰 인상을 위해 넓은 표면에는 초록·노랑·파랑을 섞지 않는다. 선택에만 옅은 Open Air 계열을 제한적으로 쓰고, 손패·공용 보드의 바탕은 흰색과 밝은 회색의 명도 차이로 구분한다. `ink`는 어두운 글자색이며 이전 다크 셸의 밝은 전경으로 해석하지 않는다.

**범위 변경 결정.** “첫 게임의 밝은 테마를 홈·다른 네 게임으로 확장하지 않는다”는 2026-10-25의 제한은 이번 2026-10-26 전면 재디자인 요청으로 대체됐다. 공통 밝은 셸은 전역에 적용하되 동물 카드·이름·규칙·스택은 로스트 팻츠의 고유 콘텐츠다. 사용자가 거부한 누런 회색·베이지 비교색 `#F4F1EA`·`#E7E3D9`는 표면색으로 되돌리지 않는다.

## Typography

자체 호스팅 Pretendard 가변 글꼴을 제목·본문·조작에 공통 사용한다. 홈 제목은 기본 48px, 굵기 700, 1.22 행간, 제목 자간 토큰은 -0.03em이다. 1100px 이하 40px, 760px 이하 36px, 374px 이하 32px로 조정한다. 홈 섹션 제목은 24px, 게임 제목은 20px, 일반 본문은 16px이다. 공통 화면의 제목 굵기를 주로 700으로 정돈하되 게임 숫자·동물 이름 표찰의 기존 굵기와 치수는 유지한다. 밀도가 필요한 게임 설명·메타는 해당 화면의 12–14px 규칙을 따른다. 레이블은 본문 서체와 보통 자간을 사용한다.

게임 숫자는 고정폭 숫자를 사용한다. 순서·차례·장수 정보를 장식처럼 작게 줄이지 않는다. 손패·타일의 필수 조작은 최소 44px 터치 표적과 별도 가로 스크롤을 확보한다. 모바일 게임 정보가 많으면 구조를 바꾸거나 접고, 글자 축소만으로 해결하지 않는다.

첫 게임도 같은 Pretendard를 유지한다. 기본 숫자는 `star-rank` 25px, 지원 표시 `×2`는 22px, 동물 이름은 `star-card-label` 12px이다. 모바일 손패와 상세 카드는 숫자 22px·지원 20px을 쓴다. 모바일 공개 길은 숫자 17px·지원 15px·이름 9px, 버림 더미는 데스크톱 숫자 19px·지원 17px·이름 10px, 모바일 숫자 16px·지원 14px·이름 9px이다. 겹친 이전 카드에도 실제 카드의 상단 숫자를 그대로 노출하며 별도의 작은 숫자 띠를 덧붙이지 않는다. 갤러리는 숫자 36px·지원 32px·이름 18px, 760px 이하에서는 29px·26px·16px을 쓴다.

**The Live Card Rule.** 동물 그림은 정체성을, HTML 숫자·이름·배수는 규칙을 전달한다. 카드 이미지나 드래그 미리보기를 게임 상태의 근거로 사용하지 않는다.

## Layout

기본 콘텐츠 폭은 최대 1280px로 가운데에 놓고, 기본 좌우 여백은 40px이다. 760px 이하는 20px, 374px 이하는 16px로 줄인다. 넓은 화면에서는 바깥 여백만 늘어난다. 홈은 짧은 기존 제목과 만들기·초대 입장, 확정 카드 3장 샘플, 다섯 게임 선반, 간결한 푸터 순서다. 760px 이하에서는 샘플 장면을 접고 게임 선반을 2열로 전환하며 첫 게임을 한 줄 전체에 이미지·설명으로 배치한다. 긴 소개·이용 단계·새 홍보 수치를 추가하지 않는다.

모바일 헤더의 게임 목록·테이블·카드 보기·이용 방법 등 기존 탐색 기능을 감추지 않는다. 브랜드·계정 다음 줄로 탐색을 옮겨 동작을 유지한다. 로비의 내 테이블은 큰 타일을 겹치기보다 구분선이 있는 행 목록으로 보여 준다. 대기실은 데스크톱 참가자 격자와 게임 설명, 모바일 참가자 행 목록과 준비 버튼을 사용한다. 최대 정원의 빈자리·봇 추가·삭제·초대·준비 기능은 유지하며 크기와 밀도를 조정한다.

공방은 시장·후원자를 왼쪽, 선택한 작품·빛 보관소·내 자원·예약·반환을 오른쪽에 모은 작업대를 쓴다. 좁은 화면은 한 열이며, 작품을 선택하면 조작 열 맨 위 패널로 포커스와 필요한 만큼의 스크롤을 보내 조작 위치를 찾을 수 있게 한다. 의회는 손패와 역할·도시 능력·차례 종료를 하나의 작업 영역에 묶고 모바일 손패를 한 줄 가로 스크롤로 보여 준다. 신호의 모바일 손패는 카드 폭 132px로 다음 카드 일부가 보여 옆으로 넘길 수 있음을 알 수 있게 한다. 서버 좌석 순서·거리·차례는 재배치하지 않는다.

로스트 팻츠는 1101px 이상에서 공개 보드와 400px 개인 영역을 24px 간격의 두 열로 배치한다. 왼쪽 공개 보드는 상대의 다섯 길→공용 버림 더미·덱→내 다섯 길 순서를 유지한다. 오른쪽 `.star-personal-zone`에는 손패 4열, 바로 아래 행동 바, 그 아래 도움말을 둬 쌓인 공개 카드가 길어져도 손패와 놓기·버리기 동작이 떨어지지 않게 한다. 개인 영역 전체의 sticky는 뷰포트 높이도 1200px 이상일 때만 적용하며, 보통 높이에서는 자연스럽게 스크롤한다. 1100px 이하에서는 공개 보드 아래에 손패와 행동을 두고 도움말은 숨긴다. 공개 길과 버림 더미는 프리셀처럼 모든 카드를 쌓인 순서대로 겹친다. 먼저 놓인 카드의 실제 상단 숫자가 모두 보이고 마지막 카드 전체가 보인다. 최근 네 장 제한은 두지 않는다. 길과 버림 더미의 시작선을 위로 맞추며, 장수가 늘면 행 높이와 페이지 스크롤이 자연스럽게 늘어난다. 길이나 버림 더미를 누르면 전체 카드 상세를 연다. 버림 카드를 실제 가져오는 행동은 별도 버튼으로 구분한다.

공개 길 카드는 기본 최대 104×170px, 640px 이하 최대 64×115px, 374px 이하 최대 54×102px다. 겹침 간격은 `star-stack-step` 32px과 `star-stack-step-phone` 24px을 따른다. 버림 더미 카드는 최대 72×124px, 640px 이하 최대 48×88px, 374px 이하 높이 80px이며 너비는 열 안에 맞춘다. 버림 더미의 겹침 간격은 `star-discard-stack-step` 25px과 `star-discard-stack-step-phone` 21px이다. 덱 뒷면도 해당 버림 카드 높이에 맞춘다. 손패 카드는 기본 88×148px, 모바일 76×132px이다. 1101px 이상에서는 400px 개인 영역 안의 4열 Grid에 4px 간격으로 놓고, 카드 아래 끌기 손잡이의 최소 높이 44px을 유지한다. 1100px 이하에서는 한 줄 손패 영역 안에서 가로로 스크롤한다. 상세창의 `.small` 카드는 78×134px이다. 드래그 미리보기는 손패 너비와 88:148 비율을 사용한다. 카드 표면의 터치 스크롤을 보존하고 아래의 별도 44px 끌기 손잡이로 터치 드래그를 시작한다. 모바일 행동 버튼은 안내 아래에 나란히 배치한다.

`PlayingCard`는 상단 숫자, 가운데 그림, 하단 동물 이름의 세 Grid 행으로 구성한다. 손패·공개 길·버림 더미·상세창·모아보기·드래그 미리보기는 모두 같은 구조를 사용한다. 가운데 `.card-art-window`는 `position: relative`와 `min-height: 0`을 가진 전용 영역이며, `Image fill`을 그 안에 두고 `object-fit: contain`으로 전신을 표시한다. 숫자와 이름은 자기 행에 놓아 그림 위에 겹치지 않는다. 이미지 전체에 하단 padding을 주어 표찰 자리를 만드는 이전 방식은 사용하지 않는다.

| 카드 영역                    | 상단 숫자 행 | 하단 이름 행 |
| ---------------------------- | -----------: | -----------: |
| 기본 손패·드래그 미리보기    |         32px |         22px |
| 모바일 손패·상세 `.small`    |         28px |         20px |
| 공개 길 데스크톱 / 모바일    |  32px / 24px |  22px / 16px |
| 버림 더미 데스크톱 / 모바일  |  25px / 21px |  18px / 16px |
| 갤러리 데스크톱 / 760px 이하 |  52px / 44px |  40px / 34px |

공개 스택의 상단 행 높이는 겹침 간격과 같은 값을 사용한다. 가운데 그림 행은 남은 공간을 사용하며, 긴 더미에서는 마지막 카드의 세 영역만 전부 노출된다.

현재 카드 아트는 품종·행동이 다른 확정 PNG 50면이다. 내부 계열과 이름의 대응은 `aurora=멍이`, `ember=냥이`, `tide=물개`, `moss=수달`, `dusk=랑이(아기 호랑이)`다. 각 계열은 지원 면 하나와 숫자 2–10의 개별 그림을 가진다. 지원 카드 3장은 같은 지원 그림을 사용하므로 실제 덱은 숫자 45장·지원 15장의 60장이다. 손패·공개 길·버림 더미·상세창·`/cards`는 같은 확정 면을 사용하고, 대기실 대표 그림은 각 계열의 지원 면을 재사용한다. 그림에는 숫자와 이름을 넣지 않고 흰 HTML 표찰로 올린다. Next.js 최적화 이미지를 표시 크기에 맞게 전달한다.

2026-10-25 후속 결정: 사용자는 **하늘 깡총**의 페리윙클 계단 윤곽·버터/하늘/코랄 파스텔·어설프게 귀여운 아기 동물 화풍을 확정했다. 카드별 그림은 멍이의 견종, 냥이의 묘종, 물개·수달·랑이의 행동으로 구분한다. 계열별 ×2·2·3 → 4·5·6 → 7·8·9·10 순서로 총50면을 준비했다. 이전 선택과 실험 자료는 로컬 제작 기록으로 보존한다.

2026-10-26 확정: 멍이·냥이 지원과2–6의 포즈를 다양화하고, 멍이10은 **회색 보더콜리 v5**, 냥이10은 **터키시 앙고라**, 물개10은 **옆으로 기대 쉬기**, 수달8은 **포근한 포옹**으로 정했다. [확정 적용 기록](docs/art/sky-hop-release.md)과 [최신50면 선택](docs/art/sky-hop-final-selection.json)이 기준이다. 실제 게임의 모든 카드와 대기실·갤러리는 이 확정 그림을 사용한다. 50면/60장 덱 수량과 배치·가져오기·점수 규칙은 유지하며, 버림 더미 전체 공개에 관한 후속 결정은 [표시·공개 범위 기록](docs/star-trails-display.md)을 따른다.

`/cards`는 서로 다른50가지 품종·포즈의 확정 그림과 지원 누적 배수를 보여준다. 카드 비율은 2:3이며, 그림 전신과 꼬리는 가운데 전용 영역 안에 contain으로 표시한다. 카드 상단에는 숫자/×2만 두고 하단에는 동물 아이콘과 이름만 둔다. 하단에 숫자/×2를 중복 표시하지 않는다. 생성 근거는 `docs/art/sky-hop-approved-prompts.json`, 현재 적용 범위는 `docs/card-art.md`를 따른다. 홈 탭 제목은 `링구링구`, 테이블은 `링구링구 - 게임이름`이다.

## Elevation & Depth

일반 UI는 표면색과 얇은 경계로 구분한다. 같은 표면에 두꺼운 테두리와 넓은 그림자를 중복하지 않는다. 홈 샘플 카드는 `--shadow-card`의 `0 6px 14px #25252826` 그림자로 실제 종이 카드의 깊이만 남긴다. 대화상자는 흰 표면과 `--shadow-dialog`의 `0 24px 80px #2525281a` 그림자, `#2525286b` 배경막을 사용한다. 카드 그림은 생성한 원본 래스터 이미지로 깊이를 만들고 CSS로 그럴듯한 3D 일러스트를 흉내내지 않는다.

첫 게임의 손패 카드는 그림자 없이 밝은 표면과 얇은 중립 경계를 쓴다. 겹친 공개 카드에는 `0 2px 5px`와 공통 잉크 8%의 그림자, 들고 이동 중인 카드에는 `0 12px 25px`와 잉크 21%의 그림자를 사용해 실제 상태 차이를 보여준다. 첫 게임 대화상자는 공통 밝은 표면, `0 24px 80px`와 잉크 19%의 그림자, 공통 배경막을 사용하며 배경을 흐리게 하지 않는다.

기존 `public/art/club-*.png` 5장은 2026-10-24 imagegen으로 생성한 오리지널 홍보 이미지다. 사적인 원본 사진이나 기존 게임 그림을 입력으로 사용하지 않았다. 보이는 도구는 콘셉트 아트이며 카드 구성·숫자·게임 규칙의 근거가 아니다. Next Image가 화면 크기에 맞게 최적화하여 전달하며 이전 원본은 public에 보존한다.

로스트 팻츠의 현재 대표그림은 2026-10-27 확정한 B안 `apps/web/public/art/club-lost-pets.png`다. 기존 확정 아트로 숫자 2–10의 3×3 배열을 만들고 오른쪽에 큰 `×2` 수달 카드를 둔다. 이 홍보용 조합은 50면·60장 덱이나 게임 카드의 숫자·그림·표찰 치수를 바꾸지 않는다.

## Shapes

주요 브랜드 표식은 서로 다른 각도로 겹쳐 펼친 둥근 카드 두 장이다. 뒤 카드는 흰색, 앞 카드는 Open Air 채움과 두 개의 작은 카드 무늬를 사용하고 짙은 같은 계열 윤곽으로 읽힌다. 2026-10-27 사용자가 기존 두 고리 아이콘 교체를 명시적으로 요청했다. 헤더의 `Logo`와 `app/icon.svg` 파비콘은 같은 벡터 구성을 사용하며, 링구링구 글자와 마침표는 유지한다. 그림은 브랜드 모티프이며 실제 덱 구성이나 카드 수치를 뜻하지 않는다.

공통 표면·대화상자는 16px, 표지는 14px, 홈 카드 샘플은 12px, 버튼은 10px, 기존 입력은 9px 모서리를 쓴다. 원형은 카드 표식의 작은 무늬·아바타·게임 포스터의 작은 이동 버튼·단계 아이콘에 한정한다. 의미 없는 pill·badge를 헤드라인 위에 쌓지 않는다.

첫 게임은 둥근 직사각형 카드와 실제 카드가 쌓인 모양을 반복한다. 손패는 `star-card`, 공개 길은 `star-stack` 모서리를 사용하고 숫자는 카드의 상단 행에 배치한다. 작은 공개 카드는 6px, 갤러리 카드는 14px 모서리다. 빈 길은 점선 카드 윤곽 안에 동물 아이콘만 두고 안내 문구를 반복하지 않는다. 가능한 목적지에는 짙은 강조색 윤곽선과 화살표를 추가한다.

## Components

### 공통 버튼·입력

주 버튼은 Open Air 채움과 짙은 `#182b45` 글자이며 최소 높이 44px, 홈의 주요 만들기 버튼은 48px이다. 보조 버튼은 흰 바탕·짙은 글자·1px 안쪽 경계다. 호버·눌림은 짧은 transform과 색 변화로 표현하고, 포커스는 `#345884`의 3px 윤곽선과 4px 간격을 지연 없이 표시한다. 비활성 버튼은 중성 회색 표면과 보조 글자로 구분하며 게임별 활성 스타일이 이 표현을 덮지 않게 한다. 입력·선택에는 명시적 레이블을 제공한다.

첫 게임의 같은 버튼은 `star-button-primary`·`star-button-secondary`로 공통 색을 적용하고 짙은 계열색 3px 포커스 윤곽선과 4px 간격을 유지한다. 흰 입력 표면에는 어두운 글자와 중성 경계를 쓴다. 단계 표시는 `놓기·버리기`, `가져오기`, 상대 차례에는 `대기`다. 보드의 행동 버튼은 최소 44px 높이이며 `버리기`와 `놓기`로 표시한다. 선택 상태만으로 명령을 제출하지 않는다. 설정에서는 가능한 경우 왼쪽에 `이번 게임 기권하기`, 오른쪽에 `로그아웃`을 둔다.

대기실의 준비 전 버튼은 사용자의 요청에 따라 **`준비`**로 표시한다. 준비 후의 `준비 완료 · 취소`와 실제 READY 토글 동작은 유지한다. 게임 설명 하단의 확인 버튼은 **`닫기`**이며 이전 `좋아요, 알겠어요`와 동의 체크 아이콘을 사용하지 않는다. 상단 X 닫기, Escape, 포커스 복귀도 그대로 동작한다.

### 동물 카드·공개 길

카드는 불투명한 숫자·동물 이름 표찰과 작은 동물 도형을 함께 쓴다. 지원 면의 `×2`는 카드 종류를 나타내며, 누적 점수 배수는 지원 1/2/3장에 따라 `×2/×3/×4`다. 규칙·보드 안내·갤러리에서 이 차이를 설명한다. 공개 길의 장수와 실제 배수는 서버 View에서 읽고 길 상세는 전체 카드와 점수 계산을 제공한다.

버림 더미는 먼저 버린 카드부터 마지막 카드까지 서버 View의 공개 배열 순서를 그대로 보여준다. 숫자순으로 재정렬하지 않는다. 더미를 누르는 행동은 상세 확인이며 명령을 전송하지 않는다. `가져오기`와 상세창의 `마지막 카드 가져오기`는 서버가 허용한 때에만 활성화하고 맨 위 한 장만 가져온다. 방금 버린 카드와 그 아래 카드를 같은 차례에 가져올 수 없는 기존 제한을 유지한다.

카드를 누르면 선택하고 명시적 버튼으로 놓거나 버릴 수 있다. 마우스는 카드에서 드래그를 시작할 수 있고, 터치는 별도 끌기 손잡이를 쓴다. 유효한 같은 계열 목적지만 강조하며 무효 놓기·Escape·상태 변경에서는 이동을 취소한다. 이동 미리보기와 안내는 시각 피드백이며 손패·보드의 실제 위치는 승인된 새 View가 올 때 바뀐다.

### 모션·대화상자·상태

홈의 가운데 샘플 카드만 6초 주기의 작은 위아래 transform을 사용한다. 화면 밖·숨겨진 탭·수동 정지·OS 모션 감소·장면 호버·장면 내부 포커스에서는 멈춘다. 기존 궤도 선·큰 홍보 이미지 반복 모션은 사용하지 않는다. 앱 설정의 개인 모션 감소 토글은 다시 추가하지 않고 OS의 `prefers-reduced-motion`과 Motion 설정을 따른다. 버튼·표지의 짧은 피드백은 `--dur-micro` 120ms, 신호 진영 공개는 160ms opacity이며 height를 애니메이션하지 않는다. 모션 감소에서는 완성된 정지 화면을 유지하고 서버 승인이나 재접속을 애니메이션 완료와 연결하지 않는다.

모달의 기본 포커스, Tab/Shift+Tab 순환, Escape, 닫은 뒤 포커스 복귀는 기존 네이티브 dialog 구현을 유지한다. 오류는 밝은 붉은 표면과 짙은 붉은 설명으로 표시한다. 연결 끊김·저장·준비 상태는 문장과 아이콘을 함께 쓴다.

첫 게임의 승인된 공개 변화는 200ms 도착 피드백, 결과 아이콘은 480ms 피드백을 사용한다. OS 모션 감소에서는 둘 다 멈춘다. 준비 완료는 옅은 Open Air 표면과 짙은 같은 계열 문장, 오류는 밝은 붉은 표면과 진한 붉은 문장, 결과 승자는 옅은 선택 배경과 점수로 구별한다. 첫 게임 설정·규칙·상세창도 같은 흰 대화상자 규칙을 따른다.

## Do's and Don'ts

### Do:

- **Do** 조용한 공통 셸과 표현력 있는 게임 아트를 구분한다.
- **Do** 흰색·오프화이트 공통 바탕과 Open Air 한 계열의 행동·브랜드·포커스를 홈·로비·모든 게임·대화상자에 일관되게 적용한다.
- **Do** 밝은 강조색 위에는 짙은 글자를, 흰 바탕의 작은 글자·필수 윤곽에는 더 짙은 계열색을 사용한다.
- **Do** 카드·타일 숫자와 규칙은 살아 있는 HTML로 제공한다.
- **Do** 동물 이름·도형·색을 함께 사용하고 랑이는 아기 호랑이로 유지한다.
- **Do** 모바일 손패 스크롤, 44px 터치 표적, 명시적 행동 버튼과 키보드 대안을 유지한다.
- **Do** 데스크톱·390px·360px에서 실제 렌더와 가로 넘침을 확인한다.

### Don't:

- **Don't** 이번 공통 셸과 확정 이름·대표그림 변경을 동물 50면·규칙·서버 View 변경으로 확대한다.
- **Don't** 프런트에서 미확정 상태를 낙관적으로 확정하거나 승인된 플레이어 View 밖의 정보를 표시한다.
- **Don't** 확정된 50면을 대표 그림 5장으로 되돌리거나 지원 배수를 지수식으로 표현한다.
- **Don't** 색·3D·모션 때문에 손패·현재 차례·포커스가 흐려지게 한다.
- **Don't** 이 문서의 검토 설명을 전체 접근성 적합성 인증으로 표현한다.


## Exports

- 공통 색·서체·간격·모션: `apps/web/app/tokens.css`.
- 공통 렌더 규칙: `apps/web/app/base.css`, `apps/web/app/paper-club.css`, 기존 호환 스타일 `apps/web/app/globals.css`.
- 게임별 세부 토큰·카드 치수: `apps/web/components/star-theme.css`, `star-board.css`, `multigame.css`, `council-board.css`, `signal-board.css`.
- 현재 흰 표면·Open Air·아이콘·문구 결정과 검증 범위: `docs/open-air-refinement.md`.
- 이전 색감과 레퍼런스 기록: `docs/ink-club-restyle.md`.
- 첫 전면 재디자인의 구성·문구·검증 기록: `docs/paper-club-redesign.md`.

이 문서는 2026-10-27 사용자가 선택한 흰색·Open Air 방향, 아이콘·문구, **로스트 팻츠** 이름과 B안 대표그림을 반영한 기준이다. 이전 이름 후보와 미선택 표지는 제작 이력으로 보존한다. 모든 검증의 통과 여부는 작업 기록에 실제 실행 결과가 기록된 범위로 한정한다.

## 2026-10-27 와일드 스플렌더 가독성

사용자 요청으로 게임 자원에만 선명한 색을 적용한다. 꿀 #b45b00, 연어 #1764d9, 캣닢 #078440, 생고기 #d52e43, 도토리 #60351f, 황금 뼈다귀 #f6cf36. 각 색에는 서로 다른 간식 도형이 동반된다. 비용은 토큰과 숫자, 카드 오른쪽 위는 할인 토큰 하나로 표시한다. 보관소와 개인 영역은 칩 개수와 숫자를 함께 표시한다. 카드 모서리 12px, 점수 28px, 보관소 수량 20px, 개인 수량 18px, 선택 보조 표식 11px/모서리 3px을 이 게임의 밀도에 사용한다. 공통 흰 표면과 Open Air는 유지한다. 세부 구현과 웹 이미지/글꼴 변경은 [기록](docs/web-assets-and-workshop.md)을 따른다.

## 04 화이트 엠보싱과 칩 20%

와일드 스플렌더 동물 카드는 흰 표면, 중성색 얇은 테두리, 부드러운 카드 그림자와 그림 창의 옅은 안쪽 테두리를 사용한다. 상단의 넓은 자원색 띠는 제거하고 점수 색과 간식 칩으로 계열을 구분한다. 칩 주변의 흰 받침과 별도 그림자는 없다.

할인 칩 48px, 비용 칩 31.2px. 700px 이하에서는 38.4px, 27.6px. 이름은 중앙 정렬하고 비용 영역 위에 얇은 구분선을 둔다. 비용 4종은 필요한 만큼 줄바꿈하며 그림과 이름을 덮지 않는다. 실제 구현은 workshop-theme.css의 게임 전용 토큰을 따른다.

## 로스트 팻츠 01 테두리 확정

사용자는 01 얇은 컬러 테두리를 선택했다. 모든 PlayingCard에 2px 계열색 윤곽을 적용하고 흰 바탕을 유지한다. 테두리/글자 색은 멍이 #ac6b00/#704600, 냥이 #c83b64/#962346, 물개 #0878b8/#065585, 수달 #16814d/#0e5b35, 랑이 #7851b5/#563583이다. 원본 동물 그림과 카드 치수, 선택/드래그 가능 위치의 Open Air 표시는 유지한다. 버림 더미 높이 제한은 아직 적용하지 않았다.
