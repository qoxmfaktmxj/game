# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js, React, TypeScript and Motion for the browser interface; a separate Node.js and Colyseus game server; self-hosted signed guest authentication and PostgreSQL. On 2026-10-24 the user selected their own Linux server, Docker Compose, roughly 8GB RAM and game.minseok91.cloud. Deployment execution will continue through their OpenClaw. The local implementation has an explicitly labelled development guest mode. Package versions and runnable commands live in the workspace manifests and lockfile.

## Users

Korean-speaking friends who want to play a board game together in their browsers, including from phones. They arrive through the public home page or a private invitation. They should be able to understand whose turn it is, perform their next action, and stay together for another game.

## Product Purpose

Create a free, invitation-led board-game space where friends can gather around a persistent table. The table represents the people and their meeting; a game session represents one match. Ending or replacing a match must not erase the table or its members.

## Positioning

The first release centres on a private table shared by invited friends. Public matchmaking, ranking, payment, spectating and voice are outside its initial scope. Do not imply that these features exist.

## Operating Context

A host selects a game, opens a table and shares an invitation. Between two and seven authenticated members occupy seats, within the selected game's limits. Everyone confirms readiness before the host starts a match. Each browser receives only the information its player may see. After the match, players can prepare for a new session or choose another game at the same table. Switching games resets readiness and rotates the invitation while preserving membership.

Users can lose their connection or refresh while playing. The interface must communicate the connection state and restore the authorised player view. Runtime verification must distinguish local two-browser play from hosted authentication, deployed persistence and internet access.

## Capabilities and Constraints

- First game: 로스트 팻츠, two players and one basic-rules match at a time. The user selected this exact display name on 2026-10-27; it is the same game called 별길 탐험 in the original specification. Keep the rules, internal `star-trails` identifier and original reference package unchanged.
- 와일드 스플렌더, 밤의 의회, 황혼의 신호 and 넘버가든 implement the official base-rule editions recorded in `docs/game-expansion-sources.md`, with original names and artwork. The user approved this scope on 2026-10-23. Their private state, legal actions and results have separate engines.
- Rule priority: package decisions, first-game specification, contracts/data specification, interface specification, then visual mockups.
- Server authority, input validation, authenticated action identity, duplicate-command handling and persistence before acknowledgement are required.
- The server must never send an opponent's private hand or the hidden deck to the browser.
- The source photos and other files under the package's `references/` directory are private development material. They are not product art and must not enter public assets or public build output.
- Original artwork, product copy and service names must not copy the source game's assets or descriptions.
- Hosting is a single Colyseus process with Next.js, Caddy and PostgreSQL in Docker Compose at game.minseok91.cloud. Operational retention remains open. No remote deployment or actual PostgreSQL migration verification is claimed.

## Brand Commitments

On 2026-10-27 the user renamed 빛의 공방 to **와일드 스플렌더** and chose to retain its existing base rules (90 development cards, 10 patrons, 15-point end condition). Its original B-style 2D cartoon animals are dogs, cats, otters, tigers and capybaras, shown as babies, adolescents and adults across the three existing tiers. Sanctuary cushions belong in baby-card scenes, not an extra rule tier. Resources become meat, salmon, catnip, acorns, honey and a golden paw-marked bone joker; patrons become forest guardians. This is a presentation theme, without evolution or card fusion. See `docs/wild-splendor-theme.md`.

The platform is 링구링구. The user explicitly requested separating the game name from the platform name on 2026-10-24, then selected **로스트 팻츠** as the two-player game's exact display name on 2026-10-27. On the same day they selected cover B: a 3×3 grid of numbers 2–10 with a larger ×2 otter card on its right. The production cover is `apps/web/public/art/club-lost-pets.png`; it uses the existing approved animal illustrations and does not change the game's 50 distinct faces or 60-card deck. The current white/off-white surfaces, Open Air accent and paired-card logo are recorded in `DESIGN.md`; the selection history and verification scope are in `docs/open-air-refinement.md`.

The user prefers substantial implementation before revision. Earlier visual research used Best Free Fonts, Originkit and Awwwards, with Impeccable and UI UX Pro Max assisting the work; those references remain historical context rather than authority over the latest user choices.

Use friendly, direct Korean. Explain player actions in familiar language. Keep infrastructure and development detail out of ordinary product flows except where the environment or connection mode changes what the user can do.

## Evidence on Hand

- `moyeotable_build_pack_v1/START_HERE.md`, `docs/00_decisions.md` and `docs/05_game01_star_trails.md` inside that package provide product and rule evidence.
- The package contains rule reference code, tests, protocol contracts and eight screen mockups. Its original verification report describes the package's limits.
- `apps/web/public/art/` contains original game covers and card illustrations, separate from the private source photographs. The current 로스트 팻츠 cover is the user-selected B composition assembled from the approved animal artwork; previous covers remain as historical assets.
- `apps/web/public/fonts/` contains self-hosted Gowun Batang and Pretendard files with licenses and source notes.
- `test-results/` contains execution evidence produced during development; stable selected screenshots are copied to `artifacts/verification/`. Only a test actually run can support a completion claim.
- There are no supplied testimonials, live audience counts or service-performance achievements. Do not invent them.

## Product Principles

1. Keep friends at the same table across matches.
2. Make the current turn and next legal action immediately clear.
3. Treat rules, hidden information and saved state as server-owned facts.
4. Preserve original content and the privacy of reference material.
5. Describe implemented and verified capabilities honestly.

## Accessibility & Inclusion

The product specification calls for keyboard access, visible focus, primary touch targets of at least 44px, reduced-motion support, and no page-wide horizontal overflow at 360px and 390px. Suit meaning is communicated through shape and Korean name as well as colour. Mobile hand scrolling is permitted inside the hand region. Essential numbers and game text remain live HTML rather than baked into artwork.

## 2026-10-27 아트 확정 후속

와일드 스플렌더의 B 선명한 카툰풍을 사용자가 확정했다. 동물 90면, 수호자 10면, 대표그림을 교체하고 실사 파일은 공개 서비스 자산에서 제거한다. 카드 프레임은 실물 재질에 가까운 5안을 비교 중이다. 사용자는 다음 밤의 의회에 C 입체 애니메이션풍을 선택했다. [기준 이미지와 방향](docs/art/game-art-directions.md)을 재사용한다.

후속 진행 지시로 04 화이트 엠보싱 카드 프레임과 할인/비용 칩 20% 확대를 실제 게임에 적용했다. 수호자 의인화 및 개성 소품 시안은 아직 전체 적용 전이다.
