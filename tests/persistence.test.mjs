// Regression: object maps must survive a reload (mergeKnown used to drop them).
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
  clear: () => mem.clear(),
};
globalThis.window = { dispatchEvent() {}, addEventListener() {} };
globalThis.CustomEvent = class {};

const store = await import('../app/js/core/store.js');
const course = await import('../app/js/core/course.js');

let pass = 0, fail = 0;
const out = [];
const ok = (n, c, e = '') => { if (c) pass++; else fail++; out.push(`  ${c ? '✓' : '✗'} ${n}${e ? ' — ' + e : ''}`); };

store.replaceState({});
const sid = course.SENTENCES[0].id;
const wid = course.WORDS[0].id;
store.state.mastery[sid] = { tier: 3, dueAt: 123, lastSeenAt: 0, correct: 3, wrong: 0, exposures: 3, isStamp: true, firstDay: 0 };
store.state.wordMastery[wid] = { tier: 2, seen: 2, correct: 2, wrong: 0, dueAt: 123, lastSeenAt: 0 };
store.state.checkpoints = { u01_intro: { passed: true, score: 92 } };
store.state.badges = ['u01_intro'];
store.state.flags.a1Exam = { passed: true, score: 27, total: 30 };
store.state.flags.bookmarks = ['s01_1_1'];
store.state.stats.xpByDay = { '2026-11-18': 140 };
store.state.engagement = { mode: 'bounties' };
store.state.inventory[0].owned = true;
store.saveNow();

const reloaded = await import('../app/js/core/store.js?reload=' + Date.now());
ok('mastery map survives reload', Object.keys(reloaded.state.mastery).length === 1, `${Object.keys(reloaded.state.mastery).length}`);
ok('mastery tier survives reload', reloaded.state.mastery[sid]?.tier === 3);
ok('word mastery survives reload', Object.keys(reloaded.state.wordMastery).length === 1);
ok('checkpoints survive reload', reloaded.state.checkpoints.u01_intro?.passed === true);
ok('badges survive reload', reloaded.state.badges.includes('u01_intro'));
ok('exam pass survives reload', reloaded.state.flags.a1Exam?.score === 27);
ok('bookmarks survive reload', reloaded.state.flags.bookmarks?.includes('s01_1_1'));
ok('xpByDay survives reload', reloaded.state.stats.xpByDay['2026-11-18'] === 140);
ok('engagement mode survives reload', reloaded.state.engagement?.mode === 'bounties');
ok('inventory ownership survives reload', reloaded.state.inventory[0].owned === true);

// corrupted save must still boot
mem.set('horang.state.v2', '{broken json');
const recovered = await import('../app/js/core/store.js?corrupt=' + Date.now());
ok('corrupted save boots to a usable state', !!recovered.state.profile && Array.isArray(recovered.state.badges));

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
