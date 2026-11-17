// End-to-end journey through the real app in real Chromium.
// Usage: node tests/e2e.mjs   (server must be running on :4173)
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.OUT || 'docs/screenshots';
const CHROME =
  process.env.CHROME_PATH || '/home/luat/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
fs.mkdirSync(OUT, { recursive: true });

const log = [];
const errors = [];
let failed = 0;
function step(msg) {
  log.push(`▸ ${msg}`);
  console.log(`▸ ${msg}`);
}
function check(name, cond, extra = '') {
  if (cond) {
    log.push(`  ✓ ${name}${extra ? ' — ' + extra : ''}`);
  } else {
    failed++;
    log.push(`  ✗ ${name}${extra ? ' — ' + extra : ''}`);
    console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`);
  }
}

const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));

async function shot(name, opts = {}) {
  await page.waitForTimeout(opts.wait ?? 450);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: !!opts.full });
}
const state = () => page.evaluate(() => JSON.parse(JSON.stringify(window.horang.state)));

async function noOverflow(label) {
  const r = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
    screenSW: document.getElementById('screen')?.scrollWidth || 0,
    screenCW: document.getElementById('screen')?.clientWidth || 0,
  }));
  check(`no horizontal overflow — ${label}`, r.sw <= r.cw + 1 && r.screenSW <= r.screenCW + 1, `${r.sw}/${r.cw}`);
}

// ---------------------------------------------------------------- welcome
step('Welcome screen');
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
check('title is Horang', (await page.title()).includes('Horang'));
check('landing headline present', (await page.locator('#screen').innerText()).includes('Learn your first Korean sentence'));
await shot('00-welcome', { wait: 300 });

// ---------------------------------------------------------------- onboarding
step('Onboarding: goal → time → name → ready');
await page.click('[data-start]');
await page.waitForTimeout(400);
await page.click('[data-goal="travel"]');
await page.waitForTimeout(500);
await page.click('[data-min="10"]');
await page.waitForTimeout(300);
await page.click('[data-time-continue]');
await page.waitForTimeout(400);
await page.fill('[data-name-input]', 'Lucas');
await page.waitForTimeout(250);
await shot('01-onboarding-name');
await page.click('[data-name-continue]');
await page.waitForTimeout(500);
await shot('02-onboarding-ready');
check('ready screen shows first node', (await page.locator('#screen').innerText()).includes('Node 1'));
const s0 = await state();
check('profile name saved', s0.profile.name === 'Lucas', s0.profile.name);
check('daily goal is 120 XP for 10 min', s0.profile.dailyGoalXp === 120, String(s0.profile.dailyGoalXp));

// ---------------------------------------------------------------- lesson
step('Node 1: answering all exercises correctly');
await page.click('[data-start-node]');
await page.waitForTimeout(600);
const first = await page.evaluate(() => {
  const s = window.horang.store.state.session;
  return s ? { type: s.items[0].type, count: s.items.length, id: s.items[0].sentenceId } : null;
});
check('lesson session started with sentence #0', first?.id === 'sentence0', first?.id);
check('session has >= 9 exercises', first?.count >= 9, String(first?.count));
await shot('03-lesson-say-it');

let answered = 0;
let capturedMid = false;
const cta = page.locator('[data-cta]');

async function clickWhenEnabled(locator, timeout = 4000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if ((await locator.count()) && (await locator.isEnabled())) {
      await locator.click();
      return true;
    }
    await page.waitForTimeout(80);
  }
  return false;
}

for (let guard = 0; guard < 24; guard++) {
  const info = await page.evaluate(() => {
    const st = window.horang.store.state;
    const s = st.session;
    if (!s) return null;
    const ex = s.items[s.index];
    if (!ex) return null;
    return {
      type: ex.type,
      index: s.index,
      total: s.items.length,
      korean: ex.korean,
      answer: ex.answer || [],
      opts: (ex.options || []).map((o) => ({ correct: !!o.correct })),
      pairs: (ex.pairs || []).map((p) => ({ id: p.id })),
    };
  });
  if (!info) break;

  if (info.type === 'listen_pick' || info.type === 'translate_pick' || info.type === 'fill_blank') {
    const idx = info.opts.findIndex((o) => o.correct);
    await page.click(`[data-opt="${idx}"]`);
  } else if (info.type === 'tile_build') {
    await page.evaluate((answer) => {
      const bank = document.querySelector('[data-bank]');
      for (const tok of answer) {
        const tile = [...bank.querySelectorAll('.tile')].find((b) => b.textContent.trim() === tok && !b.classList.contains('is-used'));
        tile?.click();
      }
    }, info.answer);
  } else if (info.type === 'speed_match') {
    await page.evaluate((pairs) => {
      for (const p of pairs) {
        document.querySelector(`.match-chip--ko[data-ko="${p.id}"]`)?.click();
        document.querySelector(`.match-chip--en[data-en="${p.id}"]`)?.click();
      }
    }, info.pairs);
  } else if (info.type === 'say_it') {
    const mic = page.locator('[data-mic]');
    if (await mic.count()) await mic.click();
    await page.waitForTimeout(150);
    const rate = page.locator('[data-rate="nailed"]');
    if (await rate.count()) await rate.click();
    await page.waitForTimeout(900);
  }

  // 1) Check (or Continue if the type self-graded)
  await clickWhenEnabled(cta, 3000);
  if (!capturedMid && answered === 3) {
    await shot('04-lesson-feedback', { wait: 200 });
    capturedMid = true;
  }
  await page.waitForTimeout(1050);
  // 2) Continue → next item (or complete screen on the last one)
  await clickWhenEnabled(cta, 3000);
  await page.waitForTimeout(450);
  answered++;

  const done = await page.evaluate(() => !window.horang.store.state.session);
  if (done) break;
}

check('answered the full node', answered >= 9, `${answered} exercises`);
await page.waitForTimeout(500);

// ---------------------------------------------------------------- complete
step('Node complete');
const urlAfter = page.url();
check('navigated to complete screen', urlAfter.includes('complete'), urlAfter);
const sum = (await state()).lastSummary;
check('summary computed', !!sum, sum ? `${sum.stars}★ ${sum.xp} XP` : 'none');
check('3 stars for a perfect run', sum?.stars === 3, String(sum?.stars));
check('stamps minted', (sum?.stamps || []).length >= 3, `${(sum?.stamps || []).length}`);
await shot('06-complete', { wait: 700 });

// ---------------------------------------------------------------- quick check
step('Quick check placement quiz');
await page.locator('.btn-primary').last().click();
await page.waitForTimeout(600);
check('quiz opened', page.url().includes('onboarding'), page.url());
for (let i = 0; i < 5; i++) {
  await page.click('[data-ans="0"]');
  await page.waitForTimeout(750);
}
await page.waitForTimeout(400);
const resultText = await page.locator('#screen').innerText();
check('placement result shown', /Level/.test(resultText), resultText.split('\n')[0]);
await shot('07-placement');
await page.click('[data-sounds-right]');
await page.waitForTimeout(400);
await page.click('[data-rem-continue]');
await page.waitForTimeout(800);

// ---------------------------------------------------------------- home
step('Home hub');
check('landed on home', page.url().includes('home'), page.url());
const s1 = await state();
check('onboarding finished', s1.flags.onboardingDone === true);
check('streak incremented', s1.streak.current >= 1, String(s1.streak.current));
check('stamps persisted', s1.mastery.greet_hello?.isStamp === true);
check('chest slot earned', s1.chest.slots >= 1, String(s1.chest.slots));
check('daily quests created', s1.quests.items.length === 3);
await shot('08-home', { wait: 800 });
await shot('08b-home-full', { wait: 200, full: true });
await noOverflow('home');

// ---------------------------------------------------------------- quests
step('Daily quests');
await page.click('[data-tab="quests"]');
await page.waitForTimeout(700);
const qtext = await page.locator('#screen').innerText();
check('quests screen renders 3 quests', (qtext.match(/Answer|Complete|Hit|Earn|Review|Listen|Say|Finish|Score|Learn/g) || []).length >= 3);
check('chest meter visible', qtext.includes('chest') || qtext.includes('Chest'));
await shot('09-quests');
await noOverflow('quests');

// ---------------------------------------------------------------- shop + chest
step('Shop + chest opening');
await page.click('[data-tab="shop"]');
await page.waitForTimeout(700);
await shot('10-shop', { wait: 600 });
await noOverflow('shop');
const openBtn = page.locator('button', { hasText: /Open chest|Open/i }).first();
if (await openBtn.count()) {
  await openBtn.click();
  await page.waitForTimeout(500);
  const chest = page.locator('.chest-btn, [data-chest]').first();
  if (await chest.count()) await chest.click();
  await page.waitForTimeout(1600);
  await shot('11-chest-open');
  const collect = page.locator('button', { hasText: /Collect/i }).first();
  if (await collect.count()) await collect.click();
  await page.waitForTimeout(500);
}

// ---------------------------------------------------------------- passport
step('Passport collection');
await page.click('[data-tab="passport"]');
await page.waitForTimeout(800);
const ptext = await page.locator('#screen').innerText();
check('passport shows stamps', ptext.includes('stamp') || ptext.includes('Stamp'));
await shot('12-passport', { wait: 600 });
await noOverflow('passport');
const stamp = page.locator('.stamp:not(.stamp--locked)').first();
if (await stamp.count()) {
  await stamp.click();
  await page.waitForTimeout(600);
  await shot('13-stamp-detail');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

// ---------------------------------------------------------------- profile
step('Profile');
await page.click('[data-tab="profile"]');
await page.waitForTimeout(800);
const prof = await page.locator('#screen').innerText();
check('profile shows level', /LV\s*\d/.test(prof));
check('profile shows accuracy', /Accuracy/i.test(prof));
await shot('14-profile', { wait: 500, full: true });
await noOverflow('profile');

// ---------------------------------------------------------------- settings
step('Settings');
await page.locator('[aria-label="Settings"], [data-settings]').first().click().catch(async () => {
  await page.goto(BASE + '/#/settings');
});
await page.waitForTimeout(700);
check('settings rendered', page.url().includes('settings'), page.url());
await shot('15-settings');

// ---------------------------------------------------------------- league
step('League');
await page.goto(BASE + '/#/league');
await page.waitForTimeout(900);
const league = await page.locator('#screen').innerText();
check('league explains day-7 gate or shows rows', /Day 7|League|promote/i.test(league));
await shot('16-league');

// ---------------------------------------------------------------- demo placeholder check
step('Retention lab');
await page.goto(BASE + '/#/demo');
await page.waitForTimeout(700);
await shot('17-demo');
await noOverflow('retention lab');

// ---------------------------------------------------------------- persistence
step('Reload persistence');
await page.goto(BASE + '/#/home');
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const s2 = await state();
check('state survives reload', s2.flags.onboardingDone === true && s2.profile.name === 'Lucas');
check('streak survives reload', s2.streak.current === s1.streak.current, `${s2.streak.current}`);

// ---------------------------------------------------------------- desktop
step('Desktop 1440×900');
const storage = await ctx.storageState();
const dctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: storage, deviceScaleFactor: 1 });
const dpage = await dctx.newPage();
dpage.on('pageerror', (e) => errors.push('DESKTOP PAGEERROR ' + e.message));
await dpage.goto(BASE + '/#/home', { waitUntil: 'networkidle' });
await dpage.waitForTimeout(1000);
await dpage.screenshot({ path: `${OUT}/20-desktop-home.png` });
await dpage.goto(BASE + '/#/passport', { waitUntil: 'networkidle' });
await dpage.waitForTimeout(800);
await dpage.screenshot({ path: `${OUT}/21-desktop-passport.png` });

console.log('\n' + log.join('\n'));
console.log(`\n${errors.length ? 'CONSOLE ERRORS:\n' + errors.join('\n') : 'CONSOLE ERRORS: none'}`);
console.log(failed ? `\n${failed} CHECKS FAILED` : '\nALL CHECKS PASSED');
await browser.close();
process.exit(failed || errors.length ? 1 : 0);
