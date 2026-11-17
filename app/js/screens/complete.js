// S10 · Node complete — the receipt. Count-ups, stamps, chest, one quiet streak block.
import { state, openChest, weekDaysActive, getSentence, stampCount } from '../core/store.js';
import { NODES } from '../core/engine.js';
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

function fmtTime(sec) {
  const s = Math.max(0, Math.round(sec || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function accCopy(rawPct) {
  if (rawPct < 70) return 'Rough one. Run it back?';
  if (rawPct < 90) return 'Solid.';
  return 'Clean sweep.';
}

function breakdown(sum) {
  const bonus = sum.bonusXp || 0;
  const perfect = sum.stars === 3 ? Math.min(20, Math.max(0, bonus - 30)) : 0;
  const nodeBonus = Math.max(0, bonus - perfect);
  return { perfect, nodeBonus };
}

function wordBank(sum) {
  const node = sum?.kind === 'node' ? NODES[sum.nodeIndex] : null;
  const ids = node?.sentenceIds || sum?.stamps || [];
  const seen = new Set();
  const words = [];
  ids.forEach((id) => {
    const s = getSentence(id);
    (s?.gloss || []).forEach((g) => {
      if (!g || !g.ko || !g.en) return;
      if (seen.has(g.ko)) return;
      seen.add(g.ko);
      words.push(g);
    });
  });
  return words.slice(0, 10);
}

function stampCards(ids = []) {
  return ids
    .map((id) => getSentence(id))
    .filter(Boolean)
    .map(
      (s) => `<article class="stamp complete-stamp">
        <div class="stamp-ko" lang="ko">${ui.esc(s.korean)}</div>
        <div class="stamp-en">${ui.esc(s.english)}</div>
        <span class="stamp-seal">NEW</span>
      </article>`
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

export default {
  id: 'complete',
  title: 'Node complete',
  nav: null,
  hideNav: true,

  render() {
    const sum = state.lastSummary;

    if (!sum) {
      return `<section class="screen complete complete--empty">
        <div class="lesson-blocked">
          <div class="lesson-blocked-art">${ui.mascot(104, 'think')}</div>
          <h1 class="h2">No run to show yet</h1>
          <p class="muted mt-2">Finish a node and this page turns into your receipt.</p>
          <button class="btn btn-primary btn-block mt-6" data-go="home" type="button">Back to Learn</button>
        </div>
      </section>`;
    }

    const raw = (sum.accuracy || 0) * 100;
    const { perfect, nodeBonus } = breakdown(sum);
    const stamps = sum.stamps || [];
    const activeDays = weekDaysActive()
      .map((on, i) => (on ? i : -1))
      .filter((i) => i >= 0);
    const nextNode = NODES[(sum.nodeIndex ?? 0) + 1];
    const chestWaiting = !!sum.chestFilled && state.chest.slots > 0;
    const stampTotal = stampCount();

    return `<section class="screen complete" data-complete>
      <header class="complete-head">
        <p class="overline">Node complete</p>
        <h1 class="complete-h">${ui.esc(accCopy(raw))}</h1>
        <p class="complete-sub">${ui.esc(sum.nodeTitle || 'Daily run')}</p>
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
          <span>Node bonus +${ui.fmt(nodeBonus)}</span>
          ${perfect ? `<span class="is-perfect">Perfect +${ui.fmt(perfect)}</span>` : ''}
        </p>
        <div class="complete-stars">${ui.stars(sum.stars || 0, 36)}</div>
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

      <section class="complete-block">
        <div class="complete-block-head">
          <h2 class="complete-h2">New stamps</h2>
          <span class="complete-count">${stampTotal}/40</span>
        </div>
        ${
          stamps.length
            ? `<div class="stamp-strip">${stampCards(stamps)}</div>`
            : `<p class="complete-quiet">No new stamps this run.</p>`
        }
      </section>

      ${
        wordBank(sum).length
          ? `<section class="complete-block">
              <div class="complete-block-head">
                <h2 class="complete-h2">Words you just used</h2>
                <span class="complete-count">${wordBank(sum).length}</span>
              </div>
              <div class="cw-bank">
                ${wordBank(sum)
                  .map(
                    (g) =>
                      `<span class="cw-chip"><b lang="ko">${ui.esc(g.ko)}</b><em>${ui.esc(g.en)}</em></span>`
                  )
                  .join('')}
              </div>
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
        sum.stars === 2
          ? `<section class="near-miss">
              <div class="near-miss-main">
                <div class="near-miss-stars" aria-hidden="true">${ui.stars(2, 18)}</div>
                <p><b>One slip from perfect.</b> Retry? <span class="muted">(30s)</span></p>
              </div>
              <button class="btn btn-secondary btn-sm" data-retry type="button">Retry</button>
            </section>`
          : ''
      }

      <div class="complete-ctas">
        <button class="btn btn-primary btn-block btn-lg" data-primary type="button">
          Continue ${ui.icon('arrow', 20)}
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
        nextNode
          ? `Next up: Node ${nextNode.index + 1} · 3 min`
          : 'Next up: your Passport · 40 stamps'
      }</p>
    </section>`;
  },

  mount(root) {
    const sum = state.lastSummary;
    if (!sum) return;

    ui.initReducedMotion(state.settings.reducedMotion);
    ui.confetti({ count: 32 });
    audio.sfx('complete');

    const raw = (sum.accuracy || 0) * 100;
    ui.countUp(root.querySelector('[data-xp]'), 0, sum.xp || 0, 900);
    ui.countUp(root.querySelector('[data-acc]'), 0, Math.round(raw), 650);
    ui.countUp(root.querySelector('[data-combo]'), 0, sum.bestCombo || 0, 650);
    tickTime(root.querySelector('[data-time]'), sum.seconds || 0);

    root.querySelector('[data-primary]')?.addEventListener('click', () => {
      audio.sfx('tap');
      if (!state.flags.placementTaken) router.go('onboarding', { step: 'quiz' });
      else router.go('home');
    });

    root.querySelector('[data-retry]')?.addEventListener('click', () => {
      audio.sfx('tap');
      router.go('lesson', { node: sum.nodeIndex ?? 0 });
    });

    root.querySelector('[data-review]')?.addEventListener('click', () => {
      audio.sfx('tap');
      router.go('lesson', { kind: 'review' });
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
