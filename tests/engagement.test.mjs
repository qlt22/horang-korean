// Logic tests for the gamification-lab alternatives.
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
const eng = await import('../app/js/core/engagement.js');
const course = await import('../app/js/core/course.js');

let pass = 0;
let fail = 0;
const out = [];
const ok = (n, c, extra = '') => {
  if (c) pass++;
  else fail++;
  out.push(`  ${c ? '✓' : '✗'} ${n}${extra ? ' — ' + extra : ''}`);
};
const section = (t) => out.push(`\n${t}`);

store.replaceState({});
store.state.flags.onboardingDone = true;
store.state.profile.name = 'Lucas';
store.state.profile.dailyGoalXp = 120;
store.refreshDay();

section('Lab shell');
ok('classic is the default mode', eng.mode() === 'classic');
ok('engagement state initialised', !!store.state.engagement);
ok('mode switches', eng.setMode('constellation') && eng.mode() === 'constellation');
ok('unknown mode rejected', eng.setMode('nonsense') === false);

section('Skill Constellation');
const nodes = eng.constellationNodes();
const clusters = eng.constellationClusters();
ok('48 grammar stars', nodes.length === 48, `${nodes.length}`);
ok('12 constellations', clusters.length === 12, `${clusters.length}`);
ok('every node has coordinates', nodes.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y)));
ok('unit 1 stars are unlocked', nodes.filter((n) => n.unitId === 'u01_intro').every((n) => n.unlocked));
ok('advanced units start locked', nodes.filter((n) => n.unitId === 'u12_travel').every((n) => !n.unlocked));
const g01 = nodes.find((n) => n.id === 'g01');
ok('a grammar star covers several sentences', g01.total >= 2, `${g01.total}`);
ok('unlit star has zero strength', g01.strength === 0);

const sid = course.SENTENCES.find((s) => s.grammarIds.includes('g01')).id;
store.state.mastery[sid] = { tier: 1, dueAt: 0, lastSeenAt: 0, correct: 1, wrong: 0, exposures: 1, isStamp: false, firstDay: 0 };
const g01b = eng.constellationNodes().find((n) => n.id === 'g01');
ok('mastery lights the star', g01b.strength > 0, `${g01b.met}/${g01b.total}`);
eng.markConstellationPractice('g01');
ok('practice is recorded', store.state.engagement.constellation.practiced.g01 === 1);

section('Targeted practice session');
const engine = await import('../app/js/core/engine.js');
const targeted = engine.buildSession('practice', { grammarId: 'g01' }, store.state.mastery, 'Lucas');
ok('targeted session builds', targeted.items.length >= 4, `${targeted.items.length}`);
ok('targeted session remembers its grammar', targeted.targeted?.grammarId === 'g01');
ok('targeted tasks are all g01 sentences', targeted.items.every((i) => course.SENTENCE_BY_ID[i.sentenceId]?.grammarIds.includes('g01')));

section('Bounty Board');
const board = eng.ensureBounties();
ok('three bounties', board.items.length === 3);
ok('one of each tier', ['safe', 'risky', 'epic'].every((t) => board.items.some((b) => b.tier === t)));
const safe = board.items.find((b) => b.tier === 'safe');
ok('accept works', eng.acceptBounty(safe.id) && eng.activeBounty()?.id === safe.id);
ok('claim blocked before target', eng.claimBounty(safe.id) === null);
store.state.counters[safe.metric] = safe.target;
const beforeCoins = store.state.coins;
const claimed = eng.claimBounty(safe.id);
ok('claim pays the reward', !!claimed && store.state.coins === beforeCoins + claimed.reward.coins, `+${claimed?.reward?.coins}`);
ok('claim is idempotent', eng.claimBounty(safe.id) === null);
ok('bounty day is today', board.date === store.state.counters.date);

section('Co-op Expedition');
eng.setMode('expedition');
ok('role is required before bonuses', eng.roleBonusFor('type_answer') === 1);
ok('role can be chosen', eng.chooseRole('scribe'));
ok('role types stored for the store hook', store.state.engagement.expedition.roleTypes?.includes('type_answer'));
ok('scribe boosts typing', eng.roleBonusFor('type_answer') === 1.1);
ok('scribe does not boost listening', eng.roleBonusFor('listen_pick') === 1);
const exp = eng.expeditionData();
ok('four pace-setters', exp.npcs.length === 4 && exp.npcs.every((n) => n.isPacer));
ok('weekly goal is set', exp.goal === 2400 && exp.total >= 0);
ok('chapters exist', exp.chapters.length === 5);

section('Role bonus in the real XP path');
store.state.session = null;
const sa = course.SENTENCES[0].id;
const sb = course.SENTENCES[1].id;
const xpBefore = store.state.xpTotal;
store.recordAnswer({ sentenceId: sa, type: 'type_answer', correct: true, critOverride: false });
const typedXp = store.state.xpTotal - xpBefore;
const xpBefore2 = store.state.xpTotal;
store.recordAnswer({ sentenceId: sb, type: 'listen_pick', correct: true, critOverride: false });
const listenXp = store.state.xpTotal - xpBefore2;
ok('typing pays more than listening under Scribe', typedXp > listenXp, `${typedXp} vs ${listenXp}`);

section('Mode does not break the core');
ok('core still awards XP', store.state.xpTotal > 0);
ok('core still fills quests', Array.isArray(store.state.quests.items) && store.state.quests.items.length === 3);
ok('classic can be restored', eng.setMode('classic') && eng.mode() === 'classic');

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
