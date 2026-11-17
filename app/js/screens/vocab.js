// W4 · Words — due-word review, flashcards and the full 576-word browser.
// All state is read live from core/store.js; audio is bundled clips only.
import {
  state,
  dueWords,
  knownWordCount,
  recordAnswer,
  recordWord,
} from '../core/store.js';
import * as ui from '../core/ui.js';
import * as audio from '../core/audio.js';
import { router } from '../core/router.js';
import {
  WORDS,
  WORD_BY_ID,
  SENTENCES,
  UNITS,
  UNIT_BY_ID,
  LESSON_BY_ID,
  wordsOf,
  lessonAt,
  nextLessonIndex,
} from '../core/course.js';
import { buildTask, gradeAnswer } from '../core/quiz.js';

const REVIEW_SIZE = 10;
const PAGE_SIZE = 30;

let mode = 'home'; // home | review | flash
let rootEl = null;
let review = null;
let flash = null;
let sheetClose = null;
const browse = { q: '', unit: 'all', limit: PAGE_SIZE };

// ---------- small helpers ----------
function dueList() {
  return dueWords().filter((x) => x.word);
}

function dueCount() {
  return dueList().length;
}

function learningCount() {
  return Object.values(state.wordMastery || {}).filter((w) => w.tier >= 1 && w.tier < 3).length;
}

function currentUnitId() {
  const idx = nextLessonIndex(state.path?.completedNodes || []);
  return lessonAt(idx)?.unitId || UNITS[0].id;
}

function wordClip(w, cls = 'say-btn say-btn--sm', size = 18) {
  return `<button class="${cls}" data-clip="${ui.esc(w.id)}" data-clip-kind="w" data-say="${ui.esc(
    w.ko
  )}" type="button" aria-label="Play ${ui.esc(w.ko)}">${ui.icon('sound', size)}</button>`;
}

function sentenceClip(s, cls = 'say-btn say-btn--sm', size = 18) {
  return `<button class="${cls}" data-clip="${ui.esc(s.id)}" data-clip-kind="s" data-say="${ui.esc(
    s.korean
  )}" type="button" aria-label="Play the example sentence">${ui.icon('sound', size)}</button>`;
}

function pipsFor(wordId) {
  return ui.pips(state.wordMastery?.[wordId]?.tier || 0);
}

function unitOfWord(w) {
  return UNIT_BY_ID[w.unitId];
}

function scrollScreenTop() {
  const screen = document.getElementById('screen');
  if (screen) screen.scrollTop = 0;
}

/**
 * Due words first, then unseen words from the learner's current unit, then any
 * unseen word. Flashcards and word_pick share the same queue recipe.
 */
function buildQueue(size = REVIEW_SIZE) {
  const picks = [];
  const seen = new Set();
  const add = (w) => {
    if (!w || picks.length >= size || seen.has(w.id)) return;
    seen.add(w.id);
    picks.push(w);
  };
  dueList().slice(0, size).forEach((x) => add(x.word));
  wordsOf(currentUnitId()).forEach((w) => {
    if (!state.wordMastery?.[w.id]?.seen) add(w);
  });
  WORDS.forEach((w) => {
    if (!state.wordMastery?.[w.id]?.seen) add(w);
  });
  if (picks.length < size) WORDS.forEach(add);
  return picks.slice(0, size);
}

function makeTask(word) {
  const unitPool = wordsOf(word.unitId);
  return buildTask('word_pick', {
    wordId: word.id,
    poolWords: unitPool.length >= 4 ? unitPool : WORDS,
  });
}

// ---------- header ----------
function headerHTML() {
  const due = dueCount();
  return `<div class="top">
    <div class="top-left">
      <button class="icon-btn" data-back="home" type="button" aria-label="Back">${ui.icon('back', 22)}</button>
      <h1 class="screen-title">Words</h1>
    </div>
    <span class="pill pill--sm ${due ? 'pill--coral' : 'pill--mint'}" aria-label="${due} words due">
      ${due} due
    </span>
  </div>`;
}

// ---------- home ----------
function statHTML(value, label, tone, suffix) {
  return `<div class="vstat ${tone}">
    <b>${value}${suffix ? `<span>${suffix}</span>` : ''}</b>
    <small>${label}</small>
  </div>`;
}

function homeHTML() {
  const due = dueCount();
  const known = knownWordCount();
  const learning = learningCount();
  const total = WORDS.length;
  return `
    <div class="vocab-hero stagger">
      <div class="vocab-hero-top">
        <span class="overline">Vocabulary</span>
        <h2 class="vocab-h">Words are the fuel</h2>
        <p class="vocab-sub">Every sentence in the course runs on these. Keep them warm.</p>
      </div>
      <div class="vstats">
        ${statHTML(ui.fmt(Math.min(known, total)), 'known', 'vstat--mint', ` / ${total}`)}
        ${statHTML(due, 'due now', due ? 'vstat--coral' : 'vstat--calm')}
        ${statHTML(learning, 'learning', 'vstat--cream')}
      </div>
      <div class="vocab-actions">
        <button class="btn btn-primary btn-block" data-act="review" type="button" ${
          due ? '' : 'disabled'
        }>
          ${ui.icon('refresh', 20)} Review due (${due})
        </button>
        <button class="btn btn-secondary btn-block" data-act="flash" type="button">
          ${ui.icon('book', 20)} Flashcards
        </button>
      </div>
    </div>

    ${
      due === 0
        ? `<div class="vempty card card-mint">
            <span class="vempty-ico">${ui.icon('check', 22)}</span>
            <div class="vempty-copy">
              <b>Nothing due.</b>
              <span>Learn 5 new words?</span>
            </div>
            <button class="btn btn-secondary btn-sm" data-act="flash" type="button">Flashcards</button>
          </div>`
        : `<button class="vdue-strip" data-act="review" type="button">
            <span class="vduestrip-ico">${ui.icon('flame', 20)}</span>
            <span class="vduestrip-text"><b>${due} word${due === 1 ? '' : 's'} due</b><span>Ten quick choices keeps them from fading.</span></span>
            <span class="vduestrip-arrow">${ui.icon('arrow', 18)}</span>
          </button>`
    }

    <section class="vbrowse" aria-label="Browse all words">
      <div class="row-between vbrowse-head">
        <h2 class="h3">Browse all ${total}</h2>
        <span class="small muted" data-vcount>${browseMatchCount()}</span>
      </div>
      <label class="lt-search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>
        <input type="search" data-vsearch value="${ui.esc(browse.q)}" placeholder="Search Korean or English" autocomplete="off" aria-label="Search words" />
      </label>
      <div class="lt-chips" role="group" aria-label="Filter by unit">
        <button class="chip" data-vunit="all" type="button" aria-pressed="${browse.unit === 'all'}">All units</button>
        ${UNITS.map(
          (u) =>
            `<button class="chip" data-vunit="${u.id}" type="button" aria-pressed="${
              browse.unit === u.id
            }">U${String(u.order).padStart(2, '0')}</button>`
        ).join('')}
      </div>
      <div class="vlist" data-vlist>${wordListHTML()}</div>
      <div data-vmore>${loadMoreHTML()}</div>
    </section>`;
}

function filteredWords() {
  const q = browse.q.trim().toLowerCase();
  return WORDS.filter((w) => {
    if (browse.unit !== 'all' && w.unitId !== browse.unit) return false;
    if (!q) return true;
    return `${w.ko} ${w.rom || ''} ${w.en}`.toLowerCase().includes(q);
  });
}

function browseMatchCount() {
  const n = filteredWords().length;
  return `${ui.fmt(n)} ${n === 1 ? 'match' : 'matches'}`;
}

function wordListHTML() {
  const list = filteredWords();
  if (!list.length) {
    return `<div class="empty-note">No words match that search. Try the Korean word or its English meaning.</div>`;
  }
  return list
    .slice(0, browse.limit)
    .map((w) => {
      const u = unitOfWord(w);
      return `<div class="vrow" data-word="${w.id}" role="button" tabindex="0" aria-label="${ui.esc(
        `${w.ko} — ${w.en}`
      )}">
        <span class="vrow-main">
          <span class="vrow-ko ko">${ui.esc(w.ko)}</span>
          <span class="vrow-en">${ui.esc(w.en)}${
            w.rom ? `<span class="vrow-rom">${ui.esc(w.rom)}</span>` : ''
          }</span>
        </span>
        <span class="vrow-unit">U${String(u?.order || 1).padStart(2, '0')}</span>
        ${pipsFor(w.id)}
        ${wordClip(w, 'vrow-audio', 17)}
      </div>`;
    })
    .join('');
}

function loadMoreHTML() {
  const total = filteredWords().length;
  if (browse.limit >= total) {
    return total > PAGE_SIZE
      ? `<p class="vlist-end small muted center">All ${ui.fmt(total)} shown</p>`
      : '';
  }
  return `<button class="btn btn-secondary btn-block btn-sm vmore" data-act="more" type="button">
    Show ${Math.min(PAGE_SIZE, total - browse.limit)} more
  </button>`;
}

// ---------- review ----------
function startReview() {
  const queue = buildQueue();
  if (!queue.length) return;
  review = {
    queue,
    index: 0,
    correct: 0,
    xp: 0,
    answered: false,
    ex: null,
    chosen: null,
    feedback: null,
    done: false,
  };
  mode = 'review';
  setReviewTask();
  scrollScreenTop();
  paint();
}

function setReviewTask() {
  const word = review.queue[review.index];
  review.ex = word ? makeTask(word) : null;
  review.answered = false;
  review.chosen = null;
  review.feedback = null;
  if (!review.ex) finishReview();
}

function finishReview() {
  review.done = true;
  paint();
}

function reviewHTML() {
  if (!review) return '';
  if (review.done) return reviewSummaryHTML();
  const ex = review.ex;
  if (!ex) return '';
  const word = ex.word;
  const pct = (review.index / REVIEW_SIZE) * 100;
  const tier = state.wordMastery?.[word.id]?.tier || 0;

  return `
    <div class="review-top">
      <div class="row-between">
        <span class="pill pill--sm pill--indigo">${review.index + 1} / ${REVIEW_SIZE}</span>
        <span class="small muted">Word review</span>
      </div>
      <div class="bar bar--thin mt-3"><i style="width:${pct}%"></i></div>
    </div>

    <div class="rq card">
      <span class="overline">Which Korean word means</span>
      <h2 class="rq-en">${ui.esc(ex.prompt)}</h2>
      <p class="small muted">${ui.esc(ex.instruction)}</p>
      <div class="opts mt-4">
        ${ex.options
          .map((o) => {
            let cls = 'opt ko';
            if (review.answered) {
              if (o.correct) cls += ' is-correct';
              else if (o.id === review.chosen) cls += ' is-wrong';
              else cls += ' is-dim';
            }
            return `<button class="${cls}" data-opt="${o.id}" type="button" ${
              review.answered ? 'disabled' : ''
            }>
              <span class="key">${o.key}</span>
              <span class="opt-text">${ui.esc(o.label)}</span>
            </button>`;
          })
          .join('')}
      </div>
    </div>

    ${
      review.answered
        ? `<div class="vfb ${review.feedback?.correct ? 'is-correct' : 'is-wrong'}">
            ${ui.icon(review.feedback?.correct ? 'check' : 'close', 20)}
            <span>${review.feedback?.correct ? 'Correct' : `Not quite — ${ui.esc(word.ko)}`}</span>
          </div>
          <div class="card vword-card">
            <div class="vword-top">
              <div>
                <span class="overline">The word</span>
                <div class="vword-ko ko">${ui.esc(word.ko)}</div>
                <div class="vword-rom">${ui.esc(word.rom || '')}</div>
              </div>
              ${wordClip(word, 'say-btn', 24)}
            </div>
            <div class="vword-meta">
              <span class="chip chip-coral">${ui.esc(word.pos || 'word')}</span>
              <span class="vword-en">${ui.esc(word.en)}</span>
              ${ui.pips(tier)}
            </div>
            <p class="small muted vword-hint">${ui.esc(
              `Unit ${UNIT_BY_ID[word.unitId]?.order || 1} · ${UNIT_BY_ID[word.unitId]?.title || ''}`
            )}</p>
          </div>
          <button class="btn btn-primary btn-block mt-4" data-act="next" type="button">
            ${review.index + 1 >= REVIEW_SIZE ? 'See results' : 'Next word'} ${ui.icon('arrow', 18)}
          </button>`
        : `<p class="small muted center vreview-hint">Tap an answer — the word card follows.</p>`
    }`;
}

function reviewSummaryHTML() {
  const score = review.correct;
  const pct = Math.round((score / REVIEW_SIZE) * 100);
  return `<div class="vsum card">
    <span class="vsum-ico ${pct >= 80 ? 'is-great' : ''}">${ui.icon(pct >= 80 ? 'star' : 'refresh', 30)}</span>
    <span class="overline">Review complete</span>
    <div class="vsum-score">${score}<span> / ${REVIEW_SIZE}</span></div>
    <p class="vsum-sub">${
      pct >= 80
        ? 'Those words are settling in.'
        : 'A few are still slippery — they will come back.'
    }</p>
    <div class="vsum-meta">
      <span class="pill pill--mint pill--sm">+${review.xp} XP</span>
      <span class="pill pill--indigo pill--sm">${pct}%</span>
      <span class="pill pill--sm">${dueCount()} still due</span>
    </div>
    <div class="vsum-actions">
      <button class="btn btn-primary btn-block" data-act="home" type="button">Back to words</button>
      <button class="btn btn-ghost btn-block" data-act="review-again" type="button">Review another 10</button>
    </div>
  </div>`;
}

function answerReview(optionId) {
  if (!review || review.answered) return;
  const res = gradeAnswer(review.ex, optionId);
  review.answered = true;
  review.chosen = optionId;
  review.feedback = res;
  if (res.correct) review.correct++;
  // store.recordAnswer routes word tasks through recordWord itself, so this is
  // exactly one SRS step per answer (calling both would double-advance a word).
  const out = recordAnswer({
    sentenceId: null,
    wordId: review.ex.wordId,
    type: 'word_pick',
    correct: res.correct,
  });
  review.xp += out?.xp || 0;
  audio.sfx(res.correct ? 'correct' : 'wrong');
  paint();
}

function nextReview() {
  if (!review) return;
  review.index++;
  if (review.index >= REVIEW_SIZE || review.index >= review.queue.length) {
    finishReview();
    return;
  }
  setReviewTask();
  paint();
}

// ---------- flashcards ----------
function startFlash() {
  const queue = buildQueue();
  if (!queue.length) return;
  flash = {
    queue,
    index: 0,
    revealed: false,
    good: 0,
    again: 0,
    done: false,
  };
  mode = 'flash';
  scrollScreenTop();
  paint();
}

function flashHTML() {
  if (!flash) return '';
  if (flash.done) return flashSummaryHTML();
  const w = flash.queue[flash.index];
  const u = unitOfWord(w);
  return `
    <div class="flash-top">
      <span class="pill pill--sm pill--coral">Flashcards</span>
      <span class="small muted">${flash.index + 1} / ${flash.queue.length}</span>
    </div>
    <div class="flash-progress" aria-hidden="true">
      ${flash.queue
        .map((_, i) => `<i class="${i < flash.index ? 'on' : ''}"></i>`)
        .join('')}
    </div>

    <div class="flash-card ${flash.revealed ? 'is-revealed' : ''}">
      <div class="flash-card-top">
        <span class="chip chip-coral">U${String(u?.order || 1).padStart(2, '0')} · ${ui.esc(
          u?.title || ''
        )}</span>
      </div>
      <div class="flash-word">
        <div class="flash-ko ko">${ui.esc(w.ko)}</div>
        ${wordClip(w, 'say-btn flash-say', 26)}
      </div>
      ${
        flash.revealed
          ? `<div class="flash-back">
              <div class="flash-rom">${ui.esc(w.rom || '')}</div>
              <div class="flash-en">${ui.esc(w.en)}</div>
              <span class="chip">${ui.esc(w.pos || 'word')}</span>
              ${pipsFor(w.id)}
            </div>`
          : `<button class="flash-tap" data-act="reveal" type="button">
              ${ui.icon('eye', 18)} Tap to reveal meaning
            </button>`
      }
    </div>

    ${
      flash.revealed
        ? `<div class="flash-actions">
            <button class="fgrade fgrade--again" data-act="grade" data-grade="again" type="button">
              <b>Again</b><span>soon</span>
            </button>
            <button class="fgrade fgrade--good" data-act="grade" data-grade="good" type="button">
              <b>Good</b><span>got it</span>
            </button>
            <button class="fgrade fgrade--easy" data-act="grade" data-grade="easy" type="button">
              <b>Easy</b><span>solid</span>
            </button>
          </div>`
        : `<p class="small muted center flash-hint">Say it out loud before you flip.</p>`
    }`;
}

function gradeFlash(grade) {
  if (!flash || !flash.revealed) return;
  const w = flash.queue[flash.index];
  recordWord(w.id, grade !== 'again');
  if (grade === 'again') flash.again++;
  else flash.good++;
  flash.index++;
  flash.revealed = false;
  if (flash.index >= flash.queue.length) {
    flash.done = true;
    paint();
    return;
  }
  paint();
}

function flashSummaryHTML() {
  return `<div class="vsum card">
    <span class="vsum-ico is-great">${ui.icon('book', 30)}</span>
    <span class="overline">Deck complete</span>
    <div class="vsum-score">${flash.good + flash.again}<span> / ${flash.queue.length}</span></div>
    <p class="vsum-sub">${flash.good} felt solid · ${flash.again} to revisit</p>
    <div class="vsum-meta">
      <span class="pill pill--mint pill--sm">${flash.good} good</span>
      <span class="pill pill--amber pill--sm">${flash.again} again</span>
    </div>
    <div class="vsum-actions">
      <button class="btn btn-primary btn-block" data-act="home" type="button">Back to words</button>
      <button class="btn btn-ghost btn-block" data-act="flash-again" type="button">Another 10 cards</button>
    </div>
  </div>`;
}

// ---------- word detail sheet ----------
function openWordSheet(word) {
  const example = SENTENCES.find((s) => (s.wordIds || []).includes(word.id));
  const u = unitOfWord(word);
  const lesson = word.lessonId ? LESSON_BY_ID[word.lessonId] : null;
  sheetClose?.();
  sheetClose = ui.sheet({
    dismiss: true,
    body: `<div class="vws">
      <div class="vws-head">
        <div>
          <span class="overline">${ui.esc(u?.title || 'Word')} · ${ui.esc(word.pos || 'word')}</span>
          <h2 class="vws-ko ko">${ui.esc(word.ko)}</h2>
          <p class="vws-rom">${ui.esc(word.rom || '')}</p>
        </div>
        ${wordClip(word, 'say-btn', 24)}
      </div>
      <p class="vws-en">${ui.esc(word.en)}</p>
      <div class="vws-meta">${pipsFor(word.id)}<span class="small muted">word strength</span></div>
      ${
        example
          ? `<div class="vws-ex">
              <div class="row-between">
                <span class="overline">In a sentence</span>
                ${sentenceClip(example)}
              </div>
              <p class="vws-ex-ko ko">${ui.esc(example.korean)}</p>
              <p class="small muted">${ui.esc(example.english)}</p>
            </div>`
          : ''
      }
      <p class="small muted vws-note">${
        state.wordMastery?.[word.id]?.tier
          ? `Next review: ${nextDueText(state.wordMastery[word.id].dueAt)}`
          : 'Not practised yet — a flashcard is the fastest start.'
      }</p>
    </div>`,
    actions: [
      {
        label: 'Practise this word',
        cls: 'btn-primary',
        onClick: () => {
          if (lesson) router.go('lesson', { node: lesson.nodeIndex });
          else router.go('lesson', { node: nextLessonIndex(state.path?.completedNodes || []) });
        },
      },
      { label: 'Close', cls: 'btn-ghost' },
    ],
  });
}

function nextDueText(t) {
  if (!t) return 'now';
  const delta = t - Date.now();
  if (delta <= 60000) return 'now';
  const h = Math.round(delta / 3600000);
  if (h < 24) return `in ${h}h`;
  return `in ${Math.round(h / 24)}d`;
}

// ---------- paint / events ----------
function viewHTML() {
  const inner =
    mode === 'review' ? reviewHTML() : mode === 'flash' ? flashHTML() : homeHTML();
  return `<section class="screen vocab">${headerHTML()}<div class="vocab-main">${inner}</div></section>`;
}

function paint() {
  if (!rootEl) return;
  rootEl.innerHTML = viewHTML();
}

function refreshList() {
  if (!rootEl) return;
  const list = rootEl.querySelector('[data-vlist]');
  if (list) list.innerHTML = wordListHTML();
  const more = rootEl.querySelector('[data-vmore]');
  if (more) more.innerHTML = loadMoreHTML();
  const count = rootEl.querySelector('[data-vcount]');
  if (count) count.textContent = browseMatchCount();
}

function goHome() {
  mode = 'home';
  review = null;
  flash = null;
  paint();
  scrollScreenTop();
}

export default {
  id: 'vocab',
  title: 'Words',
  nav: null,
  hideNav: false,
  render() {
    return `<section class="screen vocab">${headerHTML()}<div class="vocab-main">${homeHTML()}</div></section>`;
  },
  mount(root) {
    rootEl = root;
    ui.initReducedMotion(state.settings.reducedMotion);

    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-clip]')) return; // the router owns audio buttons

      const act = e.target.closest('[data-act]');
      if (act) {
        const a = act.dataset.act;
        if (a === 'review') return startReview();
        if (a === 'review-again') return startReview();
        if (a === 'flash' || a === 'flash-again') return startFlash();
        if (a === 'next') return nextReview();
        if (a === 'home') return goHome();
        if (a === 'reveal') {
          if (flash) {
            flash.revealed = true;
            audio.sfx('tap');
            paint();
          }
          return;
        }
        if (a === 'grade') return gradeFlash(act.dataset.grade);
        if (a === 'more') {
          browse.limit += PAGE_SIZE;
          refreshList();
          return;
        }
      }

      const opt = e.target.closest('[data-opt]');
      if (opt && review && !review.answered) return answerReview(opt.dataset.opt);

      const unit = e.target.closest('[data-vunit]');
      if (unit) {
        browse.unit = unit.dataset.vunit;
        browse.limit = PAGE_SIZE;
        paint();
        return;
      }

      const row = e.target.closest('[data-word]');
      if (row) {
        const w = WORD_BY_ID[row.dataset.word];
        if (w) openWordSheet(w);
      }
    });

    root.addEventListener('input', (e) => {
      if (!e.target.matches('[data-vsearch]')) return;
      browse.q = e.target.value;
      browse.limit = PAGE_SIZE;
      refreshList();
    });

    root.addEventListener('keydown', (e) => {
      const row = e.target.closest?.('[data-word]');
      if (row && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        const w = WORD_BY_ID[row.dataset.word];
        if (w) openWordSheet(w);
        return;
      }
      if (mode !== 'review' || !review || review.done) return;
      if (e.key >= '1' && e.key <= '4') {
        const opt = review.ex?.options?.[Number(e.key) - 1];
        if (opt && !review.answered) answerReview(opt.id);
      } else if (e.key === 'Enter' && review.answered) {
        nextReview();
      }
    });

    // A fresh visit always opens on the overview, not a half-finished deck.
    if (mode !== 'home') {
      mode = 'home';
      review = null;
      flash = null;
    }
    paint();
  },
  destroy() {
    sheetClose?.();
    sheetClose = null;
    rootEl = null;
    mode = 'home';
    review = null;
    flash = null;
    browse.q = '';
    browse.unit = 'all';
    browse.limit = PAGE_SIZE;
  },
};
