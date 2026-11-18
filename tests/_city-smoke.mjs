import { chromium } from 'playwright';
const b=await chromium.launch({executablePath:'/home/luat/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome'});
const p=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR '+e.message)); p.on('console',m=>m.type()==='error'&&!/404|Failed/.test(m.text())&&errs.push(m.text()));
await p.goto('http://localhost:4173',{waitUntil:'networkidle'});
await p.evaluate(()=>{const s=window.horang.state;s.flags.onboardingDone=true;s.profile.name='Lucas';s.coins=5000;s.gems=5;s.city={version:1,era:1,grid:6,buildings:[],resources:{brick:300,timber:300,glass:300,steel:200,energy:50,blueprint:2},lastTick:Date.now(),lifetimeWon:0,totalBuilt:0,achievements:[],prestigeCount:0,badges:0,unbanked:0};window.horang.store.saveNow();});
await p.goto('http://localhost:4173/#/city',{waitUntil:'networkidle'}); await p.waitForTimeout(800);
console.log('tiles:', await p.locator('[data-tile]').count());
console.log('hud:', (await p.locator('.city-hud').innerText()).replace(/\n/g,' | '));
await p.screenshot({path:'docs/screenshots/city-01-empty.png'});
// place hanok on first tile
await p.locator('[data-tile]').first().click(); await p.waitForTimeout(500);
console.log('build rows:', await p.locator('[data-build]').count());
await p.locator('[data-build="hanok"]').click(); await p.waitForTimeout(700);
const s1=await p.evaluate(()=>{const c=window.horang.state.city;return {n:c.buildings.length,coins:window.horang.state.coins,brick:c.resources.brick,ach:c.achievements};});
console.log('after build:', s1);
await p.screenshot({path:'docs/screenshots/city-02-built.png'});
// inspect + upgrade
await p.locator('[data-tile]').first().click(); await p.waitForTimeout(500);
console.log('inspector:', (await p.locator('.sheet').innerText()).split('\n').slice(0,7).join(' | '));
await p.locator('[data-up]').click(); await p.waitForTimeout(700);
console.log('after upgrade:', await p.evaluate(()=>window.horang.state.city.buildings[0]?.level));
// achievements
await p.locator('[data-ach]').click(); await p.waitForTimeout(500);
console.log('ach rows:', await p.locator('.ach').count(), 'earned:', await p.locator('.ach.is-earned').count());
await p.screenshot({path:'docs/screenshots/city-03-achievements.png'});
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
console.log('errors:', errs.length?errs:'none');
await b.close();
