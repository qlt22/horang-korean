// Retention Lab verification: runs the real 30-day simulation through the UI.
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = 'docs/screenshots';
const CHROME = process.env.CHROME_PATH || '/home/luat/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));

await page.goto(BASE + '/#/demo', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
console.log('url', page.url());
const head = await page.locator('#screen').innerText();
console.log('--- lab head ---\n' + head.slice(0, 500));
await page.screenshot({ path: `${OUT}/17-demo-day0.png` });

// Full run to Day 30
await page.locator('[data-full]').click();
await page.waitForTimeout(2500);
const st = await page.evaluate(() => JSON.parse(JSON.stringify(window.horang.state)));
console.log('\n--- after full run ---');
console.log('day:', st.day, 'xp:', st.xpTotal, 'level:', st.level);
console.log('streak:', st.streak.current, 'best:', st.streak.best);
console.log('stamps:', Object.entries(st.mastery).filter(([k, m]) => k !== 'sentence0' && m.isStamp).length);
console.log('coins:', st.coins, 'chests opened:', st.chest.totalOpened);
console.log('league joined:', st.flags.leagueJoined, 'rank:', st.league.rank, 'tier:', st.league.tier);
console.log('timeline days:', st.timeline.length);
console.log('xpByDay entries:', Object.keys(st.stats.xpByDay).length);
console.log('stampsByDay entries:', Object.keys(st.stats.stampsByDay).length);
console.log('events:', st.events.length);
console.log('fading now:', JSON.stringify(await page.evaluate(() => window.horang.store.decayReport())));
const txt = await page.locator('#screen').innerText();
console.log('\n--- lab at day 30 (excerpt) ---\n' + txt.slice(0, 900));
await page.screenshot({ path: `${OUT}/18-demo-day30.png` });
await page.screenshot({ path: `${OUT}/18b-demo-day30-full.png`, fullPage: true });

// Home as it looks after the simulated 30 days
await page.goto(BASE + '/#/home', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/19-home-day30.png` });
const homeTxt = await page.locator('#screen').innerText();
console.log('\n--- home after lab ---\n' + homeTxt.slice(0, 600));

console.log('\nCONSOLE ERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
