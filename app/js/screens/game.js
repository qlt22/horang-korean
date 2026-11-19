// Seoul Works — full-screen 3D city mode.
//
// A Cities-Skylines-like diorama built from real CSS 3D volumes. The wrapper in
// core/city.js owns every rule; this screen only paints, picks tiles and calls
// place/upgrade/sell/expand/prestige. Ground tiles are the pointer targets and
// every 3D object is pointer-events:none, so a tap always lands on a tile.

import { state } from '../core/store.js';
import * as city from '../core/city.js';
import * as C from '../core/city-data.js';
import * as ui from '../core/ui.js';
import * as audio from '../core/audio.js';
import { router } from '../core/router.js';
import { TILE, flat, front, back, side, west } from '../game/geometry.js';
import { modelHTML, heightOf, peakOf } from '../game/models.js';
import { createCamera } from '../game/camera.js';

const CAT_ORDER = ['res', 'com', 'ind', 'svc', 'transit', 'landmark'];
const CAT_FALLBACK = {
  res: { id: 'res', label: 'Residential', ko: '주거' },
  com: { id: 'com', label: 'Commercial', ko: '상업' },
  ind: { id: 'ind', label: 'Industry', ko: '산업' },
  svc: { id: 'svc', label: 'Services', ko: '서비스' },
  transit: { id: 'transit', label: 'Transit', ko: '교통' },
  landmark: { id: 'landmark', label: 'Landmarks', ko: '명소' },
};

const fmt = (n) => {
  const v = Number(n) || 0;
  if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e4) return (v / 1e3).toFixed(1) + 'k';
  return Math.floor(v).toLocaleString('en-US');
};
const int = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');
const rate = (n) => (Number(n) || 0).toFixed(1);
const incomeFmt = (n) => {
  const v = Number(n) || 0;
  if (v >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1000) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
  return rate(v);
};
const hudFmt = (n) => {
  const v = Number(n) || 0;
  if (v >= 1e6) return (v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (v >= 1e4) return Math.round(v / 1e3) + 'k';
  if (v >= 1000) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
  return Math.floor(v).toLocaleString('en-US');
};
const mat = (k) => C.MATERIALS[k] || { emoji: '•', label: k };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const HAPPY_TONE = (h) => (h >= 70 ? 'mint' : h >= 45 ? 'amber' : 'coral');

let active = null;

/** The lead owns index.html; make the screen self-sufficient in tests too. */
function ensureStyles() {
  if (typeof document === 'undefined') return;
  const found = [...document.querySelectorAll('link[rel="stylesheet"]')].some((l) =>
    /(^|\/)game\.css(\?|$)/.test(l.getAttribute('href') || '')
  );
  if (found) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'app/styles/game.css';
  link.dataset.gameCss = '1';
  document.head.appendChild(link);
}

function footprint(b) {
  if (b && Number(b.w) >= 1 && Number(b.h) >= 1) return { w: Math.round(b.w), h: Math.round(b.h) };
  const s = city.sizeOf(b?.type);
  return { w: s.w, h: s.h };
}

function categoryOf(type, d) {
  return d?.category || city.categoryOf(type) || 'res';
}

function cats() {
  const out = {};
  for (const id of CAT_ORDER) out[id] = { ...CAT_FALLBACK[id] };
  try {
    for (const row of city.categories() || []) if (row?.id) out[row.id] = { ...out[row.id], ...row };
  } catch {
    /* keep fallbacks */
  }
  return out;
}

function snapshot() {
  const info = city.info();
  const c = info.city;
  const grid = Math.max(1, Number(c.grid) || 6);
  const ownerMap = new Map();
  const buildings = Array.isArray(c.buildings) ? c.buildings : [];
  for (const b of buildings) {
    const { w, h } = footprint(b);
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        ownerMap.set(`${Math.round(b.x) + dx},${Math.round(b.y) + dy}`, b);
      }
    }
  }
  // Transit Chebyshev coverage, clipped to the map.
  const cov = new Map();
  for (const b of buildings) {
    const d = C.def(b.type) || {};
    const isTransit = d.service === 'transit' || categoryOf(b.type, d) === 'transit';
    const radius = Math.max(0, Number(d.coverage) || 0);
    if (!isTransit || !radius) continue;
    const { w, h } = footprint(b);
    for (let y = b.y - radius; y <= b.y + h - 1 + radius; y++) {
      for (let x = b.x - radius; x <= b.x + w - 1 + radius; x++) {
        if (x < 0 || y < 0 || x >= grid || y >= grid) continue;
        const dx = x < b.x ? b.x - x : x > b.x + w - 1 ? x - (b.x + w - 1) : 0;
        const dy = y < b.y ? b.y - y : y > b.y + h - 1 ? y - (b.y + h - 1) : 0;
        if (Math.max(dx, dy) <= radius) cov.set(`${x},${y}`, true);
      }
    }
  }
  return { info, c, grid, ownerMap, cov, buildings };
}

function topHTML(info, s) {
  const era = (info.eraInfo?.name || `Era ${info.era}`).replace(/ Era$/, '');
  const tier = s.tier?.name || 'Village';
  const happy = Math.round(Number(s.happiness) || 0);
  return `<header class="g-top">
    <div class="g-top-row">
      <button class="g-study" data-study type="button">${ui.icon('back', 15)}<span>Study</span></button>
      <div class="g-id">
        <b>Seoul Works</b>
        <span><em data-hud="era">Era ${info.era}</em><i class="g-era-name"> · ${ui.esc(era)}</i> · <em data-hud="tier">${ui.esc(tier)}</em></span>
      </div>
      <div class="g-income" title="Won per second">${ui.coin(13)}<b data-hud="income">${incomeFmt(info.income)}</b><small>/s</small></div>
      <button class="g-top-btn" data-list type="button" title="2D overview">${ui.icon('map', 16)}<span>List</span></button>
      <button class="g-top-btn g-menu-btn" data-menu-btn type="button" aria-label="City menu" aria-expanded="false">${ui.icon('settings', 18)}</button>
    </div>
    <div class="g-top-row g-top-row--chips">
      <div class="g-chips">
        <span class="g-chip g-chip--coin">${ui.coin(12)}<b data-hud="coins">${hudFmt(state.coins)}</b></span>
        ${C.MATERIAL_KEYS.map(
          (k) => `<span class="g-chip" data-chip="${k}" title="${ui.esc(mat(k).label)}"><em>${mat(k).emoji}</em><b data-hud="mat-${k}">${hudFmt(info.resources?.[k] || 0)}</b></span>`
        ).join('')}
      </div>
      <div class="g-vitals" data-tone="${HAPPY_TONE(happy)}">
        <span class="g-vital" title="Population">${ui.icon('user', 12)}<b data-hud="pop">${int(s.population)}</b></span>
        <span class="g-vital g-vital--happy" title="Happiness">${ui.icon('heart', 12)}<b data-hud="happy">${happy}</b><small>%</small></span>
      </div>
    </div>
  </header>`;
}

function bottomHTML(info) {
  return `<div class="g-bottom">
    <button class="g-build-btn" data-build-toggle type="button"><span aria-hidden="true">＋</span> Build</button>
    <div class="g-bottom-meta"><b data-hud="grid">${info.grid}×${info.grid}</b><span data-hud="tiles">0 tiles</span></div>
    <button class="g-transit" data-transit type="button" aria-pressed="false">${ui.icon('map', 15)}<span>Transit</span><b data-hud="transit">0%</b></button>
  </div>`;
}

function shellHTML(info, s) {
  return `<section class="g-screen" data-game data-era="${info.era}" aria-label="Seoul Works 3D city">
    <div class="g-sky" aria-hidden="true">
      <i class="g-sun"></i><i class="g-cloud g-cloud--1"></i><i class="g-cloud g-cloud--2"></i><i class="g-cloud g-cloud--3"></i>
    </div>
    ${topHTML(info, s)}
    <div class="g-stage" data-stage>
      <div class="g-camera" data-camera>
        <div class="g-world era-${info.era}" data-world>
          <div class="g-city" data-city></div>
          <div class="g-hover" data-hover hidden></div>
          <div class="g-ghost" data-ghost hidden></div>
        </div>
      </div>
      <div class="g-empty" data-empty hidden>
        <b>Break ground</b>
        <span>Tap any plot to place your first building.<br />Lessons earn the bricks.</span>
      </div>
      <div class="g-banner" data-banner data-nopan hidden></div>
      <div class="g-controls" data-controls>
        <button type="button" data-zoom-in aria-label="Zoom in" title="Zoom in">＋</button>
        <button type="button" data-zoom-out aria-label="Zoom out" title="Zoom out">−</button>
        <button type="button" data-rotate aria-label="Rotate 90 degrees" title="Rotate 90°">${ui.icon('refresh', 17)}</button>
        <button type="button" data-reset aria-label="Reset view" title="Reset view">${ui.icon('target', 17)}</button>
      </div>
      <div class="g-legend" data-legend><span>Drag to pan</span><i></i><span>Pinch / scroll to zoom</span></div>
    </div>
    ${bottomHTML(info)}
    <div class="g-sheet" data-sheet hidden></div>
    <div class="g-menu" data-menu data-nopan hidden></div>
    <div class="g-modal-layer" data-modal hidden></div>
    <div class="g-toasts" data-toasts aria-live="polite"></div>
  </section>`;
}

export default {
  id: 'game',
  title: 'Seoul Works',
  nav: null,
  hideNav: true,

  render() {
    ensureStyles();
    city.ensureCity();
    const info = city.info();
    const s = info.stats || {};
    return shellHTML(info, s);
  },

  mount(host) {
    ensureStyles();
    if (active) active.destroy();
    city.ensureCity();
    try {
      city.sync();
    } catch {
      /* achievements are a nicety */
    }

    const screen = host.querySelector('.g-screen') || host;
    const stage = screen.querySelector('[data-stage]');
    const cameraEl = screen.querySelector('[data-camera]');
    const world = screen.querySelector('[data-world]');
    const cityEl = screen.querySelector('[data-city]');
    const hoverEl = screen.querySelector('[data-hover]');
    const ghostEl = screen.querySelector('[data-ghost]');
    const emptyEl = screen.querySelector('[data-empty]');
    const bannerEl = screen.querySelector('[data-banner]');
    const sheetEl = screen.querySelector('[data-sheet]');
    const menuEl = screen.querySelector('[data-menu]');
    const modalEl = screen.querySelector('[data-modal]');
    const toastEl = screen.querySelector('[data-toasts]');
    const transitBtn = screen.querySelector('[data-transit]');
    const menuBtn = screen.querySelector('[data-menu-btn]');
    const ac = new AbortController();
    const signal = ac.signal;

    let data = snapshot();
    let catalog = [];
    let meta = cats();
    let trayOpen = false;
    let trayCat = 'all';
    let armedType = null;
    let focusPoint = null;
    let hoverPoint = null;
    let hoverElKey = '';
    let selectedId = null;
    let overlayMode = false;
    let ghostType = '';
    let modalConfirm = null;
    let seenAch = new Set(data.c.achievements || []);
    const modelCache = new Map();

    function cachedModel(type, w, h, level, era) {
      const key = `${type}:${w}x${h}:${level}:${era}`;
      if (!modelCache.has(key)) modelCache.set(key, modelHTML(type, { w, h, level, era }));
      return modelCache.get(key);
    }

    function worldPoints() {
      const T = TILE;
      const S = data.grid * T;
      const x0 = -S / 2 - 16;
      const y0 = -S / 2 - 16;
      const x1 = S / 2 + 16;
      const y1 = S / 2 + 16;
      const pts = [];
      for (const x of [x0, x1]) {
        for (const y of [y0, y1]) {
          pts.push([x, y, 0]);
          pts.push([x, y, -14]);
        }
      }
      for (const b of data.buildings) {
        const { w, h } = footprint(b);
        const X = (b.x - data.grid / 2) * T + (w * T) / 2;
        const Y = (b.y - data.grid / 2) * T + (h * T) / 2;
        pts.push([X, Y, 0.9 + peakOf(b.type, b.level)]);
      }
      return pts;
    }

    function maxHeight() {
      let h = TILE * 3;
      for (const b of data.buildings) h = Math.max(h, heightOf(b.type, b.level));
      return h;
    }

    const cam = createCamera({
      stage,
      cameraEl,
      getGrid: () => data.grid,
      getMaxHeight: maxHeight,
      getWorldPoints: worldPoints,
    });

    /* ---------------------------------------------------------------- paint */

    function setHud(name, value) {
      screen.querySelectorAll(`[data-hud="${name}"]`).forEach((el) => {
        el.textContent = value;
      });
    }

    function paintHud() {
      const info = city.info();
      const s = info.stats || {};
      const era = info.eraInfo?.name || `Era ${info.era}`;
      const happy = Math.round(Number(s.happiness) || 0);
      setHud('coins', hudFmt(state.coins));
      setHud('income', incomeFmt(info.income));
      setHud('pop', int(s.population));
      setHud('happy', String(happy));
      setHud('era', `Era ${info.era}`);
      setHud('era-name', ` · ${era.replace(/ Era$/, '')}`);
      setHud('tier', s.tier?.name || info.tier?.name || 'Village');
      setHud('grid', `${info.grid}×${info.grid}`);
      const used = info.buildings.reduce((a, b) => {
        const { w, h } = footprint(b);
        return a + w * h;
      }, 0);
      setHud('tiles', `${used}/${info.grid * info.grid} tiles`);
      const transit = Math.round(clamp(Number(s.transitCoverage) || 0, 0, 1) * 100);
      setHud('transit', `${transit}%`);
      for (const k of C.MATERIAL_KEYS) setHud(`mat-${k}`, hudFmt(info.resources?.[k] || 0));
      const vitals = screen.querySelector('.g-vitals');
      if (vitals) vitals.dataset.tone = HAPPY_TONE(happy);
      transitBtn?.setAttribute('aria-pressed', String(overlayMode));
      transitBtn?.classList.toggle('is-on', overlayMode);
      screen.dataset.era = String(info.era);
      screen.classList.toggle('is-overlay', overlayMode);
    }

    function updateEmpty() {
      if (!emptyEl) return;
      emptyEl.hidden = data.buildings.length > 0 || trayOpen || !!selectedId || !!armedType;
    }

    function tileLabel(b) {
      const d = b ? C.def(b.type) : null;
      if (d) return `${d.name} level ${b.level}`;
      return 'Empty plot';
    }

    function sceneHTML() {
      const { grid, ownerMap, cov } = data;
      const c = data.c;
      const T = TILE;
      const S = grid * T;
      const x0 = -S / 2 - 16;
      const y0 = -S / 2 - 16;
      const x1 = S / 2 + 16;
      const y1 = S / 2 + 16;
      // A base skirt with a four-strip rim. A single big top face under the
      // tiles loses the CSS-3D painter's-algorithm race and hides half the
      // grid, so the tiles themselves are the surface and the rim only fills
      // the 16 px border.
      let out = [
        front({ x: x0, y: y1, z: -14, w: x1 - x0, h: 14, cls: 'g-mat-earth' }),
        back({ x: x0, y: y0, z: -14, w: x1 - x0, h: 14, cls: 'g-mat-earth2' }),
        side({ x: x1, y: y0, z: -14, d: y1 - y0, h: 14, cls: 'g-mat-earth2' }),
        west({ x: x0, y: y0, z: -14, d: y1 - y0, h: 14, cls: 'g-mat-earth' }),
        flat({ x: x0, y: y0, z: 0, w: x1 - x0, d: 16, cls: 'g-mat-ground' }),
        flat({ x: x0, y: y1 - 16, z: 0, w: x1 - x0, d: 16, cls: 'g-mat-ground' }),
        flat({ x: x0, y: y0 + 16, z: 0, w: 16, d: y1 - y0 - 32, cls: 'g-mat-ground' }),
        flat({ x: x1 - 16, y: y0 + 16, z: 0, w: 16, d: y1 - y0 - 32, cls: 'g-mat-ground' }),
      ].join('');
      // Ground picking surface: one button per tile, always under the volumes.
      for (let y = 0; y < grid; y++) {
        for (let x = 0; x < grid; x++) {
          const key = `${x},${y}`;
          const owner = ownerMap.get(key);
          const X = (x - grid / 2) * T;
          const Y = (y - grid / 2) * T;
          const cls = `g-tile${(x + y) % 2 ? ' is-alt' : ''}${cov.has(key) ? ' is-cov' : ''}`;
          out += `<button class="${cls}" type="button" tabindex="-1" data-tile="${x},${y}"${
            owner ? ` data-owner="${ui.esc(owner.id)}"` : ''
          } style="width:${T}px;height:${T}px;transform:translate3d(${X}px,${Y}px,0.5px)" aria-label="${ui.esc(
            owner ? tileLabel(owner) : `Empty plot ${x + 1}, ${y + 1}`
          )}"></button>`;
        }
      }
      // Volumes. pointer-events:none in CSS — taps fall through to the tiles.
      for (const b of data.buildings) {
        const { w, h } = footprint(b);
        const d = C.def(b.type) || { category: city.categoryOf(b.type) };
        const cat = categoryOf(b.type, d);
        const X = (b.x - grid / 2) * T;
        const Y = (b.y - grid / 2) * T;
        const dim = overlayMode && cat !== 'transit';
        const W = w * T;
        const D = h * T;
        const model = cachedModel(b.type, w, h, b.level, c.era);
        out += `<div class="g-bld g-bld--${b.type} cat-${cat}${dim ? ' is-dim' : ''}${
          selectedId === b.id ? ' is-selected' : ''
        }" data-bld="${ui.esc(b.id)}" aria-hidden="true" style="transform:translate3d(${X}px,${Y}px,0.9px)">
          ${flat({ x: 3, y: 3, z: 0.05, w: W + 5, d: D + 5, cls: 'g-shadow' })}
          ${model}
          ${selectedId === b.id ? flat({ x: -2, y: -2, z: 0.86, w: W + 4, d: D + 4, cls: 'g-sel' }) : ''}
        </div>`;
      }
      return out;
    }

    function renderScene() {
      data = snapshot();
      const era = data.c.era || 1;
      world.className = `g-world era-${era}`;
      cityEl.innerHTML = sceneHTML();
      if (selectedId && !data.buildings.some((b) => b.id === selectedId)) selectedId = null;
      paintHud();
      updateEmpty();
      updateGhost();
      hideHover();
    }

    /* --------------------------------------------------------------- picking */

    function anchorFor(type, point) {
      const { w, h } = city.sizeOf(type);
      const grid = data.grid;
      const x = clamp(Math.round(point.x) - Math.floor((w - 1) / 2), 0, Math.max(0, grid - w));
      const y = clamp(Math.round(point.y) - Math.floor((h - 1) / 2), 0, Math.max(0, grid - h));
      return { x, y, w, h };
    }

    function canPlaceAt(type, x, y) {
      const { w, h } = city.sizeOf(type);
      const grid = data.grid;
      if (x < 0 || y < 0 || x + w > grid || y + h > grid) return { ok: false, why: `Needs ${w}×${h} inside the map` };
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          if (data.ownerMap.has(`${x + dx},${y + dy}`)) return { ok: false, why: 'That plot is taken' };
        }
      }
      return { ok: true };
    }

    function hideHover() {
      if (hoverEl) hoverEl.hidden = true;
      hoverElKey = '';
    }

    function updateHover(tile) {
      if (!hoverEl) return;
      if (!tile || armedType) {
        hideHover();
        return;
      }
      const owner = data.ownerMap.get(`${tile.x},${tile.y}`);
      const { w, h } = owner ? footprint(owner) : { w: 1, h: 1 };
      const ox = owner ? Math.round(owner.x) : tile.x;
      const oy = owner ? Math.round(owner.y) : tile.y;
      const key = `${ox},${oy},${w},${h},${owner ? 1 : 0}`;
      if (hoverElKey !== key) {
        hoverElKey = key;
        hoverEl.style.width = `${w * TILE + 4}px`;
        hoverEl.style.height = `${h * TILE + 4}px`;
        hoverEl.classList.toggle('is-owner', !!owner);
      }
      const X = (ox - data.grid / 2) * TILE;
      const Y = (oy - data.grid / 2) * TILE;
      hoverEl.style.transform = `translate3d(${X - 2}px,${Y - 2}px,1.25px)`;
      hoverEl.hidden = false;
    }

    function ensureGhostModel(type) {
      if (ghostType === type || !ghostEl) return;
      ghostType = type;
      const { w, h } = city.sizeOf(type);
      const level = 1;
      const era = data.c.era || 1;
      ghostEl.innerHTML = `<div class="g-ghost-foot" style="width:${w * TILE}px;height:${h * TILE}px"></div>
        <div class="g-ghost-model">${cachedModel(type, w, h, level, era)}</div>`;
    }

    function updateGhost() {
      if (!ghostEl) return;
      if (!armedType) {
        ghostEl.hidden = true;
        return;
      }
      const point = hoverPoint || focusPoint;
      if (!point) {
        ghostEl.hidden = true;
        return;
      }
      ensureGhostModel(armedType);
      const origin = anchorFor(armedType, point);
      const fit = canPlaceAt(armedType, origin.x, origin.y);
      const X = (origin.x - data.grid / 2) * TILE;
      const Y = (origin.y - data.grid / 2) * TILE;
      ghostEl.style.transform = `translate3d(${X}px,${Y}px,1.05px)`;
      ghostEl.classList.toggle('is-bad', !fit.ok);
      ghostEl.hidden = false;
    }

    function onPointerMove(e) {
      if (!stage) return;
      if (cam.isDragging()) {
        hideHover();
        return;
      }
      const tileEl = e.target.closest?.('[data-tile]');
      if (!tileEl) {
        hoverPoint = null;
        hideHover();
        updateGhost();
        return;
      }
      const [x, y] = tileEl.dataset.tile.split(',').map(Number);
      const tile = { x, y };
      if (armedType) {
        hoverPoint = tile;
        focusPoint = tile;
        updateGhost();
        updateBanner();
        hideHover();
      } else {
        hoverPoint = null;
        updateHover(tile);
      }
    }

    function onStageLeave() {
      hoverPoint = null;
      hideHover();
      updateGhost();
    }

    /* ---------------------------------------------------------------- toasts */

    function toast(message, tone = 'ink', icon = 'sparkle') {
      if (!toastEl) return;
      const el = document.createElement('div');
      el.className = `g-toast g-toast--${tone}`;
      el.innerHTML = `${ui.icon(icon, 15)}<span>${ui.esc(message)}</span>`;
      while (toastEl.children.length >= 3) toastEl.firstElementChild?.remove();
      toastEl.appendChild(el);
      setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(-6px)';
        setTimeout(() => el.remove(), 220);
      }, 2500);
    }

    function celebrate(list = []) {
      const rows = (list || []).filter(Boolean);
      if (!rows.length) return;
      toast(rows.length === 1 ? `Achievement: ${rows[0].name}` : `${rows.length} achievements earned`, 'amber', 'trophy');
    }

    function burst() {
      if (document.body.classList.contains('reduce-motion')) return;
      if (!screen) return;
      const layer = document.createElement('div');
      layer.className = 'g-confetti';
      for (let i = 0; i < 22; i++) {
        const p = document.createElement('i');
        p.style.left = `${35 + Math.random() * 30}%`;
        p.style.top = `${30 + Math.random() * 12}%`;
        p.style.setProperty('--dx', `${(Math.random() - 0.5) * 220}px`);
        p.style.background = ['#FF6B4A', '#7BE0C3', '#FFD166', '#4A3FA8', '#FFAE97'][i % 5];
        p.style.animationDelay = `${Math.random() * 160}ms`;
        layer.appendChild(p);
      }
      screen.appendChild(layer);
      setTimeout(() => layer.remove(), 1900);
    }

    /* ----------------------------------------------------------------- sheet */

    function showSheet(html) {
      if (!sheetEl) return;
      sheetEl.innerHTML = html;
      sheetEl.classList.toggle('g-sheet--ins', !!sheetEl.querySelector('.g-ins'));
      sheetEl.hidden = false;
      screen.classList.add('has-sheet');
      updateEmpty();
    }

    function closeSheet({ disarm = true } = {}) {
      if (sheetEl) {
        sheetEl.hidden = true;
        sheetEl.innerHTML = '';
        sheetEl.classList.remove('g-sheet--ins');
      }
      screen.classList.remove('has-sheet');
      trayOpen = false;
      if (disarm) {
        armedType = null;
        focusPoint = null;
        hoverPoint = null;
        ghostType = '';
        updateGhost();
        updateBanner();
      }
      selectedId = null;
      cityEl?.querySelectorAll('.g-bld.is-selected').forEach((el) => {
        el.classList.remove('is-selected');
        el.querySelectorAll('.g-sel').forEach((n) => n.remove());
      });
      updateEmpty();
    }

    function minimizeTray() {
      if (sheetEl) {
        sheetEl.hidden = true;
        sheetEl.innerHTML = '';
        sheetEl.classList.remove('g-sheet--ins');
      }
      screen.classList.remove('has-sheet');
      trayOpen = false;
      hideHover();
      updateBanner();
      updateGhost();
      updateEmpty();
    }

    function costHTML(cost, limit = 4) {
      const bits = [];
      if (cost.coins) bits.push(`<span class="g-cst g-cst--coin">${ui.coin(11)}${fmt(cost.coins)}</span>`);
      if (cost.gems) bits.push(`<span class="g-cst g-cst--gem">${ui.gem(11)}${fmt(cost.gems)}</span>`);
      for (const k of C.MATERIAL_KEYS) {
        if (cost[k]) bits.push(`<span class="g-cst"><em>${mat(k).emoji}</em>${fmt(cost[k])}</span>`);
      }
      return bits.slice(0, limit).join('');
    }

    function missingText(type) {
      let missing = {};
      try {
        missing = city.missingFor(type) || {};
      } catch {
        missing = {};
      }
      const bits = [];
      if (missing.coins) bits.push(`₩${fmt(missing.coins)}`);
      for (const k of C.MATERIAL_KEYS) if (missing[k]) bits.push(`${mat(k).emoji} ${fmt(missing[k])}`);
      return bits.join(' · ');
    }

    function cardMeta(d) {
      const bits = [`<span class="g-bm g-bm--size">${d.size.w}×${d.size.h}</span>`];
      if (d.pop) bits.push(`<span class="g-bm">${int(d.pop)} pop</span>`);
      if (d.jobs) bits.push(`<span class="g-bm">${int(d.jobs)} jobs</span>`);
      if (d.income) bits.push(`<span class="g-bm g-bm--good">₩${rate(d.income)}/s</span>`);
      if (d.coverage) bits.push(`<span class="g-bm">cov ${d.coverage}</span>`);
      if (d.global) bits.push(`<span class="g-bm g-bm--good">+${Math.round(d.global * 100)}%</span>`);
      return bits.join('');
    }

    function trayHTML() {
      if (!catalog.length) catalog = city.catalog();
      const counts = {};
      for (const d of catalog) counts[d.category] = (counts[d.category] || 0) + 1;
      const chips = [{ id: 'all', label: 'All', count: catalog.length }, ...CAT_ORDER.map((id) => ({ ...meta[id], id, count: counts[id] || 0 }))]
        .map(
          (c) =>
            `<button class="g-cat${trayCat === c.id ? ' is-on' : ''}" data-cat="${c.id}" type="button" aria-pressed="${
              trayCat === c.id
            }"><i class="g-cat-dot cat-${c.id}"></i>${ui.esc(c.label)}${c.ko ? `<em>${ui.esc(c.ko)}</em>` : ''}<b>${c.count}</b></button>`
        )
        .join('');
      const list = catalog
        .filter((d) => trayCat === 'all' || d.category === trayCat)
        .sort((a, b) => {
          if (!!a.unlocked !== !!b.unlocked) return a.unlocked ? -1 : 1;
          return (a.cost?.coins || 0) - (b.cost?.coins || 0);
        });
      const cards = list
        .map((d) => {
          let afford = true;
          try {
            afford = city.canAffordType(d.id) !== false;
          } catch {
            afford = !!d.affordable;
          }
          const locked = d.unlocked === false;
          const missing = !locked && !afford ? missingText(d.id) : '';
          const armed = armedType === d.id;
          return `<button class="g-card cat-${d.category}${locked ? ' is-locked' : ''}${!afford ? ' is-poor' : ''}${
            armed ? ' is-armed' : ''
          }" data-build="${ui.esc(d.id)}" type="button" aria-disabled="${locked || !afford ? 'true' : 'false'}">
            <span class="g-card-head"><b>${ui.esc(d.name)}</b><em>${ui.esc(d.ko || '')}</em></span>
            <span class="g-card-meta">${cardMeta(d)}</span>
            <span class="g-card-cost">${costHTML(d.cost || {}, 6)}</span>
            ${
              locked
                ? `<span class="g-card-lock">${ui.icon('lock', 11)} ${ui.esc(d.lockReason || 'Locked')}</span>`
                : missing
                  ? `<span class="g-card-lock g-card-lock--need">Need ${ui.esc(missing)}</span>`
                  : `<span class="g-card-go">${armed ? 'Tap a free plot' : 'Select'}</span>`
            }
          </button>`;
        })
        .join('');
      const place = armedType && focusPoint ? anchorFor(armedType, focusPoint) : null;
      const fit = place ? canPlaceAt(armedType, place.x, place.y) : null;
      return `<div class="g-sheet-head">
          <div class="g-sheet-title">
            <span class="g-kicker">${armedType ? 'Placing' : 'Build'}</span>
            <h2>${armedType ? ui.esc(C.def(armedType)?.name || armedType) : 'What goes here?'}</h2>
            <span class="g-sheet-sub">${
              armedType
                ? `${city.sizeOf(armedType).w}×${city.sizeOf(armedType).h} · tap a free plot`
                : focusPoint
                  ? `Plot ${focusPoint.x + 1}, ${focusPoint.y + 1}`
                  : 'Pick a building, then tap a plot'
            }</span>
          </div>
          <button class="g-sheet-x" data-sheet-close type="button" aria-label="Close build tray">${ui.icon('close', 18)}</button>
        </div>
        <div class="g-cats" role="tablist" aria-label="Building categories">${chips}</div>
        <div class="g-cards">${cards || '<p class="g-none">Nothing in this category yet.</p>'}</div>
        <div class="g-sheet-foot">
          <span class="g-sheet-hint">${armedType ? (fit?.ok ? 'Ghost is green — tap the plot or place here.' : ui.esc(fit?.why || 'Tap a free plot')) : `${catalog.length} blueprints · study to earn materials`}</span>
          <div class="g-sheet-actions">
            ${armedType ? `<button class="g-btn g-btn--ghost" data-placing-cancel type="button">Cancel</button>` : ''}
            <button class="g-btn g-btn--primary" data-sheet-done type="button">${armedType ? (fit?.ok ? 'Place here' : 'Pick plot') : 'Done'}</button>
          </div>
        </div>`;
    }

    function renderTray() {
      trayOpen = true;
      const prevCards = sheetEl?.querySelector('.g-cards')?.scrollLeft || 0;
      const prevCats = sheetEl?.querySelector('.g-cats')?.scrollLeft || 0;
      showSheet(trayHTML());
      const cards = sheetEl?.querySelector('.g-cards');
      const cats = sheetEl?.querySelector('.g-cats');
      if (cards) cards.scrollLeft = prevCards;
      if (cats) cats.scrollLeft = prevCats;
      // Keep the armed blueprint and its category visible after the re-render.
      const center = (wrap, el) => {
        if (!wrap || !el) return;
        wrap.scrollLeft = Math.max(0, el.offsetLeft - (wrap.offsetLeft || 0) - wrap.clientWidth / 2 + el.clientWidth / 2);
      };
      if (armedType) center(cards, cards?.querySelector(`[data-build="${armedType}"]`));
      center(cats, cats?.querySelector(`[data-cat="${trayCat}"]`));
      updateBanner();
      updateEmpty();
    }

    function updateBanner() {
      if (!bannerEl) return;
      if (!armedType) {
        bannerEl.hidden = true;
        bannerEl.innerHTML = '';
        return;
      }
      const d = C.def(armedType) || { name: armedType, ko: '' };
      const { w, h } = city.sizeOf(armedType);
      const origin = focusPoint ? anchorFor(armedType, focusPoint) : null;
      const fit = origin ? canPlaceAt(armedType, origin.x, origin.y) : null;
      bannerEl.hidden = false;
      bannerEl.innerHTML = `<span class="g-banner-kick">Placing</span>
        <b>${ui.esc(d.name)}</b><span class="g-banner-size">${w}×${h}</span>
        <span class="g-banner-hint">${focusPoint ? (fit?.ok ? 'tap a plot' : ui.esc(fit?.why || 'pick a free plot')) : 'tap a free plot'}</span>
        <span class="g-banner-actions">
          <button class="g-btn g-btn--primary g-btn--sm" data-place type="button" ${fit?.ok ? '' : 'disabled'}>Place here</button>
          <button class="g-btn g-btn--ghost g-btn--sm" data-placing-cancel type="button">Cancel</button>
        </span>`;
    }

    function openBuild(tile) {
      closeModal();
      closeMenu();
      if (tile) focusPoint = { x: tile.x, y: tile.y };
      const hadSelection = !!selectedId;
      selectedId = null;
      if (hadSelection) renderScene();
      hoverPoint = null;
      if (!catalog.length) catalog = city.catalog();
      if (!trayOpen) trayCat = 'all';
      renderTray();
      updateGhost();
      updateHover(tile);
    }

    function disarm() {
      armedType = null;
      hoverPoint = null;
      ghostType = '';
      updateGhost();
      updateBanner();
      if (trayOpen) renderTray();
    }

    function tryPlace(type, point) {
      if (!point) {
        toast('Tap a free plot first', 'amber', 'info');
        return false;
      }
      const origin = anchorFor(type, point);
      const fit = canPlaceAt(type, origin.x, origin.y);
      if (!fit.ok) {
        toast(fit.why, 'amber', 'info');
        updateBanner();
        updateGhost();
        return false;
      }
      const d = C.def(type) || { name: type };
      const res = city.place(type, origin.x, origin.y);
      if (!res.ok) {
        toast(res.reason || 'Cannot build there', 'amber', 'info');
        return false;
      }
      audio.sfx('stamp');
      focusPoint = null;
      hoverPoint = null;
      catalog = city.catalog();
      if (d.unique) armedType = null;
      renderScene();
      if (trayOpen) renderTray();
      updateBanner();
      updateGhost();
      toast(`${d.name} built`, 'mint', 'check');
      celebrate(res.achievements);
      burst();
      return true;
    }

    /* ------------------------------------------------------------- inspector */

    function miniHTML(b) {
      const { w, h } = footprint(b);
      const W = w * TILE;
      const D = h * TILE;
      const hh = peakOf(b.type, b.level);
      const scale = Math.min(1.1, 88 / Math.max(W, D, hh * 1.02, 30));
      return `<div class="g-mini" aria-hidden="true">
        <div class="g-mini-stage"><div class="g-mini-cam" style="transform:scale3d(${scale.toFixed(3)},${scale.toFixed(3)},${scale.toFixed(3)}) rotateX(58deg) rotateZ(45deg) translate3d(${-W / 2}px,${-D / 2}px,0)">
          ${cachedModel(b.type, w, h, b.level, data.c.era || 1)}
        </div></div>
      </div>`;
    }

    function inspectorHTML(b) {
      const d = C.def(b.type) || { name: b.type, ko: '', category: city.categoryOf(b.type) };
      const cat = categoryOf(b.type, d);
      const cm = meta[cat] || CAT_FALLBACK.svc;
      const { w, h } = footprint(b);
      const s = data.info.stats || {};
      const inc = Number(city.incomeOf(b)) || 0;
      const scale = 1 + 0.2 * (Math.max(1, b.level) - 1);
      const residents = Math.round((Number(d.pop) || 0) * scale);
      const jobs = Math.round((Number(d.jobs) || 0) * scale);
      const maxLv = Number(C.MAX_LEVEL) || 10;
      const canUp = b.level < maxLv;
      const upCost = canUp ? C.upgradeCost(b) : {};
      let affordUp = false;
      try {
        affordUp =
          canUp &&
          (upCost.coins || 0) <= state.coins &&
          C.MATERIAL_KEYS.every((k) => (data.info.resources?.[k] || 0) >= (upCost[k] || 0));
      } catch {
        affordUp = false;
      }
      const sell = C.sellValue(b);
      const facts = [`<div><span>Footprint</span><b>${w}×${h}</b></div>`, `<div><span>Level</span><b>${b.level} / ${maxLv}</b></div>`];
      if (inc > 0) facts.push(`<div><span>Income</span><b>₩${rate(inc)}/s</b></div>`);
      if (residents) facts.push(`<div><span>Residents</span><b>${int(residents)}</b></div>`);
      if (jobs) facts.push(`<div><span>Jobs</span><b>${int(jobs)}</b></div>`);
      if (d.coverage) facts.push(`<div><span>Coverage</span><b>${d.coverage} tiles</b></div>`);
      if (d.pollution) facts.push(`<div><span>Pollution</span><b class="g-bad">+${d.pollution}</b></div>`);
      if (d.tourism) facts.push(`<div><span>Tourism</span><b>₩${rate(d.tourism)}/s</b></div>`);
      if (d.global) facts.push(`<div><span>City bonus</span><b class="g-good">+${Math.round(d.global * 100)}%</b></div>`);
      if (d.produce)
        facts.push(
          `<div><span>Produces</span><b>${Object.entries(d.produce)
            .map(([k, v]) => `${mat(k).emoji} ${v}/min`)
            .join(' ')}</b></div>`
        );
      const transit = Math.round(clamp(Number(s.transitCoverage) || 0, 0, 1) * 100);
      const services = Math.round(clamp(Number(s.serviceCoverage) || 0, 0, 1) * 100);
      return `<div class="g-sheet-head">
          <div class="g-sheet-title">
            <span class="g-kicker cat-${cat}"><i></i>${ui.esc(cm.label)}${cm.ko ? ` · ${ui.esc(cm.ko)}` : ''}</span>
            <h2>${ui.esc(d.name)} <em>${ui.esc(d.ko || '')}</em></h2>
            <span class="g-sheet-sub">${w}×${h} · level ${b.level}${w * h > 1 ? ` · ${w * h} tiles` : ''}</span>
          </div>
          <button class="g-sheet-x" data-sheet-close type="button" aria-label="Close inspector">${ui.icon('close', 18)}</button>
        </div>
        <div class="g-ins">
          ${miniHTML(b)}
          <div class="g-ins-side">
            <div class="g-facts">${facts.join('')}</div>
            <div class="g-cover">
              <span><i class="g-covbar"><b style="width:${transit}%"></b></i>Transit ${transit}%</span>
              <span><i class="g-covbar g-covbar--indigo"><b style="width:${services}%"></b></i>Services ${services}%</span>
            </div>
          </div>
        </div>
        ${
          canUp
            ? `<div class="g-up">
                <div class="g-up-head"><span>Upgrade to level ${b.level + 1}</span><span class="g-up-cost">${costHTML(upCost, 6)}</span></div>
                <button class="g-btn g-btn--primary g-btn--block" data-upgrade type="button" ${affordUp ? '' : 'disabled'}>${
                  affordUp
                    ? inc > 0
                      ? `Upgrade · +₩${rate(inc * 0.45)}/s`
                      : `Upgrade to level ${b.level + 1}`
                    : `Need ${ui.esc(missingText(b.type) || 'more materials')}`
                }</button>
              </div>`
            : `<p class="g-maxed">Maximum level — this one is finished.</p>`
        }
        <div class="g-ins-actions">
          <button class="g-btn g-btn--ghost" data-sell type="button">Sell · ₩${fmt(sell.coins)}</button>
          <button class="g-btn g-btn--ghost" data-sheet-close type="button">Close</button>
        </div>
        ${d.desc ? `<p class="g-desc">${ui.esc(d.desc)}</p>` : ''}`;
    }

    function openInspector(id) {
      const b = city.byId(id);
      if (!b) return;
      if (armedType) {
        armedType = null;
        ghostType = '';
        updateGhost();
        updateBanner();
      }
      closeModal();
      closeMenu();
      trayOpen = false;
      selectedId = id;
      focusPoint = null;
      hoverPoint = null;
      renderScene();
      hideHover();
      showSheet(inspectorHTML(b));
      audio.sfx('tap');
    }

    /* ------------------------------------------------------------------ menu */

    function menuHTML() {
      const info = data.info;
      const s = info.stats || {};
      const earned = city.achievements().filter((a) => a.earned).length;
      const total = city.achievements().length;
      const expand = info.expandCost || {};
      const pct = Math.min(100, Math.round((info.lifetimeWon / Math.max(1, info.prestigeTarget)) * 100));
      return `<div class="g-menu-head"><b>Seoul Works</b><span>${info.grid}×${info.grid} · ${int(s.population)} residents</span></div>
        <button class="g-menu-row" data-menu-action="ach" type="button">${ui.icon('trophy', 17)}<span><b>Achievements</b><em>${earned} / ${total} earned</em></span>${ui.icon('chevron', 15)}</button>
        <button class="g-menu-row" data-menu-action="expand" type="button" ${info.canExpand ? '' : 'disabled'}>${ui.icon('plus', 17)}<span><b>Expand city</b><em>${
          info.canExpand ? `${info.grid + 1}×${info.grid + 1} · ₩${fmt(expand.coins)} · ${expand.brick} brick · ${expand.steel} steel` : 'Maximum size reached'
        }</em></span>${ui.icon('chevron', 15)}</button>
        <button class="g-menu-row" data-menu-action="prestige" type="button">${ui.icon('crown', 17)}<span><b>Prestige · Era ${info.era + 1}</b><em>${info.era >= 4 ? 'Final era' : info.prestigeReady ? 'Ready now' : `${pct}% of ₩${fmt(info.prestigeTarget)}`}</em></span>${
        info.prestigeReady && info.era < 4 ? '<i class="g-ready-dot"></i>' : ui.icon('chevron', 15)
      }</button>
        <button class="g-menu-row" data-menu-action="overlay" type="button" aria-pressed="${overlayMode}">${ui.icon('map', 17)}<span><b>Transit overlay</b><em>${overlayMode ? 'On' : 'Highlight covered tiles'}</em></span><i class="g-switch${overlayMode ? ' is-on' : ''}"></i></button>
        <button class="g-menu-row" data-menu-action="reset" type="button">${ui.icon('target', 17)}<span><b>Reset view</b><em>Centre, fit, 45°</em></span></button>
        <button class="g-menu-row" data-menu-action="list" type="button">${ui.icon('map', 17)}<span><b>2D overview</b><em>Plots, stats and achievements</em></span>${ui.icon('chevron', 15)}</button>`;
    }

    function openMenu() {
      if (!menuEl) return;
      data = snapshot();
      menuEl.innerHTML = menuHTML();
      menuEl.hidden = false;
      menuBtn?.setAttribute('aria-expanded', 'true');
      menuBtn?.classList.add('is-on');
    }
    function closeMenu() {
      if (menuEl) menuEl.hidden = true;
      menuBtn?.setAttribute('aria-expanded', 'false');
      menuBtn?.classList.remove('is-on');
    }
    function toggleMenu() {
      if (!menuEl) return;
      if (menuEl.hidden) openMenu();
      else closeMenu();
    }

    /* ----------------------------------------------------------------- modal */

    function closeModal() {
      if (modalEl) {
        modalEl.hidden = true;
        modalEl.innerHTML = '';
      }
      modalConfirm = null;
    }
    function showModal(inner, cls = '') {
      if (!modalEl) return;
      modalEl.hidden = false;
      modalEl.innerHTML = `<div class="g-modal-scrim" data-modal-close></div>
        <div class="g-modal ${cls}" role="dialog" aria-modal="true">
          <button class="g-sheet-x g-modal-x" data-modal-close type="button" aria-label="Close">${ui.icon('close', 18)}</button>
          ${inner}
        </div>`;
      modalEl.querySelectorAll('[data-modal-close]').forEach((el) => el.addEventListener('click', closeModal, { signal }));
    }
    function confirmModal({ title, body, confirmLabel, tone = 'primary', onConfirm }) {
      showModal(
        `<div class="g-modal-body">
          <span class="g-kicker">Confirm</span>
          <h2>${ui.esc(title)}</h2>
          <div class="g-modal-copy">${body}</div>
          <div class="g-modal-actions">
            <button class="g-btn g-btn--ghost" data-modal-close type="button">Not now</button>
            <button class="g-btn g-btn--${tone}" data-confirm type="button">${ui.esc(confirmLabel)}</button>
          </div>
        </div>`
      );
      modalConfirm = onConfirm;
      modalEl.querySelectorAll('[data-modal-close]').forEach((el) => el.addEventListener('click', closeModal, { signal }));
    }

    function openAchievements() {
      closeMenu();
      const list = city.achievements();
      const earned = list.filter((a) => a.earned).length;
      const pct = list.length ? (earned / list.length) * 100 : 0;
      showModal(
        `<div class="g-modal-body">
          <span class="g-kicker">City achievements</span>
          <h2>${earned} <em>/ ${list.length}</em></h2>
          <div class="g-achbar"><b style="width:${pct}%"></b></div>
          <div class="g-achlist">
            ${list
              .map(
                (a) => `<div class="g-ach${a.earned ? ' is-earned' : ''}">
                  <span class="g-ach-ico">${a.earned ? ui.icon('trophy', 15) : ui.icon('lock', 13)}</span>
                  <span class="g-ach-body"><b>${ui.esc(a.name)}</b><em>${ui.esc(a.desc)}</em></span>
                  <span class="g-ach-reward">${a.earned ? 'Earned' : costHTML(a.reward || {}, 3)}</span>
                </div>`
              )
              .join('')}
          </div>
        </div>`,
        'g-modal--tall'
      );
    }

    function openPrestige() {
      closeMenu();
      data = snapshot();
      const info = data.info;
      const s = info.stats || {};
      const finalEra = info.era >= 4;
      const pct = Math.min(100, Math.round((info.lifetimeWon / Math.max(1, info.prestigeTarget)) * 100));
      showModal(
        `<div class="g-modal-body">
          <span class="g-kicker">Era ${info.era} · ${ui.esc(info.eraInfo?.name || '')}</span>
          <h2>${finalEra ? 'The final era' : 'Start a new skyline?'}</h2>
          <p class="g-modal-copy">${
            finalEra
              ? 'You have built the future. Keep scaling this city, or start a fresh save for another run.'
              : 'Prestige resets buildings, materials and Won, but keeps every A1 badge, achievement and cosmetic — and grants a permanent +50% income for the next era.'
          }</p>
          <div class="g-prestige-facts">
            <span><em>Tier</em><b>${ui.esc(s.tier?.name || 'Village')}</b></span>
            <span><em>Residents</em><b>${int(s.population)}</b></span>
            <span><em>Era bonus</em><b>+${Math.round((1 + 0.5 * (info.era - 1)) * 100 - 100)}%</b></span>
          </div>
          ${
            finalEra
              ? ''
              : `<div class="g-prestige-track"><b style="width:${pct}%"></b><span>${pct}% of ₩${fmt(info.prestigeTarget)} generated</span></div>
                 <button class="g-btn g-btn--primary g-btn--block" data-prestige-go type="button" ${
                   info.prestigeReady ? '' : 'disabled'
                 }>${info.prestigeReady ? `Begin Era ${info.era + 1}` : 'Not ready yet'}</button>`
          }
        </div>`,
        'g-modal--prestige'
      );
      modalEl.querySelector('[data-prestige-go]')?.addEventListener(
        'click',
        () => {
          closeModal();
          confirmModal({
            title: `Begin Era ${info.era + 1}?`,
            body: `<p>Your ${int(s.population)} residents will rebuild from scratch. Badges, achievements and cosmetics stay.</p>`,
            confirmLabel: `Rebuild in Era ${info.era + 1}`,
            onConfirm: () => {
              const res = city.prestigeNow();
              if (!res) {
                toast('Prestige is not ready', 'amber', 'info');
                return;
              }
              selectedId = null;
              armedType = null;
              focusPoint = null;
              ghostType = '';
              catalog = city.catalog();
              renderScene();
              cam.fit({ reset: true });
              toast(`Era ${res.era}: ${C.eraInfo(res.era).name}`, 'amber', 'crown');
              burst();
            },
          });
        },
        { signal }
      );
    }

    function openExpand() {
      closeMenu();
      data = snapshot();
      const info = data.info;
      if (!info.canExpand) {
        toast('Maximum grid size reached', 'amber', 'info');
        return;
      }
      const cost = info.expandCost || {};
      confirmModal({
        title: `Expand to ${info.grid + 1}×${info.grid + 1}?`,
        body: `<p>${(info.grid + 1) ** 2 - info.grid ** 2} new plots open around your city.</p>
          <div class="g-cost-row">${costHTML(cost, 6)}</div>`,
        confirmLabel: 'Expand',
        onConfirm: () => {
          const res = city.expand();
          if (!res.ok) {
            toast(res.reason || 'Cannot expand', 'amber', 'info');
            return;
          }
          catalog = city.catalog();
          selectedId = null;
          focusPoint = null;
          armedType = null;
          ghostType = '';
          renderScene();
          cam.fit({ reset: true });
          toast(`Grid expanded to ${res.grid}×${res.grid}`, 'mint', 'sparkle');
          burst();
          celebrate(res.achievements);
        },
      });
    }

    /* ---------------------------------------------------------------- actions */

    function upgradeSelected(id) {
      const res = city.upgrade(id);
      if (!res.ok) {
        toast(res.reason || 'Cannot upgrade', 'amber', 'info');
        return;
      }
      audio.sfx('levelup');
      catalog = city.catalog();
      renderScene();
      const b = city.byId(id);
      if (b) {
        showSheet(inspectorHTML(b));
        selectedId = id;
      }
      toast(`${C.def(res.building.type)?.name || 'Building'} → level ${res.building.level}`, 'mint', 'sparkle');
      celebrate(res.achievements);
    }

    function sellSelected(id) {
      const b = city.byId(id);
      if (!b) return;
      const d = C.def(b.type) || { name: b.type };
      const value = C.sellValue(b);
      confirmModal({
        title: `Sell ${d.name}?`,
        body: `<p>You get ${ui.coin(12)} <b>₩${fmt(value.coins)}</b> and 30% of the materials back. Its ${footprint(b).w * footprint(b).h} plots reopen.</p>`,
        confirmLabel: 'Sell it',
        tone: 'danger',
        onConfirm: () => {
          const res = city.sell(id);
          if (!res.ok) {
            toast(res.reason || 'Cannot sell', 'amber', 'info');
            return;
          }
          selectedId = null;
          catalog = city.catalog();
          closeSheet();
          renderScene();
          audio.sfx('coin');
          toast(`Sold ${d.name} for ₩${fmt(res.refund.coins)}`, 'mint', 'coin');
        },
      });
    }

    function toggleOverlay() {
      overlayMode = !overlayMode;
      closeMenu();
      renderScene();
      const s = data.info.stats || {};
      const pct = Math.round(clamp(Number(s.transitCoverage) || 0, 0, 1) * 100);
      if (overlayMode && pct === 0) toast('No transit coverage yet — build a bus stop', 'amber', 'info');
      else toast(overlayMode ? 'Transit overlay on' : 'Transit overlay off', 'ink', 'map');
    }

    /* ---------------------------------------------------------------- events */

    function onScreenClick(e) {
      if (e.target.closest('[data-study]')) {
        audio.sfx('tap');
        router.go('home');
        return;
      }
      if (e.target.closest('[data-list]')) {
        audio.sfx('tap');
        router.go('city');
        return;
      }
      if (e.target.closest('[data-menu-btn]')) {
        audio.sfx('tap');
        toggleMenu();
        return;
      }
      if (e.target.closest('[data-build-toggle]')) {
        audio.sfx('tap');
        if (trayOpen) closeSheet();
        else openBuild(focusPoint);
        return;
      }
      if (e.target.closest('[data-transit]')) {
        audio.sfx('tap');
        toggleOverlay();
        return;
      }
      if (e.target.closest('[data-zoom-in]')) {
        audio.sfx('tap');
        cam.zoomBy(1.18);
        return;
      }
      if (e.target.closest('[data-zoom-out]')) {
        audio.sfx('tap');
        cam.zoomBy(0.85);
        return;
      }
      if (e.target.closest('[data-rotate]')) {
        audio.sfx('tap');
        cam.rotate();
        return;
      }
      if (e.target.closest('[data-reset]')) {
        audio.sfx('tap');
        cam.reset();
        return;
      }
      const action = e.target.closest('[data-menu-action]')?.dataset.menuAction;
      if (action) {
        audio.sfx('tap');
        if (action === 'ach') openAchievements();
        else if (action === 'expand') openExpand();
        else if (action === 'prestige') openPrestige();
        else if (action === 'overlay') toggleOverlay();
        else if (action === 'reset') {
          closeMenu();
          cam.reset();
          toast('View reset', 'ink', 'target');
        } else if (action === 'list') router.go('city');
        return;
      }
      if (e.target.closest('[data-place]')) {
        if (!armedType || !focusPoint) return;
        tryPlace(armedType, focusPoint);
        return;
      }
      if (e.target.closest('[data-placing-cancel]')) {
        audio.sfx('tap');
        disarm();
        return;
      }
      if (!e.target.closest('[data-menu]')) closeMenu();
    }

    function onSheetClick(e) {
      e.stopPropagation();
      const cat = e.target.closest('[data-cat]');
      if (cat) {
        trayCat = cat.dataset.cat;
        renderTray();
        return;
      }
      if (e.target.closest('[data-sheet-close]') || e.target.closest('[data-sheet-done]')) {
        if (armedType) {
          const done = e.target.closest('[data-sheet-done]');
          if (done) {
            const origin = focusPoint ? anchorFor(armedType, focusPoint) : null;
            const fit = origin ? canPlaceAt(armedType, origin.x, origin.y) : null;
            if (fit?.ok) {
              tryPlace(armedType, focusPoint);
              return;
            }
            minimizeTray();
            toast(`Tap a free plot to place the ${C.def(armedType)?.name || 'building'}`, 'ink', 'info');
            return;
          }
          minimizeTray();
          return;
        }
        closeSheet();
        return;
      }
      if (e.target.closest('[data-placing-cancel]')) {
        disarm();
        return;
      }
      const row = e.target.closest('[data-build]');
      if (row) {
        const type = row.dataset.build;
        const d = catalog.find((x) => x.id === type);
        if (!d) return;
        if (d.unlocked === false) {
          toast(d.lockReason || 'Locked', 'amber', 'lock');
          return;
        }
        let afford = true;
        try {
          afford = city.canAffordType(type) !== false;
        } catch {
          afford = !!d.affordable;
        }
        if (!afford) {
          toast(`Missing ${missingText(type) || 'materials'}`, 'amber', 'info');
          return;
        }
        armedType = type;
        ghostType = '';
        hoverPoint = null;
        updateGhost();
        updateBanner();
        renderTray();
        audio.sfx('tap');
        return;
      }
      if (e.target.closest('[data-upgrade]')) {
        if (selectedId) upgradeSelected(selectedId);
        return;
      }
      if (e.target.closest('[data-sell]')) {
        if (selectedId) sellSelected(selectedId);
      }
    }

    function onModalClick(e) {
      e.stopPropagation();
      if (e.target.closest('[data-modal-close]')) {
        closeModal();
        return;
      }
      if (e.target.closest('[data-confirm]')) {
        const fn = modalConfirm;
        closeModal();
        fn?.();
      }
    }

    function onTileClick(e) {
      if (cam.consumeDrag()) return;
      const tileEl = e.target.closest('[data-tile]');
      if (!tileEl) {
        closeMenu();
        return;
      }
      const [x, y] = tileEl.dataset.tile.split(',').map(Number);
      const ownerId = tileEl.dataset.owner;
      if (ownerId) {
        if (overlayMode) {
          /* inspection still wins over the overlay */
        }
        armedType = null;
        ghostType = '';
        updateGhost();
        updateBanner();
        openInspector(ownerId);
        return;
      }
      closeMenu();
      if (armedType) {
        focusPoint = { x, y };
        hoverPoint = null;
        updateBanner();
        updateGhost();
        tryPlace(armedType, focusPoint);
        return;
      }
      audio.sfx('tap');
      openBuild({ x, y });
    }

    function onStageClick(e) {
      // Let a click that started on a volume but landed on a tile still work.
      if (e.target.closest('.g-controls, .g-banner, .g-empty')) return;
      onTileClick(e);
    }

    function onKey(e) {
      if (e.key === 'Escape') {
        if (modalEl && !modalEl.hidden) {
          closeModal();
          return;
        }
        if (menuEl && !menuEl.hidden) {
          closeMenu();
          return;
        }
        if (armedType) {
          disarm();
          return;
        }
        if (sheetEl && !sheetEl.hidden) {
          closeSheet();
          return;
        }
      }
      if (e.target.closest?.('input, textarea, select')) return;
      if (e.key === '+' || e.key === '=') cam.zoomBy(1.18);
      else if (e.key === '-') cam.zoomBy(0.85);
      else if (e.key.toLowerCase() === 'r') cam.rotate();
      else if (e.key === '0') cam.reset();
      else if (e.key === 'ArrowLeft') cam.panBy(44, 0);
      else if (e.key === 'ArrowRight') cam.panBy(-44, 0);
      else if (e.key === 'ArrowUp') cam.panBy(0, 44);
      else if (e.key === 'ArrowDown') cam.panBy(0, -44);
    }

    function onDocPointer(e) {
      if (!menuEl || menuEl.hidden) return;
      if (e.target.closest('[data-menu], [data-menu-btn]')) return;
      closeMenu();
    }

    stage.addEventListener('pointermove', onPointerMove, { signal });
    stage.addEventListener('pointerleave', onStageLeave, { signal });
    stage.addEventListener('click', onStageClick, { signal });
    screen.addEventListener('click', onScreenClick, { signal });
    sheetEl.addEventListener('click', onSheetClick, { signal });
    modalEl.addEventListener('click', onModalClick, { signal });
    window.addEventListener('keydown', onKey, { signal });
    document.addEventListener('pointerdown', onDocPointer, { signal });

    // The sweep tick keeps income/materials live without rebuilding the scene.
    const timer = setInterval(() => {
      try {
        city.tick();
      } catch {
        /* production is best-effort */
      }
      const fresh = city.achievements().filter((a) => a.earned && !seenAch.has(a.id));
      if (fresh.length) {
        fresh.forEach((a) => seenAch.add(a.id));
        celebrate(fresh);
      }
      paintHud();
      if (trayOpen) catalog = city.catalog();
    }, 5000);

    // Go.
    catalog = city.catalog();
    renderScene();
    cam.fit({ reset: true });
    if (!data.buildings.length) {
      setTimeout(() => toast('Tap a plot to build · lessons earn the bricks', 'ink', 'sparkle'), 600);
    }

    active = {
      destroy() {
        clearInterval(timer);
        ac.abort();
        cam.destroy();
        modalEl && (modalEl.hidden = true);
        sheetEl && (sheetEl.hidden = true);
        menuEl && (menuEl.hidden = true);
      },
    };
  },

  destroy() {
    if (active) {
      active.destroy();
      active = null;
    }
  },
};
