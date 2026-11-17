// S18 · Me / profile & stats. Every number is read from state — no placeholders.
import {
  state,
  levelInfo,
  stampCount,
  decayReport,
  weekDaysActive,
  APP_VERSION,
  RANKS,
  GOALS,
} from '../core/store.js';
import { NODES } from '../core/engine.js';
import * as ui from '../core/ui.js';
import * as clock from '../core/clock.js';
import router from '../core/router.js';

/* ---------- derivations ---------- */
function wordsSeen() {
  return Object.keys(state.mastery).filter((id) => id !== 'sentence0').length;
}
function accuracy() {
  const a = state.stats.answers || 0;
  return a ? Math.round((state.stats.correct / a) * 100) : 0;
}
/** A node counts as a 3-star run when it is finished and every sentence in it
 *  was stamped without a single wrong answer on record. Honest, derived — we
 *  never store a synthetic "stars" number. */
function perfectNodeDone() {
  if (state.counters.stars3 > 0) return true;
  return NODES.some(
    (n) =>
      state.path.completedNodes.includes(n.index) &&
      n.sentenceIds.every((id) => {
        const m = state.mastery[id];
        return m && m.wrong === 0 && m.tier >= 3;
      })
  );
}
function nextRank(level) {
  return [...RANKS].reverse().find((r) => r.min > level) || null;
}

/* ---------- achievements ---------- */
function achievements() {
  const stamps = stampCount();
  const best = state.streak.best || 0;
  const xp = state.xpTotal || 0;
  const perfect = perfectNodeDone();
  return [
    {
      key: 'first',
      name: 'First Sentence',
      icon: 'book',
      tone: 'coral',
      need: 'Stamp your first sentence.',
      cur: Math.min(stamps, 1),
      target: 1,
      done: stamps >= 1,
    },
    {
      key: 'streak3',
      name: '3-Day Spark',
      icon: 'flame',
      tone: 'amber',
      need: 'Reach a 3-day streak.',
      cur: Math.min(best, 3),
      target: 3,
      done: best >= 3,
    },
    {
      key: 'streak7',
      name: 'Week Habit',
      icon: 'flame',
      tone: 'amber',
      need: 'Reach a 7-day streak.',
      cur: Math.min(best, 7),
      target: 7,
      done: best >= 7,
    },
    {
      key: 'streak30',
      name: '30 Days',
      icon: 'crown',
      tone: 'indigo',
      need: 'Reach a 30-day streak.',
      cur: Math.min(best, 30),
      target: 30,
      done: best >= 30,
    },
    {
      key: 'stamps10',
      name: 'Ten Stamps',
      icon: 'passport',
      tone: 'mint',
      need: 'Collect 10 stamps.',
      cur: Math.min(stamps, 10),
      target: 10,
      done: stamps >= 10,
    },
    {
      key: 'stamps40',
      name: 'Full Passport',
      icon: 'trophy',
      tone: 'coral',
      need: 'Collect all 40 stamps.',
      cur: Math.min(stamps, 40),
      target: 40,
      done: stamps >= 40,
    },
    {
      key: 'xp1k',
      name: '1,000 XP',
      icon: 'bolt',
      tone: 'indigo',
      need: 'Earn 1,000 total XP.',
      cur: Math.min(xp, 1000),
      target: 1000,
      done: xp >= 1000,
    },
    {
      key: 'perfect',
      name: 'Perfect Node',
      icon: 'star',
      tone: 'amber',
      need: 'Finish a node with 3 stars.',
      cur: perfect ? 1 : 0,
      target: 1,
      done: perfect,
    },
  ];
}

/* ---------- activity heatmap (last 5 weeks, calendar-aligned) ---------- */
const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
function heatmap() {
  const wd = clock.weekdayIndex(); // Mon = 0
  const mondayMs = clock.nowMs() - wd * clock.DAY;
  const startMs = mondayMs - 28 * clock.DAY;
  const todayKey = clock.today();
  const goal = Math.max(60, state.profile.dailyGoalXp || 120);
  const cells = [];
  for (let i = 0; i < 35; i++) {
    const d = new Date(startMs + i * clock.DAY);
    const key = clock.dateKey(d);
    const xp = state.stats.xpByDay[key] || 0;
    const future = key > todayKey;
    const ratio = xp / goal;
    const level = xp <= 0 ? 0 : ratio < 0.5 ? 1 : ratio < 0.85 ? 2 : ratio < 1 ? 3 : ratio < 1.5 ? 4 : 5;
    cells.push({
      key,
      xp,
      future,
      level,
      today: key === todayKey,
      label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    });
  }
  return cells;
}

/* ---------- copy ---------- */
function goalLabel() {
  return GOALS[state.profile.goal]?.label || 'Just curious';
}

export default {
  id: 'profile',
  title: 'Me',
  nav: 'profile', // the shell's tab id is the screen id (main.js TABS) — 'me' never matches
  hideNav: false,
  render() {
    const info = levelInfo();
    const stamps = stampCount();
    const words = wordsSeen();
    const mins = state.stats.minutes || 0;
    const acc = accuracy();
    const decay = decayReport();
    const activeDays = weekDaysActive().map((on, i) => (on ? i : -1)).filter((i) => i >= 0);
    const next = nextRank(info.level);
    const levelTease = next
      ? `${next.min - info.level} level${next.min - info.level === 1 ? '' : 's'} to ${next.label}`
      : 'Top rank reached — 달인';
    const joinedLeague =
      (!!state.flags.leagueJoined || state.league.joinedDay != null) && state.league.members.length > 0;
    const leagueReady = state.day >= 7;
    const cells = heatmap();
    const achs = achievements();
    const unlocked = achs.filter((a) => a.done).length;
    const name = state.profile.name || 'Explorer';
    const streak = state.streak.current || 0;

    const memoryTone = decay.total > 0 ? 'warm' : 'calm';

    return `
    <section class="screen screen-pad-nav profile">
      <div class="top">
        <div class="top-left"><h1 class="screen-title">Me</h1></div>
        <div class="top-right">
          <button class="icon-btn pf-gear" type="button" data-settings aria-label="Settings">
            ${ui.icon('settings', 24)}
          </button>
        </div>
      </div>

      <div class="pf-stack pf-stagger">

        <!-- 1 · identity -->
        <header class="pf-identity">
          <div class="pf-ava">
            ${ui.avatar(state.profile.avatar, 72)}
            <span class="pf-ava-lv">${info.level}</span>
          </div>
          <div class="pf-id-text">
            <h2 class="pf-name">${ui.esc(name)}</h2>
            <p class="pf-rank">LV ${info.level} <span class="pf-dot">·</span> ${ui.esc(info.rankKo)} ${ui.esc(info.rank)}</p>
            <p class="pf-meta">${ui.esc(goalLabel())} <span class="pf-dot">·</span> joined Day ${state.day}</p>
          </div>
        </header>

        <!-- 2 · level -->
        <section class="card card-dark pf-level" aria-label="Level progress">
          <div class="pf-level-top">
            <span class="pf-level-tag">Level ${info.level}</span>
            <span class="pf-rank-pill">${ui.esc(info.rankKo)} ${ui.esc(info.rank)}</span>
          </div>
          <div class="pf-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${ui.pct(info.pct)}" aria-label="XP to next level">
            <i style="width:${info.pct.toFixed(1)}%"></i>
          </div>
          <div class="pf-level-foot">
            <span class="pf-level-left"><b data-count="${info.total}">${ui.fmt(info.total)}</b> XP total</span>
            <span class="pf-level-right">${
              info.level >= 60 ? 'Max level' : `${ui.fmt(info.remaining)} XP to Level ${info.level + 1}`
            }</span>
          </div>
          <p class="pf-tease">${ui.icon('sparkle', 15)} ${ui.esc(levelTease)}</p>
        </section>

        <!-- 3 · streak -->
        <section class="card pf-streak" aria-label="Streak">
          <div class="pf-streak-flame">${ui.flame(40)}</div>
          <div class="pf-streak-body">
            <p class="pf-streak-num">${streak} day${streak === 1 ? '' : 's'} streak</p>
            <p class="pf-streak-best">Best: ${state.streak.best || 0}${
              state.streak.freezes ? ` <span class="pf-freeze">${ui.icon('snow', 13)} ${state.streak.freezes}</span>` : ''
            }</p>
          </div>
          ${ui.weekStrip(activeDays, clock.weekdayIndex())}
        </section>

        <!-- 4 · totals -->
        <div class="pf-totals">
          <div class="pf-stat">
            <span class="pf-stat-label">Stamps</span>
            <span class="pf-stat-value"><b data-count="${stamps}">${ui.fmt(stamps)}</b><i>/40</i></span>
          </div>
          <div class="pf-stat">
            <span class="pf-stat-label">Words</span>
            <span class="pf-stat-value"><b data-count="${words}">${ui.fmt(words)}</b></span>
          </div>
          <div class="pf-stat">
            <span class="pf-stat-label">Minutes</span>
            <span class="pf-stat-value"><b data-count="${mins}">${ui.fmt(mins)}</b></span>
          </div>
          <div class="pf-stat">
            <span class="pf-stat-label">Accuracy</span>
            <span class="pf-stat-value"><b data-count="${acc}">${ui.fmt(acc)}</b><i>%</i></span>
          </div>
        </div>

        <!-- 5 · activity heatmap -->
        <section class="card pf-hm" aria-label="Activity, last five weeks">
          <div class="pf-card-head">
            <h3 class="pf-card-title">Activity</h3>
            <span class="pf-card-note">last 5 weeks</span>
          </div>
          <div class="pf-hm-wrap">
            <div class="pf-hm-labels" aria-hidden="true">
              ${WEEK_LABELS.map((l) => `<span>${l}</span>`).join('')}
            </div>
            <div class="pf-hm-grid" role="group" aria-label="Daily XP, last 5 weeks">
              ${cells
                .map((c) =>
                  c.future
                    ? '<span class="pf-hm-cell is-future" aria-hidden="true"></span>'
                    : `<button class="pf-hm-cell hm-${c.level} ${c.today ? 'is-today' : ''}" type="button"
                         data-hm data-date="${ui.esc(c.label)}" data-xp="${c.xp}"
                         aria-label="${ui.esc(c.label)}: ${c.xp} XP${c.today ? ' (today)' : ''}"></button>`
                )
                .join('')}
            </div>
          </div>
          <div class="pf-hm-foot">
            <p class="pf-hm-cap" data-hm-cap>Tap a day to see its XP</p>
            <div class="pf-hm-legend" aria-hidden="true">
              <span>Less</span>
              <i class="hm-0"></i><i class="hm-1"></i><i class="hm-2"></i><i class="hm-3"></i><i class="hm-4"></i><i class="hm-5"></i>
              <span>More</span>
            </div>
          </div>
        </section>

        <!-- 6 · achievements -->
        <section class="pf-ach" aria-label="Achievements">
          <div class="pf-card-head">
            <h3 class="pf-card-title">Achievements</h3>
            <span class="pf-card-note">${unlocked} of ${achs.length}</span>
          </div>
          <div class="pf-ach-grid">
            ${achs
              .map(
                (a) => `<button class="pf-ach-item ${a.done ? 'is-on' : 'is-locked'} tone-${a.tone}" type="button"
                    data-ach="${a.key}" aria-label="${ui.esc(a.name)} — ${a.done ? 'unlocked' : 'locked'}">
                  <span class="pf-ach-badge">
                    ${ui.icon(a.icon, 26)}
                    ${a.done ? '' : `<span class="pf-ach-lock">${ui.icon('lock', 12)}</span>`}
                  </span>
                  <span class="pf-ach-name">${ui.esc(a.name)}</span>
                </button>`
              )
              .join('')}
          </div>
        </section>

        <!-- 7 · memory health -->
        <section class="card pf-memory pf-memory--${memoryTone}" aria-label="Memory health">
          <div class="pf-card-head">
            <h3 class="pf-card-title">${ui.icon('refresh', 16)} Memory health</h3>
            <span class="pf-card-note">${decay.due} due now</span>
          </div>
          <p class="pf-mem-copy">${
            words === 0
              ? 'Nothing to review yet. Your first node starts the memory map.'
              : decay.total
                ? 'Faded sentences come back stronger after one review — nothing here is lost.'
                : 'Every sentence is holding. Review keeps it that way.'
          }</p>
          <div class="pf-mem-grid">
            <div class="pf-mem-cell"><b>${decay.fading}</b><span>Fading</span></div>
            <div class="pf-mem-cell"><b>${decay.wilting}</b><span>Wilting</span></div>
            <div class="pf-mem-cell"><b>${decay.dropped}</b><span>Dropped</span></div>
            <div class="pf-mem-cell"><b>${decay.due}</b><span>Due</span></div>
          </div>
          <button class="btn btn-primary btn-block mt-4" type="button" data-review>
            ${ui.icon('refresh', 18)} Review now
          </button>
        </section>

        <!-- 8 · league -->
        ${
          joinedLeague
            ? `<button class="card card-press pf-row-card" type="button" data-go="league">
                <span class="pf-row-ico pf-row-ico--amber">${ui.icon('trophy', 22)}</span>
                <span class="pf-row-body">
                  <span class="pf-row-title">${ui.esc(state.league.tier)} League</span>
                  <span class="pf-row-sub">${state.league.rank ? `#${state.league.rank} of ${state.league.members.length}` : 'Placing…'} · ${ui.fmt(state.league.xpWeek)} XP this week</span>
                </span>
                <span class="chev">${ui.icon('chevron', 18)}</span>
              </button>`
            : leagueReady
              ? `<button class="card card-press pf-row-card" type="button" data-go="league">
                  <span class="pf-row-ico pf-row-ico--amber">${ui.icon('trophy', 22)}</span>
                  <span class="pf-row-body">
                    <span class="pf-row-title">League is ready</span>
                    <span class="pf-row-sub">Day 7 passed — join this week's board</span>
                  </span>
                  <span class="chev">${ui.icon('chevron', 18)}</span>
                </button>`
              : `<div class="card pf-row-card pf-row-card--locked" aria-label="League locked">
                  <span class="pf-row-ico">${ui.icon('lock', 20)}</span>
                  <span class="pf-row-body">
                    <span class="pf-row-title">League unlocks Day 7</span>
                    <span class="pf-row-sub">You're on Day ${state.day}. Keep the streak alive.</span>
                  </span>
                </div>`
        }

        <!-- 9 · settings -->
        <button class="card card-press pf-row-card" type="button" data-settings>
          <span class="pf-row-ico">${ui.icon('settings', 21)}</span>
          <span class="pf-row-body">
            <span class="pf-row-title">Settings</span>
            <span class="pf-row-sub">Goal, reminders, sound, account</span>
          </span>
          <span class="chev">${ui.icon('chevron', 18)}</span>
        </button>

        <div class="pf-lab">
          <button class="btn btn-ghost pf-lab-btn" type="button" data-go="demo">
            ${ui.icon('chart', 16)} Retention Lab
          </button>
        </div>

        <footer class="pf-foot">
          <span>Horang v${ui.esc(APP_VERSION)}</span>
          <span class="pf-foot-dot">·</span>
          <span>made for Korean learners</span>
        </footer>
      </div>
    </section>`;
  },

  mount(root) {
    const reduce = document.body.classList.contains('reduce-motion');

    // Staggered entrance — 6 items max per motion spec, then settle.
    const items = root.querySelectorAll('.pf-stagger > *');
    items.forEach((el, i) => {
      if (reduce) return;
      el.style.animationDelay = `${Math.min(i, 6) * 55}ms`;
    });

    // XP bar grows in from the left (600ms, ease-out) — width is server-rendered.
    // (Pure CSS animation so the value is correct even before the first frame.)

    // Number tickers.
    root.querySelectorAll('[data-count]').forEach((el) => {
      const to = Number(el.dataset.count) || 0;
      if (!to) {
        el.textContent = '0';
        return;
      }
      if (reduce) el.textContent = ui.fmt(to);
      else ui.countUp(el, 0, to, 700);
    });

    const goSettings = () => router.go('settings');
    root.querySelectorAll('[data-settings]').forEach((b) => b.addEventListener('click', goSettings));

    root.querySelector('[data-review]')?.addEventListener('click', () => {
      router.go('lesson', { kind: 'review' });
    });

    // Heatmap: tap a day → caption + toast with the real number.
    const cap = root.querySelector('[data-hm-cap]');
    root.querySelectorAll('[data-hm]').forEach((cell) => {
      const show = () => {
        const date = cell.dataset.date;
        const xp = Number(cell.dataset.xp) || 0;
        if (cap) cap.textContent = `${date} · ${ui.fmt(xp)} XP${xp ? '' : ' · rest day'}`;
        ui.toast(`${date} · ${ui.fmt(xp)} XP`, { icon: xp ? 'bolt' : 'clock', tone: xp ? 'coral' : undefined });
      };
      cell.addEventListener('click', show);
      cell.addEventListener('focus', () => {
        if (cap) cap.textContent = `${cell.dataset.date} · ${ui.fmt(cell.dataset.xp)} XP`;
      });
    });

    // Achievements: tap → real requirement + progress.
    const list = achievements();
    root.querySelectorAll('[data-ach]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const a = list.find((x) => x.key === btn.dataset.ach);
        if (!a) return;
        const body = `
          <p class="pf-ach-modal-copy">${ui.esc(a.need)}</p>
          <div class="pf-ach-prog">
            <span>${a.done ? 'Unlocked' : 'Progress'}</span>
            <b>${ui.fmt(a.cur)} / ${ui.fmt(a.target)}</b>
          </div>
          <div class="bar ${a.done ? 'bar--mint' : ''}"><i style="width:${ui.pct((a.cur / a.target) * 100)}%"></i></div>`;
        ui.modal({
          title: a.name,
          body,
          actions: [{ label: a.done ? 'Nice' : 'Got it', cls: 'btn-primary' }],
        });
      });
    });
  },

  destroy() {},
};
