// Co-op Expedition — a shared weekly goal with labelled pace-setters and a role.
import { state } from '../core/store.js';
import { expeditionData, chooseRole, ROLES, mode, setMode, seeChapter } from '../core/engagement.js';
import * as ui from '../core/ui.js';
import * as audio from '../core/audio.js';
import { router } from '../core/router.js';

function roleCard(id, data) {
  const r = ROLES[id];
  const on = data.role === id;
  return `<button class="ex-role ${on ? 'is-on' : ''}" data-role="${id}" type="button" aria-pressed="${on}">
    <span class="ex-role-emoji">${r.emoji}</span>
    <span class="ex-role-name">${r.name}<em>${r.ko}</em></span>
    <span class="ex-role-line">${r.line}</span>
    ${on ? `<span class="ex-role-check">${ui.icon('check', 14)}</span>` : ''}
  </button>`;
}

export default {
  id: 'expedition',
  title: 'Co-op Expedition',
  nav: null,
  hideNav: true,
  render() {
    const d = expeditionData();
    const isMode = mode() === 'expedition';
    const roleName = d.roleMeta?.name || 'No role yet';
    return `<section class="screen expedition">
      <div class="labhub-top">
        <button class="icon-btn" data-back="lab" type="button" aria-label="Back">${ui.icon('back', 22)}</button>
        <div class="grow">
          <span class="overline">Alternative 03</span>
          <h1 class="h2">Co-op Expedition</h1>
        </div>
        <span class="pill pill--mint pill--sm">Day ${d.days} / 7</span>
      </div>

      ${
        !isMode
          ? `<div class="lab-preview-banner"><b>Preview mode.</b><span>Pick a role to see the weekly co-op loop.</span><button class="btn btn-primary btn-sm" data-activate type="button">Activate</button></div>`
          : `<div class="lab-active-banner">Running: <b>Co-op Expedition</b> — your XP counts for the group.</div>`
      }

      <div class="ex-hero">
        <span class="overline">This week · Seoul in five days</span>
        <h2>${d.complete ? 'The expedition made it.' : `${ui.fmt(Math.max(0, d.goal - d.total))} XP to the week’s goal`}</h2>
        <div class="ex-bar">
          <div class="bar bar--thick"><i style="width:${ui.pct(d.pct)}%"></i></div>
          <div class="ex-bar-meta"><b>${ui.fmt(d.total)}</b><span>/ ${ui.fmt(d.goal)} XP</span></div>
        </div>
        <div class="ex-split">
          <div><span class="lab-k">Your contribution</span><b>${ui.fmt(d.mine)} XP</b></div>
          <div><span class="lab-k">Pace-setters</span><b>${ui.fmt(d.total - d.mine)} XP</b></div>
          <div><span class="lab-k">Role</span><b>${ui.esc(roleName)}</b></div>
        </div>
      </div>

      <div class="ex-section-head">
        <h3>Choose your role</h3>
        <span class="small muted">changes which tasks pay +10% XP</span>
      </div>
      <div class="ex-roles">
        ${Object.keys(ROLES).map((id) => roleCard(id, d)).join('')}
      </div>

      <div class="ex-section-head">
        <h3>Expedition party</h3>
        <span class="small muted">pace-setters, not people</span>
      </div>
      <div class="ex-party">
        ${d.npcs
          .map(
            (n, i) => `<div class="ex-member">
              <span class="ex-ava">${ui.avatar(['tiger', 'rabbit', 'bear', 'chick'][i % 4], 34)}</span>
              <div class="ex-member-body">
                <b>${ui.esc(n.name)} <span class="ex-pacer">PACE-SETTER</span></b>
                <span>${ui.esc(n.role)} · ${n.pace} XP/day</span>
              </div>
              <span class="ex-xp">${ui.fmt(n.xp)} XP</span>
            </div>`
          )
          .join('')}
        <div class="ex-member is-you">
          <span class="ex-ava">${ui.avatar(state.profile.avatar, 34)}</span>
          <div class="ex-member-body">
            <b>${ui.esc(state.profile.name || 'You')} <span class="ex-you">YOU</span></b>
            <span>${d.roleMeta ? d.roleMeta.name : 'Pick a role'}</span>
          </div>
          <span class="ex-xp">${ui.fmt(d.mine)} XP</span>
        </div>
      </div>

      <div class="ex-section-head">
        <h3>The diary</h3>
        <span class="small muted">${d.chapter} / 4 chapters</span>
      </div>
      <div class="ex-chapters">
        ${d.chapters
          .map((c, i) => {
            const open = d.pct >= c.at * 100;
            return `<button class="ex-chapter ${open ? 'is-open' : ''}" data-chapter="${i}" type="button">
              <span class="ex-ch-num">${String(i + 1).padStart(2, '0')}</span>
              <span class="ex-ch-body"><b>${ui.esc(c.title)}</b><em>${ui.esc(c.ko)}</em></span>
              <span class="ex-ch-state">${open ? ui.icon('check', 16) : ui.icon('lock', 15)}</span>
            </button>`;
          })
          .join('')}
      </div>

      <div class="card lab-why">
        <h3>Why this might retain better</h3>
        <p><b>Relatedness</b> — a goal that is not only about the self. <b>Role identity</b> — “Scribe” makes typing feel like a contribution. <b>Weekly arc</b> — a longer finish line than the daily streak, with a story attached.</p>
        <p class="small muted">Risk: fake social pressure. The party is explicitly labelled “pace-setter, not people”, and a real cohort can replace them 1:1 without changing the UI.</p>
      </div>

      <button class="btn btn-primary btn-block" data-go="home" type="button">Earn XP for the expedition ${ui.icon('arrow', 18)}</button>
    </section>`;
  },
  mount(root) {
    root.querySelector('[data-activate]')?.addEventListener('click', () => {
      setMode('expedition');
      audio.sfx('levelup');
      ui.toast('Co-op Expedition activated', { icon: 'user', tone: 'mint' });
      router.refresh();
    });
    root.querySelectorAll('[data-role]').forEach((b) =>
      b.addEventListener('click', () => {
        chooseRole(b.dataset.role);
        audio.sfx('tap');
        ui.toast(`${ROLES[b.dataset.role].name}: ${ROLES[b.dataset.role].line}`, { icon: 'sparkle', tone: 'mint' });
        router.refresh();
      })
    );
    root.querySelectorAll('[data-chapter]').forEach((b) =>
      b.addEventListener('click', () => {
        const i = Number(b.dataset.chapter);
        const d = expeditionData();
        const c = d.chapters[i];
        if (d.pct < c.at * 100) {
          ui.toast(`Unlocks at ${Math.round(c.at * 100)}% of the weekly goal`, { tone: 'amber' });
          return;
        }
        seeChapter(i);
        audio.sfx('tap');
        ui.sheet({
          title: c.title,
          body: `<p class="ex-ch-ko" lang="ko">${ui.esc(c.ko)}</p><p class="ex-ch-text">${ui.esc(c.text)}</p>`,
          actions: [{ label: 'Close', cls: 'btn-ghost' }],
        });
      })
    );
  },
};
