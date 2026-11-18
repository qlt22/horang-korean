// Stateful city API. Reads/writes the shared store; all rules live in city-data.js.
import { state, save } from './store.js';
import * as C from './city-data.js';

const clampInt = (v, a, b, d) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(a, Math.min(b, n)) : d;
};

export function ensureCity() {
  if (!state.city || typeof state.city !== 'object' || state.city.version !== 1) {
    state.city = C.newCity();
  }
  const c = state.city;
  c.resources = { ...C.emptyResources(), ...(c.resources || {}) };
  c.buildings = Array.isArray(c.buildings)
    ? c.buildings.filter((b) => b && C.def(b.type) && Number.isFinite(b.x) && Number.isFinite(b.y))
    : [];
  c.achievements = Array.isArray(c.achievements) ? c.achievements : [];
  c.grid = clampInt(c.grid, C.GRID_START, C.GRID_MAX, C.GRID_START);
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
export function sync() {
  const c = ensureCity();
  c.badges = Math.min(12, (state.badges || []).length);
  const newly = C.checkAchievements(c, { badges: c.badges });
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
  save();
  return res;
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
  const income = C.cityIncome(c);
  const rates = C.cityRates(c);
  return {
    city: c,
    era: c.era,
    eraInfo: C.eraInfo(c.era),
    grid: c.grid,
    buildings: c.buildings,
    income,
    rates,
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
  const c = ensureCity();
  return C.occupied(c, x, y);
}
export function buildingAt(x, y) {
  return slot(x, y);
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
  return C.catalogList().map((d) => {
    const req = d.requires || {};
    const owned = c.buildings.filter((b) => b.type === d.id).length;
    let lockReason = null;
    if (c.buildings.length < (req.buildings || 0)) lockReason = `${req.buildings} buildings`;
    else if (req.badges && c.badges < req.badges) lockReason = `${req.badges} A1 badges`;
    else if (d.unique && owned >= 1) lockReason = 'Already built';
    return {
      ...d,
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
