// Seoul Works — pure city/economy data and rules. No DOM, no store imports.
export const GRID_START = 6;
export const GRID_MAX = 9;
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

export const CATALOG = {
  hanok: {
    id: 'hanok',
    name: 'Hanok',
    ko: '한옥',
    emoji: '🏠',
    tier: 1,
    income: 0.4,
    cost: { coins: 60, brick: 8 },
    requires: { buildings: 0 },
    desc: 'Your first roof. A tiled hanok on the river bank.',
  },
  cafe: {
    id: 'cafe',
    name: 'Café',
    ko: '카페',
    emoji: '☕',
    tier: 1,
    income: 1.5,
    cost: { coins: 150, brick: 20, timber: 10 },
    requires: { buildings: 2 },
    desc: 'Warm lights, cheap coffee, Korean chatter.',
  },
  park: {
    id: 'park',
    name: 'Pocket Park',
    ko: '공원',
    emoji: '🌳',
    tier: 1,
    income: 0,
    boost: 0.12,
    cost: { coins: 120, timber: 15 },
    requires: { buildings: 1 },
    desc: 'Boosts the income of all eight neighbouring tiles by 12 %.',
  },
  shop: {
    id: 'shop',
    name: 'Market Stall',
    ko: '상점',
    emoji: '🏪',
    tier: 2,
    income: 3,
    cost: { coins: 400, timber: 30, glass: 10 },
    requires: { buildings: 4 },
    desc: 'A street market that never quite closes.',
  },
  brickworks: {
    id: 'brickworks',
    name: 'Brickworks',
    ko: '벽돌공장',
    emoji: '🧱',
    tier: 2,
    income: 0,
    produce: { brick: 2 },
    cost: { coins: 500, timber: 20 },
    requires: { buildings: 3 },
    desc: 'Turns the city into a material engine: +2 bricks/min.',
  },
  sawmill: {
    id: 'sawmill',
    name: 'Sawmill',
    ko: '제재소',
    emoji: '🪵',
    tier: 2,
    income: 0,
    produce: { timber: 2 },
    cost: { coins: 600, brick: 20 },
    requires: { buildings: 5 },
    desc: 'Timber without waiting for reviews. +2 timber/min.',
  },
  apartment: {
    id: 'apartment',
    name: 'Apartment',
    ko: '아파트',
    emoji: '🏢',
    tier: 3,
    income: 7,
    cost: { coins: 900, brick: 60, steel: 25 },
    requires: { buildings: 8 },
    desc: 'The first tower that changes the skyline.',
  },
  glassworks: {
    id: 'glassworks',
    name: 'Glassworks',
    ko: '유리공장',
    emoji: '🔷',
    tier: 3,
    income: 0,
    produce: { glass: 1.5 },
    cost: { coins: 900, steel: 20 },
    requires: { buildings: 7 },
    desc: 'Molten glass for towers. +1.5 glass/min.',
  },
  steelworks: {
    id: 'steelworks',
    name: 'Steelworks',
    ko: '제철소',
    emoji: '🏭',
    tier: 4,
    income: 0,
    produce: { steel: 1 },
    cost: { coins: 1500, brick: 40, glass: 40 },
    requires: { buildings: 10 },
    desc: 'The heavy end of the chain. +1 steel/min.',
  },
  office: {
    id: 'office',
    name: 'Office Tower',
    ko: '오피스',
    emoji: '🏬',
    tier: 4,
    income: 15,
    cost: { coins: 2500, steel: 80, glass: 40 },
    requires: { buildings: 12 },
    desc: 'Glass, steel, overtime. 15 Won/s per level one.',
  },
  subway: {
    id: 'subway',
    name: 'Subway',
    ko: '지하철',
    emoji: '🚇',
    tier: 4,
    income: 0,
    unique: true,
    global: 0.1,
    cost: { coins: 5000, steel: 100, energy: 20 },
    requires: { buildings: 15 },
    desc: 'One per city. +10 % to every building, permanently.',
  },
  tower: {
    id: 'tower',
    name: 'N Seoul Tower',
    ko: 'N서울타워',
    emoji: '🗼',
    tier: 5,
    income: 0,
    unique: true,
    global: 0.25,
    cost: { coins: 25000, steel: 200, glass: 100 },
    requires: { buildings: 20, badges: 12 },
    desc: 'The landmark. +25 % global, and the skyline finally has a centre.',
  },
};

export const ACHIEVEMENTS = [
  { id: 'first_brick', name: 'First brick', desc: 'Place your first building', reward: { coins: 100 }, check: (c) => c.buildings.length >= 1 },
  { id: 'neighborhood', name: 'Neighborhood', desc: '10 buildings standing', reward: { coins: 300, brick: 20 }, check: (c) => c.buildings.length >= 10 },
  { id: 'skyline', name: 'Skyline', desc: '25 buildings standing', reward: { coins: 800, glass: 20 }, check: (c) => c.buildings.length >= 25 },
  { id: 'full_grid', name: 'Full block', desc: 'Fill every tile', reward: { gems: 1, steel: 30 }, check: (c) => c.buildings.length >= c.grid * c.grid },
  { id: 'first_factory', name: 'Industry', desc: 'Build your first factory', reward: { coins: 400 }, check: (c) => c.buildings.some((b) => ['brickworks', 'sawmill', 'glassworks', 'steelworks'].includes(b.type)) },
  { id: 'all_factories', name: 'Supply chain', desc: 'Own all four factories', reward: { gems: 1, energy: 5 }, check: (c) => ['brickworks', 'sawmill', 'glassworks', 'steelworks'].every((t) => c.buildings.some((b) => b.type === t)) },
  { id: 'level5', name: 'Going up', desc: 'A building at level 5', reward: { coins: 500 }, check: (c) => c.buildings.some((b) => b.level >= 5) },
  { id: 'level10', name: 'Top floor', desc: 'A building at level 10', reward: { gems: 1, steel: 40 }, check: (c) => c.buildings.some((b) => b.level >= 10) },
  { id: 'income10', name: 'Small economy', desc: '10 Won per second', reward: { coins: 300 }, check: (c) => cityIncome(c) >= 10 },
  { id: 'income100', name: 'Boom town', desc: '100 Won per second', reward: { coins: 1000, gems: 1 }, check: (c) => cityIncome(c) >= 100 },
  { id: 'income1000', name: 'Megacity', desc: '1,000 Won per second', reward: { gems: 3, blueprint: 1 }, check: (c) => cityIncome(c) >= 1000 },
  { id: 'subway', name: 'Express line', desc: 'Build the subway', reward: { coins: 1000, energy: 5 }, check: (c) => c.buildings.some((b) => b.type === 'subway') },
  { id: 'tower', name: 'Landmark', desc: 'Build N Seoul Tower', reward: { gems: 2, coins: 2000 }, check: (c) => c.buildings.some((b) => b.type === 'tower') },
  { id: 'grid7', name: 'Growing out', desc: 'Expand to a 7×7 grid', reward: { coins: 800, brick: 30 }, check: (c) => c.grid >= 7 },
  { id: 'era2', name: 'New era', desc: 'Prestige into Era 2', reward: { gems: 2 }, check: (c) => c.era >= 2 },
  { id: 'era3', name: 'Third skyline', desc: 'Prestige into Era 3', reward: { gems: 3, blueprint: 1 }, check: (c) => c.era >= 3 },
  { id: 'a1_badges', name: 'A1 architect', desc: 'Earn all 12 A1 unit badges', reward: { gems: 2, coins: 3000 }, check: (c, ctx) => (ctx?.badges || 0) >= 12 },
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
  return city.buildings.filter((b) => b.type === type).length;
}
export function occupied(city, x, y) {
  return city.buildings.find((b) => b.x === x && b.y === y) || null;
}

export function placeable(city, type, x, y, ctx = {}) {
  const d = def(type);
  if (!d) return { ok: false, reason: 'Unknown building' };
  if (x < 0 || y < 0 || x >= city.grid || y >= city.grid) return { ok: false, reason: 'Outside the grid' };
  if (occupied(city, x, y)) return { ok: false, reason: 'That tile is taken' };
  if (d.unique && countType(city, type) >= 1) return { ok: false, reason: 'Only one per city' };
  const req = d.requires || {};
  if (city.buildings.length < (req.buildings || 0)) {
    return { ok: false, reason: `Needs ${req.buildings} buildings (you have ${city.buildings.length})` };
  }
  if (req.badges && (ctx.badges || city.badges || 0) < req.badges) {
    return { ok: false, reason: `Needs ${req.badges} A1 badges` };
  }
  return { ok: true };
}

export function pay(city, cost, coins) {
  if ((cost.coins || 0) > coins) return false;
  for (const k of MATERIAL_KEYS) if ((cost[k] || 0) > (city.resources[k] || 0)) return false;
  for (const k of MATERIAL_KEYS) city.resources[k] = Math.max(0, (city.resources[k] || 0) - (cost[k] || 0));
  return true;
}

export function place(city, type, x, y, coins, ctx = {}) {
  const check = placeable(city, type, x, y, ctx);
  if (!check.ok) return { ok: false, ...check };
  const cost = costFor(type, 1);
  if ((cost.coins || 0) > coins) return { ok: false, reason: 'Not enough Won' };
  if (!pay(city, cost, coins)) return { ok: false, reason: 'Not enough resources' };
  const b = {
    id: `b_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4).toString(36)}`,
    type,
    x,
    y,
    level: 1,
    placedAt: Date.now(),
  };
  city.buildings.push(b);
  city.totalBuilt += 1;
  return { ok: true, building: b, cost };
}

export function upgradeCost(b) {
  return costFor(b.type, b.level + 1);
}
export function upgrade(city, id, coins) {
  const b = city.buildings.find((x) => x.id === id);
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
  const i = city.buildings.findIndex((x) => x.id === id);
  if (i < 0) return { ok: false, reason: 'Building not found' };
  const b = city.buildings[i];
  const refund = sellValue(b);
  city.buildings.splice(i, 1);
  for (const k of MATERIAL_KEYS) city.resources[k] = (city.resources[k] || 0) + (refund[k] || 0);
  return { ok: true, refund };
}

export function adjacencyBonus(city, b) {
  let parks = 0;
  for (const o of city.buildings) {
    if (o.type !== 'park') continue;
    if (Math.abs(o.x - b.x) <= 1 && Math.abs(o.y - b.y) <= 1) parks++;
  }
  return Math.min(0.6, parks * 0.12);
}

export function globalMultiplier(city) {
  const era = 1 + 0.5 * (Math.max(1, city.era) - 1);
  const uniques = city.buildings.reduce((a, b) => a + (def(b.type)?.global || 0), 0);
  const badges = 1 + 0.01 * Math.min(12, city.badges || 0);
  return era * (1 + uniques) * badges;
}

export function buildingIncome(city, b) {
  const d = def(b.type);
  if (!d?.income) return 0;
  return d.income * Math.pow(1.45, b.level - 1) * (1 + adjacencyBonus(city, b)) * globalMultiplier(city);
}

export function cityIncome(city) {
  return city.buildings.reduce((sum, b) => sum + buildingIncome(city, b), 0);
}

export function cityRates(city) {
  const rates = emptyResources();
  for (const b of city.buildings) {
    const d = def(b.type);
    if (!d?.produce) continue;
    const mult = Math.pow(1.3, b.level - 1) * (1 + 0.1 * (Math.max(1, city.era) - 1));
    for (const [k, v] of Object.entries(d.produce)) rates[k] += (v / 60) * mult;
  }
  return rates;
}

export function expandCost(city) {
  const n = city.grid - GRID_START + 1;
  return { coins: Math.round(1500 * Math.pow(1.8, n)), brick: 40 * n, steel: 15 * n };
}
export function expand(city, coins) {
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
  const rates = cityRates(city);
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
  const earned = new Set(city.achievements || []);
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
  return (city.lifetimeWon || 0) >= PRESTIGE_BASE * Math.max(1, city.era);
}
export function prestige(city) {
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
  CATALOG,
  ACHIEVEMENTS,
  GRID_START,
  GRID_MAX,
  MAX_LEVEL,
  PRESTIGE_BASE,
  newCity,
  def,
  catalogList,
  costFor,
  placeable,
  place,
  upgrade,
  upgradeCost,
  sell,
  sellValue,
  expand,
  expandCost,
  buildingIncome,
  cityIncome,
  cityRates,
  adjacencyBonus,
  globalMultiplier,
  tick,
  checkAchievements,
  prestigeReady,
  prestige,
  studyRewards,
  applyRewards,
  cityLevel,
  eraInfo,
};
