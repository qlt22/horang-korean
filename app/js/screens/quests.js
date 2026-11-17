// S12 · Daily quests — three small wins, a chest meter and honest weekly goals.
import {
  state,
  save,
  checkQuests,
  questProgress,
  rerollQuest,
  openChest,
  refreshDay,
  addGems,
  addCoins,
  fillChest,
  weekDaysActive,
} from '../core/store.js';
import * as ui from '../core/ui.js';
import * as routerApi from '../core/router.js';
import * as clock from '../core/clock.js';
import * as audio from '../core/audio.js';

// Core currently ships a default router object; accept a named export too.
const router = routerApi.router || routerApi.default;

let seenQuests = new Set();
let pendingToasts = [];
let pendingAwards = [];
let ticker = null;

function collectQuests() {
  const newly = checkQuests() || [];
  const fresh = newly.filter((q) => !q.id || !seenQuests.has(q.id));
  newly.forEach((q) => {
    if (q.id) seenQuests.add(q.id);
  });
  pendingToasts = fresh;
}

function msToMidnight() {
  const n = clock.now();
  const m = new Date(n);
  m.setHours(24, 0, 0, 0);
  return m.getTime() - n.getTime();
}

function resetLabel() {
  return `Resets in ${clock.fmtCountdown(msToMidnight())}`;
}

function dateLabel() {
  return clock.now().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function weekDays() {
  return weekDaysActive().filter(Boolean).length;
}

// Weekly goals: derived from real activity, auto-collected exactly once.
function awardWeeklies() {
  const awarded = [];
  const days = weekDays();
  const xpWeek = state.league.xpWeek || 0;
  const week = clock.weekId();

  if (days >= 5 && state.flags.weeklyGoalsClaimed !== week) {
    state.flags.weeklyGoalsClaimed = week;
    addGems(1);
    addCoins(200);
    awarded.push('Weekly goal · +1 gem, +200 coins');
  }
  if (xpWeek >= 3000 && state.flags.weeklyXpClaimed !== week) {
    state.flags.weeklyXpClaimed = week;
    addCoins(100);
    fillChest();
    fillChest();
    awarded.push('3,000 XP week · +2 chest slots, +100 coins');
  }
  if (awarded.length) save();
  pendingAwards = awarded;
}

function chestSlotsHTML(slots) {
  return [0, 1, 2]
    .map(
      (i) =>
        `<span class="chest-slot chest-slot--lg ${i < slots ? 'on' : ''}">${ui.chestSvg(26)}</span>`
    )
    .join('');
}

function showChestResult(res) {
  const rarity = res.rarity || 'common';
  const title = `${rarity.charAt(0).toUpperCase()}${rarity.slice(1)} chest`;
  const reward = (icon, value, label) =>
    `<div class="reward-chip">${icon}<b>+${value}</b><span>${label}</span></div>`;
  const chips = [
    res.coins ? reward(ui.coin(20), ui.fmt(res.coins), 'coins') : '',
    res.gems ? reward(ui.gem(20), res.gems, 'gem' + (res.gems > 1 ? 's' : '')) : '',
    res.freeze ? reward(ui.icon('snow', 20), res.freeze, 'streak freeze') : '',
  ].join('');
  const body = `<div class="chest-hero">${ui.chestSvg(132)}</div>
    <p class="center small muted">${rarity === 'common' ? 'Coins for the satchel.' : 'A little luck, honestly earned.'}</p>
    <div class="reward-grid mt-4">${chips}</div>`;
  ui.sheet({ title, body, actions: [{ label: 'Collect all' }] });
}

function openChestNow() {
  const res = openChest();
  if (!res) {
    ui.toast('No chest to open yet');
    return;
  }
  audio.sfx('chest');
  if (res.rarity !== 'common') ui.confetti({ count: res.rarity === 'legendary' ? 46 : 24 });
  router.refresh();
  setTimeout(() => showChestResult(res), 190);
}

// ---------- cards ----------
function heroHTML() {
  const slots = state.chest.slots;
  return `<div class="q-hero">
    <div class="q-hero-top">
      <div>
        <div class="overline">Chest meter</div>
        <div class="q-hero-title">${slots}/3 — ${slots >= 3 ? 'chest ready' : 'chest ready at 3'}</div>
      </div>
      <div class="chest-slots">${chestSlotsHTML(slots)}</div>
    </div>
    <div class="bar bar--amber q-hero-bar">
      <i style="width:${ui.pct((slots / 3) * 100)}%"></i>
    </div>
    <div class="q-hero-foot">
      <span class="small muted">${
        slots === 0
          ? 'Complete a lesson to fill a slot.'
          : slots >= 3
            ? '3 chests waiting. Open one now.'
            : 'One more lesson fills the meter.'
      }</span>
      <button class="btn btn-primary btn-sm" data-open-chest type="button" ${
        slots ? '' : 'disabled'
      }>${slots ? 'Open chest' : 'No chest yet'}</button>
    </div>
  </div>`;
}

function questCardHTML(q) {
  const progress = Math.min(q.target, questProgress(q));
  const pct = ui.pct((progress / q.target) * 100);
  const slotClass = q.slot === 'stretch' ? 'is-stretch' : q.slot === 'medium' ? 'is-medium' : 'is-easy';
  return `<div class="quest q-card ${q.done ? 'quest--done' : ''}">
    <div class="quest-ico q-ico ${slotClass}">${ui.icon(q.done ? 'check' : q.icon || 'quests', 22)}</div>
    <div class="quest-body">
      <div class="q-title-row">
        <span class="quest-title">${ui.esc(q.title)}</span>
        ${q.done ? `<span class="pill pill--sm pill--mint q-done-pill">${ui.icon('check', 13)} Done</span>` : ''}
      </div>
      <div class="quest-meta">${progress}/${q.target}</div>
      <div class="bar bar--thin q-bar ${q.done ? 'bar--mint' : ''}">
        <i style="width:${pct}%"></i>
      </div>
    </div>
    <div class="q-side">
      <div class="quest-reward">
        <span>+${q.rewardXp} XP</span>
        <span class="q-coin">${ui.coin(12)} +${q.rewardCoins}</span>
      </div>
      ${
        q.done
          ? `<span class="q-reroll-used">${ui.icon('check', 14)}</span>`
          : q.rerolled
            ? `<span class="q-reroll-used">Reroll used</span>`
            : `<button class="icon-btn q-reroll" data-reroll="${ui.esc(q.id)}" type="button"
                 aria-label="Reroll quest" title="One free reroll">${ui.icon('refresh', 15)}</button>`
      }
    </div>
  </div>`;
}

function weeklyHTML() {
  const days = weekDays();
  const xpWeek = state.league.xpWeek || 0;
  const goalsClaimed = state.flags.weeklyGoalsClaimed === clock.weekId();
  const xpClaimed = state.flags.weeklyXpClaimed === clock.weekId();

  return `<section class="q-weekly-wrap">
    <div class="row-between q-section-head">
      <h2 class="h3">Weekly quests</h2>
      <span class="pill pill--sm">auto</span>
    </div>

    <div class="q-weekly ${goalsClaimed ? 'is-claimed' : ''}">
      <div class="q-weekly-top">
        <div class="quest-ico q-ico is-easy">${ui.icon('target', 22)}</div>
        <div class="grow">
          <div class="q-weekly-title">Complete 5 daily goals</div>
          <div class="q-weekly-sub">${days} of 5 active days this week</div>
        </div>
        <span class="pill pill--sm ${goalsClaimed ? 'pill--mint' : ''}">${
          goalsClaimed ? 'Collected' : 'auto'
        }</span>
      </div>
      <div class="q-weekly-meter">
        <span>${Math.min(days, 5)}/5</span>
        <span>${ui.gem(13)} 1 gem · ${ui.coin(13)} 200</span>
      </div>
      <div class="bar bar--thin bar--mint">
        <i style="width:${ui.pct((days / 5) * 100)}%"></i>
      </div>
    </div>

    <div class="q-weekly ${xpClaimed ? 'is-claimed' : ''}">
      <div class="q-weekly-top">
        <div class="quest-ico q-ico is-stretch">${ui.icon('bolt', 22)}</div>
        <div class="grow">
          <div class="q-weekly-title">Earn 3,000 XP</div>
          <div class="q-weekly-sub">${ui.fmt(Math.min(xpWeek, 3000))} / 3,000 XP this week</div>
        </div>
        <span class="pill pill--sm ${xpClaimed ? 'pill--mint' : ''}">${
          xpClaimed ? 'Collected' : 'auto'
        }</span>
      </div>
      <div class="q-weekly-meter">
        <span>${ui.fmt(Math.min(xpWeek, 3000))} XP</span>
        <span>2 chest slots · ${ui.coin(13)} 100</span>
      </div>
      <div class="bar bar--thin bar--amber">
        <i style="width:${ui.pct((xpWeek / 3000) * 100)}%"></i>
      </div>
    </div>
  </section>`;
}

function emptyHTML() {
  return `<div class="q-empty">
    <div class="q-empty-ico">${ui.icon('quests', 30)}</div>
    <p class="q-empty-title">Quests are loading — pull the day refresh</p>
    <button class="btn btn-primary btn-sm mt-4" data-refresh-day type="button">Refresh today</button>
  </div>`;
}

export default {
  id: 'quests',
  title: 'Quests',
  nav: 'quests',
  hideNav: false,

  render() {
    collectQuests();
    awardWeeklies();

    const items = state.quests.items || [];
    const done = items.filter((q) => q.done).length;

    return `<section class="screen quests">
      <div class="quests-stack stagger">
        <header class="q-head">
          <h1 class="screen-title">Daily quests</h1>
          <div class="q-head-sub">
            <span class="q-countdown">${ui.icon('clock', 14)} <span data-countdown>${resetLabel()}</span></span>
            <span class="q-date">${dateLabel()}</span>
          </div>
        </header>

        ${heroHTML()}

        <section class="q-list">
          <div class="row-between q-section-head">
            <h2 class="h3">Today</h2>
            <span class="small muted">${done}/3 done</span>
          </div>
          ${items.length ? items.map(questCardHTML).join('') : emptyHTML()}
        </section>

        ${weeklyHTML()}

        <p class="q-footer">Quests reset at midnight, local time.</p>
      </div>
    </section>`;
  },

  mount(root) {
    pendingToasts.splice(0).forEach((q) => {
      ui.toast(q.allDone ? 'All daily quests done · +50 coins' : `Quest complete · ${q.title}`, {
        icon: 'check',
        tone: 'mint',
      });
    });
    pendingAwards.splice(0).forEach((msg) => {
      ui.toast(msg, { icon: 'sparkle', tone: 'amber' });
    });

    root.querySelector('[data-open-chest]')?.addEventListener('click', openChestNow);

    root.querySelectorAll('[data-reroll]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.reroll;
        const idx = state.quests.items.findIndex((q) => q.id === id);
        const ok = rerollQuest(id);
        if (!ok) {
          ui.toast('No reroll left for this quest');
          return;
        }
        const next = idx >= 0 ? state.quests.items[idx] : null;
        audio.sfx('tap');
        router.refresh();
        ui.toast(next ? `New quest · ${next.title}` : 'Quest rerolled', {
          icon: 'refresh',
          tone: 'mint',
        });
      });
    });

    root.querySelector('[data-refresh-day]')?.addEventListener('click', () => {
      refreshDay();
      router.refresh();
      ui.toast('Fresh day, fresh quests', { icon: 'sparkle', tone: 'mint' });
    });

    clearInterval(ticker);
    ticker = setInterval(() => {
      const el = root.querySelector('[data-countdown]');
      if (el) el.textContent = resetLabel();
    }, 30000);
  },

  destroy() {
    clearInterval(ticker);
    ticker = null;
  },
};
