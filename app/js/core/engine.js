// Path model + session builder. Pure: no store imports.
import data from '../../data/curriculum.js';
import { buildExercise, BY_ID, tokenize } from './quiz.js';
import { blankMastery, dueStatus } from './srs.js';
import { nowMs } from './clock.js';

export const UNITS = [...data.units].sort((a, b) => a.order - b.order);
export const SENTENCES = data.sentences;

const KO_TITLE = {
  u1_greetings: '인사',
  u2_introducing_yourself: '자기소개',
  u3_food_ordering: '음식',
  u4_daily_routine: '일상',
  u5_places_directions: '길 찾기',
  u6_feelings_smalltalk: '기분',
  u7_wrap_up: '마무리',
};

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export const NODES = (() => {
  const nodes = [];
  UNITS.forEach((u, ui) => {
    const chunks = chunk(u.sentence_ids, 3);
    chunks.forEach((ids, ci) => {
      nodes.push({
        index: nodes.length,
        unitId: u.id,
        unitOrder: u.order,
        unitTitle: u.title,
        unitSubtitle: u.subtitle,
        koTitle: KO_TITLE[u.id] || '',
        nodeInUnit: ci + 1,
        nodeCountInUnit: chunks.length,
        sentenceIds: ids,
        isUnitEnd: ci === chunks.length - 1,
        label: `Node ${nodes.length + 1}`,
      });
    });
  });
  return nodes;
})();

export const UNIT_META = UNITS.map((u) => ({
  ...u,
  koTitle: KO_TITLE[u.id] || '',
  nodes: NODES.filter((n) => n.unitId === u.id),
}));

export function nodeFor(index) {
  return NODES[Math.max(0, Math.min(NODES.length - 1, index))];
}
export function unitFor(unitId) {
  return UNIT_META.find((u) => u.id === unitId);
}
export function unitIndexOf(nodeIndex) {
  return NODES[nodeIndex]?.unitOrder || 1;
}

export function sentence0(name) {
  const who = (name || 'Lucas').trim() || 'Lucas';
  return {
    id: 'sentence0',
    korean: `저는 ${who}입니다.`,
    romanization: `jeoneun ${who}imnida`,
    english: `I am ${who}.`,
    gloss: [
      { ko: '저는', rom: 'jeoneun', en: 'as for me' },
      { ko: who, rom: who.toLowerCase(), en: who },
      { ko: '입니다', rom: 'imnida', en: 'am (formal)' },
    ],
    gloss_literal: 'as for me, I am ' + who,
    grammar_tag: 'topic marker 은/는 + 입니다',
    grammar_point_id: 'gp_topic_eun_neun',
    distractors: ['I am tired.', 'My name is Minji.', 'I am a student.'],
    word_ids: [],
    alt_orders: [],
    register: 'formal polite',
    difficulty: 1,
    audio: { lang: 'ko-KR', rate: 0.82, text: `저는 ${who}입니다` },
    isBonus: true,
  };
}

export function exerciseFor(sentenceId, type, ctx = {}) {
  if (sentenceId === 'sentence0') {
    const s = sentence0(ctx.name);
    return {
      type,
      sentenceId: 'sentence0',
      korean: s.korean,
      english: s.english,
      romanization: s.romanization,
      audio: s.audio.text,
      gloss: s.gloss,
      glossLiteral: s.gloss_literal,
      grammarTag: s.grammar_tag,
      sentence: s,
      prompt: 'Say it out loud',
      instruction: 'Your first sentence. Tap the speaker.',
      selfAssess: true,
      options: [],
      tiles: [],
      answer: [],
    };
  }
  return buildExercise(sentenceId, type, ctx);
}

const ROTATION = ['listen_pick', 'translate_pick', 'tile_build', 'fill_blank', 'say_it'];

// A one-word sentence ("죄송합니다") makes a trivial tile puzzle — swap it out.
function safeExercise(sentenceId, type, ctx = {}) {
  if (type === 'tile_build' && sentenceId !== 'sentence0' && tokenize(BY_ID[sentenceId].korean).length < 2) {
    return exerciseFor(sentenceId, 'listen_pick', ctx);
  }
  return exerciseFor(sentenceId, type, ctx);
}

function availableTypes(sentenceId) {
  if (sentenceId === 'sentence0') return ['say_it'];
  const types = ['listen_pick', 'translate_pick', 'say_it'];
  if (tokenize(BY_ID[sentenceId].korean).length >= 2) types.push('tile_build');
  try {
    if (buildExercise(sentenceId, 'fill_blank').type === 'fill_blank') types.push('fill_blank');
  } catch {
    /* ignore */
  }
  return types;
}

export function buildSession(kind, params = {}, mastery = {}, name = '') {
  let items = [];

  if (kind === 'node') {
    const node = nodeFor(params.nodeIndex ?? 0);
    const ids = node.sentenceIds;
    // Build 3 distinct touches per sentence from the exercises that actually
    // make sense for that sentence (no one-word tile puzzles or fake blanks).
    ids.forEach((id, i) => {
      const avail = availableTypes(id);
      for (let k = 0; k < 3; k++) {
        items.push(safeExercise(id, avail[(i + k + node.index) % avail.length], { name, pool: ids }));
      }
    });
    if (node.index === 0) {
      items.unshift(exerciseFor('sentence0', 'say_it', { name }));
    }
    items.push(exerciseFor(ids[0], 'speed_match', { pool: ids, pairs: Math.min(4, ids.length) }));
    items = interleave(items);
  } else {
    const all = SENTENCES.map((s) => s.id);
    const due = all.filter((id) => {
      const m = mastery[id];
      return m && dueStatus(m, nowMs()) !== 'scheduled' && m.tier > 0;
    });
    const fresh = all.filter((id) => !mastery[id] || mastery[id].tier === 0);
    let chosen;
    if (kind === 'review') chosen = due.slice(0, 10);
    else if (kind === 'daily') chosen = [...due.slice(0, 8), ...fresh.slice(0, 4)];
    else chosen = [...due.slice(0, 6), ...fresh.slice(0, 4)];
    if (!chosen.length) chosen = all.slice(0, 8);
    items = chosen.map((id, i) =>
      safeExercise(id, ROTATION[(i + chosen.length) % ROTATION.length], { pool: chosen, name })
    );
    items = interleave(items);
  }

  return {
    kind,
    nodeIndex: kind === 'node' ? (params.nodeIndex ?? 0) : null,
    items,
    index: 0,
    correct: 0,
    wrong: 0,
    xp: 0,
    startedAt: nowMs(),
    mistakes: [],
    answers: 0,
  };
}

/** Avoid two identical exercise types in a row without changing the mix. */
function interleave(items) {
  const out = [];
  const rest = [...items];
  let guard = 0;
  while (rest.length && guard++ < 500) {
    let pick = rest.findIndex((x) => !out.length || x.type !== out[out.length - 1].type);
    if (pick < 0) pick = 0;
    out.push(rest.splice(pick, 1)[0]);
  }
  return out;
}

export function starsFor(wrong) {
  if (wrong === 0) return 3;
  if (wrong <= 2) return 2;
  return 1;
}

export function nodeUnlocked(index, completedNodes = []) {
  if (index <= 0) return true;
  const done = new Set(completedNodes);
  return NODES.slice(0, index).every((n) => done.has(n.index));
}

export function unitUnlocked(unitId, completedNodes = []) {
  const unit = UNIT_META.find((u) => u.id === unitId);
  if (!unit) return false;
  const before = NODES.filter((n) => n.unitOrder < unit.order);
  if (!before.length) return true;
  return before.every((n) => completedNodes.includes(n.index));
}

export function masteryBlank(id, day = 0) {
  return blankMastery(id, day);
}

export function tokensOf(s) {
  return tokenize(s);
}

export default {
  UNITS,
  UNIT_META,
  NODES,
  SENTENCES,
  nodeFor,
  unitFor,
  buildSession,
  exerciseFor,
  sentence0,
  starsFor,
  nodeUnlocked,
  unitUnlocked,
  BY_ID,
};
