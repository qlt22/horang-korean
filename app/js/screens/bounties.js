// Bounty Board — the learner chooses one challenge per day, no stake, no penalty.
import { state } from '../core/store.js';
import {
  ensureBounties,
  bountyProgress,
  activeBounty,
  acceptBounty,
  claimBounty,
  mode,
  setMode,
} from '../core/engagement.js';
import * as ui from '../core/ui.js';
import * as audio from '../core/audio.js';
import { router } from '../core/router.js';

function prettyDate(d) {
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return d;
  }
}

const TIER = {
  safe: { label: 'Safe', tone: 'mint', note: 'Low target, small reward. A bad day still finishes.' },
  risky: { label: 'Risky', tone: 'amber', note: 'One clean run. Rewards focus, not volume.' },
  epic: { label: 'Epic', tone: 'coral', note: 'The hard one. Rare, visible, worth showing.' },
};

function rewardChips(r = {}) {
  return [
    r.coins ? `<span class="bo-reward">${ui.coin(14)} +${r.coins}</span>` : '',
    r.xp ? `<span class="bo-reward">${ui.icon('bolt', 14)} +${r.xp} XP</span>` : '',
    r.gems ? `<span class="bo-reward">${ui.gem(13)} +${r.gems}</span>` : '',
  ]
    .filter(Boolean)
    .join('');
}

function card(item, activeId) {
  const t = TIER[item.tier];
  const progress = Math.min(item.target, bountyProgress(item));
  const left = Math.max(0, item.target - progress);
  const pct = (progress / item.target) * 100;
  const isActive = item.accepted;
  const ready = isActive && progress >= item.target && !item.done;
  return `<article class="bo-card bo-card--${t.tone} ${isActive ? 'is-active' : ''} ${item.done ? 'is-done' : ''}">
    <div class="bo-top">
      <span class="bo-tier">${t.label}</span>
      <span class="bo-target">${left ? `${left} to go` : 'Ready'}</span>
      ${item.done ? '<span class="bo-done">CLAIMED</span>' : isActive ? '<span class="bo-pin">ACCEPTED</span>' : ''}
    </div>
    <h2>${ui.esc(item.title)}</h2>
    <div class="bo-progress">
      <div class="bar bar--thin"><i style="width:${ui.pct(pct)}%"></i></div>
      <span>${progress} / ${item.target}</span>
    </div>
    <div class="bo-foot">
      <div class="bo-rewards">${rewardChips(item.reward)}</div>
      ${
        item.done
          ? `<span class="bo-on">Paid</span>`
          : ready
            ? `<button class="btn btn-primary btn-sm" data-claim="${item.id}" type="button">Claim</button>`
            : isActive
              ? `<span class="bo-on">In progress</span>`
              : `<button class="btn btn-secondary btn-sm" data-accept="${item.id}" type="button">Accept</button>`
      }
    </div>
    <p class="bo-note">${t.note}</p>
  </article>`;
}

export default {
  id: 'bounties',
  title: 'Bounty Board',
  nav: null,
  hideNav: true,
  render() {
    const b = ensureBounties();
    const active = activeBounty();
    const activeProgress = active ? Math.min(active.target, bountyProgress(active)) : 0;
    const activeReady = active && activeProgress >= active.target;
    const done = b.items.filter((x) => x.done).length;
    const isMode = mode() === 'bounties';
    return `<section class="screen bounties">
      <div class="labhub-top">
        <button class="icon-btn" data-back="lab" type="button" aria-label="Back">${ui.icon('back', 22)}</button>
        <div class="grow">
          <span class="overline">Alternative 02</span>
          <h1 class="h2">Bounty Board</h1>
        </div>
        <span class="pill pill--amber pill--sm">${ui.esc(prettyDate(b.date))}</span>
      </div>

      ${
        !isMode
          ? `<div class="lab-preview-banner"><b>Preview mode.</b><span>Accept a bounty to see the commitment loop.</span><button class="btn btn-primary btn-sm" data-activate type="button">Activate</button></div>`
          : `<div class="lab-active-banner">Running: <b>Bounty Board</b> — one chosen challenge a day.</div>`
      }

      <div class="bo-hero ${active ? 'has-active' : ''}">
        <div>
          <span class="overline">${active ? 'Your contract' : 'Choose your day'}</span>
          <h2>${active ? ui.esc(active.title) : 'Three ways to push today.'}</h2>
          <p>${active ? (activeReady ? 'Done. The reward is waiting.' : 'Progress counts across the whole day.') : 'Safe, risky or epic. Pick the difficulty you actually want.'}</p>
        </div>
        ${
          active
            ? `<div class="bo-hero-ring">${ui.ring((activeProgress / active.target) * 100, { size: 74, stroke: 8, color: activeReady ? 'var(--mint-400)' : 'var(--amber-400)' })}<b>${activeProgress}/${active.target}</b></div>`
            : `<div class="bo-hero-mascot">${ui.mascot(88, 'think')}</div>`
        }
      </div>

      <div class="bo-list">${b.items.map((i) => card(i, b.active)).join('')}</div>

      <div class="bo-promise">
        <b>No stake. No penalty.</b> Failing a bounty only forfeits the bonus — it never costs coins, XP, mastery or a streak. The risk is the challenge, not your progress.
      </div>

      <div class="card lab-why">
        <h3>Why this might retain better</h3>
        <p><b>Autonomy</b> — choosing the difficulty is itself motivating. <b>Flow</b> — three explicit challenge levels. <b>Commitment</b> — accepting changes the Home CTA and creates a self-set goal.</p>
        <p class="small muted">Risk: reward-driven players may only pick Safe. The board tracks tier mix; an A/B test would watch epic acceptance and session length.</p>
      </div>

      <div class="bo-foot-row">
        <span class="small muted">${done} / 3 claimed today</span>
        <button class="btn btn-primary btn-sm" data-go="home" type="button">Earn progress ${ui.icon('arrow', 16)}</button>
      </div>
    </section>`;
  },
  mount(root) {
    root.querySelector('[data-activate]')?.addEventListener('click', () => {
      setMode('bounties');
      audio.sfx('levelup');
      ui.toast('Bounty Board activated', { icon: 'target', tone: 'mint' });
      router.refresh();
    });
    root.querySelectorAll('[data-accept]').forEach((b) =>
      b.addEventListener('click', () => {
        if (acceptBounty(b.dataset.accept)) {
          audio.sfx('stamp');
          ui.toast('Accepted. Progress counts all day.', { icon: 'target', tone: 'coral' });
          router.refresh();
        }
      })
    );
    root.querySelectorAll('[data-claim]').forEach((b) =>
      b.addEventListener('click', () => {
        const item = claimBounty(b.dataset.claim);
        if (item) {
          audio.sfx('coin');
          ui.confetti({ count: 30 });
          ui.toast(`Bounty paid: +${item.reward.coins} coins`, { icon: 'trophy', tone: 'amber' });
          router.refresh();
        } else {
          ui.toast('Not finished yet', { tone: 'amber' });
        }
      })
    );
  },
};
