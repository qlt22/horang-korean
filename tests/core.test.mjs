// Core logic tests — run with: node tests/core.test.mjs
// Shims localStorage/window so the browser modules run under Node.
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
  clear: () => mem.clear(),
};
globalThis.window = { dispatchEvent() {}, addEventListener() {}, speechSynthesis: undefined };
globalThis.CustomEvent = class {};

const store = await import('../app/js/core/store.js');
const { NODES } = await import('../app/js/core/engine.js');
const clock = await import('../app/js/core/clock.js');
const { SENTENCES } = await import('../app/js/core/quiz.js');

let pass = 0;
let fail = 0;
const results = [];
function ok(name, cond, extra = '') {
  if (cond) {
    pass++;
    results.push(`  ✓ ${name}${extra ? ' — ' + extra : ''}`);
  } else {
    fail++;
    results.push(`  ✗ ${name}${extra ? ' — ' + extra : ''}`);
  }
}
function section(t) {
  results.push(`\n${t}`);
}

store.resetState(false);

section('Curriculum');
ok('40 sentences loaded', SENTENCES.length === 40, `${SENTENCES.length}`);
ok('7 units → 14 nodes', NODES.length === 14, `${NODES.length} nodes`);
ok('every sentence has Hangul', SENTENCES.every((s) => /[가-힣]/.test(s.korean)));
ok('every sentence has 3 distractors', SENTENCES.every((s) => s.distractors?.length >= 3));

section('Level curve');
ok('L1→L2 costs 60 XP', store.xpForLevel(1) === 60, `${store.xpForLevel(1)}`);
ok('curve is monotonic', Array.from({ length: 20 }, (_, i) => store.xpForLevel(i + 1)).every((v, i, a) => i === 0 || v > a[i - 1]));
ok('level from 0 XP is 1', store.levelFromXp(0) === 1);
ok('level from 140 XP is 3', store.levelFromXp(140) === 3, `${store.levelFromXp(140)}`);

section('Node 1 session');
store.state.profile.name = 'Lucas';
store.state.profile.dailyGoalXp = 60;
const s = store.startSession('node', { nodeIndex: 0 });
ok('session starts', !!s);
ok('node 1 has sentence #0 first', s.items[0].sentenceId === 'sentence0', s.items[0].sentenceId);
ok('session has >= 9 exercises', s.items.length >= 9, `${s.items.length}`);
ok('no two identical exercise types in a row', s.items.every((it, i) => i === 0 || it.type !== s.items[i - 1].type));
const typesForHello = new Set(s.items.filter((i) => i.sentenceId === 'greet_hello').map((i) => i.type));
ok('three-touch rule on sentence 1', typesForHello.size >= 3, [...typesForHello].join(','));
ok('every item is self-describing', s.items.every((i) => i.type && i.sentenceId && i.prompt));

let xpBefore = store.state.xpTotal;
s.items.forEach((it) => {
  store.recordAnswer({ sentenceId: it.sentenceId, type: it.type, correct: true, ms: 900 });
});
ok('answers award XP', store.state.xpTotal > xpBefore, `${xpBefore} → ${store.state.xpTotal}`);
ok('3 exposures mint a stamp', store.state.mastery.greet_hello?.isStamp === true);
ok('mastery reached tier 3 (no same-session inflation)', store.state.mastery.greet_hello?.tier === 3, `tier ${store.state.mastery.greet_hello?.tier}`);
ok('combo tracked', store.state.session.combo >= 5, `combo ${store.state.session.combo}`);

const summary = store.completeNode();
ok('node completes with 3 stars (0 mistakes)', summary.stars === 3, `${summary.stars} stars`);
ok('node bonus awarded', summary.bonusXp >= 30, `+${summary.bonusXp}`);
ok('streak hit 1 from daily goal', store.state.streak.current === 1, `streak ${store.state.streak.current}`);
ok('daily goal flagged', store.state.flags.goalHitToday === true);
ok('chest slot filled', store.state.chest.slots === 1, `${store.state.chest.slots}`);
ok('node 2 now unlocked', store.isNodeUnlocked(1));
ok('node 3 still locked', !store.isNodeUnlocked(2));
ok('stamp count is 3', store.stampCount() === 3, `${store.stampCount()}`);

section('Chest + economy');
const chest = store.openChest();
ok('first chest is scripted Rare', chest?.rarity === 'rare', chest?.rarity);
ok('chest pays coins', chest.coins >= 60, `${chest.coins} coins`);
ok('chest slot consumed', store.state.chest.slots === 0);
ok('second chest cannot open with 0 slots', store.openChest() === null);

section('Quests');
store.refreshDay();
ok('3 daily quests generated', store.state.quests.items.length === 3, `${store.state.quests.items.length}`);
ok('quests have targets + rewards', store.state.quests.items.every((q) => q.target > 0 && q.rewardXp > 0));
const prog = store.questProgress(store.state.quests.items[0]);
ok('quest progress reads counters', typeof prog === 'number', `${prog}`);

section('Streak, lapse, freeze');
clock.shiftDays(1);
store.refreshDay();
ok('next day keeps streak intact', store.state.streak.current === 1, `streak ${store.state.streak.current}`);
clock.shiftDays(1);
store.refreshDay();
ok('a missed day without freeze drops streak', store.state.streak.current === 0, `streak ${store.state.streak.current}`);
ok('loss is recorded for the comeback screen', store.state.flags.prevStreak === 1, `prev ${store.state.flags.prevStreak}`);

store.state.streak.freezes = 2;
store.state.streak.lastGoalDate = clock.today();
clock.shiftDays(2);
store.refreshDay();
ok('freeze silently covers a missed day', store.state.streak.freezes === 1, `freezes ${store.state.streak.freezes}`);

section('Memory decay');
store.state.mastery.greet_thanks = { tier: 4, dueAt: clock.nowMs() - 8 * clock.DAY, lastSeenAt: 0, correct: 9, wrong: 0, exposures: 9, isStamp: true, firstDay: 0 };
store.refreshDay();
ok('8-day lapse drops exactly one tier', store.state.mastery.greet_thanks.tier === 3, `tier ${store.state.mastery.greet_thanks.tier}`);
ok('streak still capped at one tier loss', store.state.mastery.greet_thanks.tier >= 3);

section('Review queue');
store.state.mastery.greet_hello.dueAt = clock.nowMs() - 2 * clock.DAY;
const due = store.dueSentences();
ok('overdue sentence enters review queue', due.some((d) => d.id === 'greet_hello'), `${due.length} due`);
ok('fading status computed', due.find((d) => d.id === 'greet_hello')?.status === 'fading', due.find((d) => d.id === 'greet_hello')?.status);

section('Pack progress');
const helloUnit = store.packProgress('u1_greetings');
ok('pack progress counts tier≥3', helloUnit.met >= 2, `${helloUnit.met}/${helloUnit.total}`);

section('League');
store.state.league.xpWeek = 480;
const members = store.ensureLeague();
ok('league fills to 30 with pacers', members.length === 30, `${members.length}`);
ok('pacers are labelled, never fake humans', members.filter((m) => m.isPacer).length === 29);
ok('user rank computed', store.state.league.rank >= 1, `#${store.state.league.rank}`);

section('Shop');
store.state.coins = 1000;
const before = store.state.coins;
const buy = store.purchase('bg_night');
ok('cosmetic purchase works', buy.ok === true && store.state.coins === before - 300, `${before} → ${store.state.coins}`);
ok('cannot buy twice', store.purchase('bg_night').ok === false);
ok('purchase is recorded as an event', store.state.events.some((e) => e.name === 'purchase'));

console.log(results.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
