# 별길 탐험: Ember·Tide 카드 원화 프롬프트

2026-10-24. 내장 imagegen으로 카드 앞면마다 별도 호출해 총 20장을 제작했다. CLI·스프라이트시트·기존 이미지 재색칠을 사용하지 않았다. 원본은 Codex generated_images에 보존하고 `apps/web/public/art/cards/star-trails/`에 PNG를 복사했다. 각 계열 숫자 2–10은 서로 다른 9장이고, 지원 카드 3장은 같은 지원 원화를 공유한다. 이미지에는 숫자·문자·프레임이 없으며 실제 게임 정보는 HTML로 제공한다.

## 공통 프롬프트

```text
Use case: stylized-concept.
Asset type: original premium fantasy board-game card illustration, portrait 2:3, full bleed.
Style: tactile hand-painted stylized 3D miniature landscape, painterly grain and velvety surfaces, organic rounded silhouettes, elegant atmospheric depth, sophisticated collectible board-game art, clear appealing focal silhouette even at thumbnail size.
Composition: main subject centered in the lower half, calm uncluttered upper-left 15 percent for a later HTML number overlay; generous safe edges, layered foreground/middle/distance. This is a single complete illustration, not a card mockup or spritesheet.
Constraints: NO text, numbers, letters, symbols, UI, border, frame, logo, watermark, people or humanoids. No flat vector style, angular logos, weapons or photorealism.
```

## 카드별 장면 프롬프트

### ember-2.png

Warm coral, amber and deep burgundy. A tiny glowing ember nestled between rounded terracotta pebbles, with delicate golden smoke curling above it in a quiet mossy hollow at dusk. Intimate beginning of a magical fire expedition, soft warm glow, simple unmistakable focal point.

### ember-3.png

Warm coral, amber and deep burgundy. A small cozy campfire on a rounded rose-colored stone clearing, surrounded by plush crimson woodland mushrooms and one curved fallen twig. Soft sparks rise into a hazy burgundy forest. Warm inviting wonder, no people.

### ember-4.png

Warm coral, amber and deep burgundy. A winding trail of luminous fireflies floating over smooth red stones through a twilight copper-leaf grove. The brightest fireflies gather above a small amber pool in the lower center. Delicate atmospheric magical forest.

### ember-5.png

Warm coral, amber and deep burgundy. A warm mineral spring glowing orange beneath rounded coral rock shelves, with soft plumes of golden steam and velvety red moss. A miniature natural terraced oasis, luminous center and dark plum distance.

### ember-6.png

Warm coral, amber and deep burgundy. A luminous amber crystal geode opened inside a smooth rust-red boulder beside a curling shallow lava stream. Rounded glowing crystal lobes, soft painterly mineral textures, copper dusk sky and layered hazy hills.

### ember-7.png

Warm coral, amber and deep burgundy. A winding molten river snakes through a valley of smooth red sandstone arches and rounded hoodoos. One graceful natural arch anchors the lower center, distant golden light peeks through atmospheric burgundy mist. Magical, calm and beautiful.

### ember-8.png

Warm coral, amber and deep burgundy. A radiant waterfall of molten golden light cascades from a rounded coral cliff into a glowing volcanic pool, surrounded by soft obsidian boulders and red ferns. Rich layered canyon depth, majestic but serene fantasy landscape.

### ember-9.png

Warm coral, amber and deep burgundy. An enormous ancient rounded basalt tree with glowing amber sap channels spreads its copper-leaf canopy above a misty ember valley. Small fireflies drift around the luminous roots in the lower half. Grand enchanted discovery, tactile painterly surfaces.

### ember-10.png

Warm coral, amber and deep burgundy. A magnificent volcanic island sanctuary rises from a sea of glowing golden mist; a broad rounded crater holds a radiant miniature sun, with curling lava rivers cascading down layered coral terraces. Grand final expedition vista, immense tranquil wonder, no architecture or figures.

### ember-support.png

Warm coral, amber and deep burgundy. A beautifully crafted rounded copper expedition lantern with a bright tiny living flame inside, beside a rolled burgundy travel blanket and smooth red stones on a mossy ledge. Lantern is the clear lower-center subject, warm firefly haze in the background. No writing, no emblems.

### tide-2.png

Turquoise, cerulean, creamy sand and deep teal shadows. A small luminous seashell resting in a clear shallow turquoise tidepool on smooth cream sand, with delicate rounded ripples and tiny polished pebbles. Intimate beginning of a magical ocean expedition, gentle reflected light.

### tide-3.png

Turquoise, cerulean, creamy sand and deep teal shadows. A graceful little curling wave rolls around one smooth rounded coastal rock, white foam like soft porcelain ribbons. Clear shallows glow aqua in the lower center, tranquil misty sea behind, delicate tactile sand.

### tide-4.png

Turquoise, cerulean, creamy sand and deep teal shadows. A luminous shallow lagoon with rounded pastel coral clusters visible beneath glass-clear water, soft seaweed curving around a pearly central stone. A magical underwater garden viewed near the surface, elegant watery light.

### tide-5.png

Turquoise, cerulean, creamy sand and deep teal shadows. A small sheltered cove cradled by smoothly eroded cream cliffs, a natural rounded sea arch framing a luminous aqua pool in the lower center. Soft foam traces the shore, hazy cerulean distance, inviting discovery.

### tide-6.png

Turquoise, cerulean, creamy sand and deep teal shadows. A serene waterfall pours from mossy rounded island rocks into a sapphire lagoon, with soft cream stepping stones in the foreground and translucent aqua spray. Layered coastal oasis, painterly tactile rock and velvety vegetation.

### tide-7.png

Turquoise, cerulean, creamy sand and deep teal shadows. A great curling translucent ocean wave makes a luminous turquoise tunnel around an untouched ivory beach, foamy ribbons spiraling gracefully toward the lower-center pool. Sculptural flowing water, elegant rather than threatening, no surfers or boats.

### tide-8.png

Turquoise, cerulean, creamy sand and deep teal shadows. A luminous underwater canyon of smooth coral pillars surrounds a giant pearlescent open shell, with azure shafts of light and tiny glowing plankton drifting through layered depth. The shell anchors the lower center, dreamlike tranquil discovery.

### tide-9.png

Turquoise, cerulean, creamy sand and deep teal shadows. Floating rounded sea cliffs form a ring of cascading waterfalls above a vast glowing turquoise lagoon, cream cloud mist drifting between them. Grand magical archipelago, luminous water paths lead to the lower center, sophisticated painterly depth.

### tide-10.png

Turquoise, cerulean, creamy sand and deep teal shadows. A magnificent circular ocean whirlpool glows with a pearly celestial core beneath a towering crescent of flowing water, surrounded by tiny rounded cream islands fading into a cerulean horizon. Grand final expedition vista, immense serene wonder, luminous sculpted waves.

### tide-support.png

Turquoise, cerulean, creamy sand and deep teal shadows. A rounded brass-and-seaglass expedition lantern glowing with soft aqua light, beside a coiled cream rope and a smooth pearly shell on a weathered coastal ledge. Lantern is the clear lower-center subject, gentle sea mist behind. No writing, no compass markings, no emblems.

## 제작 및 검수 결과

저장된 파일 20개의 PNG 헤더와 크기를 검사했다. 전부 1024×1536이며 SHA-256 해시 20개가 서로 다르다. 총 원본 용량은 50.78MiB다. 이 문서는 원화 검수 결과이며 실제 게임 카드 위 숫자·레이블의 브라우저 검수는 화면 통합 단계에서 별도로 수행한다.

완료 **20/20**. 각 호출에서 표시된 출력을 직접 확인해 색·장면·구도·문자 유무를 검수했다. 실패·대체 생성 없음. 호출당 18–24초였고 생성 호출의 합계는 401초다. PNG 원본을 변환하지 않고 복사했으며 브라우저 전송 최적화는 Next Image가 담당한다.

- **ember-2.png** · 22초 · 세로형·하단 불씨·상단 왼쪽 여백·글자 없음 확인
  - 원본: `C:\Users\qoxmf\.codex\generated_images\01a16938-1a16-78d3-88c3-35f0ee3a410b\exec-86fb322b-3281-4450-86c7-761f9154bb29.png`
- **ember-3.png** · 18초 · 모닥불·버섯 숲·세로형·문자 없음 확인
  - 원본: `C:\Users\qoxmf\.codex\generated_images\01a16938-1a16-78d3-88c3-35f0ee3a410b\exec-221a04a1-f0a6-433f-826b-1d56317172df.png`
- **ember-4.png** · 20초 · 반딧불과 개울·풍경 구도·문자 없음 확인
  - 원본: `C:\Users\qoxmf\.codex\generated_images\01a16938-1a16-78d3-88c3-35f0ee3a410b\exec-b7668ac4-2939-4920-bab0-be2af0c627d5.png`
- **ember-5.png** · 19초 · 황금빛 계단 온천·세로형·문자 없음 확인
  - 원본: `C:\Users\qoxmf\.codex\generated_images\01a16938-1a16-78d3-88c3-35f0ee3a410b\exec-d42ad316-5922-4d52-991f-ac9777ecfe16.png`
- **ember-6.png** · 18초 · 호박빛 정동과 용암·초점 선명·문자 없음 확인
  - 원본: `C:\Users\qoxmf\.codex\generated_images\01a16938-1a16-78d3-88c3-35f0ee3a410b\exec-df77c26a-e445-4a5f-9efa-a83133673a92.png`
- **ember-7.png** · 18초 · 자연 아치와 용암강·장면 구별·문자 없음 확인
  - 원본: `C:\Users\qoxmf\.codex\generated_images\01a16938-1a16-78d3-88c3-35f0ee3a410b\exec-be5d4572-06f4-44cc-9c5d-e7af44ae1956.png`
- **ember-8.png** · 19초 · 웅장한 용암 폭포·썸네일 초점·문자 없음 확인
  - 원본: `C:\Users\qoxmf\.codex\generated_images\01a16938-1a16-78d3-88c3-35f0ee3a410b\exec-0720a05e-b191-4323-816a-1a7a2a1b0139.png`
- **ember-9.png** · 20초 · 빛나는 고목과 용암 뿌리·세로형·문자 없음 확인
  - 원본: `C:\Users\qoxmf\.codex\generated_images\01a16938-1a16-78d3-88c3-35f0ee3a410b\exec-fcfad748-ace1-43bd-908a-c13f53b1a099.png`
- **ember-10.png** · 19초 · 태양을 품은 분화구·숫자 10의 장대한 풍경·문자 없음 확인
  - 원본: `C:\Users\qoxmf\.codex\generated_images\01a16938-1a16-78d3-88c3-35f0ee3a410b\exec-6bdb8fe0-0fa5-486f-a47b-2cff5fa083b5.png`
- **ember-support.png** · 23초 · 구리 랜턴·담요·장비 초점·문자 없음 확인
  - 원본: `C:\Users\qoxmf\.codex\generated_images\01a16938-1a16-78d3-88c3-35f0ee3a410b\exec-09db09d8-2066-44fe-8867-f42558183b42.png`
- **tide-2.png** · 19초 · 얕은 물의 빛나는 소라·청록색 구분·문자 없음 확인
  - 원본: `C:\Users\qoxmf\.codex\generated_images\01a16938-1a16-78d3-88c3-35f0ee3a410b\exec-841ad80c-0418-4dce-b90e-86265854f9b0.png`
- **tide-3.png** · 20초 · 바위를 감싸는 작은 파도·상단 하늘 여백·문자 없음 확인
  - 원본: `C:\Users\qoxmf\.codex\generated_images\01a16938-1a16-78d3-88c3-35f0ee3a410b\exec-36b98416-2879-434f-a9d1-c8b1c0822a72.png`
- **tide-4.png** · 20초 · 산호 정원의 진줏빛 돌·수중 풍경·문자 없음 확인
  - 원본: `C:\Users\qoxmf\.codex\generated_images\01a16938-1a16-78d3-88c3-35f0ee3a410b\exec-ce32552c-a37c-48b9-a896-33ce2391ab0c.png`
- **tide-5.png** · 19초 · 크림색 해안 아치와 만·넓은 하늘 여백·문자 없음 확인
  - 원본: `C:\Users\qoxmf\.codex\generated_images\01a16938-1a16-78d3-88c3-35f0ee3a410b\exec-29a28f04-80f3-4fc4-873a-87d7676fb718.png`
- **tide-6.png** · 18초 · 폭포와 징검돌·물결 계열 색 유지·문자 없음 확인
  - 원본: `C:\Users\qoxmf\.codex\generated_images\01a16938-1a16-78d3-88c3-35f0ee3a410b\exec-050d87c3-a03c-4288-adaa-a4bff13ed20d.png`
- **tide-7.png** · 24초 · 큰 파도 터널·곡선 구도·문자 없음 확인
  - 원본: `C:\Users\qoxmf\.codex\generated_images\01a16938-1a16-78d3-88c3-35f0ee3a410b\exec-2b7d411f-d5a5-4ad3-9ab2-4d1848ad49a9.png`
- **tide-8.png** · 19초 · 심해 조개와 진주·수직 깊이감·문자 없음 확인
  - 원본: `C:\Users\qoxmf\.codex\generated_images\01a16938-1a16-78d3-88c3-35f0ee3a410b\exec-047ddf8c-5d15-4379-b868-991c6fc8368b.png`
- **tide-9.png** · 24초 · 공중 폭포 군도·넓은 청록 수면·문자 없음 확인
  - 원본: `C:\Users\qoxmf\.codex\generated_images\01a16938-1a16-78d3-88c3-35f0ee3a410b\exec-c89c5e77-1d0e-4760-8dbb-dd16cb9e2f9b.png`
- **tide-10.png** · 19초 · 빛나는 소용돌이와 큰 파도·장대한 마지막 풍경·문자 없음 확인
  - 원본: `C:\Users\qoxmf\.codex\generated_images\01a16938-1a16-78d3-88c3-35f0ee3a410b\exec-624cf798-8466-4bed-8da4-8447afc375bf.png`
- **tide-support.png** · 23초 · 청록 유리 랜턴·밧줄·소라·문자 없음 확인
  - 원본: `C:\Users\qoxmf\.codex\generated_images\01a16938-1a16-78d3-88c3-35f0ee3a410b\exec-a0b1682e-c61b-42f5-b438-6a6bdea02853.png`
