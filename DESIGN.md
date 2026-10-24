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
rounded:
  button: "10px"
  input: "9px"
  card: "7px"
  surface: "14px"
  dialog: "16px"
spacing:
  page-gutter: "48px"
  phone-gutter: "20px"
  game-shelf-gap: "20px"
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
---

# Design System: 링구링구 — Ring Club

## Overview

친구가 들어와 게임을 고르고 함께 앉는 작은 게임 클럽이다. 2026-10-23의 디자인 재작업 요청에 따라 이전 크림·명조·초록 방향을 교체했다. 19개 현재 제품/창작 사례의 관찰과 판단은 `docs/design-references-2026.md`에 기록했다. 기존 고리 로고, 한국어 이름, 테이블을 유지하는 제품 개념은 보존한다.

첫 화면은 굵은 한국어 제목과 하나의 큰 게임 아트로 시작한다. 짙고 낮은 채도의 셸 위에 라임색 행동과 각 게임의 컬러 포스터가 놓인다. 홈은 게임의 분위기를 보여주며, 대기실과 플레이 화면은 사람·차례·가능한 행동을 명확히 한다. 존재하지 않는 이용자 수·랭킹·채팅 기능을 홍보하지 않는다.

## Colors

`apps/web/app/globals.css`의 실제 변수가 기준이다. `canvas`는 전체 바탕, `paper`는 대화상자와 표면, `ink`는 밝은 전경이다. 이전 이름이 남아 있어도 `ink`를 어두운 색이라고 가정하면 안 된다. `mint`는 주요 동작과 현재 차례에 사용한다. 라임 버튼 위 글자는 `deep`이다.

게임 포스터는 라임·코럴·라일락·앰버·스카이로 구별한다. 실제 손패와 타일의 숫자는 밝은 바탕과 어두운 전경을 쓴다. 경로별 어두운 색 토큰은 밝은 카드용이며, 다크 표의 경로 레이블은 별도의 밝은 전경을 사용한다. 게임 의미는 색뿐 아니라 이름·도형·문장으로 전달한다.

## Typography

자체 호스팅 Pretendard 가변 글꼴을 제목·본문·조작에 공통 사용한다. 홈 제목은 굵기 850, 1.2 행간, -0.035em 자간이다. 데스크톱 기본 범위는 46–70px, 넓은 화면 72px, 360px 화면 38px이다. 섹션 제목 31px, 게임 제목 21px, 본문 16px을 기준으로 한다.

게임 숫자는 고정폭 숫자를 사용한다. 순서·차례·장수 정보를 장식처럼 작게 줄이지 않는다. 손패·타일의 필수 조작은 최소 44px 터치 표적과 별도 가로 스크롤을 확보한다. 모바일 게임 정보가 많으면 구조를 바꾸거나 접고, 글자 축소만으로 해결하지 않는다.

## Layout

기본 콘텐츠 폭은 최대 1280px, 데스크톱 좌우 여백 48px이다. 홈은 “좋은 친구들과 / 즐거운 게임.”이라는 짧은 제목·큰 아트 다음 다섯 개 게임 포스터 선반과 간결한 푸터로 이어진다. 사용자의 요청으로 긴 소개와 세 단계 이용 안내는 제거했다. 첫 화면의 타이포그래피와 그림은 한 장면이며 장식 효과를 모든 구역에 반복하지 않는다.

900px 이하 선반은 6열의 3/3 + 2/2/2 구성이다. 760px 이하는 2열이 되고 첫 게임은 한 줄 전체에 이미지·설명을 나란히 둔다. 640px 이하 기존 공통 페이지 여백 20px, 374px 이하 16px을 유지한다. 모바일 헤더는 브랜드와 핵심 행동만 남긴다.

별길 탐험은 다섯 계열의 개별 생성 일러스트 50종을 카드 전체에 사용한다. 밝은 숫자 배지와 하단 음영 위의 이름은 실제 게임 데이터로 표시하며 이미지에 숫자를 그리지 않는다. 손패에서는 작은 크기에 맞는 Next.js 최적화 이미지를, `/cards`에서는 큰 그림을 보여준다. 원본·프롬프트·검수 기록은 `docs/card-art.md`를 따른다.

## Elevation & Depth

일반 UI는 표면색과 얇은 경계로 구분한다. 같은 표면에 두꺼운 테두리와 넓은 그림자를 중복하지 않는다. 대화상자에는 `0 25px 100px #0009` 그림자와 어두운 배경을 사용한다. 카드 그림은 생성한 원본 래스터 이미지로 깊이를 만들고 CSS로 그럴듯한 3D 일러스트를 흉내내지 않는다.

`public/art/club-*.png` 5장은 2026-10-24 imagegen으로 생성한 오리지널 홍보 이미지다. 사적인 원본 사진이나 기존 게임 그림을 입력으로 사용하지 않았다. 보이는 도구는 콘셉트 아트이며 카드 구성·숫자·게임 규칙의 근거가 아니다. Next Image가 화면 크기에 맞게 최적화하여 전달하며 원본은 public에 보존한다.

## Shapes

두 고리 로고가 주요 브랜드 표식이다. 포스터 모서리 14px, 대화상자 16px, 버튼 10px, 입력 9px을 쓴다. 원형은 로고·아바타·게임 포스터의 작은 이동 버튼·단계 아이콘에 한정한다. 의미 없는 pill·badge를 헤드라인 위에 쌓지 않는다.

## Components

주 버튼은 라임색이며 최소 높이 48px이다. 보조 버튼은 투명한 바탕·밝은 글자·1px 안쪽 경계다. 호버는 밝기와 짧은 아이콘 이동, 눌림은 작은 위치 변화로 표현한다. 포커스는 라임색 3px 윤곽선과 4px 간격을 사용한다. 입력·선택에는 명시적 레이블을 제공한다.

홈의 이미지 이동은 12초, 궤도 선은 18초 주기로 하나의 장면 안에서만 반복한다. 화면 밖·숨겨진 탭·수동 정지·OS 및 앱 모션 감소에서는 멈춘다. 모션 감소에서는 완성된 정지 화면을 유지한다. 게임 선택 호버 250–350ms, 기존 카드 피드백 160–220ms이며 서버 승인이나 재접속을 애니메이션 완료와 연결하지 않는다.

모달의 기본 포커스, Tab/Shift+Tab 순환, Escape, 닫은 뒤 포커스 복귀는 기존 네이티브 dialog 구현을 유지한다. 오류는 따뜻한 붉은 표면과 밝은 코럴 설명으로 표시한다. 연결 끊김·저장·준비 상태는 문장과 아이콘을 함께 쓴다.

## Do's and Don'ts

- 조용한 공통 셸과 표현력 있는 게임 아트를 구분한다.
- 프런트는 승인된 플레이어 View만 표시하고 미확정 상태를 낙관적으로 확정하지 않는다.
- 카드·타일 숫자와 규칙은 살아 있는 HTML로 제공한다.
- 데스크톱·390px·360px에서 실제 렌더와 가로 넘침을 확인한다.
- 색·3D·모션 때문에 손패·현재 차례·포커스가 흐려지지 않게 한다.
- 이 문서의 검토 설명을 전체 접근성 적합성 인증으로 표현하지 않는다.
