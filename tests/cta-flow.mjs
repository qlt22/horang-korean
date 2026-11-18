// CTA state-machine regression test for the Horang lesson player.
// Usage: node /tmp/opencode/cta-flow.mjs
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4173';
const CHROME =
  process.env.CHROME_PATH || '/home/luat/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';

const browser = await chromium.launch({ executablePath: CHROME });
let failures = 0;
let page;
const errors = [];

function ok(name, cond, extra = '') {
  if (cond) console.log(`  ✓ ${name}${extra ? ' — ' + extra : ''}`);
  else {
    failures++;
    console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`);
  }
}

async function sleep(ms) {
  await page.waitForTimeout(ms);
}

async function cta() {
  return page.evaluate(() => {
    const c = document.querySelector('[data-cta]');
    return {
      label: (c?.textContent || '').replace(/\s*Enter.*$/s, '').replace(/\s+/g, ' ').trim(),
      disabled: !!c?.disabled,
      hidden: !c || getComputedStyle(c).visibility === 'hidden',
    };
  });
}

async function session() {
  return page.evaluate(() => {
    const s = window.horang?.store?.state?.session;
    if (!s) return null;
    const ex = s.items[s.index];
    return {
      index: s.index,
      total: s.items.length,
      type: ex?.type || null,
      ungraded: !!ex?.ungraded,
      answerText: ex?.answerText || '',
      answer: ex?.answer || [],
      correctIndex: (ex?.options || []).findIndex((o) => o.correct),
      pairs: (ex?.pairs || []).map((p) => p.id),
      options: (ex?.options || []).length,
    };
  });
}

async function onComplete() {
  const hash = await page.evaluate(() => location.hash);
  if (hash.includes('/complete')) return true;
  const s = await session();
  return !s;
}

async function waitForLabel(label, timeout = 6000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const c = await cta();
    if (c.label === label && !c.disabled) return c;
    await sleep(50);
  }
  return null;
}

async function waitForAdvance(prevIndex, timeout = 6000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await onComplete()) return 'complete';
    const s = await session();
    if (s && s.index !== prevIndex) return s.index;
    await sleep(50);
  }
  return 'stuck';
}

async function clickCtaSync(times = 1) {
  await page.evaluate((n) => {
    const c = document.querySelector('[data-cta]');
    for (let i = 0; i < n; i++) c?.click();
  }, times);
}

async function clickAnswer() {
  const s = await session();
  if (!s) return;
  if (s.ungraded) return;
  if (['listen_pick', 'translate_pick', 'fill_blank', 'word_pick', 'reading_q', 'dialogue_reply'].includes(s.type)) {
    if (s.correctIndex >= 0) await page.click(`[data-opt="${s.correctIndex}"]`);
    else throw new Error(`no correct option for ${s.type}`);
    return;
  }
  if (s.type === 'tile_build') {
    await page.evaluate((answer) => {
      for (const tok of answer) {
        const bank = document.querySelector('[data-bank]');
        const t = [...bank.querySelectorAll('.tile')].find((b) => b.textContent.trim() === tok);
        t?.click();
      }
    }, s.answer);
    return;
  }
  if (s.type === 'type_answer' || s.type === 'dictation') {
    await page.fill('[data-input]', s.answerText);
    return;
  }
  if (s.type === 'word_match') {
    for (const id of s.pairs) {
      await page.evaluate((pairId) => {
        document.querySelector(`.match-chip--ko[data-ko="${CSS.escape(pairId)}"]`)?.click();
        document.querySelector(`.match-chip--en[data-en="${CSS.escape(pairId)}"]`)?.click();
      }, id);
    }
    return;
  }
  if (s.type === 'say_it') {
    await page.evaluate(() => {
      document.querySelector('[data-rate="nailed"]')?.click();
    });
    return;
  }
  throw new Error(`unknown task type ${s.type}`);
}

/** One task, exactly one click per state (or 3 sync clicks per state in stress mode). */
async function playTask(mode, lessonLabel) {
  const before = await session();
  if (!before) return 'complete';
  const shot = `L${lessonLabel} #${before.index + 1}/${before.total} ${before.type}`;
  const stress = mode === 'stress';

  // Disabled CTA before any answer must do nothing (and must not be hidden).
  const pre = await cta();
  ok(`${shot}: CTA visible before answering`, !pre.hidden, `"${pre.label}"`);
  if (stress) {
    if (pre.disabled) {
      await clickCtaSync(3);
      await sleep(60);
      const s2 = await session();
      ok(`${shot}: disabled CTA clicks did not move`, !!s2 && s2.index === before.index);
    }
  }

  // Ungraded cards: "Got it" is the only state.
  if (before.ungraded) {
    const got = await waitForLabel('Got it', 2000);
    if (!got) {
      ok(`${shot}: "Got it" enabled`, false, JSON.stringify(await cta()));
      return 'stuck';
    }
    if (stress) await clickCtaSync(3);
    else await clickCtaSync(1);
    const next = await waitForAdvance(before.index);
    ok(`${shot}: advanced exactly one card`, next === before.index + 1 || next === 'complete', `${before.index} → ${next}`);
    return next;
  }

  // Answer the item (selection/typing/pairs/rating).
  await clickAnswer();
  await sleep(stress ? 30 : 80);

  // say_it and word_match grade on the answer itself and must expose Continue immediately.
  if (before.type === 'say_it' || before.type === 'word_match') {
    const cont = await waitForLabel('Continue', 1500);
    ok(`${shot}: Continue shown without a second Check`, !!cont, JSON.stringify(await cta()));
    if (!cont) return 'stuck';
    if (stress) await clickCtaSync(3);
    else await clickCtaSync(1);
    const next = await waitForAdvance(before.index);
    ok(`${shot}: advanced exactly one task`, next === before.index + 1 || next === 'complete', `${before.index} → ${next}`);
    return next;
  }

  // Everyone else: enabled Check -> Continue.
  const check = await waitForLabel('Check', 2500);
  if (!check) {
    ok(`${shot}: Check enabled after answering`, false, JSON.stringify(await cta()));
    return 'stuck';
  }
  if (stress) await clickCtaSync(3);
  else await clickCtaSync(1);

  // While grading the CTA must be visibly disabled, never enabled-but-inert.
  const mid = await cta();
  if (mid.label !== 'Continue') {
    ok(`${shot}: CTA disabled while grading`, mid.disabled, `"${mid.label}" disabled=${mid.disabled}`);
  }

  const cont = await waitForLabel('Continue', 4000);
  ok(`${shot}: Continue reached after grading`, !!cont, JSON.stringify(await cta()));
  if (!cont) return 'stuck';
  if (stress) await clickCtaSync(3);
  else await clickCtaSync(1);
  const next = await waitForAdvance(before.index);
  ok(`${shot}: advanced exactly one task`, next === before.index + 1 || next === 'complete', `${before.index} → ${next}`);
  return next;
}

async function runLesson(mode, node, label) {
  console.log(`\n=== node ${node} (${label}) · ${mode} ===`);
  if (node > 0) {
    await page.evaluate((n) => window.horang.router.go('lesson', { node: n }), node);
    await sleep(700);
  }
  for (let i = 0; i < 40; i++) {
    if (await onComplete()) break;
    const r = await playTask(mode, label);
    if (r === 'stuck' || r === 'complete') break;
  }
  await sleep(300);
  ok(`node ${node} reached #/complete`, await onComplete(), await page.evaluate(() => location.hash));
}

async function boot() {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.click('[data-start]');
  await sleep(350);
  await page.click('[data-goal="travel"]');
  await sleep(500);
  await page.click('[data-min="10"]');
  await sleep(300);
  await page.click('[data-time-continue]');
  await sleep(400);
  await page.fill('[data-name-input]', 'Lucas');
  await sleep(200);
  await page.click('[data-name-continue]');
  await sleep(500);
  await page.click('[data-start-node]');
  await sleep(800);
}

async function newPass(mode) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  page = await ctx.newPage();
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' && !/Failed to load resource|404|net::ERR/.test(t)) errors.push(t);
  });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  await boot();
  const start = await session();
  ok(`onboarding starts lesson 0`, !!start, start ? `${start.total} tasks` : 'no session');
  await runLesson(mode, 0, '0');
  await runLesson(mode, 1, '1');
  await runLesson(mode, 2, '2');
  await runLesson(mode, 3, '3');
  await runLesson(mode, 4, '4');
  await ctx.close();
}

await newPass('strict');
await newPass('stress');

console.log('\nPAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none');
if (errors.length) failures += errors.length;
console.log(failures ? `\n${failures} CHECK(S) FAILED` : '\nALL CTA FLOW CHECKS PASSED');
await browser.close();
process.exit(failures ? 1 : 0);
