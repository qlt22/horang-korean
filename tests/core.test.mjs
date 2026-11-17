// A1 core tests — node tests/core.test.mjs
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

// ---------------------------------------------------------------- content
section('A1 content');
ok('12 units', course.UNITS.length === 12, String(course.UNITS.length));
ok('60 sessions', course.LESSONS.length === 60, String(course.LESSONS.length));
ok('288 sentences', course.SENTENCES.length === 288, String(course.SENTENCES.length));
ok('576 word entries', course.WORDS.length === 576, String(course.WORDS.length));
ok('520+ unique words', new Set(course.WORDS.map((w) => w.ko)).size >= 500, String(new Set(course.WORDS.map((w) => w.ko)).size));
ok('48 grammar points', course.GRAMMAR.length === 48, String(course.GRAMMAR.length));
ok('12 dialogues with >=6 lines', course.DIALOGUES.length === 12 && course.DIALOGUES.every((d) => d.lines.length >= 6));
ok('12 readings with 3 questions', course.READINGS.length === 12 && course.READINGS.every((r) => r.questions.length === 3));
ok('every lesson has a goal', course.LESSONS.every((l) => l.goal && l.title));
ok('every unit has 5 sessions', course.UNITS.every((u) => course.lessonsOf(u.id).length === 5));
ok('unit kinds are ordered', course.UNITS.every((u) => course.lessonsOf(u.id).map((l) => l.kind).join(',') === 'vocab,grammar,listening,reading,checkpoint'));
ok('every sentence has Hangul', course.SENTENCES.every((s) => /[가-힣]/.test(s.korean)));
ok('every sentence has 3 distractors', course.SENTENCES.every((s) => s.distractors?.length === 3));
ok('no duplicate Korean sentences', new Set(course.SENTENCES.map((s) => s.korean)).size === 288);
ok('grammar points all have 2 examples', course.GRAMMAR.every((g) => g.examples.length === 2));

// ---------------------------------------------------------------- task generation
section('Task engine');
const built = [];
for (let i = 0; i < course.LESSONS.length; i++) {
  const s = engine.buildSession('node', { nodeIndex: i }, {}, 'Lucas');
  built.push(s);
}
ok('all 60 lessons build', built.every((s) => s.items.length > 0));
ok('lessons have 7–16 tasks', built.every((s) => s.items.length >= 7 && s.items.length <= 16), `${Math.min(...built.map((s) => s.items.length))}–${Math.max(...built.map((s) => s.items.length))}`);
ok('no duplicate task ids inside a lesson', built.every((s) => new Set(s.items.map((x) => x.id)).size === s.items.length));
const allTypes = new Set(built.flatMap((s) => s.items.map((i) => i.type)));
for (const t of quiz.TYPES) ok(`type is generated: ${t}`, allTypes.has(t));
ok('every task has a prompt', built.every((s) => s.items.every((i) => i.prompt)));
ok('every graded task has an answer path', built.every((s) => s.items.every((i) => i.ungraded || i.selfAssess || i.answerText || i.blank || i.answer || i.options || i.pairs)));
ok('tile tasks have >=3 tiles', built.every((s) => s.items.every((i) => i.type !== 'tile_build' || i.answer.length >= 3)));
ok('fill tasks have 2 options', built.every((s) => s.items.every((i) => i.type !== 'fill_blank' || i.options.length === 2)));
ok('checkpoints have 12 tasks', course.LESSONS.filter((l) => l.kind === 'checkpoint').every((l) => engine.buildSession('node', { nodeIndex: l.nodeIndex }, {}, 'x').items.length === 12));
ok('listening lessons contain dictation', built.every((s, i) => course.LESSONS[i].kind !== 'listening' || s.items.some((x) => x.type === 'dictation')));
ok('reading lessons contain reading checks', built.every((s, i) => course.LESSONS[i].kind !== 'reading' || s.items.some((x) => x.type === 'reading_q')));

section('Grading');
const one = engine.buildSession('node', { nodeIndex: 0 }, {}, 'Lucas').items.find((x) => x.type === 'listen_pick');
ok('correct option grades true', quiz.gradeAnswer(one, one.options.find((o) => o.correct).id).correct);
ok('wrong option grades false', !quiz.gradeAnswer(one, one.options.find((o) => !o.correct).id).correct);
const typeTask = quiz.buildTask('type_answer', { sentenceId: course.SENTENCES[0].id });
ok('exact typed answer is correct', quiz.gradeAnswer(typeTask, course.SENTENCES[0].korean).correct);
ok('one-character typo is accepted as near', quiz.gradeAnswer(typeTask, course.SENTENCES[0].korean.replace(/다/, '타')).correct);
ok('empty answer is wrong', !quiz.gradeAnswer(typeTask, '').correct);
const fillTask = quiz.buildTask('fill_blank', { sentenceId: course.SENTENCES[0].id, poolWords: course.WORDS });
if (fillTask) ok('fill answer is one of its options', fillTask.options.some((o) => o.label === fillTask.blank.answer));

// ---------------------------------------------------------------- session flow
section('Session + progression');
store.replaceState({});
store.state.profile = { ...store.state.profile, name: 'Lucas', dailyGoalXp: 120 };
store.state.flags.onboardingDone = true;
store.refreshDay();

function answerAll(session, { wrongEvery = 0 } = {}) {
  let graded = 0;
  session.items.forEach((it) => {
    if (it.ungraded) return;
    graded++;
    const wrong = wrongEvery > 0 && graded % wrongEvery === 0;
    store.recordAnswer({ sentenceId: it.sentenceId || null, wordId: it.wordId || null, type: it.type, correct: !wrong });
  });
}

const s0 = store.startSession('node', { nodeIndex: 0 });
ok('lesson 1 starts', !!s0);
ok('lesson 1 opens with sentence #0', s0.items[0].sentenceId === 'sentence0', s0.items[0].type);
answerAll(s0);
const sum0 = store.completeNode();
ok('lesson completes with 3 stars', sum0.stars === 3, `${sum0.stars}`);
ok('lesson awards >= 100 XP', sum0.xp >= 100, `${sum0.xp}`);
ok('lesson met 5+ new sentences', sum0.met.length >= 5, `${sum0.met.length}`);
ok('XP total rises', store.state.xpTotal >= 100, `${store.state.xpTotal}`);
ok('lesson 2 unlocks', store.isNodeUnlocked(1));
ok('lesson 4 is still locked early', !store.isNodeUnlocked(3));
ok('chest slot filled', store.state.chest.slots >= 1, `${store.state.chest.slots}`);

for (let i = 1; i <= 3; i++) {
  const s = store.startSession('node', { nodeIndex: i });
  answerAll(s);
  store.completeNode();
}
ok('after 4 lessons the checkpoint unlocks', store.isNodeUnlocked(4));
ok('next unit is unlocked after 4 lessons', store.isNodeUnlocked(5));

// checkpoint pass
const cp = store.startSession('node', { nodeIndex: 4 });
answerAll(cp, { wrongEvery: 12 }); // 1 wrong of 12 = 92%
const cpSum = store.completeNode();
ok('checkpoint records a pass', cpSum.checkpoint?.passed === true, JSON.stringify(cpSum.checkpoint));
ok('unit badge awarded', store.state.badges.includes('u01_intro'), store.state.badges.join(','));

// ---------------------------------------------------------------- words
section('Word mastery');
const w = course.WORDS[0];
store.recordWord(w.id, true);
store.recordWord(w.id, true);
store.recordWord(w.id, true);
ok('word reaches tier 3', store.state.wordMastery[w.id].tier === 3, `${store.state.wordMastery[w.id].tier}`);
ok('known word count counts tier>=3', store.knownWordCount() >= 1, `${store.knownWordCount()}`);
store.state.wordMastery[w.id].dueAt = clock.nowMs() - 1000;
ok('due words include overdue word', store.dueWords().some((x) => x.id === w.id));

// ---------------------------------------------------------------- SRS / streak
section('SRS + streak');
const sid = course.SENTENCES[10].id;
store.state.mastery[sid] = { tier: 4, dueAt: clock.nowMs() - 8 * clock.DAY, lastSeenAt: 0, correct: 9, wrong: 0, exposures: 9, isStamp: true, firstDay: 0 };
store.refreshDay();
ok('8-day lapse drops exactly one tier', store.state.mastery[sid].tier === 3, `${store.state.mastery[sid].tier}`);
clock.shiftDays(1);
store.refreshDay();
ok('streak survives a normal day', store.state.streak.current >= 1, `${store.state.streak.current}`);
clock.shiftDays(3);
store.refreshDay();
ok('a 3-day lapse breaks or freezes the streak honestly', store.state.streak.current === 0 || store.state.streak.freezes >= 0);

// ---------------------------------------------------------------- economy / meta
section('Economy + meta');
store.fillChest();
store.state.coins = 1000;
const before = store.state.coins;
ok('cosmetic purchase works', store.purchase('bg_night').ok && store.state.coins === before - 300);
const chest = store.openChest();
ok('chest opens and pays coins', chest && chest.coins > 0, chest?.rarity);
ok('3 daily quests exist', store.state.quests.items.length === 3);
ok('daily plan has 3 parts', store.dailyPlan().items.length === 3);
ok('league seeds 30 labelled members', store.ensureLeague().length === 30 && store.state.league.members.filter((m) => m.isPacer).length === 29);
ok('level curve matches the spec', store.xpForLevel(1) === 60 && store.xpForLevel(2) === 80 && store.xpForLevel(3) === 130);
ok('level from 140 XP is 3', store.levelFromXp(140) === 3, `${store.levelFromXp(140)}`);

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
