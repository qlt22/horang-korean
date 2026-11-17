// S9 · Lesson player — the core loop. Six exercise types, one graded answer at a time.
import { state, save, startSession, recordAnswer, completeNode } from '../core/store.js';
import { NODES } from '../core/engine.js';
import * as ui from '../core/ui.js';
import * as audio from '../core/audio.js';
import router from '../core/router.js';
import { gradeSelection, correctAnswerText } from '../core/quiz.js';
import { nowMs } from '../core/clock.js';

const MIC_SVG = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0"/><path d="M12 18v3"/></svg>`;

// Per-screen mutable UI state (never persisted).
const S = {
  root: null,
  stage: null,
  cta: null,
  banner: null,
  segs: null,
  xpPill: null,
  comboPill: null,
  graded: false,
  ready: false,
  itemStart: 0,
  selection: null,
  tileOrder: [],
  match: null,
  timer: null,
  timeouts: [],
  onKey: null,
};

function later(fn, ms) {
  const id = setTimeout(fn, ms);
  S.timeouts.push(id);
  return id;
}
function clearLater() {
  S.timeouts.forEach((id) => clearTimeout(id));
  S.timeouts = [];
}
function clearMatchTimer() {
  if (S.timer) clearInterval(S.timer);
  S.timer = null;
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function mmss(sec) {
  const s = Math.max(0, sec | 0);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function session() {
  return state.session;
}
function currentEx() {
  const s = session();
  if (!s || !s.items) return null;
  return s.items[s.index] || null;
}
function kindLabel(s) {
  if (!s) return 'Node';
  if (s.kind === 'daily') return 'Daily Run';
  if (s.kind === 'review') return 'Review';
  if (s.kind === 'practice') return 'Practice';
  return `Node ${(s.nodeIndex ?? 0) + 1}`;
}

// ---------- session bootstrapping ----------
function ensureSession(params = {}) {
  const kind = params.kind || 'node';
  const nodeIndex = Math.max(0, Number(params.node || 0));
  const s = state.session;
  const matches =
    s &&
    s.kind === kind &&
    (kind !== 'node' || (s.nodeIndex ?? 0) === nodeIndex) &&
    Array.isArray(s.items);
  if (matches) return s;
  return startSession(kind, kind === 'node' ? { nodeIndex } : {});
}

// ---------- markup ----------
function segsHtml(s) {
  const n = s.items.length || 1;
  let out = '';
  for (let i = 0; i < n; i++) {
    const cls = i < s.index ? 'done' : i === s.index ? 'now' : '';
    out += `<i data-seg class="${cls}"></i>`;
  }
  return out;
}
function optsHtml(options = []) {
  return options
    .map(
      (o, i) => `<button class="opt${o.ko ? ' ko' : ''}" data-opt="${i}" type="button">
        <span class="key">${ui.esc(o.key || i + 1)}</span>
        <span class="opt-text">${ui.esc(o.label)}${
          o.sub ? `<span class="opt-sub">${ui.esc(o.sub)}</span>` : ''
        }</span>
      </button>`
    )
    .join('');
}
function chipHtml(side, pair) {
  const label = side === 'ko' ? pair.ko : pair.en;
  return `<button class="match-chip match-chip--${side}" data-${side}="${ui.esc(pair.id)}" type="button">
    ${ui.esc(label)}
  </button>`;
}

function bodyFor(ex) {
  if (!ex) return '';

  if (ex.type === 'listen_pick') {
    return `<div class="lesson-item">
      <div class="lesson-head">
        <p class="lesson-inst">${ui.esc(ex.instruction)}</p>
        <h2 class="lesson-prompt">${ui.esc(ex.prompt)}</h2>
      </div>
      <div class="lesson-body">
        <div class="listen-hero">
          <div class="listen-ring">${ui.sayBtn(ex.audio)}</div>
          <button class="btn btn-ghost btn-sm listen-again" data-replay type="button">
            ${ui.icon('refresh', 18)} Hear it again
          </button>
        </div>
        <div class="opts opts--lesson" data-opts>${optsHtml(ex.options)}</div>
      </div>
    </div>`;
  }

  if (ex.type === 'translate_pick') {
    return `<div class="lesson-item">
      <div class="lesson-head">
        <p class="lesson-inst">${ui.esc(ex.instruction)}</p>
        <h2 class="lesson-prompt lesson-prompt--en">${ui.esc(ex.prompt)}</h2>
      </div>
      <div class="lesson-body">
        <div class="opts opts--lesson" data-opts>${optsHtml(ex.options)}</div>
        <p class="lesson-footnote">Three options. One is the exact sentence.</p>
      </div>
    </div>`;
  }

  if (ex.type === 'tile_build') {
    return `<div class="lesson-item">
      <div class="lesson-head">
        <p class="lesson-inst">${ui.esc(ex.instruction)}</p>
        <h2 class="lesson-prompt lesson-prompt--en">${ui.esc(ex.prompt)}</h2>
      </div>
      <div class="lesson-body">
        <div class="tile-zone lesson-zone" data-zone>
          <span class="zone-hint">Tap the words below</span>
        </div>
        <div class="tiles lesson-bank" data-bank>
          ${ex.tiles
            .map(
              (t, i) =>
                `<button class="tile" data-tile-idx="${i}" type="button">${ui.esc(t)}</button>`
            )
            .join('')}
        </div>
        <p class="lesson-answer-line" data-answer-line hidden></p>
      </div>
    </div>`;
  }

  if (ex.type === 'fill_blank') {
    const b = ex.blank || { before: '', after: '', answer: '' };
    return `<div class="lesson-item">
      <div class="lesson-head">
        <p class="lesson-inst">${ui.esc(ex.instruction)}</p>
        <h2 class="lesson-prompt">${ui.esc(ex.prompt)}</h2>
      </div>
      <div class="lesson-body">
        <div class="cloze" data-cloze>
          ${b.before ? `<span class="cloze-word">${ui.esc(b.before)}</span>` : ''}
          <span class="cloze-blank" data-blank>_____</span>
          ${b.after ? `<span class="cloze-word">${ui.esc(b.after)}</span>` : ''}
        </div>
        <p class="cloze-en">${ui.esc(ex.english)}</p>
        <div class="opts opts--2" data-opts>${optsHtml(ex.options)}</div>
      </div>
    </div>`;
  }

  if (ex.type === 'speed_match') {
    const M = S.match;
    const left = M ? M.left : ex.seconds || 45;
    const total = (ex.pairs || []).length;
    return `<div class="lesson-item lesson-item--match">
      <div class="match-head">
        <span class="match-timer" data-timer>${ui.icon('clock', 16)} ${mmss(left)}</span>
        <span class="match-count" data-match-count>0 / ${total}</span>
      </div>
      <p class="lesson-inst center">Tap one from each side</p>
      <div class="lesson-body">
        <div class="match-grid">
          <div class="match-col" data-col="ko">${(M ? M.ko : ex.pairs)
            .map((p) => chipHtml('ko', p))
            .join('')}</div>
          <div class="match-col" data-col="en">${(M ? M.en : ex.pairs)
            .map((p) => chipHtml('en', p))
            .join('')}</div>
        </div>
        <p class="match-slips" data-slips hidden></p>
      </div>
    </div>`;
  }

  // say_it
  const showRom = state.settings?.romanization !== 'never' && !!ex.romanization;
  const gloss = (ex.gloss || []).filter((g) => g && g.ko && g.en).slice(0, 6);
  return `<div class="lesson-item lesson-item--say">
    <p class="lesson-inst center">${ui.esc(ex.instruction || 'Tap the speaker, then repeat')}</p>
    <div class="say-card">
      <h2 class="say-ko">${ui.esc(ex.korean)}</h2>
      ${showRom ? `<p class="say-rom">${ui.esc(ex.romanization)}</p>` : ''}
      <p class="say-en">${ui.esc(ex.english)}</p>
      ${
        gloss.length
          ? `<div class="say-gloss" aria-label="Word by word">${gloss
              .map((g) => `<span><b lang="ko">${ui.esc(g.ko)}</b>${ui.esc(g.en)}</span>`)
              .join('')}</div>`
          : ''
      }
      <div class="say-actions">
        ${ui.sayBtn(ex.audio)}
        <button class="mic-btn" data-mic type="button">${MIC_SVG}<span>Say it</span></button>
      </div>
    </div>
    <div class="say-rates" data-rates hidden>
      <p class="say-rates-label">How did it feel?</p>
      <div class="say-rate-row">
        <button class="rate" data-rate="again" type="button"><span class="rate-emoji">🔁</span>Again</button>
        <button class="rate" data-rate="good" type="button"><span class="rate-emoji">👍</span>Good</button>
        <button class="rate" data-rate="nailed" type="button"><span class="rate-emoji">🎯</span>Nailed it</button>
      </div>
    </div>
    <p class="lesson-footnote">No mic? No problem — rate yourself honestly.</p>
  </div>`;
}

function shellHtml(s) {
  const label = kindLabel(s);
  const node = s.kind === 'node' ? NODES[s.nodeIndex ?? 0] : null;
  const sub = node ? node.unitTitle : label === 'Daily Run' ? 'Today’s mix' : 'Sentences that need you';
  return `<section class="screen lesson" data-lesson>
    <header class="lesson-top">
      <button class="icon-btn lesson-x" data-leave type="button" aria-label="Leave lesson">
        ${ui.icon('close', 22)}
      </button>
      <div class="lesson-prog">
        <div class="lesson-prog-meta">
          <span class="lesson-prog-label">${ui.esc(label)}</span>
          <span class="lesson-prog-sub">${ui.esc(sub)}</span>
        </div>
        <div class="seg-bar lesson-segs" data-segs role="progressbar" aria-label="Exercise ${
          s.index + 1
        } of ${s.items.length}">${segsHtml(s)}</div>
      </div>
      <span class="pill pill--amber lesson-xp" data-xp>${ui.icon('bolt', 16)}<b>${ui.fmt(
    s.xp || 0
  )}</b></span>
    </header>

    <div class="combo-pill" data-combo hidden>🔥 ×3</div>

    <div class="lesson-stage" data-stage></div>

    <footer class="lesson-foot">
      <div class="lesson-banner" data-banner hidden></div>
      <button class="btn btn-primary btn-block lesson-cta" data-cta type="button" disabled>
        Check<span class="kbd-hint">Enter ↵</span>
      </button>
    </footer>
  </section>`;
}

// ---------- state painting ----------
function paintXp(punch = false) {
  const s = session();
  if (!s || !S.xpPill) return;
  const num = S.xpPill.querySelector('b');
  if (!num) return;
  const from = Number(num.textContent.replace(/[^\d]/g, '')) || 0;
  const to = s.xp || 0;
  if (from !== to) ui.countUp(num, from, to, 420);
  if (punch) {
    S.xpPill.classList.remove('punch');
    void S.xpPill.offsetWidth;
    S.xpPill.classList.add('punch');
  }
}
function paintCombo(punch = false) {
  const s = session();
  if (!S.comboPill) return;
  const n = s?.combo || 0;
  if (n >= 3) {
    S.comboPill.hidden = false;
    S.comboPill.innerHTML = `🔥 ×${n}`;
    if (punch) {
      S.comboPill.classList.remove('punch');
      void S.comboPill.offsetWidth;
      S.comboPill.classList.add('punch');
    }
  } else {
    S.comboPill.hidden = true;
  }
}
function paintSegs() {
  const s = session();
  if (!s || !S.segs) return;
  S.segs.innerHTML = segsHtml(s);
  S.segs.setAttribute('aria-label', `Exercise ${Math.min(s.index + 1, s.items.length)} of ${s.items.length}`);
}
function markSegmentDone() {
  const s = session();
  if (!s || !S.segs) return;
  const el = S.segs.querySelectorAll('[data-seg]')[s.index];
  if (el) {
    el.classList.remove('now');
    el.classList.add('done');
    el.classList.add('seg-pop');
  }
}

function resetFooter(ex) {
  if (!S.banner || !S.cta) return;
  S.banner.hidden = true;
  S.banner.className = 'lesson-banner';
  S.banner.innerHTML = '';
  S.cta.className = 'btn btn-primary btn-block lesson-cta';
  S.cta.disabled = true;
  S.cta.innerHTML = `Check<span class="kbd-hint">Enter ↵</span>`;
  S.cta.classList.toggle('is-hidden', ex?.type === 'speed_match');
}

function setCtaEnabled(on) {
  if (!S.cta) return;
  S.cta.disabled = !on;
  if (on) {
    // Keyboard-first: once an answer is chosen, Enter should read as "Check".
    try {
      S.cta.focus({ preventScroll: true });
    } catch {
      /* focus is a nicety */
    }
  }
}

function paint() {
  if (!S.stage) return;
  clearLater();
  clearMatchTimer();
  S.graded = false;
  S.ready = false;
  S.selection = null;
  S.tileOrder = [];
  S.match = null;

  const s = session();
  const ex = currentEx();
  if (!s || !ex) {
    S.stage.innerHTML = `<div class="empty-note">Nothing left in this run.</div>`;
    return;
  }

  if (ex.type === 'speed_match') {
    const pairs = ex.pairs || [];
    S.match = {
      ko: shuffle(pairs),
      en: shuffle(pairs),
      selKo: null,
      selEn: null,
      matched: new Set(),
      mistakes: 0,
      left: Number(ex.seconds) || 45,
      done: false,
    };
  }

  S.stage.innerHTML = bodyFor(ex);
  S.itemStart = nowMs();
  resetFooter(ex);
  paintSegs();
  paintXp(false);
  paintCombo(false);

  if (ex.type === 'listen_pick') {
    later(() => audio.speak(ex.audio), 250);
  }
  if (ex.type === 'speed_match') startMatchClock(ex);
}

// ---------- grading ----------
function selectionValue(ex) {
  if (!ex) return null;
  if (ex.type === 'tile_build') return S.tileOrder.map((i) => ex.tiles[i]);
  return S.selection;
}

function check() {
  const ex = currentEx();
  if (!ex || S.graded) return;
  if (ex.type === 'speed_match') return;

  let correct = false;
  if (ex.type === 'say_it') {
    correct = true;
  } else if (ex.type === 'tile_build') {
    correct = gradeSelection(ex, selectionValue(ex));
  } else if (ex.type === 'fill_blank') {
    correct = gradeSelection(ex, S.selection);
  } else {
    correct = gradeSelection(ex, S.selection);
  }
  applyGrade(correct, ex);
}

function applyGrade(correct, ex) {
  if (S.graded) return;
  S.graded = true;
  clearMatchTimer();

  const s = session();
  if (!s) return;
  const ms = Math.max(500, Math.round(nowMs() - (S.itemStart || nowMs())));
  const beforeXp = s.xp || 0;
  const levelBefore = state.level;

  const res = recordAnswer({
    sentenceId: ex.sentenceId,
    type: ex.type,
    correct,
    ms,
  });

  // Core does not accumulate per-session XP; keep the session total honest here.
  if (res && res.xp) s.xp = beforeXp + res.xp;
  save();

  paintXp(true);
  paintCombo(correct);
  markSegmentDone();
  reveal(!!correct, ex, res);

  if (correct) {
    audio.sfx('correct');
    if (res?.crit) audio.sfx('crit');
    if (res?.crit) ui.confetti({ count: 12 });
    if (state.level > levelBefore) {
      ui.toast(`Level ${state.level} — +20 coins`, { icon: 'sparkle', tone: 'coral' });
    }
  } else {
    audio.sfx('wrong');
    const stage = S.stage;
    if (stage) {
      stage.classList.remove('is-shake');
      void stage.offsetWidth;
      stage.classList.add('is-shake');
    }
  }

  later(() => swapToContinue(), 900);
}

function reveal(correct, ex, res) {
  const stage = S.stage;
  if (!stage) return;

  if (ex.type === 'tile_build') {
    const zone = stage.querySelector('[data-zone]');
    const line = stage.querySelector('[data-answer-line]');
    if (zone) {
      zone.classList.remove('is-over');
      zone.classList.add(correct ? 'is-correct' : 'is-wrong');
    }
    if (!correct && line) {
      line.hidden = false;
      line.innerHTML = `Correct order: <b lang="ko">${ui.esc(ex.answer.join(' '))}</b> ${ui.sayBtn(
        ex.audio,
        { small: true }
      )}`;
    }
  } else if (ex.type === 'fill_blank') {
    const blank = stage.querySelector('[data-blank]');
    if (blank) {
      blank.textContent = ex.blank?.answer || correctAnswerText(ex);
      blank.classList.add(correct ? 'is-correct' : 'is-wrong');
    }
    highlightOptions(stage, ex);
  } else if (ex.type === 'speed_match') {
    const chips = stage.querySelectorAll('.match-chip');
    chips.forEach((c) => {
      if (!c.classList.contains('is-matched')) c.classList.add('is-dim');
    });
  } else if (ex.type === 'say_it') {
    stage.querySelectorAll('.rate:not(.is-selected)').forEach((b) => b.classList.add('is-locked'));
  } else {
    highlightOptions(stage, ex);
  }

  const xp = res?.xp || 0;
  if (correct) {
    if (S.banner) {
      const label = res?.crit ? `CRIT ×2 · +${xp} XP` : `Nice! +${xp} XP`;
      const sub =
        ex.type === 'say_it'
          ? 'Said out loud — that counts.'
          : ex.type === 'listen_pick'
            ? `<span lang="ko">${ui.esc(ex.korean)}</span>`
            : '';
      S.banner.className = 'lesson-banner lesson-banner--good is-up';
      S.banner.innerHTML = `<span class="lb-ico">${ui.icon(
        res?.crit ? 'sparkle' : 'check',
        20
      )}</span><div class="lb-text"><b>${label}</b>${
        sub ? `<span class="lb-sub">${sub}</span>` : ''
      }</div>`;
      S.banner.hidden = false;
    }
    if (xp) xpFloat(xp, !!res?.crit);
  } else {
    const answer = (correctAnswerText(ex) || ex.korean || '').replace(/[.!?]+$/, '');
    const why = (ex.grammarTag || ex.sentence?.grammar_tag || '').trim();
    if (S.banner) {
      const ko = /[\uac00-\ud7af]/.test(answer);
      S.banner.className = 'lesson-banner lesson-banner--bad is-up';
      S.banner.innerHTML = `<span class="lb-ico">${ui.icon('info', 20)}</span>
        <div class="lb-text"><b>It’s <span${ko ? ' lang="ko"' : ''}>${ui.esc(answer)}</span>.</b>${
          why ? `<span class="lb-sub">${ui.esc(why)}</span>` : ''
        }</div>
        ${ui.sayBtn(ex.audio, { small: true })}`;
      S.banner.hidden = false;
    }
  }
}

function highlightOptions(stage, ex) {
  const nodes = stage.querySelectorAll('.opt');
  const chosen = S.selection;
  nodes.forEach((node) => {
    const i = Number(node.dataset.opt);
    const o = (ex.options || [])[i];
    if (!o) return;
    if (o.correct) node.classList.add('is-correct');
    else if ((ex.type === 'fill_blank' ? o.label : o.id) === chosen) node.classList.add('is-wrong');
    else node.classList.add('is-dim');
    node.disabled = true;
  });
}

function xpFloat(amount, crit) {
  const host = S.root?.querySelector('.lesson') || S.root;
  if (!host) return;
  const el = document.createElement('div');
  el.className = 'xp-float' + (crit ? ' xp-float--crit' : '');
  el.textContent = crit ? `CRIT ×2 +${amount} XP` : `+${amount} XP`;
  host.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

function swapToContinue() {
  if (!S.cta) return;
  S.ready = true;
  S.cta.className = 'btn btn-ink btn-block lesson-cta';
  S.cta.disabled = false;
  S.cta.innerHTML = `Continue ${ui.icon('arrow', 20)}<span class="kbd-hint">Enter ↵</span>`;
  try {
    S.cta.focus({ preventScroll: true });
  } catch {
    /* focus is a nicety */
  }
}

function advance() {
  const s = session();
  if (!s || !S.graded || !S.ready) return;
  s.index += 1;
  save();
  if (s.index < s.items.length) {
    paint();
  } else {
    finish();
  }
}

function finish() {
  const s = session();
  if (!s) return;
  const kind = s.kind;
  const nodeIndex = s.nodeIndex ?? 0;
  audio.stopSpeaking();
  // Awards bonus XP, fills the chest slot, updates streak + quests, sets lastSummary.
  completeNode();
  router.go('complete', kind === 'node' ? { node: nodeIndex } : { kind });
}

// ---------- speed match ----------
function startMatchClock(ex) {
  const M = S.match;
  if (!M) return;
  updateMatchUi();
  S.timer = setInterval(() => {
    if (!S.match || S.graded) return;
    S.match.left -= 1;
    const t = S.stage?.querySelector('[data-timer]');
    if (t) {
      t.innerHTML = `${ui.icon('clock', 16)} ${mmss(S.match.left)}`;
      t.classList.toggle('is-low', S.match.left <= 10);
    }
    if (S.match.left <= 0) {
      finishMatch(ex, true);
    }
  }, 1000);
}

function updateMatchUi() {
  const M = S.match;
  if (!M || !S.stage) return;
  const count = S.stage.querySelector('[data-match-count]');
  if (count) count.textContent = `${M.matched.size} / ${M.ko.length}`;
  const slips = S.stage.querySelector('[data-slips]');
  if (slips) {
    if (M.mistakes > 0) {
      slips.hidden = false;
      slips.textContent = `${M.mistakes} slip${M.mistakes > 1 ? 's' : ''} — ${M.mistakes <= 1 ? 'still clean enough.' : 'take your time.'}`;
    } else {
      slips.hidden = true;
    }
  }
}

function markChipSelection(side) {
  const M = S.match;
  if (!M || !S.stage) return;
  S.stage.querySelectorAll(`.match-chip--${side}`).forEach((c) => {
    const on = c.dataset[side] === M[side === 'ko' ? 'selKo' : 'selEn'];
    c.classList.toggle('is-selected', on);
  });
}

function onChip(side, id, el) {
  const M = S.match;
  const ex = currentEx();
  if (!M || !ex || S.graded || M.done) return;
  if (el.classList.contains('is-matched')) return;
  audio.sfx('tap');

  const key = side === 'ko' ? 'selKo' : 'selEn';
  M[key] = M[key] === id ? null : id;
  markChipSelection(side);

  if (!M.selKo || !M.selEn) return;

  if (M.selKo === M.selEn) {
    const match = ex.pairs.find((p) => p.id === M.selKo);
    M.matched.add(M.selKo);
    S.stage.querySelectorAll(`[data-ko="${cssEscape(M.selKo)}"], [data-en="${cssEscape(M.selKo)}"]`).forEach((c) => {
      c.classList.remove('is-selected');
      c.classList.add('is-matched');
    });
    M.selKo = null;
    M.selEn = null;
    updateMatchUi();
    audio.sfx('coin');
    if (match) audio.speak(match.ko, { rate: 0.9 });
    if (M.matched.size === M.ko.length) later(() => finishMatch(ex, false), 320);
  } else {
    M.mistakes += 1;
    updateMatchUi();
    const a = S.stage.querySelector(`.match-chip--ko[data-ko="${cssEscape(M.selKo)}"]`);
    const b = S.stage.querySelector(`.match-chip--en[data-en="${cssEscape(M.selEn)}"]`);
    [a, b].forEach((c) => {
      if (!c) return;
      c.classList.add('is-wrong');
      setTimeout(() => c.classList.remove('is-wrong'), 420);
    });
    audio.sfx('wrong');
    M.selKo = null;
    M.selEn = null;
    setTimeout(() => {
      if (!S.match) return;
      S.stage?.querySelectorAll('.match-chip.is-selected').forEach((c) => c.classList.remove('is-selected'));
    }, 380);
  }
}

function cssEscape(v) {
  return String(v).replace(/["\\]/g, '\\$&');
}

function finishMatch(ex, timedOut) {
  const M = S.match;
  if (!M || M.done) return;
  M.done = true;
  clearMatchTimer();
  const t = S.stage?.querySelector('[data-timer]');
  if (t) {
    t.innerHTML = `${ui.icon('clock', 16)} ${mmss(timedOut ? 0 : M.left)}`;
    t.classList.add('is-done');
  }
  const correct = M.mistakes <= 1;
  if (correct) {
    audio.sfx('correct');
  }
  applyGrade(correct, ex);
}

// ---------- events ----------
function bindShell(root) {
  root.querySelector('[data-leave]')?.addEventListener('click', () => {
    ui.sheet({
      title: 'Leave this node?',
      body: '<p class="center muted">Your answers so far are saved.</p>',
      actions: [
        { label: 'Stay', cls: 'btn-primary' },
        {
          label: 'Leave',
          cls: 'btn-ghost',
          onClick: () => {
            audio.stopSpeaking();
            router.go('home');
          },
        },
      ],
    });
  });

  S.cta?.addEventListener('click', () => {
    if (S.graded) {
      if (S.ready) advance();
      else nudgeCta();
      return;
    }
    if (S.cta?.disabled) {
      nudgeCta();
      return;
    }
    check();
  });
}

function nudgeCta() {
  if (!S.cta) return;
  S.cta.classList.remove('is-nudge');
  void S.cta.offsetWidth;
  S.cta.classList.add('is-nudge');
}

function onStageClick(e) {
  const stage = S.stage;
  if (!stage) return;
  const ex = currentEx();

  const opt = e.target.closest('[data-opt]');
  if (opt && !S.graded && ex?.options) {
    const i = Number(opt.dataset.opt);
    const o = ex.options[i];
    if (!o) return;
    S.selection = ex.type === 'fill_blank' ? o.label : o.id;
    stage.querySelectorAll('.opt').forEach((n) => n.classList.remove('is-selected'));
    opt.classList.add('is-selected');
    setCtaEnabled(true);
    return;
  }

  const tile = e.target.closest('[data-tile-idx]');
  if (tile && !S.graded && ex?.type === 'tile_build') {
    const idx = Number(tile.dataset.tileIdx);
    const zone = stage.querySelector('[data-zone]');
    const bank = stage.querySelector('[data-bank]');
    if (!zone || !bank) return;
    const placed = tile.parentElement === zone;
    if (placed) {
      S.tileOrder = S.tileOrder.filter((x) => x !== idx);
      tile.classList.remove('tile--placed');
      bank.appendChild(tile);
    } else {
      zone.querySelector('.zone-hint')?.remove();
      S.tileOrder.push(idx);
      tile.classList.add('tile--placed');
      zone.appendChild(tile);
    }
    setCtaEnabled(S.tileOrder.length === (ex.answer || []).length);
    return;
  }

  const replay = e.target.closest('[data-replay]');
  if (replay && ex) {
    audio.speak(ex.audio);
    return;
  }

  const mic = e.target.closest('[data-mic]');
  if (mic && ex?.type === 'say_it' && !S.graded) {
    requestMic(mic);
    return;
  }

  const rate = e.target.closest('[data-rate]');
  if (rate && ex?.type === 'say_it' && !S.graded) {
    S.selection = rate.dataset.rate;
    stage.querySelectorAll('.rate').forEach((b) => b.classList.remove('is-selected'));
    rate.classList.add('is-selected');
    setCtaEnabled(true);
    return;
  }

  const ko = e.target.closest('[data-ko]');
  if (ko) {
    onChip('ko', ko.dataset.ko, ko);
    return;
  }
  const en = e.target.closest('[data-en]');
  if (en) {
    onChip('en', en.dataset.en, en);
  }
}

function requestMic(btn) {
  // Ask silently when the API is there; never block the lesson on a permission prompt.
  try {
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => stream.getTracks().forEach((t) => t.stop()))
        .catch(() => {});
    }
  } catch {
    /* no mic, no problem */
  }
  btn.classList.add('is-listening');
  const rates = S.stage?.querySelector('[data-rates]');
  if (rates) {
    rates.hidden = false;
    requestAnimationFrame(() => rates.classList.add('is-in'));
    setTimeout(() => {
      rates.querySelector('.rate')?.focus({ preventScroll: true });
    }, 120);
  }
}

function onKey(e) {
  if (document.querySelector('.scrim')) return;
  const tag = (e.target?.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

  if (e.key === 'Enter') {
    if (e.repeat) return;
    // Let a focused stage control act natively (option / tile / mic / rating).
    const focused = e.target?.closest?.('button');
    if (focused && !focused.hasAttribute('data-cta')) return;
    e.preventDefault();
    if (S.graded) {
      if (S.ready) advance();
      else nudgeCta();
      return;
    }
    if (S.cta && !S.cta.disabled) check();
    else nudgeCta();
    return;
  }

  if (/^[1-9]$/.test(e.key) && !S.graded) {
    const ex = currentEx();
    if (!ex) return;
    const n = Number(e.key);
    if (ex.type === 'say_it') {
      const wrap = S.stage?.querySelector('[data-rates]');
      if (!wrap || wrap.hidden) return;
      const rate = wrap.querySelectorAll('.rate')[n - 1];
      if (rate) rate.click();
      return;
    }
    if (ex.options && ex.options.length >= n) {
      e.preventDefault();
      S.stage?.querySelector(`[data-opt="${n - 1}"]`)?.click();
    }
  }
}

export default {
  id: 'lesson',
  title: 'Node',
  nav: null,
  hideNav: true,

  render(params = {}) {
    const s = ensureSession(params);

    if (!s) {
      return `<section class="screen lesson lesson--blocked">
        <div class="lesson-blocked">
          <div class="lesson-blocked-art">${ui.icon('lock', 34)}</div>
          <h1 class="h2">That node is still locked</h1>
          <p class="muted mt-2">Finish the one above it first — it takes about 3 minutes.</p>
          <button class="btn btn-primary btn-block mt-6" data-go="home" type="button">Back to Learn</button>
        </div>
      </section>`;
    }

    if (!s.items || !s.items.length) {
      return `<section class="screen lesson lesson--blocked">
        <div class="lesson-blocked">
          <div class="lesson-blocked-art">${ui.mascot(96, 'sleepy')}</div>
          <h1 class="h2">Nothing to run right now</h1>
          <p class="muted mt-2">Learn a couple of sentences first, then reviews will find you.</p>
          <button class="btn btn-primary btn-block mt-6" data-go="home" type="button">Back to Learn</button>
        </div>
      </section>`;
    }

    return shellHtml(s);
  },

  mount(root, params = {}) {
    const s = session();
    if (!s || !s.items?.length) return;

    S.root = root;
    S.stage = root.querySelector('[data-stage]');
    S.cta = root.querySelector('[data-cta]');
    S.banner = root.querySelector('[data-banner]');
    S.segs = root.querySelector('[data-segs]');
    S.xpPill = root.querySelector('[data-xp]');
    S.comboPill = root.querySelector('[data-combo]');

    bindShell(root);
    S.stage?.addEventListener('click', onStageClick);
    S.onKey = onKey;
    document.addEventListener('keydown', S.onKey);

    paint();
  },

  destroy() {
    clearLater();
    clearMatchTimer();
    if (S.onKey) document.removeEventListener('keydown', S.onKey);
    S.onKey = null;
    S.root = null;
    S.stage = null;
    S.cta = null;
    S.banner = null;
    S.segs = null;
    S.xpPill = null;
    S.comboPill = null;
    S.graded = false;
    S.ready = false;
    S.itemStart = 0;
    S.selection = null;
    S.tileOrder = [];
    S.match = null;
  },
};
