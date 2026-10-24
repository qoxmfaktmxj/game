# G1 규칙 모듈
별길 탐험 규칙을 독립 TypeScript 패키지로 구현한다. 규칙 출처는 docs/05_game01_star_trails.md이다. createInitialState/applyCommand/toPlayerView/getResult/assertInvariants를 구현하고 Date.now, DB, React, 소켓, Math.random 직접 호출을 규칙 안에서 금지한다. 안전한 RNG와 opaque ID는 서버 어댑터가 주입한다.

동봉 테스트와 같은 의미를 보존하고 점수 0,-40,3,-10,65,156 사례, 반대 차례, 순서 위반, 지원 위치, 버린 카드 즉시 회수, 덱 마지막 종료, 카드 보존, 원본 불변, 비밀 미전송을 검증한다. 무효 명령은 state/version을 바꾸지 않는다. 동점은 공동 승리이고 단판이다.
