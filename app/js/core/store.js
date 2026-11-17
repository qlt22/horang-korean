// Horang game state. Single source of truth; everything persists to localStorage.
import { NODES, UNIT_META, buildSession, sentence0, starsFor, nodeUnlocked, nextLessonIndex } from './engine.js';
import { lessonAt, UNIT_BY_ID, lessonsOf, unitProgress as courseUnitProgress } from './course.js';
import { blankMastery, grade, dueStatus, decayCheck, nextDueLabel } from './srs.js';
import { SENTENCES, BY_ID } from './quiz.js';
import { WORD_BY_ID, wordsOf } from './course.js';
import * as clock from './clock.js';
import { nowMs, today, DAY } from './clock.js';

export const STORAGE_KEY = 'horang.state.v2';
export const APP_VERSION = '0.1.0';

export const DAILY_GOALS = { 5: 60, 10: 120, 15: 180 };
export const RANKS = [
  { min: 32, label: 'Master', ko: '달인' },
  { min: 22, label: 'Seoulite', ko: '서울 사람' },
  { min: 14, label: 'Speaker', ko: '말하는 사람' },
  { min: 8, label: 'Storyteller', ko: '이야기꾼' },
  { min: 4, label: 'Explorer', ko: '탐험가' },
  { min: 1, label: 'Sprout', ko: '새싹' },
];

export const GOALS = {
  travel: { id: 'travel', label: 'Travel & talk', emoji: '🗣️', sub: 'Order food, ask directions, survive Seoul.' },
  kdrama: { id: 'kdrama', label: 'K-dramas & music', emoji: '🎬', sub: 'Stop reading subtitles.' },
  work: { id: 'work', label: 'Work & study', emoji: '💼', sub: 'TOPIK-ready, formal Korean.' },
  curious: { id: 'curious', label: 'Just curious', emoji: '🌱', sub: 'Start from zero, no pressure.' },
};

export const INVENTORY_SEED = [
  { id: 'outfit_hoodie', name: 'Seoul Hoodie', kind: 'cosmetic', price: 450, art: '🧥', owned: false, equipped: false },
  { id: 'outfit_chef', name: 'Café Chef Horang', kind: 'cosmetic', price: 700, art: '👨‍🍳', owned: false, equipped: false },
  { id: 'outfit_hanbok', name: 'Hanbok Horang', kind: 'cosmetic', price: 1200, art: '👘', owned: false, equipped: false },
  { id: 'bg_night', name: 'Night Market', kind: 'background', price: 300, art: '🌃', owned: false, equipped: false },
  { id: 'bg_hangang', name: 'Hangang Sunset', kind: 'background', price: 300, art: '🌅', owned: false, equipped: false },
  { id: 'flair_gold', name: 'Gold Frame', kind: 'flair', price: 250, art: '🖼️', owned: false, equipped: false },
];

export const QUEST_POOL = [
  { key: 'correct', title: 'Answer {n} correctly', metric: 'correct', target: 5, icon: 'check' },
  { key: 'node', title: 'Complete {n} lesson', metric: 'nodes', target: 1, icon: 'quests' },
  { key: 'goal', title: 'Hit your daily XP goal', metric: 'xp', target: null, icon: 'target' },
  { key: 'crit', title: 'Earn {n} crits', metric: 'crits', target: 2, icon: 'sparkle' },
  { key: 'fading', title: 'Review {n} fading sentences', metric: 'fadingReviews', target: 3, icon: 'refresh' },
  { key: 'combo', title: 'Get a {n}-answer combo', metric: 'comboBest', target: 5, icon: 'flame' },
  { key: 'stars3', title: 'Finish a lesson with 3 stars', metric: 'stars3', target: 1, icon: 'star' },
  { key: 'listen', title: 'Listen to {n} sentences', metric: 'listens', target: 5, icon: 'sound' },
  { key: 'say', title: 'Say {n} sentences out loud', metric: 'said', target: 3, icon: 'user' },
  { key: 'new', title: 'Learn {n} new sentences', metric: 'newSentences', target: 2, icon: 'sparkle' },
  { key: 'words', title: 'Practise {n} words', metric: 'words', target: 6, icon: 'book' },
  { key: 'reading', title: 'Finish a reading check', metric: 'reading', target: 1, icon: 'book' },
];

// ---------- level curve ----------
function round10(n) {
  return Math.round(n / 10) * 10;
}
export function xpForLevel(L) {
  // Matches the tuned curve in research 01 §4.2: 60, 80, 130, 190, 260, 340…
  if (L === 2) return 80;
  return round10(60 + 25 * Math.pow(Math.max(0, L - 1), 1.5));
}
export function cumulativeXpFor(L) {
  let sum = 0;
  for (let i = 1; i < L; i++) sum += xpForLevel(i);
  return sum;
}
export function levelFromXp(xp) {
  let L = 1;
  let acc = 0;
  while (acc + xpForLevel(L) <= xp && L < 60) {
    acc += xpForLevel(L);
    L++;
  }
  return L;
}
export function rankForLevel(level) {
  return RANKS.find((r) => level >= r.min) || RANKS[RANKS.length - 1];
}
export function levelInfo() {
  const level = levelFromXp(state.xpTotal);
  const base = cumulativeXpFor(level);
  const need = xpForLevel(level);
  const into = state.xpTotal - base;
  return {
    level,
    into,
    need,
    remaining: Math.max(0, need - into),
    pct: Math.max(0, Math.min(100, (into / need) * 100)),
    rank: rankForLevel(level).label,
    rankKo: rankForLevel(level).ko,
    total: state.xpTotal,
  };
}

// ---------- state ----------
function freshCounters() {
  return {
    date: today(),
    correct: 0,
    crits: 0,
    nodes: 0,
    stars3: 0,
    listens: 0,
    said: 0,
    comboBest: 0,
    newSentences: 0,
    fadingReviews: 0,
    speed8: 0,
    xp: 0,
    chests: 0,
    reviews: 0,
    words: 0,
    reading: 0,
    typed: 0,
    perfectLesson: 0,
  };
}

export function freshState() {
  return {
    version: 2,
    createdAt: clock.now().toISOString(),
    lastSeenAt: clock.now().toISOString(),
    profile: {
      name: '',
      avatar: 'tiger',
      goal: 'curious',
      minutes: 10,
      dailyGoalXp: 120,
      reminderTime: '19:30',
    },
    xpTotal: 0,
    level: 1,
    coins: 0,
    gems: 0,
    coinCarry: 0,
    focus: 5,
    focusUpdatedAt: nowMs(),
    streak: { current: 0, best: 0, lastGoalDate: null, freezes: 0, repairUsedAt: null },
    mastery: {},
    wordMastery: {},
    checkpoints: {},
    badges: [],
    path: { completedNodes: [], currentNode: 0 },
    session: null,
    lastSummary: null,
    chest: { slots: 0, openedToday: 0, pityRare: 0, pityEpic: 0, date: today(), totalOpened: 0 },
    quests: { date: today(), items: [], bonusClaimed: false },
    counters: freshCounters(),
    stats: {
      answers: 0,
      correct: 0,
      minutes: 0,
      bestCombo: 0,
      sessions: 0,
      nodesDone: 0,
      daysActive: 0,
      xpByDay: {},
      stampsByDay: {},
      lastActiveDate: null,
    },
    inventory: INVENTORY_SEED.map((x) => ({ ...x })),
    league: { tier: 'Bronze', weekId: clock.weekId(), xpWeek: 0, rank: null, members: [], joinedDay: null, history: [] },
    flags: {
      onboardingDone: false,
      signedUp: false,
      placementTaken: false,
      placementLevel: 1,
      sentence0: false,
      identityShown: false,
      freezeGiftedDay2: false,
      freezeGiftedDay7: false,
      leagueJoined: false,
      leagueSeen: false,
      sodDate: null,
      sodRevealed: false,
      streakLost: false,
      prevStreak: 0,
      freezeConsumed: false,
      repairOffered: false,
      goalHitToday: false,
      firstChestDone: false,
      bossDone: {},
      demoUsed: false,
      bookmarks: [],
      boosterUntil: null,
      weeklyXpClaimed: null,
      dailyBonusDate: null,
      unitIntro: {},
    },
    settings: { sound: true, haptics: true, reducedMotion: false, romanization: 'auto', voice: 'sunhi' },
    day: 0,
    events: [],
    timeline: [],
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshState();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 2) return freshState();
    return { ...freshState(), ...parsed, flags: { ...freshState().flags, ...parsed.flags }, settings: { ...freshState().settings, ...parsed.settings } };
  } catch {
    return freshState();
  }
}

export let state = load();
const subscribers = new Set();

let saveTimer = null;
export function save() {
  state.lastSeenAt = clock.now().toISOString();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* storage full / private mode — app keeps working in memory */
    }
    subscribers.forEach((fn) => {
      try {
        fn(state);
      } catch {
        /* ignore */
      }
    });
  }, 30);
}
export function saveNow() {
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  subscribers.forEach((fn) => fn(state));
}
export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function replaceState(next) {
  Object.keys(state).forEach((k) => delete state[k]);
  Object.assign(state, { ...freshState(), ...next });
  saveNow();
}
export function resetState(keepSettings = true) {
  const settings = keepSettings ? { ...state.settings } : freshState().settings;
  replaceState({ ...freshState(), settings });
  return state;
}

export function logEvent(name, props = {}) {
  state.events.push({ t: clock.now().toISOString(), name, ...props });
  if (state.events.length > 300) state.events = state.events.slice(-300);
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('horang:event', { detail: { name, ...props } }));
    }
  } catch {
    /* ignore */
  }
}

// ---------- mastery ----------
export function ensureMastery(id) {
  if (!state.mastery[id]) {
    state.mastery[id] = blankMastery(id, state.day);
  }
  return state.mastery[id];
}
export function getSentence(id) {
  if (id === 'sentence0') return sentence0(state.profile.name);
  return BY_ID[id];
}
export function masteryOf(id) {
  return state.mastery[id] || blankMastery(id, state.day);
}
export function ensureWord(id) {
  if (!state.wordMastery[id]) {
    state.wordMastery[id] = { tier: 0, seen: 0, correct: 0, wrong: 0, dueAt: 0, lastSeenAt: 0 };
  }
  return state.wordMastery[id];
}
export function recordWord(wordId, correct) {
  const w = ensureWord(wordId);
  const t = nowMs();
  w.seen++;
  w.lastSeenAt = t;
  if (correct) {
    w.correct++;
    if (w.tier < 5) w.tier++;
    w.dueAt = t + [0, 4 * 3600000, 86400000, 3 * 86400000, 7 * 86400000, 21 * 86400000][w.tier];
  } else {
    w.wrong++;
    w.tier = Math.max(0, w.tier - 1);
    w.dueAt = t + 10 * 60000;
  }
  if (state.counters.date === today()) state.counters.words++;
  save();
  return w;
}
export function markWordSeen(wordId) {
  if (!wordId) return null;
  const w = ensureWord(wordId);
  if (w.tier === 0) {
    w.tier = 1;
    w.seen++;
    w.dueAt = nowMs() + 86400000;
    if (state.counters.date === today()) state.counters.words++;
    save();
  }
  return w;
}
export function dueWords() {
  const t = nowMs();
  return Object.entries(state.wordMastery)
    .filter(([, w]) => w.tier > 0 && w.dueAt <= t)
    .map(([id, w]) => ({ id, word: WORD_BY_ID[id], mastery: w }));
}
export function knownWordCount() {
  return Object.values(state.wordMastery).filter((w) => w.tier >= 3).length;
}
export function dueSentences() {
  const t = nowMs();
  return Object.entries(state.mastery)
    .filter(([id]) => id !== 'sentence0')
    .map(([id, m]) => ({ id, sentence: BY_ID[id], mastery: m, status: dueStatus(m, t) }))
    .filter((x) => x.sentence && x.status !== 'scheduled' && x.status !== 'new')
    .sort((a, b) => (a.mastery.dueAt || 0) - (b.mastery.dueAt || 0));
}
export function decayReport() {
  const t = nowMs();
  const counts = { fading: 0, wilting: 0, dropped: 0, due: 0 };
  Object.entries(state.mastery).forEach(([id, m]) => {
    if (id === 'sentence0') return;
    const s = dueStatus(m, t);
    if (counts[s] !== undefined) counts[s]++;
  });
  return { ...counts, total: counts.fading + counts.wilting + counts.dropped };
}
export function stampCount() {
  return Object.entries(state.mastery).filter(([id, m]) => id !== 'sentence0' && m.isStamp).length;
}
export function packProgress(unitId) {
  const unit = UNIT_META.find((u) => u.id === unitId);
  if (!unit) return { met: 0, strong: 0, total: 0, pct: 0 };
  const ids = unit.sentence_ids;
  const met = ids.filter((id) => state.mastery[id]?.tier >= 1).length;
  const strong = ids.filter((id) => state.mastery[id]?.tier >= 3).length;
  return {
    met,
    strong,
    total: ids.length,
    pct: ids.length ? (met / ids.length) * 100 : 0,
    strongPct: ids.length ? (strong / ids.length) * 100 : 0,
  };
}
export function currentUnit() {
  const node = NODES[Math.min(state.path.currentNode, NODES.length - 1)];
  return UNIT_META.find((u) => u.id === node.unitId) || UNIT_META[0];
}
export function unlockedNodeCount() {
  return state.path.completedNodes.length;
}
export function isNodeUnlocked(index) {
  return nodeUnlocked(index, state.path.completedNodes);
}

// ---------- currencies ----------
export function addXP(n, reason = '') {
  if (!n) return { xp: 0, levelsUp: 0, level: state.level };
  const before = levelFromXp(state.xpTotal);
  state.xpTotal += n;
  // The daily goal counts learning effort only — bonuses cannot buy the streak.
  const countsTowardGoal = reason === 'answer' || reason === 'node' || reason === 'review';
  if (state.counters.date === today()) {
    if (countsTowardGoal) state.counters.xp += n;
  } else {
    state.counters.xp += countsTowardGoal ? n : 0;
  }
  state.stats.xpByDay[today()] = (state.stats.xpByDay[today()] || 0) + n;
  state.league.xpWeek += n;
  const after = levelFromXp(state.xpTotal);
  const levelsUp = Math.max(0, after - before);
  if (levelsUp > 0) {
    state.level = after;
    state.coins += 20 * levelsUp;
    if (after >= 5) state.gems += levelsUp;
    logEvent('level_up', { level: after, levelsUp });
  }
  if (reason) state._lastXpReason = reason;
  save();
  return { xp: n, levelsUp, level: after };
}
export function addCoins(n) {
  state.coins = Math.max(0, state.coins + n);
  save();
}
export function addGems(n) {
  state.gems = Math.max(0, state.gems + n);
  save();
}

// ---------- answers ----------
export function recordAnswer({ sentenceId, type, correct, ms = 0, usedHint = false, critOverride = null, wordId = null }) {
  if (!sentenceId) {
    const s0 = state.session;
    if (s0) {
      s0.answers = (s0.answers || 0) + 1;
      s0.correct += correct ? 1 : 0;
      s0.wrong += correct ? 0 : 1;
      s0.combo = correct ? (s0.combo || 0) + 1 : 0;
      s0.bestCombo = Math.max(s0.bestCombo || 0, s0.combo || 0);
    }
    const xp = correct ? 8 : 0;
    if (xp) {
      if (s0) s0.xp = (s0.xp || 0) + xp;
      addXP(xp, 'answer');
    }
    if (correct) state.stats.correct++;
    state.stats.answers++;
    state.counters.correct += correct ? 1 : 0;
    const w = wordId ? recordWord(wordId, correct) : null;
    if (correct && type === 'reading_q') state.counters.reading = (state.counters.reading || 0) + 1;
    save();
    return {
      xp,
      crit: false,
      correct,
      tier: w ? w.tier : 0,
      tierBefore: w ? w.tier : 0,
      stampMinted: false,
      combo: s0 ? s0.combo : 0,
      totalXp: state.xpTotal,
      coins: state.coins,
      word: !!w,
    };
  }
  const m = ensureMastery(sentenceId);
  if (state.session?.kind && state.session.kind !== 'node' && correct) state.counters.reviews++;
  const s = state.session;
  const wasNew = m.exposures === 0;
  const statusBefore = dueStatus(m, nowMs());

  if (s) {
    s.answers = (s.answers || 0) + 1;
  }
  const answersThisSession = s ? s.answers : state.stats.answers + 1;

  // Crit: variable ratio, scripted 10th answer, capped at 3 per session.
  let crit = false;
  if (correct) {
    const combo = s ? s.combo || 0 : 0;
    let chance = 0.15;
    if (combo >= 5) chance = 0.2;
    if (combo >= 10) chance = 0.25;
    const scripted = answersThisSession === 10;
    const critsSoFar = s ? s.crits || 0 : 0;
    crit = critOverride !== null ? !!critOverride : scripted || (critsSoFar < 3 && Math.random() < chance);
    if (!m.lastWrong && scripted) crit = true;
    if (critsSoFar >= 3 && !scripted) crit = false;
  }

  let xp = 0;
  if (correct) {
    xp = usedHint ? 5 : crit ? 20 : 10;
    const exp = state.engagement?.expedition;
    if (state.engagement?.mode === 'expedition' && exp?.roleTypes?.includes(type)) {
      xp = Math.max(1, Math.round(xp * 1.1));
    }
    if (state.flags.boosterUntil && state.flags.boosterUntil > nowMs()) xp *= 2;
    if (clock.isEvening()) xp = Math.round(xp * 1.5);
    xp = Math.min(xp, 60); // hard cap: 3× base
    if (s) s.xp = (s.xp || 0) + xp;
  }

  const graded = grade(m, correct, { wasNew });
  m.lastWrong = !correct;

  if (correct) {
    state.stats.correct++;
    state.counters.correct++;
    if (crit) state.counters.crits++;
    state.coinCarry = (state.coinCarry || 0) + 1;
    const earned = Math.floor(state.coinCarry / 2);
    if (earned > 0) {
      state.coinCarry -= earned * 2;
      state.coins += earned;
    }
    if (s) {
      s.correct++;
      s.combo = (s.combo || 0) + 1;
      s.bestCombo = Math.max(s.bestCombo || 0, s.combo);
      state.stats.bestCombo = Math.max(state.stats.bestCombo, s.combo);
      state.counters.comboBest = Math.max(state.counters.comboBest, s.combo);
    }
    if (type === 'say_it') state.counters.said++;
    if (type === 'listen_pick') state.counters.listens++;
    if (type === 'type_answer' || type === 'dictation') state.counters.typed++;
    if (wasNew) state.counters.newSentences++;
    if (['fading', 'wilting', 'dropped'].includes(statusBefore)) state.counters.fadingReviews++;
  } else {
    if (s) {
      s.wrong++;
      s.combo = 0;
      if (sentenceId && !s.mistakes.includes(sentenceId)) s.mistakes.push(sentenceId);
    }
    state.counters.comboBest = Math.max(state.counters.comboBest, 0);
  }
  state.stats.answers++;
  if (xp) {
    addXP(xp, 'answer');
    if (s) s.xp = (s.xp || 0) + xp;
  }

  if (s) {
    if (graded.tierBefore === 0 && graded.tier > 0) s.met.push(sentenceId);
    if (graded.tierBefore < 3 && graded.tier >= 3) s.strong.push(sentenceId);
  }
  if (graded.stampMinted && sentenceId !== 'sentence0') {
    state.stats.stampsByDay[today()] = (state.stats.stampsByDay[today()] || 0) + 1;
    logEvent('stamp_earned', { sentenceId, day: state.day });
  }
  logEvent('answer', { type, sentenceId, correct, ms, crit });
  save();
  return {
    xp,
    crit,
    correct,
    tier: graded.tier,
    tierBefore: graded.tierBefore,
    stampMinted: graded.stampMinted,
    combo: s ? s.combo : 0,
    totalXp: state.xpTotal,
    coins: state.coins,
  };
}

// ---------- sessions ----------
export function startSession(kind = 'node', params = {}) {
  if (kind === 'node' && !isNodeUnlocked(params.nodeIndex ?? 0, state.path.completedNodes)) return null;
  const built = buildSession(kind, params, state.mastery, state.profile.name);
  built.combo = 0;
  built.bestCombo = 0;
  built.crits = 0;
  built.answers = 0;
  state.session = built;
  save();
  logEvent('node_start', { kind, node: built.nodeIndex });
  return built;
}

export function endSession() {
  const s = state.session;
  if (s) {
    const mins = Math.max(1, Math.round((nowMs() - s.startedAt) / 60000));
    state.stats.minutes += mins;
    state.stats.sessions++;
  }
  state.session = null;
  save();
}

export function completeNode() {
  const s = state.session;
  if (!s) return null;
  const nodeIndex = s.nodeIndex ?? 0;
  const node = NODES[nodeIndex];
  const lesson = lessonAt(nodeIndex);
  const stars = starsFor(s.wrong);
  const accuracy = s.answers ? s.correct / s.answers : 0;
  const seconds = Math.round((nowMs() - s.startedAt) / 1000);

  const answerXp = s.xp || 0;
  const isNode = (s.kind || 'node') === 'node';
  const isCheckpoint = isNode && lesson?.kind === 'checkpoint';
  let bonusXp = isNode ? 30 + (stars === 3 ? 20 : 0) : 20;
  let coins = isNode ? 30 + (stars === 3 ? 10 : 0) : 50; // Daily Run completion +50
  // 3-node daily taper (nodes only)
  if (isNode && state.counters.nodes >= 3) {
    bonusXp = Math.round(bonusXp * 0.5);
    coins = Math.round(coins * 0.5);
  }
  if (isNode) {
    if (!state.path.completedNodes.includes(nodeIndex)) state.path.completedNodes.push(nodeIndex);
    state.path.currentNode = Math.max(state.path.currentNode, nodeIndex + 1);
    state.counters.nodes++;
    if (stars === 3) {
    state.counters.stars3++;
    state.counters.perfectLesson = (state.counters.perfectLesson || 0) + 1;
  }
    state.stats.nodesDone++;
  }
  // Any finished session fills a chest slot (max 3/day) so the reward loop never
  // dead-ends once all 40 sentences are met.
  fillChest();
  state.stats.minutes += Math.max(1, Math.round(seconds / 60));
  state.stats.sessions++;
  state.stats.daysActive = state.stats.daysActive || 1;

  const lvl = addXP(bonusXp, 'node');
  state.coins += coins;

  const stamped = (s.strong || []).map((id) => BY_ID[id]?.id || id).filter(Boolean);
  const checkpointPassed = isCheckpoint ? accuracy >= 0.8 : null;
  if (isCheckpoint) {
    const uid = lesson.unitId;
    const prev = state.checkpoints[uid];
    if (!prev || (checkpointPassed && !prev.passed)) {
      state.checkpoints[uid] = { passed: checkpointPassed, score: Math.round(accuracy * 100), at: clock.now().toISOString() };
    }
    if (checkpointPassed && !state.badges.includes(uid)) {
      state.badges.push(uid);
      addXP(40, 'badge');
      state.gems += 1;
      logEvent('unit_badge', { unitId: uid });
    }
  }
  const summary = {
    kind: s.kind || 'node',
    lessonKind: lesson?.kind || s.lessonKind || 'node',
    lessonId: lesson?.id || null,
    unitId: lesson?.unitId || null,
    unitTitle: lesson ? UNIT_BY_ID[lesson.unitId]?.title : null,
    checkpoint: isCheckpoint
      ? { passed: checkpointPassed, score: Math.round(accuracy * 100), required: 80, unitId: lesson.unitId, unitTitle: UNIT_BY_ID[lesson.unitId]?.title }
      : null,
    nodeIndex: isNode ? nodeIndex : null,
    nodeTitle:
      node && isNode
        ? `${lesson?.title || 'Session'} · ${node.unitTitle}`
        : s.kind === 'review'
          ? 'Review run'
          : s.kind === 'daily'
            ? 'Daily Run'
            : 'Practice',
    unitTitle: node?.unitTitle || '',
    stars,
    accuracy,
    seconds,
    correct: s.correct,
    wrong: s.wrong,
    answers: s.answers,
    answerXp,
    bonusXp,
    coins,
    xp: answerXp + bonusXp,
    stamps: (s.strong || []).filter(Boolean),
    strong: (s.strong || []).filter(Boolean),
    met: (s.met || []).filter(Boolean),
    newStamps: (s.strong || []).filter(Boolean),
    chestFilled: isNode && state.chest.slots > 0,
    bestCombo: s.bestCombo || s.combo || 0,
    levelsUp: lvl.levelsUp,
    level: lvl.level,
  };
  state.lastSummary = summary;
  logEvent('node_complete', { stars, xp: summary.xp, mistakes: s.wrong });
  state.session = null;
  checkDailyGoal();
  checkQuests();
  save();
  return summary;
}

// ---------- chest ----------
export function fillChest() {
  if (state.chest.date !== today()) {
    state.chest = { ...state.chest, date: today(), slots: 0, openedToday: 0 };
  }
  if (state.chest.slots < 3) {
    state.chest.slots++;
    save();
    return true;
  }
  return false;
}

export function openChest() {
  if (state.chest.date !== today()) {
    state.chest = { ...state.chest, date: today(), slots: 0, openedToday: 0 };
  }
  if (state.chest.slots <= 0) return null;
  state.chest.slots--;
  state.chest.openedToday++;
  state.chest.totalOpened = (state.chest.totalOpened || 0) + 1;
  state.counters.chests = (state.counters.chests || 0) + 1;

  let rarity = 'common';
  if (!state.flags.firstChestDone) {
    rarity = 'rare';
    state.flags.firstChestDone = true;
  } else {
    const r = Math.random();
    if (r < 0.003) rarity = 'legendary';
    else if (r < 0.05) rarity = 'epic';
    else if (r < 0.3) rarity = 'rare';
    if (state.chest.pityEpic >= 14 && rarity !== 'legendary') rarity = 'epic';
    if (state.chest.pityRare >= 4 && rarity === 'common') rarity = 'rare';
  }
  state.chest.pityRare = rarity === 'rare' || rarity === 'epic' || rarity === 'legendary' ? 0 : state.chest.pityRare + 1;
  state.chest.pityEpic = rarity === 'epic' || rarity === 'legendary' ? 0 : state.chest.pityEpic + 1;

  let coins = 0;
  let gems = 0;
  let freeze = 0;
  if (rarity === 'common') coins = 20 + Math.floor(Math.random() * 21);
  else if (rarity === 'rare') coins = 60 + Math.floor(Math.random() * 31);
  else if (rarity === 'epic') {
    coins = 150;
    gems = 1;
  } else {
    coins = 500;
    gems = 2;
    freeze = 1;
  }
  state.coins += coins;
  state.gems += gems;
  if (freeze) state.streak.freezes = Math.min(2, state.streak.freezes + freeze);
  logEvent('chest_open', { rarity });
  save();
  return { rarity, coins, gems, freeze };
}

// ---------- streak ----------
export function checkDailyGoal() {
  const goal = state.profile.dailyGoalXp || 120;
  if (state.counters.xp < goal) return false;
  if (state.streak.lastGoalDate === today()) return false;
  const prev = state.streak.lastGoalDate;
  if (prev && clock.daysBetween(prev, today()) === 1) state.streak.current += 1;
  else if (!prev) state.streak.current = 1;
  else state.streak.current = Math.max(1, state.streak.current + 1);
  state.streak.best = Math.max(state.streak.best, state.streak.current);
  state.streak.lastGoalDate = today();
  state.flags.goalHitToday = true;
  state.coins += 40;
  const bonus = 10 + 5 * Math.min(state.streak.current, 6);
  addXP(bonus, 'streak');
  state.stats.daysActive = (state.stats.daysActive || 0) + 1;
  if (state.streak.current === 2 && !state.flags.freezeGiftedDay2) {
    state.flags.freezeGiftedDay2 = true;
    state.streak.freezes = Math.min(2, state.streak.freezes + 1);
  }
  if (state.streak.current === 7 && !state.flags.freezeGiftedDay7) {
    state.flags.freezeGiftedDay7 = true;
    state.streak.freezes = Math.min(2, state.streak.freezes + 1);
  }
  logEvent('daily_goal_hit', { xp: state.counters.xp });
  logEvent('streak_change', { from: state.streak.current - 1, to: state.streak.current });
  save();
  return true;
}

// ---------- quests ----------
function questTemplatesFor(dateKey) {
  const seed = dateKey.split('-').join('') | 0;
  const fading = decayReport().total;
  const eligible = QUEST_POOL.filter((q) => q.metric !== 'fading' || fading > 0);
  const start = (seed * 7) % eligible.length;
  const picked = [];
  for (let i = 0; i < eligible.length && picked.length < 3; i++) {
    const q = eligible[(start + i * 3) % eligible.length];
    if (!picked.find((p) => p.key === q.key)) picked.push(q);
  }
  return picked;
}

function makeQuests() {
  const templates = questTemplatesFor(today());
  const slots = ['easy', 'medium', 'stretch'];
  const rewards = { easy: [30, 20], medium: [40, 40], stretch: [50, 60] };
  return templates.map((t, i) => {
    const slot = slots[i];
    const scale = i === 0 ? 1 : i === 1 ? 1.15 : 1.7;
    const target = t.metric === 'xp' ? state.profile.dailyGoalXp : Math.max(1, Math.round(t.target * scale));
    return {
      id: `${today()}-${slot}-${t.key}`,
      template: t.key,
      slot,
      title: t.title.replace('{n}', target),
      metric: t.metric,
      target,
      rewardXp: rewards[slot][0],
      rewardCoins: rewards[slot][1],
      icon: t.icon,
      done: false,
      rerolled: false,
      served: today(),
    };
  });
}

export function questProgress(q) {
  if (q.metric === 'xp') return state.counters.xp || 0;
  if (q.metric === 'comboBest') return state.counters.comboBest || 0;
  return state.counters[q.metric] || 0;
}

export function checkQuests() {
  const newly = [];
  (state.quests.items || []).forEach((q) => {
    if (!q.done && questProgress(q) >= q.target) {
      q.done = true;
      state.coins += q.rewardCoins;
      addXP(q.rewardXp, 'quest');
      logEvent('quest_complete', { id: q.template });
      newly.push(q);
    }
  });
  if (state.quests.items.length && state.quests.items.every((q) => q.done) && !state.quests.bonusClaimed) {
    state.quests.bonusClaimed = true;
    state.coins += 50;
    fillChest();
    newly.push({ allDone: true, title: 'All daily quests complete', rewardXp: 0, rewardCoins: 50 });
  }
  if (newly.length) save();
  return newly;
}

export function rerollQuest(id) {
  const idx = state.quests.items.findIndex((q) => q.id === id);
  if (idx < 0 || state.quests.items[idx].rerolled) return false;
  const used = state.quests.items.map((q) => q.template);
  const candidates = QUEST_POOL.filter((t) => !used.includes(t.key));
  if (!candidates.length) return false;
  const t = candidates[Math.floor(Math.random() * candidates.length)];
  const old = state.quests.items[idx];
  const target = t.metric === 'xp' ? state.profile.dailyGoalXp : t.target;
  state.quests.items[idx] = {
    ...old,
    id: `${today()}-${old.slot}-${t.key}-r`,
    template: t.key,
    title: t.title.replace('{n}', target),
    metric: t.metric,
    target,
    icon: t.icon,
    done: false,
    rerolled: true,
  };
  save();
  return true;
}

// ---------- day rollover ----------
export function refreshDay() {
  const t = today();
  let changed = false;
  if (state.counters.date !== t) {
    state.counters = freshCounters();
    changed = true;
  }
  if (state.quests.date !== t) {
    state.quests = { date: t, items: makeQuests(), bonusClaimed: false };
    changed = true;
  }
  if (!state.quests.items.length) {
    state.quests = { date: t, items: makeQuests(), bonusClaimed: false };
  }
  if (state.chest.date !== t) {
    state.chest = { ...state.chest, date: t, slots: 0, openedToday: 0 };
    state.focus = 5; // midnight Focus refill
    if (state.flags.boosterUntil && state.flags.boosterUntil < nowMs()) state.flags.boosterUntil = null;
    changed = true;
  }
  if (state.league.weekId !== clock.weekId()) {
    state.league.weekId = clock.weekId();
    state.league.xpWeek = 0;
    state.league.rank = null;
    state.league.members = []; // re-seed pacers for the new week
    changed = true;
  }
  // streak / freeze handling
  const last = state.streak.lastGoalDate;
  if (last && last !== t) {
    const gap = clock.daysBetween(last, t);
    if (gap > 1) {
      const missed = gap - 1;
      const used = Math.min(state.streak.freezes, missed);
      if (used > 0) {
        state.streak.freezes -= used;
        state.flags.freezeConsumed = used > 0;
      }
      if (missed - used > 0 && state.streak.current > 0) {
        state.flags.prevStreak = state.streak.current;
        state.flags.streakLost = true;
        state.streak.current = 0;
        logEvent('streak_lost', { prev: state.flags.prevStreak });
      }
      changed = true;
    }
  }
  const dropped = decayCheck(state.mastery, nowMs());
  if (dropped.length) {
    state.flags.lastDecay = dropped.length;
    logEvent('sentence_decay', { count: dropped.length });
  }
  state.day = clock.dayIndex();
  state.level = levelFromXp(state.xpTotal);
  if (state.stats.lastActiveDate !== t) {
    state.stats.lastActiveDate = t;
  }
  if (changed) save();
  return changed;
}

// ---------- league ----------
const PACER_NAMES = ['Jiwoo', 'Minseo', 'Haneul', 'Doyun', 'Seoyeon', 'Jae', 'Sora', 'Yuna', 'Tae', 'Nari', 'Bomi', 'Kyung', 'Iseul', 'Hyun', 'Dami', 'Joon', 'Areum', 'Garam', 'Mira', 'Sunny', 'Chan', 'Ryu', 'Nabi', 'Sol', 'Eun', 'Haneul', 'Bada', 'Sang', 'Yul'];
const TIERS = ['Bronze', 'Silver', 'Gold', 'Sapphire', 'Ruby', 'Diamond'];

export function leagueTierIndex(tier) {
  const i = TIERS.indexOf(tier);
  return i < 0 ? 0 : i;
}

export function ensureLeague() {
  if (state.league.members.length) return state.league.members;
  // For a solo cohort the honest benchmark is the learner's own weekly pace:
  // pacers are labelled simulations of an average cohort, never fake people.
  const base = Math.max(300, Math.round((state.league.xpWeek || 400) * 1.15));
  const members = [];
  const seed = (state.day + 3) * 37;
  const usedNames = new Set();
  for (let i = 0; i < 29; i++) {
    const baseName = PACER_NAMES[(seed + i * 5) % PACER_NAMES.length];
    let name = baseName;
    let n = 1;
    while (usedNames.has(name)) name = `${baseName} ${++n}`;
    usedNames.add(name);
    const factor = 0.42 + (((seed + i * 13) % 100) / 100) * 1.18;
    members.push({ name, xp: Math.round((base * factor) / 10) * 10, isPacer: true, isYou: false });
  }
  members.push({ name: state.profile.name || 'You', xp: state.league.xpWeek, isPacer: false, isYou: true });
  state.league.members = members;
  state.league.joinedDay = state.day;
  state.flags.leagueJoined = true;
  rankLeague();
  save();
  return members;
}

export function rankLeague() {
  const members = state.league.members.map((m) => (m.isYou ? { ...m, xp: state.league.xpWeek } : m));
  members.sort((a, b) => b.xp - a.xp);
  const rank = members.findIndex((m) => m.isYou) + 1;
  state.league.members = members;
  state.league.rank = rank;
  return members;
}

export function leagueWeekXp() {
  return state.league.xpWeek;
}

// ---------- shop ----------
export function purchase(itemId) {
  const item = state.inventory.find((x) => x.id === itemId);
  if (item) {
    if (item.owned) return { ok: false, reason: 'owned' };
    if (state.coins < item.price) return { ok: false, reason: 'coins' };
    state.coins -= item.price;
    item.owned = true;
    logEvent('purchase', { item: itemId, cost: item.price });
    save();
    return { ok: true, item };
  }
  if (itemId === 'freeze') {
    if (state.streak.freezes >= 2) return { ok: false, reason: 'max' };
    if (state.coins < 200) return { ok: false, reason: 'coins' };
    state.coins -= 200;
    state.streak.freezes++;
    save();
    return { ok: true };
  }
  if (itemId === 'repair') {
    if (!state.flags.prevStreak) return { ok: false, reason: 'none' };
    if (state.gems < 5) return { ok: false, reason: 'gems' };
    state.gems -= 5;
    state.streak.current = Math.min(30, Math.round(state.flags.prevStreak * 0.5));
    state.flags.streakLost = false;
    state.streak.lastGoalDate = clock.yesterdayKey();
    save();
    return { ok: true };
  }
  if (itemId === 'focus') {
    if (state.gems < 2) return { ok: false, reason: 'gems' };
    state.gems -= 2;
    state.focus = 5;
    save();
    return { ok: true };
  }
  return { ok: false, reason: 'missing' };
}

export function equipCosmetic(itemId) {
  const item = state.inventory.find((x) => x.id === itemId);
  if (!item || !item.owned) return;
  state.inventory.forEach((x) => {
    if (x.kind === item.kind) x.equipped = false;
  });
  item.equipped = true;
  save();
}

// ---------- misc ----------
export function sentenceOfTheDay() {
  const pool = SENTENCES.filter((s) => !state.mastery[s.id]);
  const pool2 = pool.length ? pool : SENTENCES;
  const idx = Math.abs(clock.dayIndex() * 7 + 3) % pool2.length;
  return pool2[idx];
}

export function weekDaysActive() {
  // Mon..Sun of the current week -> booleans from stats.xpByDay
  const out = [];
  const wd = clock.weekdayIndex();
  for (let i = 0; i < 7; i++) out.push(!!(state.stats.xpByDay[clock.dateKey(new Date(nowMs() - (wd - i) * DAY))] > 0));
  return out;
}

export function minutesToday() {
  return Math.round((state.stats.minutes || 0) % 60);
}

export function nextBestAction() {
  const due = dueSentences();
  if (due.length) return { label: `Review ${due.length} fading sentence${due.length > 1 ? 's' : ''}`, screen: 'lesson', params: { kind: 'review' }, tone: 'amber' };
  if (state.chest.slots > 0) return { label: `Open your chest (${state.chest.slots})`, screen: 'shop', params: {}, tone: 'amber' };
  const next = nextLessonIndex(state.path.completedNodes);
  const node = NODES[next];
  if (state.path.completedNodes.length >= NODES.length) {
    return { label: 'A1 course complete — keep it warm', screen: 'lesson', params: { kind: 'review' }, tone: 'mint' };
  }
  return { label: `Continue: ${node?.title || 'next lesson'}`, screen: 'lesson', params: { node: next }, tone: 'coral' };
}

export function dailyPlan() {
  const goal = {
    lesson: 1,
    review: 10,
    words: 6,
  };
  const items = [
    {
      id: 'lesson',
      label: state.counters.nodes >= goal.lesson ? 'Lesson done' : 'Finish 1 lesson',
      icon: 'play',
      progress: Math.min(goal.lesson, state.counters.nodes || 0),
      target: goal.lesson,
      screen: 'lesson',
      params: { node: nextLessonIndex(state.path.completedNodes) },
    },
    {
      id: 'review',
      label: 'Review 10 sentences',
      icon: 'refresh',
      progress: Math.min(goal.review, state.counters.reviews || 0),
      target: goal.review,
      screen: 'lesson',
      params: { kind: 'review' },
    },
    {
      id: 'words',
      label: 'Practise 6 words',
      icon: 'book',
      progress: Math.min(goal.words, state.counters.words || 0),
      target: goal.words,
      screen: 'vocab',
      params: {},
    },
  ];
  const done = items.every((x) => x.progress >= x.target);
  return { items, done, claimed: state.flags.dailyBonusDate === today() };
}
export function claimDailyBonus() {
  if (state.flags.dailyBonusDate === today()) return false;
  state.flags.dailyBonusDate = today();
  state.coins += 60;
  addXP(30, 'daily');
  fillChest();
  save();
  return true;
}

export function exportData() {
  return JSON.stringify(state, null, 2);
}

export default {
  state,
  save,
  saveNow,
  subscribe,
  resetState,
  replaceState,
  logEvent,
  addXP,
  addCoins,
  addGems,
  recordAnswer,
  startSession,
  completeNode,
  endSession,
  fillChest,
  openChest,
  checkDailyGoal,
  checkQuests,
  questProgress,
  rerollQuest,
  refreshDay,
  ensureLeague,
  rankLeague,
  purchase,
  packProgress,
  stampCount,
  dueSentences,
  decayReport,
  levelInfo,
  levelFromXp,
  masteryOf,
  ensureMastery,
  ensureWord,
  recordWord,
  markWordSeen,
  dueWords,
  knownWordCount,
  dailyPlan,
  claimDailyBonus,
  getSentence,
  sentenceOfTheDay,
  weekDaysActive,
  nextBestAction,
  exportData,
  WORD_BY_ID,
  wordsOf,
};
