// S14 · Shop — every item is earned by learning. Chest odds are shown, never hidden.
import {
  state,
  save,
  logEvent,
  purchase,
  equipCosmetic,
  openChest,
  addCoins,
} from '../core/store.js';
import * as ui from '../core/ui.js';
import * as audio from '../core/audio.js';
import router from '../core/router.js';
import * as clock from '../core/clock.js';

const FREEZE_PRICE = 200;
const BOOST_PRICE = 300;
const FOCUS_GEMS = 2;
const REPAIR_GEMS = 5;
const BOOST_MS = 15 * 60 * 1000;

const KIND_LABEL = { cosmetic: 'Outfit', background: 'Background', flair: 'Profile flair' };

const RARITY = {
  common: { label: 'Common', cls: 'common' },
  rare: { label: 'Rare', cls: 'rare' },
  epic: { label: 'Epic', cls: 'epic' },
  legendary: { label: 'Legendary', cls: 'legendary' },
};

let boostTimer = null;

function boosterLeft() {
  return Math.max(0, (state.flags.boosterUntil || 0) - clock.nowMs());
}
function fmtLeft(ms) {
  const min = Math.ceil(ms / 60000);
  return min <= 1 ? 'under a minute left' : `${min} min left`;
}
function lastSheet() {
  const all = document.querySelectorAll('.sheet');
  return all[all.length - 1] || null;
}

function slotsHtml() {
  const n = Math.min(3, state.chest.slots || 0);
  return `<span class="chest-slots" aria-label="${n} of 3 chest slots filled">${[0, 1, 2]
    .map((i) => `<span class="chest-slot ${i < n ? 'on' : ''}">${ui.icon('chest', 13)}</span>`)
    .join('')}</span>`;
}

/* ---------------- chest flows ---------------- */

function emptyChestSheet() {
  ui.sheet({
    title: 'No chests yet',
    body: `<div class="chest-empty">
      ${ui.mascot(112, 'sleepy')}
      <p class="h3 mt-2">Your next chest is one node away.</p>
      <p class="small muted mt-2">Every node you finish adds a slot — up to 3 a day. Slots refill at midnight and chests are never sold.</p>
    </div>`,
    actions: [
      { label: 'Start a node', onClick: () => router.go('lesson', { node: state.path.currentNode || 0 }) },
      { label: 'Not now', cls: 'btn-ghost' },
    ],
  });
}

function openChestSheet() {
  if ((state.chest.slots || 0) <= 0) {
    emptyChestSheet();
    return;
  }
  const close = ui.sheet({
    title: 'Daily chest',
    dismiss: true,
    body: `<div class="chest-hero">
      <div class="chest-wrap">
        <button class="chest-btn" data-chest-tap type="button" aria-label="Open the chest">${ui.chestSvg(160)}</button>
      </div>
      <p class="chest-hint" data-chest-hint>Tap to open</p>
      <p class="small muted" data-chest-slots>${state.chest.slots} of 3 chests ready today</p>
    </div>
    <div data-chest-result></div>`,
  });
  const box = lastSheet();
  const tap = box?.querySelector('[data-chest-tap]');
  const hint = box?.querySelector('[data-chest-hint]');
  const out = box?.querySelector('[data-chest-result]');
  if (!tap || !hint || !out) return;

  let opened = false;
  tap.addEventListener('click', () => {
    if (opened) return;
    opened = true;
    tap.classList.add('is-shaking');
    hint.textContent = 'Opening…';
    audio.sfx('chest');

    setTimeout(() => {
      const reward = openChest();
      tap.classList.remove('is-shaking');
      if (!reward) {
        hint.textContent = 'No chests left today';
        return;
      }
      tap.classList.add('is-open');
      hint.hidden = true;
      const slotsLine = box.querySelector('[data-chest-slots]');
      if (slotsLine) {
        slotsLine.textContent = `${state.chest.slots} of 3 chests ready today`;
      }
      const meta = RARITY[reward.rarity] || RARITY.common;
      const big = reward.rarity !== 'common';
      hint.textContent = `${meta.label} chest`;

      if (big) {
        ui.confetti({
          count: reward.rarity === 'legendary' ? 64 : 34,
          colors:
            reward.rarity === 'legendary'
              ? ['#FFD166', '#FF6B4A', '#FFF1C9', '#7BE0C3']
              : undefined,
        });
        audio.sfx(reward.rarity === 'legendary' ? 'levelup' : 'coin');
      } else {
        audio.sfx('coin');
      }

      const rewards = [`<span class="reward">${ui.coin(20)} +${ui.fmt(reward.coins)} coins</span>`];
      if (reward.gems) {
        rewards.push(
          `<span class="reward">${ui.gem(18)} +${reward.gems} gem${reward.gems > 1 ? 's' : ''}</span>`
        );
      }
      if (reward.freeze) {
        rewards.push(`<span class="reward">${ui.icon('snow', 18)} +${reward.freeze} Streak Freeze</span>`);
      }

      out.innerHTML = `<div class="chest-result">
        <span class="rarity-pill r-${meta.cls}">${meta.label} chest</span>
        <div class="reward-row">${rewards.join('')}</div>
        <button class="btn btn-primary btn-block" data-collect type="button">Collect all</button>
      </div>`;

      const collect = out.querySelector('[data-collect]');
      collect?.addEventListener('click', () => {
        close();
        router.refresh();
      });
      collect?.focus();
    }, 520);
  });
}

function oddsSheet() {
  const pityRare = Math.min(4, state.chest.pityRare || 0);
  const pityEpic = Math.min(14, state.chest.pityEpic || 0);
  const neverOpened = (state.chest.totalOpened || 0) === 0;
  ui.sheet({
    title: 'Chest odds',
    dismiss: true,
    body: `<p class="small muted">These are the exact probabilities in the game code — no hidden weights, no paid chests, no countdown offers.</p>
    <table class="odds-table">
      <thead><tr><th>Rarity</th><th>Chance</th><th>Contents</th></tr></thead>
      <tbody>
        <tr><td><b class="r-common">Common</b></td><td class="tabular">70%</td><td>20–40 coins</td></tr>
        <tr><td><b class="r-rare">Rare</b></td><td class="tabular">25%</td><td>60–90 coins</td></tr>
        <tr><td><b class="r-epic">Epic</b></td><td class="tabular">4.7%</td><td>150 coins + 1 gem</td></tr>
        <tr><td><b class="r-legendary">Legendary</b></td><td class="tabular">0.3%</td><td>500 coins + 2 gems + 1 Streak Freeze</td></tr>
      </tbody>
    </table>
    <div class="odds-pity">
      <div class="pity-row"><span class="pity-ico">${ui.icon('refresh', 16)}</span><span><b>Rare+ pity:</b> a Rare or better is guaranteed after 4 Commons in a row. You’re at ${pityRare}/4.</span></div>
      <div class="pity-row"><span class="pity-ico">${ui.icon('refresh', 16)}</span><span><b>Epic+ pity:</b> an Epic or better is guaranteed after 14 chests without one. You’re at ${pityEpic}/14.</span></div>
      <div class="pity-row"><span class="pity-ico">${ui.icon('sparkle', 16)}</span><span>${neverOpened ? 'Your first chest is always a Rare.' : `Chests opened so far: ${ui.fmt(state.chest.totalOpened || 0)}.`}</span></div>
    </div>
    <p class="g-note">A chest slot comes from finishing a node — max 3 per day. Real money buys nothing here.</p>`,
    actions: [{ label: 'Got it' }],
  });
}

/* ---------------- screen ---------------- */

export default {
  id: 'shop',
  title: 'Shop',
  nav: 'shop',
  hideNav: false,

  render() {
    const freezes = state.streak.freezes || 0;
    const maxFreeze = freezes >= 2;
    const booster = boosterLeft();
    const boosterActive = booster > 0;
    const lostStreak = !!(state.flags.streakLost && state.flags.prevStreak);
    const focus = Math.max(0, Math.min(5, state.focus || 0));
    const focusFull = focus >= 5;
    const slots = Math.min(3, state.chest.slots || 0);

    const cosmetics = state.inventory
      .map((item, i) => {
        const action = item.owned
          ? item.equipped
            ? `<span class="chip chip-mint shop-state">Equipped</span>`
            : `<button class="btn btn-sm btn-secondary shop-buy" data-equip="${ui.esc(item.id)}" type="button">Equip</button>`
          : `<button class="btn btn-sm btn-primary shop-buy" data-buy-item="${ui.esc(item.id)}" type="button">${ui.coin(15)} ${ui.fmt(item.price)}</button>`;
        return `<div class="shop-tile g-rise" style="--i:${6 + Math.min(i, 6)}">
          <div class="shop-art">${ui.esc(item.art)}</div>
          <div class="shop-name">${ui.esc(item.name)}</div>
          <div class="shop-kind">${KIND_LABEL[item.kind] || 'Item'}</div>
          ${action}
        </div>`;
      })
      .join('');

    return `<section class="screen shop">
      <header class="top g-rise" style="--i:0">
        <h1 class="screen-title">Shop</h1>
        <div class="top-right">
          <span class="pill pill--amber g-pill" aria-label="Coins">${ui.coin(18)} ${ui.fmt(state.coins)}</span>
          <span class="pill pill--mint g-pill" aria-label="Gems">${ui.gem(16)} ${state.gems}</span>
        </div>
      </header>

      <div class="shop-hero g-rise" style="--i:1">
        <div class="shop-hero-top">
          <div class="shop-hero-art">${ui.icon('snow', 34)}</div>
          <div class="grow">
            <div class="shop-hero-kicker">Streak insurance</div>
            <h2>Streak Freeze</h2>
            <p>One missed day won’t break your flame. It applies on its own — no sad screen.</p>
          </div>
        </div>
        <div class="freeze-hold">
          <span class="freeze-dot ${freezes >= 1 ? 'on' : ''}">${ui.icon('snow', 15)}</span>
          <span class="freeze-dot ${freezes >= 2 ? 'on' : ''}">${ui.icon('snow', 15)}</span>
          <span>${freezes} / 2 held</span>
        </div>
        <div class="shop-hero-cta">
          <button class="btn ${maxFreeze ? 'btn-secondary' : 'btn-primary'} btn-block" data-buy-freeze type="button">
            ${maxFreeze ? 'Max held — 2 / 2' : `${ui.coin(18)} Buy for ${FREEZE_PRICE}`}
          </button>
        </div>
      </div>

      <section class="g-sec">
        <div class="g-sec-head">
          <h2>Chests</h2>
          <button class="g-link" data-odds type="button">${ui.icon('info', 15)} Real odds</button>
        </div>

        <div class="chest-card g-rise" style="--i:2">
          <div class="chest-card-top">
            <div class="chest-art">${ui.chestSvg(74)}</div>
            <div class="grow">
              <div class="chest-title">Daily chest <span class="chip chip-amber chest-free">Free</span></div>
              <div class="chest-sub">${slots} / 3 slots today${slots === 0 ? ' · one node fills one' : ''}</div>
              ${slotsHtml()}
            </div>
            <button class="btn ${slots ? 'btn-primary' : 'btn-secondary'} btn-sm chest-open" data-open-chest type="button">
              ${slots ? 'Open' : 'Empty'}
            </button>
          </div>
          <p class="g-note">Each finished node fills a slot — max 3 a day. Chests reset at midnight and are never for sale.</p>
        </div>
      </section>

      <section class="g-sec">
        <div class="g-sec-head"><h2>Boosts</h2></div>
        <div class="boost-list g-rise" style="--i:3">
          <div class="boost-row">
            <div class="boost-ico">${ui.icon('bolt', 20)}</div>
            <div class="grow">
              <div class="boost-name">2× XP booster
                ${boosterActive ? `<span class="chip chip-mint boost-live" data-boost-left>${fmtLeft(booster)}</span>` : `<span class="chip chip-amber">15 min</span>`}
              </div>
              <div class="boost-sub">${boosterActive ? 'Active now — double XP on graded answers.' : 'Double XP on graded answers for 15 minutes.'}</div>
            </div>
            <button class="btn btn-sm ${boosterActive ? 'btn-secondary' : 'btn-primary'} boost-btn" data-buy-boost type="button" ${boosterActive ? 'disabled' : ''}>
              ${boosterActive ? 'Active' : `${ui.coin(15)} ${BOOST_PRICE}`}
            </button>
          </div>

          <div class="boost-row">
            <div class="boost-ico boost-ico--heart">${ui.icon('heart', 20)}</div>
            <div class="grow">
              <div class="boost-name">Focus refill <span class="chip chip-mint">free at midnight</span></div>
              <div class="boost-sub">${focusFull ? `Focus is full — ${focus} / 5.` : `${focus} / 5 focus. Refill to 5 for challenge nodes.`}</div>
            </div>
            <button class="btn btn-sm ${focusFull ? 'btn-secondary' : 'btn-primary'} boost-btn" data-buy-focus type="button" ${focusFull ? 'disabled' : ''}>
              ${focusFull ? 'Full' : `${ui.gem(14)} ${FOCUS_GEMS}`}
            </button>
          </div>

          <div class="boost-row">
            <div class="boost-ico boost-ico--snow">${ui.icon('flame', 20)}</div>
            <div class="grow">
              <div class="boost-name">Streak repair ${lostStreak ? '<span class="chip chip-coral">available</span>' : ''}</div>
              <div class="boost-sub">${lostStreak ? `Restore your ${state.flags.prevStreak} day streak — once per repair.` : 'No streak to repair.'}</div>
            </div>
            <button class="btn btn-sm ${lostStreak ? 'btn-primary' : 'btn-secondary'} boost-btn" data-buy-repair type="button" ${lostStreak ? '' : 'disabled'}>
              ${lostStreak ? `${ui.gem(14)} ${REPAIR_GEMS}` : 'No streak'}
            </button>
          </div>
        </div>
      </section>

      <section class="g-sec">
        <div class="g-sec-head"><h2>Cosmetics</h2><span class="g-sec-note">Coins only</span></div>
        <div class="shop-grid stagger">${cosmetics}</div>
      </section>

      <p class="g-footer">Everything here is earned by learning. Nothing costs real money.</p>
    </section>`;
  },

  mount(root) {
    root.querySelectorAll('[data-buy-freeze]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const result = purchase('freeze');
        if (result.ok) {
          audio.sfx('coin');
          ui.toast(`Freeze added — ${state.streak.freezes} of 2 held.`, { icon: 'snow', tone: 'mint' });
          router.refresh();
          return;
        }
        if (result.reason === 'max') {
          ui.toast('You’re holding both freezes — that’s the max. They apply automatically.', { icon: 'snow' });
          return;
        }
        if (result.reason === 'coins') {
          ui.toast(`Need ${ui.fmt(FREEZE_PRICE - state.coins)} more coins. Two nodes will do it.`, {
            icon: 'coin',
            tone: 'amber',
          });
        }
      })
    );

    root.querySelector('[data-open-chest]')?.addEventListener('click', () => openChestSheet());
    root.querySelector('[data-odds]')?.addEventListener('click', () => oddsSheet());

    root.querySelector('[data-buy-boost]')?.addEventListener('click', () => {
      if (boosterLeft() > 0) {
        ui.toast('Your 2× booster is already running.', { icon: 'bolt' });
        return;
      }
      if (state.coins < BOOST_PRICE) {
        ui.toast(`Need ${ui.fmt(BOOST_PRICE - state.coins)} more coins for a booster.`, {
          icon: 'coin',
          tone: 'amber',
        });
        return;
      }
      addCoins(-BOOST_PRICE);
      state.flags.boosterUntil = clock.nowMs() + BOOST_MS;
      logEvent('purchase', { item: 'booster_2x', cost: BOOST_PRICE });
      save();
      audio.sfx('coin');
      ui.toast('2× XP for 15 minutes — go answer something.', { icon: 'bolt', tone: 'mint' });
      router.refresh();
    });

    root.querySelector('[data-buy-focus]')?.addEventListener('click', () => {
      const result = purchase('focus');
      if (result.ok) {
        audio.sfx('coin');
        ui.toast('Focus refilled to 5.', { icon: 'heart', tone: 'mint' });
        router.refresh();
        return;
      }
      if (result.reason === 'gems') {
        ui.toast(`Need ${FOCUS_GEMS - state.gems} more gems.`, { icon: 'gem' });
      }
    });

    root.querySelector('[data-buy-repair]')?.addEventListener('click', () => {
      const lost = !!(state.flags.streakLost && state.flags.prevStreak);
      if (!lost) {
        ui.toast('No streak to repair right now.', { icon: 'flame' });
        return;
      }
      if (state.gems < REPAIR_GEMS) {
        ui.toast(`Need ${REPAIR_GEMS - state.gems} more gems. Gems come from levels and chests.`, { icon: 'gem' });
        return;
      }
      state.gems -= REPAIR_GEMS;
      state.streak.current = state.flags.prevStreak;
      state.streak.lastGoalDate = clock.yesterdayKey();
      state.streak.repairUsedAt = clock.today();
      state.flags.streakLost = false;
      state.flags.prevStreak = 0;
      state.flags.repairOffered = true;
      logEvent('streak_repaired', { days: state.streak.current });
      save();
      audio.sfx('streak');
      ui.toast(`Streak restored — ${state.streak.current} days.`, { icon: 'flame', tone: 'mint' });
      router.refresh();
    });

    root.querySelectorAll('[data-buy-item]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const id = btn.dataset.buyItem;
        const item = state.inventory.find((x) => x.id === id);
        if (!item) return;
        const result = purchase(id);
        if (result.ok) {
          audio.sfx('coin');
          ui.toast(`${item.name} is yours — equip it below.`, { icon: 'sparkle', tone: 'mint' });
          router.refresh();
          return;
        }
        if (result.reason === 'coins') {
          ui.toast(`Need ${ui.fmt(item.price - state.coins)} more coins for ${item.name}.`, {
            icon: 'coin',
            tone: 'amber',
          });
        } else if (result.reason === 'owned') {
          ui.toast('Already owned — hit Equip.', { icon: 'check' });
        }
      })
    );

    root.querySelectorAll('[data-equip]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const id = btn.dataset.equip;
        const item = state.inventory.find((x) => x.id === id);
        if (!item) return;
        equipCosmetic(id);
        audio.sfx('stamp');
        ui.toast(`${item.name} equipped.`, { icon: 'check', tone: 'mint' });
        router.refresh();
      })
    );

    if (boosterLeft() > 0) {
      const label = root.querySelector('[data-boost-left]');
      boostTimer = setInterval(() => {
        const left = boosterLeft();
        if (!label) return;
        if (left <= 0) {
          clearInterval(boostTimer);
          boostTimer = null;
          router.refresh();
          return;
        }
        label.textContent = fmtLeft(left);
      }, 1000);
    }
  },

  destroy() {
    if (boostTimer) {
      clearInterval(boostTimer);
      boostTimer = null;
    }
  },
};
