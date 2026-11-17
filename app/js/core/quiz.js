// A1 task engine: 12 exercise types, all self-describing for the player.
import {
  SENTENCES,
  SENTENCE_BY_ID,
  WORD_BY_ID,
  GRAMMAR_BY_ID,
  DIALOGUE_BY_ID,
  READING_BY_ID,
  WORDS,
} from './course.js';

export { SENTENCES };
export const BY_ID = SENTENCE_BY_ID;

export const TYPES = [
  'word_card',
  'grammar_card',
  'listen_pick',
  'translate_pick',
  'tile_build',
  'fill_blank',
  'type_answer',
  'dictation',
  'dialogue_reply',
  'reading_q',
  'word_pick',
  'word_match',
  'say_it',
];

export const TYPE_META = {
  word_card: { label: 'New word', short: 'Word', icon: 'book' },
  grammar_card: { label: 'Grammar', short: 'Grammar', icon: 'sparkle' },
  listen_pick: { label: 'Listen & choose', short: 'Listen', icon: 'sound' },
  translate_pick: { label: 'Pick the Korean', short: 'Pick', icon: 'arrow' },
  tile_build: { label: 'Build the sentence', short: 'Build', icon: 'quests' },
  fill_blank: { label: 'Fill the gap', short: 'Fill', icon: 'edit' },
  type_answer: { label: 'Write it in Korean', short: 'Write', icon: 'edit' },
  dictation: { label: 'Dictation', short: 'Dictate', icon: 'sound' },
  dialogue_reply: { label: 'What comes next?', short: 'Dialogue', icon: 'user' },
  reading_q: { label: 'Reading check', short: 'Read', icon: 'book' },
  word_pick: { label: 'Choose the word', short: 'Word', icon: 'book' },
  word_match: { label: 'Word match', short: 'Match', icon: 'clock' },
  say_it: { label: 'Say it out loud', short: 'Say', icon: 'sound' },
};

export function exerciseLabel(type) {
  return TYPE_META[type]?.label || type;
}

export function stripPunct(s) {
  return String(s).replace(/[.?!,~"'“”]/g, '').trim();
}
export function tokenize(s) {
  return stripPunct(s).split(/\s+/).filter(Boolean);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pickN(arr, n, exclude = []) {
  return shuffle(arr.filter((x) => !exclude.includes(x))).slice(0, n);
}
function optionsFrom(correct, wrongs, { ko = false } = {}) {
  const list = [
    { id: 'ok', label: correct, correct: true, ko },
    ...wrongs.map((w, i) => ({ id: 'w' + i, label: w, correct: false, ko })),
  ];
  return shuffle(list).map((o, i) => ({ ...o, key: i + 1 }));
}

const PARTICLE_SWAP = [
  ['에서', '에'],
  ['에', '에서'],
  ['으로', '로'],
  ['로', '으로'],
  ['은', '는'],
  ['는', '은'],
  ['이', '가'],
  ['가', '이'],
  ['을', '를'],
  ['를', '을'],
  ['과', '와'],
  ['와', '과'],
];
const STANDALONE_SWAP = {
  안: '못',
  못: '안',
  도: '만',
  만: '도',
  더: '제일',
  제일: '더',
  있어요: '없어요',
  없어요: '있어요',
  좋아요: '좋아해요',
  좋아해요: '좋아요',
  많이: '조금',
  조금: '많이',
  잘: '못',
  이에요: '예요',
  예요: '이에요',
  입니다: '이에요',
  주세요: '주지 마세요',
  하지만: '그래서',
  그래서: '하지만',
  그리고: '그래서',
};

function batchim(syllable) {
  const c = String(syllable || '').charCodeAt(0);
  if (!c || c < 0xac00 || c > 0xd7a3) return null;
  return (c - 0xac00) % 28;
}
function expectedParticle(stem, particle) {
  const last = stem[stem.length - 1];
  const jong = batchim(last);
  if (jong === null) return null;
  const final = jong !== 0;
  switch (particle) {
    case '은':
    case '는':
      return final ? '은' : '는';
    case '이':
    case '가':
      return final ? '이' : '가';
    case '을':
    case '를':
      return final ? '을' : '를';
    case '과':
    case '와':
      return final ? '과' : '와';
    case '으로':
    case '로':
      return jong === 8 ? '로' : final ? '으로' : '로';
    default:
      return particle;
  }
}

function buildBlank(sentenceObj, poolWords = []) {
  const tokens = tokenize(sentenceObj.korean);
  if (tokens.length < 2) return null;

  // 1) standalone grammar words are the clearest contrast (안/못, 도/만, 있어요/없어요…)
  for (let i = tokens.length - 1; i >= 0; i--) {
    const alt = STANDALONE_SWAP[tokens[i]];
    if (alt && alt !== tokens[i]) {
      return {
        before: tokens.slice(0, i).join(' '),
        after: tokens.slice(i + 1).join(' '),
        answer: tokens[i],
        index: i,
        options: optionsFrom(tokens[i], [alt]),
      };
    }
  }

  // 2) particles attached to a known noun in this unit
  for (let i = tokens.length - 1; i >= 0; i--) {
    for (const [suffix, alt] of PARTICLE_SWAP) {
      if (!tokens[i].endsWith(suffix)) continue;
      const stem = tokens[i].slice(0, -suffix.length);
      if (!stem) continue;
      const known = poolWords.some((w) => w.ko === stem);
      if (!known) continue;
      const expected = expectedParticle(stem, suffix);
      if (!expected || expected === alt) continue;
      return {
        before: tokens.slice(0, i).join(' '),
        after: tokens.slice(i + 1).join(' '),
        answer: tokens[i],
        index: i,
        options: optionsFrom(tokens[i], [stem + alt]),
      };
    }
  }
  return null;
}

export function nearMiss(a, b, max = 1) {
  const x = String(a).replace(/[\s.?!,]/g, '');
  const y = String(b).replace(/[\s.?!,]/g, '');
  if (!x || !y) return false;
  if (Math.abs(x.length - y.length) > max) return false;
  const dp = Array.from({ length: x.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= y.length; j++) dp[0][j] = j;
  for (let i = 1; i <= x.length; i++) {
    for (let j = 1; j <= y.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[x.length][y.length] <= max;
}

export function normalizeKorean(s) {
  return String(s || '')
    .replace(/[.?!,~"'“”]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

/**
 * buildTask(type, ctx)
 * ctx: { sentenceId, wordId, grammarId, pool: [sentenceId], poolWords, dialogueId, lineIndex, readingId, qIndex, words }
 */
export function buildTask(type, ctx = {}) {
  const s = ctx.sentenceId ? SENTENCE_BY_ID[ctx.sentenceId] : null;
  const base = {
    type,
    id: `${ctx.sentenceId || ctx.wordId || ctx.grammarId || ctx.dialogueId || ctx.readingId || type}:${type}:${ctx.lineIndex ?? ctx.qIndex ?? ''}`,
    sentenceId: s?.id || null,
    lessonId: s?.lessonId || null,
    unitId: s?.unitId || ctx.unitId || null,
    korean: s?.korean || '',
    romanization: s?.romanization || '',
    english: s?.english || '',
    gloss: s?.gloss || [],
    literal: s?.literal || '',
    grammarIds: s?.grammarIds || [],
    grammarTag: '',
    clipId: s?.id || null,
    clipKind: 's',
    prompt: '',
    instruction: '',
  };
  if (s) {
    const g = GRAMMAR_BY_ID[s.grammarIds?.[0]];
    base.grammarTag = g ? `${g.ko} · ${g.pattern}` : '';
  }

  switch (type) {
    case 'word_card': {
      const w = WORD_BY_ID[ctx.wordId];
      if (!w) return null;
      const example = SENTENCES.find((x) => (x.wordIds || []).includes(w.id));
      return {
        type,
        id: `word:${w.id}`,
        wordId: w.id,
        word: w,
        example: example || null,
        prompt: w.ko,
        instruction: 'New word — tap the speaker, then say it once',
        clipId: w.id,
        clipKind: 'w',
        ungraded: true,
      };
    }
    case 'grammar_card': {
      const g = GRAMMAR_BY_ID[ctx.grammarId];
      if (!g) return null;
      return {
        type,
        id: `grammar:${g.id}`,
        grammarId: g.id,
        grammar: g,
        prompt: g.ko,
        instruction: 'One pattern, two examples',
        ungraded: true,
      };
    }
    case 'listen_pick': {
      if (!s) return null;
      return {
        ...base,
        prompt: 'What does this mean?',
        instruction: 'Listen, then choose the meaning',
        hideKorean: true,
        options: optionsFrom(s.english, s.distractors || []),
      };
    }
    case 'translate_pick': {
      if (!s) return null;
      const pool = (ctx.pool || SENTENCES.map((x) => x.id)).filter((id) => id !== s.id);
      const wrong = pickN(pool, 2).map((id) => SENTENCE_BY_ID[id].korean).filter(Boolean);
      return {
        ...base,
        prompt: s.english,
        instruction: 'Choose the Korean',
        hideKorean: true,
        options: optionsFrom(s.korean, wrong, { ko: true }),
      };
    }
    case 'tile_build': {
      if (!s) return null;
      const answer = tokenize(s.korean);
      if (answer.length < 3) return null;
      let tiles = shuffle(answer);
      if (tiles.join(' ') === answer.join(' ')) tiles = shuffle(tiles);
      return {
        ...base,
        prompt: s.english,
        instruction: 'Tap the words in order',
        tiles,
        answer,
        altOrders: (s.alt_orders || []).map((a) => (Array.isArray(a) ? a : tokenize(a))),
      };
    }
    case 'fill_blank': {
      if (!s) return null;
      const blank = buildBlank(s, ctx.poolWords || []);
      if (!blank) return null;
      return {
        ...base,
        prompt: 'Which one fits?',
        instruction: 'Pick the missing word',
        blank,
        options: blank.options,
      };
    }
    case 'type_answer': {
      if (!s) return null;
      return {
        ...base,
        prompt: s.english,
        instruction: 'Write it in Korean',
        answerText: s.korean,
        hint: (s.gloss?.[0]?.ko || '') + '…',
        showRomanization: false,
        input: true,
      };
    }
    case 'dictation': {
      if (!s) return null;
      return {
        ...base,
        prompt: 'Type what you hear',
        instruction: 'Listen twice if you need to',
        hideKorean: true,
        answerText: s.korean,
        input: true,
        dictation: true,
      };
    }
    case 'dialogue_reply': {
      const d = DIALOGUE_BY_ID[ctx.dialogueId];
      if (!d) return null;
      const i = Math.max(1, Math.min(d.lines.length - 1, ctx.lineIndex ?? 1));
      const correct = d.lines[i];
      const context = d.lines.slice(Math.max(0, i - 2), i);
      const otherLines = Object.values(DIALOGUE_BY_ID)
        .filter((x) => x.id !== d.id)
        .flatMap((x) => x.lines.map((l) => l.ko))
        .filter((ko) => normalizeKorean(ko) !== normalizeKorean(correct.ko));
      const wrongs = pickN([...new Set(otherLines)], 2);
      return {
        type,
        id: `dlg:${d.id}:${i}`,
        dialogueId: d.id,
        lineIndex: i,
        dialogue: d,
        context,
        korean: correct.ko,
        romanization: correct.rom,
        english: correct.en,
        clipId: correct.id,
        clipKind: 'd',
        prompt: 'What comes next?',
        instruction: `${friendlySpeaker(correct.speaker)} replies`,
        options: optionsFrom(correct.ko, wrongs, { ko: true }),
        speaker: correct.speaker,
      };
    }
    case 'reading_q': {
      const r = READING_BY_ID[ctx.readingId];
      if (!r) return null;
      const i = ctx.qIndex ?? 0;
      const q = r.questions[i];
      if (!q) return null;
      return {
        type,
        id: `read:${r.id}:${i}`,
        readingId: r.id,
        qIndex: i,
        reading: r,
        question: q,
        prompt: q.q,
        instruction: 'Read the passage, then choose',
        options: shuffle(
          q.options.map((label, k) => ({ id: 'o' + k, label, correct: k === q.answer, ko: false }))
        ).map((o, k) => ({ ...o, key: k + 1 })),
        answerText: q.options[q.answer],
        why: q.why,
      };
    }
    case 'word_pick': {
      const w = WORD_BY_ID[ctx.wordId];
      if (!w) return null;
      const pool = ctx.poolWords && ctx.poolWords.length ? ctx.poolWords : WORDS;
      const wrong = pickN(pool.filter((x) => x.id !== w.id).map((x) => x.ko), 3);
      return {
        type,
        id: `wpick:${w.id}`,
        wordId: w.id,
        word: w,
        prompt: w.en,
        instruction: 'Choose the Korean word',
        clipId: w.id,
        clipKind: 'w',
        options: optionsFrom(w.ko, wrong, { ko: true }),
      };
    }
    case 'word_match': {
      const ids = ctx.words || [];
      if (ids.length < 3) return null;
      const pairs = ids.slice(0, 5).map((id) => {
        const w = WORD_BY_ID[id] || id;
        return { id: w.id, ko: w.ko, en: w.en, clipId: w.id };
      });
      return {
        type,
        id: 'match:' + pairs.map((p) => p.id).join('-'),
        pairs,
        prompt: 'Match the words',
        instruction: 'Tap a Korean word, then its meaning',
        seconds: 45,
      };
    }
    case 'say_it': {
      if (!s) return null;
      return {
        ...base,
        prompt: s.korean,
        instruction: 'Tap the speaker, then repeat it',
        selfAssess: true,
      };
    }
    default:
      return null;
  }
}

function friendlySpeaker(s) {
  return s === 'B' ? 'The other person' : 'The first speaker';
}

/** Legacy adapter used by older screens/tests: buildTask by sentence. */
export function buildExercise(sentenceId, type, ctx = {}) {
  return buildTask(type, { ...ctx, sentenceId });
}

export function gradeAnswer(ex, value) {
  if (!ex) return { correct: false, near: false };
  if (ex.ungraded) return { correct: true, near: false };
  if (ex.type === 'tile_build') {
    const got = Array.isArray(value) ? value.join(' ') : String(value || '');
    const norm = (x) => tokenize(x).join(' ');
    const ok = norm(got) === norm(ex.answer.join(' ')) || (ex.altOrders || []).some((o) => norm(o.join(' ')) === norm(got));
    return { correct: ok, near: false };
  }
  if (ex.type === 'fill_blank') return { correct: value === ex.blank.answer, near: false };
  if (ex.type === 'type_answer' || ex.type === 'dictation') {
    const a = normalizeKorean(ex.answerText);
    const b = normalizeKorean(value);
    if (!b) return { correct: false, near: false };
    if (a === b) return { correct: true, near: false };
    const near = nearMiss(a, b, ex.type === 'dictation' ? 1 : 1);
    return { correct: near, near };
  }
  if (ex.type === 'word_match') return { correct: false, near: false };
  if (ex.type === 'reading_q') {
    const opt = (ex.options || []).find((o) => o.id === value);
    return { correct: !!opt?.correct, near: false, correctLabel: ex.answerText, why: ex.why };
  }
  const opt = (ex.options || []).find((o) => o.id === value);
  return { correct: !!opt?.correct, near: false };
}

export function gradeSelection(ex, selection) {
  return gradeAnswer(ex, selection).correct;
}

export function correctAnswerText(ex) {
  if (!ex) return '';
  if (ex.type === 'tile_build') return ex.answer.join(' ');
  if (ex.type === 'fill_blank') return ex.blank.answer;
  if (ex.type === 'type_answer' || ex.type === 'dictation') return ex.answerText;
  if (ex.type === 'reading_q') return ex.answerText;
  if (ex.type === 'dialogue_reply') return ex.korean;
  const opt = (ex.options || []).find((o) => o.correct);
  return opt?.label || ex.korean;
}

export default {
  TYPES,
  TYPE_META,
  buildTask,
  buildExercise,
  gradeAnswer,
  gradeSelection,
  correctAnswerText,
  nearMiss,
  tokenize,
  stripPunct,
  normalizeKorean,
  SENTENCES,
  BY_ID,
};
