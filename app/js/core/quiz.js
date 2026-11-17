// Exercise generators for the six canonical types.
import data from '../../data/curriculum.js';

export const SENTENCES = data.sentences;
export const BY_ID = Object.fromEntries(SENTENCES.map((s) => [s.id, s]));

export const TYPES = ['listen_pick', 'translate_pick', 'tile_build', 'fill_blank', 'say_it', 'speed_match'];

export const TYPE_META = {
  listen_pick: { label: 'Listen & choose', short: 'Listen', icon: 'sound' },
  translate_pick: { label: 'Pick the Korean', short: 'Pick', icon: 'arrow' },
  tile_build: { label: 'Build the sentence', short: 'Build', icon: 'quests' },
  fill_blank: { label: 'Fill the particle', short: 'Fill', icon: 'sparkle' },
  say_it: { label: 'Say it out loud', short: 'Say', icon: 'sound' },
  speed_match: { label: 'Speed match', short: 'Match', icon: 'clock' },
};

export function exerciseLabel(type) {
  return TYPE_META[type]?.label || type;
}

export function stripPunct(s) {
  return String(s).replace(/[.?!,~]/g, '').trim();
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

const SWAPS = [
  ['이에요', '예요'],
  ['예요', '이에요'],
  ['입니다', '이에요'],
  ['습니다', '어요'],
  ['은', '는'],
  ['는', '은'],
  ['이', '가'],
  ['가', '이'],
  ['을', '를'],
  ['를', '을'],
  ['에서', '에'],
  ['에', '에서'],
  ['으로', '로'],
  ['로', '으로'],
  ['주세요', '줘요'],
  ['있어요', '없어요'],
  ['없어요', '있어요'],
  ['좋아요', '좋아해요'],
  ['좋아해요', '좋아요'],
  ['아요', '어요'],
  ['어요', '아요'],
];

function swapToken(tok) {
  for (const [a, b] of SWAPS) {
    if (a === b) continue;
    if (tok.endsWith(a) && tok.length > a.length) {
      return tok.slice(0, -a.length) + b;
    }
  }
  return null;
}

const PARTICLE_RE = /(은|는|이|가|을|를|에|에서|으로|로|예요|이에요|입니다|습니다|세요|어요|아요|해요|주세요|네요|까요)$/;

function buildBlank(sentence) {
  const tokens = tokenize(sentence.korean);
  // A blank is only a real grammar choice if (a) there is other context and
  // (b) the missing token has a meaningful contrast (은/는, 이/가, 을/를, …).
  if (tokens.length < 2) return null;
  let idx = -1;
  let wrong = null;
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (PARTICLE_RE.test(tokens[i]) && tokens[i].length > 1) {
      const swap = swapToken(tokens[i]);
      if (swap && swap !== tokens[i]) {
        idx = i;
        wrong = swap;
        break;
      }
    }
  }
  if (idx < 0 || !wrong) return null;
  const answer = tokens[idx];
  return {
    before: tokens.slice(0, idx).join(' '),
    after: tokens.slice(idx + 1).join(' '),
    tokens,
    index: idx,
    answer,
    options: shuffle([{ id: 'ok', label: answer, correct: true }, { id: 'no', label: wrong, correct: false }]),
  };
}

function optionsFrom(correctLabel, wrongLabels) {
  const opts = [
    { id: 'ok', label: correctLabel, correct: true },
    ...wrongLabels.map((l, i) => ({ id: 'w' + i, label: l, correct: false })),
  ];
  return shuffle(opts).map((o, i) => ({ ...o, key: i + 1 }));
}

/**
 * buildExercise(sentenceId, type, ctx)
 * ctx: { pool: [sentenceId], pairs: n }
 */
export function buildExercise(sentenceId, type, ctx = {}) {
  const s = BY_ID[sentenceId];
  if (!s) throw new Error('Unknown sentence ' + sentenceId);
  const base = {
    type,
    sentenceId,
    korean: s.korean,
    english: s.english,
    romanization: s.romanization,
    audio: s.audio?.text || stripPunct(s.korean),
    gloss: s.gloss,
    glossLiteral: s.gloss_literal,
    grammarTag: s.grammar_tag,
    sentence: s,
    prompt: '',
    instruction: '',
  };

  switch (type) {
    case 'listen_pick': {
      const wrong = pickN(
        s.distractors && s.distractors.length >= 3
          ? s.distractors
          : SENTENCES.filter((x) => x.id !== s.id).map((x) => x.english),
        3
      );
      return {
        ...base,
        prompt: 'What does this mean?',
        instruction: 'Tap the speaker, then choose',
        hideKorean: true,
        options: optionsFrom(s.english, wrong),
      };
    }
    case 'translate_pick': {
      const pool = (ctx.pool || SENTENCES.map((x) => x.id)).filter((id) => id !== s.id);
      const wrong = pickN(pool, 2).map((id) => BY_ID[id].korean);
      return {
        ...base,
        prompt: s.english,
        instruction: 'Choose the Korean',
        hideKorean: true,
        options: optionsFrom(s.korean, wrong).map((o) => ({ ...o, ko: true })),
      };
    }
    case 'tile_build': {
      const answer = tokenize(s.korean);
      let tiles = shuffle(answer);
      // Guarantee the shuffled row is not already the answer.
      if (answer.length > 1 && tiles.join(' ') === answer.join(' ')) tiles = shuffle(tiles);
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
      const blank = buildBlank(s);
      if (!blank) return buildExercise(sentenceId, 'translate_pick', ctx);
      return {
        ...base,
        prompt: 'Which one fits?',
        instruction: 'Pick the missing word',
        blank,
        options: blank.options.map((o, i) => ({ ...o, key: i + 1 })),
      };
    }
    case 'speed_match': {
      const n = ctx.pairs || 4;
      const pool = (ctx.pool || SENTENCES.map((x) => x.id)).filter((id) => id !== s.id);
      const ids = [s.id, ...pickN(pool, Math.max(0, n - 1))];
      const pairs = shuffle(
        ids.map((id) => ({ id, ko: BY_ID[id].korean, en: BY_ID[id].english }))
      );
      return {
        ...base,
        prompt: 'Match Korean to English',
        instruction: 'Tap a pair. 45 seconds.',
        pairs,
        seconds: 45,
      };
    }
    case 'say_it':
    default:
      return {
        ...base,
        prompt: 'Say it out loud',
        instruction: 'Tap the speaker, then repeat',
        selfAssess: true,
      };
  }
}

export function gradeSelection(ex, selection) {
  if (!ex) return false;
  if (ex.type === 'say_it') return true;
  if (ex.type === 'tile_build') {
    const got = Array.isArray(selection) ? selection.join(' ') : String(selection || '');
    const norm = (x) => tokenize(x).join(' ');
    if (norm(got) === norm(ex.answer.join(' '))) return true;
    return (ex.altOrders || []).some((o) => norm(Array.isArray(o) ? o.join(' ') : o) === norm(got));
  }
  if (ex.type === 'fill_blank') {
    return selection === ex.blank.answer;
  }
  if (ex.type === 'speed_match') {
    return false; // scored by the matcher, not here
  }
  const opt = (ex.options || []).find((o) => o.id === selection);
  return !!opt?.correct;
}

export function correctAnswerText(ex) {
  if (!ex) return '';
  if (ex.type === 'tile_build') return ex.answer.join(' ');
  if (ex.type === 'fill_blank') return ex.blank.answer;
  if (ex.type === 'speed_match') return ex.korean;
  const opt = (ex.options || []).find((o) => o.correct);
  return opt?.label || ex.korean;
}

/** Levenshtein ≤ 1 — used to grade typed answers as "almost" (kept for future use). */
export function nearMiss(a, b) {
  const x = String(a).replace(/\s+/g, '');
  const y = String(b).replace(/\s+/g, '');
  if (Math.abs(x.length - y.length) > 1) return false;
  let i = 0,
    j = 0,
    diff = 0;
  while (i < x.length && j < y.length) {
    if (x[i] === y[j]) {
      i++;
      j++;
      continue;
    }
    if (++diff > 1) return false;
    if (x.length > y.length) i++;
    else if (y.length > x.length) j++;
    else {
      i++;
      j++;
    }
  }
  return diff + (x.length - i) + (y.length - j) <= 1;
}

export default { buildExercise, gradeSelection, correctAnswerText, SENTENCES, BY_ID, TYPES, TYPE_META, tokenize, stripPunct };
