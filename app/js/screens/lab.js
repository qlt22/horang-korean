// Engagement Lab — compare and activate alternative gamification systems.
import { state, levelInfo } from '../core/store.js';
import { MODES, ensureEngagement, setMode, mode } from '../core/engagement.js';
import * as ui from '../core/ui.js';
import * as audio from '../core/audio.js';
import { router } from '../core/router.js';

const ORDER = ['classic', 'constellation', 'bounties', 'expedition'];

function card(id) {
  const m = MODES[id];
  const active = mode() === id;
  return `<article class="lab-mode ${active ? 'is-active' : ''} tone-${m.tone}">
    <div class="lab-mode-top">
      <span class="lab-mode-ko">${ui.esc(m.ko)}</span>
      <span class="lab-mode-thesis">${ui.esc(m.thesis)}</span>
      ${active ? '<span class="lab-active-chip">ACTIVE</span>' : ''}
    </div>
    <h2>${ui.esc(m.name)}</h2>
    <p class="lab-mode-line">${ui.esc(m.line)}</p>
    <div class="lab-mode-grid">
      <div><span class="lab-k">Returns because</span><b>${ui.esc(m.returns)}</b></div>
      <div><span class="lab-k">Watch out</span><b>${ui.esc(m.risk)}</b></div>
    </div>
    <div class="lab-mode-actions">
      ${
        id === 'classic'
          ? `<button class="btn btn-secondary btn-sm" data-go="home" type="button">Open the course</button>`
          : `<button class="btn btn-secondary btn-sm" data-open="${m.screen}" type="button">Open prototype</button>`
      }
      ${
        active
          ? `<span class="lab-on">Running now</span>`
          : `<button class="btn btn-primary btn-sm" data-activate="${id}" type="button">Activate</button>`
      }
    </div>
  </article>`;
}

export default {
  id: 'lab',
  title: 'Engagement Lab',
  nav: null,
  hideNav: true,
  render() {
    ensureEngagement();
    const info = levelInfo();
    const current = mode();
    return `<section class="screen labhub">
      <div class="labhub-top">
        <button class="icon-btn" data-back="profile" type="button" aria-label="Back">${ui.icon('back', 22)}</button>
        <div class="grow">
          <span class="overline">Experiment branch</span>
          <h1 class="h2">Engagement Lab</h1>
        </div>
        <span class="pill pill--indigo pill--sm">gamification-lab</span>
      </div>

      <div class="labhub-hero">
        <div class="labhub-hero-txt">
          <h2>Four bets on why you come back.</h2>
          <p>The course is identical in every mode — same 60 sessions, same 288 sentences. Only the reason to open the app changes. Pick one and play it; the data model is real, not a mock.</p>
        </div>
        <div class="labhub-mascot">${ui.mascot(92, 'think')}</div>
      </div>

      <div class="labhub-current">
        <span class="lab-k">Currently running</span>
        <b>${ui.esc(MODES[current].name)}</b>
        <span class="labhub-sub">${ui.esc(MODES[current].thesis)}</span>
      </div>

      <div class="labhub-list">
        ${ORDER.map(card).join('')}
      </div>

      <div class="card labhub-method">
        <h3>How this should be tested</h3>
        <ol>
          <li>Split new learners 25 / 25 / 25 / 25 at onboarding.</li>
          <li>Primary metric: <b>retained mastery at Day 30</b> — sentences at tier ≥ 3. Not DAU.</li>
          <li>Secondary: D1 / D7 / D30, sessions per active day, breadth of grammar practised.</li>
          <li>Kill a mode that wins opens but loses mastery. The learning loop must win.</li>
        </ol>
        <p class="small muted mt-2">Design notes: <b>docs/ENGAGEMENT-ALTERNATIVES.md</b> · level ${info.level} · ${state.path.completedNodes.length}/60 sessions</p>
      </div>

      <div class="labhub-foot">
        ${
          current === 'classic'
            ? ''
            : `<button class="btn btn-ghost btn-block btn-sm" data-activate="classic" type="button">Reset to Classic</button>`
        }
        <button class="btn btn-primary btn-block" data-go="home" type="button">Back to the course ${ui.icon('arrow', 18)}</button>
      </div>
    </section>`;
  },
  mount(root) {
    root.querySelectorAll('[data-activate]').forEach((b) =>
      b.addEventListener('click', () => {
        setMode(b.dataset.activate);
        audio.sfx('levelup');
        ui.toast(`Mode: ${MODES[b.dataset.activate].name}`, { icon: 'sparkle', tone: 'mint' });
        router.refresh();
      })
    );
    root.querySelectorAll('[data-open]').forEach((b) =>
      b.addEventListener('click', () => router.go(b.dataset.open))
    );
  },
};
