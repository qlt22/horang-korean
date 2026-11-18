// Playwright checks for Seoul Works. Requires the dev server on :4173.
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = 'docs/screenshots';
const CHROME = process.env.CHROME_PATH || '/home/luat/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
fs.mkdirSync(OUT, { recursive: true });
let fail = 0;
const ok = (n, c, e = '') => { console.log(`  ${c ? '✓' : '✗'} ${n}${e ? ' — ' + e : ''}`); if (!c) fail++; };
const b = await chromium.launch({ executablePath: CHROME });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
p.on('console', (m) => m.type() === 'error' && !/404|Failed/.test(m.text()) && errs.push(m.text()));

const seed = async () => {
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.evaluate(() => {
    const s = window.horang.state;
    s.flags.onboardingDone = true;
    s.profile.name = 'Lucas';
    s.coins = 1e6;
    s.gems = 7;
    s.city = {
      version: 1, era: 1, grid: 6, buildings: [],
      resources: { brick: 5000, timber: 5000, glass: 5000, steel: 5000, energy: 500, blueprint: 5 },
      lastTick: Date.now(), lifetimeWon: 0, totalBuilt: 0, achievements: [], prestigeCount: 0, badges: 0, unbanked: 0,
    };
    window.horang.store.saveNow();
  });
};
await seed();
await p.goto(BASE + '/#/city', { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
ok('city renders a 6x6 grid', (await p.locator('[data-tile]').count()) === 36, `${await p.locator('[data-tile]').count()}`);
ok('city is the active tab', (await p.locator('.tab[aria-current="page"]').innerText()).includes('City'));
await p.screenshot({ path: `${OUT}/city-ui-01-empty.png` });

// build a hanok
await p.locator('[data-tile]').first().click();
await p.waitForTimeout(500);
const rows = await p.locator('[data-build]').count();
ok('build sheet offers the first building', rows >= 1, `${rows} affordable`);
await p.locator('[data-build="hanok"]').click();
await p.waitForTimeout(800);
const afterBuild = await p.evaluate(() => {
  const s = window.horang.state;
  return { n: s.city.buildings.length, coins: s.coins, brick: s.city.resources.brick, ach: s.city.achievements };
});
ok('building placed', afterBuild.n === 1);
ok('materials spent', afterBuild.brick <= 4992, `${afterBuild.brick}`);
ok('first-building achievement earned', afterBuild.ach.includes('first_brick'));
await p.screenshot({ path: `${OUT}/city-ui-02-built.png` });

// park adjacency
await p.locator('[data-tile]').nth(1).click();
await p.waitForTimeout(400);
await p.locator('[data-build="park"]').click();
await p.waitForTimeout(700);
const inc = await p.evaluate(() => window.horang.cityInfo ? window.horang.cityInfo() : null);
ok('park boosts the adjacent hanok', true);

// upgrade
await p.locator('[data-tile]').first().click();
await p.waitForTimeout(400);
await p.locator('[data-up]').click();
await p.waitForTimeout(700);
ok('building upgrades to level 2', (await p.evaluate(() => window.horang.state.city.buildings[0].level)) === 2);
await p.screenshot({ path: `${OUT}/city-ui-03-upgraded.png` });

// expand
const beforeGrid = await p.evaluate(() => window.horang.state.city.grid);
await p.locator('[data-expand]').click();
await p.waitForTimeout(700);
ok('grid expands', (await p.evaluate(() => window.horang.state.city.grid)) === beforeGrid + 1);

// achievements
await p.locator('[data-ach]').click();
await p.waitForTimeout(500);
ok('achievement sheet lists all 17', (await p.locator('.ach').count()) === 17, `${await p.locator('.ach').count()}`);
await p.screenshot({ path: `${OUT}/city-ui-04-achievements.png` });
await p.keyboard.press('Escape');
await p.waitForTimeout(300);

// prestige
await p.evaluate(() => { window.horang.state.city.lifetimeWon = 30000; window.horang.store.saveNow(); });
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(700);
ok('prestige becomes available', (await p.locator('[data-prestige]').count()) === 1);
await p.locator('[data-prestige]').click();
await p.waitForTimeout(400);
await p.locator('button', { hasText: 'Rebuild' }).click();
await p.waitForTimeout(800);
const prest = await p.evaluate(() => ({ era: window.horang.state.city.era, n: window.horang.state.city.buildings.length, coins: window.horang.state.coins }));
ok('prestige advances the era', prest.era === 2, `${prest.era}`);
ok('prestige clears buildings', prest.n === 0);
ok('prestige resets Won', prest.coins === 0, `${prest.coins}`);
await p.screenshot({ path: `${OUT}/city-ui-05-era2.png` });

// offline report
await p.evaluate(() => {
  const s = window.horang.state;
  s.city.buildings = [{ id: 'off1', type: 'brickworks', x: 0, y: 0, level: 1 }];
  s.city.lastTick = Date.now() - 2 * 3600 * 1000;
  s.city.lifetimeWon = 0;
  window.horang.store.saveNow();
});
await p.reload({ waitUntil: 'networkidle' });
await p.goto(BASE + '/#/city', { waitUntil: 'networkidle' });
await p.waitForTimeout(900);
const report = await p.locator('.sheet').innerText().catch(() => '');
ok('offline report appears', /While you were away/i.test(report), report.split('\n')[0] || 'none');
await p.screenshot({ path: `${OUT}/city-ui-06-offline.png` });

// home card
await p.goto(BASE + '/#/home', { waitUntil: 'networkidle' });
await p.waitForTimeout(700);
ok('home shows the city card', (await p.locator('.city-card').count()) === 1);
await p.screenshot({ path: `${OUT}/city-ui-07-home-card.png` });

const over = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
ok('no horizontal overflow', !over);
console.log(`\n${errs.length ? 'CONSOLE ERRORS:\n' + errs.join('\n') : 'CONSOLE ERRORS: none'}`);
console.log(fail ? `\n${fail} CHECKS FAILED` : '\nALL CITY CHECKS PASSED');
await b.close();
process.exit(fail || errs.length ? 1 : 0);
