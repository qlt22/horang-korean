// W5 · A1 final exam (30 mixed questions) + printable certificate.
// Entry is gated on 12 unit badges; reviewers can run a clearly-labelled 5-question preview.
// This is an assessment: it never calls recordAnswer and never touches mastery/XP.
import { state, save, logEvent } from '../core/store.js';
import {
  META,
  UNITS,
  UNIT_BY_ID,
  SENTENCES,
  READINGS,
  sentencesOf,
  wordsOf,
  lessonsOf,
} from '../core/course.js';
import { buildTask, gradeAnswer, correctAnswerText, TYPE_META } from '../core/quiz.js';
import * as ui from '../core/ui.js';
import * as audio from '../core/audio.js';
import router from '../core/router.js';
import { today } from '../core/clock.js';

const TOTAL = 30;
const PASS_MARK = 24; // 80% of 30
const PASS_PCT = 80;

const MIX = [
  ['listen_pick', 6],
  ['translate_pick', 6],
  ['type_answer', 5],
  ['fill_blank', 5],
  ['reading_q', 4],
  ['word_pick', 4],
];
const PREVIEW_TYPES = ['listen_pick', 'translate_pick', 'fill_blank', 'reading_q', 'word_pick'];

// ---------- deterministic sampling ----------
function hashSeed(str) {
  let h = 2166136261;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleSeeded(arr, seed) {
  const r = rng(seed);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function expandTypes(list) {
  const out = [];
  list.forEach(([type, n]) => {
    for (let i = 0; i < n; i++) out.push(type);
  });
  return out;
}

function mixTypes(types, seed) {
  const a = shuffleSeeded(types, seed + 1);
  for (let i = 1; i < a.length; i++) {
    if (a[i] === a[i - 1]) {
      const j = a.findIndex((t, k) => k > i && t !== a[i - 1]);
      if (j > i) [a[i], a[j]] = [a[j], a[i]];
    }
  }
  return a;
}

// Four reading/word questions must not land twice on the same unit. Swap with a
// flexible sentence slot when the unit cycle repeats.
function uniqueUnits(plan, type) {
  const used = new Set();
  plan.forEach((slot, i) => {
    if (slot.type !== type) return;
    if (!used.has(slot.unitId)) {
      used.add(slot.unitId);
      return;
    }
    const j = plan.findIndex(
      (s, k) => k !== i && s.type !== 'reading_q' && s.type !== 'word_pick' && !used.has(s.unitId)
    );
    if (j >= 0) {
      const tmp = slot.unitId;
      plan[i].unitId = plan[j].unitId;
      plan[j].unitId = tmp;
      used.add(plan[i].unitId);
    }
  });
}

function takeSentence(unitId, seed, used) {
  const list = shuffleSeeded(sentencesOf(unitId), seed);
  const s = list.find((x) => !used.has(x.id));
  if (!s) return null;
  used.add(s.id);
  return s;
}

function takeTypeAnswerSentence(unitId, seed, used) {
  const list = shuffleSeeded(sentencesOf(unitId), seed);
  const short = list.find((x) => !used.has(x.id) && x.korean.split(/\s+/).length <= 7);
  const s = short || list.find((x) => !used.has(x.id));
  if (!s) return null;
  used.add(s.id);
  return s;
}

function makeQuestion(type, unitId, seed, used, preview = false) {
  const pool = sentencesOf(unitId).map((s) => s.id);
  const poolWords = wordsOf(unitId);

  if (type === 'listen_pick') {
    const s = takeSentence(unitId, seed, used.sentences);
    if (!s) return null;
    return buildTask('listen_pick', { sentenceId: s.id, pool, poolWords });
  }
  if (type === 'translate_pick') {
    const s = takeSentence(unitId, seed, used.sentences);
    if (!s) return null;
    return buildTask('translate_pick', { sentenceId: s.id, pool: SENTENCES.map((x) => x.id), poolWords });
  }
  if (type === 'type_answer') {
    const s = takeTypeAnswerSentence(unitId, seed, used.sentences);
    if (!s) return null;
    return buildTask('type_answer', { sentenceId: s.id, pool, poolWords });
  }
  if (type === 'fill_blank') {
    const list = shuffleSeeded(sentencesOf(unitId), seed);
    for (const s of list) {
      if (used.sentences.has(s.id)) continue;
      const ex = buildTask('fill_blank', { sentenceId: s.id, poolWords });
      if (!ex) continue;
      used.sentences.add(s.id);
      return ex;
    }
    return null;
  }
  if (type === 'reading_q') {
    const rs = READINGS.filter((r) => r.unitId === unitId);
    const r = shuffleSeeded(rs, seed)[0];
    if (!r || !r.questions.length) return null;
    const qSeed = Math.floor(rng(seed + 7)() * r.questions.length);
    for (let step = 0; step < r.questions.length; step++) {
      const qIndex = (qSeed + step) % r.questions.length;
      const key = `${r.id}:${qIndex}`;
      if (used.readings.has(key)) continue;
      used.readings.add(key);
      return buildTask('reading_q', { readingId: r.id, qIndex });
    }
    return null;
  }
  if (type === 'word_pick') {
    const list = shuffleSeeded(wordsOf(unitId), seed);
    const w = list.find((x) => !used.words.has(x.id));
    if (!w) return null;
    used.words.add(w.id);
    return buildTask('word_pick', { wordId: w.id, poolWords, preview });
  }
  return null;
}

function buildExam(mode) {
  const preview = mode === 'preview';
  const total = preview ? 5 : TOTAL;
  const seed = hashSeed(`${preview ? 'a1-preview' : 'a1-exam'}:${today()}`);
  const types = preview ? PREVIEW_TYPES.slice() : mixTypes(expandTypes(MIX), seed);
  const unitOrder = shuffleSeeded(UNITS.map((u) => u.id), seed + 9);
  const plan = types.map((type, i) => ({ type, unitId: unitOrder[i % unitOrder.length] }));

  uniqueUnits(plan, 'reading_q');
  uniqueUnits(plan, 'word_pick');

  const used = { sentences: new Set(), words: new Set(), readings: new Set() };
  const out = [];
  plan.forEach((slot, i) => {
    const ex = makeQuestion(slot.type, slot.unitId, seed + i * 131, used, preview);
    if (ex) out.push(ex);
  });

  // Safety net: never ship a short exam even if a unit runs out of candidates.
  let guard = 0;
  while (out.length < total && guard < 80) {
    const unitId = unitOrder[guard % unitOrder.length];
    const ex = makeQuestion('translate_pick', unitId, seed + 5000 + guard * 17, used, preview);
    if (ex) out.push(ex);
    guard++;
  }
  return out.slice(0, total);
}

function unitOf(ex) {
  return ex?.unitId || ex?.word?.unitId || ex?.reading?.unitId || null;
}

function typeLabel(ex) {
  return TYPE_META?.[ex?.type]?.label || ex?.type || 'Question';
}

function fmtClock(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function correctExplain(ex) {
  if (!ex) return '';
  if (ex.type === 'reading_q') return ex.why || ex.answerText || '';
  if (ex.type === 'word_pick') return ex.word ? `${ex.word.ko} — ${ex.word.en}` : '';
  if (ex.type === 'type_answer') return '';
  if (ex.korean && ex.english) return `${ex.korean} — ${ex.english}`;
  return ex.english || ex.korean || '';
}

function fmtDate(iso) {
  const d = iso ? new Date(iso) : new Date();
  try {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function initials(name) {
  const clean = (name || 'Explorer').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

// ---------- module state ----------
let host = null;
let phase = 'intro'; // locked | intro | run | result | certificate | previewResult
let mode = 'exam';
let questions = [];
let idx = 0;
let answers = [];
let graded = false;
let selected = null;
let result = null;
let startedAt = 0;
let clockTimer = null;

function stopClock() {
  if (clockTimer) clearInterval(clockTimer);
  clockTimer = null;
}

function startClock() {
  stopClock();
  startedAt = Date.now();
  clockTimer = setInterval(() => {
    const el = host?.querySelector('[data-exam-clock]');
    if (el) el.textContent = fmtClock(Date.now() - startedAt);
  }, 500);
}

function badgeCount() {
  return new Set(state.badges || []).size;
}

function scrollTop() {
  try {
    window.scrollTo(0, 0);
    const s = document.getElementById('screen');
    if (s) s.scrollTop = 0;
  } catch {
    /* ignore */
  }
}

// ---------- views ----------
function lockedHtml() {
  const earned = badgeCount();
  const pct = Math.round((earned / UNITS.length) * 100);
  return `<section class="screen exam exam--locked">
    <header class="exam-head">
      <p class="overline">Final assessment</p>
      <h1 class="exam-h1">A1 exam</h1>
      <p class="exam-sub">The certificate opens when all ${UNITS.length} unit badges are earned. Learning is never blocked by a test — this is the finish line, not a gate.</p>
    </header>

    <div class="exam-lock">
      <span class="exam-lock-art" aria-hidden="true">${ui.icon('lock', 30)}</span>
      <div class="exam-lock-count"><b>${earned}</b><span>/ ${UNITS.length} unit badges</span></div>
      <div class="exam-bar exam-bar--lock" role="progressbar" aria-label="Unit badges earned" aria-valuemin="0" aria-valuemax="${UNITS.length}" aria-valuenow="${earned}">
        <i style="width:${pct}%"></i>
      </div>
      <p class="exam-lock-note">${UNITS.length - earned} to go. Four lessons per unit, then its checkpoint.</p>
    </div>

    <div class="exam-badge-grid" aria-label="Unit badges">
      ${UNITS.map((u) => {
        const on = (state.badges || []).includes(u.id);
        return `<div class="exam-badge ${on ? 'is-earned' : 'is-locked'}">
          <span class="exam-badge-seal" aria-hidden="true">${on ? ui.icon('check', 15) : ui.icon('lock', 13)}</span>
          <span class="exam-badge-unit">Unit ${u.order}</span>
          <b class="ko" lang="ko">${ui.esc(u.ko)}</b>
          <span class="exam-badge-en">${ui.esc(u.title)}</span>
        </div>`;
      }).join('')}
    </div>

    <div class="exam-actions">
      <button class="btn btn-primary btn-block" data-go="home" type="button">Back to Learn</button>
      <button class="btn btn-secondary btn-block" data-go="passport" type="button">Open Collection</button>
      <button class="btn btn-ghost btn-block exam-preview-btn" data-exam-preview type="button">
        ${ui.icon('eye', 17)} Preview 5 questions · not scored
      </button>
      <p class="exam-micro">Preview does not unlock the exam and never changes your progress.</p>
    </div>
  </section>`;
}

function mixChips() {
  return MIX.map(
    ([type, n]) => `<span class="exam-mix-chip"><b>${n}</b> ${ui.esc(TYPE_META?.[type]?.short || type)}</span>`
  ).join('');
}

function introHtml() {
  const last = state.flags.a1Exam;
  if (mode === 'preview') {
    return `<section class="screen exam exam--intro">
      <header class="exam-head">
        <p class="overline">Reviewer preview · not scored</p>
        <h1 class="exam-h1">A1 exam preview</h1>
        <p class="exam-sub">Five questions so you can feel the format. Nothing is unlocked, saved or graded against your progress.</p>
      </header>
      <div class="exam-card">
        <div class="exam-card-head"><h2>What you'll see</h2><span class="pill pill--sm">5 questions</span></div>
        <div class="exam-mix">
          <span class="exam-mix-chip"><b>1</b> Listen</span>
          <span class="exam-mix-chip"><b>1</b> Pick</span>
          <span class="exam-mix-chip"><b>1</b> Fill</span>
          <span class="exam-mix-chip"><b>1</b> Read</span>
          <span class="exam-mix-chip"><b>1</b> Word</span>
        </div>
        <p class="exam-preview-note">No hints, no retry — same rules as the real thing. Your answers are not stored.</p>
      </div>
      <div class="exam-actions">
        <button class="btn btn-primary btn-block btn-lg" data-exam-preview type="button">Start the preview ${ui.icon('arrow', 20)}</button>
        <button class="btn btn-ghost btn-block" data-go="home" type="button">Back to Learn</button>
      </div>
    </section>`;
  }
  return `<section class="screen exam exam--intro">
    <header class="exam-head">
      <p class="overline">Final assessment</p>
      <span class="pill pill--mint pill--sm exam-ready-pill">${ui.icon('check', 14)} ${UNITS.length} / ${UNITS.length} unit badges</span>
      <h1 class="exam-h1">The A1 exam</h1>
      <p class="exam-sub">${TOTAL} questions across all ${UNITS.length} units. ${PASS_PCT}% to pass — that's ${PASS_MARK} of ${TOTAL}. No hints. No retry inside a run.</p>
    </header>

    <div class="exam-card">
      <div class="exam-card-head">
        <h2>What's inside</h2>
        <span class="pill pill--sm">${TOTAL} questions</span>
      </div>
      <div class="exam-mix">${mixChips()}</div>
      <ul class="exam-facts">
        <li><span>${ui.icon('clock', 17)}</span><span>No timer. Most learners take 10–14 minutes.</span></li>
        <li><span>${ui.icon('edit', 17)}</span><span>Listening, translation, typing, gaps, reading and words.</span></li>
        <li><span>${ui.icon('trophy', 17)}</span><span>${PASS_MARK} / ${TOTAL} earns the A1 certificate.</span></li>
      </ul>
      ${
        last && !last.passed
          ? `<div class="exam-last">
              <b>Last attempt: ${last.score} / ${last.total || TOTAL}</b>
              <span>${PASS_MARK - last.score} more correct and the certificate is yours.</span>
            </div>`
          : ''
      }
    </div>

    <div class="exam-actions">
      <button class="btn btn-primary btn-block btn-lg" data-exam-start type="button">
        Start the exam ${ui.icon('arrow', 20)}
      </button>
      <button class="btn btn-ghost btn-block" data-go="home" type="button">Back to the course</button>
    </div>
    <p class="exam-micro">Your answers are graded once. Leaving mid-run discards this attempt.</p>
  </section>`;
}

function questionBody(ex) {
  if (ex.type === 'listen_pick') {
    return `<p class="exam-instruction">${ui.icon('sound', 15)} Listen, then choose the meaning</p>
      <div class="exam-audio">
        <button class="ob-audio exam-audio-btn" data-clip="${ui.esc(ex.clipId)}" data-clip-kind="s" data-say="${ui.esc(
          ex.korean
        )}" type="button" aria-label="Play audio">${ui.icon('sound', 28)}</button>
        <span>Tap to replay</span>
      </div>`;
  }
  if (ex.type === 'fill_blank') {
    return `<p class="exam-instruction">${ui.icon('edit', 15)} Pick the missing word</p>
      <h2 class="exam-q ko" lang="ko">${ui.esc(ex.blank?.before || '')}${ex.blank?.before ? ' ' : ''}<span class="exam-blank" aria-hidden="true"></span> ${ui.esc(
        ex.blank?.after || ''
      )}</h2>`;
  }
  if (ex.type === 'type_answer') {
    return `<p class="exam-instruction">${ui.icon('edit', 15)} Write it in Korean</p>
      <h2 class="exam-q exam-q--en">${ui.esc(ex.prompt)}</h2>`;
  }
  if (ex.type === 'translate_pick') {
    return `<p class="exam-instruction">${ui.icon('arrow', 15)} Choose the Korean sentence</p>
      <h2 class="exam-q exam-q--en">${ui.esc(ex.prompt)}</h2>`;
  }
  if (ex.type === 'reading_q') {
    return `<p class="exam-instruction">${ui.icon('book', 15)} Read the passage, then choose</p>
      <div class="exam-passage">
        <div class="exam-passage-head">
          <b>${ui.esc(ex.reading?.title || 'Reading')}</b>
          <button class="exam-lang-toggle" data-exam-lang type="button">Show English</button>
        </div>
        <p class="exam-passage-ko" lang="ko">${ui.esc(ex.reading?.ko || '')}</p>
        <p class="exam-passage-en" data-passage-en hidden>${ui.esc(ex.reading?.en || '')}</p>
      </div>
      <h2 class="exam-q exam-q--reading">${ui.esc(ex.prompt)}</h2>`;
  }
  return `<p class="exam-instruction">${ui.icon('book', 15)} Choose the Korean word</p>
    <h2 class="exam-q exam-q--en">${ui.esc(ex.prompt)}</h2>`;
}

function runHtml() {
  const ex = questions[idx];
  if (!ex) return '';
  const total = questions.length;
  const done = idx + (graded ? 1 : 0);
  const pct = Math.round((done / total) * 100);
  const panel = answers[idx];
  const correctText = correctAnswerText(ex);

  return `<section class="screen exam exam--run" data-exam-run>
    <div class="exam-top">
      <button class="icon-btn exam-exit" data-exam-exit type="button" aria-label="Leave exam">${ui.icon('close', 20)}</button>
      <div class="exam-progress">
        <div class="exam-progress-label">
          <span>Question ${idx + 1} / ${total}</span>
          <span class="exam-progress-type">${ui.esc(typeLabel(ex))}</span>
        </div>
        <div class="exam-bar" role="progressbar" aria-label="Exam progress" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}">
          <i style="width:${pct}%"></i>
        </div>
      </div>
      <span class="exam-clock" data-exam-clock>0:00</span>
    </div>

    <div class="exam-question">
      ${questionBody(ex)}
    </div>

    ${
      ex.type === 'type_answer'
        ? `<div class="exam-input-row">
            <input class="exam-input" data-exam-input type="text" lang="ko" autocomplete="off" autocapitalize="off"
              spellcheck="false" aria-label="Your answer in Korean" value="${ui.esc(panel?.value || '')}"
              ${graded ? 'disabled' : ''} placeholder="한국어로 쓰세요" />
            <button class="btn btn-primary exam-check" data-exam-check type="button" ${graded ? 'disabled' : ''}>
              Check
            </button>
          </div>
          ${graded ? `<p class="exam-answer-line">Answer: <b class="ko" lang="ko">${ui.esc(correctText)}</b>${
            panel?.near ? ' · <span class="exam-near">accepted — spelling was close</span>' : ''
          }</p>` : ''}`
        : `<div class="opts exam-opts">
            ${(ex.options || [])
              .map((o) => {
                const cls = panel
                  ? o.correct
                    ? 'is-correct'
                    : o.id === panel.value
                      ? 'is-wrong'
                      : 'is-dim'
                  : '';
                return `<button class="opt exam-opt ${o.ko ? 'ko' : ''} ${cls}" data-exam-opt="${ui.esc(
                  o.id
                )}" type="button" ${graded ? 'disabled' : ''}>
                  <span class="key" aria-hidden="true">${o.key}</span>
                  <span class="opt-text">${ui.esc(o.label)}</span>
                </button>`;
              })
              .join('')}
          </div>`
    }

    ${
      graded
        ? `<div class="exam-feedback ${panel?.correct ? 'is-good' : 'is-bad'}" role="status">
            <span class="exam-fb-ico" aria-hidden="true">${ui.icon(panel?.correct ? 'check' : 'info', 18)}</span>
            <div class="grow">
              <b>${panel?.correct ? 'Correct.' : 'Not this time.'}</b>
              ${
                panel?.correct
                  ? `<span>${ui.esc(correctExplain(ex))}</span>`
                  : `<span>Correct answer: <b class="ko" lang="ko">${ui.esc(correctText)}</b>${
                      ex.why ? ` — ${ui.esc(ex.why)}` : ''
                    }</span>`
              }
              ${
                ex.korean && ex.type !== 'type_answer'
                  ? `<span class="exam-fb-extra">${ui.esc(ex.korean)}${ex.romanization ? ` · ${ui.esc(ex.romanization)}` : ''}</span>`
                  : ''
              }
            </div>
            ${
              ex.clipId && ex.type !== 'listen_pick'
                ? `<button class="say-btn say-btn--sm" data-clip="${ui.esc(ex.clipId)}" data-clip-kind="${ui.esc(
                    ex.clipKind || 's'
                  )}" data-say="${ui.esc(ex.korean || ex.prompt || '')}" type="button" aria-label="Play audio">${ui.icon(
                    'sound',
                    16
                  )}</button>`
                : ''
            }
          </div>
          <div class="exam-next-row">
            <button class="btn btn-primary btn-block btn-lg" data-exam-next type="button">
              ${idx >= total - 1 ? (mode === 'preview' ? 'See preview result' : 'See my result') : 'Next question'} ${ui.icon('arrow', 18)}
            </button>
          </div>`
        : ''
    }
  </section>`;
}

function weakUnits() {
  const tally = {};
  answers.forEach((a) => {
    if (a.correct) return;
    const uid = unitOf(a.ex);
    if (!uid) return;
    tally[uid] = (tally[uid] || 0) + 1;
  });
  return Object.entries(tally)
    .map(([uid, n]) => ({ unit: UNIT_BY_ID[uid], n }))
    .filter((x) => x.unit)
    .sort((a, b) => b.n - a.n)
    .slice(0, 4);
}

function resultHtml() {
  const passed = !!result?.passed;
  const score = result?.score ?? 0;
  const total = result?.total ?? TOTAL;
  const pct = Math.round((score / total) * 100);
  if (passed) return certificateHtml();
  const weak = weakUnits();

  return `<section class="screen exam exam--result">
    <header class="exam-head">
      <p class="overline">A1 exam</p>
      <h1 class="exam-h1">Not yet — you need ${PASS_MARK}.</h1>
      <p class="exam-sub">You scored <b>${score} / ${total}</b> (${pct}%). That's a real attempt, and the course is still open. Nothing is lost.</p>
    </header>

    <div class="exam-score-card is-fail">
      <div class="exam-score-ring">${ui.ring(pct, { size: 96, stroke: 9, color: 'var(--amber-400)' })}<b>${pct}%</b></div>
      <div class="grow">
        <b class="exam-score-line">${score} / ${total} correct</b>
        <span>${PASS_PCT}% needed · ${Math.max(0, PASS_MARK - score)} more correct</span>
      </div>
    </div>

    ${
      weak.length
        ? `<section class="exam-weak">
            <div class="exam-card-head"><h2>Where to look next</h2><span class="pill pill--sm">${weak.length}</span></div>
            <p class="exam-weak-sub">Most missed questions came from these units. A checkpoint retry is enough — no shame in it.</p>
            ${weak
              .map(
                (w) => `<button class="exam-weak-row" data-exam-unit="${ui.esc(w.unit.id)}" type="button">
                  <span class="exam-weak-seal ko" lang="ko">${ui.esc(w.unit.ko)}</span>
                  <span class="grow"><b>Unit ${w.unit.order} · ${ui.esc(w.unit.title)}</b><span>${w.n} missed</span></span>
                  ${ui.icon('chevron', 18)}
                </button>`
              )
              .join('')}
          </section>`
        : ''
    }

    <div class="exam-actions">
      <button class="btn btn-primary btn-block" data-go="home" type="button">Back to the course</button>
      <button class="btn btn-secondary btn-block" data-exam-retry type="button">${ui.icon('refresh', 17)} Try again</button>
    </div>
    <p class="exam-micro">The exam is never locked. Retake it whenever you feel ready.</p>
  </section>`;
}

function certificateHtml() {
  const flag = state.flags.a1Exam || {};
  const score = result?.score ?? flag.score ?? PASS_MARK;
  const total = result?.total ?? flag.total ?? TOTAL;
  const name = (state.profile.name || 'Explorer').trim() || 'Explorer';
  const when = fmtDate(flag.at);
  return `<section class="screen exam exam--certificate">
    <header class="exam-head exam-head--center">
      <p class="overline">Passed · ${PASS_PCT}%+</p>
      <h1 class="exam-h1">That's A1.</h1>
      <p class="exam-sub">${score} / ${total} · ${Math.round((score / total) * 100)}%. Certificates are earned, not printed by default.</p>
    </header>

    <article class="exam-cert" aria-label="A1 certificate">
      <div class="exam-cert-inner">
        <p class="exam-cert-top">HORANG · KOREAN</p>
        <h2 class="exam-cert-title">Certificate of Completion</h2>
        <p class="exam-cert-line">This certifies that</p>
        <p class="exam-cert-name">${ui.esc(name)}</p>
        <p class="exam-cert-line">has completed all ${META.lessonCount} sessions of the Horang Korean course<br />and passed the final assessment.</p>
        <div class="exam-cert-level">
          <b>CEFR A1</b>
          <span>Horang Korean · ${META.unitCount} units</span>
        </div>
        <div class="exam-cert-meta">
          <span>Score <b>${score} / ${total}</b></span>
          <span>Date <b>${ui.esc(when)}</b></span>
        </div>
        <div class="exam-cert-seal" aria-hidden="true">
          <span class="exam-cert-seal-ko ko">초급</span>
          <b>${ui.esc(initials(name))}</b>
          <i>${ui.icon('star', 12)}</i>
        </div>
      </div>
    </article>

    <div class="exam-actions">
      <button class="btn btn-primary btn-block" data-go="home" type="button">Back to the course</button>
      <button class="btn btn-secondary btn-block" data-print type="button">${ui.icon('edit', 17)} Print / save PDF</button>
      <button class="btn btn-ghost btn-block" data-exam-retry type="button">Retake the exam</button>
    </div>
    <p class="exam-micro">Screenshot it, print it, put it on the fridge. ${META.sentenceCount} sentences and ${META.wordCount} words behind it.</p>
  </section>`;
}

function previewResultHtml() {
  const score = result?.score ?? 0;
  const total = result?.total ?? 5;
  return `<section class="screen exam exam--result">
    <header class="exam-head">
      <p class="overline">Preview · not scored</p>
      <h1 class="exam-h1">${score} / ${total} in the preview.</h1>
      <p class="exam-sub">This was a reviewer preview. It did not unlock the exam, change mastery, or save a result.</p>
    </header>

    <div class="exam-score-card is-preview">
      <div class="exam-score-ring">${ui.ring((score / total) * 100, { size: 92, stroke: 9, color: 'var(--indigo-600)' })}<b>${score}/${total}</b></div>
      <div class="grow">
        <b class="exam-score-line">Here's what the real exam feels like</b>
        <span>30 questions · ${PASS_MARK} to pass · certificate at the end</span>
      </div>
    </div>

    <div class="exam-review">
      ${answers
        .map(
          (a, i) => `<div class="exam-review-row ${a.correct ? 'is-good' : 'is-bad'}">
            <span class="exam-review-num">${i + 1}</span>
            <span class="grow"><b>${ui.esc(typeLabel(a.ex))}</b><span>${ui.esc(correctAnswerText(a.ex))}</span></span>
            ${ui.icon(a.correct ? 'check' : 'close', 16)}
          </div>`
        )
        .join('')}
    </div>

    <div class="exam-actions">
      <button class="btn btn-primary btn-block" data-go="home" type="button">Back to Learn</button>
      <button class="btn btn-secondary btn-block" data-exam-preview type="button">Preview again</button>
    </div>
  </section>`;
}

function screenHtml() {
  if (phase === 'locked') return lockedHtml();
  if (phase === 'run') return runHtml();
  if (phase === 'result') return resultHtml();
  if (phase === 'previewResult') return previewResultHtml();
  if (phase === 'certificate') return certificateHtml();
  return introHtml();
}

function paint() {
  if (!host) return;
  host.innerHTML = screenHtml();
  if (phase === 'run') {
    const clock = host.querySelector('[data-exam-clock]');
    if (clock && startedAt) clock.textContent = fmtClock(Date.now() - startedAt);
  }
  scrollTop();
}

// ---------- flow ----------
function enter(params = {}) {
  mode = params && params.preview ? 'preview' : 'exam';
  questions = [];
  answers = [];
  idx = 0;
  graded = false;
  selected = null;
  result = null;
  stopClock();
  if (mode === 'preview') {
    phase = 'intro';
    return;
  }
  if (badgeCount() < UNITS.length) {
    phase = 'locked';
    return;
  }
  if (state.flags.a1Exam?.passed) {
    phase = 'certificate';
    return;
  }
  phase = 'intro';
}

function startRun(nextMode = mode) {
  mode = nextMode;
  questions = buildExam(mode);
  idx = 0;
  answers = [];
  graded = false;
  selected = null;
  result = null;
  phase = 'run';
  paint();
  startClock();
}

function submit(optionId) {
  if (graded || phase !== 'run') return;
  const ex = questions[idx];
  if (!ex) return;
  const res = gradeAnswer(ex, optionId);
  answers[idx] = { ex, value: optionId, correct: !!res.correct, near: !!res.near };
  graded = true;
  selected = optionId;
  if (res.correct) audio.sfx('correct');
  else audio.sfx('tap');
  paint();
}

function submitText() {
  if (graded || phase !== 'run') return;
  const input = host?.querySelector('[data-exam-input]');
  const value = (input?.value || '').trim();
  if (!value) {
    input?.focus();
    return;
  }
  submit(value);
}

function nextQuestion() {
  if (!graded) return;
  if (idx >= questions.length - 1) {
    finishRun();
    return;
  }
  idx++;
  graded = false;
  selected = null;
  paint();
}

function finishRun() {
  stopClock();
  const score = answers.filter((a) => a && a.correct).length;
  const total = questions.length;
  if (mode === 'preview') {
    result = { score, total, preview: true };
    phase = 'previewResult';
    paint();
    return;
  }
  const passed = score >= PASS_MARK;
  result = { score, total, passed };
  if (passed || !state.flags.a1Exam?.passed) {
    state.flags.a1Exam = { passed, score, total, at: new Date().toISOString() };
  }
  save();
  logEvent(passed ? 'a1_exam_pass' : 'a1_exam_fail', { score, total });
  phase = passed ? 'certificate' : 'result';
  paint();
  if (passed) {
    audio.sfx('levelup');
    ui.confetti({ count: 60, colors: ['var(--coral-500)', 'var(--mint-400)', 'var(--amber-400)', 'var(--indigo-300)'] });
  } else {
    audio.sfx('stamp');
  }
}

function exitExam() {
  if (phase !== 'run') {
    router.go('home');
    return;
  }
  if (typeof document !== 'undefined' && document.querySelector('.scrim')) return;
  ui.modal({
    title: 'Leave the exam?',
    body: `<p class="muted">This attempt won't be saved. You can start again whenever you like.</p>`,
    actions: [
      { label: 'Keep going', cls: 'btn-secondary' },
      { label: 'Leave', cls: 'btn-ghost', onClick: () => router.go('home') },
    ],
  });
}

function retake() {
  if (state.flags.a1Exam?.passed && phase === 'certificate') {
    phase = 'intro';
    result = null;
    paint();
    return;
  }
  startRun('exam');
}

// ---------- events ----------
function onClick(e) {
  const preview = e.target.closest('[data-exam-preview]');
  if (preview) {
    audio.sfx('tap');
    enter({ preview: 1 });
    startRun('preview');
    return;
  }
  if (e.target.closest('[data-exam-start]')) {
    audio.sfx('tap');
    startRun('exam');
    return;
  }
  const opt = e.target.closest('[data-exam-opt]');
  if (opt) {
    submit(opt.dataset.examOpt);
    return;
  }
  if (e.target.closest('[data-exam-check]')) {
    submitText();
    return;
  }
  if (e.target.closest('[data-exam-next]')) {
    audio.sfx('tap');
    nextQuestion();
    return;
  }
  if (e.target.closest('[data-exam-exit]')) {
    exitExam();
    return;
  }
  if (e.target.closest('[data-exam-retry]')) {
    audio.sfx('tap');
    retake();
    return;
  }
  const unitBtn = e.target.closest('[data-exam-unit]');
  if (unitBtn) {
    audio.sfx('tap');
    const unit = UNIT_BY_ID[unitBtn.dataset.examUnit];
    const first = lessonsOf(unit.id)[0];
    if (first) router.go('lesson', { node: first.nodeIndex });
    else router.go('home');
    return;
  }
  if (e.target.closest('[data-print]')) {
    audio.sfx('tap');
    try {
      window.print();
    } catch {
      /* print is optional */
    }
    return;
  }
  const lang = e.target.closest('[data-exam-lang]');
  if (lang) {
    const box = lang.closest('.exam-passage');
    const en = box?.querySelector('[data-passage-en]');
    if (en) {
      en.hidden = !en.hidden;
      lang.textContent = en.hidden ? 'Show English' : 'Hide English';
    }
  }
}

function onKey(e) {
  if (!host) return;
  if (e.key === 'Escape') {
    if (typeof document !== 'undefined' && document.querySelector('.scrim')) return;
    exitExam();
    return;
  }
  if (phase !== 'run') return;
  const typing = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
  if (typing) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (graded) nextQuestion();
      else submitText();
    }
    return;
  }
  if (e.key === 'Enter') {
    if (graded) {
      const t = e.target;
      if (t && t.tagName === 'BUTTON' && !t.disabled) return;
      e.preventDefault();
      nextQuestion();
    }
    return;
  }
  if (!graded && /^[1-4]$/.test(e.key)) {
    const ex = questions[idx];
    const opt = ex?.options?.[Number(e.key) - 1];
    if (opt) {
      e.preventDefault();
      submit(opt.id);
    }
  }
}

// ---------- module ----------
export default {
  id: 'exam',
  title: 'A1 Exam',
  nav: null,
  hideNav: true,

  render(params) {
    enter(params);
    return screenHtml();
  },

  mount(root, params) {
    host = root;
    if (!questions.length && phase === 'intro') enter(params);
    document.addEventListener('keydown', onKey);
    host.addEventListener('click', onClick);
    paint();
  },

  destroy() {
    stopClock();
    document.removeEventListener('keydown', onKey);
    if (host) {
      host.removeEventListener('click', onClick);
    }
    host = null;
    questions = [];
    answers = [];
    graded = false;
    phase = 'intro';
    mode = 'exam';
    result = null;
  },
};
