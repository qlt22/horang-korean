// W1 · First-run funnel: goal → time → name → ready → (node 1) → quick check → result → reminder.
// One screen, internal steps. Every step is deep-linkable via #/onboarding?step=… and persists.
import { state, save, startSession, logEvent, GOALS, rankForLevel } from '../core/store.js';
import * as ui from '../core/ui.js';
import * as routerMod from '../core/router.js';
import * as audio from '../core/audio.js';

const router = {
  go: routerMod.go,
  replace: routerMod.replace,
  back: routerMod.back,
};

const STEPS = ['goal', 'time', 'name', 'ready', 'quiz', 'result', 'reminder'];
const GOAL_ORDER = ['travel', 'kdrama', 'work', 'curious'];

const TIMES = [
  { min: 5, label: 'Casual', xp: 60, line: 'A quick daily habit.' },
  { min: 10, label: 'Steady', xp: 120, line: 'Two short nodes a day.', tag: 'Most picked' },
  { min: 15, label: 'Serious', xp: 180, line: 'Room to go deep.' },
];
const DAILY_XP = { 5: 60, 10: 120, 15: 180 };
const REMIND_TIMES = ['07:00', '12:30', '18:00', '19:30', '21:30'];

// Fixed placement set — 5 questions, answers marked by index.
const QUIZ = [
  {
    q: 'Which one means water?',
    opts: ['물', '불', '밥', '집'],
    ko: true,
    a: 0,
    why: "It's 물 — water.",
    say: '물',
  },
  {
    q: 'What does 안녕하세요 mean?',
    opts: ['Hello', 'Thank you', 'Goodbye', 'Sorry'],
    a: 0,
    why: '안녕하세요 is the all-purpose polite hello.',
    say: '안녕하세요',
    promptSay: '안녕하세요',
  },
  {
    q: '저는 학생__ 입니다.',
    blank: true,
    opts: ['이', '가', '을', '를'],
    ko: true,
    a: 0,
    why: '학생 ends in a consonant, so the subject particle is 이.',
    say: '저는 학생입니다',
  },
  {
    q: 'Which is correct for "I eat rice"?',
    opts: ['저는 밥을 먹어요', '저는 먹어요 밥을', '밥을 저는 먹어요', '먹어요 저는 밥을'],
    ko: true,
    a: 0,
    why: 'Korean order is subject–object–verb: 저는 밥을 먹어요.',
    say: '저는 밥을 먹어요',
  },
  {
    q: 'What did you hear?',
    audio: '감사합니다',
    opts: ['Thank you', 'Hello', 'Goodbye', "I'm sorry"],
    a: 0,
    why: '감사합니다 means thank you.',
    say: '감사합니다',
  },
];

// ---------- module state ----------
let host = null;
let currentStep = 'goal';
let advancing = false;
let skipReminders = false;
let timers = [];
let quiz = { i: 0, score: 0, done: 0, locked: false, finalLevel: 0, taken: false };
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
  if (state.profile.goal !== 'curious') return state.profile.goal;
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
        <span class="ob-title">Quick check</span>
        <span class="ob-count">${quiz.i + 1} / 5</span>
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
      <h1 class="ob-h1">What's your goal?</h1>
      <p class="ob-sub">We'll tune your first week around it.</p>
    </div>
    <div class="ob-mascot-corner" aria-hidden="true">${ui.mascot(86, 'happy')}</div>
    <div class="ob-cards">
      ${GOAL_ORDER.map((id) => {
        const g = GOALS[id];
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
      <p class="ob-sub">You can change this later. Pick something you'd actually do.</p>
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
      <p class="ob-sub">It shows up on the leaderboard. Make it good.</p>
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
      <button class="say-btn say-btn--sm" data-preview-say data-say="저는 ${ui.esc(name.trim())}입니다" type="button" aria-label="Play audio">${ui.icon('sound', 18)}</button>
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
  return `<div class="ob-hero ob-rise">
      <span class="ob-hero-watermark" aria-hidden="true">안녕</span>
      <span class="ob-hero-bubble">3 minutes. That's it.</span>
      <span class="ob-hero-mascot">${ui.mascot(120, 'cheer')}</span>
    </div>
    <div class="ob-intro ob-rise">
      <h1 class="ob-h1">Your first quest is ready</h1>
    </div>
    <div class="ob-chips ob-rise">
      <span class="pill pill--sm">${ui.icon('clock', 14)} 3 min</span>
      <span class="pill pill--sm">${ui.icon('quests', 14)} 11 exercises</span>
      <span class="pill pill--sm">${ui.icon('sparkle', 14)} ~150 XP</span>
    </div>
    <div class="ob-node ob-rise">
      <span class="ob-node-badge" aria-hidden="true">${ui.icon('play', 20)}</span>
      <span class="ob-node-body">
        <span class="ob-node-overline">PACK 1 · 인사 Greetings</span>
        <span class="ob-node-title ko">Node 1 · 안녕, Korea</span>
        <span class="ob-node-sub">3 sentences · first stamp</span>
      </span>
      <button class="say-btn say-btn--sm" data-say="안녕" aria-label="Play audio" type="button">${ui.icon('sound', 18)}</button>
    </div>
    <div class="ob-foot ob-rise">
      <button class="btn btn-primary btn-block btn-lg" data-start-node type="button">
        ${resuming ? 'Continue node 1' : 'Start node 1'} ${ui.icon('arrow', 20)}
      </button>
      <p class="ob-micro">No Focus cost. No ads. No paywall. Ever.</p>
      <button class="btn btn-ghost btn-block ob-skip" data-later type="button">I'll do it later</button>
    </div>`;
}

function quizHtml() {
  const q = QUIZ[quiz.i] || QUIZ[0];
  return `<div class="ob-quiz ob-rise">
      ${q.blank
        ? `<h1 class="ob-q ko" aria-label="저는 학생, blank, 입니다.">저는 학생<span class="ob-blank" aria-hidden="true"></span> 입니다.</h1>`
        : `<h1 class="ob-q">${ui.esc(q.q)}</h1>`}
      ${q.audio
        ? `<div class="ob-audio-wrap">
            <button class="ob-audio" data-say="${ui.esc(q.audio)}" type="button" aria-label="Play audio">${ui.icon('sound', 26)}</button>
            <span class="ob-audio-hint">Tap to hear it again</span>
          </div>`
        : ''}
      ${q.say && !q.audio && !q.blank && q.promptSay ? `<div class="ob-q-say">${ui.sayBtn(q.promptSay, { small: true })}</div>` : ''}
    </div>
    <div class="ob-opts">
      ${q.opts.map((label, i) => `<button class="opt ob-opt ${q.ko ? 'ko' : ''}" data-ans="${i}" type="button">
        <span class="key" aria-hidden="true">${i + 1}</span>
        <span class="opt-text">${ui.esc(label)}</span>
      </button>`).join('')}
    </div>
    <div class="ob-feedback" data-feedback hidden></div>
    <div class="ob-foot ob-foot--quiz ob-rise">
      <button class="btn btn-ghost btn-block ob-skip" data-beginner type="button">I'm a total beginner</button>
    </div>`;
}

function resultHtml() {
  const level = resultLevel();
  const rank = rankForLevel(level);
  const sub =
    level >= 4
      ? "We'll skip what you already know. Pack 1 test-out unlocked."
      : level >= 2
        ? "We'll skip the basics. Pack 1 test-out is available."
        : "We'll start from the very beginning. No pressure.";
  return `<div class="ob-result ob-rise">
      <div class="ob-ring">
        ${ui.ring(0, { size: 88, stroke: 8, color: 'var(--coral-500)' })}
        <span class="ob-ring-lv">LV ${level}</span>
      </div>
      <h1 class="ob-h1">You're a Level ${level} ${ui.esc(rank.label)}</h1>
      <p class="ob-sub">${ui.esc(sub)}</p>
    </div>
    <ul class="ob-unlocks ob-rise">
      <li><span class="ob-unlock-ico" aria-hidden="true">✅</span><span>Hangul basics</span></li>
      <li><span class="ob-unlock-ico" aria-hidden="true">✅</span><span>Greetings</span></li>
      <li><span class="ob-unlock-ico" aria-hidden="true">🔓</span><span>Test out of Pack 1</span></li>
    </ul>
    <div class="ob-info ob-rise">You can test out of any pack later. Nothing is locked forever.</div>
    <div class="ob-foot ob-rise">
      <button class="btn btn-primary btn-block btn-lg" data-sounds-right type="button">
        Sounds right ${ui.icon('arrow', 20)}
      </button>
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
        <span>${skipReminders ? 'Reminders are off. You can turn them on in Settings.' : 'Your 3-minute run is waiting.'}</span>
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
  audio.sfx('complete');
  requestAnimationFrame(() => {
    const circle = root.querySelector('.ob-ring .ring circle:last-of-type');
    if (circle) circle.style.strokeDashoffset = '0';
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
  if (!GOALS[id]) return;
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
  const previewSay = host.querySelector('[data-preview-say]');
  if (preview) preview.hidden = clean.length < 2;
  if (previewName) previewName.textContent = clean;
  if (previewSay) previewSay.dataset.say = clean ? `저는 ${clean}입니다` : '';
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
  quiz = { i: 0, score: 0, done: 0, locked: false, finalLevel: 0, taken: false };
}

function finishQuiz(forceLevel) {
  const level = forceLevel || (quiz.score >= 4 ? 4 : quiz.score >= 2 ? 2 : 1);
  quiz.finalLevel = level;
  quiz.taken = true;
  state.flags.placementTaken = true;
  state.flags.placementLevel = level;
  logEvent('placement_complete', { level, score: quiz.score });
  save();
  setStep('result');
}

function pickAnswer(index) {
  if (quiz.locked || !host) return;
  const q = QUIZ[quiz.i];
  if (!q) return;
  quiz.locked = true;
  const correct = index === q.a;
  if (correct) quiz.score++;
  quiz.done = quiz.i + 1;

  const opts = [...host.querySelectorAll('[data-ans]')];
  opts.forEach((b, i) => {
    b.disabled = true;
    if (i === q.a) b.classList.add('is-correct');
    else if (i === index) b.classList.add('is-wrong');
    else b.classList.add('is-dim');
  });
  if (!correct) opts[q.a]?.classList.add('ob-pulse');

  const fb = host.querySelector('[data-feedback]');
  if (fb) {
    fb.hidden = false;
    fb.className = `ob-feedback ${correct ? 'is-good' : 'is-neutral'}`;
    fb.innerHTML = `${ui.icon(correct ? 'check' : 'info', 17)}<span>${ui.esc(q.why)}</span>
      ${q.say ? `<button class="say-btn say-btn--sm ob-fb-say" data-say="${ui.esc(q.say)}" type="button" aria-label="Play audio">${ui.icon('sound', 15)}</button>` : ''}`;
  }

  // fill the matching progress segment immediately
  host.querySelector('.ob-seg--quiz')?.setAttribute('aria-valuenow', String(quiz.done));
  const seg = host.querySelectorAll('.ob-seg--quiz i')[quiz.done - 1];
  if (seg) seg.classList.add('done');

  if (correct) audio.sfx('correct');
  else audio.sfx('tap');

  later(() => {
    quiz.locked = false;
    if (quiz.i >= QUIZ.length - 1) {
      finishQuiz();
    } else {
      quiz.i++;
      setStep('quiz');
    }
  }, correct ? 950 : 1350);
}

function closeQuiz() {
  if (typeof document !== 'undefined' && document.querySelector('.scrim')) return;
  ui.modal({
    title: 'Skip the check?',
    body: `<p class="muted">We'll keep you at the very beginning.</p>`,
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
        : 'Your 3-minute run is waiting.';
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
      btn.addEventListener('click', () => pickAnswer(Number(btn.dataset.ans)));
    });
    root.querySelector('[data-beginner]')?.addEventListener('click', () => {
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
    e.preventDefault();
    pickAnswer(Number(e.key) - 1);
    return;
  }
  if (currentStep === 'goal' && /^[1-4]$/.test(e.key)) {
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
    if (step === 'quiz') resetQuiz();
    prepare(step);
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
