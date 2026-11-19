// Seoul Works — pure city/economy data and rules. No DOM, no store imports.
//
// API NOTES (metropolis expansion):
// - `sizeOf(type)` reads the catalogue; `tilesOf(building)` reads the building's
//   stored `w`/`h` and falls back to 1×1, so saves created before multi-tile
//   support keep their original footprint even if the catalogue grew.
// - Population/jobs/tourism scale linearly with level: base × (1 + 0.2·(level-1)),
//   rounded. Income keeps the old ×1.45/level curve.
// - `serviceCoverage` averages the present resident-facing service types
//   (education, health, safety, park). Transit is measured by `transitCoverage`
//   and power/water by `utilities`, so those are not averaged twice.
// - The binding happiness formula is implemented verbatim; the per-building
//   `happiness` field is exposed for UI copy but is not an extra term in it.
// - The city starts at 12×12 (144 tiles) and grows to 20×20 (400 tiles).
//   `expandCost` compounds 1.55× coins per expansion and adds one row of
//   materials; grids below GRID_START are priced as the 12×12 base (the
//   wrapper's `ensureCity` normalises old saves to 12 on load).
export const GRID_START = 12;
export const GRID_MAX = 20;
export const MAX_LEVEL = 10;
export const PRESTIGE_BASE = 25000;
export const OFFLINE_CAP_SECONDS = 8 * 3600;

export const MATERIALS = {
  brick: { label: 'Bricks', ko: '벽돌', emoji: '🧱', color: 'coral' },
  timber: { label: 'Timber', ko: '목재', emoji: '🪵', color: 'amber' },
  glass: { label: 'Glass', ko: '유리', emoji: '🔷', color: 'mint' },
  steel: { label: 'Steel', ko: '철강', emoji: '⚙️', color: 'indigo' },
  energy: { label: 'Energy', ko: '에너지', emoji: '⚡', color: 'coral' },
  blueprint: { label: 'Blueprints', ko: '설계도', emoji: '📐', color: 'indigo' },
};
export const MATERIAL_KEYS = Object.keys(MATERIALS);

export const ERAS = [
  { era: 1, name: 'Hanok Era', ko: '한옥 시대', sky: '#FFE3DA' },
  { era: 2, name: 'Modern Era', ko: '근대', sky: '#DFF8EE' },
  { era: 3, name: 'Skyline Era', ko: '현대', sky: '#ECE9FA' },
  { era: 4, name: 'Future Era', ko: '미래', sky: '#FFF1C9' },
];

export const CATEGORIES = {
  res: { label: 'Residential', ko: '주거', color: 'mint' },
  com: { label: 'Commercial', ko: '상업', color: 'amber' },
  ind: { label: 'Industry', ko: '산업', color: 'coral' },
  svc: { label: 'Services', ko: '서비스', color: 'indigo' },
  transit: { label: 'Transit', ko: '교통', color: 'berry' },
  landmark: { label: 'Landmarks', ko: '명소', color: 'amber' },
};

export const CATEGORY_META = {
  res: { ...CATEGORIES.res, icon: 'home', emoji: '🏠' },
  com: { ...CATEGORIES.com, icon: 'shop', emoji: '🏪' },
  ind: { ...CATEGORIES.ind, icon: 'bolt', emoji: '🏭' },
  svc: { ...CATEGORIES.svc, icon: 'heart', emoji: '🏥' },
  transit: { ...CATEGORIES.transit, icon: 'city', emoji: '🚉' },
  landmark: { ...CATEGORIES.landmark, icon: 'star', emoji: '🗼' },
};

export const TIERS = [
  { id: 'village', name: 'Village', ko: '마을', min: 0 },
  { id: 'town', name: 'Town', ko: '읍', min: 100 },
  { id: 'city', name: 'City', ko: '도시', min: 400 },
  { id: 'metropolis', name: 'Metropolis', ko: '대도시', min: 1200 },
  { id: 'megacity', name: 'Megacity', ko: '메가시티', min: 3000 },
];

/** Normalise a catalogue entry so every consumer sees the full data model. */
function building(o) {
  return {
    id: o.id,
    name: o.name,
    ko: o.ko,
    emoji: o.emoji || '🏠',
    category: o.category || 'res',
    tier: o.tier ?? 1,
    w: o.w ?? 1,
    h: o.h ?? 1,
    income: o.income ?? 0,
    pop: o.pop ?? 0,
    jobs: o.jobs ?? 0,
    produce: o.produce || null,
    coverage: o.coverage ?? 0,
    service: o.service ?? null,
    pollution: o.pollution ?? 0,
    tourism: o.tourism ?? 0,
    global: o.global ?? 0,
    happiness: o.happiness ?? 0,
    boost: o.boost ?? 0,
    unique: !!o.unique,
    requires: { buildings: 0, ...(o.requires || {}) },
    cost: o.cost,
    desc: o.desc || '',
  };
}

export const CATALOG = {
  hanok: building({
    id: 'hanok',
    name: 'Hanok',
    ko: '한옥',
    emoji: '🏠',
    category: 'res',
    tier: 1,
    income: 0.4,
    pop: 6,
    cost: { coins: 60, brick: 8 },
    requires: { buildings: 0 },
    desc: 'Your first roof. A tiled hanok on the river bank.',
  }),
  cafe: building({
    id: 'cafe',
    name: 'Café',
    ko: '카페',
    emoji: '☕',
    category: 'com',
    tier: 1,
    income: 1.5,
    jobs: 4,
    cost: { coins: 150, brick: 20, timber: 10 },
    requires: { buildings: 2 },
    desc: 'Warm lights, cheap coffee, Korean chatter.',
  }),
  park: building({
    id: 'park',
    name: 'Pocket Park',
    ko: '공원',
    emoji: '🌳',
    category: 'svc',
    tier: 1,
    income: 0,
    coverage: 2,
    service: 'park',
    happiness: 4,
    boost: 0.12,
    cost: { coins: 120, timber: 15 },
    requires: { buildings: 1 },
    desc: 'A green pocket: +12 % income on neighbouring tiles and park coverage for residents.',
  }),
  shop: building({
    id: 'shop',
    name: 'Market Stall',
    ko: '상점',
    emoji: '🏪',
    category: 'com',
    tier: 2,
    income: 3,
    jobs: 8,
    cost: { coins: 400, timber: 30, glass: 10 },
    requires: { buildings: 4 },
    desc: 'A street market that never quite closes.',
  }),
  brickworks: building({
    id: 'brickworks',
    name: 'Brickworks',
    ko: '벽돌공장',
    emoji: '🧱',
    category: 'ind',
    tier: 2,
    jobs: 10,
    pollution: 4,
    produce: { brick: 2 },
    cost: { coins: 500, timber: 20 },
    requires: { buildings: 3 },
    desc: 'Turns the city into a material engine: +2 bricks/min.',
  }),
  sawmill: building({
    id: 'sawmill',
    name: 'Sawmill',
    ko: '제재소',
    emoji: '🪵',
    category: 'ind',
    tier: 2,
    jobs: 8,
    pollution: 2,
    produce: { timber: 2 },
    cost: { coins: 600, brick: 20 },
    requires: { buildings: 5 },
    desc: 'Timber without waiting for reviews. +2 timber/min.',
  }),
  apartment: building({
    id: 'apartment',
    name: 'Apartment',
    ko: '아파트',
    emoji: '🏢',
    category: 'res',
    tier: 3,
    w: 2,
    h: 2,
    income: 3,
    pop: 48,
    cost: { coins: 900, brick: 60, steel: 25 },
    requires: { buildings: 8 },
    desc: 'The first tower that changes the skyline.',
  }),
  glassworks: building({
    id: 'glassworks',
    name: 'Glassworks',
    ko: '유리공장',
    emoji: '🔷',
    category: 'ind',
    tier: 3,
    jobs: 8,
    pollution: 3,
    produce: { glass: 1.5 },
    cost: { coins: 900, steel: 20 },
    requires: { buildings: 7 },
    desc: 'Molten glass for towers. +1.5 glass/min.',
  }),
  steelworks: building({
    id: 'steelworks',
    name: 'Steelworks',
    ko: '제철소',
    emoji: '🏭',
    category: 'ind',
    tier: 4,
    w: 2,
    h: 2,
    jobs: 24,
    pollution: 8,
    produce: { steel: 1 },
    cost: { coins: 1500, brick: 40, glass: 40 },
    requires: { buildings: 10 },
    desc: 'The heavy end of the chain. +1 steel/min.',
  }),
  office: building({
    id: 'office',
    name: 'Office Tower',
    ko: '오피스',
    emoji: '🏬',
    category: 'com',
    tier: 4,
    w: 2,
    h: 1,
    income: 10,
    jobs: 60,
    cost: { coins: 2500, steel: 80, glass: 40 },
    requires: { buildings: 12 },
    desc: 'Glass, steel, overtime. 10 Won/s per level one.',
  }),
  subway: building({
    id: 'subway',
    name: 'Subway',
    ko: '지하철',
    emoji: '🚇',
    category: 'transit',
    tier: 4,
    w: 2,
    h: 1,
    jobs: 8,
    coverage: 5,
    service: 'transit',
    unique: true,
    global: 0.1,
    cost: { coins: 5000, steel: 100, energy: 20 },
    requires: { buildings: 15 },
    desc: 'One per city. Covers five tiles and adds +10 % to every building.',
  }),
  tower: building({
    id: 'tower',
    name: 'N Seoul Tower',
    ko: 'N서울타워',
    emoji: '🗼',
    category: 'landmark',
    tier: 5,
    w: 2,
    h: 2,
    jobs: 30,
    tourism: 6,
    unique: true,
    global: 0.25,
    cost: { coins: 25000, steel: 200, glass: 100 },
    requires: { buildings: 20, badges: 12 },
    desc: 'The landmark. +25 % global, tourism, and the skyline finally has a centre.',
  }),
  villa: building({
    id: 'villa',
    name: 'Villa',
    ko: '빌라',
    emoji: '🏡',
    category: 'res',
    tier: 3,
    w: 2,
    h: 1,
    income: 1.2,
    pop: 16,
    cost: { coins: 300, brick: 45, timber: 20 },
    requires: { buildings: 4 },
    desc: 'A low-rise row for the first real neighbourhood.',
  }),
  officetel: building({
    id: 'officetel',
    name: 'Officetel',
    ko: '오피스텔',
    emoji: '🏨',
    category: 'res',
    tier: 3,
    income: 2.4,
    pop: 30,
    cost: { coins: 1200, brick: 80, glass: 40 },
    requires: { buildings: 8 },
    desc: 'Live above the shop. Dense, convenient, slightly cramped.',
  }),
  mall: building({
    id: 'mall',
    name: 'Mall',
    ko: '쇼핑몰',
    emoji: '🛍️',
    category: 'com',
    tier: 4,
    w: 2,
    h: 2,
    income: 9,
    jobs: 30,
    cost: { coins: 4000, steel: 120, glass: 80 },
    requires: { pop: 120 },
    desc: 'Weekend crowds, cinema smell, thirty jobs.',
  }),
  factory: building({
    id: 'factory',
    name: 'Factory',
    ko: '공장',
    emoji: '🏭',
    category: 'ind',
    tier: 4,
    w: 3,
    h: 2,
    income: 6,
    jobs: 40,
    pollution: 12,
    cost: { coins: 8000, steel: 150, glass: 60 },
    requires: { buildings: 14 },
    desc: 'Forty jobs and a visible smog plume over the river.',
  }),
  school: building({
    id: 'school',
    name: 'School',
    ko: '학교',
    emoji: '🏫',
    category: 'svc',
    tier: 2,
    w: 2,
    h: 2,
    jobs: 6,
    coverage: 5,
    service: 'education',
    cost: { coins: 1200, brick: 80, timber: 40 },
    requires: { pop: 80 },
    desc: 'Education coverage for the families moving in.',
  }),
  hospital: building({
    id: 'hospital',
    name: 'Hospital',
    ko: '병원',
    emoji: '🏥',
    category: 'svc',
    tier: 4,
    w: 2,
    h: 2,
    jobs: 10,
    coverage: 6,
    service: 'health',
    cost: { coins: 6000, steel: 150, glass: 100 },
    requires: { pop: 180 },
    desc: 'Health coverage across six tiles. The city sleeps easier.',
  }),
  police: building({
    id: 'police',
    name: 'Police Box',
    ko: '파출소',
    emoji: '🚓',
    category: 'svc',
    tier: 2,
    jobs: 4,
    coverage: 4,
    service: 'safety',
    cost: { coins: 700, brick: 40, timber: 20 },
    requires: { buildings: 8 },
    desc: 'A small box with a big lamp. Safety coverage, radius four.',
  }),
  fire: building({
    id: 'fire',
    name: 'Fire Station',
    ko: '소방서',
    emoji: '🚒',
    category: 'svc',
    tier: 2,
    jobs: 5,
    coverage: 4,
    service: 'safety',
    cost: { coins: 900, brick: 50, steel: 25 },
    requires: { buildings: 10 },
    desc: 'Safety coverage for the denser blocks.',
  }),
  power: building({
    id: 'power',
    name: 'Power Plant',
    ko: '발전소',
    emoji: '⚡',
    category: 'svc',
    tier: 3,
    w: 2,
    h: 2,
    jobs: 8,
    pollution: 10,
    service: 'utility',
    cost: { coins: 3000, steel: 100, glass: 40 },
    requires: { buildings: 12 },
    desc: 'Keeps the lights on. Half of the city utility score.',
  }),
  water: building({
    id: 'water',
    name: 'Water Tower',
    ko: '급수탑',
    emoji: '🚰',
    category: 'svc',
    tier: 2,
    jobs: 3,
    service: 'utility',
    cost: { coins: 400, brick: 30, steel: 10 },
    requires: { buildings: 6 },
    desc: 'The other half of the utility score.',
  }),
  bus: building({
    id: 'bus',
    name: 'Bus Stop',
    ko: '버스 정류장',
    emoji: '🚌',
    category: 'transit',
    tier: 1,
    jobs: 1,
    coverage: 2,
    service: 'transit',
    cost: { coins: 150, brick: 20, timber: 10 },
    requires: { buildings: 3 },
    desc: 'Cheap transit coverage for the first neighbourhood.',
  }),
  metro: building({
    id: 'metro',
    name: 'Metro Station',
    ko: '지하철역',
    emoji: '🚆',
    category: 'transit',
    tier: 3,
    w: 2,
    h: 1,
    jobs: 6,
    coverage: 4,
    service: 'transit',
    global: 0.05,
    cost: { coins: 1800, steel: 120, glass: 40, energy: 10 },
    requires: { buildings: 10 },
    desc: 'Radius four, six jobs, +5 % global.',
  }),
  train: building({
    id: 'train',
    name: 'Train Station',
    ko: '기차역',
    emoji: '🚉',
    category: 'transit',
    tier: 4,
    w: 2,
    h: 2,
    jobs: 10,
    coverage: 6,
    service: 'transit',
    global: 0.08,
    cost: { coins: 7000, steel: 200, glass: 60, energy: 20 },
    requires: { buildings: 18, pop: 150 },
    desc: 'The regional line. Radius six, +8 % global.',
  }),
  ferry: building({
    id: 'ferry',
    name: 'Ferry Terminal',
    ko: '여객선 터미널',
    emoji: '⛴️',
    category: 'transit',
    tier: 2,
    jobs: 3,
    coverage: 3,
    service: 'transit',
    global: 0.03,
    cost: { coins: 1200, timber: 60, steel: 40 },
    requires: { buildings: 8 },
    desc: 'A river crossing and a small global bonus.',
  }),
  airport: building({
    id: 'airport',
    name: 'Airport',
    ko: '공항',
    emoji: '✈️',
    category: 'transit',
    tier: 5,
    w: 3,
    h: 3,
    jobs: 60,
    coverage: 8,
    service: 'transit',
    global: 0.2,
    tourism: 10,
    cost: { coins: 40000, steel: 400, glass: 200, energy: 60, blueprint: 1 },
    requires: { buildings: 20, pop: 300 },
    desc: 'Three by three tiles of runway, sixty jobs, worldwide arrivals.',
  }),
  palace: building({
    id: 'palace',
    name: 'Gyeongbokgung',
    ko: '경복궁',
    emoji: '🏯',
    category: 'landmark',
    tier: 5,
    w: 3,
    h: 2,
    jobs: 6,
    tourism: 6,
    cost: { coins: 30000, steel: 300, glass: 150, blueprint: 1 },
    requires: { buildings: 0, badges: 12 },
    desc: 'A palace in the middle of the towers. Pure tourism.',
  }),
  stadium: building({
    id: 'stadium',
    name: 'World Cup Stadium',
    ko: '월드컵 경기장',
    emoji: '🏟️',
    category: 'landmark',
    tier: 5,
    w: 3,
    h: 2,
    jobs: 20,
    tourism: 5,
    happiness: 8,
    coverage: 5,
    service: 'park',
    cost: { coins: 20000, steel: 250, glass: 150 },
    requires: { buildings: 0, pop: 400 },
    desc: 'Twenty jobs, tourism, and a reason to sing on Saturdays.',
  }),
  lotte: building({
    id: 'lotte',
    name: 'Lotte World Tower',
    ko: '롯데월드타워',
    emoji: '🏙️',
    category: 'landmark',
    tier: 5,
    w: 2,
    h: 2,
    income: 12,
    jobs: 80,
    tourism: 8,
    global: 0.1,
    cost: { coins: 50000, steel: 500, glass: 250, energy: 80, blueprint: 2 },
    requires: { buildings: 24, pop: 500 },
    desc: 'The tallest thing on the skyline. Eighty jobs, +10 % global.',
  }),
  bridge: building({
    id: 'bridge',
    name: 'Han River Bridge',
    ko: '한강대교',
    emoji: '🌉',
    category: 'landmark',
    tier: 4,
    w: 3,
    h: 1,
    global: 0.06,
    cost: { coins: 12000, steel: 300 },
    requires: { buildings: 15 },
    desc: 'A span over the river and +6 % global for the whole city.',
  }),
};

export const ACHIEVEMENTS = [
  { id: 'first_brick', name: 'First brick', desc: 'Place your first building', reward: { coins: 100 }, check: (c) => (c.buildings || []).length >= 1 },
  { id: 'neighborhood', name: 'Neighborhood', desc: '10 buildings standing', reward: { coins: 300, brick: 20 }, check: (c) => (c.buildings || []).length >= 10 },
  { id: 'twenty_buildings', name: 'District', desc: '20 buildings standing', reward: { coins: 1500, brick: 50 }, check: (c) => (c.buildings || []).length >= 20 },
  { id: 'thirty_buildings', name: 'Borough', desc: '30 buildings standing', reward: { gems: 3, blueprint: 1 }, check: (c) => (c.buildings || []).length >= 30 },
  { id: 'skyline', name: 'Skyline', desc: '25 buildings standing', reward: { coins: 800, glass: 20 }, check: (c) => (c.buildings || []).length >= 25 },
  { id: 'full_grid', name: 'Full block', desc: 'Fill every tile', reward: { gems: 1, steel: 30 }, check: (c) => occupiedMap(c).size >= (c.grid || GRID_START) ** 2 },
  { id: 'first_factory', name: 'Industry', desc: 'Build your first factory', reward: { coins: 400 }, check: (c) => (c.buildings || []).some((b) => ['brickworks', 'sawmill', 'glassworks', 'steelworks', 'factory'].includes(b.type)) },
  { id: 'all_factories', name: 'Supply chain', desc: 'Own all four factories', reward: { gems: 1, energy: 5 }, check: (c) => ['brickworks', 'sawmill', 'glassworks', 'steelworks'].every((t) => (c.buildings || []).some((b) => b.type === t)) },
  { id: 'level5', name: 'Going up', desc: 'A building at level 5', reward: { coins: 500 }, check: (c) => (c.buildings || []).some((b) => b.level >= 5) },
  { id: 'level10', name: 'Top floor', desc: 'A building at level 10', reward: { gems: 1, steel: 40 }, check: (c) => (c.buildings || []).some((b) => b.level >= 10) },
  { id: 'income10', name: 'Small economy', desc: '10 Won per second', reward: { coins: 300 }, check: (c) => cityIncome(c) >= 10 },
  { id: 'income100', name: 'Boom town', desc: '100 Won per second', reward: { coins: 1000, gems: 1 }, check: (c) => cityIncome(c) >= 100 },
  { id: 'income1000', name: 'Megacity', desc: '1,000 Won per second', reward: { gems: 3, blueprint: 1 }, check: (c) => cityIncome(c) >= 1000 },
  { id: 'subway', name: 'Express line', desc: 'Build the subway', reward: { coins: 1000, energy: 5 }, check: (c) => (c.buildings || []).some((b) => b.type === 'subway') },
  { id: 'tower', name: 'Landmark', desc: 'Build N Seoul Tower', reward: { gems: 2, coins: 2000 }, check: (c) => (c.buildings || []).some((b) => b.type === 'tower') },
  { id: 'grid7', name: 'Growing out', desc: 'Expand to a 13×13 grid', reward: { coins: 800, brick: 30 }, check: (c) => (c.grid || GRID_START) >= GRID_START + 1 },
  { id: 'era2', name: 'New era', desc: 'Prestige into Era 2', reward: { gems: 2 }, check: (c) => c.era >= 2 },
  { id: 'era3', name: 'Third skyline', desc: 'Prestige into Era 3', reward: { gems: 3, blueprint: 1 }, check: (c) => c.era >= 3 },
  { id: 'a1_badges', name: 'A1 architect', desc: 'Earn all 12 A1 unit badges', reward: { gems: 2, coins: 3000 }, check: (c, ctx) => (ctx?.badges ?? c.badges ?? 0) >= 12 },
  // Population and scale
  { id: 'pop100', name: 'Hundred neighbours', desc: '100 residents', reward: { coins: 600, brick: 40 }, check: (c) => cityStats(c).population >= 100 },
  { id: 'pop500', name: 'Half a thousand', desc: '500 residents', reward: { coins: 1500, gems: 1 }, check: (c) => cityStats(c).population >= 500 },
  { id: 'pop2000', name: 'Two thousand', desc: '2,000 residents', reward: { gems: 2, steel: 50 }, check: (c) => cityStats(c).population >= 2000 },
  { id: 'metropolis', name: 'Metropolis', desc: 'Reach 3,000 residents', reward: { gems: 3, blueprint: 1 }, check: (c) => cityStats(c).population >= 3000 },
  // Transit
  { id: 'transit50', name: 'Getting around', desc: 'Transit covers 50 % of residents', reward: { coins: 800 }, check: (c) => cityStats(c).transitCoverage >= 0.5 },
  { id: 'transit90', name: 'Car-free', desc: 'Transit covers 90 % of residents', reward: { gems: 2, energy: 10 }, check: (c) => cityStats(c).transitCoverage >= 0.9 },
  // Transit landmarks
  { id: 'airport', name: 'Open skies', desc: 'Build the airport', reward: { coins: 5000, gems: 2 }, check: (c) => (c.buildings || []).some((b) => b.type === 'airport') },
  { id: 'metro', name: 'Under the city', desc: 'Build a metro station', reward: { coins: 1200, energy: 5 }, check: (c) => (c.buildings || []).some((b) => b.type === 'metro') },
  { id: 'train', name: 'Regional line', desc: 'Build a train station', reward: { coins: 3000, gems: 1 }, check: (c) => (c.buildings || []).some((b) => b.type === 'train') },
  // Landmarks and society
  { id: 'palace', name: 'Old Seoul', desc: 'Build Gyeongbokgung', reward: { gems: 3 }, check: (c) => (c.buildings || []).some((b) => b.type === 'palace') },
  { id: 'stadium', name: 'Match day', desc: 'Build the World Cup Stadium', reward: { gems: 2, coins: 3000 }, check: (c) => (c.buildings || []).some((b) => b.type === 'stadium') },
  { id: 'happy90', name: 'Happy city', desc: 'Reach 90 happiness', reward: { gems: 3 }, check: (c) => cityStats(c).happiness >= 90 },
  { id: 'all_categories', name: 'Mixed city', desc: 'Own a building in every category', reward: { coins: 2000, gems: 2 }, check: (c) => Object.keys(CATEGORIES).every((cat) => (c.buildings || []).some((b) => def(b.type)?.category === cat)) },
];

export function emptyResources() {
  return { brick: 0, timber: 0, glass: 0, steel: 0, energy: 0, blueprint: 0 };
}

export function newCity(now = Date.now()) {
  return {
    version: 1,
    era: 1,
    grid: GRID_START,
    buildings: [],
    resources: emptyResources(),
    lastTick: now,
    lifetimeWon: 0,
    totalBuilt: 0,
    achievements: [],
    prestigeCount: 0,
    badges: 0,
    lastGain: null,
  };
}

export function eraInfo(era) {
  return ERAS[Math.min(ERAS.length - 1, Math.max(0, (era || 1) - 1))];
}
export function maxLevel() {
  return MAX_LEVEL;
}
export function def(type) {
  return CATALOG[type] || null;
}
export function catalogList() {
  return Object.values(CATALOG);
}

export function costFor(type, level = 1) {
  const d = def(type);
  if (!d) return {};
  const mult = Math.pow(1.7, Math.max(0, level - 1));
  const out = {};
  for (const [k, v] of Object.entries(d.cost)) out[k] = Math.round(v * mult);
  return out;
}

export function totalInvested(b) {
  let coins = 0;
  const mats = emptyResources();
  for (let l = 1; l <= b.level; l++) {
    const c = costFor(b.type, l);
    coins += c.coins || 0;
    for (const k of MATERIAL_KEYS) mats[k] += c[k] || 0;
  }
  return { coins, ...mats };
}

export function affordable(city, type, coins = Infinity) {
  const c = costFor(type, 1);
  return (c.coins || 0) <= coins && MATERIAL_KEYS.every((k) => (city.resources?.[k] || 0) >= (c[k] || 0));
}

export function missingFor(city, type, coins = Infinity) {
  const c = costFor(type, 1);
  const missing = {};
  if ((c.coins || 0) > coins) missing.coins = (c.coins || 0) - coins;
  for (const k of MATERIAL_KEYS) {
    const need = (c[k] || 0) - (city.resources?.[k] || 0);
    if (need > 0) missing[k] = need;
  }
  return missing;
}

export function countType(city, type) {
  return (city.buildings || []).filter((b) => b.type === type).length;
}

/** Catalogue footprint of a building type. */
export function sizeOf(type) {
  const d = def(type);
  return { w: Math.max(1, Math.floor(d?.w || 1)), h: Math.max(1, Math.floor(d?.h || 1)) };
}

/** Every tile a placed building covers. Saves without w/h are 1×1. */
export function tilesOf(b) {
  if (!b) return [];
  const w = Math.max(1, Math.floor(Number(b.w) || 1));
  const h = Math.max(1, Math.floor(Number(b.h) || 1));
  const x = Math.floor(Number(b.x) || 0);
  const y = Math.floor(Number(b.y) || 0);
  const out = [];
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) out.push({ x: x + dx, y: y + dy });
  return out;
}

/** "x,y" -> owning building, for every covered tile. */
export function occupiedMap(city) {
  const map = new Map();
  for (const b of city?.buildings || []) {
    for (const t of tilesOf(b)) map.set(`${t.x},${t.y}`, b);
  }
  return map;
}

export function buildingAt(city, x, y) {
  for (const b of city?.buildings || []) {
    for (const t of tilesOf(b)) if (t.x === x && t.y === y) return b;
  }
  return null;
}

/** Legacy single-tile lookup; now multi-tile aware. */
export function occupied(city, x, y) {
  return buildingAt(city, x, y);
}

/** Chebyshev distance between the closest tiles of two footprints. */
function tileDistance(aTiles, bTiles) {
  let best = Infinity;
  for (const p of aTiles) {
    for (const q of bTiles) {
      const d = Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y));
      if (d < best) {
        best = d;
        if (best === 0) return 0;
      }
    }
  }
  return best;
}

export function placeable(city, type, x, y, ctx = {}) {
  const d = def(type);
  if (!d) return { ok: false, reason: 'Unknown building' };
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { ok: false, reason: 'Outside the grid' };
  const { w, h } = sizeOf(type);
  if (x < 0 || y < 0 || x + w > city.grid || y + h > city.grid) return { ok: false, reason: 'Outside the grid' };
  const occ = occupiedMap(city);
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      if (occ.has(`${x + dx},${y + dy}`)) return { ok: false, reason: 'That tile is taken' };
    }
  }
  if (d.unique && countType(city, type) >= 1) return { ok: false, reason: 'Only one per city' };
  const req = d.requires || {};
  const count = (city.buildings || []).length;
  if (count < (req.buildings || 0)) {
    return { ok: false, reason: `Needs ${req.buildings} buildings (you have ${count})` };
  }
  if (req.pop) {
    const pop = cityStats(city).population;
    if (pop < req.pop) return { ok: false, reason: `Needs ${req.pop} residents (you have ${pop})` };
  }
  const badges = ctx.badges ?? city.badges ?? 0;
  if (req.badges && badges < req.badges) {
    return { ok: false, reason: `Needs ${req.badges} A1 badges` };
  }
  if (req.era && (city.era || 1) < req.era) {
    return { ok: false, reason: `Needs era ${req.era}` };
  }
  return { ok: true };
}

export function pay(city, cost, coins) {
  city.resources = city.resources || emptyResources();
  if ((cost.coins || 0) > coins) return false;
  for (const k of MATERIAL_KEYS) if ((cost[k] || 0) > (city.resources[k] || 0)) return false;
  for (const k of MATERIAL_KEYS) city.resources[k] = Math.max(0, (city.resources[k] || 0) - (cost[k] || 0));
  return true;
}

export function place(city, type, x, y, coins, ctx = {}) {
  city.resources = city.resources || emptyResources();
  city.buildings = city.buildings || [];
  const check = placeable(city, type, x, y, ctx);
  if (!check.ok) return { ok: false, ...check };
  const cost = costFor(type, 1);
  if ((cost.coins || 0) > coins) return { ok: false, reason: 'Not enough Won' };
  if (!pay(city, cost, coins)) return { ok: false, reason: 'Not enough resources' };
  const { w, h } = sizeOf(type);
  const b = {
    id: `b_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4).toString(36)}`,
    type,
    x,
    y,
    w,
    h,
    level: 1,
    placedAt: Date.now(),
  };
  city.buildings.push(b);
  city.totalBuilt = (city.totalBuilt || 0) + 1;
  return { ok: true, building: b, cost };
}

export function upgradeCost(b) {
  return costFor(b.type, b.level + 1);
}
export function upgrade(city, id, coins) {
  const b = (city.buildings || []).find((x) => x.id === id);
  if (!b) return { ok: false, reason: 'Building not found' };
  if (b.level >= MAX_LEVEL) return { ok: false, reason: 'Already at max level' };
  const cost = upgradeCost(b);
  if ((cost.coins || 0) > coins) return { ok: false, reason: 'Not enough Won' };
  if (!pay(city, cost, coins)) return { ok: false, reason: 'Not enough resources' };
  b.level += 1;
  return { ok: true, building: b, cost };
}

export function sellValue(b) {
  const inv = totalInvested(b);
  const out = { coins: Math.floor((inv.coins || 0) * 0.35) };
  for (const k of MATERIAL_KEYS) out[k] = Math.floor((inv[k] || 0) * 0.3);
  return out;
}
export function sell(city, id) {
  const i = (city.buildings || []).findIndex((x) => x.id === id);
  if (i < 0) return { ok: false, reason: 'Building not found' };
  city.resources = city.resources || emptyResources();
  const b = city.buildings[i];
  const refund = sellValue(b);
  city.buildings.splice(i, 1);
  for (const k of MATERIAL_KEYS) city.resources[k] = (city.resources[k] || 0) + (refund[k] || 0);
  return { ok: true, refund };
}

export function adjacencyBonus(city, b) {
  const tiles = tilesOf(b);
  let parks = 0;
  for (const o of city.buildings || []) {
    if (o === b || o.type !== 'park') continue;
    if (tileDistance(tiles, tilesOf(o)) <= 1) parks++;
  }
  return Math.min(0.6, parks * 0.12);
}

export function globalMultiplier(city) {
  const era = 1 + 0.5 * (Math.max(1, city.era || 1) - 1);
  const uniques = (city.buildings || []).reduce((a, b) => a + (def(b.type)?.global || 0), 0);
  const badges = 1 + 0.01 * Math.min(12, city.badges || 0);
  return era * (1 + uniques) * badges;
}

export function buildingIncome(city, b) {
  const d = def(b.type);
  if (!d?.income) return 0;
  const level = Math.max(1, Math.floor(Number(b.level) || 1));
  return d.income * Math.pow(1.45, level - 1) * (1 + adjacencyBonus(city, b)) * globalMultiplier(city);
}

function computeRates(city) {
  const rates = emptyResources();
  for (const b of city.buildings || []) {
    const d = def(b.type);
    if (!d?.produce) continue;
    const level = Math.max(1, Math.floor(Number(b.level) || 1));
    const mult = Math.pow(1.3, level - 1) * (1 + 0.1 * (Math.max(1, city.era || 1) - 1));
    for (const [k, v] of Object.entries(d.produce)) rates[k] += (v / 60) * mult;
  }
  return rates;
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function tierFor(population) {
  const p = Math.max(0, Number(population) || 0);
  let tier = TIERS[0];
  for (const t of TIERS) if (p >= t.min) tier = t;
  return tier;
}

/**
 * Deterministic city snapshot. O(buildings²) because of coverage checks.
 * Safe to call on every render.
 */
export function cityStats(city) {
  const src = city || {};
  const buildings = Array.isArray(src.buildings) ? src.buildings : [];
  const era = Math.max(1, src.era || 1);
  const badges = Math.min(12, src.badges || 0);
  const eraMult = 1 + 0.5 * (era - 1);
  const badgeMult = 1 + 0.01 * badges;
  const uniques = buildings.reduce((a, b) => a + (def(b.type)?.global || 0), 0);
  const global = eraMult * (1 + uniques) * badgeMult;

  let population = 0;
  let jobs = 0;
  let rawIncome = 0;
  let rawTourism = 0;
  let pollution = 0;
  let powerCount = 0;
  let waterCount = 0;
  let parkCount = 0;
  const residential = [];
  const covered = [];

  for (const b of buildings) {
    const d = def(b.type);
    if (!d) continue;
    const level = Math.max(1, Math.floor(Number(b.level) || 1));
    const scale = 1 + 0.2 * (level - 1);

    const pop = Math.round((d.pop || 0) * scale);
    const job = Math.round((d.jobs || 0) * scale);
    population += pop;
    jobs += job;
    const tiles = tilesOf(b);
    if (pop > 0) residential.push({ tiles, pop });

    if (d.income) rawIncome += d.income * Math.pow(1.45, level - 1) * (1 + adjacencyBonus(src, b)) * global;
    if (d.tourism) rawTourism += d.tourism * Math.pow(1.3, level - 1);
    pollution += Number(d.pollution) || 0;

    if (d.service === 'park') parkCount += 1;
    if (b.type === 'power') powerCount += 1;
    if (b.type === 'water') waterCount += 1;
    if (d.service && d.coverage > 0) covered.push({ service: d.service, radius: d.coverage, tiles });
  }

  const coveredPop = (service) => {
    if (!population) return 0;
    let sum = 0;
    for (const r of residential) {
      if (covered.some((s) => s.service === service && tileDistance(r.tiles, s.tiles) <= s.radius)) sum += r.pop;
    }
    return sum;
  };

  const transitCoverage = population ? coveredPop('transit') / population : 0;
  const serviceTypes = new Set(
    covered.map((s) => s.service).filter((s) => s !== 'transit' && s !== 'utility')
  );
  let serviceCoverage = 0;
  if (serviceTypes.size && population) {
    let total = 0;
    for (const type of serviceTypes) total += coveredPop(type) / population;
    serviceCoverage = total / serviceTypes.size;
  }

  const employment = population ? Math.min(1, jobs / population) : 0;
  const utilities = Math.min(1, (powerCount + waterCount) / 2);
  const parkScore = Math.min(1, parkCount / Math.max(1, population / 60));
  const happiness = clamp(
    35 + employment * 25 + transitCoverage * 20 + serviceCoverage * 20 + parkScore * 10 + utilities * 5 - pollution * 0.6,
    0,
    100
  );

  const happinessFactor = 0.55 + (happiness / 100) * 0.9;
  const tax = population * 0.01 * (happiness / 100);
  const tourism = rawTourism * happinessFactor;
  const income = rawIncome * happinessFactor + tax + tourism;

  const tier = tierFor(population);
  const tierIndex = TIERS.indexOf(tier);
  const nextTier = tierIndex >= 0 && tierIndex < TIERS.length - 1 ? TIERS[tierIndex + 1] : null;

  return {
    population,
    jobs,
    employment,
    happiness,
    transitCoverage,
    serviceCoverage,
    pollution,
    utilities,
    tax,
    tourism,
    buildingIncome: rawIncome,
    income,
    tier,
    nextTier,
    rates: computeRates(src),
    buildings: buildings.length,
  };
}

export function cityIncome(city) {
  return cityStats(city).income;
}

export function cityRates(city) {
  return computeRates(city);
}

/**
 * Cost of the next expansion: the added row costs `n = grid − GRID_START + 1`
 * (1 at the starting 12×12) worth of materials, and coins compound 1.55× per
 * side already bought. Saves older than the 12×12 start normalise to 12 in the
 * wrapper (`ensureCity`), and the clamp here keeps the curve monotonic anyway.
 */
export function expandCost(city) {
  const grid = Math.max(GRID_START, Math.floor(Number(city?.grid) || GRID_START));
  const n = grid - GRID_START + 1;
  return {
    coins: Math.round(4000 * Math.pow(1.55, grid - GRID_START)),
    brick: 60 * n,
    steel: 25 * n,
  };
}
export function expand(city, coins) {
  // Legacy saves predate the 12×12 start; normalise before pricing the next row.
  if (!(Number(city.grid) >= GRID_START)) city.grid = GRID_START;
  if (city.grid >= GRID_MAX) return { ok: false, reason: 'Maximum grid size' };
  const cost = expandCost(city);
  if ((cost.coins || 0) > coins) return { ok: false, reason: 'Not enough Won' };
  if (!pay(city, cost, coins)) return { ok: false, reason: 'Not enough resources' };
  city.grid += 1;
  return { ok: true, grid: city.grid, cost };
}

/** Advance production since lastTick. Returns null if less than a second passed. */
export function tick(city, now = Date.now()) {
  const last = Number(city.lastTick) || now;
  const seconds = Math.min(OFFLINE_CAP_SECONDS, Math.max(0, (now - last) / 1000));
  if (seconds < 1) {
    city.lastTick = now;
    return null;
  }
  const coins = cityIncome(city) * seconds;
  const rates = computeRates(city);
  const resources = {};
  for (const k of MATERIAL_KEYS) {
    const gain = (rates[k] || 0) * seconds;
    if (gain > 0) {
      resources[k] = gain;
      city.resources[k] = (city.resources[k] || 0) + gain;
    }
  }
  city.lastTick = now;
  city.lifetimeWon = (city.lifetimeWon || 0) + coins;
  const gain = { seconds, coins, resources };
  city.lastGain = gain;
  return gain;
}

export function checkAchievements(city, ctx = {}) {
  city = city || {};
  const earned = new Set(city.achievements || []);
  if (!Array.isArray(city.achievements)) city.achievements = [];
  const newly = [];
  for (const a of ACHIEVEMENTS) {
    if (earned.has(a.id)) continue;
    let ok = false;
    try {
      ok = a.check(city, ctx);
    } catch {
      ok = false;
    }
    if (ok) {
      city.achievements.push(a.id);
      newly.push(a);
    }
  }
  return newly;
}

export function prestigeReady(city) {
  const era = Math.max(1, city.era || 1);
  if (era >= ERAS.length) return false;
  return (city.lifetimeWon || 0) >= PRESTIGE_BASE * era;
}
export function prestige(city) {
  if ((city.era || 1) >= ERAS.length) return null;
  if (!prestigeReady(city)) return null;
  const next = newCity();
  next.era = Math.min(ERAS.length, (city.era || 1) + 1);
  next.achievements = [...(city.achievements || [])];
  next.prestigeCount = (city.prestigeCount || 0) + 1;
  next.badges = city.badges || 0;
  return next;
}

export function studyRewards({ kind = 'node', newSentences = 0, reviews = 0, words = 0, stars = 3, checkpoint = false, streakDay = false } = {}) {
  const r = { brick: 4 + newSentences * 2 + (stars === 3 ? 3 : 0) };
  if (reviews) r.timber = Math.floor(reviews / 2);
  if (words) r.glass = Math.floor(words / 4);
  if (checkpoint) {
    r.steel = 12;
    r.blueprint = 1;
  }
  if (streakDay) r.energy = 2;
  if (kind === 'checkpoint') r.steel = (r.steel || 0) + 5;
  return r;
}

/** Add a reward bundle to the city. Returns coins/gems that the caller must bank. */
export function applyRewards(city, rewards = {}) {
  const bank = { coins: 0, gems: 0 };
  for (const [k, v] of Object.entries(rewards || {})) {
    if (!v) continue;
    if (k === 'coins') bank.coins += v;
    else if (k === 'gems') bank.gems += v;
    else if (MATERIAL_KEYS.includes(k)) city.resources[k] = (city.resources[k] || 0) + v;
  }
  return bank;
}

export function totalMaterials(city) {
  return MATERIAL_KEYS.reduce((a, k) => a + (city.resources?.[k] || 0), 0);
}

export function cityLevel(city) {
  const inc = cityIncome(city);
  return Math.max(1, Math.floor(Math.log10(1 + inc) * 6) + 1);
}

export default {
  MATERIALS,
  MATERIAL_KEYS,
  ERAS,
  CATEGORIES,
  CATEGORY_META,
  CATALOG,
  TIERS,
  ACHIEVEMENTS,
  GRID_START,
  GRID_MAX,
  MAX_LEVEL,
  PRESTIGE_BASE,
  newCity,
  def,
  catalogList,
  costFor,
  sizeOf,
  tilesOf,
  occupiedMap,
  buildingAt,
  occupied,
  countType,
  placeable,
  place,
  upgrade,
  upgradeCost,
  sell,
  sellValue,
  expand,
  expandCost,
  buildingIncome,
  cityStats,
  cityIncome,
  cityRates,
  adjacencyBonus,
  globalMultiplier,
  tierFor,
  tick,
  checkAchievements,
  prestigeReady,
  prestige,
  studyRewards,
  applyRewards,
  cityLevel,
  eraInfo,
};
