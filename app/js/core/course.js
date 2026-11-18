// Course model for the A1 curriculum. Pure data + lookups; no DOM/store.
import data from '../../data/a1.js';

export const META = data.meta;
export const UNITS = [...data.units].sort((a, b) => a.order - b.order);
export const LESSONS = [...data.lessons].sort((a, b) => a.nodeIndex - b.nodeIndex);
export const SENTENCES = data.sentences;
export const WORDS = data.words;
export const GRAMMAR = data.grammar;
export const DIALOGUES = data.dialogues;
export const READINGS = data.readings;

export const SENTENCE_BY_ID = Object.fromEntries(SENTENCES.map((s) => [s.id, s]));
export const WORD_BY_ID = Object.fromEntries(WORDS.map((w) => [w.id, w]));
export const GRAMMAR_BY_ID = Object.fromEntries(GRAMMAR.map((g) => [g.id, g]));
export const LESSON_BY_ID = Object.fromEntries(LESSONS.map((l) => [l.id, l]));
export const UNIT_BY_ID = Object.fromEntries(UNITS.map((u) => [u.id, u]));
export const DIALOGUE_BY_ID = Object.fromEntries(DIALOGUES.map((d) => [d.id, d]));
export const READING_BY_ID = Object.fromEntries(READINGS.map((r) => [r.id, r]));

export function lessonAt(index) {
  return LESSONS[Math.max(0, Math.min(LESSONS.length - 1, index))];
}
export function sentence(id) {
  return SENTENCE_BY_ID[id];
}
export function word(id) {
  return WORD_BY_ID[id];
}
export function grammar(id) {
  return GRAMMAR_BY_ID[id];
}
export function unit(id) {
  return UNIT_BY_ID[id];
}
export function unitOfLesson(index) {
  const l = lessonAt(index);
  return UNIT_BY_ID[l?.unitId] || UNITS[0];
}
export function lessonsOf(unitId) {
  return LESSONS.filter((l) => l.unitId === unitId);
}
export function sentencesOf(unitId) {
  return SENTENCES.filter((s) => s.unitId === unitId);
}
export function wordsOf(unitId) {
  return WORDS.filter((w) => w.unitId === unitId);
}
export function grammarOf(unitId) {
  return GRAMMAR.filter((g) => g.unitId === unitId);
}
export function lessonSentences(lesson) {
  return (lesson?.sentenceIds || []).map((id) => SENTENCE_BY_ID[id]).filter(Boolean);
}
export function lessonWords(lesson) {
  return (lesson?.wordIds || []).map((id) => WORD_BY_ID[id]).filter(Boolean);
}
export function lessonGrammar(lesson) {
  return (lesson?.grammarIds || []).map((id) => GRAMMAR_BY_ID[id]).filter(Boolean);
}
export function lessonDialogue(lesson) {
  return lesson?.dialogueId ? DIALOGUE_BY_ID[lesson.dialogueId] : null;
}
export function lessonReading(lesson) {
  return lesson?.readingId ? READING_BY_ID[lesson.readingId] : null;
}

export function isCheckpoint(lesson) {
  return lesson?.kind === 'checkpoint';
}

/**
 * Units unlock sequentially: the previous unit's four lessons must be finished.
 * The checkpoint is a badge/exam, not a gate — learning is never blocked by a test.
 */
export function unitUnlocked(unitId, completed = []) {
  const u = UNIT_BY_ID[unitId];
  if (!u) return false;
  if (u.order <= 1) return true;
  const prev = UNITS.find((x) => x.order === u.order - 1);
  if (!prev) return true;
  const done = new Set(completed);
  const required = lessonsOf(prev.id).filter((l) => l.kind !== 'checkpoint');
  return required.every((l) => done.has(l.nodeIndex));
}

export function lessonUnlocked(index, completed = []) {
  const l = lessonAt(index);
  if (!l) return false;
  if (!unitUnlocked(l.unitId, completed)) return false;
  if (l.order === 1) return true;
  const done = new Set(completed);
  const before = lessonsOf(l.unitId).filter((x) => x.order < l.order);
  return before.every((x) => done.has(x.nodeIndex));
}

export function nextLessonIndex(completed = []) {
  const done = new Set(completed);
  const i = LESSONS.findIndex((l) => !done.has(l.nodeIndex) && lessonUnlocked(l.nodeIndex, completed));
  if (i >= 0) return i;
  // Everything reachable is done (course finished) or a save is out of order.
  // Never hand a locked index back to the player: return the last unlocked one.
  for (let j = LESSONS.length - 1; j >= 0; j--) {
    if (lessonUnlocked(j, completed)) return j;
  }
  return 0;
}

export function unitProgress(unitId, mastery = {}) {
  const ls = lessonsOf(unitId).filter((l) => l.kind !== 'checkpoint');
  const done = ls.filter((l) => l.sentenceIds.every((sid) => (mastery[sid]?.tier || 0) >= 1));
  const sents = sentencesOf(unitId);
  const met = sents.filter((s) => (mastery[s.id]?.tier || 0) >= 1).length;
  const strong = sents.filter((s) => (mastery[s.id]?.tier || 0) >= 3).length;
  return {
    lessonsDone: done.length,
    lessonsTotal: ls.length,
    pct: ls.length ? (done.length / ls.length) * 100 : 0,
    sentences: sents.length,
    met,
    strong,
    metPct: sents.length ? (met / sents.length) * 100 : 0,
    strongPct: sents.length ? (strong / sents.length) * 100 : 0,
    stampPct: sents.length ? (strong / sents.length) * 100 : 0,
  };
}

export function allWords() {
  return WORDS;
}

export function idPrefix(id) {
  return String(id || '').slice(0, 3);
}

export default {
  META,
  UNITS,
  LESSONS,
  SENTENCES,
  WORDS,
  GRAMMAR,
  DIALOGUES,
  READINGS,
  SENTENCE_BY_ID,
  WORD_BY_ID,
  GRAMMAR_BY_ID,
  LESSON_BY_ID,
  UNIT_BY_ID,
  lessonAt,
  sentence,
  word,
  grammar,
  unit,
  unitOfLesson,
  lessonsOf,
  sentencesOf,
  wordsOf,
  grammarOf,
  lessonSentences,
  lessonWords,
  lessonGrammar,
  lessonDialogue,
  lessonReading,
  isCheckpoint,
  unitUnlocked,
  lessonUnlocked,
  nextLessonIndex,
  unitProgress,
};
