// Lesson/session builder for the A1 course. Pure: no store imports.
import {
  LESSONS,
  UNITS,
  UNIT_BY_ID,
  SENTENCES,
  SENTENCE_BY_ID,
  WORDS,
  WORD_BY_ID,
  lessonAt,
  nextLessonIndex,
  lessonsOf,
  sentencesOf,
  wordsOf,
  grammarOf,
  lessonSentences,
  lessonWords,
  lessonGrammar,
  lessonDialogue,
  lessonReading,
  unitUnlocked,
  lessonUnlocked,
  unitProgress,
} from './course.js';
import { buildTask, tokenize } from './quiz.js';
import { blankMastery, dueStatus } from './srs.js';
import { nowMs } from './clock.js';

export { UNITS, SENTENCES, nextLessonIndex };

export const NODES = LESSONS.map((l) => {
  const u = UNIT_BY_ID[l.unitId] || UNITS[0];
  return {
    ...l,
    index: l.nodeIndex,
    unitTitle: u.title,
    unitSubtitle: u.canDo?.[0] || '',
    koTitle: u.ko,
    sentenceIds: l.sentenceIds || [],
    nodeInUnit: l.order,
    nodeCountInUnit: lessonsOf(l.unitId).length,
    isUnitEnd: l.kind === 'checkpoint',
    label: `Session ${l.nodeIndex + 1}`,
  };
});

export const UNIT_META = UNITS.map((u) => {
  const ls = NODES.filter((n) => n.unitId === u.id);
  return {
    ...u,
    koTitle: u.ko,
    nodes: ls,
    sentence_ids: ls.flatMap((n) => n.sentenceIds),
    nodeCount: ls.length,
  };
});

export const UNIT_INDEX = Object.fromEntries(UNIT_META.map((u) => [u.id, u]));

export function nodeFor(index) {
  return NODES[Math.max(0, Math.min(NODES.length - 1, index))];
}
export function unitFor(unitId) {
  return UNIT_INDEX[unitId];
}
export function unitIndexOf(nodeIndex) {
  return NODES[nodeIndex]?.unitId || UNITS[0].id;
}

export function sentence0(name) {
  const who = (name || 'Lucas').trim() || 'Lucas';
  return {
    id: 'sentence0',
    korean: `저는 ${who}입니다.`,
    romanization: `jeoneun ${who}-imnida.`,
    english: `I am ${who}.`,
    gloss: [
      { ko: '저는', rom: 'jeoneun', en: 'as for me' },
      { ko: who, rom: who.toLowerCase(), en: who },
      { ko: '입니다', rom: 'imnida', en: 'am (formal)' },
    ],
    gloss_literal: `as for me, I am ${who}`,
    grammarIds: ['g01', 'g02'],
    word_ids: [],
    register: 'formal',
    difficulty: 1,
    isBonus: true,
  };
}

export function exerciseFor(sentenceId, type, ctx = {}) {
  if (sentenceId === 'sentence0') {
    const s = sentence0(ctx.name);
    return {
      type: 'say_it',
      id: 'sentence0:say_it',
      sentenceId: 'sentence0',
      korean: s.korean,
      romanization: s.romanization,
      english: s.english,
      gloss: s.gloss,
      clipId: null,
      clipKind: 's',
      prompt: s.korean,
      instruction: 'Your first sentence. Tap the speaker, then say it.',
      selfAssess: true,
      options: [],
      tiles: [],
      answer: [],
    };
  }
  return buildTask(type, { ...ctx, sentenceId });
}

function push(items, seen, ex) {
  if (!ex || seen.has(ex.id)) return;
  seen.add(ex.id);
  items.push(ex);
}

function sentenceTask(sentence, types, ctx) {
  for (const t of types) {
    const ex = buildTask(t, { ...ctx, sentenceId: sentence.id });
    if (ex) return ex;
  }
  return null;
}

const ROTATE = {
  vocab: ['listen_pick', 'translate_pick', 'tile_build', 'listen_pick', 'type_answer'],
  grammar: ['fill_blank', 'type_answer', 'tile_build', 'translate_pick', 'fill_blank'],
  listening: ['listen_pick', 'dictation', 'translate_pick', 'tile_build', 'listen_pick'],
  reading: ['translate_pick', 'tile_build', 'type_answer', 'listen_pick', 'translate_pick'],
  checkpoint: ['listen_pick', 'translate_pick', 'tile_build', 'type_answer', 'fill_blank', 'dictation'],
};

export function buildLessonItems(lesson, { name = '', mastery = {} } = {}) {
  const items = [];
  const seen = new Set();
  const sents = lessonSentences(lesson);
  const words = lessonWords(lesson);
  const unitWords = wordsOf(lesson.unitId);
  const pool = sentencesOf(lesson.unitId).map((s) => s.id);
  const poolWords = unitWords;
  const ctx = { pool, poolWords, name };

  if (lesson.kind === 'vocab') {
    words.slice(0, 4).forEach((w) => push(items, seen, buildTask('word_card', { wordId: w.id, ...ctx })));
    sents.slice(0, 6).forEach((s, i) => {
      const types = [ROTATE.vocab[i % ROTATE.vocab.length], 'translate_pick', 'tile_build'];
      push(items, seen, sentenceTask(s, types, ctx));
    });
    push(items, seen, buildTask('word_match', { words: words.slice(4, 9).map((w) => w.id), ...ctx }));
    push(items, seen, buildTask('say_it', { sentenceId: sents[0]?.id, ...ctx }));
  } else if (lesson.kind === 'grammar') {
    push(items, seen, buildTask('grammar_card', { grammarId: (lesson.grammarIds || [])[0], ...ctx }));
    sents.slice(0, 6).forEach((s, i) => {
      const types = [ROTATE.grammar[i % ROTATE.grammar.length], 'fill_blank', 'type_answer', 'tile_build'];
      push(items, seen, sentenceTask(s, types, ctx));
    });
    push(items, seen, buildTask('say_it', { sentenceId: sents[1]?.id || sents[0]?.id, ...ctx }));
  } else if (lesson.kind === 'listening') {
    push(items, seen, buildTask('dictation', { sentenceId: sents[0]?.id, ...ctx }));
    push(items, seen, buildTask('dictation', { sentenceId: sents[1]?.id, ...ctx }));
    sents.slice(2, 6).forEach((s) => push(items, seen, buildTask('listen_pick', { sentenceId: s.id, ...ctx })));
    const d = lessonDialogue(lesson);
    if (d) {
      [1, 3, 5].forEach((i) => {
        if (i < d.lines.length) push(items, seen, buildTask('dialogue_reply', { dialogueId: d.id, lineIndex: i, ...ctx }));
      });
    }
    push(items, seen, buildTask('say_it', { sentenceId: sents[2]?.id || sents[0]?.id, ...ctx }));
  } else if (lesson.kind === 'reading') {
    const r = lessonReading(lesson);
    if (r) [0, 1, 2].forEach((i) => push(items, seen, buildTask('reading_q', { readingId: r.id, qIndex: i, ...ctx })));
    sents.slice(0, 6).forEach((s, i) => {
      const types = [ROTATE.reading[i % ROTATE.reading.length], 'tile_build', 'translate_pick', 'type_answer'];
      push(items, seen, sentenceTask(s, types, ctx));
    });
    push(items, seen, buildTask('say_it', { sentenceId: sents[0]?.id, ...ctx }));
  } else {
    // checkpoint: 12 mixed items across the unit, no word cards / grammar cards
    const unitSents = shuffleSeeded(sentencesOf(lesson.unitId), lesson.nodeIndex || 0).slice(0, 7);
    unitSents.forEach((s, i) => {
      const types = [ROTATE.checkpoint[i % ROTATE.checkpoint.length], 'type_answer', 'listen_pick', 'tile_build'];
      push(items, seen, sentenceTask(s, types, ctx));
    });
    const ws = shuffleSeeded(wordsOf(lesson.unitId), lesson.nodeIndex || 1).slice(0, 4);
    ws.forEach((w) => push(items, seen, buildTask('word_pick', { wordId: w.id, ...ctx })));
    push(items, seen, buildTask('word_match', { words: ws.map((w) => w.id), ...ctx }));
  }

  return interleave(items);
}

function shuffleSeeded(arr, seed) {
  const a = arr.slice();
  let s = seed * 9301 + 49297;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function interleave(items) {
  const out = [];
  const rest = [...items];
  let guard = 0;
  while (rest.length && guard++ < 400) {
    let pick = rest.findIndex((x) => !out.length || x.type !== out[out.length - 1].type);
    if (pick < 0) pick = 0;
    out.push(rest.splice(pick, 1)[0]);
  }
  // ungraded cards belong at the front of their lesson
  const cards = out.filter((x) => x.ungraded);
  const graded = out.filter((x) => !x.ungraded);
  return [...cards, ...graded];
}

export function buildSession(kind, params = {}, mastery = {}, name = '') {
  let items = [];
  let lesson = null;

  if (kind === 'node') {
    const index = Math.max(0, Math.min(NODES.length - 1, params.nodeIndex ?? 0));
    lesson = lessonAt(index);
    items = buildLessonItems(lesson, { name, mastery });
    if (index === 0) items.unshift(exerciseFor('sentence0', 'say_it', { name }));
  } else {
    // review / daily / practice: due sentences, mixed tasks
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
    const pool = chosen;
    const unitWords = WORDS.filter((w) => chosen.some((id) => SENTENCE_BY_ID[id]?.unitId === w.unitId));
    chosen.forEach((id, i) => {
      const types = [ROTATE.vocab[i % ROTATE.vocab.length], 'translate_pick', 'tile_build', 'listen_pick'];
      const ex = sentenceTask(SENTENCE_BY_ID[id], types, { pool, poolWords: unitWords, name });
      if (ex) items.push(ex);
    });
    items = interleave(items);
  }

  return {
    kind,
    nodeIndex: kind === 'node' ? (lesson?.nodeIndex ?? 0) : null,
    lessonId: lesson?.id || null,
    lessonKind: lesson?.kind || kind,
    items,
    index: 0,
    correct: 0,
    wrong: 0,
    xp: 0,
    startedAt: nowMs(),
    mistakes: [],
    met: [],
    strong: [],
    answers: 0,
    combo: 0,
    bestCombo: 0,
    crits: 0,
  };
}

export function starsFor(wrong) {
  if (wrong === 0) return 3;
  if (wrong <= 2) return 2;
  return 1;
}

export function nodeUnlocked(index, completedNodes = []) {
  return lessonUnlocked(index, completedNodes);
}

export function masteryBlank(id, day = 0) {
  return blankMastery(id, day);
}

export function tokensOf(s) {
  return tokenize(s);
}

export function unitState(unitId, completed = [], mastery = {}) {
  const u = UNIT_BY_ID[unitId];
  return {
    unlocked: unitUnlocked(unitId, completed),
    progress: unitProgress(unitId, mastery),
  };
}

export default {
  UNITS,
  UNIT_META,
  NODES,
  SENTENCES,
  nodeFor,
  unitFor,
  buildSession,
  buildLessonItems,
  exerciseFor,
  sentence0,
  starsFor,
  nodeUnlocked,
  lessonAt,
  nextLessonIndex,
  lessonsOf,
  sentencesOf,
  wordsOf,
  grammarOf,
  lessonGrammar,
  lessonDialogue,
  lessonReading,
  unitUnlocked,
  unitProgress,
  nextLessonIndex,
  WORDS,
};
