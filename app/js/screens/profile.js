// Me · the A1 profile: level, streak, totals, 5-week heatmap, unit badges,
// achievements, memory health and the A1 certificate. Every number is derived.
import {
  state,
  levelInfo,
  decayReport,
  weekDaysActive,
  knownWordCount,
  APP_VERSION,
  RANKS,
  GOALS,
} from '../core/store.js';
import { UNITS, LESSONS, SENTENCES, WORDS, GRAMMAR } from '../core/course.js';
import * as ui from '../core/ui.js';
import * as clock from '../core/clock.js';
import router from '../core/router.js';

/* ---------- derivations ---------- */
const UNIT_COUNT = UNITS.length;
const BADGE_TONES = ['coral', 'indigo', 'mint', 'amber'];

function sessionsDone() {
  return (state.path?.completedNodes || []).length;
}
function sentencesMet() {
  return SENTENCES.filter((s) => (state.mastery[s.id]?.tier || 0) >= 1).length;
}
/** Same rule the Collection uses for its STRONG seals: tier 3+. Keeping one
 *  definition means the profile and the library can never disagree. */
function sentencesStrong() {
  return SENTENCES.filter((s) => (state.mastery[s.id]?.tier || 0) >= 3).length;
}
function badgesEarned() {
  return UNITS.filter((u) => (state.badges || []).includes(u.id)).length;
}
function accuracy() {
  const a = state.stats.answers || 0;
  return a ? Math.round((state.stats.correct / a) * 100) : 0;
}
function examBest() {
  // The A1 exam stores raw marks, so convert its best attempt to a percentage
  // before comparing with older percentage-shaped fields.
  const a1 = state.flags?.a1Exam;
  if (a1 && typeof a1.score === 'number') {
    return Math.round((a1.score / (a1.total || 30)) * 100);
  }
  const candidates = [
    state.exam?.best,
    state.exam?.score,
    state.examResult?.best,
    state.examResult?.score,
    state.flags?.examBest,
    state.flags?.examScore,
  ];
  const n = candidates.find((v) => typeof v === 'number' && Number.isFinite(v));
  return typeof n === 'number' ? n : null;
}
function nextRank(level) {
  return [...RANKS].reverse().find((r) => r.min > level) || null;
}
function nextBadge() {
  return UNITS.find((u) => !(state.badges || []).includes(u.id)) || null;
}

/* ---------- achievements (A1 edition, computed from real counters) ---------- */
function achievements() {
  const sessions = sessionsDone();
  const strong = sentencesStrong();
  const badges = badgesEarned();
  const best = state.streak.best || 0;
  const xp = state.xpTotal || 0;
  const bestExam = examBest();
  const examPassed = bestExam !== null && bestExam >= 80;
  const strongTier = (n, name, icon, tone) => ({
    key: `strong${n}`,
    name,
    icon,
    tone,
    need: `Reach Strong on ${n} sentences.`,
    cur: Math.min(strong, n),
    target: n,
    done: strong >= n,
  });
  return [
    {
      key: 'first',
      name: 'First session',
      icon: 'play',
      tone: 'coral',
      need: 'Finish your first A1 session.',
      cur: Math.min(sessions, 1),
      target: 1,
      done: sessions >= 1,
    },
    strongTier(5, '5 strong', 'star', 'mint'),
    strongTier(10, '10 strong', 'star', 'mint'),
    strongTier(20, '20 strong', 'star', 'indigo'),
    strongTier(40, '40 strong', 'trophy', 'coral'),
    {
      key: 'badge',
      name: 'Unit badge',
      icon: 'passport',
      tone: 'amber',
      need: 'Pass any unit checkpoint.',
      cur: Math.min(badges, 1),
      target: 1,
      done: badges >= 1,
    },
    {
      key: 'streak7',
      name: '7-day streak',
      icon: 'flame',
      tone: 'amber',
      need: 'Reach a 7-day streak.',
      cur: Math.min(best, 7),
      target: 7,
      done: best >= 7,
    },
    {
      key: 'streak30',
      name: '30-day streak',
      icon: 'crown',
      tone: 'indigo',
      need: 'Reach a 30-day streak.',
      cur: Math.min(best, 30),
      target: 30,
      done: best >= 30,
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
      key: 'exam',
      name: 'A1 certificate',
      icon: 'trophy',
      tone: 'mint',
      need: 'Pass the A1 exam at 80% or higher.',
      cur: bestExam === null ? 0 : Math.min(bestExam, 80),
      target: 80,
      done: examPassed,
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
  // Onboarding's A1 funnel adds "family"; keep Profile aligned with the label
  // the learner actually picked instead of falling back to "Just curious".
  if (state.profile.goal === 'family') return 'Family';
  return GOALS[state.profile.goal]?.label || 'Just curious';
}

/* ---------- small blocks ---------- */
function badgeStrip() {
  const earned = badgesEarned();
  const next = nextBadge();
  const cells = UNITS.map((u) => {
    const on = (state.badges || []).includes(u.id);
    const tone = BADGE_TONES[(u.order - 1) % BADGE_TONES.length];
    return `<button class="pf-badge tone-${tone} ${on ? 'is-on' : 'is-off'}" type="button"
      data-go="passport" data-params='{"tab":"badges"}'
      aria-label="Unit ${u.order} ${ui.esc(u.title)} badge — ${on ? 'earned' : 'locked'}"
      title="Unit ${u.order} · ${ui.esc(u.title)}">
      ${on ? String(u.order).padStart(2, '0') : ui.icon('lock', 12)}
    </button>`;
  }).join('');
  return `<section class="card pf-badges" aria-label="Unit badges">
    <div class="pf-card-head">
      <h3 class="pf-card-title">Unit badges</h3>
      <button class="g-link" type="button" data-go="passport" data-params='{"tab":"badges"}'>
        ${earned} / ${UNIT_COUNT} · Collection ${ui.icon('chevron', 14)}
      </button>
    </div>
    <div class="pf-badge-grid">${cells}</div>
    <p class="pf-badges-note">${
      next
        ? `Next up: Unit ${next.order} · ${ui.esc(next.ko)} — pass the checkpoint for the badge.`
        : `All ${UNIT_COUNT} badges earned. The A1 certificate is unlocked.`
    }</p>
  </section>`;
}

function examCard() {
  const earned = badgesEarned();
  const unlocked = earned >= UNIT_COUNT;
  const best = examBest();
  if (!unlocked) {
    return `<section class="card pf-exam is-locked" aria-label="A1 exam, locked">
      <div class="pf-exam-art">${ui.icon('lock', 24)}</div>
      <div class="pf-exam-body">
        <div class="pf-card-head">
          <h3 class="pf-card-title">A1 Certificate</h3>
          <span class="pf-card-note">${earned} / ${UNIT_COUNT} badges</span>
        </div>
        <p class="pf-exam-copy">Pass all ${UNIT_COUNT} unit checkpoints to unlock the final exam. Learning is never blocked by a test — this is the last step, not a gate.</p>
        <div class="bar bar--thin pf-exam-bar"><i style="width:${(earned / UNIT_COUNT) * 100}%"></i></div>
        <p class="pf-exam-note">${UNIT_COUNT - earned} badge${UNIT_COUNT - earned === 1 ? '' : 's'} to go</p>
      </div>
    </section>`;
  }
  return `<section class="card pf-exam is-open" aria-label="A1 exam">
    <div class="pf-exam-art">${ui.icon('trophy', 26)}</div>
    <div class="pf-exam-body">
      <div class="pf-card-head">
        <h3 class="pf-card-title">A1 Certificate</h3>
        <span class="pf-card-note">${best === null ? 'Not taken yet' : `Best ${best}%`}</span>
      </div>
      <p class="pf-exam-copy">${
        best === null
          ? 'All 12 badges are in. 30 mixed questions, 80% to pass.'
          : best >= 80
            ? `Passed with ${best}%. Retake any time — the best score is kept.`
            : `Best ${best}% — 80% passes. Your weak units are worth one more review.`
      }</p>
      <button class="btn btn-primary btn-block mt-4" type="button" data-go="exam">
        ${ui.icon('play', 18)} ${
          state.flags?.a1Exam?.passed
            ? 'View your certificate'
            : best === null
              ? 'Take the A1 exam'
              : 'Retake the exam'
        }
      </button>
    </div>
  </section>`;
}

export default {
  id: 'profile',
  title: 'Me',
  nav: 'profile', // the shell's tab id is the screen id (main.js TABS) — 'me' never matches
  hideNav: false,

  render() {
    const info = levelInfo();
    const strong = sentencesStrong();
    const badges = badgesEarned();
    const sessions = sessionsDone();
    const known = knownWordCount();
    const acc = accuracy();
    const decay = decayReport();
    const cells = heatmap();
    const achs = achievements();
    const unlocked = achs.filter((a) => a.done).length;
    const name = state.profile.name || 'Explorer';
    const streak = state.streak.current || 0;
    const next = nextRank(info.level);
    const levelTease = next
      ? `${next.min - info.level} level${next.min - info.level === 1 ? '' : 's'} to ${next.label}`
      : 'Top rank reached — 달인';
    // A new week clears `members` but keeps the join flags. Show the league row
    // whenever the learner has actually joined, not only when a cohort is loaded.
    const joinedLeague = !!state.flags.leagueJoined || state.league.joinedDay != null;
    const leagueReady = state.day >= 7;
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
            <p class="pf-meta">${ui.esc(goalLabel())} <span class="pf-dot">·</span> Day ${state.day} of A1</p>
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
          ${ui.weekStrip(weekDaysActive(), clock.weekdayIndex())}
        </section>

        <!-- 4 · totals -->
        <div class="pf-totals">
          <div class="pf-stat">
            <span class="pf-stat-label">Sessions</span>
            <span class="pf-stat-value"><b data-count="${sessions}">${ui.fmt(sessions)}</b><i>/${LESSONS.length}</i></span>
          </div>
          <div class="pf-stat">
            <span class="pf-stat-label">Sentences met</span>
            <span class="pf-stat-value"><b data-count="${sentencesMet()}">${ui.fmt(sentencesMet())}</b><i>/${SENTENCES.length}</i></span>
          </div>
          <div class="pf-stat">
            <span class="pf-stat-label">Words known</span>
            <span class="pf-stat-value"><b data-count="${known}">${ui.fmt(known)}</b><i>/${WORDS.length}</i></span>
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

        <!-- 6 · unit badges -->
        ${badgeStrip()}

        <!-- 7 · achievements -->
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
                    ${ui.icon(a.icon, 24)}
                    ${a.done ? '' : `<span class="pf-ach-lock">${ui.icon('lock', 11)}</span>`}
                  </span>
                  <span class="pf-ach-name">${ui.esc(a.name)}</span>
                </button>`
              )
              .join('')}
          </div>
        </section>

        <!-- 8 · memory health -->
        <section class="card pf-memory pf-memory--${memoryTone}" aria-label="Memory health">
          <div class="pf-card-head">
            <h3 class="pf-card-title">${ui.icon('refresh', 16)} Memory health</h3>
            <span class="pf-card-note">${decay.due} due now</span>
          </div>
          <p class="pf-mem-copy">${
            sentencesMet() === 0
              ? 'Nothing to review yet. Your first session starts the memory map.'
              : decay.total
                ? 'Faded sentences come back stronger after one review — nothing here is lost.'
                : 'Every sentence is holding. A short review keeps it that way.'
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

        <!-- 9 · A1 exam -->
        ${examCard()}

        <!-- 10 · links -->
        <div class="pf-links">
          <button class="card card-press pf-row-card" type="button" data-go="passport" data-params='{"tab":"sentences"}'>
            <span class="pf-row-ico pf-row-ico--coral">${ui.icon('passport', 21)}</span>
            <span class="pf-row-body">
              <span class="pf-row-title">Collection</span>
              <span class="pf-row-sub">${ui.fmt(sentencesMet())} / ${SENTENCES.length} sentences · ${ui.fmt(strong)} strong</span>
            </span>
            <span class="chev">${ui.icon('chevron', 18)}</span>
          </button>

          <button class="card card-press pf-row-card" type="button" data-go="vocab">
            <span class="pf-row-ico pf-row-ico--amber">${ui.icon('book', 21)}</span>
            <span class="pf-row-body">
              <span class="pf-row-title">Words</span>
              <span class="pf-row-sub">${ui.fmt(WORDS.length)} entries · ${ui.fmt(known)} known</span>
            </span>
            <span class="chev">${ui.icon('chevron', 18)}</span>
          </button>

          <button class="card card-press pf-row-card" type="button" data-go="grammar">
            <span class="pf-row-ico pf-row-ico--indigo">${ui.icon('quests', 21)}</span>
            <span class="pf-row-body">
              <span class="pf-row-title">Grammar</span>
              <span class="pf-row-sub">${GRAMMAR.length} points across ${UNIT_COUNT} units</span>
            </span>
            <span class="chev">${ui.icon('chevron', 18)}</span>
          </button>

          ${
            joinedLeague
              ? `<button class="card card-press pf-row-card" type="button" data-go="league">
                  <span class="pf-row-ico pf-row-ico--amber">${ui.icon('trophy', 21)}</span>
                  <span class="pf-row-body">
                    <span class="pf-row-title">${ui.esc(state.league.tier)} League</span>
                    <span class="pf-row-sub">${state.league.rank ? `#${state.league.rank} of ${state.league.members.length}` : 'Placing…'} · ${ui.fmt(state.league.xpWeek)} XP this week</span>
                  </span>
                  <span class="chev">${ui.icon('chevron', 18)}</span>
                </button>`
              : leagueReady
                ? `<button class="card card-press pf-row-card" type="button" data-go="league">
                    <span class="pf-row-ico pf-row-ico--amber">${ui.icon('trophy', 21)}</span>
                    <span class="pf-row-body">
                      <span class="pf-row-title">League is ready</span>
                      <span class="pf-row-sub">Day 7 passed — join this week's board</span>
                    </span>
                    <span class="chev">${ui.icon('chevron', 18)}</span>
                  </button>`
                : `<button class="card card-press pf-row-card pf-row-card--locked" type="button" data-go="league" aria-label="League locked until Day 7">
                    <span class="pf-row-ico">${ui.icon('lock', 20)}</span>
                    <span class="pf-row-body">
                      <span class="pf-row-title">League unlocks Day 7</span>
                      <span class="pf-row-sub">You're on Day ${state.day}. Keep the streak alive.</span>
                    </span>
                    <span class="chev">${ui.icon('chevron', 18)}</span>
                  </button>`
          }

          <button class="card card-press pf-row-card" type="button" data-settings>
            <span class="pf-row-ico">${ui.icon('settings', 21)}</span>
            <span class="pf-row-body">
              <span class="pf-row-title">Settings</span>
              <span class="pf-row-sub">Goal, romanization, reminders, sound</span>
            </span>
            <span class="chev">${ui.icon('chevron', 18)}</span>
          </button>
        </div>

        <div class="pf-lab">
          <button class="btn btn-ghost pf-lab-btn" type="button" data-go="demo">
            ${ui.icon('chart', 16)} Retention Lab
          </button>
        </div>

        <footer class="pf-foot">
          <span>Horang v${ui.esc(APP_VERSION)}</span>
          <span class="pf-foot-dot">·</span>
          <span>${badges} / ${UNIT_COUNT} unit badges</span>
        </footer>
      </div>
    </section>`;
  },

  mount(root) {
    const reduce = document.body.classList.contains('reduce-motion');

    // Staggered entrance — 6 items max per motion spec, then settle.
    root.querySelectorAll('.pf-stagger > *').forEach((el, i) => {
      if (reduce) return;
      el.style.animationDelay = `${Math.min(i, 6) * 55}ms`;
    });

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

    root.querySelectorAll('[data-settings]').forEach((b) => b.addEventListener('click', () => router.go('settings')));

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
