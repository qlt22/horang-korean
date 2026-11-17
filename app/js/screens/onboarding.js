// W5 · A1 first-run funnel: goal → time → name → ready → optional quick check → result → reminder.
// One screen, internal steps. Every step is deep-linkable via #/onboarding?step=… and persists.
import { state, save, startSession, logEvent } from '../core/store.js';
import { META, UNITS, lessonAt, lessonsOf, sentencesOf, wordsOf } from '../core/course.js';
import { buildTask, gradeAnswer, correctAnswerText } from '../core/quiz.js';
import * as ui from '../core/ui.js';
import * as routerMod from '../core/router.js';
import * as audio from '../core/audio.js';
import { today } from '../core/clock.js';

const router = {
  go: routerMod.go,
  replace: routerMod.replace,
  back: routerMod.back,
};

const STEPS = ['goal', 'time', 'name', 'ready', 'quiz', 'result', 'reminder'];

// A1-appropriate goals. `family` is new for this course; other screens fall back
// gracefully because it only lives on the profile.
const GOALS_A1 = [
  {
    id: 'travel',
    label: 'Travel',
    emoji: '✈️',
    sub: 'Order food, ask directions, get around Seoul.',
  },
  {
    id: 'kdrama',
    label: 'K-drama & music',
    emoji: '🎬',
    sub: 'Catch the line before the subtitle.',
  },
  {
    id: 'work',
    label: 'Work & study',
    emoji: '💼',
    sub: 'Polite Korean for school and the office.',
  },
  {
    id: 'family',
    label: 'Family',
    emoji: '🏡',
    sub: 'Talk with family and in-laws in Korean.',
  },
  {
    id: 'curious',
    label: 'Just curious',
    emoji: '🌱',
    sub: 'Start from zero. No pressure.',
  },
];
const GOAL_ORDER = GOALS_A1.map((g) => g.id);
const GOAL_BY_ID = Object.fromEntries(GOALS_A1.map((g) => [g.id, g]));

const TIMES = [
  { min: 5, label: 'Casual', xp: 60, line: 'A quick daily habit.' },
  { min: 10, label: 'Steady', xp: 120, line: 'One session a day.', tag: 'Most picked' },
  { min: 15, label: 'Serious', xp: 180, line: 'Room for a review too.' },
];
const DAILY_XP = { 5: 60, 10: 120, 15: 180 };
const REMIND_TIMES = ['07:00', '12:30', '18:00', '19:30', '21:30'];

const N_SENTENCES = META.sentenceCount;
const N_LESSONS = META.lessonCount;
const N_UNITS = META.unitCount;
const FIRST_UNIT = UNITS[0];
const FIRST_LESSON = lessonAt(0);
const FIRST_SENTENCE = sentencesOf(FIRST_UNIT.id)[0] || null;

// ---------- deterministic quick-check sampling ----------
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

function seedFromDate() {
  const key = String(today()).replace(/\D/g, '');
  return (parseInt(key, 10) || 20260101) >>> 0;
}

const PARTICLES = ['이', '가', '은', '는', '을', '를', '에', '에서', '으로', '로', '와', '과', '도'];
function isParticleAnswer(answer) {
  return PARTICLES.some((p) => String(answer || '').endsWith(p));
}

function quickCheckItems() {
  const seed = seedFromDate();
  const u1 = UNITS[0].id;
  const u2 = UNITS[1]?.id || UNITS[0].id;
  const u1Words = shuffleSeeded(wordsOf(u1), seed + 11);
  const u2Words = shuffleSeeded(wordsOf(u2), seed + 23);
  const u1Sents = shuffleSeeded(sentencesOf(u1), seed + 37);
  const u2Sents = shuffleSeeded(sentencesOf(u2), seed + 41);
  const items = [];

  const w1 = buildTask('word_pick', { wordId: u1Words[0]?.id, poolWords: wordsOf(u1) });
  if (w1) items.push(w1);

  const listen = buildTask('listen_pick', { sentenceId: u1Sents[0]?.id, pool: sentencesOf(u1).map((s) => s.id) });
  if (listen) items.push(listen);

  let particle = null;
  for (const s of u1Sents) {
    const ex = buildTask('fill_blank', { sentenceId: s.id, poolWords: wordsOf(u1) });
    if (ex && isParticleAnswer(ex.blank?.answer)) {
      particle = ex;
      break;
    }
  }
  if (!particle) {
    for (const s of u1Sents) {
      const ex = buildTask('fill_blank', { sentenceId: s.id, poolWords: wordsOf(u1) });
      if (ex) {
        particle = ex;
        break;
      }
    }
  }
  if (particle) items.push(particle);

  const w2 = buildTask('word_pick', { wordId: u2Words[0]?.id, poolWords: wordsOf(u2) });
  if (w2) items.push(w2);

  const tr = buildTask('translate_pick', { sentenceId: u2Sents[0]?.id, pool: sentencesOf(u2).map((s) => s.id) });
  if (tr) items.push(tr);

  return items.slice(0, 5);
}

function whyFor(ex) {
  if (!ex) return '';
  if (ex.type === 'word_pick') return `${ex.word?.ko || ''} means ${ex.word?.en || ''}.`;
  if (ex.type === 'fill_blank') return `${ex.blank?.answer || ''} is the piece that fits. ${ex.korean || ''}`;
  if (ex.type === 'listen_pick') return `${ex.korean || ''} — ${ex.english || ''}`;
  if (ex.type === 'translate_pick') return `${ex.korean || ''} — ${ex.english || ''}`;
  return ex.english || ex.korean || '';
}

// ---------- module state ----------
let host = null;
let currentStep = 'goal';
let advancing = false;
let skipReminders = false;
let timers = [];
let quiz = { i: 0, score: 0, done: 0, locked: false, finalLevel: 0, taken: false, items: [] };
const picked = { goal: null, time: 10, avatar: 'tiger', reminder: '19:30' };

function later(fn, ms) {
  const t = setTimeout(fn, ms);
  timers.push(t);
  return t;
}
function clearTimers() {
  timers.forEach((t) => clearTimeout(t));
  timers = [];
}

function lastStepEvent() {
  for (let i = state.events.length - 1; i >= 0; i--) {
    const e = state.events[i];
    if (e && e.name === 'onboarding_step') return e.step;
  }
  return null;
}

function hasSession() {
  return !!(state.session && state.session.kind === 'node');
}

// params.step wins; otherwise resume where we left off, then fall back to data.
function resolveStep(params = {}) {
  const wanted = params && params.step;
  if (wanted && STEPS.includes(wanted)) return wanted;
  const last = lastStepEvent();
  if (last && STEPS.includes(last)) return last;
  if (hasSession()) return 'ready';
  if ((state.profile.name || '').trim().length >= 2) return 'ready';
  if (state.profile.goal && state.profile.goal !== 'curious') return 'time';
  return 'goal';
}

function goalSelectedId() {
  if (!state.profile.goal) return null;
  if (state.profile.goal !== 'curious') return GOAL_BY_ID[state.profile.goal] ? state.profile.goal : null;
  const last = lastStepEvent();
  return last && last !== 'goal' ? 'curious' : null;
}

function resultLevel() {
  return quiz.finalLevel || state.flags.placementLevel || 1;
}

function prepare(step) {
  currentStep = step;
  picked.time = DAILY_XP[state.profile.minutes] ? state.profile.minutes : 10;
  picked.avatar = state.profile.avatar || 'tiger';
  picked.reminder = state.profile.reminderTime || '19:30';
  skipReminders = false;
  if (step === 'goal') picked.goal = goalSelectedId();
  if (step !== 'quiz') quiz.locked = false;
}

// ---------- head / progress ----------
function headHtml(step) {
  if (step === 'goal' || step === 'time' || step === 'name') {
    const idx = { goal: 0, time: 1, name: 2 }[step];
    return `<div class="ob-top">
        <button class="icon-btn ob-back ${step === 'goal' ? 'is-hidden' : ''}" data-ob-back type="button" aria-label="Back">${ui.icon('back', 20)}</button>
        <span class="ob-title">${['Goal', 'Time', 'You'][idx]}</span>
        <span class="ob-count">${idx + 1} / 3</span>
      </div>
      <div class="seg-bar ob-seg" role="progressbar" aria-label="Onboarding progress" aria-valuemin="1" aria-valuemax="3" aria-valuenow="${idx + 1}">
        ${[0, 1, 2].map((i) => `<i class="${i < idx ? 'done' : i === idx ? 'now' : ''}"></i>`).join('')}
      </div>`;
  }
  if (step === 'quiz') {
    return `<div class="ob-top">
        <button class="icon-btn" data-quiz-close type="button" aria-label="Close quick check">${ui.icon('close', 20)}</button>
        <span class="ob-title">Quick check · optional</span>
        <span class="ob-count">${Math.min(quiz.i + 1, 5)} / 5</span>
      </div>
      <div class="seg-bar ob-seg ob-seg--quiz" role="progressbar" aria-label="Quick check progress" aria-valuemin="0" aria-valuemax="5" aria-valuenow="${quiz.done}">
        ${[0, 1, 2, 3, 4].map((i) => `<i class="${i < quiz.done ? 'done' : ''}"></i>`).join('')}
      </div>`;
  }
  return '';
}

// ---------- steps: mark-up ----------
function goalHtml() {
  const sel = picked.goal;
  return `<div class="ob-intro ob-rise">
      <h1 class="ob-h1">What brings you to Korean?</h1>
      <p class="ob-sub">${N_SENTENCES} real sentences · ${N_LESSONS} sessions · CEFR A1</p>
    </div>
    <div class="ob-mascot-corner" aria-hidden="true">${ui.mascot(86, 'happy')}</div>
    <div class="ob-cards">
      ${GOAL_ORDER.map((id) => {
        const g = GOAL_BY_ID[id];
        const on = sel === id;
        return `<button class="ob-card ob-rise ${on ? 'is-selected' : ''}" data-goal="${g.id}" type="button" aria-pressed="${on}">
          <span class="ob-card-emoji" aria-hidden="true">${g.emoji}</span>
          <span class="ob-card-text"><b>${ui.esc(g.label)}</b><span>${ui.esc(g.sub)}</span></span>
          <span class="ob-check" aria-hidden="true">${ui.icon('check', 15)}</span>
        </button>`;
      }).join('')}
    </div>
    <div class="ob-foot ob-rise">
      <button class="btn btn-primary btn-block btn-lg" data-goal-continue type="button" ${sel ? '' : 'disabled'}>
        Continue ${ui.icon('arrow', 20)}
      </button>
      <button class="btn btn-ghost btn-block ob-skip" data-goal-skip type="button">Skip</button>
    </div>`;
}

function timeHtml() {
  const sel = picked.time;
  return `<div class="ob-intro ob-rise">
      <h1 class="ob-h1">How long each day?</h1>
      <p class="ob-sub">One session is 5–6 minutes. Pick a habit you'd actually keep.</p>
    </div>
    <div class="ob-mascot-corner ob-mascot-corner--sm" aria-hidden="true">${ui.mascot(70, 'think')}</div>
    <div class="ob-times">
      ${TIMES.map((t) => {
        const on = sel === t.min;
        return `<button class="ob-time ob-rise ${on ? 'is-selected' : ''}" data-min="${t.min}" type="button" aria-pressed="${on}">
          <span class="ob-time-num">${t.min}<i>min</i></span>
          <span class="ob-time-info">
            <b>${t.label} · ${t.xp} XP${t.tag ? ` <span class="ob-tag">${t.tag}</span>` : ''}</b>
            <span>${t.line}</span>
          </span>
          <span class="ob-check" aria-hidden="true">${ui.icon('check', 15)}</span>
        </button>`;
      }).join('')}
    </div>
    <div class="ob-foot ob-rise">
      <button class="btn btn-primary btn-block btn-lg" data-time-continue type="button">
        Continue ${ui.icon('arrow', 20)}
      </button>
    </div>`;
}

function nameHtml() {
  const sel = picked.avatar;
  const name = state.profile.name || '';
  return `<div class="ob-intro ob-rise">
      <h1 class="ob-h1">What should we call you?</h1>
      <p class="ob-sub">It shows up on the leaderboard and on your A1 certificate.</p>
    </div>
    <div class="ob-mascot-corner ob-mascot-corner--sm" aria-hidden="true">${ui.mascot(64, 'cheer')}</div>
    <div class="ob-name-field ob-rise">
      <input class="ob-input" data-name-input type="text" maxlength="16" placeholder="Your name"
        autocomplete="off" autocapitalize="words" spellcheck="false" aria-label="Your name"
        value="${ui.esc(name)}" />
      <span class="ob-charcount" data-count ${name.length >= 12 ? '' : 'hidden'}>${name.length}/16</span>
    </div>
    <div class="ob-avatars ob-rise" role="group" aria-label="Choose an avatar">
      ${ui.AVATARS.map((id) => {
        const on = sel === id;
        return `<button class="ob-av ${on ? 'is-selected' : ''}" data-avatar="${id}" type="button" aria-pressed="${on}" aria-label="${ui.esc(id)}">
          ${ui.avatar(id, 52)}
          <span class="ob-av-check" aria-hidden="true">${ui.icon('check', 11)}</span>
        </button>`;
      }).join('')}
    </div>
    <div class="ob-name-preview ob-rise" data-name-preview ${name.trim().length >= 2 ? '' : 'hidden'}>
      <span class="ob-preview-mark" aria-hidden="true">${ui.icon('sparkle', 18)}</span>
      <span class="ob-preview-text">
        <b class="ko">저는 <span data-preview-name>${ui.esc(name.trim())}</span>입니다.</b>
        <span>Your first sentence, with you in it.</span>
      </span>
    </div>
    <div class="ob-foot ob-rise">
      <button class="btn btn-primary btn-block btn-lg" data-name-continue type="button" ${name.trim().length >= 2 ? '' : 'disabled'}>
        Continue ${ui.icon('arrow', 20)}
      </button>
      <button class="btn btn-ghost btn-block ob-skip" data-name-skip type="button">Skip — call me Explorer</button>
      <p class="ob-legal">No email needed to start. You can add one later.</p>
    </div>`;
}

function readyHtml() {
  const resuming = hasSession();
  const sentences = (FIRST_LESSON?.sentenceIds || []).length;
  return `<div class="ob-hero ob-rise">
      <span class="ob-hero-watermark" aria-hidden="true">A1</span>
      <span class="ob-hero-bubble">One session. That's it.</span>
      <span class="ob-hero-mascot">${ui.mascot(120, 'cheer')}</span>
    </div>
    <div class="ob-intro ob-rise">
      <h1 class="ob-h1">Your first session is ready</h1>
      <p class="ob-sub">You can already read Hangul — we'll do the rest.</p>
    </div>
    <div class="ob-chips ob-rise">
      <span class="pill pill--sm">${ui.icon('clock', 14)} ${FIRST_LESSON?.minutes || 5} min</span>
      <span class="pill pill--sm">${ui.icon('book', 14)} ${sentences + 1} sentences</span>
      <span class="pill pill--sm">${ui.icon('quests', 14)} Session 1 of ${N_LESSONS}</span>
    </div>
    <div class="ob-node ob-rise">
      <span class="ob-node-badge" aria-hidden="true">${ui.icon('play', 20)}</span>
      <span class="ob-node-body">
        <span class="ob-node-overline">UNIT 1 · ${ui.esc(FIRST_UNIT.ko)} ${ui.esc(FIRST_UNIT.title)}</span>
        <span class="ob-node-title">Session 1 · ${ui.esc(FIRST_LESSON?.title || 'Say who you are')}</span>
        <span class="ob-node-sub">${sentences} new sentences · A1 · first step</span>
      </span>
      ${
        FIRST_SENTENCE
          ? `<button class="say-btn say-btn--sm" data-clip="${ui.esc(FIRST_SENTENCE.id)}" data-clip-kind="s" data-say="${ui.esc(
              FIRST_SENTENCE.korean
            )}" aria-label="Play audio" type="button">${ui.icon('sound', 18)}</button>`
          : ''
      }
    </div>
    <div class="ob-foot ob-rise">
      <button class="btn btn-primary btn-block btn-lg" data-start-node type="button">
        ${resuming ? 'Continue session 1' : 'Start session 1'} ${ui.icon('arrow', 20)}
      </button>
      <p class="ob-micro">No ads. No paywall. ${N_UNITS} unit badges and a real A1 certificate.</p>
      <button class="btn btn-ghost btn-block ob-skip" data-later type="button">I'll do it later</button>
    </div>`;
}

function optionsHtml(ex) {
  const ko = ex.type !== 'listen_pick';
  return (ex.options || [])
    .map(
      (o) => `<button class="opt ob-opt ${ko ? 'ko' : ''}" data-ans="${ui.esc(o.id)}" type="button">
        <span class="key" aria-hidden="true">${o.key}</span>
        <span class="opt-text">${ui.esc(o.label)}</span>
      </button>`
    )
    .join('');
}

function quizHtml() {
  const ex = quiz.items[quiz.i];
  if (!ex) return '';
  let body = '';
  if (ex.type === 'listen_pick') {
    body = `<p class="ob-quiz-type">${ui.icon('sound', 14)} Listen &amp; choose</p>
      <h1 class="ob-q">What does this mean?</h1>
      <div class="ob-audio-wrap">
        <button class="ob-audio" data-clip="${ui.esc(ex.clipId)}" data-clip-kind="s" data-say="${ui.esc(
          ex.korean
        )}" type="button" aria-label="Play audio">${ui.icon('sound', 26)}</button>
        <span class="ob-audio-hint">Tap to hear it again</span>
      </div>`;
  } else if (ex.type === 'fill_blank') {
    body = `<p class="ob-quiz-type">${ui.icon('edit', 14)} Fill the gap</p>
      <h1 class="ob-q ko" aria-label="${ui.esc(ex.korean)}">
        ${ui.esc(ex.blank?.before || '')}${ex.blank?.before ? ' ' : ''}<span class="ob-blank" aria-hidden="true"></span> ${ui.esc(
          ex.blank?.after || ''
        )}
      </h1>
      <p class="ob-q-sub">Pick the missing word.</p>`;
  } else if (ex.type === 'translate_pick') {
    body = `<p class="ob-quiz-type">${ui.icon('arrow', 14)} Pick the Korean</p>
      <h1 class="ob-q">${ui.esc(ex.prompt)}</h1>`;
  } else {
    body = `<p class="ob-quiz-type">${ui.icon('book', 14)} Choose the word</p>
      <h1 class="ob-q">${ui.esc(ex.prompt)}</h1>`;
  }

  return `<div class="ob-quiz ob-rise">${body}</div>
    <div class="ob-opts">${optionsHtml(ex)}</div>
    <div class="ob-feedback" data-feedback hidden></div>
    <div class="ob-foot ob-foot--quiz ob-rise">
      <button class="btn btn-ghost btn-block ob-skip" data-quiz-skip type="button">Skip the check</button>
    </div>`;
}
function resultHtml() {
  const level = resultLevel();
  const score = Math.max(0, Math.min(5, quiz.score));
  const copy =
    level >= 4
      ? {
          h: "You're past the start.",
          sub: "We'll keep Unit 1 quick. Unit 2 opens after its four lessons — no fake test-outs.",
        }
      : level >= 2
        ? {
            h: 'Some basics are already there.',
            sub: "We'll move faster through sessions 1–2. Everything else stays in order.",
          }
        : {
            h: "You're at the start. Perfect.",
            sub: "We'll build the first sentence together, one short session at a time.",
          };

  return `<div class="ob-result ob-rise">
      <div class="ob-ring">
        ${ui.ring((score / 5) * 100, { size: 92, stroke: 8, color: 'var(--coral-500)' })}
        <span class="ob-ring-lv">${score}/5</span>
      </div>
      <h1 class="ob-h1">${ui.esc(copy.h)}</h1>
      <p class="ob-sub">${ui.esc(copy.sub)}</p>
    </div>
    <ul class="ob-unlocks ob-rise">
      <li><span class="ob-unlock-ico" aria-hidden="true">✅</span><span>${N_SENTENCES} sentences · ${N_LESSONS} sessions · CEFR A1</span></li>
      <li><span class="ob-unlock-ico" aria-hidden="true">✅</span><span>You can already read Hangul</span></li>
      <li><span class="ob-unlock-ico" aria-hidden="true">✅</span><span>Unit 1 · ${ui.esc(FIRST_UNIT.title)} is ready</span></li>
    </ul>
    <div class="ob-info ob-rise">${
      level >= 4
        ? "No skipping is applied automatically. Four short lessons and Unit 2 unlocks for real."
        : level >= 2
          ? "Sessions 1–2 are marked previewed so we can move faster. Your mastery stays honest — nothing is faked."
          : 'Nothing is locked forever. Unit 2 opens after Unit 1’s four lessons.'
    }</div>
    <div class="ob-foot ob-rise">
      <button class="btn btn-primary btn-block btn-lg" data-sounds-right type="button">
        Sounds right ${ui.icon('arrow', 20)}
      </button>
      <button class="btn btn-ghost btn-block ob-skip" data-redo-quiz type="button">Redo the check</button>
    </div>`;
}

function reminderHtml() {
  const sel = picked.reminder;
  return `<div class="ob-headline ob-rise">
      <div>
        <h1 class="ob-h1">When should we nudge you?</h1>
        <p class="ob-sub">One notification a day. That's it.</p>
      </div>
      <span class="ob-mascot-sm" aria-hidden="true">${ui.mascot(72, 'sleepy')}</span>
    </div>
    <div class="ob-chips-grid ${skipReminders ? 'is-muted' : ''}">
      ${REMIND_TIMES.map((t) => `<button class="ob-timechip ob-rise ${sel === t && !skipReminders ? 'is-selected' : ''}" data-remind="${t}" type="button" aria-pressed="${sel === t && !skipReminders}">${t}</button>`).join('')}
    </div>
    <div class="ob-switch-row ob-rise">
      <span class="ob-switch-text"><b>Skip reminders for now</b><span>You can turn them on anytime.</span></span>
      <button class="switch" role="switch" aria-checked="${skipReminders}" aria-label="Skip reminders for now" data-skip-rem type="button"></button>
    </div>
    <div class="ob-notif ob-rise ${skipReminders ? 'is-muted' : ''}">
      <span class="ob-notif-ico" aria-hidden="true">${ui.mascot(40, 'happy')}</span>
      <span class="ob-notif-body">
        <b>Horang${skipReminders ? '' : ` · ${ui.esc(sel)}`}</b>
        <span>${skipReminders ? 'Reminders are off. You can turn them on in Settings.' : 'Your next session is waiting.'}</span>
      </span>
    </div>
    <div class="ob-foot ob-rise">
      <button class="btn btn-primary btn-block btn-lg" data-rem-continue type="button">
        Continue ${ui.icon('arrow', 20)}
      </button>
      <p class="ob-micro">We'll ask your browser only when you say yes.</p>
    </div>`;
}

function stepHtml(step) {
  switch (step) {
    case 'goal':
      return goalHtml();
    case 'time':
      return timeHtml();
    case 'name':
      return nameHtml();
    case 'ready':
      return readyHtml();
    case 'quiz':
      return quizHtml();
    case 'result':
      return resultHtml();
    case 'reminder':
      return reminderHtml();
    default:
      return goalHtml();
  }
}

// ---------- painting ----------
function scrollTop() {
  try {
    window.scrollTo(0, 0);
    const s = document.getElementById('screen');
    if (s) s.scrollTop = 0;
  } catch {
    /* ignore */
  }
}

function stagger(root) {
  root.querySelectorAll('.ob-rise').forEach((el, i) => {
    el.style.animationDelay = `${40 + i * 55}ms`;
  });
}

function animateResult(root) {
  ui.confetti({ count: 26, colors: ['var(--coral-500)', 'var(--mint-400)', 'var(--amber-400)'] });
  audio.sfx('stamp');
  requestAnimationFrame(() => {
    const circle = root.querySelector('.ob-ring .ring circle:last-of-type');
    if (!circle) return;
    const target = circle.getAttribute('stroke-dashoffset');
    const circumference = circle.getAttribute('stroke-dasharray');
    circle.style.strokeDashoffset = circumference;
    requestAnimationFrame(() => {
      circle.style.strokeDashoffset = target;
    });
  });
}

function paint(root) {
  host = root;
  advancing = false;
  clearTimers();
  const section = root.matches?.('.ob') ? root : root.querySelector('.ob');
  section?.setAttribute('data-stepname', currentStep);
  const head = root.querySelector('[data-head]');
  const body = root.querySelector('[data-step]');
  if (head) head.innerHTML = headHtml(currentStep);
  if (body) body.innerHTML = stepHtml(currentStep);
  bindStep(root);
  stagger(root);
  if (currentStep === 'result') animateResult(root);
  scrollTop();
}

function setStep(step) {
  if (!STEPS.includes(step)) return;
  if (step === currentStep && step !== 'quiz') return;
  currentStep = step;
  logEvent('onboarding_step', { step });
  save();
  try {
    history.replaceState(null, '', `#/onboarding?step=${step}`);
  } catch {
    /* ignore */
  }
  if (host) paint(host);
}

// ---------- actions ----------
function chooseGoal(id, advance = false) {
  if (!GOAL_BY_ID[id]) return;
  picked.goal = id;
  state.profile.goal = id;
  save();
  audio.sfx('tap');
  if (host) {
    host.querySelectorAll('[data-goal]').forEach((b) => {
      const on = b.dataset.goal === id;
      b.classList.toggle('is-selected', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) {
        b.classList.remove('is-pop');
        void b.offsetWidth;
        b.classList.add('is-pop');
      }
    });
    const cont = host.querySelector('[data-goal-continue]');
    if (cont) cont.disabled = false;
  }
  if (advance) {
    if (advancing) return;
    advancing = true;
    later(() => setStep('time'), 260);
  }
}

function commitTime(min) {
  if (!DAILY_XP[min]) return;
  picked.time = min;
  state.profile.minutes = min;
  state.profile.dailyGoalXp = DAILY_XP[min];
  save();
}

function chooseTime(min, advance = false) {
  if (!DAILY_XP[min]) return;
  commitTime(min);
  audio.sfx('tap');
  if (host) {
    host.querySelectorAll('[data-min]').forEach((b) => {
      const on = Number(b.dataset.min) === min;
      b.classList.toggle('is-selected', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  if (advance) setStep('name');
}

function chooseAvatar(id) {
  picked.avatar = id;
  state.profile.avatar = id;
  save();
  audio.sfx('tap');
  if (host) {
    host.querySelectorAll('[data-avatar]').forEach((b) => {
      const on = b.dataset.avatar === id;
      b.classList.toggle('is-selected', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
}

function syncNameField() {
  if (!host) return;
  const input = host.querySelector('[data-name-input]');
  const count = host.querySelector('[data-count]');
  const cont = host.querySelector('[data-name-continue]');
  if (!input) return;
  const len = input.value.length;
  if (count) {
    count.hidden = len < 12;
    count.textContent = `${len}/16`;
  }
  if (cont) cont.disabled = input.value.trim().length < 2;
  const clean = input.value.trim().replace(/\s+/g, ' ').slice(0, 16);
  const preview = host.querySelector('[data-name-preview]');
  const previewName = host.querySelector('[data-preview-name]');
  if (preview) preview.hidden = clean.length < 2;
  if (previewName) previewName.textContent = clean;
}

function saveName(skip = false) {
  if (!host) return;
  const input = host.querySelector('[data-name-input]');
  const name = skip
    ? 'Explorer'
    : (input?.value || '').trim().replace(/\s+/g, ' ').slice(0, 16);
  if (!skip && name.length < 2) return;
  state.profile.name = name;
  state.profile.avatar = picked.avatar || state.profile.avatar || 'tiger';
  save();
  audio.sfx('tap');
  setStep('ready');
}

function startNode() {
  audio.unlock();
  audio.sfx('tap');
  const s = state.session;
  if (!(s && s.kind === 'node' && (s.nodeIndex ?? 0) === 0)) {
    startSession('node', { nodeIndex: 0 });
  }
  save();
  router.go('lesson', { node: 0 });
}

function doItLater() {
  state.flags.onboardingDone = true;
  logEvent('onboarding_skipped', { step: 'ready' });
  save();
  router.go('home');
}

function resetQuiz() {
  quiz = { i: 0, score: 0, done: 0, locked: false, finalLevel: 0, taken: false, items: quickCheckItems() };
}

function finishQuiz(forceLevel = 0) {
  const score = quiz.score;
  const level = forceLevel || (score >= 4 ? 4 : score >= 2 ? 2 : 1);
  quiz.finalLevel = level;
  quiz.taken = true;
  state.flags.placementTaken = true;
  state.flags.placementLevel = level;
  // Honest metadata only: "previewed" is a pace hint, never fake mastery.
  state.flags.previewedLessons = level === 2 ? ['l01_1', 'l01_2'] : [];
  logEvent('placement_complete', { level, score });
  save();
  setStep('result');
}

function pickAnswer(optionId) {
  if (quiz.locked || !host) return;
  const ex = quiz.items[quiz.i];
  if (!ex) return;
  quiz.locked = true;
  const result = gradeAnswer(ex, optionId);
  const correct = !!result.correct;
  if (correct) quiz.score++;
  quiz.done = quiz.i + 1;

  const opts = [...host.querySelectorAll('[data-ans]')];
  opts.forEach((b) => {
    b.disabled = true;
    const opt = (ex.options || []).find((o) => o.id === b.dataset.ans);
    if (opt?.correct) b.classList.add('is-correct');
    else if (b.dataset.ans === optionId) b.classList.add('is-wrong');
    else b.classList.add('is-dim');
  });

  const fb = host.querySelector('[data-feedback]');
  if (fb) {
    fb.hidden = false;
    fb.className = `ob-feedback ${correct ? 'is-good' : 'is-neutral'}`;
    const label = correctAnswerText(ex);
    fb.innerHTML = `${ui.icon(correct ? 'check' : 'info', 17)}
      <span>${correct ? 'Correct.' : 'Not quite — '}<b>${ui.esc(label)}</b>. ${ui.esc(whyFor(ex))}</span>
      ${
        ex.clipId
          ? `<button class="say-btn say-btn--sm ob-fb-say" data-clip="${ui.esc(ex.clipId)}" data-clip-kind="${
              ex.clipKind || 's'
            }" data-say="${ui.esc(ex.korean || ex.prompt || '')}" type="button" aria-label="Play audio">${ui.icon(
              'sound',
              15
            )}</button>`
          : ''
      }`;
  }

  host.querySelector('.ob-seg--quiz')?.setAttribute('aria-valuenow', String(quiz.done));
  const seg = host.querySelectorAll('.ob-seg--quiz i')[quiz.done - 1];
  if (seg) seg.classList.add('done');

  if (correct) audio.sfx('correct');
  else audio.sfx('tap');

  later(
    () => {
      quiz.locked = false;
      if (quiz.i >= quiz.items.length - 1) {
        finishQuiz();
      } else {
        quiz.i++;
        setStep('quiz');
      }
    },
    correct ? 1000 : 1500
  );
}

function closeQuiz() {
  if (typeof document !== 'undefined' && document.querySelector('.scrim')) return;
  ui.modal({
    title: 'Skip the check?',
    body: `<p class="muted">We'll start you at Unit 1. You can still take every session — and the A1 exam at the end.</p>`,
    actions: [
      { label: 'Keep going', cls: 'btn-secondary' },
      { label: 'Skip the check', cls: 'btn-ghost', onClick: () => finishQuiz(1) },
    ],
  });
}

function syncReminderUI() {
  if (!host) return;
  const sw = host.querySelector('[data-skip-rem]');
  if (sw) sw.setAttribute('aria-checked', String(skipReminders));
  host.querySelector('.ob-chips-grid')?.classList.toggle('is-muted', skipReminders);
  host.querySelectorAll('[data-remind]').forEach((b) => {
    const on = b.dataset.remind === picked.reminder && !skipReminders;
    b.classList.toggle('is-selected', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  const notif = host.querySelector('.ob-notif');
  if (notif) {
    notif.classList.toggle('is-muted', skipReminders);
    const title = notif.querySelector('b');
    const line = notif.querySelector('.ob-notif-body span');
    if (title) title.textContent = skipReminders ? 'Horang' : `Horang · ${picked.reminder}`;
    if (line) {
      line.textContent = skipReminders
        ? 'Reminders are off. You can turn them on in Settings.'
        : 'Your next session is waiting.';
    }
  }
}

function chooseReminder(time) {
  picked.reminder = time;
  state.profile.reminderTime = time;
  save();
  audio.sfx('tap');
  syncReminderUI();
}

function toggleSkipReminders() {
  skipReminders = !skipReminders;
  audio.sfx('tap');
  syncReminderUI();
}

function finishOnboarding() {
  state.flags.onboardingDone = true;
  if (quiz.taken) {
    state.flags.placementTaken = true;
    state.flags.placementLevel = resultLevel();
  }
  state.profile.reminderTime = skipReminders ? null : picked.reminder;
  logEvent('onboarding_complete', {
    goal: state.profile.goal,
    minutes: state.profile.minutes,
    level: state.flags.placementLevel,
    placement: !!state.flags.placementTaken,
    reminder: state.profile.reminderTime,
  });
  save();
  audio.sfx('levelup');
  router.go('home');
}

// ---------- binding ----------
function bindStep(root) {
  root.querySelector('[data-ob-back]')?.addEventListener('click', () => {
    audio.sfx('tap');
    if (currentStep === 'goal') router.back('welcome');
    else if (currentStep === 'time') setStep('goal');
    else if (currentStep === 'name') setStep('time');
  });
  root.querySelector('[data-quiz-close]')?.addEventListener('click', closeQuiz);

  if (currentStep === 'goal') {
    root.querySelectorAll('[data-goal]').forEach((btn) => {
      btn.addEventListener('click', () => chooseGoal(btn.dataset.goal, true));
    });
    root.querySelector('[data-goal-continue]')?.addEventListener('click', () => {
      if (!picked.goal) return;
      audio.sfx('tap');
      setStep('time');
    });
    root.querySelector('[data-goal-skip]')?.addEventListener('click', () => {
      state.profile.goal = 'curious';
      picked.goal = 'curious';
      save();
      audio.sfx('tap');
      setStep('time');
    });
    return;
  }

  if (currentStep === 'time') {
    root.querySelectorAll('[data-min]').forEach((btn) => {
      btn.addEventListener('click', () => chooseTime(Number(btn.dataset.min)));
    });
    root.querySelector('[data-time-continue]')?.addEventListener('click', () => {
      audio.sfx('tap');
      commitTime(picked.time);
      setStep('name');
    });
    return;
  }

  if (currentStep === 'name') {
    const input = root.querySelector('[data-name-input]');
    input?.addEventListener('input', syncNameField);
    syncNameField();
    root.querySelectorAll('[data-avatar]').forEach((btn) => {
      btn.addEventListener('click', () => chooseAvatar(btn.dataset.avatar));
    });
    root.querySelector('[data-name-continue]')?.addEventListener('click', () => saveName(false));
    root.querySelector('[data-name-skip]')?.addEventListener('click', () => saveName(true));
    return;
  }

  if (currentStep === 'ready') {
    root.querySelector('[data-start-node]')?.addEventListener('click', startNode);
    root.querySelector('[data-later]')?.addEventListener('click', doItLater);
    return;
  }

  if (currentStep === 'quiz') {
    root.querySelectorAll('[data-ans]').forEach((btn) => {
      btn.addEventListener('click', () => pickAnswer(btn.dataset.ans));
    });
    root.querySelector('[data-quiz-skip]')?.addEventListener('click', () => {
      quiz.score = 0;
      finishQuiz(1);
    });
    return;
  }

  if (currentStep === 'result') {
    root.querySelector('[data-sounds-right]')?.addEventListener('click', () => {
      audio.sfx('tap');
      setStep('reminder');
    });
    root.querySelector('[data-redo-quiz]')?.addEventListener('click', () => {
      audio.sfx('tap');
      resetQuiz();
      setStep('quiz');
    });
    return;
  }

  if (currentStep === 'reminder') {
    root.querySelectorAll('[data-remind]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (skipReminders) return;
        chooseReminder(btn.dataset.remind);
      });
    });
    root.querySelector('[data-skip-rem]')?.addEventListener('click', toggleSkipReminders);
    root.querySelector('[data-rem-continue]')?.addEventListener('click', finishOnboarding);
  }
}

// ---------- keyboard ----------
function onKey(e) {
  if (!host) return;
  const target = e.target;
  const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
  if (e.key === 'Escape') {
    if (currentStep === 'quiz') {
      e.preventDefault();
      closeQuiz();
    }
    return;
  }
  if (typing) {
    if (e.key === 'Enter' && currentStep === 'name') {
      e.preventDefault();
      saveName(false);
    }
    return;
  }
  if (e.key === 'Enter' && target && (target.tagName === 'BUTTON' || target.tagName === 'A')) {
    // let the focused control handle its own Enter (avoids double actions)
    return;
  }
  if (e.key === 'Enter') {
    if (currentStep === 'goal' && picked.goal) {
      e.preventDefault();
      setStep('time');
    } else if (currentStep === 'time') {
      e.preventDefault();
      commitTime(picked.time);
      setStep('name');
    } else if (currentStep === 'ready') {
      e.preventDefault();
      startNode();
    } else if (currentStep === 'result') {
      e.preventDefault();
      setStep('reminder');
    } else if (currentStep === 'reminder') {
      e.preventDefault();
      finishOnboarding();
    }
    return;
  }
  if (currentStep === 'quiz' && /^[1-4]$/.test(e.key)) {
    const ex = quiz.items[quiz.i];
    const opt = ex?.options?.[Number(e.key) - 1];
    if (opt) {
      e.preventDefault();
      pickAnswer(opt.id);
    }
    return;
  }
  if (currentStep === 'goal' && /^[1-5]$/.test(e.key)) {
    e.preventDefault();
    chooseGoal(GOAL_ORDER[Number(e.key) - 1]);
    return;
  }
  if (currentStep === 'time' && /^[1-3]$/.test(e.key)) {
    e.preventDefault();
    chooseTime(TIMES[Number(e.key) - 1].min);
    return;
  }
  if (currentStep === 'reminder' && /^[1-5]$/.test(e.key)) {
    e.preventDefault();
    if (!skipReminders) chooseReminder(REMIND_TIMES[Number(e.key) - 1]);
  }
}

// ---------- module ----------
export default {
  id: 'onboarding',
  title: 'Welcome',
  nav: null,
  hideNav: true,
  render(params) {
    const step = resolveStep(params);
    prepare(step);
    if (step === 'quiz' && !quiz.items.length) resetQuiz();
    return `<section class="screen ob" data-ob data-stepname="${step}">
      <div class="ob-head" data-head>${headHtml(step)}</div>
      <div class="ob-step" data-step>${stepHtml(step)}</div>
    </section>`;
  },
  mount(root, params) {
    if (state.flags.onboardingDone && !(params && params.step)) {
      router.replace('home');
      return;
    }
    const step = resolveStep(params);
    prepare(step);
    if (step === 'quiz' && !quiz.items.length) resetQuiz();
    if (step !== 'quiz') quiz.locked = false;
    host = root;
    document.removeEventListener('keydown', onKey);
    document.addEventListener('keydown', onKey);
    paint(root);
  },
  destroy() {
    clearTimers();
    document.removeEventListener('keydown', onKey);
    host = null;
    advancing = false;
    quiz.locked = false;
  },
};
