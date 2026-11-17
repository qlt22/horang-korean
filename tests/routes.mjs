import { chromium } from 'playwright';
const BASE='http://localhost:4173';
const b=await chromium.launch({executablePath:'/home/luat/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome'});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
const p=await ctx.newPage();
let errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR '+e.message)); p.on('console',m=>m.type()==='error'&&!/Failed to load resource|404/.test(m.text())&&errs.push(m.text()));
await p.goto(BASE,{waitUntil:'networkidle'});
// seed a plausible mid-course save
await p.evaluate(()=>{const s=window.horang.state;s.flags.onboardingDone=true;s.profile.name='Lucas';s.profile.dailyGoalXp=120;s.path.completedNodes=[0,1,2,3];s.path.currentNode=4;s.xpTotal=1200;s.coins=900;s.gems=4;s.streak={current:4,best:6,lastGoalDate:null,freezes:1,repairUsedAt:null};s.badges=['u01_intro'];s.checkpoints={u01_intro:{passed:true,score:92}};for(const sid of ['s01_1_1','s01_1_2','s01_2_1','s01_2_2','s02_1_1']){s.mastery[sid]={tier:3,dueAt:Date.now()-1000,lastSeenAt:0,correct:3,wrong:0,exposures:3,isStamp:true,firstDay:0};}s.wordMastery['w01_01']={tier:3,seen:4,correct:3,wrong:1,dueAt:Date.now()-1000,lastSeenAt:0};window.horang.store.saveNow();});
for(const route of ['home','quests','shop','league','passport','profile','settings','vocab','grammar','exam','demo']){
  errs=[];
  await p.goto(`${BASE}/#/${route}`,{waitUntil:'networkidle'}); await p.waitForTimeout(700);
  const txt=(await p.locator('#screen').innerText()).replace(/\n/g,' | ').slice(0,220);
  console.log(`\n#/${route}  ${errs.length?'ERRORS: '+errs.join(' ; '):'ok'}`);
  console.log('  '+txt);
  await p.screenshot({path:`docs/screenshots/a1-route-${route}.png`});
}
await b.close();
