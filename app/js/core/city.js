// Stateful city API. Reads/writes the shared store; all rules live in city-data.js.
// This wrapper is deliberately tolerant of missing simulation exports while the
// metropolis expansion lands in parallel: every new surface has a local fallback.
import { state, save } from './store.js';
import * as C from './city-data.js';

const clampInt = (v, a, b, d) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(a, Math.min(b, n)) : d;
};

/* ---------- catalogue fallbacks (used only if city-data is still the old one) ---------- */

const FALLBACK_CATEGORIES = {
  res: { label: 'Residential', ko: '주거', color: 'coral', emoji: '🏘️', icon: 'home' },
  com: { label: 'Commercial', ko: '상업', color: 'amber', emoji: '🏪', icon: 'shop' },
  ind: { label: 'Industry', ko: '산업', color: 'indigo', emoji: '🏭', icon: 'chart' },
  svc: { label: 'Services', ko: '서비스', color: 'mint', emoji: '🏫', icon: 'heart' },
  transit: { label: 'Transit', ko: '교통', color: 'mint', emoji: '🚇', icon: 'map' },
  landmark: { label: 'Landmark', ko: '랜드마크', color: 'amber', emoji: '🗼', icon: 'star' },
};

const TYPE_CATEGORY = {
  hanok: 'res',
  villa: 'res',
  officetel: 'res',
  apartment: 'res',
  cafe: 'com',
  shop: 'com',
  mall: 'com',
  brickworks: 'ind',
  sawmill: 'ind',
  glassworks: 'ind',
  steelworks: 'ind',
  factory: 'ind',
  park: 'svc',
  school: 'svc',
  hospital: 'svc',
  police: 'svc',
  fire: 'svc',
  power: 'svc',
  water: 'svc',
  bus: 'transit',
  subway: 'transit',
  metro: 'transit',
  train: 'transit',
  ferry: 'transit',
  airport: 'transit',
  tower: 'landmark',
  palace: 'landmark',
  stadium: 'landmark',
  lotte: 'landmark',
  bridge: 'landmark',
};

const FALLBACK_TIERS = [
  { id: 'village', name: 'Village', ko: '마을', min: 0 },
  { id: 'town', name: 'Town', ko: '소도시', min: 100 },
  { id: 'city', name: 'City', ko: '도시', min: 400 },
  { id: 'metropolis', name: 'Metropolis', ko: '대도시', min: 1200 },
  { id: 'megacity', name: 'Megacity', ko: '메가시티', min: 3000 },
];

function hasFn(name) {
  return typeof C[name] === 'function';
}

/** Footprint of a type. Old catalogues have no w/h and are 1×1. */
export function sizeOf(type) {
  if (hasFn('sizeOf')) {
    try {
      const s = C.sizeOf(type);
      if (s && Number.isFinite(s.w) && Number.isFinite(s.h)) {
        return { w: Math.max(1, Math.round(s.w)), h: Math.max(1, Math.round(s.h)) };
      }
    } catch {
      /* fall through */
    }
  }
  const d = C.def(type);
  return {
    w: Math.max(1, Math.round(Number(d?.w) || 1)),
    h: Math.max(1, Math.round(Number(d?.h) || 1)),
  };
}

export function categoryOf(type) {
  const d = C.def(type);
  return d?.category || TYPE_CATEGORY[type] || 'res';
}

/** Every tile a building covers. Handles 1×1 old saves and multi-tile footprints. */
export function tilesOf(building) {
  if (!building) return [];
  let b = building;
  if (!(Number(building.w) >= 1 && Number(building.h) >= 1)) {
    // Legacy building: 1×1, not today's catalogue footprint.
    b = { ...building, w: 1, h: 1 };
  }
  if (hasFn('tilesOf')) {
    try {
      const out = C.tilesOf(b);
      if (Array.isArray(out)) return out;
    } catch {
      /* fall through */
    }
  }
  const x = Math.round(Number(b.x));
  const y = Math.round(Number(b.y));
  if (!Number.isFinite(x) || !Number.isFinite(y)) return [];
  const { w, h } = sizeOf(b.type);
  const out = [];
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) out.push({ x: x + dx, y: y + dy });
  return out;
}

function ownerAt(city, x, y) {
  if (hasFn('buildingAt')) {
    try {
      const b = C.buildingAt(city, x, y);
      if (b) return b;
    } catch {
      /* fall through */
    }
  }
  const tx = Number(x);
  const ty = Number(y);
  if (!Number.isFinite(tx) || !Number.isFinite(ty)) return null;
  return city.buildings.find((b) => tilesOf(b).some((t) => t.x === tx && t.y === ty)) || null;
}

/** Owner of any tile covered by a building, origin or not. */
export function at(x, y) {
  const c = ensureCity();
  return ownerAt(c, x, y);
}

/** Category metadata as an array, ready for filter chips. */
export function categories() {
  const meta = C.CATEGORY_META || C.CATEGORIES;
  if (meta) {
    const rows = Array.isArray(meta) ? meta : Object.entries(meta).map(([id, m]) => ({ id, ...m }));
    if (rows.length) return rows.map((m) => ({ ...m, id: m.id }));
  }
  return Object.entries(FALLBACK_CATEGORIES).map(([id, m]) => ({ id, ...m }));
}

export function tierFor(population) {
  if (hasFn('tierFor')) {
    try {
      const t = C.tierFor(population);
      if (t) return t;
    } catch {
      /* fall through */
    }
  }
  const pop = Math.max(0, Number(population) || 0);
  let tier = FALLBACK_TIERS[0];
  for (const t of FALLBACK_TIERS) if (pop >= t.min) tier = t;
  return tier;
}

export function nextTierFor(population) {
  const current = tierFor(population);
  return FALLBACK_TIERS.find((t) => t.min > (current?.min ?? 0)) || null;
}

/* ---------- fallback stats (contract formulas, only while city-data catches up) ---------- */

const cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));

function coversTileSet(from, to, radius) {
  const a = tilesOf(from);
  const b = tilesOf(to);
  for (const p of a) for (const q of b) if (cheb(p.x, p.y, q.x, q.y) <= radius) return true;
  return false;
}

function levelScale(level) {
  return Math.pow(1.2, Math.max(0, (Number(level) || 1) - 1));
}

function fallbackStats(city) {
  const buildings = city.buildings || [];
  const popOf = (b) => (C.def(b.type)?.pop || 0) * levelScale(b.level);
  const jobsOf = (b) => (C.def(b.type)?.jobs || 0) * levelScale(b.level);
  const population = buildings.reduce((s, b) => s + popOf(b), 0);
  const jobs = buildings.reduce((s, b) => s + jobsOf(b), 0);
  const employment = population ? Math.min(1, jobs / population) : 0;

  const res = buildings.filter((b) => categoryOf(b.type) === 'res');
  const transit = buildings.filter((b) => C.def(b.type)?.service === 'transit' || categoryOf(b.type) === 'transit');
  const coveredPop = (kind) =>
    res.reduce((sum, r) => {
      const near = kind.some((t) => {
        const radius = Number(C.def(t.type)?.coverage) || 0;
        return radius > 0 && coversTileSet(t, r, radius);
      });
      return sum + (near ? popOf(r) : 0);
    }, 0);

  const transitCoverage = population ? coveredPop(transit) / population : 0;

  const serviceTypes = [...new Set(buildings.map((b) => C.def(b.type)?.service).filter((s) => s && s !== 'transit'))];
  const serviceCoverage = serviceTypes.length
    ? serviceTypes.reduce((sum, service) => {
        const sources = buildings.filter((b) => C.def(b.type)?.service === service);
        return sum + (population ? coveredPop(sources) / population : 0);
      }, 0) / serviceTypes.length
    : 0;

  const pollution = buildings.reduce((s, b) => s + (Number(C.def(b.type)?.pollution) || 0), 0);
  const powerCount = buildings.filter((b) => b.type === 'power').length;
  const waterCount = buildings.filter((b) => b.type === 'water').length;
  const utilities = Math.min(1, (powerCount + waterCount) / 2);
  const parkCount = buildings.filter((b) => b.type === 'park').length;
  const parkScore = Math.min(1, parkCount / Math.max(1, population / 60));

  const happiness = Math.max(
    0,
    Math.min(
      100,
      35 + employment * 25 + transitCoverage * 20 + serviceCoverage * 20 + parkScore * 10 + utilities * 5 - pollution * 0.6
    )
  );

  const happinessFactor = 0.55 + (happiness / 100) * 0.9;
  const buildingIncome = buildings.reduce((s, b) => s + (hasFn('buildingIncome') ? C.buildingIncome(city, b) : 0), 0);
  const tax = population * 0.01 * (happiness / 100);
  const tourism = buildings.reduce((s, b) => s + (Number(C.def(b.type)?.tourism) || 0) * levelScale(b.level), 0) * happinessFactor;
  const income = buildingIncome * happinessFactor + tax + tourism;
  const tier = tierFor(population);

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
    buildingIncome,
    income,
    tier,
    nextTier: nextTierFor(population),
    rates: hasFn('cityRates') ? C.cityRates(city) : {},
  };
}

/** Full simulation snapshot: population, happiness, tier, income breakdown. */
export function stats() {
  const c = ensureCity();
  if (hasFn('cityStats')) {
    try {
      return C.cityStats(c);
    } catch {
      /* fall through to the local mirror */
    }
  }
  return fallbackStats(c);
}

/* ---------- state and lifecycle ---------- */

export function ensureCity() {
  if (!state.city || typeof state.city !== 'object' || state.city.version !== 1) {
    state.city = C.newCity();
  }
  const c = state.city;
  c.resources = { ...C.emptyResources(), ...(c.resources || {}) };
  c.grid = clampInt(c.grid, C.GRID_START, C.GRID_MAX, C.GRID_START);
  const grid = c.grid;
  const occupied = new Set();
  const cleaned = [];
  const fits = (x, y, w, h) => {
    if (x < 0 || y < 0 || x + w > grid || y + h > grid) return false;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        if (occupied.has(`${x + dx},${y + dy}`)) return false;
      }
    }
    return true;
  };
  const mark = (x, y, w, h) => {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) occupied.add(`${x + dx},${y + dy}`);
    }
  };
  for (const raw of Array.isArray(c.buildings) ? c.buildings : []) {
    if (!raw || !C.def(raw.type)) continue;
    let x = Math.round(Number(raw.x));
    let y = Math.round(Number(raw.y));
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x >= grid || y >= grid) continue;
    // Legacy saves predate multi-tile support: their buildings are 1×1. Only an
    // explicit w/h (written by the expanded builder) is trusted here.
    let w = Number(raw.w) >= 1 ? Math.round(Number(raw.w)) : 1;
    let h = Number(raw.h) >= 1 ? Math.round(Number(raw.h)) : 1;
    w = Math.max(1, Math.min(w, grid));
    h = Math.max(1, Math.min(h, grid));
    if (!fits(x, y, w, h)) {
      // Try the full footprint elsewhere, then shrink to one tile. Never create
      // overlapping footprints (the map and the stats must agree).
      let spot = null;
      for (let yy = 0; yy < grid && !spot; yy++) {
        for (let xx = 0; xx < grid; xx++) {
          if (fits(xx, yy, w, h)) {
            spot = { x: xx, y: yy };
            break;
          }
        }
      }
      if (spot) {
        x = spot.x;
        y = spot.y;
      } else {
        w = 1;
        h = 1;
        if (!fits(x, y, 1, 1)) {
          for (let yy = 0; yy < grid && !spot; yy++) {
            for (let xx = 0; xx < grid; xx++) {
              if (fits(xx, yy, 1, 1)) {
                spot = { x: xx, y: yy };
                break;
              }
            }
          }
          if (!spot) continue;
          x = spot.x;
          y = spot.y;
        }
      }
    }
    raw.x = x;
    raw.y = y;
    raw.w = w;
    raw.h = h;
    raw.level = clampInt(raw.level, 1, C.MAX_LEVEL || 10, 1);
    mark(x, y, w, h);
    cleaned.push(raw);
  }
  c.buildings = cleaned;
  c.era = clampInt(c.era, 1, C.ERAS.length, 1);
  c.lastTick = Number.isFinite(Number(c.lastTick)) ? Number(c.lastTick) : Date.now();
  c.lifetimeWon = Math.max(0, Number(c.lifetimeWon) || 0);
  c.totalBuilt = Math.max(0, Number(c.totalBuilt) || 0);
  c.prestigeCount = Math.max(0, Number(c.prestigeCount) || 0);
  c.badges = clampInt(c.badges, 0, 12, 0);
  c.unbanked = Math.max(0, Number(c.unbanked) || 0);
  return c;
}

/** Recompute badge multiplier, award new achievements, bank their rewards. */
export function sync(ctx = {}) {
  const c = ensureCity();
  c.badges = Math.min(12, (state.badges || []).length);
  const newly = C.checkAchievements(c, { ...ctx, badges: c.badges });
  let coins = 0;
  let gems = 0;
  for (const a of newly) {
    const bank = C.applyRewards(c, a.reward);
    coins += bank.coins;
    gems += bank.gems;
  }
  if (coins) state.coins += coins;
  if (gems) state.gems += gems;
  if (newly.length) save();
  return newly;
}

/** Advance production. Coins are banked in whole Won so the shop stays clean. */
export function tick(now = Date.now()) {
  const c = ensureCity();
  const gain = C.tick(c, now);
  if (!gain) return null;
  c.unbanked = (c.unbanked || 0) + gain.coins;
  const whole = Math.floor(c.unbanked);
  c.unbanked -= whole;
  state.coins += whole;
  if (gain.seconds >= 120) {
    c.pendingReport = {
      seconds: gain.seconds,
      coins: gain.coins,
      resources: gain.resources,
      at: now,
    };
  }
  sync();
  save();
  return { ...gain, coins: gain.coins };
}

export function consumeReport() {
  const c = ensureCity();
  const r = c.pendingReport || null;
  c.pendingReport = null;
  if (r) save();
  return r;
}

export function place(type, x, y) {
  const c = ensureCity();
  const res = C.place(c, type, x, y, state.coins);
  if (!res.ok) return res;
  state.coins -= res.cost.coins || 0;
  const achievements = sync();
  save();
  return { ...res, achievements };
}

export function upgrade(id) {
  const c = ensureCity();
  const res = C.upgrade(c, id, state.coins);
  if (!res.ok) return res;
  state.coins -= res.cost.coins || 0;
  const achievements = sync();
  save();
  return { ...res, achievements };
}

export function sell(id) {
  const c = ensureCity();
  const res = C.sell(c, id);
  if (!res.ok) return res;
  state.coins += res.refund.coins || 0;
  const achievements = sync();
  save();
  return { ...res, achievements };
}

export function expand() {
  const c = ensureCity();
  const res = C.expand(c, state.coins);
  if (!res.ok) return res;
  state.coins -= res.cost.coins || 0;
  const achievements = sync();
  save();
  return { ...res, achievements };
}

export function prestigeNow() {
  const c = ensureCity();
  if (!C.prestigeReady(c)) return null;
  const next = C.prestige(c);
  if (!next) return null;
  next.unbanked = 0;
  next.pendingReport = null;
  next.buildings = [];
  next.resources = C.emptyResources();
  state.city = next;
  state.coins = 0;
  state.gems += 2;
  sync();
  save();
  return next;
}

export function info() {
  const c = ensureCity();
  const s = stats();
  const income = s.income ?? C.cityIncome(c);
  const rates = s.rates || C.cityRates(c);
  return {
    city: c,
    era: c.era,
    eraInfo: C.eraInfo(c.era),
    grid: c.grid,
    buildings: c.buildings,
    income,
    rates,
    stats: s,
    tier: s.tier,
    nextTier: s.nextTier,
    population: s.population || 0,
    happiness: s.happiness || 0,
    badges: c.badges,
    lifetimeWon: c.lifetimeWon || 0,
    prestigeReady: C.prestigeReady(c),
    prestigeTarget: C.PRESTIGE_BASE * Math.max(1, c.era),
    expandCost: C.expandCost(c),
    canExpand: c.grid < C.GRID_MAX,
    resources: c.resources,
    achievements: c.achievements,
    pendingReport: c.pendingReport || null,
  };
}

export function slot(x, y) {
  return at(x, y);
}
export function buildingAt(x, y) {
  return at(x, y);
}
export function byId(id) {
  const c = ensureCity();
  return c.buildings.find((b) => b.id === id) || null;
}
export function incomeOf(b) {
  const c = ensureCity();
  return C.buildingIncome(c, b);
}
export function canAffordType(type) {
  const c = ensureCity();
  return C.affordable(c, type, state.coins);
}
export function missingFor(type) {
  const c = ensureCity();
  return C.missingFor(c, type, state.coins);
}
export function catalog() {
  const c = ensureCity();
  const s = stats();
  const population = s.population || 0;
  return C.catalogList().map((d) => {
    const req = d.requires || {};
    const owned = c.buildings.filter((b) => b.type === d.id).length;
    let lockReason = null;
    if (c.buildings.length < (req.buildings || 0)) lockReason = `${req.buildings} buildings`;
    else if (req.pop && population < req.pop) lockReason = `${req.pop} residents`;
    else if (req.badges && c.badges < req.badges) lockReason = `${req.badges} A1 badges`;
    else if (req.era && c.era < req.era) lockReason = `Era ${req.era}`;
    else if (d.unique && owned >= 1) lockReason = 'Already built';
    return {
      ...d,
      category: categoryOf(d.id),
      size: sizeOf(d.id),
      cost: C.costFor(d.id, 1),
      owned,
      affordable: C.affordable(c, d.id, state.coins),
      unlocked: !lockReason,
      lockReason,
    };
  });
}
export function achievements() {
  const c = ensureCity();
  const earned = new Set(c.achievements || []);
  return C.ACHIEVEMENTS.map((a) => ({ ...a, earned: earned.has(a.id) }));
}
export function achievementById(id) {
  return C.ACHIEVEMENTS.find((a) => a.id === id) || null;
}

export default {
  ensureCity,
  sync,
  tick,
  consumeReport,
  place,
  upgrade,
  sell,
  expand,
  prestigeNow,
  info,
  stats,
  at,
  tilesOf,
  categories,
  sizeOf,
  categoryOf,
  tierFor,
  slot,
  buildingAt,
  byId,
  incomeOf,
  canAffordType,
  missingFor,
  catalog,
  achievements,
  achievementById,
};
