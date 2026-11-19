// Showcase city: load a completed legitimate 16×16 save, then restore the player's own.
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:4173';
const CHROME = process.env.CHROME_PATH || '/home/luat/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
let fail = 0;
const ok = (n, c, e = '') => { console.log(`  ${c ? '✓' : '✗'} ${n}${e ? ' — ' + e : ''}`); if (!c) fail++; };
const b = await chromium.launch({ executablePath: CHROME });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => m.type() === 'error' && !/404|Failed/.test(m.text()) && errs.push(m.text()));

// Start from a clean player save so Restore has a known target.
await p.goto(BASE, { waitUntil: 'networkidle' });
await p.evaluate(() => localStorage.clear());
await p.goto(BASE + '/#/city', { waitUntil: 'networkidle' });
await p.waitForTimeout(700);
const pre = await p.evaluate(() => ({
  n: window.horang.state.city.buildings.length,
  grid: window.horang.state.city.grid,
  badges: window.horang.state.badges.length,
  coins: window.horang.state.coins,
}));

// Load the showcase through the same route the app uses.
await p.evaluate(() => window.horang.router.go('city', { showcase: '1' }));
await p.waitForTimeout(1400);
const s = await p.evaluate(() => {
  const x = window.horang.state;
  const tiles = x.city.buildings.reduce((a, b) => a + (b.w || 1) * (b.h || 1), 0);
  const types = new Set(x.city.buildings.map((b) => b.type));
  return { n: x.city.buildings.length, tiles, era: x.city.era, grid: x.city.grid, badges: x.badges.length, coins: x.coins, showcase: x.flags.showcaseCity, types: [...types] };
});
ok('loads 127 buildings', s.n === 127, `${s.n}`);
ok('fills the 16×16 grid', s.grid === 16 && s.tiles === 256, `${s.grid}×${s.grid}, ${s.tiles} tiles`);
ok('is Era 3', s.era === 3);
ok('assumes 12 badges', s.badges === 12);
ok('includes airport, KTX, metro, palace, stadium, Lotte, tower, bridge', ['airport','train','metro','palace','stadium','lotte','tower','bridge'].every((t) => s.types.includes(t)));
ok('showcase flag set', s.showcase === true);
ok('banner offers restore', (await p.locator('[data-restore-showcase]').count()) === 1);
const text = await p.locator('#screen').innerText();
ok('shows 1,448 residents', /1,448 residents/.test(text), text.match(/[\d,]+ residents/)?.[0] || '');
ok('shows 256/256 tiles', /256\/256 tiles/.test(text), text.match(/[\d,/]+ tiles/)?.[0] || '');
ok('shows 127 buildings', /127 buildings/.test(text));
ok('shows a 16×16 map', /16×16/.test(text));
ok('banner offers Play 3D', (await p.locator('.city-showcase-banner [data-go="game"]').count()) === 1);
await p.locator('[data-restore-showcase]').click();
await p.waitForTimeout(1000);
const r = await p.evaluate(() => ({ n: window.horang.state.city.buildings.length, grid: window.horang.state.city.grid, badges: window.horang.state.badges.length, coins: window.horang.state.coins, flag: window.horang.state.flags.showcaseCity }));
ok('restore returns the pre-showcase save', r.n === pre.n && r.grid === pre.grid && r.badges === pre.badges && r.coins === pre.coins && !r.flag, `${JSON.stringify(r)} vs ${JSON.stringify(pre)}`);
console.log(`\n${errs.length ? 'CONSOLE ERRORS:\n' + errs.join('\n') : 'CONSOLE ERRORS: none'}`);
console.log(fail ? `\n${fail} CHECKS FAILED` : '\nALL SHOWCASE CHECKS PASSED');
await b.close();
process.exit(fail || errs.length ? 1 : 0);
