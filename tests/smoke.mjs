import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = 'docs/screenshots';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/home/luat/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',
});
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
console.log('title:', await page.title());
console.log('url:', page.url());
const text = await page.locator('#screen').innerText();
console.log('--- welcome text ---\n' + text.slice(0, 400));
await page.screenshot({ path: `${OUT}/00-welcome.png`, fullPage: false });

// Start onboarding
await page.click('[data-start]').catch(() => {});
await page.waitForTimeout(500);
console.log('after start url:', page.url());
console.log('--- onboarding text ---\n' + (await page.locator('#screen').innerText()).slice(0, 600));
await page.screenshot({ path: `${OUT}/01-onboarding.png` });

console.log('\nCONSOLE ERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
