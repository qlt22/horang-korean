// 60-day A1 retention simulation through the real UI.
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = 'docs/screenshots';
const CHROME = process.env.CHROME_PATH || '/home/luat/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: CHROME });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
p.on('console', (m) => m.type() === 'error' && !/Failed to load resource|404/.test(m.text()) && errs.push(m.text()));

await p.goto(BASE + '/#/demo', { waitUntil: 'networkidle' });
await p.waitForTimeout(900);
console.log('start day', await p.evaluate(() => window.horang.state.day));
await p.screenshot({ path: `${OUT}/a1-demo-day0.png` });

await p.locator('[data-full]').click();
await p.waitForTimeout(4000);
const st = await p.evaluate(() => JSON.parse(JSON.stringify(window.horang.state)));
const met = Object.values(st.mastery).filter((m) => m.tier >= 1).length - (st.mastery.sentence0 ? 1 : 0);
const strong = Object.values(st.mastery).filter((m) => m.tier >= 3).length;
console.log({
  day: st.day,
  sessions: st.path.completedNodes.length,
  badges: st.badges.length,
  met,
  strong,
  words: Object.keys(st.wordMastery).length,
  xp: st.xpTotal,
  level: st.level,
  streak: st.streak.current,
  best: st.streak.best,
  coins: st.coins,
  chests: st.chest.totalOpened,
  league: st.league.rank,
  timeline: st.timeline.length,
  xpDays: Object.keys(st.stats?.xpByDay || {}).length,
});
await p.screenshot({ path: `${OUT}/a1-demo-day60.png` });
await p.evaluate(() => { document.getElementById('screen').scrollTop = document.getElementById('screen').scrollHeight * 0.45; });
await p.waitForTimeout(400);
await p.screenshot({ path: `${OUT}/a1-demo-timeline.png` });
await p.evaluate(() => { document.getElementById('screen').scrollTop = 0; });
await p.goto(BASE + '/#/home', { waitUntil: 'networkidle' });
await p.waitForTimeout(900);
await p.screenshot({ path: `${OUT}/a1-home-day60.png` });
console.log('errors', errs.length ? errs : 'none');
await b.close();
