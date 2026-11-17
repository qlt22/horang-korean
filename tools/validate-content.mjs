#!/usr/bin/env node
// A1 content validator. Usage: node tools/validate-content.mjs [u01 ...]
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'docs/content/a1';
const UNIT_GRAMMAR = {
  u01_intro: ['g01', 'g02', 'g03', 'g14'],
  u02_daily: ['g04', 'g05', 'g06', 'g07'],
  u03_food: ['g08', 'g09', 'g10', 'g11'],
  u04_shopping: ['g12', 'g13', 'g25', 'g46'],
  u05_places: ['g15', 'g16', 'g17', 'g18'],
  u06_time: ['g19', 'g20', 'g21', 'g48'],
  u07_family: ['g22', 'g23', 'g24', 'g47'],
  u08_hobbies: ['g26', 'g27', 'g28', 'g29'],
  u09_past: ['g30', 'g31', 'g32', 'g33'],
  u10_plans: ['g34', 'g35', 'g36', 'g37'],
  u11_health: ['g39', 'g40', 'g41', 'g42'],
  u12_travel: ['g43', 'g44', 'g45', 'g38'],
};
const KINDS = ['vocab', 'grammar', 'listening', 'reading', 'checkpoint'];
const HANGUL = /[가-힣]/;

let errors = 0;
let warnings = 0;
const err = (where, msg) => {
  errors++;
  console.log(`  ✗ ${where}: ${msg}`);
};
const warn = (where, msg) => {
  warnings++;
  console.log(`  ! ${where}: ${msg}`);
};
const ok = (msg) => console.log(`  ✓ ${msg}`);

function batchim(syllable) {
  const c = syllable.charCodeAt(0);
  if (c < 0xac00 || c > 0xd7a3) return null;
  return (c - 0xac00) % 28;
}
const hasFinal = (s) => {
  const b = batchim(s);
  return b === null ? null : b !== 0;
};

const PAIRS = {
  은: (final) => (final ? '은' : '는'),
  는: (final) => (final ? '은' : '는'),
  이: (final) => (final ? '이' : '가'),
  가: (final) => (final ? '이' : '가'),
  을: (final) => (final ? '을' : '를'),
  를: (final) => (final ? '을' : '를'),
  과: (final) => (final ? '과' : '와'),
  와: (final) => (final ? '과' : '와'),
  으로: (final, jong) => (jong === 8 ? '로' : final ? '으로' : '로'),
  로: (final, jong) => (jong === 8 ? '로' : final ? '으로' : '로'),
};
const PARTICLES = Object.keys(PAIRS).sort((a, b) => b.length - a.length);

function checkParticles(where, text, words) {
  const tokens = text.replace(/[.?!,~"'“”]/g, '').split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    for (const w of words) {
      if (!w.ko || w.ko.length < 1) continue;
      if (!token.startsWith(w.ko)) continue;
      const rest = token.slice(w.ko.length);
      if (!PARTICLES.includes(rest)) continue;
      const last = w.ko[w.ko.length - 1];
      const final = hasFinal(last);
      if (final === null) continue;
      const jong = batchim(last);
      const expected = PAIRS[rest](final, jong);
      if (expected !== rest) {
        err(where, `particle mismatch: "${token}" — ${w.ko} ends ${final ? 'with' : 'without'} batchim, expected "${w.ko}${expected}"`);
      }
    }
    // -습니다 / -ㅂ니다
    if (token.endsWith('습니다')) {
      const i = token.length - 3;
      if (i > 0) {
        const prev = token[i - 1];
        if (hasFinal(prev) === false) err(where, `"${token}" uses -습니다 after a vowel (expected -ㅂ니다)`);
      }
    } else if (token.endsWith('니다') && !token.endsWith('입니다')) {
      const prev = token[token.length - 3];
      if (prev && HANGUL.test(prev)) {
        const b = batchim(prev);
        if (b !== 17) err(where, `"${token}" should end in a ㅂ-final syllable before 니다`);
      }
    }
  }
}

const files = fs
  .readdirSync(DIR)
  .filter((f) => /^u\d\d\.json$/.test(f))
  .sort();
const only = process.argv.slice(2);
const selected = files.filter((f) => !only.length || only.some((u) => f.startsWith(u)));

if (!selected.length) {
  console.log('No unit files found in ' + DIR);
  process.exit(1);
}

const allKorean = new Map();
const allWords = new Map();
const totals = { units: 0, lessons: 0, sentences: 0, words: 0, grammar: 0, dialogues: 0, readings: 0 };

for (const file of selected) {
  const unitKey = file.replace('.json', '');
  console.log(`\n${file}`);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
  } catch (e) {
    err(file, 'invalid JSON — ' + e.message);
    continue;
  }
  const u = data.unit || {};
  const uid = u.id;
  if (!UNIT_GRAMMAR[uid]) {
    err(file, `unit.id must be one of ${Object.keys(UNIT_GRAMMAR).join(', ')}`);
    continue;
  }
  if (u.order !== Number(unitKey.slice(1))) err(file, `unit.order should be ${Number(unitKey.slice(1))}`);
  if (!u.title || !u.ko || !/^[가-힣]/.test(u.ko)) err(file, 'unit.title/ko missing or not Korean');
  if (!Array.isArray(u.canDo) || u.canDo.length < 2) err(file, 'unit.canDo needs ≥2 items');
  const expectG = UNIT_GRAMMAR[uid];
  if (JSON.stringify([...(u.grammarIds || [])].sort()) !== JSON.stringify([...expectG].sort())) {
    err(file, `unit.grammarIds must be exactly ${expectG.join(', ')}`);
  }

  const lessons = data.lessons || [];
  if (lessons.length !== 5) err(file, `expected 5 lessons, got ${lessons.length}`);
  lessons.forEach((l, i) => {
    if (l.unitId !== uid) err(`${file}/${l.id}`, 'lesson.unitId mismatch');
    if (l.order !== i + 1) err(`${file}/${l.id}`, `lesson.order should be ${i + 1}`);
    if (l.kind !== KINDS[i]) err(`${file}/${l.id}`, `lesson.kind should be "${KINDS[i]}"`);
    if (!l.title || !l.goal) err(`${file}/${l.id}`, 'lesson.title/goal missing');
    if (!Array.isArray(l.sentenceIds)) err(`${file}/${l.id}`, 'sentenceIds must be an array');
    if (!Array.isArray(l.wordIds)) err(`${file}/${l.id}`, 'wordIds must be an array');
    if (i === 4 && (l.sentenceIds || []).length !== 0) err(`${file}/${l.id}`, 'checkpoint must not own sentences');
    if (i === 4 && (l.wordIds || []).length !== 0) err(`${file}/${l.id}`, 'checkpoint must not own words');
    if (i === 2 && !l.dialogueId) err(`${file}/${l.id}`, 'listening lesson needs dialogueId');
    if (i === 3 && !l.readingId) err(`${file}/${l.id}`, 'reading lesson needs readingId');
  });

  const words = data.words || [];
  if (words.length !== 48) err(file, `expected 48 words, got ${words.length}`);
  const wordIds = new Set();
  words.forEach((w, i) => {
    const where = `${file}/${w.id || '?'}`;
    if (!/^w\d\d_\d\d$/.test(w.id || '')) err(where, 'word id must look like w01_01');
    if (wordIds.has(w.id)) err(where, 'duplicate word id');
    wordIds.add(w.id);
    if (w.unitId !== uid) err(where, 'word.unitId mismatch');
    if (!HANGUL.test(w.ko || '')) err(where, 'word.ko must contain Hangul');
    if (!w.rom || !/^[a-z\- ]+$/.test(w.rom)) err(where, 'word.rom must be lowercase romanization');
    if (!w.en) err(where, 'word.en missing');
    if (!['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'counter', 'number', 'particle', 'expression'].includes(w.pos)) {
      err(where, `word.pos "${w.pos}" is not in the allowed list`);
    }
    if (w.lessonId && !lessons.some((l) => l.id === w.lessonId)) err(where, 'word.lessonId does not resolve');
    if (w.ko.length > 8) warn(where, 'word is longer than 8 characters — is it a phrase?');
    if (allWords.has(w.ko)) warn(where, `word "${w.ko}" also appears in ${allWords.get(w.ko)}`);
    else allWords.set(w.ko, where);
  });

  const grammar = data.grammar || [];
  if (grammar.length !== 4) err(file, `expected 4 grammar points, got ${grammar.length}`);
  const grammarIds = new Set();
  grammar.forEach((g) => {
    const where = `${file}/${g.id || '?'}`;
    if (!expectG.includes(g.id)) err(where, `grammar ${g.id} is not assigned to ${uid}`);
    if (grammarIds.has(g.id)) err(where, 'duplicate grammar id');
    grammarIds.add(g.id);
    if (g.unitId !== uid) err(where, 'grammar.unitId mismatch');
    for (const field of ['label', 'ko', 'pattern', 'explanation']) if (!g[field]) err(where, `${field} missing`);
    if (!Array.isArray(g.examples) || g.examples.length !== 2) err(where, 'needs exactly 2 examples');
    (g.examples || []).forEach((ex, i) => {
      if (!HANGUL.test(ex.ko || '')) err(where, `example ${i + 1} is not Korean`);
      if (!ex.en) err(where, `example ${i + 1} has no English`);
    });
    if (!g.explanation || g.explanation.length > 200) warn(where, 'explanation should be one short line (≤200 chars)');
  });
  if (grammarIds.size !== 4) err(file, 'grammar ids do not cover all 4 assigned points');

  const sentences = data.sentences || [];
  if (sentences.length !== 24) err(file, `expected 24 sentences, got ${sentences.length}`);
  const sentenceIds = new Set();
  const lessonCount = {};
  sentences.forEach((s) => {
    const where = `${file}/${s.id || '?'}`;
    if (!/^s\d\d_\d_\d$/.test(s.id || '')) err(where, 'sentence id must look like s01_1_1');
    if (sentenceIds.has(s.id)) err(where, 'duplicate sentence id');
    sentenceIds.add(s.id);
    if (s.unitId !== uid) err(where, 'sentence.unitId mismatch');
    const lesson = lessons.find((l) => l.id === s.lessonId);
    if (!lesson) err(where, 'sentence.lessonId does not resolve');
    else if (!lesson.sentenceIds.includes(s.id)) err(where, 'lesson.sentenceIds does not include this sentence');
    lessonCount[s.lessonId] = (lessonCount[s.lessonId] || 0) + 1;
    if (!HANGUL.test(s.korean || '')) err(where, 'korean must contain Hangul');
    if (s.korean.length > 80) err(where, 'sentence longer than 80 characters');
    if (/\s{2,}/.test(s.korean)) err(where, 'double space in korean');
    if (!s.romanization || !/^[a-z0-9\-\s.?!]+$/.test(s.romanization)) err(where, 'romanization must be lowercase Revised Romanization');
    if (!s.english || !/[a-zA-Z]/.test(s.english)) err(where, 'english missing');
    if (!Array.isArray(s.gloss) || s.gloss.length < 2) err(where, 'needs at least 2 gloss entries');
    (s.gloss || []).forEach((g) => {
      if (!HANGUL.test(g.ko || '')) err(where, 'gloss.ko must be Korean');
      if (!g.en) err(where, 'gloss.en missing');
      if (!s.korean.includes(g.ko)) warn(where, `gloss "${g.ko}" is not a literal substring of the sentence`);
    });
    if (!Array.isArray(s.grammarIds) || s.grammarIds.length < 1) err(where, 'needs ≥1 grammarIds');
    (s.grammarIds || []).forEach((gid) => {
      if (!expectG.includes(gid)) err(where, `grammar ${gid} is not assigned to this unit`);
    });
    if (!Array.isArray(s.wordIds) || s.wordIds.length < 2) err(where, 'needs ≥2 wordIds');
    (s.wordIds || []).forEach((wid) => {
      if (!wordIds.has(wid)) err(where, `wordId ${wid} does not resolve in this unit`);
    });
    if (!['polite', 'formal'].includes(s.register)) err(where, 'register must be polite or formal');
    const d = s.distractors || [];
    if (d.length !== 3) err(where, 'needs exactly 3 distractors');
    if (new Set(d).size !== 3) err(where, 'distractors must be unique');
    if (d.includes(s.english)) err(where, 'distractor repeats the correct answer');
    if (allKorean.has(s.korean)) err(where, `duplicate Korean text also in ${allKorean.get(s.korean)}`);
    else allKorean.set(s.korean, where);
    checkParticles(where, s.korean, words);
  });
  [1, 2, 3, 4].forEach((n) => {
    if ((lessonCount[`l${unitKey.slice(1)}_${n}`] || 0) !== 6) {
      err(file, `lesson ${n} should own 6 sentences (has ${lessonCount[`l${unitKey.slice(1)}_${n}`] || 0})`);
    }
  });

  const dlg = data.dialogue;
  if (!dlg) err(file, 'dialogue missing');
  else {
    const where = `${file}/${dlg.id}`;
    if (dlg.unitId !== uid) err(where, 'dialogue.unitId mismatch');
    if (!dlg.title || !dlg.setting) err(where, 'dialogue title/setting missing');
    const lines = dlg.lines || [];
    if (lines.length < 6 || lines.length > 10) err(where, 'dialogue needs 6–10 lines');
    lines.forEach((l, i) => {
      if (l.id !== `${dlg.id}_${i + 1}`) err(where, `line ${i + 1} id should be ${dlg.id}_${i + 1}`);
      if (!['A', 'B'].includes(l.speaker)) err(where, `line ${i + 1} speaker must be A or B`);
      if (!HANGUL.test(l.ko || '')) err(where, `line ${i + 1} is not Korean`);
      if (!l.en) err(where, `line ${i + 1} english missing`);
      checkParticles(where, l.ko, words);
    });
  }

  const reading = data.reading;
  if (!reading) err(file, 'reading missing');
  else {
    const where = `${file}/${reading.id}`;
    if (reading.unitId !== uid) err(where, 'reading.unitId mismatch');
    if (!reading.title) err(where, 'title missing');
    if (!HANGUL.test(reading.ko || '')) err(where, 'reading.ko missing Korean');
    if (!reading.en) err(where, 'reading.en missing');
    const wc = (reading.ko || '').split(/\s+/).filter(Boolean).length;
    if (wc < 30 || wc > 110) warn(where, `reading is ${wc} words (target 50–90)`);
    const qs = reading.questions || [];
    if (qs.length !== 3) err(where, 'needs exactly 3 questions');
    qs.forEach((q, i) => {
      if (!q.q || !q.why) err(where, `question ${i + 1} needs q and why`);
      if (!Array.isArray(q.options) || q.options.length !== 4) err(where, `question ${i + 1} needs 4 options`);
      if (typeof q.answer !== 'number' || q.answer < 0 || q.answer > 3) err(where, `question ${i + 1} answer must be 0–3`);
    });
    checkParticles(where, reading.ko, words);
  }

  // word coverage: appear in a sentence, dialogue line, reading or grammar example
  const corpus = [
    ...sentences.map((s) => s.korean),
    ...((dlg && dlg.lines) || []).map((l) => l.ko),
    reading?.ko || '',
    ...grammar.flatMap((g) => (g.examples || []).map((e) => e.ko)),
  ].join(' ');
  const unused = words.filter((w) => !corpus.includes(w.ko));
  if (unused.length) warn(file, `${unused.length} words never appear in this unit: ${unused.slice(0, 8).map((w) => w.ko).join(', ')}${unused.length > 8 ? '…' : ''}`);

  totals.units++;
  totals.lessons += lessons.length;
  totals.sentences += sentences.length;
  totals.words += words.length;
  totals.grammar += grammar.length;
  totals.dialogues += dlg ? 1 : 0;
  totals.readings += reading ? 1 : 0;
  if (!errors || true) ok(`${uid}: ${sentences.length} sentences · ${words.length} words · ${grammar.length} grammar · ${lessons.length} lessons`);
}

console.log(`\nTotals: ${totals.units} units · ${totals.lessons} sessions · ${totals.sentences} sentences · ${totals.words} words · ${totals.grammar} grammar · ${totals.dialogues} dialogues · ${totals.readings} readings`);
console.log(`\n${errors ? `✗ ${errors} errors` : '✓ 0 errors'}, ${warnings} warnings`);
process.exit(errors ? 1 : 0);
