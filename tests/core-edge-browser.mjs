// Browser-level edge checks for core state: persistence, migration, routing.
// node tests/core-edge-browser.mjs   (requires the dev server on :4173)
import { chromium } from 'playwright';

const B = 'http://localhost:4173';
const CHROME = '/home/luat/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const b = await chromium.launch({ executablePath: CHROME });
let p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
const errs = [];
function watch(page) {
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => m.type() === 'error' && !/404|Failed to load/.test(m.text()) && errs.push('console: ' + m.text()));
}
watch(p);

let pass = 0;
let fail = 0;
const out = [];
const ok = (name, cond, extra = '') => {
  if (cond) pass++;
  else fail++;
  out.push(`  ${cond ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`);
};
const section = (t) => out.push(`\n${t}`);

const snap = () =>
  p.evaluate(() => {
    const s = window.horang?.store?.state?.session;
    const c = document.querySelector('[data-cta]');
    return {
      hash: location.hash,
      i: s?.index,
      n: s?.items?.length,
      type: s?.items?.[s.index]?.type,
      cta: (c?.textContent || '').replace(/Enter.*/, '').replace(/tap the words/i, '').trim(),
      dis: c?.disabled,
      session: !!s,
    };
  });

async function bootFresh() {
  await p.goto(B, { waitUntil: 'networkidle' });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: 'networkidle' });
  await p.click('[data-start]');
  await p.waitForTimeout(350);
  await p.click('[data-goal="travel"]');
  await p.waitForTimeout(450);
  await p.click('[data-min="10"]');
  await p.waitForTimeout(250);
  await p.click('[data-time-continue]');
  await p.waitForTimeout(400);
  await p.fill('[data-name-input]', 'Lucas');
  await p.waitForTimeout(200);
  await p.click('[data-name-continue]');
  await p.waitForTimeout(450);
  await p.click('[data-start-node]');
  await p.waitForTimeout(800);
}

async function setSave(raw, key = 'horang.state.v2') {
  // Seed storage in an init script so the app's own debounced save can never
  // overwrite the fixture before boot.
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();
  watch(page);
  await page.addInitScript(
    ({ raw, key }) => {
      if (sessionStorage.getItem('__seeded')) return;
      localStorage.clear();
      localStorage.setItem(key, raw);
      sessionStorage.setItem('__seeded', '1');
    },
    { raw, key }
  );
  await page.goto(B, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  try {
    await p.context().close();
  } catch {
    /* old page already gone */
  }
  p = page;
}

async function waitCta(label, ms = 3000) {
  const cta = p.locator('[data-cta]');
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const txt = ((await cta.textContent().catch(() => '')) || '').replace(/Enter.*/, '').replace(/tap the words/i, '').trim();
    if (txt === label && !(await cta.isDisabled().catch(() => true))) return true;
    await p.waitForTimeout(80);
  }
  return false;
}

async function answerCurrent(s) {
  const t = s.type;
  if (['listen_pick', 'translate_pick', 'fill_blank', 'word_pick', 'reading_q', 'dialogue_reply'].includes(t)) {
    const idx = await p.evaluate(() => {
      const session = window.horang.store.state.session;
      return session.items[session.index].options.findIndex((o) => o.correct);
    });
    await p.click(`[data-opt="${idx}"]`);
    return 'option';
  }
  if (t === 'tile_build') {
    await p.evaluate(() => {
      const session = window.horang.store.state.session;
      const ex = session.items[session.index];
      for (const tok of ex.answer) {
        const el = [...document.querySelectorAll('[data-bank] .tile')].find(
          (x) => x.textContent.trim() === tok && !x.classList.contains('is-placed')
        );
        el?.click();
      }
    });
    return 'tiles';
  }
  if (t === 'type_answer' || t === 'dictation') {
    const ans = await p.evaluate(() => {
      const session = window.horang.store.state.session;
      return session.items[session.index].answerText;
    });
    await p.fill('[data-input]', ans);
    return 'typed';
  }
  if (t === 'word_match') {
    const ids = await p.evaluate(() => {
      const session = window.horang.store.state.session;
      return session.items[session.index].pairs.map((x) => x.id);
    });
    for (const id of ids) {
      await p.click(`.match-chip--ko[data-ko="${id}"]`, { timeout: 1500 }).catch(() => {});
      await p.click(`.match-chip--en[data-en="${id}"]`, { timeout: 1500 }).catch(() => {});
      await p.waitForTimeout(60);
    }
    return 'matched';
  }
  if (t === 'say_it') {
    await p.locator('[data-rate="nailed"]').click({ timeout: 1500 }).catch(() => {});
    return 'rated';
  }
  return 'card';
}

/** Play the current item through exactly one intentional click per state. */
async function playOne(s) {
  await answerCurrent(s);
  if (s.type === 'word_card' || s.type === 'grammar_card') {
    await waitCta('Got it');
    await p.locator('[data-cta]').click();
  } else if (s.type === 'say_it' || s.type === 'word_match') {
    // Rating/match grades immediately; the CTA is already Continue.
    if (!(await waitCta('Continue', 4000))) return false;
    await p.locator('[data-cta]').click();
  } else {
    if (!(await waitCta('Check'))) return false;
    await p.locator('[data-cta]').click();
    if (!(await waitCta('Continue', 4000))) return false;
    await p.locator('[data-cta]').click();
  }
  await p.waitForTimeout(450);
  return true;
}

// ---------------------------------------------------------------- progression
section('Lesson progression past task 4');
await bootFresh();
const seen = [];
let stuck = false;
for (let step = 0; step < 8; step++) {
  const s = await snap();
  if (!s.session) break;
  if (s.i !== seen[seen.length - 1]) seen.push(s.i);
  const moved = await playOne(s);
  const after = await snap();
  if (!moved || (after.session && after.i === s.i)) {
    stuck = true;
    out.push(`    stuck at index ${s.i} (${s.type}) cta=${after.cta} disabled=${after.dis}`);
    break;
  }
}
ok('player advances past the 4th task', !stuck && seen.includes(4) && seen.includes(5), `seen=${seen.join(',')}`);
ok('progress is monotonic (no skipped items)', seen.every((v, i) => i === 0 || v > seen[i - 1]), seen.join(','));

// ---------------------------------------------------------------- reload/resume
section('Reload mid-session');
const beforeReload = await snap();
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(700);
const resumed = await snap();
ok('mid-session save survives reload', resumed.session === true, `before=${beforeReload.i} after=${resumed.i}`);
ok('reload resumes the same item', resumed.i === beforeReload.i && resumed.type === beforeReload.type, `${beforeReload.i}/${beforeReload.type} -> ${resumed.i}/${resumed.type}`);

let completed = false;
for (let step = 0; step < 20; step++) {
  const s = await snap();
  if (!s.session) {
    completed = s.hash.includes('complete');
    break;
  }
  if (!(await playOne(s))) break;
  const after = await snap();
  if (after.session && after.i === s.i) break;
}
ok('resumed session can still finish', completed, (await snap()).hash);
ok('completion is routed to the receipt', (await p.evaluate(() => location.hash)).includes('complete'));
const savedAfter = await p.evaluate(() => JSON.parse(localStorage.getItem('horang.state.v2') || '{}'));
ok('completed node persisted', Array.isArray(savedAfter.path?.completedNodes) && savedAfter.path.completedNodes.includes(0));
ok('session cleared in the persisted save', savedAfter.session === null);

// ---------------------------------------------------------------- migration/corruption
section('Corrupted and legacy saves');
const goodFlags = { onboardingDone: true, signedUp: true };
await setSave(
  JSON.stringify({
    version: 2,
    profile: { name: 'Corrupt' },
    flags: goodFlags,
    counters: null,
    stats: null,
    quests: null,
    chest: null,
    streak: null,
    settings: {},
    wordMastery: null,
    mastery: null,
    checkpoints: null,
    badges: null,
    league: null,
    inventory: null,
    path: {},
    engagement: 'broken',
  })
);
let bootInfo = await p.evaluate(() => ({
  hash: location.hash,
  hasHome: !!document.querySelector('[data-tab="home"]'),
  title: document.title,
  session: !!window.horang?.store?.state?.session,
}));
ok('corrupt v2 save boots a usable screen', bootInfo.hasHome && !bootInfo.session, JSON.stringify(bootInfo));
await p.click('[data-tab="home"]');
await p.waitForTimeout(400);
ok('tabs are clickable after corrupt save', (await p.evaluate(() => location.hash)) === '#/home');

await setSave(JSON.stringify({ version: 1, xpTotal: 777, profile: { name: 'Legacy' }, flags: goodFlags, path: { completedNodes: [0, 1, 2, 3] } }));
const legacy = await p.evaluate(() => ({
  hash: location.hash,
  xp: window.horang?.store?.state?.xpTotal,
  nodes: window.horang?.store?.state?.path?.completedNodes?.length,
  hasV2: !!localStorage.getItem('horang.state.v2'),
}));
ok('v1 save in the v2 slot migrates', legacy.xp === 777 && legacy.nodes === 4, JSON.stringify(legacy));
ok('migrated save is written back as v2', legacy.hasV2);

await setSave(
  JSON.stringify({ version: 1, xpTotal: 321, profile: { name: 'OldKey' }, flags: { onboardingDone: true }, path: { completedNodes: [0] } }),
  'horang.state.v1'
);
const oldKey = await p.evaluate(() => ({
  xp: window.horang?.store?.state?.xpTotal,
  v2: !!localStorage.getItem('horang.state.v2'),
  hash: location.hash,
}));
ok('legacy horang.state.v1 key migrates', oldKey.xp === 321 && oldKey.v2, JSON.stringify(oldKey));

// ---------------------------------------------------------------- routing edges
section('Routing edges');
await setSave(JSON.stringify({ version: 2, profile: { name: 'Locked' }, flags: goodFlags, path: { completedNodes: [], currentNode: 0 } }));
await p.goto(`${B}/#/lesson?node=5`, { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
const blocked = await p.evaluate(() => ({
  text: document.querySelector('#screen')?.innerText || '',
  hash: location.hash,
  session: !!window.horang?.store?.state?.session,
}));
ok('deep link to a locked node shows a blocked screen', /still locked/i.test(blocked.text) && !blocked.session, blocked.text.slice(0, 60));
await p.click('[data-go="home"]');
await p.waitForTimeout(400);
ok('blocked screen can navigate back to Learn', (await p.evaluate(() => location.hash)) === '#/home');

await p.goto(`${B}/#/definitely-not-a-screen`, { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
const unknown = await p.evaluate(() => ({ hash: location.hash, title: document.title, home: !!document.querySelector('[data-tab="home"]') }));
ok('unknown hash falls back to a real screen', unknown.hash === '#/home' && unknown.home, JSON.stringify(unknown));

// Route change must clear a leftover overlay sheet.
await p.evaluate(() => {
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  scrim.innerHTML = '<div class="sheet">old sheet</div>';
  document.body.appendChild(scrim);
  window.horang.router.go('quests');
});
await p.waitForTimeout(400);
ok('route change removes leftover overlays', (await p.evaluate(() => document.querySelectorAll('.scrim').length)) === 0);

ok('no page errors across the whole browser run', errs.length === 0, errs.slice(0, 4).join(' | '));

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
await b.close();
process.exit(fail ? 1 : 0);
