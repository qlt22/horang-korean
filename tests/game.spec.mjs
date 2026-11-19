// Seoul Works — 3D game mode QA suite (QA agent D).
//
// Covers the full-screen #/game route: the real CSS-3D volumes, the 12×12
// camera/world, Build → category → blueprint → place, the fit/ghost rejection,
// the inspector (upgrade/sell), the study ⇄ city switch, the 16×16 showcase and
// the 390×844 / 1440×900 quality bar.
//
// Run against the shared dev server on :4173:
//   node tests/game.spec.mjs
//
// Rules: tests only. App state is seeded through window.horang.state and no app
// file is touched. Console 404s are ignored (the audio directory is large).

import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4173';
const CHROME =
  process.env.CHROME_PATH || '/home/luat/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';

let pass = 0;
let fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) pass++;
  else fail++;
  console.log(`  ${cond ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`);
};
const section = (title) => console.log(`\n${title}`);
const wait = (ms = 300) => page.waitForTimeout(ms);

/* ------------------------------------------------------------------ */
/* Browser + fixtures                                                  */
/* ------------------------------------------------------------------ */

const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
const errs = [];
page.on('pageerror', (e) => errs.push(`PAGEERROR ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error' && !/404|Failed to load resource|favicon/i.test(m.text())) errs.push(`CONSOLE ${m.text()}`);
});

const BASE_RES = () => ({ brick: 1e6, timber: 1e6, glass: 1e6, steel: 1e6, energy: 1e4, blueprint: 9 });

/** Seed the shared store, then reload so boot-time settings / sync see it. */
async function seed(buildings = [], opts = {}) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ buildings, opts }) => {
      const s = window.horang.state;
      s.flags.onboardingDone = true;
      s.profile.name = opts.name || 'QA';
      s.coins = opts.coins ?? 1e6;
      s.gems = opts.gems ?? 10;
      s.badges = Array.from({ length: opts.badges || 0 }, (_, i) => `qa_badge_${i}`);
      s.settings.reducedMotion = !!opts.reducedMotion;
      s.city = {
        version: 1,
        era: opts.era ?? 2,
        grid: opts.grid ?? 12,
        buildings: buildings.map((b) => ({ level: 1, ...b })),
        resources: { ...{ brick: 1e6, timber: 1e6, glass: 1e6, steel: 1e6, energy: 1e4, blueprint: 9 }, ...(opts.resources || {}) },
        lastTick: opts.lastTick ?? Date.now(),
        lifetimeWon: opts.lifetimeWon ?? 0,
        totalBuilt: buildings.length,
        achievements: opts.achievements || [],
        prestigeCount: opts.prestigeCount || 0,
        badges: opts.badges || 0,
        unbanked: 0,
      };
      delete s.city.pendingReport;
      window.horang.store.saveNow();
    },
    { buildings, opts }
  );
  await page.goto(`${BASE}/#/${opts.route || 'game'}`, { waitUntil: 'networkidle' });
  await page.reload({ waitUntil: 'networkidle' });
  await wait(opts.wait ?? 900);
}

const readCity = () =>
  page.evaluate(() => ({
    grid: window.horang.state.city.grid,
    buildings: window.horang.state.city.buildings.map((b) => ({
      id: b.id,
      type: b.type,
      x: b.x,
      y: b.y,
      w: b.w,
      h: b.h,
      level: b.level,
    })),
    badges: window.horang.state.badges.length,
    coins: window.horang.state.coins,
    era: window.horang.state.city.era,
  }));

const count = (sel) => page.locator(sel).count();
const text = async (sel) => {
  try {
    const l = page.locator(sel).first();
    if (!(await l.count())) return '';
    return (await l.innerText()).replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
};

const cameraTransform = () => page.evaluate(() => document.querySelector('[data-camera]')?.style.transform || '');
const rotZ = (s) => Number((s.match(/rotateZ\(([-\d.]+)deg\)/) || [])[1]);
const camScale = (s) => Number((s.match(/scale3d\(([-\d.]+)/) || [])[1]);
const camTx = (s) => Number((s.match(/translate3d\(([-\d.]+)px,\s*([-\d.]+)px/) || [])[1]);

const overflow = () =>
  page.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
    body: document.body.scrollWidth,
  }));

const buildingsOf = (type) =>
  page.evaluate((t) => window.horang.state.city.buildings.filter((b) => b.type === t).map((b) => ({ ...b })), type);

const demoCity = () => {
  const B = [];
  for (let i = 0; i < 16; i++) {
    B.push({ id: `seed_h${i}`, type: 'hanok', x: i % 8, y: Math.floor(i / 8), level: 1, w: 1, h: 1 });
  }
  for (let i = 0; i < 4; i++) {
    B.push({
      id: `seed_a${i}`,
      type: 'apartment',
      x: (i % 2) * 2,
      y: 2 + Math.floor(i / 2) * 2,
      level: 2,
      w: 2,
      h: 2,
    });
  }
  return B;
};

const geometrySeed = () => [
  { id: 'low', type: 'hanok', x: 0, y: 0, level: 1, w: 1, h: 1 },
  { id: 'high', type: 'hanok', x: 2, y: 0, level: 5, w: 1, h: 1 },
  { id: 'apt', type: 'apartment', x: 4, y: 0, level: 3, w: 2, h: 2 },
  { id: 'air', type: 'airport', x: 0, y: 4, level: 2, w: 3, h: 3 },
  { id: 'lotte', type: 'lotte', x: 6, y: 4, level: 7, w: 2, h: 2 },
  { id: 'tower', type: 'tower', x: 9, y: 8, level: 7, w: 2, h: 2 },
];

/** Read a building's modelled extents + apex from its face matrix3d transforms. */
const geometryOf = () =>
  page.evaluate(() => {
    const out = {};
    for (const el of document.querySelectorAll('[data-bld]')) {
      const faces = [...el.querySelectorAll('.g-face')];
      let minx = Infinity;
      let miny = Infinity;
      let minz = Infinity;
      let maxx = -Infinity;
      let maxy = -Infinity;
      let maxz = -Infinity;
      for (const f of faces) {
        const m = (f.style.transform || '').match(/matrix3d\(([^)]+)\)/);
        if (!m) continue;
        const v = m[1].split(',').map(Number);
        const tx = v[12];
        const ty = v[13];
        const tz = v[14];
        if (tx < minx) minx = tx;
        if (tx > maxx) maxx = tx;
        if (ty < miny) miny = ty;
        if (ty > maxy) maxy = ty;
        if (tz < minz) minz = tz;
        if (tz > maxz) maxz = tz;
      }
      out[el.dataset.bld] = {
        faces: faces.length,
        w: Math.round((maxx - minx) * 10) / 10,
        d: Math.round((maxy - miny) * 10) / 10,
        top: Math.round(maxz * 10) / 10,
      };
    }
    return out;
  });

/** Union of a building's projected face boxes in viewport coordinates. */
const projectedBox = (id) =>
  page.evaluate((bid) => {
    const el = document.querySelector(`[data-bld="${bid}"]`);
    if (!el) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const f of el.querySelectorAll('.g-face')) {
      const r = f.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      if (r.left < minX) minX = r.left;
      if (r.top < minY) minY = r.top;
      if (r.right > maxX) maxX = r.right;
      if (r.bottom > maxY) maxY = r.bottom;
    }
    return { minX, minY, maxX, maxY };
  }, id);

/* ================================================================== */
section('FULL-SCREEN SHELL · 390×844');
/* ================================================================== */
try {
  await seed([], { grid: 12 });
  const shell = await page.evaluate(() => {
    const g = document.querySelector('[data-game]');
    const cs = getComputedStyle(g);
    const r = g.getBoundingClientRect();
    const nav = document.getElementById('tabbar');
    const hit = document.elementFromPoint(8, 8);
    const hitBottom = document.elementFromPoint(innerWidth / 2, innerHeight - 8);
    return {
      pos: cs.position,
      inset: cs.inset,
      z: Number(cs.zIndex),
      r: { w: r.width, h: r.height, left: r.left, top: r.top },
      vw: innerWidth,
      vh: innerHeight,
      navHidden: nav.hidden,
      navDisplay: getComputedStyle(nav).display,
      hitInGame: !!hit?.closest('[data-game]'),
      bottomInGame: !!hitBottom?.closest('[data-game]'),
      title: document.title,
    };
  });
  ok('game screen is position: fixed', shell.pos === 'fixed', shell.pos);
  ok('game screen is inset: 0', /(^|\s)0px/.test(shell.inset), shell.inset);
  ok('game screen sits above the app shell (z-index 100)', shell.z >= 100, String(shell.z));
  ok('game screen covers the viewport', shell.r.w === shell.vw && shell.r.h === shell.vh && shell.r.left === 0 && shell.r.top === 0, JSON.stringify(shell.r));
  ok('top-left hit-test lands in the game, not the shell', shell.hitInGame);
  ok('bottom hit-test lands in the game, not the nav', shell.bottomInGame);
  ok('bottom nav is hidden', shell.navHidden && shell.navDisplay === 'none', `${shell.navHidden}/${shell.navDisplay}`);
  ok('document title is Seoul Works', /Seoul Works/.test(shell.title), shell.title);
  ok('Study and List buttons are present', (await count('[data-study]')) === 1 && (await count('[data-list]')) === 1);
} catch (e) {
  ok('full-screen shell section completed', false, e.message);
}

/* ================================================================== */
section('WORLD + CAMERA · 12×12 grid');
/* ================================================================== */
try {
  ok('game renders 144 ground tiles', (await count('[data-tile]')) === 144, `${await count('[data-tile]')}`);
  const tileRange = await page.evaluate(() => {
    const coords = [...document.querySelectorAll('[data-tile]')].map((t) => t.dataset.tile.split(',').map(Number));
    return {
      maxX: Math.max(...coords.map(([x]) => x)),
      maxY: Math.max(...coords.map(([, y]) => y)),
      unique: new Set(coords.map(([x, y]) => `${x},${y}`)).size,
    };
  });
  ok('tiles span x/y 0–11 exactly once', tileRange.maxX === 11 && tileRange.maxY === 11 && tileRange.unique === 144, JSON.stringify(tileRange));
  ok('HUD grid reads 12×12', (await text('[data-hud="grid"]')) === '12×12', await text('[data-hud="grid"]'));
  ok('empty city shows the break-ground prompt', await page.locator('[data-empty]').isVisible());
  ok('empty city has no 3D buildings yet', (await count('[data-bld]')) === 0);

  const t0 = await cameraTransform();
  ok('camera starts isometric (rotateX 58 / rotateZ 45)', /rotateX\(58deg\)/.test(t0) && rotZ(t0) === 45, t0);
  await page.locator('[data-rotate]').click();
  await wait(650);
  const tRot = await cameraTransform();
  ok('rotate control turns the world 90° (rotateZ 135)', rotZ(tRot) === 135, tRot);
  await page.locator('[data-reset]').click();
  await wait(650);
  const tReset = await cameraTransform();
  ok('reset returns to rotateZ 45', rotZ(tReset) === 45, tReset);

  const s0 = camScale(tReset);
  await page.locator('[data-zoom-in]').click();
  await wait(220);
  const tIn = await cameraTransform();
  ok('zoom + increases the camera scale', camScale(tIn) > s0, `${s0} -> ${camScale(tIn)}`);
  await page.locator('[data-zoom-out]').click();
  await wait(220);
  const tOut = await cameraTransform();
  ok('zoom − decreases the camera scale', camScale(tOut) < camScale(tIn), `${camScale(tIn)} -> ${camScale(tOut)}`);

  await page.locator('[data-reset]').click();
  await wait(650);
  const panBefore = await cameraTransform();
  const stageBox = await page.locator('[data-stage]').boundingBox();
  await page.mouse.move(stageBox.x + stageBox.width / 2, stageBox.y + stageBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(stageBox.x + stageBox.width / 2 + 96, stageBox.y + stageBox.height / 2 + 44, { steps: 8 });
  await page.mouse.up();
  await wait(350);
  const panAfter = await cameraTransform();
  ok('drag pans the camera', camTx(panBefore) !== camTx(panAfter) || panBefore !== panAfter, `${panBefore} -> ${panAfter}`);
  ok('pan did not open the build sheet (drag suppression)', !(await page.locator('[data-sheet]').isVisible()));

  await page.locator('[data-reset]').click();
  await wait(500);
  const wheelBefore = camScale(await cameraTransform());
  await page.mouse.move(stageBox.x + stageBox.width / 2, stageBox.y + stageBox.height / 2);
  await page.mouse.wheel(0, -260);
  await wait(250);
  const wheelAfter = camScale(await cameraTransform());
  ok('mouse wheel zooms the camera', wheelAfter > wheelBefore, `${wheelBefore} -> ${wheelAfter}`);
} catch (e) {
  ok('world/camera section completed', false, e.message);
}

/* ================================================================== */
section('CSS-3D AUTHENTICITY · volumes, not pictures');
/* ================================================================== */
try {
  await seed(geometrySeed(), { grid: 12, badges: 12 });
  const auth = await page.evaluate(() => {
    const els = [...document.querySelectorAll('[data-bld]')];
    let badStyle = 0;
    let tooFewFaces = 0;
    let media = 0;
    let emoji = 0;
    let noCategory = 0;
    let minFaces = Infinity;
    for (const el of els) {
      if (getComputedStyle(el).transformStyle !== 'preserve-3d') badStyle++;
      const faces = el.querySelectorAll('.g-face').length;
      minFaces = Math.min(minFaces, faces);
      if (faces < 5) tooFewFaces++;
      if (el.querySelector('img, svg, picture, canvas')) media++;
      if (/\p{Extended_Pictographic}/u.test(el.innerText || '')) emoji++;
      if (![...el.classList].some((c) => c.startsWith('cat-'))) noCategory++;
    }
    return { n: els.length, badStyle, tooFewFaces, media, emoji, noCategory, minFaces };
  });
  ok('geometry city renders six 3D buildings', auth.n === 6, `${auth.n}`);
  ok('every [data-bld] is preserve-3d', auth.badStyle === 0, `${auth.badStyle} bad`);
  ok('every building has multiple 3D faces (min 5)', auth.tooFewFaces === 0, `min ${auth.minFaces} faces`);
  ok('no building uses <img>/<svg>/<canvas>', auth.media === 0, `${auth.media}`);
  ok('no building is emoji-only art', auth.emoji === 0, `${auth.emoji}`);
  ok('every building carries a category class', auth.noCategory === 0, `${auth.noCategory}`);

  const g = await geometryOf();
  ok('same type, level 5 is taller than level 1', g.high.top > g.low.top + 8, `${g.low.top} -> ${g.high.top}`);
  ok('1×1 hanok models one tile of width', g.low.w > 36 && g.low.w < 50, `${g.low.w}`);
  ok('2×2 apartment models two tiles across (w and d)', g.apt.w > 78 && g.apt.d > 78, `${g.apt.w}×${g.apt.d}`);
  ok('3×3 airport models three tiles across (w and d)', g.air.w > 118 && g.air.d > 118, `${g.air.w}×${g.air.d}`);
  ok('landmark Lotte Tower is the tallest silhouette', g.lotte.top > g.tower.top && g.lotte.top > g.apt.top, JSON.stringify({ lotte: g.lotte.top, tower: g.tower.top, apt: g.apt.top }));

  const lotte = await projectedBox('lotte');
  const tower = await projectedBox('tower');
  const vp = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
  ok('Lotte Tower is fully inside the viewport', lotte && lotte.minX >= -1 && lotte.minY >= -1 && lotte.maxX <= vp.w + 1 && lotte.maxY <= vp.h + 1, JSON.stringify(lotte));
  ok('N Seoul Tower is fully inside the viewport', tower && tower.minX >= -1 && tower.minY >= -1 && tower.maxX <= vp.w + 1 && tower.maxY <= vp.h + 1, JSON.stringify(tower));
  ok('spires are visible in the upper half (not clipped)', Math.min(lotte.minY, tower.minY) < vp.h * 0.6, `${Math.min(lotte.minY, tower.minY)} < ${vp.h * 0.6}`);
} catch (e) {
  ok('3D authenticity section completed', false, e.message);
}

/* ================================================================== */
section('BUILD TRAY · category → blueprint → Done → free tile');
/* ================================================================== */
try {
  await seed(demoCity(), { grid: 12, badges: 12, era: 2, coins: 1e7 });
  const start = await readCity();
  ok('seed has 20 buildings and 300+ residents', start.buildings.length === 20 && (await page.evaluate(async () => (await import('/app/js/core/city.js')).stats().population)) >= 300, `${start.buildings.length}`);

  await page.locator('[data-build-toggle]').click();
  await wait(400);
  ok('Build opens the tray', await page.locator('[data-sheet]').isVisible());
  ok('tray offers 31 blueprints', (await count('[data-build]')) === 31, `${await count('[data-build]')}`);
  ok('tray has All + six category chips', (await count('[data-cat]')) === 7, `${await count('[data-cat]')}`);
  ok('tray shows the 12×12 grid city', (await text('[data-hud="grid"]')) === '12×12');

  await page.locator('[data-cat="res"]').click();
  await wait(250);
  ok('Residential filters to 4 blueprints', (await count('[data-build]')) === 4, `${await count('[data-build]')}`);
  await page.locator('[data-cat="transit"]').click();
  await wait(250);
  ok('Transit filters to 6 blueprints', (await count('[data-build]')) === 6, `${await count('[data-build]')}`);
  await page.locator('[data-cat="all"]').click();
  await wait(250);
  ok('All restores 31 blueprints', (await count('[data-build]')) === 31);

  const arm = async (type) => {
    await page.locator(`[data-build="${type}"]`).click();
    await wait(250);
  };
  const done = async () => {
    await page.locator('[data-sheet-done]').click();
    await wait(300);
  };
  const placeAt = async (x, y) => {
    await page.locator(`[data-tile="${x},${y}"]`).click();
    await wait(700);
  };

  // Hanok (1×1).
  await page.locator('[data-cat="res"]').click();
  await wait(200);
  await arm('hanok');
  await done();
  ok('Done with no plot arms placement and closes the tray', !(await page.locator('[data-sheet]').isVisible()) && await page.locator('[data-banner]').isVisible());
  await placeAt(9, 9);
  const hanok = (await buildingsOf('hanok')).find((b) => b.x === 9 && b.y === 9);
  ok('hanok lands on the tapped free tile', !!hanok, JSON.stringify(hanok));
  ok('hanok appears as a 3D object', (await count(`[data-bld="${hanok?.id}"]`)) === 1);

  // Apartment (2×2).
  await page.locator('[data-build-toggle]').click();
  await wait(300);
  await page.locator('[data-cat="res"]').click();
  await wait(200);
  await arm('apartment');
  await done();
  await placeAt(10, 2);
  const apt = (await buildingsOf('apartment')).find((b) => b.x === 10 && b.y === 2);
  ok('apartment places a 2×2 footprint', apt?.w === 2 && apt?.h === 2, JSON.stringify(apt));
  ok('apartment has a 3D volume in the scene', (await count(`[data-bld="${apt?.id}"]`)) === 1);

  // Metro (2×1).
  await page.locator('[data-build-toggle]').click();
  await wait(300);
  await page.locator('[data-cat="transit"]').click();
  await wait(200);
  await arm('metro');
  await done();
  await placeAt(8, 5);
  const metro = (await buildingsOf('metro'))[0];
  ok('metro places a 2×1 footprint', metro?.w === 2 && metro?.h === 1, JSON.stringify(metro));
  ok('metro has a 3D volume in the scene', (await count(`[data-bld="${metro?.id}"]`)) === 1);

  // Airport (3×3) — the 20 buildings / 300 residents / 12 badge gate is met.
  await page.locator('[data-build-toggle]').click();
  await wait(300);
  await page.locator('[data-cat="transit"]').click();
  await wait(200);
  const airRow = await text('[data-build="airport"]');
  ok('airport blueprint is unlocked at 20 buildings / 300 residents', !/NEEDS|LOCKED/i.test(airRow), airRow.slice(0, 80));
  await arm('airport');
  await done();
  await placeAt(4, 9);
  const air = (await buildingsOf('airport'))[0];
  ok('airport places a 3×3 footprint', air?.w === 3 && air?.h === 3, JSON.stringify(air));
  ok('airport has a 3D volume in the scene', (await count(`[data-bld="${air?.id}"]`)) === 1);
  const used = await page.evaluate(() =>
    window.horang.state.city.buildings.reduce((a, b) => a + (b.w || 1) * (b.h || 1), 0)
  );
  ok('HUD tile count matches the placed footprints', (await text('[data-hud="tiles"]')) === `${used}/144 tiles`, `${used}/144`);
  ok('HUD population rose above the seed', Number((await text('[data-hud="pop"]')).replace(/,/g, '')) > 326);

  // Occupied-plot rejection: ghost turns bad and the banner explains it.
  await page.locator('[data-build-toggle]').click();
  await wait(300);
  await page.locator('[data-cat="res"]').click();
  await wait(200);
  await arm('hanok');
  await done();
  await page.locator('[data-tile="0,0"]').dispatchEvent('pointermove');
  await wait(300);
  const ghost = await page.locator('[data-ghost]').evaluate((el) => ({ hidden: el.hidden, bad: el.classList.contains('is-bad') }));
  ok('ghost turns invalid on an occupied plot', ghost.hidden === false && ghost.bad, JSON.stringify(ghost));
  ok('banner explains the occupied plot', /That plot is taken/i.test(await text('[data-banner]')), await text('[data-banner]'));
  await page.locator('[data-banner] [data-placing-cancel]').click();
  await wait(250);

  // Out-of-map rejection for a 3×3 near the far corner.
  await page.locator('[data-build-toggle]').click();
  await wait(300);
  await page.locator('[data-cat="transit"]').click();
  await wait(200);
  await arm('airport');
  await done();
  await page.locator('[data-tile="11,11"]').dispatchEvent('pointermove');
  await wait(300);
  const cornerGhost = await page.locator('[data-ghost]').evaluate((el) => ({ hidden: el.hidden, bad: el.classList.contains('is-bad') }));
  ok('corner ghost rejects a 3×3 airport', cornerGhost.hidden === false && cornerGhost.bad, JSON.stringify(cornerGhost));
  ok('banner explains the 3×3 fit conflict', /That plot is taken|Needs 3×3 inside the map/i.test(await text('[data-banner]')), await text('[data-banner]'));
  await page.locator('[data-banner] [data-placing-cancel]').click();
  await wait(250);

  // Inspector from a covered tile + upgrade + sell.
  await page.locator('[data-tile="9,9"]').click();
  await wait(500);
  const ins = await text('[data-sheet]');
  ok('tapping a covered tile opens the inspector', /Hanok/i.test(ins) && /1×1/i.test(ins), ins.slice(0, 90));
  const beforeUp = await page.evaluate((id) => {
    const el = document.querySelector(`[data-bld="${id}"]`);
    let top = 0;
    for (const f of el.querySelectorAll('.g-face')) {
      const m = (f.style.transform || '').match(/matrix3d\(([^)]+)\)/);
      if (m) top = Math.max(top, Number(m[1].split(',')[14]));
    }
    return Math.round(top * 10) / 10;
  }, hanok.id);
  ok('upgrade button is enabled', !(await page.locator('[data-upgrade]').isDisabled().catch(() => true)));
  await page.locator('[data-upgrade]').click();
  await wait(800);
  const upgraded = (await buildingsOf('hanok')).find((b) => b.id === hanok.id);
  ok('upgrade raises the building level', upgraded?.level === 2, JSON.stringify(upgraded));
  ok('upgrade refreshes the inspector', /Level 2/i.test(await text('[data-sheet]')), await text('[data-sheet]'));
  const afterUp = await page.evaluate((id) => {
    const el = document.querySelector(`[data-bld="${id}"]`);
    let top = 0;
    for (const f of el.querySelectorAll('.g-face')) {
      const m = (f.style.transform || '').match(/matrix3d\(([^)]+)\)/);
      if (m) top = Math.max(top, Number(m[1].split(',')[14]));
    }
    return Math.round(top * 10) / 10;
  }, hanok.id);
  ok('upgrade makes the 3D volume taller', afterUp > beforeUp, `${beforeUp} -> ${afterUp}`);

  await page.locator('[data-sell]').click();
  await wait(350);
  ok('sell opens a confirmation modal', /Sell Hanok\?/i.test(await text('[data-modal]')), await text('[data-modal]'));
  await page.locator('[data-confirm]').click();
  await wait(800);
  ok('selling removes the building from state', !(await buildingsOf('hanok')).some((b) => b.id === hanok.id));
  ok('selling removes its 3D object', (await count(`[data-bld="${hanok.id}"]`)) === 0);
  ok('selling frees the tile again', (await page.locator('[data-tile="9,9"]').getAttribute('data-owner')) === null);
  ok('selling closes the inspector', !(await page.locator('[data-sheet]').isVisible()));

  // Transit overlay + menu surfaces.
  await page.locator('[data-transit]').click();
  await wait(450);
  ok(
    'transit overlay turns on',
    (await page.locator('[data-transit]').getAttribute('aria-pressed')) === 'true' &&
      /is-overlay/.test((await page.locator('[data-game]').getAttribute('class')) || '')
  );
  ok('overlay tints covered tiles', (await count('.g-tile.is-cov')) > 0, `${await count('.g-tile.is-cov')}`);
  ok('overlay dims non-transit volumes', (await count('.g-bld.is-dim')) > 0, `${await count('.g-bld.is-dim')}`);
  await page.locator('[data-transit]').click();
  await wait(350);
  ok(
    'transit overlay turns off',
    (await page.locator('[data-transit]').getAttribute('aria-pressed')) === 'false' &&
      !/is-overlay/.test((await page.locator('[data-game]').getAttribute('class')) || '')
  );

  await page.locator('[data-menu-btn]').click();
  await wait(300);
  ok('city menu opens with six reachable rows', (await count('[data-menu-action]')) === 6, `${await count('[data-menu-action]')}`);
  await page.locator('[data-menu-action="ach"]').click();
  await wait(350);
  ok('achievements open from the menu', (await page.locator('[data-modal]').isVisible()) && /CITY ACHIEVEMENTS/i.test(await text('[data-modal]')), await text('[data-modal]').then((t) => t.slice(0, 60)));
  await page.locator('.g-modal-x').click();
  await wait(250);
  ok('achievements modal closes', !(await page.locator('[data-modal]').isVisible()));

  // Toast cap: five locked blueprints must never stack more than three toasts.
  await page.locator('[data-build-toggle]').click();
  await wait(300);
  await page.locator('[data-cat="landmark"]').click();
  await wait(250);
  for (let i = 0; i < 5; i++) {
    await page.locator('[data-build="lotte"]').click({ force: true });
    await wait(90);
  }
  ok('game toasts are capped at three', (await count('[data-toasts] .g-toast')) <= 3, `${await count('[data-toasts] .g-toast')}`);

  // No dead controls: every enabled button is wired to a handled attribute.
  const dead = await page.locator('.g-screen button:not([disabled])').evaluateAll((els) =>
    els
      .map((e) => ({
        label: (e.innerText || '').trim().slice(0, 24),
        wired: ['data-study', 'data-list', 'data-menu-btn', 'data-tile', 'data-build-toggle', 'data-transit', 'data-zoom-in', 'data-zoom-out', 'data-rotate', 'data-reset', 'data-menu-action', 'data-place', 'data-placing-cancel', 'data-cat', 'data-build', 'data-sheet-close', 'data-sheet-done', 'data-upgrade', 'data-sell', 'data-confirm', 'data-modal-close', 'data-prestige-go'].some((a) => e.hasAttribute(a)),
      }))
      .filter((b) => !b.wired)
  );
  ok('every enabled game button has a handler', dead.length === 0, JSON.stringify(dead.slice(0, 4)));
} catch (e) {
  ok('build/inspector section completed', false, e.message);
}

/* ================================================================== */
section('STUDY ⇄ CITY MODE SWITCH');
/* ================================================================== */
try {
  await seed([{ id: 'home_h', type: 'hanok', x: 0, y: 0, level: 1, w: 1, h: 1 }], { grid: 12, route: 'home' });
  ok('Home has a Study | City switch', (await count('.mode-opt--city')) === 1);
  ok('Home has a city card that enters the game', (await count('.city-card')) === 1 && (await page.locator('.city-card').getAttribute('data-go')) === 'game');
  ok('Home exposes the game route', (await count('[data-go="game"]')) >= 2);

  await page.locator('.mode-opt--city').click();
  await wait(900);
  ok('Study → City switch opens #/game', (await page.evaluate(() => location.hash)) === '#/game');
  ok('game hides the bottom nav', await page.evaluate(() => document.getElementById('tabbar').hidden));
  ok('game still has the 12×12 world', (await count('[data-tile]')) === 144);

  await page.locator('[data-study]').click();
  await wait(800);
  ok('game Study returns to #/home', (await page.evaluate(() => location.hash)) === '#/home');
  ok('Study restores the bottom nav', !(await page.evaluate(() => document.getElementById('tabbar').hidden)));

  await page.locator('.city-card').click();
  await wait(900);
  ok('home city card opens #/game', (await page.evaluate(() => location.hash)) === '#/game');

  await page.locator('[data-list]').click();
  await wait(850);
  ok('game List returns to the 2D #/city overview', (await page.evaluate(() => location.hash)) === '#/city');
  ok('2D overview is still a 12×12 grid', (await count('[data-tile]')) === 144 && /12×12/.test(await text('.cmb-title')), `${await count('[data-tile]')}/${await text('.cmb-title')}`);
  ok('2D overview keeps the bottom nav visible', !(await page.evaluate(() => document.getElementById('tabbar').hidden)));
  ok('City bottom tab points at the game', (await count('.tab[data-tab="game"]')) === 1);
  ok('2D overview is not itself a bottom tab', (await count('.tab[aria-current="page"]')) === 0);

  await page.locator('.tab[data-tab="game"]').click();
  await wait(900);
  ok('City bottom tab opens #/game', (await page.evaluate(() => location.hash)) === '#/game');
  ok('City tab also hides the nav inside the game', await page.evaluate(() => document.getElementById('tabbar').hidden));

  await page.goto(`${BASE}/#/profile`, { waitUntil: 'networkidle' });
  await wait(700);
  const row = page.locator('[data-city-entry]');
  ok('profile has one Seoul Works row', (await row.count()) === 1);
  const prof = (await row.innerText()).replace(/\s+/g, ' ').toLowerCase();
  ok('profile row shows era, tier, residents and income', /era 2/.test(prof) && /village/.test(prof) && /6 residents/.test(prof) && /\/s/.test(prof), prof);
  await row.click();
  await wait(900);
  ok('profile Seoul Works row opens #/game', (await page.evaluate(() => location.hash)) === '#/game');
} catch (e) {
  ok('mode switch section completed', false, e.message);
}

/* ================================================================== */
section('SHOWCASE · 16×16 → 3D game → restore');
/* ================================================================== */
try {
  // Capture the pre-showcase save so Restore can be checked against it.
  await seed([], { grid: 12, route: 'city' });
  const pre = await page.evaluate(() => ({
    n: window.horang.state.city.buildings.length,
    grid: window.horang.state.city.grid,
    badges: window.horang.state.badges.length,
    coins: window.horang.state.coins,
  }));
  await page.evaluate(() => window.horang.router.go('city', { showcase: '1' }));
  await wait(1500);
  const show = await page.evaluate(() => ({
    n: window.horang.state.city.buildings.length,
    grid: window.horang.state.city.grid,
    flag: window.horang.state.flags.showcaseCity,
    badges: window.horang.state.badges.length,
    tiles: window.horang.state.city.buildings.reduce((a, b) => a + (b.w || 1) * (b.h || 1), 0),
  }));
  ok('showcase loads 127 buildings', show.n === 127, `${show.n}`);
  ok('showcase fills a 16×16 grid (256/256 tiles)', show.grid === 16 && show.tiles === 256, `${show.grid}×${show.grid}, ${show.tiles}`);
  ok('showcase keeps 12 A1 badges and its flag', show.badges === 12 && show.flag === true);
  ok('2D showcase offers Play 3D', (await count('.city-showcase-banner [data-go="game"]')) === 1);
  ok('2D showcase offers Restore', (await count('[data-restore-showcase]')) === 1);

  await page.locator('.city-showcase-banner [data-go="game"]').click();
  await wait(1500);
  ok('showcase opens the 3D game', (await page.evaluate(() => location.hash)) === '#/game');
  ok('3D showcase renders 256 tiles', (await count('[data-tile]')) === 256, `${await count('[data-tile]')}`);
  ok('3D showcase renders 127 building volumes', (await count('[data-bld]')) === 127, `${await count('[data-bld]')}`);
  ok('3D HUD shows 1,448 residents', (await text('[data-hud="pop"]')) === '1,448', await text('[data-hud="pop"]'));
  ok('3D HUD shows 16×16 and 256/256 tiles', (await text('[data-hud="grid"]')) === '16×16' && (await text('[data-hud="tiles"]')) === '256/256 tiles', `${await text('[data-hud="grid"]')} ${await text('[data-hud="tiles"]')}`);
  const showcase3d = await page.evaluate(() => {
    const els = [...document.querySelectorAll('[data-bld]')];
    return els.every(
      (el) =>
        getComputedStyle(el).transformStyle === 'preserve-3d' &&
        el.querySelectorAll('.g-face').length >= 5 &&
        !el.querySelector('img, svg, canvas')
    );
  });
  ok('all 127 showcase buildings are real CSS 3D volumes', showcase3d);
  const showcaseOverflow = await overflow();
  ok('3D showcase has no horizontal overflow at 390', showcaseOverflow.doc <= showcaseOverflow.client + 1, JSON.stringify(showcaseOverflow));

  await page.locator('[data-list]').click();
  await wait(900);
  ok('List from the showcase returns to the 2D overview', (await page.evaluate(() => location.hash)) === '#/city');
  await page.locator('[data-restore-showcase]').click();
  await wait(1100);
  const restored = await page.evaluate(() => ({
    n: window.horang.state.city.buildings.length,
    grid: window.horang.state.city.grid,
    badges: window.horang.state.badges.length,
    coins: window.horang.state.coins,
    flag: window.horang.state.flags.showcaseCity,
  }));
  ok(
    'restore returns the pre-showcase save',
    restored.n === pre.n && restored.grid === pre.grid && restored.badges === pre.badges && restored.coins === pre.coins && !restored.flag,
    `${JSON.stringify(restored)} vs ${JSON.stringify(pre)}`
  );
} catch (e) {
  ok('showcase section completed', false, e.message);
}

/* ================================================================== */
section('QUALITY · 1440×900, reduced motion, overflow');
/* ================================================================== */
try {
  await seed([{ id: 'q_h', type: 'hanok', x: 0, y: 0, level: 1, w: 1, h: 1 }], { grid: 12 });
  await page.setViewportSize({ width: 1440, height: 900 });
  await wait(500);
  const desk = await page.evaluate(() => {
    const g = document.querySelector('[data-game]');
    const r = g.getBoundingClientRect();
    return {
      w: r.width,
      h: r.height,
      vw: innerWidth,
      vh: innerHeight,
      nav: document.getElementById('tabbar').hidden,
      hitSide: !!document.elementFromPoint(70, 450)?.closest('[data-game]'),
    };
  });
  ok('game is full-screen at 1440×900', desk.w === 1440 && desk.h === 900 && desk.vw === 1440 && desk.vh === 900, JSON.stringify(desk));
  ok('game covers the desktop side panels', desk.hitSide);
  const ovDesk = await overflow();
  ok('no horizontal overflow at 1440', ovDesk.doc <= ovDesk.client + 1 && ovDesk.body <= ovDesk.client + 1, JSON.stringify(ovDesk));
  await page.locator('[data-build-toggle]').click();
  await wait(400);
  const sheet = await page.evaluate(() => {
    const s = document.querySelector('[data-sheet]').getBoundingClientRect();
    return { left: s.left, right: s.right, vw: innerWidth, vh: innerHeight, top: s.top, bottom: s.bottom };
  });
  ok('build sheet stays inside the 1440 viewport', sheet.left >= -1 && sheet.right <= sheet.vw + 1 && sheet.top >= -1 && sheet.bottom <= sheet.vh + 1, JSON.stringify(sheet));
  const ovDeskSheet = await overflow();
  ok('no horizontal overflow with the tray open at 1440', ovDeskSheet.doc <= ovDeskSheet.client + 1, JSON.stringify(ovDeskSheet));
  await page.setViewportSize({ width: 390, height: 844 });
  await wait(400);
  const ovMob = await overflow();
  ok('no horizontal overflow at 390', ovMob.doc <= ovMob.client + 1 && ovMob.body <= ovMob.client + 1, JSON.stringify(ovMob));

  // Reduced motion needs a fresh boot to apply body.reduce-motion.
  await seed([], { grid: 12, reducedMotion: true });
  await page.reload({ waitUntil: 'networkidle' });
  await wait(800);
  ok('reduced-motion preference is applied', /reduce-motion/.test(await page.evaluate(() => document.body.className)));
  await page.locator('[data-build-toggle]').click();
  await wait(300);
  await page.locator('[data-cat="res"]').click();
  await wait(200);
  await page.locator('[data-build="hanok"]').click();
  await wait(200);
  await page.locator('[data-sheet-done]').click();
  await wait(250);
  await page.locator('[data-tile="2,2"]').click();
  await wait(800);
  ok('reduced motion still places a building', (await page.evaluate(() => window.horang.state.city.buildings.length)) === 1);
  ok('reduced motion suppresses build confetti', (await count('.g-confetti')) === 0, `${await count('.g-confetti')}`);
  await page.locator('[data-rotate]').click();
  await wait(200);
  ok('reduced motion does not animate the camera', !/is-smooth/.test(await page.locator('[data-camera]').getAttribute('class') || ''), await page.locator('[data-camera]').getAttribute('class'));
  const faceAnim = await page.evaluate(() => {
    const f = document.querySelector('.g-bld .g-face');
    return f ? getComputedStyle(f).transitionDuration : '';
  });
  ok('reduced motion shortens 3D transitions', /0\.001s|0s/.test(faceAnim), faceAnim);
} catch (e) {
  ok('quality section completed', false, e.message);
}

ok('no unexpected console/page errors', errs.length === 0, errs.slice(0, 3).join(' | '));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nFAILING CHECKS:');
  console.log('  (see the ✗ lines above)');
}
await browser.close();
process.exit(fail || errs.length ? 1 : 0);
