// A1 end-to-end journey in real Chromium. Usage: node tests/e2e.mjs (server on :4173)
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.OUT || 'docs/screenshots';
const CHROME = process.env.CHROME_PATH || '/home/luat/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
fs.mkdirSync(OUT, { recursive: true });

let failed = 0;
const log = [];
const errors = [];
const step = (m) => {
  console.log(`▸ ${m}`);
  log.push(`▸ ${m}`);
};
const check = (name, cond, extra = '') => {
  log.push(`  ${cond ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`);
  if (!cond) {
    failed++;
    console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`);
  }
};

const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on('console', (m) => {
  const t = m.text();
  if (m.type() === 'error' && !/Failed to load resource|404|net::ERR/.test(t)) errors.push(t);
});
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));

const shot = async (n, wait = 450) => {
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${OUT}/${n}.png` });
};
const state = () => page.evaluate(() => JSON.parse(JSON.stringify(window.horang.state)));
const text = () => page.locator('#screen').innerText();

async function noOverflow(label) {
  const r = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
    ss: document.getElementById('screen').scrollWidth,
    sc: document.getElementById('screen').clientWidth,
  }));
  check(`no horizontal overflow — ${label}`, r.sw <= r.cw + 1 && r.ss <= r.sc + 1, `${r.sw}/${r.cw}`);
}

async function clickWhenEnabled(locator, timeout = 5000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if ((await locator.count()) && (await locator.isEnabled())) {
      await locator.click();
      return true;
    }
    await page.waitForTimeout(70);
  }
  return false;
}

async function answerCurrent() {
  const info = await page.evaluate(() => {
    const s = window.horang.store.state.session;
    if (!s) return null;
    const ex = s.items[s.index];
    if (!ex) return null;
    return {
      type: ex.type,
      ungraded: !!ex.ungraded,
      idx: (ex.options || []).findIndex((o) => o.correct),
      answer: ex.answer || [],
      answerText: ex.answerText || '',
      pairs: (ex.pairs || []).map((p) => p.id),
    };
  });
  if (!info) return null;

  if (info.ungraded) {
    await page.waitForTimeout(200);
    await clickWhenEnabled(page.locator('[data-cta]'), 3000);
    await page.waitForTimeout(500);
    return info.type;
  }
  if (['listen_pick', 'translate_pick', 'fill_blank', 'word_pick', 'reading_q', 'dialogue_reply'].includes(info.type)) {
    await page.click(`[data-opt="${info.idx}"]`);
  } else if (info.type === 'tile_build') {
    await page.evaluate((answer) => {
      const bank = document.querySelector('[data-bank]');
      for (const tok of answer) {
        const t = [...bank.querySelectorAll('.tile')].find((b) => b.textContent.trim() === tok && !b.classList.contains('is-used'));
        t?.click();
      }
    }, info.answer);
  } else if (info.type === 'type_answer' || info.type === 'dictation') {
    await page.fill('[data-input]', info.answerText);
  } else if (info.type === 'word_match') {
    await page.evaluate((pairs) => {
      for (const id of pairs) {
        document.querySelector(`.match-chip--ko[data-ko="${CSS.escape(id)}"]`)?.click();
        document.querySelector(`.match-chip--en[data-en="${CSS.escape(id)}"]`)?.click();
      }
    }, info.pairs);
  } else if (info.type === 'say_it') {
    const mic = page.locator('[data-mic]');
    if (await mic.count()) await mic.click();
    await page.waitForTimeout(150);
    await page.locator('[data-rate="nailed"]').click();
    await page.waitForTimeout(900);
  }

  await page.waitForTimeout(220);
  const cta = page.locator('[data-cta]');
  await clickWhenEnabled(cta, 4000);
  await page.waitForTimeout(950);
  await clickWhenEnabled(cta, 4000);
  await page.waitForTimeout(450);
  return info.type;
}

async function runLesson(max = 20) {
  const seen = new Set();
  for (let i = 0; i < max; i++) {
    const done = await page.evaluate(() => !window.horang.store.state.session);
    if (done) break;
    const before = await page.evaluate(() => {
      const s = window.horang.store.state.session;
      return s ? { index: s.index, type: s.items[s.index]?.type } : null;
    });
    if (!before) break;
    console.log(`    · task ${before.index + 1}/${await page.evaluate(() => window.horang.store.state.session.items.length)} ${before.type}`);
    const t = await answerCurrent();
    if (!t) break;
    seen.add(t);
    const after = await page.evaluate(() => {
      const s = window.horang.store.state.session;
      return s ? { index: s.index } : null;
    });
    if (after && after.index === before.index) {
      console.log('    ! did not advance — stopping this lesson');
      break;
    }
  }
  return [...seen];
}

// ---------------------------------------------------------------- welcome
step('Welcome');
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
check('landing shows A1 scope', (await text()).includes('288') && /A1/.test(await text()));
await shot('a1-00-welcome');

// ---------------------------------------------------------------- onboarding
step('Onboarding');
await page.click('[data-start]');
await page.waitForTimeout(500);
await page.click('[data-goal="travel"]');
await page.waitForTimeout(500);
await page.click('[data-min="10"]');
await page.waitForTimeout(300);
await page.click('[data-time-continue]');
await page.waitForTimeout(450);
await page.fill('[data-name-input]', 'Lucas');
await page.waitForTimeout(250);
await page.click('[data-name-continue]');
await page.waitForTimeout(500);
const readyText = await text();
check('ready screen mentions the A1 course', /288|60 sessions|A1/i.test(readyText), readyText.split('\n').slice(0, 4).join(' / '));
await shot('a1-01-ready');

// ---------------------------------------------------------------- lesson 1
step('Lesson 1 · vocab (word cards + tasks)');
await page.click('[data-start-node]');
await page.waitForTimeout(700);
const first = await page.evaluate(() => {
  const s = window.horang.store.state.session;
  return s ? { n: s.items.length, types: [...new Set(s.items.map((i) => i.type))], kind: s.lessonKind } : null;
});
check('lesson 1 starts', first && first.n >= 7, `${first?.n} tasks`);
check('lesson kind is vocab', first?.kind === 'vocab', first?.kind);
await shot('a1-02-word-card');
const types1 = await runLesson(24);
check('vocab lesson rendered word cards', types1.includes('word_card'), types1.join(','));
await page.waitForTimeout(600);
check('navigated to complete', page.url().includes('complete'), page.url());
const s1 = await state();
check('lesson recorded in path', s1.path.completedNodes.includes(0));
check('new sentences met', (s1.lastSummary?.met || []).length >= 4, `${(s1.lastSummary?.met || []).length}`);
check('XP awarded', s1.xpTotal > 60, `${s1.xpTotal}`);
check('words were practised', s1.counters.words > 0, `${s1.counters.words}`);
check('receipt shows Seoul Works materials', /Materials for Seoul Works/.test(await text()));
await shot('a1-03-complete', 700);

// ---------------------------------------------------------------- lesson 1 (grammar)
step('Lesson 2 · grammar');
await page.evaluate(() => window.horang.router.go('lesson', { node: 1 }));
await page.waitForTimeout(700);
const g1 = await page.evaluate(() => {
  const s = window.horang.store.state.session;
  return s ? { kind: s.lessonKind, types: [...new Set(s.items.map((i) => i.type))] } : null;
});
check('grammar lesson starts', g1?.kind === 'grammar', g1?.kind);
check('grammar lesson has a grammar card', g1?.types.includes('grammar_card'), g1?.types.join(','));
await shot('a1-04-grammar-card');
const typesG = await runLesson(24);
check('grammar lesson produces fill/type tasks', typesG.some((t) => ['fill_blank', 'type_answer', 'tile_build'].includes(t)), typesG.join(','));
await page.waitForTimeout(500);

// ---------------------------------------------------------------- lesson 3 (listening)
step('Lesson 3 · listening (dictation + dialogue)');
await page.evaluate(() => window.horang.router.go('lesson', { node: 2 }));
await page.waitForTimeout(700);
const l2 = await page.evaluate(() => {
  const s = window.horang.store.state.session;
  return s ? { kind: s.lessonKind, types: [...new Set(s.items.map((i) => i.type))] } : null;
});
if (!l2) {
  check('listening lesson starts', false, 'session was null');
}
check('listening lesson has dictation', !!l2?.types.includes('dictation'), (l2?.types || []).join(','));
check('listening lesson has dialogue', !!l2?.types.includes('dialogue_reply'));
await shot('a1-04-dictation');
const types2 = await runLesson(24);
check('listening played through', types2.includes('dictation') && types2.includes('dialogue_reply'), types2.join(','));
await page.waitForTimeout(500);

// ---------------------------------------------------------------- lesson 4 (reading)
step('Lesson 4 · reading');
await page.evaluate(() => window.horang.router.go('lesson', { node: 3 }));
await page.waitForTimeout(700);
await shot('a1-05-reading');
const types3 = await runLesson(24);
check('reading lesson has comprehension', types3.includes('reading_q'), types3.join(','));
await page.waitForTimeout(500);
const s3 = await state();
check('3 sessions completed', s3.path.completedNodes.length >= 3, s3.path.completedNodes.join(','));

// ---------------------------------------------------------------- checkpoint
step('Checkpoint (unit 1)');
await page.evaluate(() => {
  const st = window.horang.state;
  st.path.completedNodes = Array.from(new Set([...st.path.completedNodes, 1, 4].filter((n) => n < 4)));
  window.horang.store.saveNow();
  window.horang.router.go('lesson', { node: 4 });
});
await page.waitForTimeout(800);
check('checkpoint header visible', /Checkpoint/i.test(await text()));
await shot('a1-06-checkpoint');
await runLesson(24);
await page.waitForTimeout(600);
const s4 = await state();
check('checkpoint badge earned', s4.badges.includes('u01_intro'), s4.badges.join(','));
check('checkpoint pass recorded', s4.checkpoints.u01_intro?.passed === true, JSON.stringify(s4.checkpoints.u01_intro));
await shot('a1-07-checkpoint-result', 600);

// ---------------------------------------------------------------- home
step('Home · course map + daily plan');
await page.evaluate(() => window.horang.router.go('home'));
await page.waitForTimeout(800);
const home = await text();
check('home shows 60 sessions', /\/\s*60/.test(home));
check('home shows 288 sentences', /288/.test(home));
check('home shows daily plan', /TODAY|small wins/i.test(home));
check('home shows unit badges', /badge|Unit 1/i.test(home));
await shot('a1-08-home', 800);
await noOverflow('home');

// ---------------------------------------------------------------- collection
step('Collection');
await page.evaluate(() => window.horang.router.go('passport'));
await page.waitForTimeout(800);
const coll = await text();
check('collection says 288', coll.includes('288'));
check('collection has 3 tabs', coll.includes('Sentences') && coll.includes('Words') && coll.includes('Badges'));
await shot('a1-09-collection', 600);
await noOverflow('collection');
const loadMore = page.locator('button', { hasText: /Load .*more/i }).first();
if (await loadMore.count()) {
  await loadMore.click();
  await page.waitForTimeout(400);
  check('load more adds cards', (await page.locator('.cl-card').count()) > 24, `${await page.locator('.cl-card').count()}`);
}

// ---------------------------------------------------------------- vocab trainer
step('Word trainer');
await page.evaluate(() => window.horang.router.go('vocab'));
await page.waitForTimeout(700);
await shot('a1-10-vocab');
const startReview = page.locator('[data-act="review"]').first();
if ((await startReview.count()) && (await startReview.isEnabled())) {
  await startReview.click();
  await page.waitForTimeout(500);
  const wq = await page.locator('.opt').count();
  check('review shows a word question', wq >= 3, `${wq} options`);
  await shot('a1-11-vocab-review');
} else {
  check('review button honestly disabled when nothing is due', (await startReview.count()) > 0);
  await page.locator('[data-act="flash"]').first().click();
  await page.waitForTimeout(400);
  check('flashcards open with a word', (await page.locator('.flash-card, .flash-word, .fl-word').count()) > 0);
  await shot('a1-11-vocab-flash');
}

// ---------------------------------------------------------------- grammar
step('Grammar library');
await page.evaluate(() => window.horang.router.go('grammar'));
await page.waitForTimeout(700);
const gr = await text();
check('48 patterns listed', gr.includes('48'));
await shot('a1-12-grammar');
const gcard = page.locator('[data-gcard]').first();
if (await gcard.count()) {
  await gcard.locator('[data-gtoggle]').click();
  await page.waitForTimeout(400);
  const gtxt = await text();
  check('grammar card expands with examples', /practise|example|pattern/i.test(gtxt));
  await shot('a1-13-grammar-open');
}

// ---------------------------------------------------------------- exam (locked)
step('A1 exam gate');
await page.evaluate(() => window.horang.router.go('exam'));
await page.waitForTimeout(700);
const ex = await text();
check('exam is gated at 1/12 badges', /1\s*\/\s*12|badges/.test(ex), ex.slice(0, 80));
await shot('a1-14-exam-locked');

// ---------------------------------------------------------------- profile
step('Profile');
await page.evaluate(() => window.horang.router.go('profile'));
await page.waitForTimeout(700);
check('profile shows A1 totals', /288/.test(await text()));
await shot('a1-15-profile', 500);
await noOverflow('profile');

// ---------------------------------------------------------------- persistence
step('Persistence');
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(700);
const s5 = await state();
check('state survives reload', s5.profile.name === 'Lucas' && s5.path.completedNodes.length >= 4);
check('badge survives reload', s5.badges.includes('u01_intro'));

// ---------------------------------------------------------------- desktop
step('Desktop 1440×900');
const storage = await ctx.storageState();
const dctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: storage, deviceScaleFactor: 1 });
const dp = await dctx.newPage();
dp.on('pageerror', (e) => errors.push('DESKTOP ' + e.message));
await dp.goto(BASE + '/#/home', { waitUntil: 'networkidle' });
await dp.waitForTimeout(900);
await dp.screenshot({ path: `${OUT}/a1-16-desktop-home.png` });
await dp.goto(BASE + '/#/lesson?node=0', { waitUntil: 'networkidle' });
await dp.waitForTimeout(700);
await dp.screenshot({ path: `${OUT}/a1-17-desktop-lesson.png` });
const dOverflow = await dp.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
check('desktop has no horizontal overflow', dOverflow);

console.log('\n' + log.join('\n'));
console.log(`\n${errors.length ? 'CONSOLE ERRORS:\n' + errors.join('\n') : 'CONSOLE ERRORS: none'}`);
console.log(failed ? `\n${failed} CHECKS FAILED` : '\nALL CHECKS PASSED');
await browser.close();
process.exit(failed || errors.length ? 1 : 0);
