// Engagement alternatives for the gamification-lab branch.
// Three systems share the real course data and state; none of them replaces learning.
import {
  state,
  save,
  addXP,
  addCoins,
  addGems,
  logEvent,
} from './store.js';
import { GRAMMAR, UNITS, SENTENCES, grammarOf, unitUnlocked, grammar as grammarById } from './course.js';
import { today, weekId, weekdayIndex, nowMs } from './clock.js';

export const MODES = {
  classic: {
    id: 'classic',
    name: 'Classic Horang',
    ko: '클래식',
    thesis: 'Loss aversion + status',
    line: 'Streak, chests, XP, league. The system the first two weeks were tuned on.',
    returns: '“I do not want to lose what I built.”',
    risk: 'Can feel like an obligation on a bad day.',
    screen: 'home',
    tone: 'coral',
  },
  constellation: {
    id: 'constellation',
    name: 'Skill Constellation',
    ko: '별자리',
    thesis: 'Autonomy + mastery',
    line: '48 grammar stars on a map. Light any star you can reach; mastery is visible as light.',
    returns: '“I want to light the next star.”',
    risk: 'Too much choice for a total beginner.',
    screen: 'constellation',
    tone: 'indigo',
  },
  bounties: {
    id: 'bounties',
    name: 'Bounty Board',
    ko: '현상금',
    thesis: 'Autonomy + challenge',
    line: 'Choose one of three daily bounties: safe, risky or epic. No stake, no penalty.',
    returns: '“I picked this challenge; I want to finish it.”',
    risk: 'Reward-driven players may only pick safe.',
    screen: 'bounties',
    tone: 'amber',
  },
  expedition: {
    id: 'expedition',
    name: 'Co-op Expedition',
    ko: '원정대',
    thesis: 'Relatedness + role',
    line: 'A shared weekly goal with four labelled pace-setters. Pick a role that changes rewards.',
    returns: '“The group is close; my part matters.”',
    risk: 'Fake social pressure if the NPCs are not labelled.',
    screen: 'expedition',
    tone: 'mint',
  },
};

export const ROLES = {
  scout: {
    id: 'scout',
    name: 'Scout',
    ko: '정찰대',
    line: 'Listening and dictation earn +10% XP.',
    types: ['listen_pick', 'dictation'],
    emoji: '🧭',
  },
  scribe: {
    id: 'scribe',
    name: 'Scribe',
    ko: '기록관',
    line: 'Typing, reading and fill-the-gap earn +10% XP.',
    types: ['type_answer', 'reading_q', 'fill_blank', 'word_pick'],
    emoji: '✍️',
  },
  envoy: {
    id: 'envoy',
    name: 'Envoy',
    ko: '사절',
    line: 'Dialogue and speaking earn +10% XP.',
    types: ['dialogue_reply', 'say_it'],
    emoji: '🗣️',
  },
};

const EXPEDITION_GOAL = 2400;
const NPC_NAMES = ['Jiwoo', 'Minseo', 'Doyun', 'Haneul'];
const NPC_PACE = [72, 64, 58, 81];

const CHAPTERS = [
  {
    at: 0,
    title: 'The invitation',
    ko: '초대장',
    text: 'A postcard arrives: five days in Seoul, one week to prepare. The expedition begins at the airport bus stop.',
  },
  {
    at: 0.25,
    title: 'The market',
    ko: '시장',
    text: 'Gwangjang at noon. You order two portions without pointing once, and the vendor answers too fast — but you catch the price.',
  },
  {
    at: 0.5,
    title: 'The wrong subway',
    ko: '지하철',
    text: 'Line 2, wrong direction. You ask a stranger, understand “across the platform”, and make the train by ten seconds.',
  },
  {
    at: 0.75,
    title: 'The first real conversation',
    ko: '첫 대화',
    text: 'A café owner asks where you are from. Four sentences later she laughs — not at you, with you. You order a second coffee.',
  },
  {
    at: 1,
    title: 'The flight home',
    ko: '귀국',
    text: 'At Incheon you realise you have been thinking in Korean for the last hour. The diary closes on the trip — and opens on the next one.',
  },
];

const BOUNTY_POOL = [
  { key: 'typed5', tier: 'safe', metric: 'typed', target: 5, title: 'Type 5 sentences correctly', reward: { coins: 60, xp: 20 } },
  { key: 'words10', tier: 'safe', metric: 'words', target: 10, title: 'Practise 10 words', reward: { coins: 60, xp: 20 } },
  { key: 'listen10', tier: 'safe', metric: 'listens', target: 10, title: 'Listen to 10 sentences', reward: { coins: 60, xp: 20 } },
  { key: 'perfect', tier: 'risky', metric: 'perfectLesson', target: 1, title: 'Finish a lesson with no mistakes', reward: { coins: 120, xp: 40 } },
  { key: 'review10', tier: 'risky', metric: 'reviews', target: 10, title: 'Review 10 sentences', reward: { coins: 120, xp: 40 } },
  { key: 'say10', tier: 'risky', metric: 'said', target: 10, title: 'Say 10 sentences out loud', reward: { coins: 120, xp: 40 } },
  { key: 'combo10', tier: 'epic', metric: 'comboBest', target: 10, title: 'Reach a 10-answer combo', reward: { coins: 260, xp: 60, gems: 1 } },
  { key: 'review20', tier: 'epic', metric: 'reviews', target: 20, title: 'Review 20 sentences', reward: { coins: 260, xp: 60, gems: 1 } },
  { key: 'typed20', tier: 'epic', metric: 'typed', target: 20, title: 'Type 20 sentences correctly', reward: { coins: 260, xp: 60, gems: 1 } },
];

export function ensureEngagement() {
  if (!state.engagement) {
    state.engagement = {
      version: 1,
      mode: 'classic',
      constellation: { practiced: {} },
      bounties: { date: null, items: [], active: null, claimed: [] },
      expedition: { week: null, role: null, chaptersSeen: [] },
    };
    save();
  }
  const e = state.engagement;
  e.constellation ||= { practiced: {} };
  e.bounties ||= { date: null, items: [], active: null, claimed: [] };
  e.expedition ||= { week: null, role: null, chaptersSeen: [] };
  if (e.expedition.role && ROLES[e.expedition.role] && !e.expedition.roleTypes) {
    e.expedition.roleTypes = ROLES[e.expedition.role].types;
  }
  return e;
}

export function setMode(mode) {
  const e = ensureEngagement();
  if (!MODES[mode]) return false;
  e.mode = mode;
  logEvent('engagement_mode', { mode });
  save();
  return true;
}
export function mode() {
  return ensureEngagement().mode;
}

// ---------------- Skill Constellation ----------------
const VIEW = 480;
const CENTER = 240;

export function constellationNodes() {
  const completed = state.path?.completedNodes || [];
  const mastery = state.mastery || {};
  const out = [];
  UNITS.forEach((u, ui) => {
    const gs = grammarOf(u.id);
    const angle = (ui / UNITS.length) * Math.PI * 2 - Math.PI / 2;
    const cx = CENTER + Math.cos(angle) * 168;
    const cy = CENTER + Math.sin(angle) * 168;
    const diamond = [
      [-22, -22],
      [22, -22],
      [-22, 22],
      [22, 22],
    ];
    gs.forEach((g, gi) => {
      const [dx, dy] = diamond[gi % 4];
      const sents = SENTENCES.filter((s) => (s.grammarIds || []).includes(g.id));
      const met = sents.filter((s) => (mastery[s.id]?.tier || 0) >= 1).length;
      const strong = sents.filter((s) => (mastery[s.id]?.tier || 0) >= 3).length;
      out.push({
        ...g,
        unitId: u.id,
        unitKo: u.ko,
        unitTitle: u.title,
        unitOrder: u.order,
        x: cx + dx,
        y: cy + dy,
        anchorX: CENTER + Math.cos(angle) * 124,
        anchorY: CENTER + Math.sin(angle) * 124,
        clusterX: CENTER + Math.cos(angle) * 124,
        clusterY: CENTER + Math.sin(angle) * 124,
        met,
        strong,
        total: sents.length,
        strength: sents.length ? met / sents.length : 0,
        unlocked: unitUnlocked(u.id, completed) || met > 0,
        practiced: !!ensureEngagement().constellation.practiced[g.id],
      });
    });
  });
  return out;
}

export function constellationClusters() {
  const nodes = constellationNodes();
  return UNITS.map((u, ui) => {
    const angle = (ui / UNITS.length) * Math.PI * 2 - Math.PI / 2;
    const ns = nodes.filter((n) => n.unitId === u.id);
    const lit = ns.filter((n) => n.strength > 0).length;
    const unlocked = ns.some((n) => n.unlocked);
    return {
      unit: u,
      nodes: ns,
      lit,
      unlocked,
      x: CENTER + Math.cos(angle) * 124,
      y: CENTER + Math.sin(angle) * 124,
      angle,
    };
  });
}

export function markConstellationPractice(grammarId) {
  const e = ensureEngagement();
  e.constellation.practiced[grammarId] = (e.constellation.practiced[grammarId] || 0) + 1;
  logEvent('constellation_practice', { grammarId });
  save();
}

// ---------------- Bounty Board ----------------
function seededPick(list, seed, tier) {
  const pool = list.filter((x) => x.tier === tier);
  return pool[Math.abs(seed) % pool.length];
}

export function ensureBounties() {
  const e = ensureEngagement();
  const d = today();
  if (e.bounties.date === d && e.bounties.items.length) return e.bounties;
  const seed = Number(d.replace(/-/g, '')) || 1;
  const tiers = ['safe', 'risky', 'epic'];
  e.bounties = {
    date: d,
    active: null,
    claimed: [],
    items: tiers.map((tier, i) => {
      const t = seededPick(BOUNTY_POOL, seed + i * 17, tier);
      return {
        ...t,
        id: `${d}-${t.key}`,
        accepted: false,
        done: false,
      };
    }),
  };
  save();
  return e.bounties;
}

export function bountyProgress(item) {
  const c = state.counters || {};
  return Math.max(0, Number(c[item.metric] || 0));
}

export function activeBounty() {
  const e = ensureEngagement();
  const b = ensureBounties();
  return b.items.find((x) => x.id === b.active) || null;
}

export function acceptBounty(id) {
  const b = ensureBounties();
  const item = b.items.find((x) => x.id === id);
  if (!item || item.done) return false;
  b.items.forEach((x) => (x.accepted = x.id === id));
  b.active = id;
  logEvent('bounty_accept', { key: item.key, tier: item.tier });
  save();
  return true;
}

export function claimBounty(id) {
  const b = ensureBounties();
  const item = b.items.find((x) => x.id === id);
  if (!item || !item.accepted || item.done) return null;
  if (bountyProgress(item) < item.target) return null;
  item.done = true;
  b.claimed.push(item.key);
  b.active = null;
  state.coins += item.reward.coins || 0;
  if (item.reward.gems) state.gems += item.reward.gems;
  if (item.reward.xp) addXP(item.reward.xp, 'bounty');
  logEvent('bounty_claim', { key: item.key, tier: item.tier });
  save();
  return item;
}

// ---------------- Co-op Expedition ----------------
export function expeditionData() {
  const e = ensureEngagement();
  const week = weekId();
  if (e.expedition.week !== week) {
    e.expedition.week = week;
    save();
  }
  const days = Math.max(1, weekdayIndex() + 1); // Mon = 1 … Sun = 7
  const npcs = NPC_NAMES.map((name, i) => {
    const pace = NPC_PACE[i];
    return {
      name,
      role: ['Scout', 'Scribe', 'Envoy', 'Cartographer'][i],
      xp: pace * days,
      pace,
      isPacer: true,
    };
  });
  const mine = state.league?.xpWeek || 0;
  const total = mine + npcs.reduce((a, n) => a + n.xp, 0);
  const pct = Math.min(100, (total / EXPEDITION_GOAL) * 100);
  const chapter = Math.min(4, CHAPTERS.filter((c) => c.at > 0 && pct >= c.at * 100).length);
  return {
    week,
    days,
    goal: EXPEDITION_GOAL,
    mine,
    npcs,
    total,
    pct,
    chapter,
    chapters: CHAPTERS,
    role: e.expedition.role,
    roleMeta: e.expedition.role ? ROLES[e.expedition.role] : null,
    complete: pct >= 100,
  };
}

export function chooseRole(role) {
  if (role && !ROLES[role]) return false;
  const e = ensureEngagement();
  e.expedition.role = role;
  e.expedition.roleTypes = role ? ROLES[role].types : null;
  logEvent('expedition_role', { role });
  save();
  return true;
}

export function roleBonusFor(type) {
  const e = ensureEngagement();
  if (e.mode !== 'expedition' || !e.expedition.role) return 1;
  const r = ROLES[e.expedition.role];
  return r && r.types.includes(type) ? 1.1 : 1;
}

export function seeChapter(index) {
  const e = ensureEngagement();
  if (!e.expedition.chaptersSeen.includes(index)) {
    e.expedition.chaptersSeen.push(index);
    logEvent('expedition_chapter', { index });
    save();
  }
}

export default {
  MODES,
  ROLES,
  ensureEngagement,
  setMode,
  mode,
  constellationNodes,
  constellationClusters,
  markConstellationPractice,
  ensureBounties,
  bountyProgress,
  activeBounty,
  acceptBounty,
  claimBounty,
  expeditionData,
  chooseRole,
  roleBonusFor,
  seeChapter,
};
