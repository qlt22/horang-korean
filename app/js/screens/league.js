// S13 · Week League — 30-person cohort, labelled pacers, top 5 promote.
import { state, ensureLeague, rankLeague, save } from '../core/store.js';
import * as ui from '../core/ui.js';
import * as audio from '../core/audio.js';
import router from '../core/router.js';
import * as clock from '../core/clock.js';

const PROMOTE = 5;
const AT_RISK = 5;
const TIERS = ['Bronze', 'Silver', 'Gold', 'Sapphire', 'Ruby', 'Diamond'];

let tab = 'week';
// Which `?tab=` this screen already honoured. Refresh/state updates must not
// re-apply a stale URL value after the learner has changed tabs.
let appliedRouteTab = null;

function weekMsLeft() {
  const d = clock.now();
  const dow = (d.getDay() + 6) % 7; // Mon = 0
  const end = new Date(d);
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + (7 - dow));
  return Math.max(0, end.getTime() - d.getTime());
}

function pacerAvatar(name) {
  let h = 0;
  for (const ch of String(name || 'p')) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return ui.AVATARS[h % ui.AVATARS.length];
}

/**
 * Core zeroes every cohort score on a week boundary but only re-seeds pacers when
 * the member list is empty. Re-derive their pace locally so the ladder stays alive
 * instead of showing 30 people on 0 XP.
 */
function reseedPacers() {
  const pacers = state.league.members.filter((m) => m.isPacer);
  if (!pacers.length || pacers.some((m) => m.xp > 0)) return;
  const base = Math.max(120, Math.round(state.stats.xpByDay[clock.today()] || 120)) * 5;
  const seed = (state.day + 3) * 37;
  pacers.forEach((m, i) => {
    const factor = 0.55 + (((seed + i * 13) % 90) / 100) * 1.1;
    m.xp = Math.round((base * factor) / 10) * 10;
  });
  save();
}

/** Core's pacer pool repeats a few names; keep the ladder readable. */
function withLabels(rows) {
  const seen = {};
  rows.forEach((r) => {
    if (r.isYou) {
      r.label = r.name;
      return;
    }
    const n = (seen[r.name] = (seen[r.name] || 0) + 1);
    r.label = n > 1 ? `${r.name} ${n}` : r.name;
  });
  return rows;
}

function weekRows() {
  rankLeague();
  return withLabels(
    state.league.members.map((m) => ({
      name: m.name,
      xp: m.xp,
      isYou: !!m.isYou,
      isPacer: !!m.isPacer,
    }))
  );
}

function allTimeRows() {
  const mine = Math.max(0, state.xpTotal || 0);
  const week = Math.max(1, state.league.xpWeek || 0);
  const others = state.league.members
    .filter((m) => !m.isYou)
    .map((m) => ({
      name: m.name,
      isYou: false,
      isPacer: true,
      // Projection, not a stored account: keep this week's shape, scaled to your lifetime.
      xp: Math.round(((m.xp / week) * Math.max(120, mine)) / 10) * 10,
    }));
  return withLabels(
    [{ name: state.profile.name || 'You', xp: mine, isYou: true, isPacer: false }, ...others].sort(
      (a, b) => b.xp - a.xp
    )
  );
}

function rowHtml(m, rank, total) {
  const medal = rank <= 3 ? ` lb-rank--${rank}` : '';
  const risk = rank > total - AT_RISK;
  const avatarId = m.isYou ? state.profile.avatar || 'tiger' : pacerAvatar(m.name);
  return `<div class="lb-row ${m.isYou ? 'is-you' : ''} ${m.isPacer && rank <= PROMOTE ? 'is-promo' : ''} ${risk ? 'is-risk' : ''}">
    <span class="lb-rank${medal}">${rank}</span>
    ${ui.avatar(avatarId, 32)}
    <span class="lb-name">${ui.esc(m.label || m.name)}${m.isYou ? ' <span class="lb-you">(you)</span>' : ''}</span>
    ${
      m.isPacer
        ? `<button class="lb-pacer" data-pacer type="button" title="Average learner pace — a labelled benchmark, not a person." aria-label="What is a pacer?">Pacer</button>`
        : ''
    }
    <span class="lb-xp tabular">${ui.fmt(m.xp)}</span>
  </div>`;
}

function listHtml(rows) {
  const total = rows.length;
  const promo = rows.slice(0, PROMOTE).map((m, i) => rowHtml(m, i + 1, total)).join('');
  const middle = rows.slice(PROMOTE, total - AT_RISK).map((m, i) => rowHtml(m, i + 1 + PROMOTE, total)).join('');
  const risk = rows
    .slice(total - AT_RISK)
    .map((m, i) => rowHtml(m, total - AT_RISK + i + 1, total))
    .join('');
  return `<div class="lb-list g-rise" style="--i:4">
    <section class="lb-zone lb-zone--promo">
      <div class="zone-label">Promotion zone · top ${PROMOTE} promote</div>
      ${promo}
    </section>
    <div class="lb-cut" aria-hidden="true"></div>
    <section class="lb-zone">${middle}</section>
    <section class="lb-zone lb-zone--risk">
      <div class="zone-label zone-label--risk">At risk · bottom ${AT_RISK}</div>
      ${risk}
    </section>
  </div>`;
}

function gapLine(rows, myIndex) {
  if (myIndex < 0 || !rows[myIndex]) return 'This week’s ladder is still forming.';
  const me = rows[myIndex];
  if (myIndex === 0) {
    const next = rows[1];
    if (!next) return 'You’re #1 this week.';
    const lead = Math.max(0, me.xp - next.xp);
    return `You’re #1 — ${ui.fmt(lead)} XP ahead of #2.`;
  }
  const above = rows[myIndex - 1];
  const gap = Math.max(0, above.xp - me.xp);
  if (gap === 0) return `Tied with #${myIndex} — one answer breaks it.`;
  return `You’re ${ui.fmt(gap)} XP from #${myIndex}.`;
}

function infoModal() {
  ui.modal({
    title: 'How the league works',
    body: `<div class="lg-modal">
      <p class="small"><b>30 learners, one weekly ladder.</b> Only XP earned this week counts, and it resets Sunday at 23:59.</p>
      <p class="small"><b>Top 5 promote</b> to the next tier at the end of the week. Bronze → Silver → Gold → Sapphire → Ruby → Diamond.</p>
      <p class="small"><b>The bottom 5 are “at risk”</b> — they restart the week one tier lower, never below Bronze. Nobody is called a loser here.</p>
      <p class="small"><b>Pacers fill empty seats.</b> They are labelled benchmarks at average learner pace — deterministic numbers, not people. Their scores never react to yours.</p>
    </div>`,
    actions: [{ label: 'Got it' }],
  });
}

function pacerModal() {
  ui.modal({
    title: 'What’s a Pacer?',
    body: `<p class="small">Average learner pace — a labelled benchmark, not a person. Horang fills empty cohort seats with pacers so the ladder is never empty, and it never pretends otherwise.</p>`,
    actions: [{ label: 'OK' }],
  });
}

function lockedRender() {
  const day = Math.max(0, state.day || 0);
  const pct = Math.min(100, (day / 7) * 100);
  return `<section class="screen league">
    <header class="top g-rise" style="--i:0">
      <div class="top-left">
        <button class="icon-btn" data-back="home" type="button" aria-label="Back">${ui.icon('back', 22)}</button>
        <h1 class="screen-title">League</h1>
      </div>
      <span style="width:44px"></span>
    </header>

    <div class="lg-locked g-rise" style="--i:1">
      <div class="lg-lock-badge">${ui.icon('lock', 26)}</div>
      <h2 class="h2 mt-3">League placement unlocks on Day 7</h2>
      <p class="small muted mt-2">You’re on Day ${day}. Every day you practise counts, even one answer.</p>
      <div class="bar bar--indigo mt-4"><i style="width:${pct}%"></i></div>
      <div class="row-between small muted mt-2">
        <span>Day ${Math.min(day, 7)} of 7</span>
        <span>${Math.max(0, 7 - day)} to go</span>
      </div>
    </div>

    <div class="card mt-4 g-rise" style="--i:2">
      <h3 class="h3">What you’ll walk into</h3>
      <ul class="lg-rules">
        <li><b>30 learners</b> ranked by weekly XP — nobody sees your real name.</li>
        <li><b>Top 5 promote</b> each Sunday. The bottom 5 are “at risk”, never “losers”.</li>
        <li><b>Pacers</b> fill empty seats and are labelled — average pace, not fake people.</li>
        <li><b>Never below Bronze.</b> Missing a week can’t push you out of the ladder.</li>
      </ul>
    </div>

    <button class="btn btn-primary btn-block mt-5" data-practice type="button">
      ${ui.icon('play', 18)} Practice now
    </button>
  </section>`;
}

export default {
  id: 'league',
  title: 'League',
  nav: null,
  hideNav: false,

  render(params) {
    const wanted = params?.tab === 'all' || params?.tab === 'week' ? params.tab : null;
    if (wanted && wanted !== appliedRouteTab) tab = wanted;
    appliedRouteTab = wanted;
    const joined = !!state.flags.leagueJoined || (state.day || 0) >= 7;
    if (!joined) return lockedRender();

    ensureLeague();
    reseedPacers();
    rankLeague();

    const tier = state.league.tier || 'Bronze';
    const rows = tab === 'week' ? weekRows() : allTimeRows();
    const myIndex = rows.findIndex((m) => m.isYou);
    const myRank = myIndex >= 0 ? myIndex + 1 : rows.length;
    const left = clock.fmtCountdown(weekMsLeft());

    return `<section class="screen league">
      <header class="top g-rise" style="--i:0">
        <div class="top-left">
          <button class="icon-btn" data-back="home" type="button" aria-label="Back">${ui.icon('back', 22)}</button>
          <h1 class="screen-title">${ui.esc(tier)} League</h1>
        </div>
        <button class="icon-btn" data-info type="button" aria-label="How the league works">${ui.icon('info', 22)}</button>
      </header>

      <div class="lg-hero g-rise" style="--i:1">
        <div class="lg-badge lg-badge--${ui.esc(tier)}">${ui.icon(tier === 'Bronze' ? 'trophy' : 'crown', 30)}</div>
        <div class="grow">
          <div class="lg-tier">${ui.esc(tier)} tier</div>
          <div class="lg-rank tabular">#${myRank}</div>
          <div class="lg-sub">Top ${PROMOTE} promote · ${left} left</div>
        </div>
        <div class="lg-hero-tiers" aria-hidden="true">
          ${TIERS.map((t) => `<i class="${t === tier ? 'on' : ''}"></i>`).join('')}
        </div>
      </div>

      <div class="tabs lg-tabs g-rise" style="--i:2" role="tablist" aria-label="League period">
        <button role="tab" aria-selected="${tab === 'week'}" data-lg-tab="week" type="button">This week</button>
        <button role="tab" aria-selected="${tab === 'all'}" data-lg-tab="all" type="button">All time</button>
      </div>
      ${
        tab === 'all'
          ? `<p class="lg-note">All-time uses your lifetime XP. Pacer totals are projected from this week’s pace — only your number is real.</p>`
          : ''
      }

      ${listHtml(rows)}
    </section>
    <div class="lg-dock">
      <div class="grow">
        <div class="lg-gap">${gapLine(rows, myIndex)}</div>
        <div class="lg-dock-sub">${tab === 'week' ? 'Weekly XP resets Sunday 23:59' : 'Lifetime XP — never resets'}</div>
      </div>
      <button class="btn btn-ghost btn-sm lg-practice" data-practice type="button">Practice now ${ui.icon('arrow', 16)}</button>
    </div>`;
  },

  mount(root) {
    root.querySelector('[data-info]')?.addEventListener('click', () => infoModal());
    root.querySelectorAll('[data-pacer]').forEach((el) =>
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        audio.sfx('tap');
        pacerModal();
      })
    );
    root.querySelectorAll('[data-lg-tab]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const next = btn.dataset.lgTab;
        if (next === tab) return;
        tab = next;
        try {
          history.replaceState(null, '', `#/league${next === 'all' ? '?tab=all' : ''}`);
        } catch {
          /* history can be locked down; the tab still switches */
        }
        audio.sfx('tap');
        router.refresh();
      })
    );
    root.querySelectorAll('[data-practice]').forEach((btn) =>
      btn.addEventListener('click', () => {
        router.go('lesson', { kind: 'practice' });
      })
    );
  },

  destroy() {},
};
