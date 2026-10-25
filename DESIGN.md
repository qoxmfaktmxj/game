---
name: 링구링구
description: 친구들과 모이는 작고 선명한 게임 클럽
colors:
  canvas: "#101820"
  paper: "#1b2631"
  ink: "#f4f4ec"
  forest: "#152a34"
  deep: "#0b131b"
  muted: "#aab9c5"
  line: "#34424e"
  mint: "#d6f55b"
  gold: "#d6f55b"
  club-coral: "#ff9d7e"
  club-lilac: "#c8b2f6"
  club-sky: "#9fd6eb"
  club-amber: "#f7c57b"
  aurora: "#806018"
  ember: "#93462f"
  tide: "#26606c"
  moss: "#385c3c"
  dusk: "#655176"
  star-canvas: "#FFFEFA"
  star-paper: "#FFFFFF"
  star-table: "#F3F8FF"
  star-ink: "#183552"
  star-muted: "#526B82"
  star-line: "#D5E1ED"
  star-blue: "#2762C7"
  star-blue-hover: "#1C4FA7"
  star-board-muted: "#4B6380"
  star-board-line: "#D3E0EF"
  star-card-line: "#BFD1E3"
  star-aurora: "#8B591B"
  star-ember: "#A34734"
  star-tide: "#23677C"
  star-moss: "#407052"
  star-dusk: "#7354A2"
typography:
  display:
    fontFamily: "Pretendard, sans-serif"
    fontSize: "clamp(46px, 4.7vw, 70px)"
    fontWeight: 850
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Pretendard, sans-serif"
    fontSize: "31px"
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: "-0.035em"
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
    letterSpacing: "-0.02em"
rounded:
  button: "10px"
  input: "9px"
  card: "7px"
  surface: "14px"
  dialog: "16px"
  star-card: "10px"
  star-stack: "9px"
  star-rank: "5px"
spacing:
  page-gutter: "48px"
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
    backgroundColor: "{colors.mint}"
    textColor: "{colors.deep}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "12px 21px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "12px 21px"
  dialog:
    backgroundColor: "#1b2833"
    textColor: "{colors.ink}"
    rounded: "{rounded.dialog}"
    padding: "29px"
  star-button-primary:
    backgroundColor: "{colors.star-blue}"
    textColor: "{colors.star-paper}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "12px 21px"
  star-button-primary-hover:
    backgroundColor: "{colors.star-blue-hover}"
    textColor: "{colors.star-paper}"
  star-button-secondary:
    backgroundColor: "{colors.star-paper}"
    textColor: "{colors.star-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "12px 21px"
  star-card:
    backgroundColor: "{colors.star-paper}"
    textColor: "{colors.star-ink}"
    rounded: "{rounded.star-card}"
    width: "88px"
    height: "124px"
  star-card-rank:
    backgroundColor: "{colors.star-paper}"
    textColor: "{colors.star-ink}"
    typography: "{typography.star-rank}"
    rounded: "{rounded.star-rank}"
    padding: "2px 4px 4px"
  star-dialog:
    backgroundColor: "{colors.star-paper}"
    textColor: "{colors.star-ink}"
    rounded: "{rounded.dialog}"
    padding: "29px"
---

# Design System: 링구링구 — Ring Club

## Overview

**Creative North Star: "Ring Club — 좋은 친구. 멋진 한 수."**

친구가 들어와 게임을 고르고 함께 앉는 작은 게임 클럽이다. 2026-10-23의 디자인 재작업 요청에 따라 이전 크림·명조·초록 방향을 교체했다. 19개 현재 제품/창작 사례의 관찰과 판단은 `docs/design-references-2026.md`에 기록했다. 기존 고리 로고, 한국어 이름, 테이블을 유지하는 제품 개념은 보존한다.

첫 화면은 굵은 한국어 제목과 하나의 큰 게임 아트로 시작한다. 짙고 낮은 채도의 셸 위에 라임색 행동과 각 게임의 컬러 포스터가 놓인다. 홈은 게임의 분위기를 보여주며, 대기실과 플레이 화면은 사람·차례·가능한 행동을 명확히 한다. 존재하지 않는 이용자 수·랭킹·채팅 기능을 홍보하지 않는다.

2026-10-25 사용자가 지정한 첫 게임 방향을 이 시스템 안에 병합했다. 별길 탐험의 대기실·플레이·결과·설정·규칙과 `/cards`는 밝은 아이보리·흰 카드·푸른 행동, 하늘 깡총의 파스텔 픽셀 동물 그림을 사용한다. 2026-10-26 확정한 50면의 기준은 `docs/art/sky-hop-final-selection.json`이다. 홈과 다른 네 게임의 어두운 셸·포스터 방향은 유지한다. 새 게임명은 아직 선택되지 않았으므로 별길 탐험과 내부 `star-trails`를 유지한다.

**Key Characteristics:**

- 굵고 읽기 쉬운 한국어 Pretendard와 살아 있는 카드 숫자.
- 홈·다른 네 게임의 짙은 셸과 라임 행동.
- 첫 게임의 밝은 아이보리·흰 카드·푸른 행동과 품종·행동이 다른 확정 동물 그림 50면.
- 사람·차례·가능한 행동을 구별하는 이름, 도형, 문장.

## Colors

기본 셸은 `apps/web/app/globals.css`, 첫 게임은 `apps/web/components/star-theme.css`와 `star-board.css`의 실제 값이 기준이다. 앞부분의 `star-` 토큰은 문서에서 범위를 구별하는 이름이며, 구현에서는 첫 게임 안에서 기존 CSS 변수의 값을 덮어쓴다.

### Primary

기본 셸의 `mint`는 주요 동작과 현재 차례에 사용하며 라임 버튼 위 글자는 `deep`이다. 첫 게임의 `star-blue`는 주요 행동·현재 차례·선택·포커스를, `star-blue-hover`는 공통 주 버튼의 호버를 표현한다. 첫 게임의 푸른 버튼 위 글자는 `star-paper`다.

### Secondary

게임 포스터는 라임·코럴·라일락·앰버·스카이로 구별한다. 실제 손패와 타일의 숫자는 밝은 바탕과 어두운 전경을 쓴다. 경로별 어두운 색 토큰은 밝은 카드용이며, 다크 표의 경로 레이블은 별도의 밝은 전경을 사용한다. 게임 의미는 색뿐 아니라 이름·도형·문장으로 전달한다.

첫 게임의 `star-aurora`·`star-ember`·`star-tide`·`star-moss`·`star-dusk`는 동물 계열의 규칙 범례와 결과 점수 표에 쓴다. 손패 숫자와 길 이름은 안정적인 `star-ink`를 사용한다.

### Neutral

기본 셸의 `canvas`는 전체 바탕, `paper`는 대화상자와 표면, `ink`는 밝은 전경이다. 이전 이름이 남아 있어도 기본 `ink`를 어두운 색이라고 가정하면 안 된다. 첫 게임의 `star-canvas`는 밝은 아이보리 바탕, `star-paper`는 불투명한 흰 카드·표찰·대화상자, `star-table`은 손패·대기·규칙·결과의 옅은 푸른 표면이다. `star-ink`는 본문과 숫자, `star-muted`와 `star-board-muted`는 보조 설명이다. `star-line`·`star-board-line`·`star-card-line`은 각각 공통 구분선·보드·카드의 경계다.

**The First-Game Scope Rule.** 밝은 동물 테마는 첫 게임과 `/cards` 안에서만 적용한다. 사용자가 거부한 누런 회색·베이지 비교색 `#F4F1EA`·`#E7E3D9`를 이 범위의 표면색으로 되돌리지 않는다.

## Typography

자체 호스팅 Pretendard 가변 글꼴을 제목·본문·조작에 공통 사용한다. 홈 제목은 굵기 850, 1.2 행간, -0.035em 자간이다. 데스크톱 기본 범위는 46–70px, 넓은 화면 72px, 360px 화면 38px이다. 섹션 제목 31px, 게임 제목 21px, 본문 16px을 기준으로 한다.

게임 숫자는 고정폭 숫자를 사용한다. 순서·차례·장수 정보를 장식처럼 작게 줄이지 않는다. 손패·타일의 필수 조작은 최소 44px 터치 표적과 별도 가로 스크롤을 확보한다. 모바일 게임 정보가 많으면 구조를 바꾸거나 접고, 글자 축소만으로 해결하지 않는다.

첫 게임도 같은 Pretendard를 유지한다. 손패의 숫자는 `star-rank`, 동물 이름은 `star-card-label`을 쓰며 흰 표찰 위에 배치한다. 지원 카드의 앞 표시는 `×2`로, 숫자보다 약간 작은 22px이다. 모바일 공개 길은 17px 숫자·15px 지원 표시를 쓴다. 버림 더미의 작은 카드는 데스크톱 19px 숫자·17px 지원 표시, 모바일 16px·14px이다. 겹친 이전 카드에도 실제 카드의 상단 숫자를 그대로 노출하며 별도의 작은 숫자 띠를 덧붙이지 않는다. 갤러리는 숫자 36px·이름 18px, 모바일에서는 29px·16px로 확장된 읽기 크기를 유지한다.

**The Live Card Rule.** 동물 그림은 정체성을, HTML 숫자·이름·배수는 규칙을 전달한다. 카드 이미지나 드래그 미리보기를 게임 상태의 근거로 사용하지 않는다.

## Layout

기본 콘텐츠 폭은 최대 1280px, 데스크톱 좌우 여백 48px이다. 홈은 “좋은 친구들과 / 즐거운 게임.”이라는 짧은 제목·큰 아트 다음 다섯 개 게임 포스터 선반과 간결한 푸터로 이어진다. 사용자의 요청으로 긴 소개와 세 단계 이용 안내는 제거했다. 첫 화면의 타이포그래피와 그림은 한 장면이며 장식 효과를 모든 구역에 반복하지 않는다.

900px 이하 선반은 6열의 3/3 + 2/2/2 구성이다. 760px 이하는 2열이 되고 첫 게임은 한 줄 전체에 이미지·설명을 나란히 둔다. 640px 이하 기존 공통 페이지 여백 20px, 374px 이하 16px을 유지한다. 모바일 헤더는 브랜드와 핵심 행동만 남긴다.

별길 탐험의 보드는 상대의 다섯 길을 위, 함께 쓰는 버림 더미와 덱을 가운데, 내 다섯 길과 손패를 아래에 놓는다. 넓은 화면은 보드와 214px 안내 열 사이를 28px 띄우며 1100px 이하에서는 안내 열을 숨기고 보드의 행동 안내를 유지한다. 공개 길과 버림 더미는 프리셀처럼 모든 카드를 쌓인 순서대로 겹친다. 먼저 놓인 카드의 실제 상단 숫자가 모두 보이고 마지막 카드 전체가 보인다. 최근 네 장 제한은 두지 않는다. 길과 버림 더미의 시작선을 위로 맞추며, 장수가 늘면 행 높이와 페이지 스크롤이 자연스럽게 늘어난다. 길이나 버림 더미를 누르면 전체 카드 상세를 연다. 버림 카드를 실제 가져오는 행동은 별도 버튼으로 구분한다.

공개 길 카드는 기본 104×146px, 640px 이하 64×91px, 374px 이하 54×78px다. 겹침 간격은 `star-stack-step` 32px과 `star-stack-step-phone` 24px을 따른다. 버림 더미의 작은 카드는 최대 72×100px, 640px 이하 최대 48×67px, 374px 이하 높이 58px이며 열 너비에 맞춰 줄어든다. 버림 더미의 겹침 간격은 `star-discard-stack-step` 25px과 `star-discard-stack-step-phone` 21px이다. 손패는 기본 88×124px, 모바일 76×108px이며 손패 영역 안에서 가로로 스크롤한다. 카드 표면의 터치 스크롤을 보존하고 아래의 별도 44px 끌기 손잡이로 터치 드래그를 시작한다. 모바일 행동 버튼은 안내 아래에 나란히 배치한다.

현재 카드 아트는 품종·행동이 다른 확정 PNG 50면이다. 내부 계열과 이름의 대응은 `aurora=멍이`, `ember=냥이`, `tide=물개`, `moss=수달`, `dusk=랑이(아기 호랑이)`다. 각 계열은 지원 면 하나와 숫자 2–10의 개별 그림을 가진다. 지원 카드 3장은 같은 지원 그림을 사용하므로 실제 덱은 숫자 45장·지원 15장의 60장이다. 손패·공개 길·버림 더미·상세창·`/cards`는 같은 확정 면을 사용하고, 대기실 대표 그림은 각 계열의 지원 면을 재사용한다. 그림에는 숫자와 이름을 넣지 않고 흰 HTML 표찰로 올린다. Next.js 최적화 이미지를 표시 크기에 맞게 전달한다.

2026-10-25 후속 결정: 사용자는 **하늘 깡총**의 페리윙클 계단 윤곽·버터/하늘/코랄 파스텔·어설프게 귀여운 아기 동물 화풍을 확정했다. 카드별 그림은 멍이의 견종, 냥이의 묘종, 물개·수달·랑이의 행동으로 구분한다. 계열별 ×2·2·3 → 4·5·6 → 7·8·9·10 순서로 총50면을 준비했다. 이전 선택과 실험 자료는 로컬 제작 기록으로 보존한다.

2026-10-26 확정: 멍이·냥이 지원과2–6의 포즈를 다양화하고, 멍이10은 **회색 보더콜리 v5**, 냥이10은 **터키시 앙고라**, 물개10은 **옆으로 기대 쉬기**, 수달8은 **포근한 포옹**으로 정했다. [확정 적용 기록](docs/art/sky-hop-release.md)과 [최신50면 선택](docs/art/sky-hop-final-selection.json)이 기준이다. 실제 게임의 모든 카드와 대기실·갤러리는 이 확정 그림을 사용한다. 50면/60장 덱 수량과 배치·가져오기·점수 규칙은 유지하며, 버림 더미 전체 공개에 관한 후속 결정은 [표시·공개 범위 기록](docs/star-trails-display.md)을 따른다.

`/cards`는 서로 다른50가지 품종·포즈의 확정 그림과 지원 누적 배수를 보여준다. 그림 전신과 꼬리가 하단 표찰에 가려지지 않게 contain과 별도 하단 여백을 사용한다. 카드 상단에는 숫자/×2만 두고 하단에는 동물 아이콘과 이름만 둔다. 하단에 숫자/×2를 중복 표시하지 않는다. 생성 근거는 `docs/art/sky-hop-approved-prompts.json`, 현재 적용 범위는 `docs/card-art.md`를 따른다. 홈 탭 제목은 `링구링구`, 테이블은 `링구링구 - 게임이름`이다.

## Elevation & Depth

일반 UI는 표면색과 얇은 경계로 구분한다. 같은 표면에 두꺼운 테두리와 넓은 그림자를 중복하지 않는다. 대화상자에는 `0 25px 100px #0009` 그림자와 어두운 배경을 사용한다. 카드 그림은 생성한 원본 래스터 이미지로 깊이를 만들고 CSS로 그럴듯한 3D 일러스트를 흉내내지 않는다.

첫 게임의 손패 카드는 그림자 없이 흰 표면과 얇은 푸른 경계를 쓴다. 겹친 공개 카드에는 `0 2px 5px #1835521c`, 들고 이동 중인 카드에는 `0 12px 25px #18355235`를 사용해 실제 상태의 차이를 보여준다. 첫 게임 대화상자는 흰 표면, `0 24px 80px #18355230` 그림자, `#1835526b` 배경막을 사용하며 배경을 흐리게 하지 않는다.

`public/art/club-*.png` 5장은 2026-10-24 imagegen으로 생성한 오리지널 홍보 이미지다. 사적인 원본 사진이나 기존 게임 그림을 입력으로 사용하지 않았다. 보이는 도구는 콘셉트 아트이며 카드 구성·숫자·게임 규칙의 근거가 아니다. Next Image가 화면 크기에 맞게 최적화하여 전달하며 원본은 public에 보존한다.

## Shapes

두 고리 로고가 주요 브랜드 표식이다. 포스터 모서리 14px, 대화상자 16px, 버튼 10px, 입력 9px을 쓴다. 원형은 로고·아바타·게임 포스터의 작은 이동 버튼·단계 아이콘에 한정한다. 의미 없는 pill·badge를 헤드라인 위에 쌓지 않는다.

첫 게임은 둥근 직사각형 카드와 실제 카드가 쌓인 모양을 반복한다. 손패는 `star-card`, 공개 길은 `star-stack`, 숫자 표찰은 `star-rank` 모서리를 사용한다. 작은 공개 카드는 6px, 갤러리 카드는 14px 모서리다. 빈 길은 점선 카드 윤곽 안에 동물 아이콘만 두고 안내 문구를 반복하지 않는다. 가능한 목적지에는 푸른 윤곽선과 화살표를 추가한다.

## Components

### 공통 버튼·입력

주 버튼은 라임색이며 최소 높이 48px이다. 보조 버튼은 투명한 바탕·밝은 글자·1px 안쪽 경계다. 호버는 밝기와 짧은 아이콘 이동, 눌림은 작은 위치 변화로 표현한다. 포커스는 라임색 3px 윤곽선과 4px 간격을 사용한다. 입력·선택에는 명시적 레이블을 제공한다.

첫 게임의 같은 버튼은 `star-button-primary`·`star-button-secondary`로 색을 바꾸고 3px 푸른 포커스 윤곽선과 4px 간격을 유지한다. 흰 입력 표면에는 어두운 글자와 푸른 경계를 쓴다. 보드의 행동 버튼은 최소 46px 높이이며 `버리기`와 `길에 놓기`를 명시한다. 선택 상태만으로 명령을 제출하지 않는다.

### 동물 카드·공개 길

카드는 불투명한 숫자·동물 이름 표찰과 작은 동물 도형을 함께 쓴다. 지원 면의 `×2`는 카드 종류를 나타내며, 누적 점수 배수는 지원 1/2/3장에 따라 `×2/×3/×4`다. 규칙·보드 안내·갤러리에서 이 차이를 설명한다. 공개 길의 장수와 실제 배수는 서버 View에서 읽고 길 상세는 전체 카드와 점수 계산을 제공한다.

버림 더미는 먼저 버린 카드부터 마지막 카드까지 서버 View의 공개 배열 순서를 그대로 보여준다. 숫자순으로 재정렬하지 않는다. 더미를 누르는 행동은 상세 확인이며 명령을 전송하지 않는다. `가져오기`와 상세창의 `마지막 카드 가져오기`는 서버가 허용한 때에만 활성화하고 맨 위 한 장만 가져온다. 방금 버린 카드와 그 아래 카드를 같은 차례에 가져올 수 없는 기존 제한을 유지한다.

카드를 누르면 선택하고 명시적 버튼으로 놓거나 버릴 수 있다. 마우스는 카드에서 드래그를 시작할 수 있고, 터치는 별도 끌기 손잡이를 쓴다. 유효한 같은 계열 목적지만 강조하며 무효 놓기·Escape·상태 변경에서는 이동을 취소한다. 이동 미리보기와 안내는 시각 피드백이며 손패·보드의 실제 위치는 승인된 새 View가 올 때 바뀐다.

### 모션·대화상자·상태

홈의 이미지 이동은 12초, 궤도 선은 18초 주기로 하나의 장면 안에서만 반복한다. 화면 밖·숨겨진 탭·수동 정지·OS 및 앱 모션 감소에서는 멈춘다. 모션 감소에서는 완성된 정지 화면을 유지한다. 게임 선택 호버 250–350ms, 기존 카드 피드백 160–220ms이며 서버 승인이나 재접속을 애니메이션 완료와 연결하지 않는다.

모달의 기본 포커스, Tab/Shift+Tab 순환, Escape, 닫은 뒤 포커스 복귀는 기존 네이티브 dialog 구현을 유지한다. 오류는 따뜻한 붉은 표면과 밝은 코럴 설명으로 표시한다. 연결 끊김·저장·준비 상태는 문장과 아이콘을 함께 쓴다.

첫 게임의 승인된 공개 변화는 200ms 도착 피드백, 결과 아이콘은 480ms 피드백을 사용한다. OS 또는 앱 모션 감소에서는 둘 다 멈춘다. 준비 완료는 옅은 푸른 표면과 진한 푸른 문장, 오류는 밝은 붉은 표면과 진한 붉은 문장, 결과 승자는 옅은 푸른 표면과 점수로 구별한다. 첫 게임 설정·규칙·상세창도 같은 밝은 대화상자 규칙을 따른다.

## Do's and Don'ts

### Do:

- **Do** 조용한 공통 셸과 표현력 있는 게임 아트를 구분한다.
- **Do** 첫 게임의 밝은 아이보리·흰 카드·푸른 행동을 해당 게임의 모든 상태와 `/cards`에 일관되게 적용한다.
- **Do** 카드·타일 숫자와 규칙은 살아 있는 HTML로 제공한다.
- **Do** 동물 이름·도형·색을 함께 사용하고 랑이는 아기 호랑이로 유지한다.
- **Do** 모바일 손패 스크롤, 44px 터치 표적, 명시적 행동 버튼과 키보드 대안을 유지한다.
- **Do** 데스크톱·390px·360px에서 실제 렌더와 가로 넘침을 확인한다.

### Don't:

- **Don't** 첫 게임 변경을 홈과 다른 네 게임의 전역 테마 변경으로 확장한다.
- **Don't** 프런트에서 미확정 상태를 낙관적으로 확정하거나 승인된 플레이어 View 밖의 정보를 표시한다.
- **Don't** 확정된 50면을 대표 그림 5장으로 되돌리거나 지원 배수를 지수식으로 표현한다.
- **Don't** 색·3D·모션 때문에 손패·현재 차례·포커스가 흐려지게 한다.
- **Don't** 이 문서의 검토 설명을 전체 접근성 적합성 인증으로 표현한다.
