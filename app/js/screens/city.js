// Seoul Works — the city-factory built from study materials.
// A metropolis builder: explicit multi-tile map, category build sheet, live
// stats and a transit coverage overlay. All rules live in city-data.js; this
// screen only renders and delegates (see docs/CITY-EXPANSION-CONTRACT.md).
import { state, saveNow, replaceState, exportData } from '../core/store.js';
import { UNITS, NODES } from '../core/engine.js';
import { buildShowcaseCity } from '../core/showcase-city.js';
import * as city from '../core/city.js';
import * as C from '../core/city-data.js';
import * as ui from '../core/ui.js';
import * as audio from '../core/audio.js';
import { router } from '../core/router.js';
import { buildingArt } from '../core/city-art.js';

const SHOWCASE_BACKUP = 'horang.showcaseBackup.v1';

const fmt = (n) => {
  const v = Number(n) || 0;
  if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e4) return (v / 1e3).toFixed(1) + 'k';
  return Math.floor(v).toLocaleString('en-US');
};
const int = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');
const rate = (n) => (Number(n) || 0).toFixed(1);
const fmtMat = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');
const mat = (k) => C.MATERIALS[k] || { emoji: '•', label: k };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const CAT_ORDER = ['res', 'com', 'ind', 'svc', 'transit', 'landmark'];
const CAT_FALLBACK = {
  res: { id: 'res', label: 'Residential', ko: '주거', emoji: '🏘️' },
  com: { id: 'com', label: 'Commercial', ko: '상업', emoji: '🏪' },
  ind: { id: 'ind', label: 'Industrial', ko: '산업', emoji: '🏭' },
  svc: { id: 'svc', label: 'Services', ko: '서비스', emoji: '🏥' },
  transit: { id: 'transit', label: 'Transit', ko: '교통', emoji: '🚇' },
  landmark: { id: 'landmark', label: 'Landmarks', ko: '랜드마크', emoji: '🗼' },
};

const FACE = (h) => (h >= 80 ? '😄' : h >= 65 ? '🙂' : h >= 45 ? '😐' : h >= 30 ? '🙁' : '😟');
const HAPPY_TONE = (h) => (h >= 65 ? 'mint' : h >= 45 ? 'amber' : 'coral');

let overlayOn = false;

/* ---------- catalogue helpers (tolerant while city-data catches up) ---------- */

function cats() {
  const out = {};
  for (const id of CAT_ORDER) out[id] = { ...CAT_FALLBACK[id] };
  let extra = [];
  try {
    extra = (typeof city.categories === 'function' && city.categories()) || [];
  } catch {
    extra = [];
  }
  for (const row of extra) if (row && row.id) out[row.id] = { ...(out[row.id] || {}), ...row };
  return out;
}
function catOf(type, d) {
  const c = d?.category || (typeof city.categoryOf === 'function' ? city.categoryOf(type) : '') || 'svc';
  return CAT_FALLBACK[c] ? c : 'svc';
}
function sizeOf(type, d) {
  if (typeof city.sizeOf === 'function') {
    try {
      const s = city.sizeOf(type);
      if (s && Number.isFinite(s.w) && Number.isFinite(s.h)) {
        return { w: Math.max(1, Math.round(s.w)), h: Math.max(1, Math.round(s.h)) };
      }
    } catch {
      /* fall through */
    }
  }
  return {
    w: Math.max(1, Math.round(Number(d?.w) || 1)),
    h: Math.max(1, Math.round(Number(d?.h) || 1)),
  };
}
const levelScale = (level) => 1 + 0.2 * Math.max(0, (Number(level) || 1) - 1);
const popOf = (b) => Math.round((Number(C.def(b.type)?.pop) || 0) * levelScale(b.level));
const jobsOf = (b) => Math.round((Number(C.def(b.type)?.jobs) || 0) * levelScale(b.level));

/** Placed footprint. Reads the building itself so pre-multi-tile saves stay 1×1. */
function footprintOf(b) {
  const tiles = typeof city.tilesOf === 'function' ? city.tilesOf(b) : [];
  if (Array.isArray(tiles) && tiles.length) {
    let maxX = Number(b.x);
    let maxY = Number(b.y);
    for (const t of tiles) {
      maxX = Math.max(maxX, t.x);
      maxY = Math.max(maxY, t.y);
    }
    return { w: Math.max(1, maxX - Math.floor(Number(b.x)) + 1), h: Math.max(1, maxY - Math.floor(Number(b.y)) + 1) };
  }
  return sizeOf(b.type, C.def(b.type));
}

function badgeFor(type) {
  return (
    {
      airport: { text: '✈', cls: 'air', label: 'Airport' },
      metro: { text: 'M2', cls: 'line', label: 'Metro line' },
      train: { text: 'KTX', cls: 'rail', label: 'Rail' },
      ferry: { text: '⛴', cls: 'ferry', label: 'Ferry' },
      bridge: { text: '한강', cls: 'bridge', label: 'Han River' },
      tower: { text: 'N', cls: 'mark', label: 'N Seoul Tower' },
      palace: { text: '宮', cls: 'mark', label: 'Palace' },
      stadium: { text: '⚽', cls: 'mark', label: 'Stadium' },
    }[type] || null
  );
}

/* ---------- map model ---------- */

/** Explicit origin/covered map. Overlapping old saves keep the first origin. */
function buildModel(c) {
  const origin = new Map();
  const covered = new Map();
  for (const b of c.buildings) {
    const key = `${b.x},${b.y}`;
    if (origin.has(key)) continue;
    const { w, h } = footprintOf(b);
    if (b.x < 0 || b.y < 0 || b.x + w > c.grid || b.y + h > c.grid) continue;
    origin.set(key, b);
  }
  for (const [key, b] of origin) {
    const { w, h } = footprintOf(b);
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const k = `${b.x + dx},${b.y + dy}`;
        if (k !== key && !origin.has(k)) covered.set(k, b);
      }
    }
  }
  return { origin, covered };
}

/** Chebyshev coverage of every transit hub, clipped to the grid. */
function coverageModel(c, m) {
  const cells = new Map();
  const hubs = [];
  for (const b of m.origin.values()) {
    const d = C.def(b.type) || {};
    const isTransit = d.service === 'transit' || catOf(b.type, d) === 'transit';
    if (!isTransit) continue;
    const radius = Math.max(0, Number(d.coverage) || 0);
    hubs.push(b);
    if (!radius) continue;
    const { w, h } = footprintOf(b);
    for (let y = b.y - radius; y <= b.y + h - 1 + radius; y++) {
      for (let x = b.x - radius; x <= b.x + w - 1 + radius; x++) {
        if (x < 0 || y < 0 || x >= c.grid || y >= c.grid) continue;
        const dx = x < b.x ? b.x - x : x > b.x + w - 1 ? x - (b.x + w - 1) : 0;
        const dy = y < b.y ? b.y - y : y > b.y + h - 1 ? y - (b.y + h - 1) : 0;
        if (Math.max(dx, dy) <= radius) cells.set(`${x},${y}`, true);
      }
    }
  }
  return { cells, hubs };
}

function fitsAt(c, m, x, y, w, h) {
  if (x < 0 || y < 0 || x + w > c.grid || y + h > c.grid) return { ok: false, why: `Needs ${w}×${h} inside the map` };
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const k = `${x + dx},${y + dy}`;
      if (m.origin.has(k) || m.covered.has(k)) return { ok: false, why: `Needs ${w}×${h} free tiles` };
    }
  }
  return { ok: true, w, h };
}

/* ---------- shared bits ---------- */

function costChips(cost) {
  const out = [];
  if (cost.coins) out.push(`<span class="cc cc--coin">${ui.coin(13)} ${fmt(cost.coins)}</span>`);
  if (cost.gems) out.push(`<span class="cc cc--gem">${ui.gem(12)} ${cost.gems}</span>`);
  for (const k of C.MATERIAL_KEYS) if (cost[k]) out.push(`<span class="cc">${mat(k).emoji} ${fmt(cost[k])}</span>`);
  return out.join('');
}

function duration(seconds) {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

/**
 * One action can unlock a dozen achievements at once. Collapse them into a
 * single toast (and at most one confetti burst) so the map stays readable —
 * the achievements sheet is the place to browse the full list.
 */
function celebrate(achievements = [], opts = {}) {
  const list = Array.isArray(achievements) ? achievements.filter(Boolean) : [];
  if (opts.confetti) ui.confetti({ count: opts.confetti });
  if (!list.length) return;
  if (list.length === 1) {
    ui.toast(`Achievement: ${list[0].name}`, { icon: 'trophy', tone: 'amber', duration: 2200 });
  } else if (list.length <= 3) {
    ui.toast(`${list.length} achievements: ${list.map((a) => a.name).join(', ')}`, {
      icon: 'trophy',
      tone: 'amber',
      duration: 2400,
    });
  } else {
    ui.toast(`${list.length} achievements earned — see the board`, {
      icon: 'trophy',
      tone: 'amber',
      duration: 2600,
    });
  }
}

function missingChips(type, d) {
  const cost = d.cost || {};
  const info = city.info();
  const out = [];
  if ((cost.coins || 0) > state.coins) out.push(`${ui.coin(12)} ${fmt(cost.coins - state.coins)}`);
  for (const k of C.MATERIAL_KEYS) {
    const need = (cost[k] || 0) - (Number(info.resources?.[k]) || 0);
    if (need > 0) out.push(`${mat(k).emoji} ${fmt(need)}`);
  }
  return out;
}

function hudHTML() {
  const info = city.info();
  const chips = [
    `<span class="city-res city-res--coins" data-coins-pill>${ui.coin(15)} <b data-coins>${fmt(state.coins)}</b></span>`,
    ...C.MATERIAL_KEYS.filter((k) => k !== 'blueprint' || info.resources.blueprint)
      .map(
        (k) =>
          `<span class="city-res" data-res-chip="${k}"><em>${mat(k).emoji}</em><b data-res="${k}">${fmtMat(info.resources[k])}</b></span>`
      ),
  ];
  return `<div class="city-hud">${chips.join('')}</div>`;
}

/* ---------- hero ---------- */

function heroHTML(info, s, tier) {
  const bars = Array.from({ length: 34 }, (_, i) => {
    const b = info.buildings[i];
    if (!b) return '<i class="ch-bar is-empty" style="--h:5px"></i>';
    const d = C.def(b.type) || {};
    const tierN = clamp(Number(d.tier) || 3, 1, 5);
    const { w, h } = sizeOf(b.type, d);
    const tall = Math.min(26, 4 + tierN * 4 + b.level * 1.2 + w * 3 + h * 1.5);
    return `<i class="ch-bar" style="--h:${tall}px;opacity:${Math.min(0.7, 0.24 + tierN * 0.08)}"></i>`;
  }).join('');
  return `<div class="city-hero era-${info.era}">
    <div class="ch-sun"></div>
    <div class="ch-bars" aria-hidden="true">${bars}</div>
    <div class="ch-copy">
      <span class="ch-era">Era ${info.era} · ${ui.esc(info.eraInfo.name)}</span>
      <b>${ui.esc(tier.name || 'Village')} <em>${ui.esc(tier.ko || '')}</em></b>
      <span class="ch-sub">${int(s.population || 0)} residents · ${Math.round(s.happiness || 0)}% happy</span>
    </div>
  </div>`;
}

/* ---------- map ---------- */

function gridHTML(c, m, cov) {
  const cells = [];
  const seen = new Set();
  for (let y = 0; y < c.grid; y++) {
    for (let x = 0; x < c.grid; x++) {
      const key = `${x},${y}`;
      const b = m.origin.get(key) || m.covered.get(key);
      const place = `grid-column:${x + 1};grid-row:${y + 1}`;
      const inCov = cov.cells.has(key) ? ' is-in-cov' : '';
      if (!b) {
        cells.push(
          `<button class="city-cell is-empty${inCov}" style="${place}" data-tile="${x},${y}" type="button" aria-label="Empty plot ${x + 1}, ${y + 1}"><span class="ct-plus" aria-hidden="true">+</span><span class="ct-cov-dot" aria-hidden="true"></span></button>`
        );
        continue;
      }
      if (seen.has(b.id)) {
        // Covered tile: an empty placeholder that opens the owning building.
        cells.push(
          `<button class="city-cell is-cover${inCov}" style="${place}" data-owner="${ui.esc(b.id)}" tabindex="-1" aria-hidden="true" type="button"></button>`
        );
        continue;
      }
      seen.add(b.id);
      const d = C.def(b.type) || { name: b.type, ko: '', emoji: '🏗️' };
      const { w, h } = footprintOf(b);
      const cat = catOf(b.type, d);
      const badge = badgeFor(b.type);
      cells.push(
        `<button class="city-cell is-built cat-${cat} tier-${clamp(Number(d.tier) || 3, 1, 5)}${inCov}" style="grid-column:${x + 1} / span ${w};grid-row:${y + 1} / span ${h}" data-tile="${x},${y}" data-bid="${ui.esc(
          b.id
        )}" type="button" aria-label="${ui.esc(d.name)} level ${b.level}, ${w} by ${h} tiles at ${x + 1}, ${y + 1}">
          ${badge ? `<span class="ct-badge ct-badge--${badge.cls}" aria-hidden="true">${badge.text}</span>` : ''}
          <span class="ct-art">${buildingArt(b.type, { w, h, level: b.level, era: c.era, emoji: d.emoji })}</span>
          ${b.level > 1 ? `<span class="ct-lv" aria-hidden="true">L${b.level}</span>` : ''}
          <span class="ct-ring" aria-hidden="true"></span>
        </button>`
      );
    }
  }
  return cells.join('');
}

function mapHTML(info, s) {
  const c = info.city;
  const m = buildModel(c);
  const cov = coverageModel(c, m);
  const transitPct = Math.round(clamp(Number(s.transitCoverage) || 0, 0, 1) * 100);
  const usedTiles = [...m.origin.values()].reduce((a, b) => {
    const { w, h } = footprintOf(b);
    return a + w * h;
  }, 0);
  const empty = info.buildings.length === 0;
  return `<div class="city-map ${overlayOn ? 'is-overlay' : ''}">
    <div class="city-map-bar">
      <div class="cmb-title">
        <b>${c.grid}×${c.grid}</b>
        <span>${info.buildings.length} ${info.buildings.length === 1 ? 'building' : 'buildings'}</span>
        <span class="cmb-tiles">${usedTiles}/${c.grid * c.grid} tiles</span>
      </div>
      <button class="city-overlay ${overlayOn ? 'is-on' : ''}" data-overlay aria-pressed="${overlayOn}" type="button" title="Toggle transit coverage">
        ${ui.icon('map', 16)}<span>Transit</span><b>${transitPct}%</b>
      </button>
    </div>
    <div class="city-grid" style="--n:${c.grid}" role="group" aria-label="City map, ${c.grid} by ${c.grid} plots">
      ${gridHTML(c, m, cov)}
    </div>
    ${
      empty
        ? `<div class="city-empty-hint"><b>Break ground</b><span>Tap any plot to place your first building — lessons earn the bricks.</span></div>`
        : overlayOn
          ? `<div class="city-legend">
              <span><i class="lg-swatch lg-swatch--cov"></i>Transit coverage</span>
              <span><i class="lg-swatch lg-swatch--hub"></i>${cov.hubs.length} ${cov.hubs.length === 1 ? 'hub' : 'hubs'}</span>
              <b>${transitPct}% of residents</b>
            </div>`
          : `<div class="city-legend city-legend--hint"><span>Tap a plot to build · tap a building to inspect</span><b>₩${fmt(info.income)}/s</b></div>`
    }
  </div>`;
}

/* ---------- vitals ---------- */

function vitalsHTML(info, s) {
  const st = s || {};
  const pop = Number(st.population) || 0;
  const happy = Math.round(Number(st.happiness) || 0);
  const jobs = Number(st.jobs) || 0;
  const employment = st.employment != null ? Number(st.employment) : pop ? Math.min(1, jobs / pop) : 0;
  const transit = Math.round(clamp(Number(st.transitCoverage) || 0, 0, 1) * 100);
  const pollution = Number(st.pollution) || 0;
  const tier = st.tier || info.tier || { name: 'Village', ko: '마을', min: 0 };
  const next = st.nextTier || info.nextTier || null;
  const span = next ? Math.max(1, next.min - (tier.min || 0)) : 0;
  const pctNext = next ? clamp(((pop - (tier.min || 0)) / span) * 100, 0, 100) : 100;
  return `<div class="city-vitals">
    <div class="cv-head">
      <div class="cv-pop">
        <span class="lab-k">Population</span>
        <b data-live="pop">${int(pop)}</b>
        <span class="cv-tier"><i class="cv-tier-dot"></i><span data-live="tier">${ui.esc(tier.name)}</span> <em>${ui.esc(tier.ko || '')}</em></span>
      </div>
      <div class="cv-mood" data-tone="${HAPPY_TONE(happy)}">
        <span class="cv-face" data-live="face" aria-hidden="true">${FACE(happy)}</span>
        <div class="cv-mood-body">
          <b><span data-live="happy">${happy}</span><small>/100</small></b>
          <span class="cv-mood-lab">happiness</span>
          <div class="bar bar--thin cv-happy-bar"><i data-live-bar="happy" style="width:${clamp(happy, 0, 100)}%"></i></div>
        </div>
      </div>
    </div>
    <div class="cv-grid">
      <div class="cv-stat">
        <span class="lab-k">Jobs</span>
        <b data-live="jobs">${int(jobs)}</b>
        <small data-live="emp">${Math.round(employment * 100)}% filled</small>
      </div>
      <div class="cv-stat">
        <span class="lab-k">Transit</span>
        <b><span data-live="transit">${transit}</span><small>%</small></b>
        <small>coverage</small>
      </div>
      <div class="cv-stat">
        <span class="lab-k">Pollution</span>
        <b data-live="pollution">${Math.round(pollution)}</b>
        <small>${pollution > 20 ? 'heavy' : pollution > 6 ? 'hazy' : 'clear'}</small>
      </div>
      <div class="cv-stat">
        <span class="lab-k">Income</span>
        <b>₩<span data-live="income">${rate(info.income)}</span></b>
        <small>per second</small>
      </div>
    </div>
    <div class="cv-income">
      <span class="cvi"><i class="cvi-dot cvi-dot--build"></i>Buildings <b>₩<span data-live="binc">${rate(st.buildingIncome)}</span></b></span>
      <span class="cvi"><i class="cvi-dot cvi-dot--tax"></i>Tax <b>₩<span data-live="tax">${rate(st.tax)}</span></b></span>
      <span class="cvi"><i class="cvi-dot cvi-dot--tour"></i>Tourism <b>₩<span data-live="tour">${rate(st.tourism)}</span></b></span>
    </div>
    ${
      next
        ? `<div class="cv-next">
            <div class="cv-next-head">
              <b>Next tier · ${ui.esc(next.name)} <em>${ui.esc(next.ko || '')}</em></b>
              <span>${int(pop)} / ${int(next.min)} residents</span>
            </div>
            <div class="bar bar--thin bar--indigo"><i style="width:${Math.round(pctNext)}%"></i></div>
          </div>`
        : `<div class="cv-next cv-next--max"><b>Megacity — top tier reached</b><span>Grow income, not headcount.</span></div>`
    }
  </div>`;
}

/* ---------- next unlock ---------- */

function nextUnlockHTML() {
  const next = city.catalog().find((d) => !d.unlocked && d.lockReason);
  if (!next) {
    return `<div class="city-next city-next--all"><span class="cn-ico">🏙️</span><span class="cn-body"><b>Every building unlocked</b><span>Scale the skyline, then start a new era.</span></span></div>`;
  }
  const { w, h } = sizeOf(next.id, next);
  return `<button class="city-next" data-next="${ui.esc(next.id)}" type="button">
    <span class="cn-ico">${ui.icon('lock', 16)}</span>
    <span class="cn-body"><b>Next unlock · ${ui.esc(next.name)} <em>${w}×${h}</em></b><span>${ui.esc(next.lockReason)} →</span></span>
    ${ui.icon('chevron', 18)}
  </button>`;
}

/* ---------- prestige ---------- */

function prestigeHTML(info, s) {
  const pct = Math.min(100, (info.lifetimeWon / info.prestigeTarget) * 100);
  const tier = s.tier || info.tier || { name: 'Village' };
  const finalEra = info.era >= 4;
  return `<div class="city-prestige ${info.prestigeReady && !finalEra ? 'is-ready' : ''}">
    <div class="cp-head">
      <span class="overline">Era ${info.era} · ${ui.esc(info.eraInfo.name)}</span>
      <span class="cp-pct">${Math.round(pct)}%</span>
    </div>
    <div class="cp-facts">
      <span><em>Tier</em><b>${ui.esc(tier.name)}</b></span>
      <span><em>Population</em><b>${int(s.population || 0)}</b></span>
      <span><em>Era bonus</em><b>+${Math.round((1 + 0.5 * (info.era - 1)) * 100 - 100)}%</b></span>
    </div>
    <p>${
      finalEra
        ? 'Final era. You have built the future — keep scaling, or start a fresh save for another run.'
        : info.prestigeReady
          ? 'A new era is ready. Reset the city for a permanent +50% income and a new skyline.'
          : `Generate ₩${fmt(info.prestigeTarget)} in this era to rebuild with a permanent bonus.`
    }</p>
    <div class="bar bar--thin bar--amber"><i style="width:${ui.pct(pct)}%"></i></div>
    ${
      info.prestigeReady && !finalEra
        ? `<button class="btn btn-secondary btn-sm mt-3" data-prestige type="button">Begin Era ${info.era + 1}</button>`
        : ''
    }
  </div>`;
}

/* ---------- build sheet ---------- */

function openBuild(root, x, y) {
  const info = city.info();
  const c = info.city;
  const m = buildModel(c);
  const meta = cats();
  let list = [];
  try {
    list = city.catalog();
  } catch {
    list = [];
  }
  let active = 'all';

  const stateOf = (d) => {
    const { w, h } = sizeOf(d.id, d);
    const fit = fitsAt(c, m, x, y, w, h);
    const unlocked = d.unlocked !== false;
    const afford = d.affordable !== false;
    const disabled = !unlocked || !afford || !fit.ok;
    const status = !unlocked ? 'Locked' : !fit.ok ? 'No room' : !afford ? 'Need' : 'Build';
    return { w, h, fit, unlocked, afford, disabled, status };
  };

  const row = (d) => {
    const st = stateOf(d);
    const cat = catOf(d.id, d);
    const bits = [`<span class="bm bm-size">${st.w}×${st.h}</span>`];
    if (d.pop) bits.push(`<span class="bm">${int(d.pop)} pop</span>`);
    if (d.jobs) bits.push(`<span class="bm">${int(d.jobs)} ${d.jobs === 1 ? 'job' : 'jobs'}</span>`);
    if (d.coverage) bits.push(`<span class="bm">cov ${d.coverage}</span>`);
    if (d.pollution) bits.push(`<span class="bm bm--poll">poll ${d.pollution}</span>`);
    if (d.tourism) bits.push(`<span class="bm bm--tour">tour +${rate(d.tourism)}/s</span>`);
    if (d.global) bits.push(`<span class="bm bm--good">+${Math.round(d.global * 100)}% city</span>`);
    const needs = !st.unlocked ? [] : missingChips(d.id, d);
    const lock = !st.unlocked
      ? `<span class="br-lock">${ui.icon('lock', 12)} ${ui.esc(d.lockReason || 'Locked')}</span>`
      : !st.fit.ok
        ? `<span class="br-lock">${ui.icon('lock', 12)} ${ui.esc(st.fit.why)}</span>`
        : !st.afford && needs.length
          ? `<span class="br-lock br-lock--need">Missing ${needs.join(' ')}</span>`
          : '';
    return `<button class="build-row cat-${cat} ${st.disabled ? 'is-off' : ''} ${st.unlocked ? '' : 'is-locked'}" data-build="${ui.esc(
      d.id
    )}" type="button" ${st.disabled ? 'disabled' : ''}>
      <span class="br-art cat-${cat}">${buildingArt(d.id, { w: st.w, h: st.h, level: 1, era: c.era, compact: true, emoji: d.emoji })}</span>
      <span class="br-body">
        <span class="br-title"><b>${ui.esc(d.name)}</b><em>${ui.esc(d.ko || '')}</em></span>
        <span class="br-meta">${bits.join('')}</span>
        <span class="br-cost">${costChips(d.cost || {})}</span>
        ${lock}
      </span>
      <span class="br-state br-state--${st.status.toLowerCase().replace(/\s+/g, '-')}">${st.status}</span>
    </button>`;
  };

  const groupsHTML = () => {
    const sorted = [...list].sort((a, b) => {
      const ua = a.unlocked === false ? 1 : 0;
      const ub = b.unlocked === false ? 1 : 0;
      if (ua !== ub) return ua - ub;
      return (a.cost?.coins || 0) - (b.cost?.coins || 0);
    });
    const rows = CAT_ORDER.filter((id) => active === 'all' || id === active)
      .map((id) => {
        const items = sorted.filter((d) => catOf(d.id, d) === id);
        if (!items.length) return '';
        const mm = meta[id] || CAT_FALLBACK[id];
        return `<section class="build-group cat-${id}">
          <h3 class="build-group-head"><i class="bg-dot"></i>${ui.esc(mm.label)} <em>${ui.esc(mm.ko || '')}</em><span>${items.length}</span></h3>
          <div class="build-list">${items.map(row).join('')}</div>
        </section>`;
      })
      .join('');
    return rows || `<p class="build-none">Nothing in this category yet.</p>`;
  };

  const chipsHTML = () => {
    const items = [{ id: 'all', label: 'All', ko: '', emoji: '🏙️' }, ...CAT_ORDER.map((id) => meta[id])];
    return items
      .map((mm) => {
        const count =
          mm.id === 'all' ? list.length : list.filter((d) => catOf(d.id, d) === mm.id).length;
        return `<button class="bchip ${active === mm.id ? 'is-on' : ''}" data-cat="${mm.id}" aria-pressed="${
          active === mm.id
        }" type="button">${mm.emoji ? `<span aria-hidden="true">${mm.emoji}</span>` : ''}${ui.esc(mm.label)}${
          mm.ko ? ` <em>${ui.esc(mm.ko)}</em>` : ''
        }<b>${count}</b></button>`;
      })
      .join('');
  };

  const ready = list.filter((d) => stateOf(d).status === 'Build').length;
  const close = ui.sheet({
    title: `Build · plot ${x + 1}, ${y + 1}`,
    body: `<div class="build-sheet">
      <div class="build-top">
        <span class="build-plot">${ui.icon('map', 14)} Plot <b>${x + 1}, ${y + 1}</b></span>
        <span class="build-ready"><b>${ready}</b> ready to build</span>
      </div>
      <div class="bchips" role="tablist" aria-label="Building categories">${chipsHTML()}</div>
      <div class="build-groups">${groupsHTML()}</div>
    </div>`,
    actions: [{ label: 'Close', cls: 'btn-ghost' }],
  });

  const sheet = document.querySelector('.sheet');
  if (!sheet) return;
  const chips = sheet.querySelector('.bchips');
  const groups = sheet.querySelector('.build-groups');
  chips?.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-cat]');
    if (!chip) return;
    active = chip.dataset.cat;
    chips.innerHTML = chipsHTML();
    groups.innerHTML = groupsHTML();
    bindRows();
  });
  const bindRows = () => {
    groups.querySelectorAll('[data-build]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const type = btn.dataset.build;
        const d = list.find((x2) => x2.id === type);
        if (!d) return;
        const st = stateOf(d);
        if (!st.fit.ok) {
          ui.toast(st.fit.why, { tone: 'amber' });
          return;
        }
        const res = city.place(type, x, y);
        if (!res.ok) {
          ui.toast(res.reason || 'Cannot build there', { tone: 'amber' });
          return;
        }
        close();
        audio.sfx('stamp');
        celebrate(res.achievements, { confetti: 24 });
        router.refresh();
      })
    );
  };
  bindRows();
}

/* ---------- inspector ---------- */

function openBuilding(b) {
  const info = city.info();
  const s = info.stats || {};
  const d = C.def(b.type) || { name: b.type, ko: '', emoji: '🏗️', desc: '' };
  const { w, h } = footprintOf(b);
  const cat = catOf(b.type, d);
  const meta = cats()[cat] || CAT_FALLBACK.svc;
  const inc = Number(city.incomeOf ? city.incomeOf(b) : 0) || 0;
  const residents = Math.round(popOf(b));
  const jobs = Math.round(jobsOf(b));
  const taxShare = residents * 0.01 * (Number(s.happiness) || 0) / 100;
  const cost = C.upgradeCost ? C.upgradeCost(b) : C.costFor(b.type, b.level + 1);
  const sell = C.sellValue ? C.sellValue(b) : { coins: 0 };
  const maxLv = Number(C.MAX_LEVEL) || 10;
  const canUp = b.level < maxLv;
  const affordUp = canUp && (cost.coins || 0) <= state.coins && C.MATERIAL_KEYS.every((k) => (info.resources[k] || 0) >= (cost[k] || 0));
  const badge = badgeFor(b.type);
  const facts = [
    `<div><span class="lab-k">Category</span><b class="ins-cat"><i class="cvi-dot cat-${cat}"></i>${ui.esc(meta.label)}</b></div>`,
    `<div><span class="lab-k">Footprint</span><b>${w}×${h} <small>${w * h} tiles</small></b></div>`,
    `<div><span class="lab-k">Level</span><b>${b.level} <small>/ ${maxLv}</small></b></div>`,
  ];
  if (inc > 0) facts.push(`<div><span class="lab-k">Income</span><b>₩${rate(inc)}<small>/s</small></b></div>`);
  if (residents) facts.push(`<div><span class="lab-k">Residents</span><b>${int(residents)}</b></div>`);
  if (jobs) facts.push(`<div><span class="lab-k">Jobs</span><b>${int(jobs)}</b></div>`);
  if (d.coverage) facts.push(`<div><span class="lab-k">Coverage</span><b>${d.coverage} <small>tiles</small></b></div>`);
  if (d.pollution) facts.push(`<div><span class="lab-k">Pollution</span><b class="ins-bad">+${d.pollution}</b></div>`);
  if (d.tourism) facts.push(`<div><span class="lab-k">Tourism</span><b>₩${rate(d.tourism)}<small>/s</small></b></div>`);
  if (residents) facts.push(`<div><span class="lab-k">Tax share</span><b>₩${rate(taxShare)}<small>/s</small></b></div>`);
  if (d.global) facts.push(`<div><span class="lab-k">City bonus</span><b class="ins-good">+${Math.round(d.global * 100)}%</b></div>`);
  if (d.produce) {
    facts.push(
      `<div><span class="lab-k">Produces</span><b>${Object.entries(d.produce)
        .map(([k, v]) => `${mat(k).emoji} ${v}/min`)
        .join(' ')}</b></div>`
    );
  }
  if (d.service && d.service !== 'transit') {
    const label = { education: 'Education', health: 'Health', safety: 'Safety', park: 'Park', utility: 'Utility' }[d.service] || d.service;
    facts.push(`<div><span class="lab-k">Service</span><b>${ui.esc(label)}</b></div>`);
  }

  const close = ui.sheet({
    title: `${d.name} · ${d.ko || ''}`,
    body: `<div class="inspector cat-${cat}">
      <div class="ins-hero">
        <div class="ins-art cat-${cat}">${buildingArt(b.type, { w, h, level: b.level, era: info.era, size: 104, emoji: d.emoji })}</div>
        <div class="ins-tags">
          <span class="pill pill--sm cat-pill cat-${cat}">${ui.esc(meta.label)}</span>
          <span class="pill pill--sm pill--indigo">${w}×${h}</span>
          ${badge ? `<span class="pill pill--sm pill--amber">${badge.text} ${ui.esc(badge.label)}</span>` : ''}
        </div>
      </div>
      <div class="ins-grid">${facts.join('')}</div>
      ${
        canUp
          ? `<div class="ins-up">
              <div class="ins-up-head"><span class="lab-k">Upgrade to level ${b.level + 1}</span><span class="br-cost">${costChips(cost)}</span></div>
              <button class="btn btn-primary btn-block" data-up type="button" ${affordUp ? '' : 'disabled'}>${
                affordUp
                  ? inc > 0
                    ? `Upgrade · +₩${rate(inc * 0.45)}/s`
                    : `Upgrade to level ${b.level + 1}`
                  : `Need ${missingChips(b.type, { cost }).slice(0, 2).join(' ')}`
              }</button>
            </div>`
          : `<p class="center muted">Maximum level. This one is finished.</p>`
      }
      <button class="btn btn-ghost btn-block" data-sell type="button">Sell for ₩${fmt(sell.coins)}</button>
      <p class="ins-note">${ui.esc(d.desc || '')}</p>
    </div>`,
    actions: [{ label: 'Close', cls: 'btn-ghost' }],
  });
  if (!close) return;

  document.querySelector('[data-up]')?.addEventListener('click', (e) => {
    if (e.currentTarget.disabled) return;
    const res = city.upgrade(b.id);
    if (!res.ok) {
      ui.toast(res.reason || 'Cannot upgrade', { tone: 'amber' });
      return;
    }
    close();
    audio.sfx('levelup');
    ui.toast(`${d.name} → level ${res.building.level}`, { icon: 'sparkle', tone: 'mint' });
    celebrate(res.achievements);
    router.refresh();
  });
  document.querySelector('[data-sell]')?.addEventListener('click', () => {
    ui.modal({
      title: `Sell ${d.name}?`,
      body: `<p class="small muted">You get ${fmt(sell.coins)} Won and 30% of the materials back. Its ${w * h} ${
        w * h === 1 ? 'tile' : 'tiles'
      } of land reopen.</p>`,
      actions: [
        {
          label: 'Sell',
          cls: 'btn-danger',
          onClick: () => {
            city.sell(b.id);
            audio.sfx('coin');
            router.refresh();
          },
        },
        { label: 'Keep it', cls: 'btn-ghost' },
      ],
    });
  });
}

/* ---------- achievements ---------- */

function openAchievements() {
  const list = city.achievements();
  const earned = list.filter((a) => a.earned).length;
  const pct = list.length ? (earned / list.length) * 100 : 0;
  ui.sheet({
    title: 'City achievements',
    body: `<div class="ach-wrap">
      <div class="ach-head">
        <div class="ach-head-top"><b>${earned}<span>/${list.length}</span></b><em>earned</em></div>
        <div class="bar bar--thin bar--mint"><i style="width:${Math.round(pct)}%"></i></div>
      </div>
      <div class="ach-list">${list
        .map(
          (a) => `<div class="ach ${a.earned ? 'is-earned' : ''}">
            <span class="ach-ico">${a.earned ? '🏆' : '🔒'}</span>
            <span class="ach-body"><b>${ui.esc(a.name)}</b><span>${ui.esc(a.desc)}</span></span>
            <span class="ach-reward">${a.earned ? 'Earned' : costChips(a.reward || {})}</span>
          </div>`
        )
        .join('')}</div>
    </div>`,
    actions: [{ label: 'Close', cls: 'btn-ghost' }],
  });
}

/* ---------- screen ---------- */

export default {
  id: 'city',
  title: 'Seoul Works',
  nav: 'city',
  hideNav: false,
  render() {
    city.ensureCity();
    const info = city.info();
    const s = info.stats || (typeof city.stats === 'function' ? city.stats() : {});
    const tier = s.tier || info.tier || { name: 'Village', ko: '마을' };
    const earned = city.achievements().filter((a) => a.earned).length;
    return `<section class="screen city">
      <header class="city-top">
        <div>
          <span class="overline">Seoul Works · Era ${info.era}</span>
          <h1 class="city-h1">Build your Seoul</h1>
        </div>
        <div class="city-income-pill" title="Won per second">
          ${ui.coin(15)} <b data-income>${rate(info.income)}</b><small>/s</small>
        </div>
      </header>

      ${hudHTML()}
      ${
        state.flags.showcaseCity
          ? `<div class="city-showcase-banner">
              <span><b>Showcase city</b> · a completed A1 learner's save</span>
              <button class="btn btn-secondary btn-sm" data-restore-showcase type="button">Restore my save</button>
            </div>`
          : ''
      }
      ${heroHTML(info, s, tier)}
      ${mapHTML(info, s)}
      ${vitalsHTML(info, s)}

      <div class="city-actions">
        <button class="btn btn-primary btn-sm city-build-cta" data-build-cta type="button">${ui.icon('plus', 16)} Build</button>
        <button class="btn btn-secondary btn-sm" data-ach type="button">🏆 ${earned}/${city.achievements().length}</button>
        <button class="btn btn-secondary btn-sm" data-expand type="button" ${
          info.canExpand ? '' : 'disabled'
        }>Expand · ₩${fmt(info.expandCost.coins)}</button>
        <button class="btn btn-ghost btn-sm" data-showcase type="button">Showcase</button>
        <button class="btn btn-ghost btn-sm" data-go="shop" type="button">Market →</button>
      </div>

      ${nextUnlockHTML()}
      ${prestigeHTML(info, s)}

      <div class="city-note">
        <b>Study feeds the city.</b> Lessons give bricks, reviews give timber, words give glass, checkpoints give steel and a blueprint. Buildings produce Won even while you are away (8 h cap).
      </div>
    </section>`;
  },
  mount(root, params = {}) {
    city.ensureCity();
    const refresh = () => router.refresh();

    const paint = () => {
      const info = city.info();
      const s = info.stats || {};
      root.querySelectorAll('[data-coins]').forEach((el) => (el.textContent = fmt(state.coins)));
      root.querySelectorAll('[data-income]').forEach((el) => (el.textContent = rate(info.income)));
      for (const k of C.MATERIAL_KEYS) {
        root.querySelectorAll(`[data-res="${k}"]`).forEach((el) => (el.textContent = fmtMat(info.resources[k])));
      }
      const setLive = (key, value) => {
        root.querySelectorAll(`[data-live="${key}"]`).forEach((el) => (el.textContent = value));
      };
      const pop = Number(s.population) || 0;
      const happy = Math.round(Number(s.happiness) || 0);
      const jobs = Number(s.jobs) || 0;
      setLive('pop', int(pop));
      setLive('happy', String(happy));
      setLive('face', FACE(happy));
      setLive('jobs', int(jobs));
      setLive('emp', `${Math.round((s.employment != null ? Number(s.employment) : pop ? Math.min(1, jobs / pop) : 0) * 100)}% filled`);
      setLive('transit', String(Math.round(clamp(Number(s.transitCoverage) || 0, 0, 1) * 100)));
      setLive('pollution', String(Math.round(Number(s.pollution) || 0)));
      setLive('income', rate(info.income));
      setLive('binc', rate(s.buildingIncome));
      setLive('tax', rate(s.tax));
      setLive('tour', rate(s.tourism));
      setLive('tier', (s.tier || info.tier || {}).name || 'Village');
      const mood = root.querySelector('.cv-mood');
      if (mood) mood.dataset.tone = HAPPY_TONE(happy);
      const bar = root.querySelector('[data-live-bar="happy"]');
      if (bar) bar.style.width = `${clamp(happy, 0, 100)}%`;
    };

    this._timer = setInterval(() => {
      city.tick();
      paint();
    }, 5000);

    const report = city.consumeReport();
    if (report && report.seconds >= 60) {
      setTimeout(() => {
        ui.sheet({
          title: 'While you were away',
          body: `<div class="city-report">
            <p class="center muted">${duration(report.seconds)} of production</p>
            <div class="cr-coins">${ui.coin(20)} <b>+${fmt(report.coins)}</b></div>
            <div class="cr-mats">${C.MATERIAL_KEYS.filter((k) => report.resources[k] > 0.5)
              .map((k) => `<span>${mat(k).emoji} +${fmtMat(report.resources[k])}</span>`)
              .join('')}</div>
          </div>`,
          actions: [{ label: 'Collect', cls: 'btn-primary' }],
        });
      }, 350);
    }

    // ---- map taps (origin cells and covered placeholder cells) ----
    root.querySelector('.city-grid')?.addEventListener('click', (e) => {
      const owner = e.target.closest('[data-owner]');
      const cell = e.target.closest('[data-tile]');
      if (!cell && !owner) return;
      const id = owner?.dataset.owner || cell?.dataset.bid;
      const b = id ? city.byId(id) : null;
      audio.sfx('tap');
      if (b) {
        openBuilding(b);
        return;
      }
      if (cell?.dataset.tile) {
        const [x, y] = cell.dataset.tile.split(',').map(Number);
        openBuild(root, x, y);
      }
    });

    // ---- showcase save ----
    const loadShowcase = () => {
      try {
        if (!localStorage.getItem(SHOWCASE_BACKUP)) localStorage.setItem(SHOWCASE_BACKUP, exportData());
      } catch {
        /* storage may be unavailable */
      }
      state.city = buildShowcaseCity();
      state.coins = 250000;
      state.gems = Math.max(state.gems, 50);
      state.badges = UNITS.map((u) => u.id);
      state.path.completedNodes = NODES.map((n) => n.index);
      state.path.currentNode = NODES.length;
      state.xpTotal = Math.max(state.xpTotal, 18000);
      state.flags.showcaseCity = true;
      saveNow();
      audio.sfx('levelup');
      ui.confetti({ count: 32 });
      router.refresh();
    };
    const restoreShowcase = () => {
      try {
        const raw = localStorage.getItem(SHOWCASE_BACKUP);
        if (!raw) {
          ui.toast('No pre-showcase save found', { tone: 'amber' });
          return;
        }
        replaceState(JSON.parse(raw));
        localStorage.removeItem(SHOWCASE_BACKUP);
        audio.sfx('tap');
        router.go('city');
        ui.toast('Your save is back', { tone: 'mint' });
      } catch {
        ui.toast('Could not restore the save', { tone: 'amber' });
      }
    };
    root.querySelector('[data-restore-showcase]')?.addEventListener('click', restoreShowcase);
    root.querySelector('[data-showcase]')?.addEventListener('click', () => {
      ui.modal({
        title: 'Load the showcase city?',
        body: `<p class="small muted">This loads a completed A1 learner's save — all 12 badges, a 9×9 city with 81/81 tiles, the airport, KTX, metro, palace, stadium, Lotte Tower and the Han River bridge. Your current save is backed up and can be restored in one tap.</p>`,
        actions: [
          { label: 'Load showcase', cls: 'btn-primary', onClick: loadShowcase },
          { label: 'Not now', cls: 'btn-ghost' },
        ],
      });
    });
    if (params?.showcase === '1' && !state.flags.showcaseCity) {
      loadShowcase();
      return;
    }

    // ---- transit overlay ----
    root.querySelector('[data-overlay]')?.addEventListener('click', () => {
      overlayOn = !overlayOn;
      const info = city.info();
      const pct = Math.round(clamp(Number(info.stats?.transitCoverage) || 0, 0, 1) * 100);
      audio.sfx('tap');
      if (overlayOn && pct === 0) ui.toast('No transit yet — build a bus stop for coverage', { tone: 'amber' });
      // Re-render the map so the legend reflects the active overlay.
      router.refresh();
    });

    // ---- build CTA picks the first free plot ----
    root.querySelector('[data-build-cta]')?.addEventListener('click', () => {
      const info = city.info();
      const m = buildModel(info.city);
      for (let y = 0; y < info.city.grid; y++) {
        for (let x = 0; x < info.city.grid; x++) {
          if (!m.origin.has(`${x},${y}`) && !m.covered.has(`${x},${y}`)) {
            openBuild(root, x, y);
            return;
          }
        }
      }
      ui.toast('No free plots — expand the map first', { tone: 'amber' });
    });

    // ---- achievements ----
    root.querySelector('[data-ach]')?.addEventListener('click', openAchievements);

    // ---- expand ----
    root.querySelector('[data-expand]')?.addEventListener('click', () => {
      const res = city.expand();
      if (!res.ok) {
        ui.toast(res.reason || 'Cannot expand', { tone: 'amber' });
        return;
      }
      audio.sfx('stamp');
      ui.confetti({ count: 30 });
      ui.toast(`Grid expanded to ${res.grid}×${res.grid}`, { icon: 'sparkle', tone: 'mint' });
      celebrate(res.achievements);
      refresh();
    });

    // ---- prestige ----
    root.querySelector('[data-prestige]')?.addEventListener('click', () => {
      const info = city.info();
      const s = info.stats || {};
      const tier = s.tier || info.tier || { name: 'Village' };
      ui.modal({
        title: `Begin Era ${info.era + 1}?`,
        body: `<p class="small muted">This resets your buildings, materials and Won, but keeps every A1 badge, achievement and cosmetic — and gives a permanent +50% income for every era.</p>
          <p class="center mt-3"><b>Era ${info.era} → Era ${info.era + 1}</b></p>
          <p class="center muted small">${ui.esc(tier.name)} · ${int(s.population || 0)} residents will rebuild from scratch.</p>`,
        actions: [
          {
            label: 'Rebuild',
            cls: 'btn-primary',
            onClick: () => {
              city.prestigeNow();
              audio.sfx('streak');
              ui.confetti({ count: 40 });
              ui.toast(`Era ${info.era + 1}: ${C.eraInfo(info.era + 1).name}`, { icon: 'crown', tone: 'amber' });
              router.refresh();
            },
          },
          { label: 'Not yet', cls: 'btn-ghost' },
        ],
      });
    });

    // ---- next unlock detail ----
    root.querySelector('[data-next]')?.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.next;
      const d = city.catalog().find((x) => x.id === id);
      if (!d) return;
      const { w, h } = sizeOf(d.id, d);
      const cat = catOf(d.id, d);
      ui.sheet({
        title: `${d.name} · ${d.ko || ''}`,
        body: `<div class="inspector cat-${cat}">
          <div class="ins-art cat-${cat}">${buildingArt(d.id, { w, h, level: 1, era: city.info().era, size: 104, emoji: d.emoji })}</div>
          <p>${ui.esc(d.desc || '')}</p>
          <div class="ins-grid">
            <div><span class="lab-k">Category</span><b>${ui.esc((cats()[cat] || CAT_FALLBACK.svc).label)}</b></div>
            <div><span class="lab-k">Footprint</span><b>${w}×${h}</b></div>
            <div><span class="lab-k">Unlock</span><b class="ins-bad">${ui.esc(d.lockReason || 'Locked')}</b></div>
            <div><span class="lab-k">Cost</span><b>${costChips(d.cost || {})}</b></div>
          </div>
        </div>`,
        actions: [{ label: 'Close', cls: 'btn-ghost' }],
      });
    });
  },
  destroy() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  },
};
