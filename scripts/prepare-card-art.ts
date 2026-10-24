import { mkdirSync, writeFileSync } from "node:fs";
import { WORKS, PATRONS } from "../packages/game-core/src/games/workshop";
import { DISTRICTS, ROLES } from "../packages/game-core/src/games/council";
import {
  CARD_INFO,
  CHARACTER_INFO,
} from "../packages/game-core/src/games/signal";

const style =
  "Create one original premium fantasy board-game illustration. Portrait 2:3, full bleed, tactile hand-painted stylized 3D, soft organic silhouettes, luminous atmospheric depth, beautiful crafted materials, refined brush texture, inviting magical exploration like an illustrated fantasy landscape card. A single finished illustration, never a collage or card mockup. No text, letters, numbers, logos, watermarks, UI or borders. Keep upper corners quiet for code-rendered labels. Important focal details in central half. ";
type Entry = {
  game: string;
  key: string;
  name: string;
  src: string;
  prompt: string;
};
const entries: Entry[] = [];
function add(game: string, key: string, name: string, scene: string) {
  entries.push({
    game,
    key,
    name,
    src: `/art/cards/${game}/${key}.png`,
    prompt: style + scene,
  });
}
const palettes = {
  white: "opalescent ivory, pearl and soft gold",
  blue: "sapphire blue, turquoise and silver",
  green: "emerald, moss and warm brass",
  red: "ruby, coral and copper",
  black: "obsidian, amethyst and antique gold",
};
const workScenes = [
  "a luminous raw crystal growing beside a spring in a secluded grotto",
  "a delicate cut gemstone resting on a velvet cushion beside artisan tools",
  "a handblown glass lantern hanging above a flower-lined stream",
  "a tiny jewelled music box opening in a sunlit atelier",
  "a carved crystal compass resting on a weathered wooden table",
  "a polished gemstone pendant suspended among drifting light motes",
  "a miniature stained-glass greenhouse with a glowing plant inside",
  "a sparkling mosaic bowl on a stone ledge overlooking a quiet valley",
  "an elaborate prism chandelier illuminating a vaulted artisan workshop",
  "an ornate mechanical astrolabe with gemstone lenses on a balcony",
  "a graceful fountain carved from translucent crystal in a walled garden",
  "a magnificent stained-glass window reflecting colored light into a hall",
  "a floating crystal terrarium supported by delicate gilded rings",
  "a luminous gemstone harp on a pavilion above a misty river",
  "a towering palace of luminous faceted glass and rounded domes",
  "a majestic celestial orrery floating over an enchanted city",
  "a vast crystalline bridge linking two glowing mountaintop ateliers",
  "a legendary radiant tree sculpted from gemstones above a sea of clouds",
];
const indexes: Record<string, number> = {};
for (const work of WORKS) {
  const i = indexes[work.bonus] ?? 0;
  indexes[work.bonus] = i + 1;
  add(
    "workshop",
    work.id,
    `${work.bonus} 작품 ${work.id.slice(2)}`,
    `Palette: ${palettes[work.bonus]}. Scene: ${workScenes[i]}. Fantasy craftsmanship, no people. Distinct composition, level ${work.level} sophistication.`,
  );
}
const patrons = [
  "elderly woman glass collector with silver braided hair and an ivory shawl",
  "young man astronomer with curly dark hair and a blue velvet coat",
  "middle-aged woman botanist with deep brown skin and an emerald cloak",
  "older East Asian man architect with a neatly trimmed beard and black silk robes",
  "confident woman musician with auburn curls and a ruby cape",
  "young androgynous ceramic artist with short silver hair and a turquoise apron",
  "elderly man gardener with dark skin and a green scarf",
  "woman map collector with wavy black hair and a violet brocade jacket",
  "young man clockmaker with copper hair and round brass glasses",
  "middle-aged woman curator with a white hair streak and a golden embroidered coat",
];
PATRONS.forEach((p, i) =>
  add(
    "workshop",
    p.id,
    `후원자 ${i + 1}`,
    `Original character portrait: ${patrons[i]}. Waist-up, warm dignified expression, holding a small luminous crafted treasure. Dreamlike jewel atelier behind them, painterly fantasy, no real person likeness.`,
  ),
);
const buildings: Record<string, string> = {
  estate: "an elegant moonlit manor beside silver birch trees",
  citadel: "a luminous alabaster castle on a rounded hill",
  palace: "a star-lit palace with gold domes and reflecting pools",
  shrine: "a tiny dawn shrine with a luminous stone altar",
  chapel: "a blue-roofed chapel with radiant stained glass",
  cloister: "a serene cloister with arched galleries and a lotus pond",
  sanctum: "a majestic celestial sanctuary floating above clouds",
  inn: "a cozy crescent-moon tavern with warmly lit windows",
  bazaar: "a winding market of colorful lantern stalls",
  exchange: "a glass-roofed trading house beside a canal",
  pier: "a silver wooden pier beneath the Milky Way",
  port: "a turquoise harbor with fantasy sailboats and rounded towers",
  hall: "a grand storytelling square with an amphitheater and glowing trees",
  outpost: "a lonely watchtower with a warm beacon on a misty ridge",
  vault: "a solemn stone holding fortress with blue lanterns, no prisoners",
  barracks: "a red-roofed training courtyard with neatly arranged banners",
  bastion: "an imposing ironstone bastion under a red sunset",
  memory: "an ethereal memorial garden with ghostly luminous flowers",
  seal: "a sealed tower wrapped in luminous protective rings",
  laboratory: "an alchemist laboratory filled with glowing glass vessels",
  forge: "a golden artisan forge with magical sparks and crystal tools",
  observatory:
    "a domed observatory with a giant brass telescope and starry sky",
  memorial:
    "a tranquil memory archive with luminous glass urns and willow trees",
  gate: "a monumental moon-halo gateway above a cloud valley",
  academy: "a dawn academy with cascading terraces and sunlit courtyards",
  archive: "a vast blue-lit library of curved shelves and floating lanterns",
  rampart: "a sweeping crescent city wall along a moonlit ridge",
  prism: "a luminous color research institute with rainbow glass prisms",
};
DISTRICTS.forEach((d) =>
  add(
    "council",
    d.kind,
    d.name,
    `Night city fantasy, deep indigo and ${d.category === "gold" ? "warm gold" : d.category} accents. Scene: ${buildings[d.kind]}. Architectural landscape, no people.`,
  ),
);
const councilRoles = [
  "a mysterious hooded night scout holding a dim lantern on a moonlit roof",
  "an agile silver-gloved treasure seeker holding a small coin pouch in a narrow alley",
  "a theatrical illusionist holding an ornate porcelain mask amid violet ribbons of magic",
  "a dignified lunar envoy wearing a delicate crescent crown on a palace balcony",
  "a calm oath guardian in blue robes holding a luminous shield",
  "a cheerful travelling merchant with emerald robes and a small chest of glowing gems",
  "a thoughtful architect with rolled blank blueprints and a luminous miniature tower",
  "a resolute city-wall commander in rounded red and bronze armor, overlooking battlements",
];
ROLES.forEach((r, i) =>
  add(
    "council",
    `role-${r.rank}`,
    r.name,
    `Original character portrait: ${councilRoles[i]}. Waist-up, beautifully painted face, midnight fantasy city background, no real person likeness.`,
  ),
);
const signalScenes: Record<string, string> = {
  strike:
    "a sleek brass crystal emitter projecting one luminous cyan beam across a desert canyon",
  evade:
    "a shimmering translucent afterimage curving past a glowing energy beam",
  tonic:
    "a small emergency energy cell filled with warm golden light on a field kit",
  pulse: "a radiant turquoise energy wave spreading around a desert outpost",
  challenge:
    "two glowing antenna towers facing each other across a sunset canyon, intertwined energy arcs",
  jam: "a tangled violet interference cloud surrounding a malfunctioning radio crystal",
  snatch:
    "a magnetic retrieval gauntlet drawing a luminous artifact through the air",
  cache:
    "an open communal supply chest packed with luminous tools in a sandstone plaza",
  supply:
    "a bright beacon transmitting concentric golden rings above a desert campsite",
  caravan:
    "a whimsical brass supply train crossing a glowing desert bridge at dusk",
  barrage:
    "a crystal tower sending a fan of luminous beams across the violet sky",
  raiders:
    "a majestic spiralling sandstorm with amber lightning beyond a desert camp",
  shield:
    "a curved translucent prism shield bending a beam of light into a rainbow",
  detour:
    "a ghostly luminous winding route between sandstone arches under two moons",
  lens: "a brass tracking lens with a brilliant cyan iris on a rocky lookout",
  quarantine:
    "a peaceful glowing containment dome enclosing a small equipment platform",
  reactor:
    "an unstable levitating energy core with contained amber and violet arcs",
  repeater: "a sophisticated multi-coil crystal oscillator on a brass pedestal",
  range2: "a small folded brass antenna unfolding like a mechanical flower",
  range3: "a tall telescoping antenna overlooking a sandstone valley",
  range4:
    "an elegant satellite dish reflecting aurora light on a desert observatory",
  range5:
    "a monumental horizon antenna with luminous concentric rings above a mountain ridge",
};
Object.entries(CARD_INFO).forEach(([key, c]) =>
  add(
    "signal",
    key,
    c.name,
    `Soft science-fantasy desert world, amber sunset, turquoise energy and violet shadows, crafted brass rather than gritty machinery. Scene: ${signalScenes[key]}. No people, no violence or real weapons.`,
  ),
);
const people = [
  "sturdy young man with warm brown skin, short curls and a patched amber exploration coat",
  "thoughtful young woman with a red braided ponytail and luminous crystal goggles",
  "androgynous explorer with cropped silver hair and a reversible blue and coral cape",
  "determined woman with dark brown skin and a copper shoulder guard",
  "cheerful young man with tousled black hair and pockets of scavenged crystals",
  "calm woman with long dark braids and a translucent shield bracelet",
  "older woman with short gray hair carrying a brass survey telescope",
  "smiling young man with auburn hair and a lucky crystal charm",
  "quiet woman with short violet hair and a flowing sand-colored scarf",
  "middle-aged man with curly brown hair and a toolkit of recycled brass parts",
  "focused young woman with a high black ponytail and a glowing tracking lens",
  "gentle man with silver-streaked hair and a turquoise medic satchel",
  "confident woman with copper curls and an elegant crystal aiming device",
  "resourceful young woman with a short black bob and many utility pockets",
  "weathered older man with dark skin, silver beard and a recovered artifact pack",
  "energetic young man with wavy blond hair and a twin-coil crystal transmitter",
];
Object.entries(CHARACTER_INFO).forEach(([key, c], i) =>
  add(
    "signal",
    `character-${key}`,
    c.name,
    `Original waist-up portrait: ${people[i]}. Soft science-fantasy desert outpost at amber dusk, luminous teal details, warmly expressive crafted outfit, no real person likeness.`,
  ),
);
Object.entries({
  captain: [
    "기지 대장",
    "a luminous brass command beacon crowned with a radiant sun crystal",
  ],
  ally: [
    "수호대",
    "a pair of intertwined protective shields beside a glowing outpost lantern",
  ],
  raider: [
    "황혼단",
    "a crimson crescent banner rising above a remote violet desert camp",
  ],
  drifter: [
    "독행자",
    "a solitary traveler's glowing compass and windblown scarf on a sunset ridge",
  ],
}).forEach(([key, [name, scene]]) =>
  add(
    "signal",
    `role-${key}`,
    name!,
    `Symbolic faction artwork in a soft science-fantasy desert world. Scene: ${scene}. No text or people.`,
  ),
);
const plants = [
  "a dew-covered seedling",
  "a luminous crocus",
  "a curled fern",
  "a wild rose",
  "a bellflower",
  "a water lily",
  "a flowering bonsai",
  "a cluster of foxgloves",
  "a dahlia",
  "a small flowering magnolia tree",
  "an arching wisteria branch",
  "a radiant lotus",
  "an enchanted blooming tree",
];
const gardenColors = {
  coral: "warm coral pink and peach",
  sky: "sky blue and turquoise",
  leaf: "fresh leaf green and gold",
  violet: "violet and lavender",
};
for (const [color, palette] of Object.entries(gardenColors))
  plants.forEach((plant, i) =>
    add(
      "garden",
      `${color}-${i + 1}`,
      `${color} ${i + 1}`,
      `A delicate miniature garden vignette of ${plant}, palette ${palette}, on a dreamy pale ivory mist background. Botanical fantasy, tiny glowing dew droplets. Main plant in lower third, upper two thirds light and uncluttered for a large code-rendered tile number. No people.`,
    ),
  );
add(
  "garden",
  "joker",
  "조커",
  "A small opalescent star-shaped flower floating above a miniature rainbow garden, ivory mist background, botanical fantasy. Main subject in lower third, upper two thirds light and uncluttered. No people.",
);
mkdirSync("docs/art", { recursive: true });
mkdirSync(".scratch/remaining-card-art", { recursive: true });
for (const game of new Set(entries.map((e) => e.game)))
  mkdirSync(`apps/web/public/art/cards/${game}`, { recursive: true });
writeFileSync(
  "docs/art/remaining-card-prompts.json",
  JSON.stringify(entries, null, 2) + "\n",
);
writeFileSync(
  ".scratch/remaining-card-art/spec.md",
  `# 나머지 게임 개별 카드 아트\n\nStatus: in-progress\nLabel: ready-for-agent\n\n사용자 요청: 별길 탐험과 같은 느낌으로 나머지 게임 카드 이미지를 하나씩 모두 생성하고 적용한다.\n\n## 완료 조건\n\n- 내장 imagegen 개별 호출로 ${entries.length}종 생성, 원본과 프롬프트 기록.\n- 빛의 공방 100종, 밤의 의회 36종, 황혼의 신호 42종, 넘버가든 53종.\n- 동일 종류 복사본은 같은 그림 사용. 숫자·비용·효과는 기존 데이터와 HTML 유지.\n- 공개 View 경계 유지, 갤러리·실제 화면·모바일 검수, 타입 검사와 빌드.\n\n## 검증\n\n진행 중.\n`,
);
console.log(
  JSON.stringify({
    total: entries.length,
    byGame: Object.fromEntries(
      [...new Set(entries.map((e) => e.game))].map((g) => [
        g,
        entries.filter((e) => e.game === g).length,
      ]),
    ),
  }),
);
