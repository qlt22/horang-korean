// S9 · Lesson player — the core loop for the A1 course.
// Renders and grades all 13 task types from core/quiz.js, one item at a time.
import { state, save, startSession, recordAnswer, recordWord, completeNode , markWordSeen } from '../core/store.js';
import { NODES, UNITS } from '../core/engine.js';
import { DIALOGUES } from '../core/course.js';
import * as ui from '../core/ui.js';
import * as audio from '../core/audio.js';
import router from '../core/router.js';
import { gradeAnswer, correctAnswerText } from '../core/quiz.js';
import { nowMs } from '../core/clock.js';

const MIC_SVG = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0"/><path d="M12 18v3"/></svg>`;
const SOUND = (size) => ui.icon('sound', size);
const HANGUL = /[\uac00-\ud7af]/;

// Per-screen mutable UI state (never persisted).
const S = {
  root: null,
  stage: null,
  cta: null,
  banner: null,
  segs: null,
  count: null,
  xpPill: null,
  comboPill: null,
  graded: false,
  ready: false,
  advancing: false,
  finishing: false,
  resumed: false,
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
function cssEscape(v) {
  return String(v).replace(/["\\]/g, '\\$&');
}

function session() {
  return state.session;
}
function currentEx() {
  const s = session();
  if (!s || !s.items) return null;
  return s.items[s.index] || null;
}
function isCheckpoint() {
  return session()?.lessonKind === 'checkpoint';
}
function kindLabel(s) {
  if (!s) return 'Session';
  if (s.kind === 'daily') return 'Daily Run';
  if (s.kind === 'review') return 'Review';
  if (s.kind === 'practice') return 'Practice';
  return `Session ${(s.nodeIndex ?? 0) + 1}`;
}

// ---------- audio helpers (bundled neural clips; never speechSynthesis) ----------
function clipAttrs(kind, id, text, slow = false) {
  if (!id) return '';
  return `data-clip="${ui.esc(id)}" data-clip-kind="${kind}" data-say="${ui.esc(text || '')}"${
    slow ? ' data-slow="1"' : ''
  }`;
}
function taskAudio(ex) {
  if (!ex) return null;
  if (ex.clipId && ex.clipKind) {
    return {
      kind: ex.clipKind,
      id: ex.clipId,
      text: ex.korean || ex.word?.ko || ex.answerText || '',
    };
  }
  if (ex.word?.id) return { kind: 'w', id: ex.word.id, text: ex.word.ko || '' };
  return null;
}
/** Small round speaker that plays the task's own clip. */
function bannerSayBtn(ex) {
  const a = taskAudio(ex);
  if (!a) return '';
  return `<button class="say-btn say-btn--sm" type="button" ${clipAttrs(a.kind, a.id, a.text)} aria-label="Play the Korean">${SOUND(18)}</button>`;
}
/** Two-pill row: replay + (sentences only) slow replay. */
function audioRow({ kind, id, text, normal = true, normalLabel = 'Hear it again', slow = false, center = false }) {
  if (!id) return '';
  return `<div class="audio-row${center ? ' audio-row--center' : ''}">
    ${
      normal
        ? `<button class="audio-pill" type="button" ${clipAttrs(kind, id, text)} aria-label="Play the Korean">${SOUND(
            16
          )}<span>${ui.esc(normalLabel)}</span></button>`
        : ''
    }
    ${
      slow
        ? `<button class="audio-pill audio-pill--slow" type="button" data-slow-play="${ui.esc(
            kind
          )}" data-clip-id="${ui.esc(id)}" data-clip-text="${ui.esc(
            text || ''
          )}" aria-label="Play it slowly"><span class="audio-slow-dot">0.7×</span><span>Slow</span></button>`
        : ''
    }
  </div>`;
}

// ---------- session bootstrapping ----------
function ensureSession(params = {}) {
  const kind = params.kind || 'node';
  const nodeIndex = Math.max(0, Number(params.node ?? 0));
  const s = state.session;
  const gid = params.grammarId || null;
  const matches =
    s &&
    s.kind === kind &&
    (kind !== 'node' || (s.nodeIndex ?? 0) === nodeIndex) &&
    (kind !== 'practice' || (s.targeted?.grammarId || null) === gid) &&
    Array.isArray(s.items);
  if (matches && s.index < s.items.length) return { session: s, resumed: (s.index || 0) > 0 };
  // A finished run left behind (or no run at all): start clean.
  const fresh = startSession(kind, kind === 'node' ? { nodeIndex } : gid ? { grammarId: gid } : {});
  return { session: fresh || null, resumed: false };
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
        <span class="opt-text">${ui.esc(o.label)}</span>
      </button>`
    )
    .join('');
}

function headerInfo(s) {
  const checks = s.lessonKind === 'checkpoint';
  const node = s.kind === 'node' ? NODES[s.nodeIndex ?? 0] : null;
  const unit = node ? UNITS.find((u) => u.id === node.unitId) : null;
  if (node) {
    return {
      checks,
      label: checks
        ? `Checkpoint · ${node.unitTitle}`
        : `Unit ${unit?.order ?? 1} · ${node.koTitle || node.unitTitle}`,
      title: node.title || node.label || '',
      total: s.items.length,
    };
  }
  return {
    checks,
    label: kindLabel(s),
    title: s.kind === 'review' ? 'Sentences that need you' : s.kind === 'daily' ? 'Today’s mix' : 'Practice run',
    total: s.items.length,
  };
}

function shellHtml(s) {
  const h = headerInfo(s);
  return `<section class="screen lesson${h.checks ? ' lesson--checkpoint' : ''}" data-lesson>
    <header class="lesson-top">
      <button class="icon-btn lesson-x" data-leave type="button" aria-label="Leave lesson">
        ${ui.icon('close', 22)}
      </button>
      <div class="lesson-prog">
        <div class="lesson-prog-meta">
          <span class="lesson-prog-label">${ui.esc(h.label)}</span>
          <span class="lesson-prog-sub" data-count>${Math.min(s.index + 1, h.total)} / ${h.total}</span>
        </div>
        <div class="seg-bar lesson-segs" data-segs role="progressbar" aria-label="Item ${
          s.index + 1
        } of ${h.total}">${segsHtml(s)}</div>
      </div>
      <span class="pill pill--amber lesson-xp" data-xp>${ui.icon('bolt', 16)}<b>${ui.fmt(s.xp || 0)}</b></span>
    </header>

    <div class="lesson-crumb">
      <span class="lesson-crumb-title">${ui.esc(h.title)}</span>
      <span class="lesson-crumb-right">
        <span class="combo-pill" data-combo hidden>🔥 ×3</span>
        ${
          h.checks
            ? `<span class="chip chip-coral lesson-pass">${ui.icon('target', 13)}<span>80% to pass</span></span>`
            : ''
        }
      </span>
    </div>

    <div class="lesson-stage" data-stage></div>

    <footer class="lesson-foot">
      <div class="lesson-banner" data-banner hidden></div>
      <button class="btn btn-primary btn-block lesson-cta" data-cta type="button" disabled>
        Check<span class="kbd-hint">Enter ↵</span>
      </button>
    </footer>
  </section>`;
}

// ---------- item bodies ----------
/** Most words have a sentence example; the rest borrow a dialogue line (also clipped). */
function wordExample(ex) {
  const w = ex.word;
  if (!w) return null;
  if (ex.example) {
    return { ko: ex.example.korean, en: ex.example.english, kind: 's', id: ex.example.id };
  }
  for (const d of DIALOGUES) {
    for (const line of d.lines || []) {
      if (line.ko && line.ko.includes(w.ko)) {
        return { ko: line.ko, en: line.en, kind: 'd', id: line.id };
      }
    }
  }
  return null;
}

function wordCardBody(ex) {
  const w = ex.word || {};
  const example = wordExample(ex);
  const rom = w.rom || w.romanization || '';
  const showRom = rom && (state.settings?.romanization || 'auto') !== 'never';
  return `<div class="lesson-item lesson-item--card">
    <div class="lesson-head">
      <p class="lesson-inst">${ui.esc(ex.instruction || 'New word')}</p>
    </div>
    <div class="lesson-body">
      <button class="word-hero" type="button" ${clipAttrs('w', w.id, w.ko)} aria-label="Hear ${ui.esc(
        w.ko
      )}">
        <span class="word-play">${SOUND(15)}<span>Tap to hear</span></span>
        <span class="word-ko" lang="ko">${ui.esc(w.ko || '')}</span>
        ${showRom ? `<span class="word-rom">${ui.esc(rom)}</span>` : ''}
      </button>
      <p class="word-en">${ui.esc(w.en || '')}</p>
      <div class="card-chips">
        <span class="chip chip-coral">${ui.esc(w.pos || 'word')}</span>
        <span class="chip chip-mint">${ui.icon('sparkle', 12)} new word</span>
      </div>
      ${
        example
          ? `<div class="card-example">
              <p class="card-example-label">In a sentence</p>
              <p class="card-example-ko" lang="ko">${ui.esc(example.ko || '')}</p>
              <p class="card-example-en">${ui.esc(example.en || '')}</p>
              ${audioRow({
                kind: example.kind,
                id: example.id,
                text: example.ko,
                normalLabel: 'Hear it',
                slow: example.kind === 's',
              })}
            </div>`
          : ''
      }
    </div>
  </div>`;
}

function grammarCardBody(ex) {
  const g = ex.grammar || {};
  const examples = (g.examples || []).slice(0, 2);
  return `<div class="lesson-item lesson-item--grammar">
    <div class="lesson-head">
      <p class="lesson-inst">Grammar · ${ui.esc(g.label || 'one pattern')}</p>
    </div>
    <div class="lesson-body">
      <div class="grammar-hero">
        <span class="grammar-ko" lang="ko">${ui.esc(g.ko || '')}</span>
        <h2 class="grammar-pattern">${ui.esc(g.pattern || ex.prompt || '')}</h2>
      </div>
      ${g.explanation ? `<p class="grammar-expl">${ui.esc(g.explanation)}</p>` : ''}
      <div class="grammar-examples">
        ${examples
          .map(
            (e, i) => `<div class="grammar-ex">
              <div class="grammar-ex-text">
                <p class="grammar-ex-ko" lang="ko">${ui.esc(e.ko || '')}</p>
                <p class="grammar-ex-en">${ui.esc(e.en || '')}</p>
              </div>
              <button class="say-btn say-btn--sm" type="button" ${clipAttrs(
                'g',
                g.id ? `${g.id}_${i + 1}` : '',
                e.ko
              )} aria-label="Play the example">${SOUND(18)}</button>
            </div>`
          )
          .join('')}
      </div>
      ${
        g.mistake
          ? `<div class="grammar-mistake">
              <span class="gm-ico">${ui.icon('info', 16)}</span>
              <div><b>Common mistake</b><p>${ui.esc(g.mistake)}</p></div>
            </div>`
          : ''
      }
    </div>
  </div>`;
}

function listenBody(ex) {
  return `<div class="lesson-item">
    <div class="lesson-head">
      <p class="lesson-inst">${ui.esc(ex.instruction || 'Listen, then choose the meaning')}</p>
      <h2 class="lesson-prompt">${ui.esc(ex.prompt || 'What does this mean?')}</h2>
    </div>
    <div class="lesson-body">
      <div class="listen-hero">
        <button class="listen-ring" type="button" ${clipAttrs('s', ex.clipId, ex.korean)} aria-label="Play the sentence">
          ${SOUND(38)}
        </button>
        ${audioRow({
          kind: 's',
          id: ex.clipId,
          text: ex.korean,
          normalLabel: 'Hear it again',
          slow: true,
          center: true,
        })}
      </div>
      <div class="opts opts--lesson" data-opts>${optsHtml(ex.options)}</div>
    </div>
  </div>`;
}

function inputBody(ex) {
  const checks = isCheckpoint();
  const dictation = ex.type === 'dictation';
  return `<div class="lesson-item lesson-item--type${dictation ? ' lesson-item--dictation' : ''}">
    <div class="lesson-head">
      <p class="lesson-inst">${ui.esc(ex.instruction || 'Write it in Korean')}</p>
      <h2 class="lesson-prompt${dictation ? '' : ' lesson-prompt--en'}">${ui.esc(
        ex.prompt || (dictation ? 'Type what you hear' : '')
      )}</h2>
    </div>
    <div class="lesson-body">
      ${
        dictation
          ? `<div class="dictation-hero">
              <button class="listen-ring" type="button" ${clipAttrs(
                's',
                ex.clipId,
                ex.answerText
              )} aria-label="Play the audio">${SOUND(38)}</button>
              ${audioRow({
                kind: 's',
                id: ex.clipId,
                text: ex.answerText,
                normal: false,
                slow: true,
                center: true,
              })}
              <p class="dictation-note">Audio only — the Korean stays hidden.</p>
            </div>`
          : ''
      }
      ${
        !dictation && !checks && ex.hint
          ? `<p class="type-hint">Starts with <b lang="ko">${ui.esc(ex.hint)}</b></p>`
          : ''
      }
      <div class="input-wrap">
        <input class="lesson-input" data-input type="text" lang="ko" autocomplete="off"
          autocapitalize="off" autocorrect="off" spellcheck="false"
          placeholder="Type in Korean…" aria-label="Type the Korean sentence" />
      </div>
      ${
        dictation
          ? ''
          : `<p class="lesson-footnote">${
              checks ? 'No hints in a checkpoint.' : 'Spelling counts — a near miss still passes.'
            }</p>`
      }
    </div>
  </div>`;
}

function fillBlankBody(ex) {
  const b = ex.blank || { before: '', after: '', answer: '' };
  const checks = isCheckpoint();
  return `<div class="lesson-item">
    <div class="lesson-head">
      <p class="lesson-inst">${ui.esc(ex.instruction || 'Pick the missing word')}</p>
      <h2 class="lesson-prompt">${ui.esc(ex.prompt || 'Which one fits?')}</h2>
    </div>
    <div class="lesson-body">
      <div class="cloze" data-cloze>
        ${b.before ? `<span class="cloze-word" lang="ko">${ui.esc(b.before)}</span>` : ''}
        <span class="cloze-blank" data-blank>_____</span>
        ${b.after ? `<span class="cloze-word" lang="ko">${ui.esc(b.after)}</span>` : ''}
      </div>
      ${!checks && ex.english ? `<p class="cloze-en">${ui.esc(ex.english)}</p>` : ''}
      <div class="opts opts--2" data-opts>${optsHtml(ex.options)}</div>
    </div>
  </div>`;
}

function tileBody(ex) {
  return `<div class="lesson-item">
    <div class="lesson-head">
      <p class="lesson-inst">${ui.esc(ex.instruction || 'Tap the words in order')}</p>
      <h2 class="lesson-prompt lesson-prompt--en">${ui.esc(ex.prompt || '')}</h2>
    </div>
    <div class="lesson-body">
      <div class="tile-zone lesson-zone" data-zone>
        <span class="zone-hint">Tap the words below</span>
      </div>
      <div class="tiles lesson-bank" data-bank>
        ${(ex.tiles || [])
          .map(
            (t, i) =>
              `<button class="tile" data-tile-idx="${i}" type="button" lang="ko">${ui.esc(t)}</button>`
          )
          .join('')}
      </div>
      <p class="lesson-answer-line" data-answer-line hidden></p>
    </div>
  </div>`;
}

function bubbleHtml(line, checks) {
  const side = line.speaker === 'B' ? 'b' : 'a';
  return `<div class="bubble bubble--${side}">
    <div class="bubble-main">
      <p class="bubble-ko" lang="ko">${ui.esc(line.ko || '')}</p>
      ${!checks && line.en ? `<p class="bubble-en">${ui.esc(line.en)}</p>` : ''}
    </div>
    <button class="bubble-play" type="button" ${clipAttrs(
      'd',
      line.id,
      line.ko
    )} aria-label="Play the line">${SOUND(15)}</button>
  </div>`;
}

function dialogueBody(ex) {
  const checks = isCheckpoint();
  return `<div class="lesson-item lesson-item--dialogue">
    <div class="lesson-head">
      <p class="lesson-inst">${ui.esc(ex.instruction || 'The other person replies')}</p>
      <h2 class="lesson-prompt">${ui.esc(ex.prompt || 'What comes next?')}</h2>
    </div>
    <div class="lesson-body">
      <div class="chat" aria-label="Conversation so far">
        ${(ex.context || []).map((l) => bubbleHtml(l, checks)).join('')}
      </div>
      <div class="opts opts--lesson" data-opts>${optsHtml(ex.options)}</div>
    </div>
  </div>`;
}

function readingBody(ex) {
  const r = ex.reading || {};
  const checks = isCheckpoint();
  return `<div class="lesson-item lesson-item--reading">
    <div class="lesson-body">
      <article class="reading-card" data-reading-card>
        <button class="reading-head" data-reading-toggle type="button" aria-expanded="true">
          <span class="reading-overline">${ui.icon('book', 14)}<span>Passage · ${ui.esc(
            r.title || ''
          )}</span></span>
          <span class="reading-chev">${ui.icon('chevron', 16)}</span>
        </button>
        <div class="reading-body" data-reading-body>
          <p class="reading-ko" lang="ko">${ui.esc(r.ko || '')}</p>
          ${
            checks
              ? ''
              : `<button class="reading-en-toggle" data-reading-en type="button" aria-pressed="false">
                  Show English
                </button>
                <p class="reading-en" data-reading-en-text hidden>${ui.esc(r.en || '')}</p>`
          }
        </div>
      </article>
      <h2 class="lesson-prompt">${ui.esc(ex.prompt || '')}</h2>
      <div class="opts opts--lesson" data-opts>${optsHtml(ex.options)}</div>
      <p class="reading-why" data-reading-why hidden></p>
    </div>
  </div>`;
}

function sayBody(ex) {
  const checks = isCheckpoint();
  const long = String(ex.korean || ex.prompt || '').length > 18;
  const showRom =
    !!ex.romanization && (state.settings?.romanization || 'auto') !== 'never' && romanUnlocked(ex);
  const gloss = checks ? [] : (ex.gloss || []).filter((g) => g && g.ko && g.en).slice(0, long ? 4 : 6);
  const a = taskAudio(ex);
  return `<div class="lesson-item lesson-item--say">
    <p class="lesson-inst center">${ui.esc(ex.instruction || 'Tap the speaker, then repeat it')}</p>
    <div class="say-card${long ? ' say-card--long' : ''}">
      <h2 class="say-ko" lang="ko">${ui.esc(ex.korean || ex.prompt || '')}</h2>
      ${showRom ? `<p class="say-rom">${ui.esc(ex.romanization)}</p>` : ''}
      <p class="say-en">${ui.esc(ex.english || '')}</p>
      ${
        gloss.length
          ? `<div class="say-gloss" aria-label="Word by word">${gloss
              .map((g) => `<span><b lang="ko">${ui.esc(g.ko)}</b>${ui.esc(g.en)}</span>`)
              .join('')}</div>`
          : ''
      }
      <div class="say-actions">
        ${
          a
            ? `<button class="say-btn" type="button" ${clipAttrs(
                a.kind,
                a.id,
                a.text
              )} aria-label="Hear the sentence">${SOUND(26)}</button>`
            : `<button class="say-btn" type="button" data-play-task aria-label="Hear the sentence">${SOUND(
                26
              )}</button>`
        }
        <button class="mic-btn" data-mic type="button">${MIC_SVG}<span>Say it</span></button>
      </div>
      ${audioRow({
        kind: a?.kind || 's',
        id: a?.id || '',
        text: a?.text || ex.korean,
        normal: false,
        slow: !!a && a.kind === 's',
        center: true,
      })}
    </div>
    <div class="say-rates is-in" data-rates>
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

function matchBody(ex) {
  const M = S.match;
  const left = M ? M.left : Number(ex.seconds) || 45;
  const pairs = ex.pairs || [];
  return `<div class="lesson-item lesson-item--match">
    <div class="match-head">
      <span class="match-timer" data-timer>${ui.icon('clock', 16)} ${mmss(left)}</span>
      <span class="match-count" data-match-count>0 / ${pairs.length}</span>
    </div>
    <p class="lesson-inst center" data-match-inst>Tap one from each side</p>
    <div class="lesson-body">
      <div class="match-grid">
        <div class="match-col" data-col="ko">${(M ? M.ko : pairs)
          .map(
            (p) =>
              `<button class="match-chip match-chip--ko" data-ko="${ui.esc(p.id)}" type="button" lang="ko">${ui.esc(
                p.ko
              )}</button>`
          )
          .join('')}</div>
        <div class="match-col" data-col="en">${(M ? M.en : pairs)
          .map(
            (p) =>
              `<button class="match-chip match-chip--en" data-en="${ui.esc(p.id)}" type="button">${ui.esc(
                p.en
              )}</button>`
          )
          .join('')}</div>
      </div>
      <p class="match-slips" data-slips hidden></p>
      <p class="lesson-footnote center" data-match-foot>Matched pairs lock in mint. Slips are forgiven once.</p>
    </div>
  </div>`;
}

function bodyFor(ex) {
  if (!ex) return '';
  switch (ex.type) {
    case 'word_card':
      return wordCardBody(ex);
    case 'grammar_card':
      return grammarCardBody(ex);
    case 'listen_pick':
      return listenBody(ex);
    case 'translate_pick':
      return `<div class="lesson-item">
        <div class="lesson-head">
          <p class="lesson-inst">${ui.esc(ex.instruction || 'Choose the Korean')}</p>
          <h2 class="lesson-prompt lesson-prompt--en">${ui.esc(ex.prompt)}</h2>
        </div>
        <div class="lesson-body">
          <div class="opts opts--lesson" data-opts>${optsHtml(ex.options)}</div>
          <p class="lesson-footnote">One option is the exact sentence.</p>
        </div>
      </div>`;
    case 'fill_blank':
      return fillBlankBody(ex);
    case 'tile_build':
      return tileBody(ex);
    case 'type_answer':
    case 'dictation':
      return inputBody(ex);
    case 'dialogue_reply':
      return dialogueBody(ex);
    case 'reading_q':
      return readingBody(ex);
    case 'word_pick':
      return `<div class="lesson-item">
        <div class="lesson-head">
          <p class="lesson-inst">${ui.esc(ex.instruction || 'Choose the Korean word')}</p>
          <h2 class="lesson-prompt lesson-prompt--en">${ui.esc(ex.prompt)}</h2>
        </div>
        <div class="lesson-body">
          <div class="opts opts--lesson" data-opts>${optsHtml(ex.options)}</div>
          <p class="lesson-footnote">${ui.esc(ex.word?.pos || 'word')} · one right answer</p>
        </div>
      </div>`;
    case 'word_match':
      return matchBody(ex);
    case 'say_it':
      return sayBody(ex);
    default:
      return `<div class="lesson-item"><div class="empty-note">Unsupported task: ${ui.esc(ex.type)}</div></div>`;
  }
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
  const total = s.items.length;
  S.segs.setAttribute('aria-label', `Item ${Math.min(s.index + 1, total)} of ${total}`);
  if (S.count) S.count.textContent = `${Math.min(s.index + 1, total)} / ${total}`;
}
function markSegmentDone() {
  const s = session();
  if (!s || !S.segs) return;
  const el = S.segs.querySelectorAll('[data-seg]')[s.index];
  if (el) {
    el.classList.remove('now');
    el.classList.add('done', 'seg-pop');
  }
}

function resetFooter(ex) {
  if (!S.banner || !S.cta) return;
  S.banner.hidden = true;
  S.banner.className = 'lesson-banner';
  S.banner.innerHTML = '';
  S.cta.className = 'btn btn-primary btn-block lesson-cta';
  S.cta.disabled = true;
  if (ex?.ungraded) {
    S.cta.disabled = false;
    S.cta.innerHTML = `Got it ${ui.icon('arrow', 20)}<span class="kbd-hint">Enter ↵</span>`;
    return;
  }
  S.cta.innerHTML = 'Check<span class="kbd-hint">Enter ↵</span>';
  if (ex?.type === 'word_match') S.cta.classList.add('is-hidden');
}

function setCtaEnabled(on, focus = false) {
  if (!S.cta) return;
  S.cta.disabled = !on;
  if (on && focus) {
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
  S.advancing = false;
  S.selection = null;
  S.tileOrder = [];
  S.match = null;

  const s = session();
  const ex = currentEx();
  if (!s || !ex) {
    S.stage.innerHTML = `<div class="empty-note">Nothing left in this run.</div>`;
    return;
  }

  if (ex.type === 'word_match') {
    const pairs = ex.pairs || [];
    const ko = shuffle(pairs);
    let en = shuffle(pairs);
    if (en.map((p) => p.id).join('|') === ko.map((p) => p.id).join('|') && en.length > 1) {
      en = shuffle(pairs);
    }
    S.match = {
      ko,
      en,
      selKo: null,
      selEn: null,
      matched: new Set(),
      recorded: new Set(),
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
  try {
    S.cta.blur();
  } catch {
    /* ignore */
  }

  // Bundled neural audio, never speechSynthesis.
  if (ex.type === 'listen_pick' || ex.type === 'dictation') {
    later(() => audio.playTask(ex), 280);
  } else if (ex.type === 'word_card') {
    later(() => audio.playTask({ ...ex, korean: ex.word?.ko || '' }), 320);
  }

  if (ex.type === 'word_match') startMatchClock(ex);

  if (ex.input) {
    later(() => {
      const input = S.stage?.querySelector('[data-input]');
      if (!input) return;
      input.value = '';
      const desktop = window.matchMedia?.('(min-width: 900px)')?.matches;
      if (desktop) {
        try {
          input.focus({ preventScroll: true });
        } catch {
          /* focus is a nicety */
        }
      }
    }, 120);
  }
}

// ---------- answering ----------
function currentValue(ex) {
  if (!ex) return null;
  if (ex.type === 'tile_build') return S.tileOrder.map((i) => ex.tiles[i]);
  if (ex.input) return String(S.stage?.querySelector('[data-input]')?.value || '').trim();
  return S.selection;
}

function check() {
  const ex = currentEx();
  if (!ex || S.graded) return;
  if (ex.ungraded) {
    advance();
    return;
  }
  if (ex.type === 'word_match') return;
  if (ex.type === 'say_it') {
    const label = { again: 'Again', good: 'Good', nailed: 'Nailed it' }[S.selection] || 'Said it';
    applyGrade(true, ex, { ratingLabel: label });
    return;
  }
  const value = currentValue(ex);
  if (ex.input && !value) {
    nudgeCta();
    return;
  }
  if (!ex.input && (value === null || value === undefined)) {
    nudgeCta();
    return;
  }
  const g = gradeAnswer(ex, value);
  applyGrade(!!g.correct, ex, { near: !!g.near });
}

function applyGrade(correct, ex, opts = {}) {
  if (S.graded) return;
  S.graded = true;
  clearMatchTimer();

  const s = session();
  if (!s) return;
  const ms = Math.max(400, Math.round(nowMs() - (S.itemStart || nowMs())));
  const beforeXp = s.xp || 0;
  const levelBefore = state.level;

  // One store call per graded item. Core owns mastery, crit, combo, XP, quests.
  const res = recordAnswer({
    sentenceId: ex.sentenceId || null,
    wordId: ex.wordId || null,
    type: ex.type,
    correct,
    ms,
  });

  // The store accumulates session XP only on the word/dialogue branch; mirror it
  // for sentence tasks so the pill and the receipt agree.
  if (res?.xp && ex.sentenceId) s.xp = beforeXp + res.xp;
  save();

  paintXp(true);
  paintCombo(correct);
  markSegmentDone();
  reveal(correct, ex, res, opts);

  if (correct) {
    audio.sfx('correct');
    if (res?.crit) {
      audio.sfx('crit');
      ui.confetti({ count: 12 });
    }
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

  later(() => swapToContinue(), opts.near ? 1100 : correct ? 780 : 1050);
}

function reveal(correct, ex, res, opts = {}) {
  const stage = S.stage;
  if (!stage) return;

  if (ex.type === 'tile_build') {
    const zone = stage.querySelector('[data-zone]');
    const line = stage.querySelector('[data-answer-line]');
    if (zone) zone.classList.add(correct ? 'is-correct' : 'is-wrong');
    if (!correct && line) {
      line.hidden = false;
      line.innerHTML = `Correct order: <b lang="ko">${ui.esc(ex.answer.join(' '))}</b> ${bannerSayBtn(ex)}`;
    }
  } else if (ex.type === 'fill_blank') {
    const blank = stage.querySelector('[data-blank]');
    if (blank) {
      blank.textContent = ex.blank?.answer || correctAnswerText(ex);
      blank.classList.add(correct ? 'is-correct' : 'is-wrong');
    }
    highlightOptions(stage, ex);
  } else if (ex.type === 'word_match') {
    revealMatch(correct, ex, opts);
  } else if (ex.type === 'reading_q') {
    highlightOptions(stage, ex);
    const why = stage.querySelector('[data-reading-why]');
    if (why && ex.why) {
      why.hidden = false;
      why.innerHTML = `${ui.icon(correct ? 'check' : 'info', 15)}<span>${ui.esc(ex.why)}</span>`;
      why.classList.add(correct ? 'is-good' : 'is-bad');
    }
    const card = stage.querySelector('.reading-card');
    if (card) {
      card.classList.add('is-collapsed');
      card.querySelector('[data-reading-toggle]')?.setAttribute('aria-expanded', 'false');
    }
  } else if (ex.type === 'say_it') {
    stage.querySelectorAll('.rate:not(.is-selected)').forEach((b) => b.classList.add('is-locked'));
  } else if (ex.input) {
    revealInput(correct, ex, opts);
  } else if (ex.type === 'dialogue_reply') {
    highlightOptions(stage, ex);
  } else {
    highlightOptions(stage, ex);
  }

  bannerFor(correct, ex, res, opts);

  if (!correct && (ex.type === 'dictation' || ex.type === 'listen_pick')) {
    later(() => audio.playTask(ex), 420);
  }
}

function revealMatch(correct, ex, opts) {
  const stage = S.stage;
  const M = S.match;
  if (!stage || !M) return;
  stage.querySelectorAll('.match-chip').forEach((c) => {
    if (!c.classList.contains('is-matched')) c.classList.add('is-dim');
    c.disabled = true;
  });
  // The footer banner carries the summary once the item is graded.
  const slips = stage.querySelector('[data-slips]');
  if (slips) slips.hidden = true;
  const inst = stage.querySelector('[data-match-inst]');
  if (inst) inst.textContent = opts.timedOut ? 'Time — here’s where you got to' : 'All five matched';
  const foot = stage.querySelector('[data-match-foot]');
  if (foot) foot.hidden = true;
}

function revealInput(correct, ex, opts) {
  const stage = S.stage;
  if (!stage) return;
  const input = stage.querySelector('[data-input]');
  if (input) {
    input.disabled = true;
    input.classList.add(correct ? 'is-correct' : 'is-wrong');
  }
}

function highlightOptions(stage, ex) {
  const chosen = S.selection;
  stage.querySelectorAll('.opt').forEach((node) => {
    const o = (ex.options || [])[Number(node.dataset.opt)];
    if (!o) return;
    const value = ex.type === 'fill_blank' ? o.label : o.id;
    if (o.correct) node.classList.add('is-correct');
    else if (value === chosen) node.classList.add('is-wrong');
    else node.classList.add('is-dim');
    node.disabled = true;
  });
}

function bannerFor(correct, ex, res, opts = {}) {
  if (!S.banner) return;
  S.banner.className = 'lesson-banner';
  const xp = res?.xp || 0;
  const audioBtn = bannerSayBtn(ex);

  if (correct) {
    const crit = !!res?.crit;
    let title = crit ? `CRIT ×2 · +${xp} XP` : `Nice! +${xp} XP`;
    let sub = '';
    if (opts.near) {
      title = 'Almost — watch the spelling';
      sub = `<span lang="ko">${ui.esc(ex.answerText || '')}</span>`;
      S.banner.className = 'lesson-banner lesson-banner--near is-up';
    }
    switch (ex.type) {
      case 'say_it':
        sub = opts.ratingLabel ? `Rated “${ui.esc(opts.ratingLabel)}” — that counts.` : 'Said out loud — that counts.';
        break;
      case 'listen_pick':
        sub = `<span lang="ko">${ui.esc(ex.korean)}</span>`;
        break;
      case 'translate_pick':
        sub = ex.english ? ui.esc(ex.english) : '';
        break;
      case 'dialogue_reply':
        sub = ui.esc(ex.english || '');
        break;
      case 'word_pick':
        sub = ex.word ? `<span lang="ko">${ui.esc(ex.word.ko)}</span> · ${ui.esc(ex.word.en)}` : '';
        break;
      case 'reading_q':
        sub = 'Reading check cleared.';
        break;
      case 'dictation':
      case 'type_answer':
        sub = opts.near ? sub : 'Exact — well spelled.';
        break;
      case 'word_match': {
        const M = S.match;
        const total = (ex.pairs || []).length;
        sub = `${M ? M.matched.size : total} of ${total} matched · ${
          M ? M.mistakes : 0
        } slip${M && M.mistakes === 1 ? '' : 's'}`;
        break;
      }
      default:
        break;
    }
    if (!opts.near) S.banner.className = 'lesson-banner lesson-banner--good is-up';
    S.banner.innerHTML = `<span class="lb-ico">${ui.icon(
      crit ? 'sparkle' : 'check',
      20
    )}</span><div class="lb-text"><b>${title}</b>${sub ? `<span class="lb-sub">${sub}</span>` : ''}</div>`;
    S.banner.hidden = false;
    if (xp) xpFloat(xp, crit);
    return;
  }

  // Word match has no single correct string to reveal — summarise instead.
  if (ex.type === 'word_match') {
    const M = S.match;
    const total = (ex.pairs || []).length;
    const matched = M ? M.matched.size : 0;
    const slips = M ? M.mistakes : 0;
    S.banner.className = 'lesson-banner lesson-banner--bad is-up';
    S.banner.innerHTML = `<span class="lb-ico">${ui.icon('info', 20)}</span>
      <div class="lb-text"><b>${opts.timedOut ? 'Time’s up.' : 'Not quite.'}</b>
      <span class="lb-sub">${matched} of ${total} matched · ${slips} slip${slips === 1 ? '' : 's'}</span></div>`;
    S.banner.hidden = false;
    return;
  }

  const answer = (correctAnswerText(ex) || ex.korean || '').replace(/[.!?]+$/, '');
  const ko = HANGUL.test(answer);
  let sub = '';
  if (ex.type === 'dialogue_reply' && ex.english) sub = ui.esc(ex.english);
  else if (ex.type === 'reading_q' && ex.why) sub = ui.esc(ex.why);
  else if (ex.type === 'word_match') {
    const M = S.match;
    const total = (ex.pairs || []).length;
    sub = `${M ? M.matched.size : 0} of ${total} matched · ${M ? M.mistakes : 0} slip${
      M && M.mistakes === 1 ? '' : 's'
    }`;
  } else if (ex.type === 'dictation') sub = 'Listen once more — then try it again.';
  else if (ex.type === 'fill_blank' && ex.blank) {
    sub = ui.esc([ex.blank.before, ex.blank.answer, ex.blank.after].filter(Boolean).join(' '));
  } else if (ex.grammarTag) sub = ui.esc(ex.grammarTag);

  S.banner.className = 'lesson-banner lesson-banner--bad is-up';
  S.banner.innerHTML = `<span class="lb-ico">${ui.icon('info', 20)}</span>
    <div class="lb-text"><b>It’s <span${ko ? ' lang="ko"' : ''}>${ui.esc(answer)}</span>.</b>${
      sub ? `<span class="lb-sub">${sub}</span>` : ''
    }</div>
    ${audioBtn}`;
  S.banner.hidden = false;
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
  if (!S.cta || S.advancing) return;
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
  if (!s || S.advancing) return;
  const ex = currentEx();
  if (!S.graded && !ex?.ungraded) return;
  S.advancing = true;
  if (ex?.type === 'word_card' && ex.wordId) markWordSeen(ex.wordId);
  markSegmentDone();
  s.index += 1;
  save();
  if (s.index < s.items.length) paint();
  else finish();
}

function finish() {
  const s = session();
  if (!s || S.finishing) return;
  S.finishing = true;
  const kind = s.kind;
  const nodeIndex = s.nodeIndex ?? 0;
  audio.stopSpeaking();
  // Awards bonus XP, fills the chest slot, updates streak + quests, sets lastSummary.
  completeNode();
  router.go('complete', kind === 'node' ? { node: nodeIndex } : { kind });
}

// ---------- word_match ----------
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
    if (S.match.left <= 0) finishMatch(ex, true);
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
      slips.classList.toggle('is-bad', M.mistakes > 1);
      slips.textContent = `${M.mistakes} slip${M.mistakes > 1 ? 's' : ''} — ${
        M.mistakes <= 1 ? 'still clean enough.' : 'slow down and match the pairs.'
      }`;
    } else {
      slips.hidden = true;
      slips.classList.remove('is-bad');
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

  const pair = (ex.pairs || []).find((p) => p.id === M.selKo);
  if (M.selKo === M.selEn) {
    M.matched.add(M.selKo);
    if (!M.recorded.has(M.selKo)) {
      M.recorded.add(M.selKo);
      recordWord(M.selKo, true);
    }
    S.stage
      .querySelectorAll(`[data-ko="${cssEscape(M.selKo)}"], [data-en="${cssEscape(M.selKo)}"]`)
      .forEach((c) => {
        c.classList.remove('is-selected');
        c.classList.add('is-matched');
        c.disabled = true;
      });
    M.selKo = null;
    M.selEn = null;
    updateMatchUi();
    audio.sfx('coin');
    if (pair) {
      audio.playTask({ type: 'word_pick', clipKind: 'w', clipId: pair.clipId, korean: pair.ko });
    }
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
  // Every pair gets one word-mastery call, even the ones time ran out on.
  (ex.pairs || []).forEach((p) => {
    if (M.recorded.has(p.id)) return;
    M.recorded.add(p.id);
    recordWord(p.id, false);
  });
  const clear = M.matched.size === M.ko.length;
  const correct = M.mistakes <= 1 && clear;
  applyGrade(correct, ex, { timedOut });
}

// ---------- shell events ----------
function bindShell(root) {
  root.querySelector('[data-leave]')?.addEventListener('click', openLeaveSheet);
  S.cta?.addEventListener('click', () => {
    const ex = currentEx();
    if (S.graded) {
      if (S.ready) advance();
      else nudgeCta();
      return;
    }
    if (ex?.ungraded) {
      advance();
      return;
    }
    if (S.cta?.disabled) {
      nudgeCta();
      return;
    }
    check();
  });
}

function openLeaveSheet() {
  if (document.querySelector('.scrim')) return;
  const s = session();
  const done = s ? Math.min(s.index + (S.graded ? 1 : 0), s.items.length) : 0;
  audio.sfx('tap');
  ui.sheet({
    title: 'Leave this session?',
    body: `<p class="center muted">${
      done && s ? `${done} of ${s.items.length} done. ` : ''
    }Your answers are saved — you can pick up right here.</p>`,
    actions: [
      { label: 'Keep going', cls: 'btn-primary' },
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
}

function nudgeCta() {
  if (!S.cta) return;
  S.cta.classList.remove('is-nudge');
  void S.cta.offsetWidth;
  S.cta.classList.add('is-nudge');
}

function onStageInput(e) {
  if (!e.target?.matches?.('[data-input]')) return;
  if (S.graded) return;
  setCtaEnabled(String(e.target.value || '').trim().length > 0, false);
}

function onStageClick(e) {
  const stage = S.stage;
  if (!stage) return;
  const ex = currentEx();
  if (!ex) return;

  const opt = e.target.closest('[data-opt]');
  if (opt && !S.graded && ex.options) {
    const o = ex.options[Number(opt.dataset.opt)];
    if (!o) return;
    S.selection = ex.type === 'fill_blank' ? o.label : o.id;
    stage.querySelectorAll('.opt').forEach((n) => n.classList.remove('is-selected'));
    opt.classList.add('is-selected');
    setCtaEnabled(true);
    return;
  }

  const tile = e.target.closest('[data-tile-idx]');
  if (tile && !S.graded && ex.type === 'tile_build') {
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

  const readingToggle = e.target.closest('[data-reading-toggle]');
  if (readingToggle) {
    const card = stage.querySelector('[data-reading-card]');
    const collapsed = card?.classList.toggle('is-collapsed');
    readingToggle.setAttribute('aria-expanded', String(!collapsed));
    return;
  }

  const readingEn = e.target.closest('[data-reading-en]');
  if (readingEn) {
    const body = stage.querySelector('[data-reading-en-text]');
    if (!body) return;
    const on = body.hidden;
    body.hidden = !on;
    readingEn.setAttribute('aria-pressed', String(on));
    readingEn.textContent = on ? 'Hide English' : 'Show English';
    return;
  }

  const playTaskBtn = e.target.closest('[data-play-task]');
  if (playTaskBtn) {
    audio.playTask(currentEx(), { slow: playTaskBtn.dataset.slow === '1' });
    return;
  }

  const slowBtn = e.target.closest('[data-slow-play]');
  if (slowBtn) {
    const kind = slowBtn.dataset.slowPlay || 's';
    const id = slowBtn.dataset.clipId;
    const text = slowBtn.dataset.clipText || '';
    // Slow sentence replays use the dedicated -slow clip (rate −18 %).
    if (kind === 's' && id) audio.playClip('s-slow', id, { fallbackText: text });
    else if (id) audio.playClip(kind, id, { fallbackText: text });
    return;
  }

  const mic = e.target.closest('[data-mic]');
  if (mic && ex.type === 'say_it' && !S.graded) {
    requestMic(mic);
    return;
  }

  const rate = e.target.closest('[data-rate]');
  if (rate && ex.type === 'say_it' && !S.graded) {
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
  if (en) onChip('en', en.dataset.en, en);
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
  setTimeout(() => btn.classList.remove('is-listening'), 1400);
}

function onKey(e) {
  if (document.querySelector('.scrim')) return;
  const tag = (e.target?.tagName || '').toLowerCase();
  const typing = tag === 'input' || tag === 'textarea' || tag === 'select';

  if (e.key === 'Escape') {
    e.preventDefault();
    openLeaveSheet();
    return;
  }

  if (e.key === 'Enter') {
    if (e.repeat) return;
    if (typing) {
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
    // Let a focused audio button act natively.
    const focused = e.target?.closest?.('button,[data-clip]');
    if (focused && (focused.hasAttribute('data-clip') || focused.hasAttribute('data-play-task'))) return;
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

  if (/^[1-9]$/.test(e.key) && !S.graded && !typing) {
    const ex = currentEx();
    if (!ex) return;
    const n = Number(e.key);
    if (ex.type === 'say_it') {
      const rate = S.stage?.querySelectorAll('.rate')[n - 1];
      if (rate) rate.click();
      return;
    }
    if (ex.type === 'word_match') return;
    if (ex.options && ex.options.length >= n) {
      e.preventDefault();
      S.stage?.querySelector(`[data-opt="${n - 1}"]`)?.click();
    }
  }
}

function romanUnlocked(ex) {
  const mode = state.settings?.romanization || 'auto';
  if (mode === 'never') return false;
  if (mode === 'always') return true;
  if (!ex?.sentenceId) return true;
  return (state.mastery?.[ex.sentenceId]?.tier || 0) < 3;
}

export default {
  id: 'lesson',
  title: 'Session',
  nav: null,
  hideNav: true,

  render(params = {}) {
    const boot = ensureSession(params);
    S.resumed = boot.resumed;
    const s = boot.session;

    if (!s) {
      return `<section class="screen lesson lesson--blocked">
        <div class="lesson-blocked">
          <div class="lesson-blocked-art">${ui.icon('lock', 34)}</div>
          <h1 class="h2">That session is still locked</h1>
          <p class="muted mt-2">Finish the session above it first — it takes about 5 minutes.</p>
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

  mount(root) {
    const s = session();
    if (!s || !s.items?.length) return;

    S.root = root;
    S.stage = root.querySelector('[data-stage]');
    S.cta = root.querySelector('[data-cta]');
    S.banner = root.querySelector('[data-banner]');
    S.segs = root.querySelector('[data-segs]');
    S.count = root.querySelector('[data-count]');
    S.xpPill = root.querySelector('[data-xp]');
    S.comboPill = root.querySelector('[data-combo]');
    S.finishing = false;

    bindShell(root);
    S.stage?.addEventListener('click', onStageClick);
    S.stage?.addEventListener('input', onStageInput);
    S.onKey = onKey;
    document.addEventListener('keydown', S.onKey);

    paint();
    if (S.resumed) {
      S.resumed = false;
      later(
        () => ui.toast(`Picked up at item ${Math.min(s.index + 1, s.items.length)}`, { icon: 'refresh', tone: 'mint' }),
        320
      );
    }
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
    S.count = null;
    S.xpPill = null;
    S.comboPill = null;
    S.graded = false;
    S.ready = false;
    S.advancing = false;
    S.finishing = false;
    S.itemStart = 0;
    S.selection = null;
    S.tileOrder = [];
    S.match = null;
  },
};
