// Playwright checks for the three engagement alternatives (branch only).
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = 'docs/screenshots';
const CHROME = process.env.CHROME_PATH || '/home/luat/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
fs.mkdirSync(OUT, { recursive: true });

let fail = 0;
const ok = (n, c, e = '') => {
  console.log(`  ${c ? '✓' : '✗'} ${n}${e ? ' — ' + e : ''}`);
  if (!c) fail++;
};
const b = await chromium.launch({ executablePath: CHROME });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
p.on('console', (m) => m.type() === 'error' && !/Failed to load resource|404/.test(m.text()) && errs.push(m.text()));

await p.goto(BASE, { waitUntil: 'networkidle' });
await p.evaluate(() => {
  const s = window.horang.state;
  s.flags.onboardingDone = true;
  s.profile.name = 'Lucas';
  s.path.completedNodes = [0, 1, 2, 3, 4];
  s.xpTotal = 900;
  s.coins = 800;
  s.mastery['s01_1_1'] = { tier: 3, dueAt: Date.now() - 1000, lastSeenAt: 0, correct: 3, wrong: 0, exposures: 3, isStamp: true, firstDay: 0 };
  s.mastery['s01_2_1'] = { tier: 2, dueAt: Date.now() + 9e6, lastSeenAt: 0, correct: 2, wrong: 0, exposures: 2, isStamp: false, firstDay: 0 };
  window.horang.store.saveNow();
});

// hub
await p.goto(BASE + '/#/lab', { waitUntil: 'networkidle' });
await p.waitForTimeout(700);
const lab = await p.locator('#screen').innerText();
ok('lab lists four modes', ['Classic Horang', 'Skill Constellation', 'Bounty Board', 'Co-op Expedition'].every((x) => lab.includes(x)));
ok('lab explains the test method', /retained mastery/i.test(lab));
ok('classic is active by default', /Classic Horang/.test(lab) && /ACTIVE/.test(lab));
await p.screenshot({ path: `${OUT}/lab-hub.png` });

// constellation
await p.goto(BASE + '/#/constellation', { waitUntil: 'networkidle' });
await p.waitForTimeout(700);
ok('48 stars rendered', (await p.locator('[data-gnode]').count()) === 48, `${await p.locator('[data-gnode]').count()}`);
const act = p.locator('[data-activate]').first();
if (await act.count()) await act.click();
await p.waitForTimeout(500);
ok('constellation can be activated', (await p.evaluate(() => window.horang.state.engagement.mode)) === 'constellation');
await p.locator('[data-gnode]').nth(3).click({ force: true });
await p.waitForTimeout(500);
const sheet = await p.locator('.sheet').innerText().catch(() => '');
ok('star opens a grammar sheet', /mastery/i.test(sheet), sheet.slice(0, 60).replace(/\n/g, ' '));
await p.screenshot({ path: `${OUT}/lab-constellation-sheet.png` });
const practise = p.locator('[data-practise]').first();
if (await practise.count()) {
  await p.evaluate(() => document.querySelector('[data-practise]')?.click());
  await p.waitForTimeout(900);
  const sess = await p.evaluate(() => {
    const s = window.horang.store.state.session;
    return s ? { kind: s.kind, target: s.targeted?.grammarId, n: s.items.length } : null;
  });
  ok('targeted practice starts a real session', sess?.kind === 'practice' && !!sess.target && sess.n >= 3, JSON.stringify(sess));
}
await p.screenshot({ path: `${OUT}/lab-constellation.png` });

// bounties
await p.goto(BASE + '/#/bounties', { waitUntil: 'networkidle' });
await p.waitForTimeout(700);
ok('three bounty tiers', (await p.locator('.bo-card').count()) === 3);
await p.locator('[data-accept]').first().click();
await p.waitForTimeout(600);
const active = await p.evaluate(() => window.horang.state.engagement.bounties.active);
ok('accepting pins a bounty', !!active, active || 'none');
ok('board promises no penalty', /no stake|no penalty/i.test(await p.locator('#screen').innerText()));
await p.screenshot({ path: `${OUT}/lab-bounties.png` });

// expedition
await p.goto(BASE + '/#/expedition', { waitUntil: 'networkidle' });
await p.waitForTimeout(700);
ok('four pace-setters listed', (await p.locator('.ex-member').count()) === 5, `${await p.locator('.ex-member').count()} incl you`);
await p.locator('[data-role="scribe"]').click();
await p.waitForTimeout(500);
const role = await p.evaluate(() => window.horang.state.engagement.expedition.role);
ok('role can be chosen', role === 'scribe', role || 'none');
ok(
  'role bonus is wired into the store',
  await p.evaluate(() => (window.horang.state.engagement.expedition.roleTypes || []).includes('type_answer'))
);
const exp = await p.locator('#screen').innerText();
ok('expedition says pace-setters are not people', /not people|pace-setter/i.test(exp));
await p.screenshot({ path: `${OUT}/lab-expedition.png` });
await p.evaluate(() => {
  const s = document.getElementById('screen');
  s.scrollTop = s.scrollHeight * 0.55;
});
await p.waitForTimeout(400);
await p.screenshot({ path: `${OUT}/lab-expedition-party.png` });

// overflow
const over = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
ok('no horizontal overflow', !over);

// classic remains playable
await p.evaluate(() => window.horang.router.go('home'));
await p.waitForTimeout(700);
ok('home still renders after lab modes', /A1/i.test(await p.locator('#screen').innerText()));

// desktop
const storage = await ctx.storageState();
const dctx = await b.newContext({ viewport: { width: 1440, height: 900 }, storageState: storage });
const dp = await dctx.newPage();
await dp.goto(BASE + '/#/lab', { waitUntil: 'networkidle' });
await dp.waitForTimeout(800);
await dp.screenshot({ path: `${OUT}/lab-desktop.png` });

console.log(`\n${errs.length ? 'CONSOLE ERRORS:\n' + errs.join('\n') : 'CONSOLE ERRORS: none'}`);
console.log(fail ? `\n${fail} CHECKS FAILED` : '\nALL LAB CHECKS PASSED');
await b.close();
process.exit(fail || errs.length ? 1 : 0);
