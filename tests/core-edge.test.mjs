// Edge-case harness for Horang core state/progression.
// node tests/core-edge.test.mjs
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
const clock = await import('../app/js/core/clock.js');
const course = await import('../app/js/core/course.js');
const engine = await import('../app/js/core/engine.js');
const quiz = await import('../app/js/core/quiz.js');

let pass = 0;
let fail = 0;
const out = [];
const ok = (name, cond, extra = '') => {
  if (cond) pass++;
  else fail++;
  out.push(`  ${cond ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`);
};
const section = (t) => out.push(`\n${t}`);

function answerSession(session, { wrongEvery = 0, repeat = 0 } = {}) {
  let graded = 0;
  session.items.forEach((it) => {
    if (it.ungraded) return;
    graded++;
    const wrong = wrongEvery > 0 && graded % wrongEvery === 0;
    for (let i = 0; i <= repeat; i++) {
      store.recordAnswer({
        sentenceId: it.sentenceId || null,
        wordId: it.wordId || null,
        type: it.type,
        correct: !wrong,
      });
    }
  });
}

// Refresh state to a clean, onboarded learner.
function fresh() {
  store.replaceState({});
  store.state.profile = { ...store.state.profile, name: 'Lucas', dailyGoalXp: 120 };
  store.state.flags.onboardingDone = true;
  store.refreshDay();
}

// ------------------------------------------------ content / session building
section('Session builder invariants');
const kinds = ['node', 'review', 'daily', 'practice'];
const sessions = [];
for (let i = 0; i < course.LESSONS.length; i++) sessions.push(['node', { nodeIndex: i }, engine.buildSession('node', { nodeIndex: i }, {}, 'Lucas')]);
for (const kind of kinds.filter((k) => k !== 'node')) sessions.push([kind, {}, engine.buildSession(kind, {}, {}, 'Lucas')]);
for (const g of course.GRAMMAR) sessions.push(['practice', { grammarId: g.id }, engine.buildSession('practice', { grammarId: g.id }, {}, 'Lucas')]);
sessions.push(['practice', { grammarId: 'does-not-exist' }, engine.buildSession('practice', { grammarId: 'does-not-exist' }, {}, 'Lucas')]);

ok('every session has at least 1 item', sessions.every(([, , s]) => s.items.length > 0), `${sessions.filter(([, , s]) => !s.items.length).length} empty`);
const supported = new Set(quiz.TYPES);
ok(
  'every item has a player-supported type',
  sessions.every(([, , s]) => s.items.every((it) => supported.has(it.type))),
  JSON.stringify([...new Set(sessions.flatMap(([, , s]) => s.items.map((i) => i.type)).filter((t) => !supported.has(t)))])
);
ok(
  'no item has a null/empty prompt',
  sessions.every(([, , s]) => s.items.every((it) => typeof it.prompt === 'string' && it.prompt.length > 0)),
  sessions.flatMap(([, , s]) => s.items.filter((it) => !it.prompt).map((it) => `${it.type}:${it.id}`)).slice(0, 5).join(', ')
);
ok(
  'every graded item has a valid answer path',
  sessions.every(([, , s]) =>
    s.items.every(
      (it) =>
        it.ungraded ||
        it.selfAssess ||
        (it.type === 'word_match' && it.pairs?.length >= 3) ||
        (it.options?.length >= 2 && it.options.some((o) => o.correct)) ||
        (it.type === 'tile_build' && Array.isArray(it.answer) && it.answer.length >= 3) ||
        (it.type === 'fill_blank' && it.blank?.answer && it.options?.some((o) => o.label === it.blank.answer)) ||
        ((it.type === 'type_answer' || it.type === 'dictation') && it.answerText)
    )
  )
);
ok(
  'no duplicate item ids',
  sessions.every(([, , s]) => new Set(s.items.map((i) => i.id)).size === s.items.length)
);
ok(
  'all targeted grammar practices have >= 4 items',
  sessions.filter(([, p]) => p.grammarId && p.grammarId !== 'does-not-exist').every(([, , s]) => s.items.length >= 4),
  sessions.filter(([, p, s]) => p.grammarId && p.grammarId !== 'does-not-exist' && s.items.length < 4).length
);
ok('unknown grammar practice still builds a playable session', sessions.find(([, p]) => p.grammarId === 'does-not-exist')[2].items.length > 0);

ok(
  'all items can be graded with their own correct answer',
  sessions.every(([, , s]) =>
    s.items.every((it) => {
      if (it.ungraded || it.selfAssess) return true;
      let value;
      if (it.type === 'tile_build') value = it.answer;
      else if (it.type === 'fill_blank') value = it.blank.answer;
      else if (it.type === 'type_answer' || it.type === 'dictation') value = it.answerText;
      else if (it.type === 'word_match') return true;
      else value = it.options.find((o) => o.correct)?.id;
      return quiz.gradeAnswer(it, value).correct;
    })
  )
);

// ------------------------------------------------ unlock progression
section('Unlock progression');
fresh();
function playNode(i, opts) {
  const s = store.startSession('node', { nodeIndex: i });
  if (!s) return null;
  answerSession(s, opts);
  return store.completeNode();
}
ok('lesson 0 starts', !!store.startSession('node', { nodeIndex: 0 }));
ok('lesson 1 is locked at boot', !store.isNodeUnlocked(1));
ok('nextLessonIndex starts at 0', engine.nextLessonIndex([]) === 0);
for (let i = 0; i < 60; i++) {
  const sum = playNode(i, { wrongEvery: i % 5 === 4 ? 4 : 0 }); // checkpoints pass with 75% -> fail
  if (!sum) {
    ok(`session ${i + 1} starts`, false);
    break;
  }
  if ((i + 1) % 5 === 0) {
    // after each unit's 4 lessons + checkpoint: next unit must be unlocked
    const nextUnitFirst = i + 1;
    if (nextUnitFirst < 60) ok(`session ${nextUnitFirst + 1} unlocked after checkpoint ${i + 1}`, store.isNodeUnlocked(nextUnitFirst));
  }
}
ok('all 60 sessions completed', store.state.path.completedNodes.length === 60, `${store.state.path.completedNodes.length}`);
ok('course completion detected', store.state.path.completedNodes.length >= 60);
ok('course pointer is past the final lesson', store.state.path.currentNode === 60, `${store.state.path.currentNode}`);
ok('no dangling session after the final lesson', store.state.session === null);
ok('nextLessonIndex never returns a locked node on a full save', store.isNodeUnlocked(engine.nextLessonIndex(store.state.path.completedNodes)) || store.state.path.completedNodes.includes(engine.nextLessonIndex(store.state.path.completedNodes)));

// Partial / corrupted completion paths
const partials = [
  [],
  [0],
  [0, 1, 2, 3],
  [0, 1, 2, 3, 4],
  [0, 1, 2, 3, 5],
  [0, 2, 3],
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [59],
  [0, 1, 2, 3, 4, 5, 6, 7, 8],
];
const nextLocked = partials.filter((done) => {
  const next = engine.nextLessonIndex(done);
  return !done.includes(next) && !engine.nodeUnlocked(next, done);
});
ok('nextLessonIndex returns an unlocked node for partial saves', nextLocked.length === 0, JSON.stringify(nextLocked));

// ------------------------------------------------ double-call safety
section('completeNode double-call');
fresh();
playNode(0);
const afterFirst = {
  xp: store.state.xpTotal,
  coins: store.state.coins,
  nodes: store.state.counters.nodes,
  completed: store.state.path.completedNodes.length,
  chestSlots: store.state.chest.slots,
  sessions: store.state.stats.sessions,
};
const beforeSessionXP = afterFirst.xp;
const beforeCoins = afterFirst.coins;
const beforeChest = afterFirst.chestSlots;
const second = store.completeNode();
ok('second completeNode returns null', second === null);
ok('second call does not award XP', store.state.xpTotal === beforeSessionXP);
ok('second call does not award coins', store.state.coins === beforeCoins);
ok('second call does not push duplicate node', store.state.path.completedNodes.length === afterFirst.completed);
ok('second call does not fill another chest', store.state.chest.slots === beforeChest);
ok('session is null after completion', store.state.session === null);

// double recordAnswer on the same item (UI replay) should not corrupt the session
const sDup = store.startSession('node', { nodeIndex: 1 });
let thrown = null;
try {
  answerSession(sDup, { repeat: 1 });
} catch (e) {
  thrown = e;
}
ok('repeated answers do not throw', !thrown, thrown?.message);
const dupSum = store.completeNode();
ok('duplicated answers still complete', !!dupSum);
ok('session cleared after duplicated-answer completion', store.state.session === null);

// completeNode when no session
ok('completeNode with no session returns null', store.completeNode() === null);

// ------------------------------------------------ recordAnswer edge cases
section('recordAnswer edges');
fresh();
let crash = null;
try {
  store.recordAnswer({ sentenceId: null, wordId: null, type: 'word_pick', correct: true });
  store.recordAnswer({ sentenceId: null, wordId: 'w01_01', type: 'word_pick', correct: true });
} catch (e) {
  crash = e;
}
ok('recordAnswer tolerates null ids and no session', !crash, crash?.message);
let crash2 = null;
try {
  store.recordAnswer({ sentenceId: course.SENTENCES[0].id, wordId: null, type: 'listen_pick', correct: true });
} catch (e) {
  crash2 = e;
}
ok('recordAnswer tolerates a sentence answer with no session', !crash2, crash2?.message);

// Session XP must be credited exactly once (the player also mirrors res.xp).
fresh();
const xpSession = store.startSession('node', { nodeIndex: 0 });
const item = xpSession.items.find((it) => it.sentenceId && it.sentenceId !== 'sentence0' && !it.ungraded);
const xpRes = store.recordAnswer({ sentenceId: item.sentenceId, type: item.type, correct: true });
ok('session XP is not double-counted by recordAnswer', xpSession.xp === xpRes.xp, `session=${xpSession.xp} res=${xpRes.xp}`);
ok('answer XP is added to total XP', store.state.xpTotal >= xpRes.xp, `${store.state.xpTotal}`);

// Old / malformed session fields must not crash the answer path.
const sBad = store.startSession('node', { nodeIndex: 0 });
delete sBad.mistakes;
delete sBad.met;
delete sBad.strong;
let crash3 = null;
try {
  store.recordAnswer({ sentenceId: course.SENTENCES[0].id, type: 'listen_pick', correct: false });
} catch (e) {
  crash3 = e;
}
ok('recordAnswer repairs old sessions without mistakes/met/strong', !crash3, crash3?.message);
store.state.session = sBad;
ok('completeNode handles old sessions without met/strong', (() => {
  try {
    return !!store.completeNode();
  } catch {
    return false;
  }
})());

// checkpoint scoring
fresh();
for (let i = 0; i < 4; i++) playNode(i);
const cpS = store.startSession('node', { nodeIndex: 4 });
answerSession(cpS, { wrongEvery: 5 }); // 12 items => 2 wrong => 83%
const cpSum = store.completeNode();
ok('checkpoint accuracy uses graded answers', cpSum.accuracy > 0.8, `${cpSum.accuracy}`);
ok('checkpoint pass >= 80', cpSum.checkpoint?.passed === true, JSON.stringify(cpSum.checkpoint));
const cpFailS = store.startSession('node', { nodeIndex: 4 });
answerSession(cpFailS, { wrongEvery: 2 }); // 50%
const cpFail = store.completeNode();
ok('checkpoint fail recorded', cpFail.checkpoint?.passed === false, JSON.stringify(cpFail.checkpoint));
ok('failing a checkpoint does not lock the next unit', store.isNodeUnlocked(5));

// ------------------------------------------------ randomized runs
section('Random answer runs');
fresh();
let randomCrash = null;
let randomBad = 0;
const randomKinds = ['review', 'daily', 'practice'];
for (let run = 0; run < 20; run++) {
  const kind = randomKinds[run % randomKinds.length];
  const s = store.startSession(kind, {});
  if (!s) {
    randomBad++;
    continue;
  }
  try {
    s.items.forEach((it) => {
      if (it.ungraded) return;
      const correct = Math.random() < 0.5;
      let value;
      if (it.type === 'tile_build') value = correct ? it.answer : [];
      else if (it.type === 'fill_blank') value = correct ? it.blank.answer : '___';
      else if (it.type === 'type_answer' || it.type === 'dictation') value = correct ? it.answerText : '';
      else if (it.type === 'word_match') value = null;
      else value = it.options.find((o) => !!o.correct === correct)?.id;
      const graded = it.type === 'word_match' ? correct : quiz.gradeAnswer(it, value).correct;
      store.recordAnswer({ sentenceId: it.sentenceId || null, wordId: it.wordId || null, type: it.type, correct: graded });
    });
    const sum = store.completeNode();
    if (!sum || store.state.session !== null || !Number.isFinite(sum.xp) || !Number.isFinite(sum.accuracy)) randomBad++;
  } catch (e) {
    randomCrash = e;
    break;
  }
}
ok('20 randomized wrong/correct runs complete cleanly', !randomCrash && randomBad === 0, randomCrash?.message || `${randomBad} bad`);

// Repeated checkpoint passes must not mint duplicate badges or gems.
fresh();
for (let i = 0; i < 4; i++) playNode(i);
const cp1 = store.startSession('node', { nodeIndex: 4 });
answerSession(cp1);
store.completeNode();
const badgeCount = store.state.badges.length;
const checkpointAt = store.state.checkpoints.u01_intro.at;
const cp2 = store.startSession('node', { nodeIndex: 4 });
answerSession(cp2);
const cp2Sum = store.completeNode();
ok('retrying a passed checkpoint keeps one badge', store.state.badges.length === badgeCount && cp2Sum.checkpoint.passed);
ok('retrying a passed checkpoint does not rewrite the pass record', store.state.checkpoints.u01_intro.at === checkpointAt);

// ------------------------------------------------ rewards
section('Reward edges');
fresh();
store.state.counters.xp = store.state.profile.dailyGoalXp;
const goal1 = store.checkDailyGoal();
const coinsAfterGoal = store.state.coins;
const goal2 = store.checkDailyGoal();
ok('daily goal awards once per day', goal1 === true && goal2 === false);
ok('daily goal does not pay coins twice', store.state.coins === coinsAfterGoal);
ok('daily goal starts the streak', store.state.streak.current === 1, `${store.state.streak.current}`);

fresh();
store.state.quests.items = [
  { id: 'q1', template: 'correct', slot: 'easy', title: 'x', metric: 'correct', target: 1, rewardXp: 10, rewardCoins: 10, done: false, rerolled: false },
];
store.state.counters.correct = 1;
const firstQuests = store.checkQuests();
const coinsAfterQuest = store.state.coins;
const secondQuests = store.checkQuests();
ok('quest completes on the first check', firstQuests.length >= 1 && store.state.quests.items[0].done);
ok('quest reward is not paid twice', secondQuests.length === 0 && store.state.coins === coinsAfterQuest);

// ------------------------------------------------ save/load robustness
section('Save/load robustness');
const KEY = store.STORAGE_KEY;
function bootFrom(raw) {
  mem.clear();
  if (raw !== undefined) mem.set(KEY, raw);
  // Re-import with a cache-busting query so module-level load() runs again.
  return import(`../app/js/core/store.js?boot=${Math.random()}`);
}
function bootLegacy(key, raw) {
  mem.clear();
  mem.set(key, raw);
  return import(`../app/js/core/store.js?boot=${Math.random()}`);
}

for (const [label, raw] of [
  ['invalid JSON', '{not json'],
  ['null literal', 'null'],
  ['empty object', '{}'],
  ['version 2 with almost nothing', JSON.stringify({ version: 2 })],
  ['version 2 with broken nested fields', JSON.stringify({ version: 2, profile: { name: 'Lucas' }, path: {}, counters: null, stats: null, settings: {}, wordMastery: null, mastery: null, checkpoints: null, badges: null, quests: null, chest: null, streak: null, flags: null, league: null, inventory: null })],
  ['version 2 with a partial session', JSON.stringify({ version: 2, session: { kind: 'node', nodeIndex: 0, items: [{ type: 'say_it', prompt: 'hi', sentenceId: 's01_1_1', selfAssess: true }], index: 0, startedAt: Date.now() } })],
  ['old version 1 save', JSON.stringify({ version: 1, xpTotal: 400, path: { completedNodes: [0, 1] }, profile: { name: 'Old' } })],
]) {
  let mod = null;
  let err = null;
  try {
    mod = await bootFrom(raw);
    // Touch the parts main.js/refreshDay touches on boot.
    mod.refreshDay();
    mod.levelInfo();
    mod.dailyPlan();
    mod.nextBestAction();
    mod.decayReport();
    mod.dueSentences();
    mod.dueWords();
    mod.stampCount();
  } catch (e) {
    err = e;
  }
  ok(`boots from ${label} without crashing`, !err, err?.message);
  if (mod && !err) {
    const st = mod.state;
    ok(`  ${label}: usable profile/path/counters`, !!st.profile?.name !== undefined && Array.isArray(st.path?.completedNodes) && !!st.counters?.date);
  }
}

// replaceState with partial nested objects
const booted = await bootFrom(null);
let replaceErr = null;
try {
  booted.replaceState({ profile: { name: 'Partial' }, path: { completedNodes: [0, 1] } });
  booted.refreshDay();
  booted.levelInfo();
} catch (e) {
  replaceErr = e;
}
ok('replaceState fills missing nested defaults', !replaceErr, replaceErr?.message);
ok('replaceState keeps provided path progress', booted.state.path.completedNodes.join(',') === '0,1');
ok('replaceState keeps provided profile name', booted.state.profile.name === 'Partial');
ok('replaceState fills path.currentNode', booted.state.path.currentNode === 2, `${booted.state.path.currentNode}`);
ok('replaceState leaves no null containers', !!booted.state.counters?.date && !!booted.state.stats && !!booted.state.wordMastery && Array.isArray(booted.state.badges));

// legacy + jumbled session shapes
let legacyMod = null;
let legacyErr = null;
try {
  legacyMod = await bootLegacy('horang.state.v1', JSON.stringify({ version: 1, xpTotal: 455, profile: { name: 'Old' }, path: { completedNodes: [0, 1, 2] } }));
  legacyMod.refreshDay();
  legacyMod.levelInfo();
} catch (e) {
  legacyErr = e;
}
ok('old v1 key migrates without crashing', !legacyErr, legacyErr?.message);
ok('old v1 key preserves XP and progress', legacyMod?.state.xpTotal === 455 && legacyMod?.state.path.completedNodes.length === 3);
ok('migration writes a v2 save', !!mem.get(KEY) && JSON.parse(mem.get(KEY)).version === 2);

const badSession = await bootFrom(
  JSON.stringify({
    version: 2,
    session: {
      kind: 'node',
      nodeIndex: 0,
      index: 9,
      items: [{ type: 'not_a_real_task', prompt: 'nope' }, { type: 'say_it', prompt: 'hi', sentenceId: 's01_1_1', selfAssess: true }],
      mistakes: null,
      met: 'nope',
      strong: null,
    },
  })
);
ok('corrupt session drops unsupported items', badSession.state.session?.items.length === 1, `${badSession.state.session?.items.length}`);
ok('corrupt session gets safe arrays and index', badSession.state.session?.index === 0 && Array.isArray(badSession.state.session?.mistakes) && Array.isArray(badSession.state.session?.met));
ok('corrupt session is still resumable', (() => {
  try {
    badSession.state.session.index = 0;
    badSession.recordAnswer({ sentenceId: 's01_1_1', type: 'say_it', correct: true });
    return true;
  } catch {
    return false;
  }
})());

// resetState
let resetErr = null;
try {
  booted.resetState();
  booted.refreshDay();
} catch (e) {
  resetErr = e;
}
ok('resetState returns a usable state', !resetErr, resetErr?.message);
ok('resetState keeps settings by default', booted.state.settings.sound === true);

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
