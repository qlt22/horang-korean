// W5 · A1 session receipt.
// Everything here is read from the real summary + course data: no invented counts.
import { state, save, openChest, weekDaysActive, stampCount, logEvent } from '../core/store.js';
import {
  META,
  LESSONS,
  SENTENCES,
  SENTENCE_BY_ID,
  WORD_BY_ID,
  lessonAt,
  lessonWords,
  unitOfLesson,
  UNIT_BY_ID,
} from '../core/course.js';
import * as ui from '../core/ui.js';
import * as audio from '../core/audio.js';
import router from '../core/router.js';
import { weekdayIndex } from '../core/clock.js';

const RARITY = {
  common: { label: 'Common', tone: 'mint' },
  rare: { label: 'Rare', tone: 'indigo' },
  epic: { label: 'Epic', tone: 'coral' },
  legendary: { label: 'Legendary', tone: 'amber' },
};

const PASS_PCT = 80;

function fmtTime(sec) {
  const s = Math.max(0, Math.round(sec || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function accCopy(rawPct) {
  if (rawPct < 60) return 'Rough one. It still counts.';
  if (rawPct < 80) return 'Getting there.';
  if (rawPct < 95) return 'Solid run.';
  return 'Clean sweep.';
}

function breakdown(sum) {
  const bonus = sum.bonusXp || 0;
  const perfect = sum.stars === 3 ? Math.min(20, Math.max(0, bonus - 30)) : 0;
  const lessonBonus = Math.max(0, bonus - perfect);
  return { perfect, lessonBonus };
}

function metTotal() {
  return SENTENCES.filter((s) => (state.mastery?.[s.id]?.tier || 0) >= 1).length;
}

function solvedSentences(ids = []) {
  const seen = new Set();
  return ids
    .map((id) => SENTENCE_BY_ID[id])
    .filter((s) => s && !seen.has(s.id) && seen.add(s.id));
}

// Words the learner actually met in this run: the words carried by the sentences
// they just answered, plus any word drill recorded inside the session window.
// Never pads the number with words from elsewhere in the course.
function sessionWords(sum, sentences) {
  const end = Date.now();
  const windowStart = end - Math.max(120, (sum.seconds || 0) + 120) * 1000;
  const lesson = sum.nodeIndex != null ? lessonAt(sum.nodeIndex) : null;
  const lessonWordIds = new Set((lesson ? lessonWords(lesson) : []).map((w) => w.id));
  const ids = new Set();

  sentences.forEach((s) => (s.wordIds || []).forEach((id) => ids.add(id)));

  Object.entries(state.wordMastery || {}).forEach(([id, w]) => {
    if (!w || w.lastSeenAt < windowStart) return;
    if (lesson && !lessonWordIds.has(id) && WORD_BY_ID[id]?.unitId !== lesson.unitId) return;
    ids.add(id);
  });

  return [...ids].map((id) => WORD_BY_ID[id]).filter(Boolean);
}

function sentenceCards(sentences) {
  return sentences
    .map(
      (s) => `<article class="stamp complete-stamp cmp-sentence">
        <span class="cmp-stamp-top">
          <b class="cmp-stamp-ko ko" lang="ko">${ui.esc(s.korean)}</b>
          <button class="say-btn say-btn--sm" data-clip="${ui.esc(s.id)}" data-clip-kind="s" data-say="${ui.esc(
            s.korean
          )}" type="button" aria-label="Play sentence">${ui.icon('sound', 16)}</button>
        </span>
        <span class="cmp-stamp-en">${ui.esc(s.english)}</span>
        <span class="cmp-stamp-rom">${ui.esc(s.romanization || '')}</span>
      </article>`
    )
    .join('');
}

function strongChips(sentences) {
  return sentences
    .map(
      (s) => `<span class="cmp-strong-chip">
        <button class="cmp-strong-say" data-clip="${ui.esc(s.id)}" data-clip-kind="s" data-say="${ui.esc(
          s.korean
        )}" type="button" aria-label="Play sentence">${ui.icon('sound', 13)}</button>
        <b lang="ko">${ui.esc(s.korean)}</b>
        <em>${ui.esc(s.english)}</em>
      </span>`
    )
    .join('');
}

function wordChips(words) {
  return words
    .slice(0, 10)
    .map(
      (w) => `<span class="cw-chip cmp-word-chip">
        <button class="cmp-word-say" data-clip="${ui.esc(w.id)}" data-clip-kind="w" data-say="${ui.esc(
          w.ko
        )}" type="button" aria-label="Play word">${ui.icon('sound', 12)}</button>
        <b lang="ko">${ui.esc(w.ko)}</b><em>${ui.esc(w.en)}</em>
      </span>`
    )
    .join('');
}

function tickTime(el, seconds) {
  if (!el) return;
  const start = performance.now();
  const total = Math.max(0, seconds || 0);
  function frame(t) {
    const k = Math.min(1, (t - start) / 650);
    const eased = 1 - Math.pow(1 - k, 3);
    el.textContent = fmtTime(Math.round(total * eased));
    if (k < 1) requestAnimationFrame(frame);
  }
  el.textContent = '0:00';
  requestAnimationFrame(frame);
}

function checkpointPanel(sum, nextIndex) {
  const cp = sum.checkpoint;
  if (!cp) return '';
  const unit = UNIT_BY_ID[cp.unitId] || unitOfLesson(sum.nodeIndex ?? 0);
  const passed = !!cp.passed;
  const score = Math.round(cp.score || 0);
  const hasBadge = passed && (state.badges || []).includes(cp.unitId);
  const unitLabel = unit ? `Unit ${unit.order} · ${unit.title}` : 'Unit checkpoint';
  const ko = unit?.ko || '';

  return `<section class="cmp-cp ${passed ? 'is-pass' : 'is-fail'}" aria-label="Checkpoint result">
    <div class="cmp-cp-head">
      <span class="cmp-cp-mark" aria-hidden="true">${ui.icon(passed ? 'trophy' : 'refresh', 26)}</span>
      <div class="grow">
        <p class="cmp-cp-overline">Checkpoint${passed ? ' passed' : ' result'}</p>
        <h2 class="cmp-cp-title">${ui.esc(unitLabel)}</h2>
        ${ko ? `<p class="cmp-cp-ko ko" lang="ko">${ui.esc(ko)}</p>` : ''}
      </div>
      <div class="cmp-cp-score"><b>${score}%</b><span>score</span></div>
    </div>
    <p class="cmp-cp-line">
      ${
        passed
          ? `You met the bar — ${PASS_PCT}% to pass.`
          : `Not this time. ${PASS_PCT}% to pass; this run was ${score}%. Nothing is lost.`
      }
    </p>
    ${
      passed
        ? `<div class="cmp-cp-badge ${hasBadge ? 'is-minted' : ''}">
            <span class="cmp-cp-seal" aria-hidden="true">${ui.icon('check', 18)}</span>
            <span class="grow">
              <b>${hasBadge ? 'Unit badge earned' : 'Checkpoint cleared'}</b>
              <span>${ui.esc(unit ? `${unit.title} · ${ko}` : 'Unit badge')}</span>
            </span>
            ${hasBadge ? '<span class="cmp-cp-mint">MINT</span>' : ''}
          </div>`
        : `<div class="cmp-cp-note">
            <span aria-hidden="true">${ui.icon('info', 17)}</span>
            <span>Retry when you're ready — the four lessons stay open, so nothing blocks you.</span>
          </div>`
    }
    <div class="cmp-cp-actions">
      <button class="btn ${passed ? 'btn-secondary' : 'btn-primary'} btn-sm" data-cp-retry type="button">
        ${ui.icon('refresh', 16)} ${passed ? 'Try for 100%' : 'Retry checkpoint'}
      </button>
      <button class="btn btn-ghost btn-sm" data-cp-continue type="button">
        ${nextIndex != null && nextIndex < LESSONS.length ? 'Keep going' : 'Back to Learn'} ${ui.icon('arrow', 16)}
      </button>
    </div>
  </section>`;
}

function emptyState() {
  return `<section class="screen complete complete--empty">
    <div class="lesson-blocked">
      <div class="lesson-blocked-art">${ui.mascot(104, 'think')}</div>
      <h1 class="h2">No session to show yet</h1>
      <p class="muted mt-2">Finish a session and this page turns into your receipt.</p>
      <button class="btn btn-primary btn-block mt-6" data-go="home" type="button">Back to Learn</button>
    </div>
  </section>`;
}

export default {
  id: 'complete',
  title: 'Session complete',
  nav: null,
  hideNav: true,

  render() {
    const sum = state.lastSummary;
    if (!sum) return emptyState();

    const raw = Math.round((sum.accuracy || 0) * 100);
    const { perfect, lessonBonus } = breakdown(sum);
    const met = solvedSentences(sum.met || []);
    const strong = solvedSentences(sum.strong || []);
    const words = sessionWords(sum, [...met, ...strong]);
    const activeDays = weekDaysActive()
      .map((on, i) => (on ? i : -1))
      .filter((i) => i >= 0);
    const nextIndex = sum.nodeIndex != null ? sum.nodeIndex + 1 : null;
    const nextLesson = nextIndex != null && nextIndex < LESSONS.length ? lessonAt(nextIndex) : null;
    const lastNode = sum.nodeIndex != null && sum.nodeIndex >= LESSONS.length - 1;
    const chestWaiting = !!sum.chestFilled && state.chest.slots > 0;
    const isCheckpoint = !!sum.checkpoint;
    const cpPassed = !isCheckpoint || !!sum.checkpoint.passed;
    const metSoFar = metTotal();
    const showQuickCheck =
      sum.nodeIndex === 0 && !state.flags.placementTaken && !state.flags.placementDismissed;

    return `<section class="screen complete" data-complete data-kind="${isCheckpoint ? 'checkpoint' : 'lesson'}">
      <header class="complete-head">
        <p class="overline">${isCheckpoint ? 'Checkpoint complete' : 'Session complete'}</p>
        <h1 class="complete-h">${ui.esc(accCopy(raw))}</h1>
        <p class="complete-sub">${ui.esc(sum.nodeTitle || sum.unitTitle || 'Practice run')}</p>
      </header>

      <div class="complete-hero">
        <span class="complete-spark" aria-hidden="true">${ui.icon('sparkle', 26)}</span>
        ${
          sum.levelsUp
            ? `<span class="pill pill--indigo pill--sm complete-level">${ui.icon(
                'sparkle',
                14
              )} LV ${sum.level}</span>`
            : ''
        }
        <div class="complete-xp"><span class="cx-plus">+</span><span class="cx-num" data-xp>0</span><span class="cx-unit">XP</span></div>
        <p class="complete-breakdown">
          <span>Answers +${ui.fmt(sum.answerXp || 0)}</span>
          <span>${isCheckpoint ? 'Checkpoint bonus' : 'Lesson bonus'} +${ui.fmt(lessonBonus)}</span>
          ${perfect ? `<span class="is-perfect">Perfect +${ui.fmt(perfect)}</span>` : ''}
        </p>
        <div class="complete-stars">${ui.stars(sum.stars || 0, 36)}</div>
        ${sum.coins ? `<p class="cmp-coins">${ui.coin(16)} <b>+${ui.fmt(sum.coins)}</b> coins</p>` : ''}
      </div>

      <div class="complete-stats">
        <div class="cstat">
          <b><span data-acc>0</span>%</b>
          <span class="cstat-label">Accuracy</span>
        </div>
        <div class="cstat">
          <b data-time>0:00</b>
          <span class="cstat-label">Time</span>
        </div>
        <div class="cstat">
          <b>×<span data-combo>0</span></b>
          <span class="cstat-label">Best combo</span>
        </div>
      </div>

      ${checkpointPanel(sum, nextIndex)}

      <section class="complete-block cmp-met">
        <div class="complete-block-head">
          <h2 class="complete-h2"><span data-met-num>0</span> new ${met.length === 1 ? 'sentence' : 'sentences'} met</h2>
          <span class="complete-count">${metSoFar} / ${META.sentenceCount}</span>
        </div>
        ${
          met.length
            ? `<div class="cmp-strip">${sentenceCards(met)}</div>`
            : `<p class="complete-quiet">${
                isCheckpoint
                  ? 'No new sentences this check — it tested what you already know.'
                  : 'Nothing new this run. Review still counts.'
              }</p>`
        }
      </section>

      ${
        strong.length
          ? `<section class="complete-block cmp-strong">
              <div class="complete-block-head">
                <h2 class="complete-h2">Strong now</h2>
                <span class="complete-count">${strong.length} ${strong.length === 1 ? 'sentence' : 'sentences'}</span>
              </div>
              <p class="cmp-strong-sub">Third correct recall — these moved into long-term memory.</p>
              <div class="cmp-strong-strip">${strongChips(strong)}</div>
            </section>`
          : ''
      }

      ${
        words.length
          ? `<section class="complete-block">
              <div class="complete-block-head">
                <h2 class="complete-h2">${words.length} ${words.length === 1 ? 'word' : 'words'} practised</h2>
                <span class="complete-count">from this run</span>
              </div>
              <div class="cw-bank">${wordChips(words)}</div>
            </section>`
          : ''
      }

      ${
        chestWaiting
          ? `<section class="complete-chest">
              <div class="complete-chest-art chest-wrap"><span class="chest-btn chest-idle">${ui.chestSvg(
                92
              )}</span></div>
              <div class="grow">
                <b>Chest unlocked</b>
                <p class="muted small">${state.chest.slots} waiting today</p>
              </div>
              <button class="btn btn-secondary btn-sm" data-open-chest type="button">Open</button>
            </section>`
          : ''
      }

      <section class="complete-streak">
        <span class="cstreak-flame" aria-hidden="true">${ui.flame(30)}</span>
        <div class="grow">
          <b>${state.streak.current ? `Day ${state.streak.current}` : 'Streak starts today'}</b>
          <p class="muted small">${
            state.streak.current > 1
              ? 'Goal hit. Keep it warm.'
              : state.streak.current === 1
                ? 'One run in. The streak has started.'
                : 'One more run and today counts.'
          }</p>
        </div>
        ${ui.weekStrip(activeDays, weekdayIndex())}
      </section>

      ${
        showQuickCheck
          ? `<section class="cmp-quick">
              <span class="cmp-quick-ico" aria-hidden="true">${ui.icon('target', 20)}</span>
              <div class="grow">
                <b>60-second quick check</b>
                <p class="muted small">Five easy questions so Unit 1 starts at the right speed. Optional.</p>
              </div>
              <div class="cmp-quick-actions">
                <button class="btn btn-secondary btn-sm" data-quick-check type="button">Start</button>
                <button class="btn btn-ghost btn-sm" data-quick-skip type="button">Not now</button>
              </div>
            </section>`
          : ''
      }

      ${
        sum.stars === 2 && !isCheckpoint
          ? `<section class="near-miss">
              <div class="near-miss-main">
                <div class="near-miss-stars" aria-hidden="true">${ui.stars(2, 18)}</div>
                <p><b>One slip from perfect.</b> Run it back? <span class="muted">(30s)</span></p>
              </div>
              <button class="btn btn-secondary btn-sm" data-retry type="button">Retry</button>
            </section>`
          : ''
      }

      <div class="complete-ctas">
        <button class="btn btn-primary btn-block btn-lg" data-primary type="button">
          ${
            nextLesson
              ? `Continue · ${ui.esc(nextLesson.title)} ${ui.icon('arrow', 20)}`
              : lastNode
                ? `Take the A1 exam ${ui.icon('arrow', 20)}`
                : `Back to Learn ${ui.icon('arrow', 20)}`
          }
        </button>
        ${
          sum.wrong > 0
            ? `<button class="btn btn-ghost btn-block" data-review type="button">
                ${ui.icon('refresh', 18)} Review mistakes (${sum.wrong})
              </button>`
            : ''
        }
      </div>

      <p class="complete-foot">${
        nextLesson
          ? `Next up: ${ui.esc(sum.unitTitle || '')} · ${ui.esc(nextLesson.title)} · ~${nextLesson.minutes || 5} min`
          : lastNode
            ? `Course path done · ${(state.badges || []).length} / ${META.unitCount} unit badges · then the A1 exam`
            : `Met ${metSoFar} of ${META.sentenceCount} sentences · strong ${stampCount()}`
      }</p>
    </section>`;
  },

  mount(root) {
    const sum = state.lastSummary;
    if (!sum) return;

    ui.initReducedMotion(state.settings.reducedMotion);
    const isCheckpoint = !!sum.checkpoint;
    const passed = !isCheckpoint || !!sum.checkpoint.passed;
    if (passed) {
      ui.confetti({ count: sum.stars === 3 ? 40 : 30 });
      audio.sfx('complete');
    } else {
      audio.sfx('stamp');
    }

    const raw = Math.round((sum.accuracy || 0) * 100);
    ui.countUp(root.querySelector('[data-xp]'), 0, sum.xp || 0, 900);
    ui.countUp(root.querySelector('[data-acc]'), 0, raw, 650);
    ui.countUp(root.querySelector('[data-combo]'), 0, sum.bestCombo || 0, 650);
    ui.countUp(root.querySelector('[data-met-num]'), 0, (sum.met || []).filter((id) => SENTENCE_BY_ID[id]).length, 600);
    tickTime(root.querySelector('[data-time]'), sum.seconds || 0);

    const nextIndex = sum.nodeIndex != null ? sum.nodeIndex + 1 : null;
    const nextLesson = nextIndex != null && nextIndex < LESSONS.length ? lessonAt(nextIndex) : null;

    // Exactly one departure click can win; rapid double-taps must not stack routes.
    let leaving = false;
    const leaveTo = (fn) => {
      if (leaving) return;
      leaving = true;
      audio.sfx('tap');
      fn();
    };

    root.querySelector('[data-primary]')?.addEventListener('click', () => {
      leaveTo(() => {
        if (nextLesson) router.go('lesson', { node: nextIndex });
        else if (sum.nodeIndex != null && sum.nodeIndex >= LESSONS.length - 1) router.go('exam');
        else router.go('home');
      });
    });

    root.querySelector('[data-retry]')?.addEventListener('click', () => {
      leaveTo(() => router.go('lesson', { node: sum.nodeIndex ?? 0 }));
    });

    root.querySelector('[data-cp-retry]')?.addEventListener('click', () => {
      leaveTo(() => router.go('lesson', { node: sum.nodeIndex ?? 0 }));
    });

    root.querySelector('[data-cp-continue]')?.addEventListener('click', () => {
      leaveTo(() => {
        if (nextLesson) router.go('lesson', { node: nextIndex });
        else if (sum.nodeIndex != null && sum.nodeIndex >= LESSONS.length - 1) router.go('exam');
        else router.go('home');
      });
    });

    root.querySelector('[data-review]')?.addEventListener('click', () => {
      leaveTo(() => router.go('lesson', { kind: 'review' }));
    });

    root.querySelector('[data-quick-check]')?.addEventListener('click', () => {
      leaveTo(() => router.go('onboarding', { step: 'quiz' }));
    });

    root.querySelector('[data-quick-skip]')?.addEventListener('click', () => {
      audio.sfx('tap');
      state.flags.placementTaken = true;
      state.flags.placementLevel = 1;
      state.flags.placementDismissed = true;
      logEvent('placement_skipped', { from: 'complete' });
      save();
      root.querySelector('.cmp-quick')?.remove();
    });

    root.querySelector('[data-open-chest]')?.addEventListener('click', () => {
      const result = openChest();
      if (!result) return;
      audio.sfx('chest');
      ui.confetti({ count: result.rarity === 'legendary' ? 28 : 16 });
      const meta = RARITY[result.rarity] || RARITY.common;
      const rows = [
        `<div class="kv"><span>${ui.coin(18)} Coins</span><b>+${ui.fmt(result.coins)}</b></div>`,
        result.gems ? `<div class="kv"><span>${ui.gem(16)} Gems</span><b>+${result.gems}</b></div>` : '',
        result.freeze ? `<div class="kv"><span>${ui.icon('snow', 18)} Streak freeze</span><b>+1</b></div>` : '',
      ].join('');
      ui.sheet({
        title: `${meta.label} chest`,
        body: `<div class="chest-sheet">
            <div class="chest-sheet-art chest-wrap"><span class="chest-btn is-shaking">${ui.chestSvg(
              128
            )}</span></div>
            <p class="center chest-sheet-rarity chest-sheet-rarity--${meta.tone}">${meta.label}</p>
            <div class="chest-sheet-rows">${rows}</div>
          </div>`,
        actions: [{ label: 'Collect', onClick: () => router.refresh() }],
      });
    });
  },
};
