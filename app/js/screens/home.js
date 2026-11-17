// S1 · Home / Path — the hub that makes tomorrow feel unfinished.
// Retention surface: streak, daily goal, decay hook, pack guidebook, zigzag path,
// Sentence of the Day, quest preview and one honest "cheapest next step".
import {
  state,
  save,
  addXP,
  checkQuests,
  decayReport,
  packProgress,
  stampCount,
  sentenceOfTheDay,
  openChest,
  ensureLeague,
  levelInfo,
  questProgress,
  currentUnit,
} from '../core/store.js';
import { NODES, UNIT_META } from '../core/engine.js';
import curriculum from '../../data/curriculum.js';
import * as ui from '../core/ui.js';
import * as routerApi from '../core/router.js';
import * as clock from '../core/clock.js';
import * as audio from '../core/audio.js';

// Core currently ships a default router object; accept a named export too.
const router = routerApi.router || routerApi.default;

const ZIGZAG = [0, 40, 8, -40, -8];
const GOAL_OPTIONS = [60, 120, 180];
const GP_BY_ID = new Map((curriculum.grammar_points || []).map((g) => [g.id, g]));

let seenQuests = new Set();
let pendingToasts = [];
let currentSod = null;

function todayKey() {
  return clock.today();
}

function collectQuests() {
  const newly = checkQuests() || [];
  const fresh = newly.filter((q) => !q.id || !seenQuests.has(q.id));
  newly.forEach((q) => {
    if (q.id) seenQuests.add(q.id);
  });
  pendingToasts = fresh;
}

function firstOpenIndex() {
  const done = new Set(state.path.completedNodes || []);
  const node = NODES.find((n) => !done.has(n.index));
  return node ? node.index : null;
}

function esc(s) {
  return ui.esc(s);
}

// ---------- 1 · HUD ----------
function hudHTML() {
  // Focus is deliberately NOT shown on the hub: no energy system may imply that
  // studying is gated. It belongs to bonus modes only, which are out of this MVP.
  const gems =
    state.gems > 0
      ? `<span class="pill pill--sm pill--mint" aria-label="${state.gems} gems">${ui.gem(14)} ${ui.fmt(state.gems)}</span>`
      : '';
  return `<div class="hud home-hud">
    <div class="top-left">
      <span class="streak-pill ${state.streak.current ? '' : 'is-zero'}" aria-label="${state.streak.current} day streak">
        ${ui.flame(26)}<span>${state.streak.current}</span>
      </span>
    </div>
    <div class="hud-right">
      <span class="pill pill--sm pill--indigo" aria-label="${state.coins} coins">${ui.coin(14)} ${ui.fmt(state.coins)}</span>
      ${gems}
      <button class="hud-avatar" data-go="profile" type="button" aria-label="Your profile">
        ${ui.avatar(state.profile.avatar, 34)}
      </button>
    </div>
  </div>`;
}

// ---------- 2 · Daily goal ----------
function goalHTML() {
  const goal = state.profile.dailyGoalXp || 120;
  const xp = state.counters.xp || 0;
  const hit = xp >= goal;
  const pct = ui.pct((xp / goal) * 100);
  const left = Math.max(0, goal - xp);
  const close = left > 0 && left <= 15;
  const sub = hit ? 'Daily goal done · see you tomorrow' : `${left} XP to go`;
  return `<button class="goal-card ${hit ? 'goal-card--hit' : ''}" data-goal type="button"
      aria-label="Daily goal: ${xp} of ${goal} XP. Tap for details.">
    <span class="goal-ring">
      ${ui.ring(pct, { size: 56, stroke: 7, color: hit ? 'var(--mint-600)' : 'var(--coral-500)' })}
      <b class="goal-ring-label">${hit ? ui.icon('check', 20) : pct + '%'}</b>
    </span>
    <span class="goal-main">
      <span class="goal-kicker">Daily goal</span>
      <span class="goal-xp">${
        hit
          ? `Goal hit · ${ui.fmt(xp)} XP`
          : `<span data-goal-xpnum>0</span> / ${ui.fmt(goal)} XP`
      }</span>
      <span class="goal-sub ${close ? 'is-close' : ''}">${sub}</span>
    </span>
    <span class="goal-chev">${ui.icon('chevron', 18)}</span>
  </button>`;
}

// ---------- interactions under the goal ----------
function quickHTML() {
  const due = decayReport().total;
  return `<div class="quick-row">
    <button class="btn btn-secondary quick-btn" data-practice type="button">
      ${ui.icon('play', 18)} Practice 10
    </button>
    <button class="btn btn-secondary quick-btn" data-review type="button">
      ${ui.icon('refresh', 18)} ${due ? 'Review ' + due : 'Review'}
    </button>
  </div>`;
}

// ---------- 3 unfinished artefacts + the goal ring = 4 visuals max ----------
function momentumHTML() {
  const questsDone = (state.quests.items || []).filter((q) => q.done).length;
  const unit = currentUnit();
  const pp = packProgress(unit.id);
  const li = levelInfo();
  const stamps = stampCount();
  const items = [
    {
      kind: 'amber',
      label: 'Chest',
      value: `${state.chest.slots}/3`,
      pct: (state.chest.slots / 3) * 100,
      steps: 3 - state.chest.slots,
    },
    {
      kind: 'coral',
      label: 'Daily quests',
      value: `${questsDone}/3`,
      pct: (questsDone / 3) * 100,
      steps: 3 - questsDone,
    },
    {
      kind: 'mint',
      label: `${unit.title} pack`,
      value: `${pp.met}/${pp.total}`,
      pct: pp.pct,
      steps: pp.total - pp.met,
    },
    {
      kind: 'indigo',
      label: `Level ${li.level}`,
      value: `${ui.fmt(li.remaining)} XP left`,
      pct: li.pct,
      steps: li.remaining / 10,
    },
    {
      kind: 'mint',
      label: 'Passport',
      value: `${stamps}/40`,
      pct: (stamps / 40) * 100,
      steps: 40 - stamps,
    },
  ];
  const nearest = items
    .filter((x) => x.steps > 0)
    .sort((a, b) => a.steps - b.steps)
    .slice(0, 3);
  if (!nearest.length) {
    return `<div class="momentum">
      <div class="momentum-head"><span>Closing in</span><span class="momentum-clear">all clear</span></div>
      <p class="small muted">Nothing unfinished. Rare.</p>
    </div>`;
  }
  return `<div class="momentum">
    <div class="momentum-head"><span>Closing in</span><span>3 nearest</span></div>
    ${nearest
      .map(
        (x) => `<div class="momentum-row">
          <span class="momentum-label">${esc(x.label)}</span>
          <span class="momentum-value">${esc(x.value)}</span>
          <span class="bar bar--thin bar--${x.kind}"><i style="width:${ui.pct(x.pct)}%"></i></span>
        </div>`
      )
      .join('')}
  </div>`;
}

// ---------- 4 · Comeback (never guilt) ----------
function comebackHTML() {
  const f = state.flags;
  if (!(f.streakLost && state.streak.current === 0 && (f.prevStreak || 0) > 0)) return '';
  return `<div class="comeback">
    <div class="comeback-top">
      <span class="comeback-mascot">${ui.mascot(48, 'happy')}</span>
      <span class="grow">
        <span class="alert-title">Your streak stopped at ${f.prevStreak}.</span>
        <span class="alert-sub">Your ${stampCount()} sentences are still here.</span>
      </span>
    </div>
    <div class="comeback-actions">
      <button class="btn btn-primary btn-sm" data-warmup type="button">Start a warm-up</button>
      <button class="btn btn-ghost btn-sm" data-repair type="button">Repair streak</button>
    </div>
  </div>`;
}

// ---------- 5 · Fading alert (#1 return trigger) ----------
function fadingHTML() {
  const d = decayReport();
  if (!d.total) return '';
  const label = d.total === 1 ? '1 sentence is fading' : `${d.total} sentences are fading`;
  return `<button class="alert-card alert-card--amber" data-fading type="button">
    <span class="alert-ico">${ui.icon('clock', 22)}</span>
    <span class="grow">
      <span class="alert-title">${label}</span>
      <span class="alert-sub">3 minutes? Review before they get fuzzy.</span>
    </span>
    <span class="alert-go">${ui.icon('arrow', 18)}</span>
  </button>`;
}

// ---------- 6 · Pack banner (sticky) ----------
function packHTML() {
  const unit = currentUnit();
  return `<div class="pack-banner">
    <div class="pack-text">
      <div class="pack-overline">Pack ${unit.order}</div>
      <div class="pack-title">${esc(unit.koTitle)} ${esc(unit.title)}</div>
    </div>
    <button class="btn btn-ghost guide-btn" data-guide type="button">
      ${ui.icon('book', 16)} Guidebook
    </button>
  </div>`;
}

// ---------- 7 · The path ----------
function pathHTML() {
  const done = new Set(state.path.completedNodes || []);
  const open = firstOpenIndex();
  let seq = 0;
  let lastUnit = null;
  let html = '';

  NODES.forEach((node) => {
    const unit = UNIT_META.find((u) => u.id === node.unitId);
    if (unit && unit.id !== lastUnit) {
      lastUnit = unit.id;
      const pp = packProgress(unit.id);
      html += `<div class="path-pack-head">
        <span class="path-pack-name">Pack ${unit.order} · ${esc(unit.koTitle)} ${esc(unit.title)}</span>
        <span class="path-pack-meta">${pp.met}/${pp.total} met</span>
      </div>`;
    }

    const isDone = done.has(node.index);
    const isNow = !isDone && node.index === open;
    const offset = ZIGZAG[seq++ % ZIGZAG.length];
    const cls = isDone ? 'node--done' : isNow ? 'node--now' : 'node--lock';
    const glyph = isDone
      ? ui.icon('check', 26)
      : isNow
        ? ui.icon('play', 34)
        : ui.icon('lock', 24);
    const attr = isDone || isNow ? `data-node="${node.index}"` : 'data-locked="1"';
    const a11y = isNow
      ? `Start Node ${node.index + 1}`
      : isDone
        ? `Replay Node ${node.index + 1}`
        : `Node ${node.index + 1}, locked`;

    html += `<div class="node-wrap" style="margin-left:${offset}px">
      ${isNow ? '<span class="node-start">START</span>' : ''}
      <button class="node ${cls}" ${attr} type="button" aria-label="${a11y}">${glyph}</button>
      <span class="node-label">Node ${node.index + 1}</span>
    </div>`;

    // Chest checkpoint: every 5th node or the end of a pack.
    if (node.isUnitEnd || (node.index + 1) % 5 === 0) {
      const chestOffset = ZIGZAG[seq++ % ZIGZAG.length];
      const locked = !isDone;
      html += `<div class="node-wrap path-chest" style="margin-left:${chestOffset}px">
        <button class="node node--chest ${locked ? 'is-locked' : ''}" ${
          locked ? 'data-locked="1"' : 'data-chest="1"'
        } type="button" aria-label="${locked ? 'Pack chest, locked' : 'Pack chest'}">
          ${ui.icon('chest', 28)}
        </button>
        <span class="node-label">Chest</span>
      </div>`;
    }
  });

  return `<div class="path-wrap"><div class="path">${html}</div></div>`;
}

// ---------- 8 · Sentence of the Day ----------
function sodHTML() {
  if (state.day < 1) return '';
  const s = sentenceOfTheDay();
  if (!s) return '';
  currentSod = s;
  const revealed = state.flags.sodDate === todayKey();
  const english = esc(s.english);
  return `<div class="sod-card">
    <div class="row-between">
      <span class="overline">Sentence of the Day</span>
      <span class="pill pill--sm pill--amber">${revealed ? 'revealed' : '+20 XP'}</span>
    </div>
    <div class="sod-ko-row">
      <span class="sod-ko">${esc(s.korean)}</span>
      ${ui.sayBtn(s.korean, { small: true })}
    </div>
    ${
      revealed
        ? `<p class="sod-en">${english}</p>
           <p class="small muted mt-2">Revealed today · +20 XP claimed</p>`
        : `<div class="sod-en-wrap" data-sod-wrap>
             <p class="sod-en is-blurred" aria-hidden="true">${english}</p>
             <button class="sod-reveal" data-sod-reveal type="button">${ui.icon('eye', 16)} Tap to reveal</button>
           </div>
           <p class="small muted mt-2">A real sentence from later in the course.</p>`
    }
  </div>`;
}

// ---------- 9 · Quest strip ----------
function questStripHTML() {
  const items = state.quests.items || [];
  const done = items.filter((q) => q.done).length;
  const dots = [0, 1, 2].map((i) => `<i class="${i < done ? 'on' : ''}"></i>`).join('');
  return `<button class="quest-strip" data-go="quests" type="button">
    <span class="quest-strip-ico">${ui.icon('quests', 22)}</span>
    <span class="grow">
      <span class="quest-strip-title">Daily quests · ${done}/3</span>
      <span class="quest-strip-sub">${done === 3 ? 'All done. Bonus chest claimed.' : 'Three small wins waiting.'}</span>
    </span>
    <span class="quest-dots">${dots}</span>
    <span class="quest-chev">${ui.icon('chevron', 18)}</span>
  </button>`;
}

// ---------- 10 · League teaser ----------
function leagueHTML() {
  if (state.day >= 7 && !state.flags.leagueJoined) {
    try {
      ensureLeague();
    } catch {
      /* no-op: league stays locked */
    }
  }
  if (state.flags.leagueJoined || state.league.members.length) {
    const rank = state.league.rank || '—';
    return `<button class="league-row" data-go="league" type="button">
      <span class="league-ico">${ui.icon('trophy', 22)}</span>
      <span class="grow">
        <span class="league-title">${esc(state.league.tier)} League · #${rank}</span>
        <span class="league-sub">Weekly XP · resets Sunday</span>
      </span>
      ${ui.icon('chevron', 18)}
    </button>`;
  }
  return `<div class="league-row league-row--lock">
    <span class="league-ico">${ui.icon('lock', 20)}</span>
    <span class="grow">
      <span class="league-title">League unlocks Day 7</span>
      <span class="league-sub">Day ${state.day} of 7 · keep your streak alive</span>
    </span>
  </div>`;
}

// ---------- 11 · Cheapest next step ----------
function metricWord(q, n) {
  const map = {
    correct: 'correct answer',
    nodes: 'node',
    xp: 'XP',
    crits: 'crit',
    fadingReviews: 'fading review',
    comboBest: 'combo step',
    stars3: '3-star node',
    listens: 'listen',
    said: 'spoken sentence',
    speed8: 'speed round',
    newSentences: 'new sentence',
  };
  const w = map[q.metric] || 'step';
  return n > 1 && w !== 'XP' ? `${w}s` : w;
}

function cheapestNextStep() {
  const cand = [];
  const open = firstOpenIndex();
  const goal = state.profile.dailyGoalXp || 120;
  const xp = state.counters.xp || 0;
  const goalLeft = Math.max(0, goal - xp);

  if (goalLeft > 0) {
    const answers = Math.max(1, Math.ceil(goalLeft / 10));
    cand.push({
      steps: answers,
      label: `${answers} answer${answers > 1 ? 's' : ''} to your daily goal`,
      screen: 'lesson',
      params: { kind: 'practice' },
    });
  }

  const li = levelInfo();
  if (li.remaining > 0) {
    const answers = Math.max(1, Math.ceil(li.remaining / 10));
    cand.push({
      steps: answers + 0.2,
      label: `${answers} answer${answers > 1 ? 's' : ''} to Level ${li.level + 1}`,
      screen: 'lesson',
      params: { kind: 'practice' },
    });
  }

  const chestGap = 3 - state.chest.slots;
  if (chestGap > 0 && open !== null) {
    cand.push({
      steps: chestGap * 8,
      label: `${chestGap} node${chestGap > 1 ? 's' : ''} to your next chest (${state.chest.slots}/3)`,
      screen: 'lesson',
      params: { node: open },
    });
  }

  const unit = currentUnit();
  const pp = packProgress(unit.id);
  const packLeft = pp.total - pp.met;
  if (packLeft > 0 && open !== null) {
    cand.push({
      steps: packLeft,
      label: `${packLeft} stamp${packLeft > 1 ? 's' : ''} to finish ${unit.title}`,
      screen: 'lesson',
      params: { node: open },
    });
  }

  (state.quests.items || [])
    .filter((q) => !q.done)
    .forEach((q) => {
      const left = Math.max(0, q.target - questProgress(q));
      if (!left) return;
      cand.push({
        steps: left,
        label: `${left} ${metricWord(q, left)} to finish a quest`,
        screen: 'quests',
        params: {},
      });
    });

  cand.sort((a, b) => a.steps - b.steps);
  return (
    cand[0] || {
      label: "You've met all 40 sentences. Now it's about keeping them.",
      screen: 'passport',
      params: {},
    }
  );
}

function nextUpHTML() {
  const step = cheapestNextStep();
  const tag = step.screen ? 'button' : 'div';
  const attr = step.screen ? 'data-next type="button"' : '';
  return `<${tag} class="next-up" ${attr}>
    <span class="next-up-ico">${ui.icon('arrow', 18)}</span>
    <span class="grow">
      <span class="overline">Next up</span>
      <span class="next-up-text">${esc(step.label)}</span>
    </span>
  </${tag}>`;
}

// ---------- overlays ----------
function openGoalSheet() {
  const goal = state.profile.dailyGoalXp || 120;
  const idx = GOAL_OPTIONS.indexOf(goal);
  const next = GOAL_OPTIONS[(idx < 0 ? 0 : idx + 1) % GOAL_OPTIONS.length];
  const xp = state.counters.xp || 0;
  const body = `<p>Your goal is <b>${goal} XP</b> a day. Most learners clear it in one or two 3-minute nodes.</p>
    <p class="small muted mt-3">Streaks count the moment you hit it. 60 XP is a light day, 180 XP is a serious one — and you can change it any time.</p>
    <div class="kv mt-3"><span>Today</span><b>${ui.fmt(xp)} / ${ui.fmt(goal)} XP</b></div>`;
  ui.sheet({
    title: 'Daily goal',
    body,
    actions: [
      {
        label: `Change goal to ${next} XP`,
        onClick: () => {
          state.profile.dailyGoalXp = next;
          save();
          ui.toast(`Daily goal · ${next} XP`, { icon: 'target', tone: 'mint' });
          router.refresh();
        },
      },
      { label: 'Got it' },
    ],
  });
}

function openGuidebook() {
  const unit = currentUnit();
  const gps = (unit.grammar_point_ids || [])
    .map((id) => GP_BY_ID.get(id))
    .filter(Boolean)
    .slice(0, 3);
  const pp = packProgress(unit.id);
  const body = `<p class="small muted">${esc(unit.goal || '')}</p>
    <div class="gp-list mt-4">
      ${gps
        .map(
          (g) => `<div class="gp-row">
            <div class="gp-label">${esc(g.label)}</div>
            <div class="gp-expl">${esc(g.explanation)}</div>
          </div>`
        )
        .join('')}
    </div>
    <div class="mt-5">
      <div class="row-between">
        <span class="small muted">${pp.met} of ${pp.total} sentences met</span>
        <b class="small">${Math.round(pp.pct)}%</b>
      </div>
      <div class="bar mt-2"><i style="width:${ui.pct(pp.pct)}%"></i></div>
    </div>`;
  ui.sheet({ title: `${unit.koTitle} ${unit.title}`, body, actions: [{ label: 'Got it' }] });
}

function chestSlotsHTML(slots) {
  return [0, 1, 2]
    .map((i) => `<span class="chest-slot ${i < slots ? 'on' : ''}">${ui.chestSvg(18)}</span>`)
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

function openChestSheet() {
  const slots = state.chest.slots;
  const body = `<div class="chest-hero">${ui.chestSvg(128)}</div>
    <p class="center small muted">Chest ${slots} of 3</p>
    <div class="chest-slots mt-3" style="justify-content:center">${chestSlotsHTML(slots)}</div>
    <div class="bar mt-4"><i style="width:${ui.pct((slots / 3) * 100)}%"></i></div>
    <p class="center small muted mt-3">${slots ? 'Finish a node to fill another slot.' : 'One chest per completed node, up to 3 a day.'}</p>`;
  ui.sheet({
    title: `Chest ${slots} of 3`,
    body,
    actions:
      slots > 0
        ? [
            {
              label: 'Open chest',
              onClick: () => {
                const res = openChest();
                if (!res) {
                  ui.toast('No chest to open yet');
                  return;
                }
                audio.sfx('chest');
                if (res.rarity !== 'common') ui.confetti({ count: res.rarity === 'legendary' ? 46 : 24 });
                router.refresh();
                setTimeout(() => showChestResult(res), 190);
              },
            },
          ]
        : [{ label: 'Practice 10', onClick: () => router.go('lesson', { kind: 'practice' }) }],
  });
}

function repairStreak() {
  if (!state.flags.streakLost) return;
  const prev = state.flags.prevStreak || 0;
  const restored = Math.min(30, Math.round(prev * 0.5));
  state.streak.current = restored;
  state.streak.best = Math.max(state.streak.best || 0, restored);
  // Treat yesterday as counted so refreshDay does not re-break the repaired streak.
  state.streak.lastGoalDate = clock.yesterdayKey();
  state.streak.repairUsedAt = clock.now().toISOString();
  state.flags.streakLost = false;
  state.flags.repairOffered = true;
  save();
  audio.sfx('streak');
  ui.toast(`Streak repaired · Day ${restored}`, { icon: 'flame', tone: 'amber' });
  router.refresh();
}

// ---------- module ----------
export default {
  id: 'home',
  title: 'Learn',
  nav: 'home',
  hideNav: false,

  render() {
    collectQuests();

    const goal = `
      ${hudHTML()}
      ${goalHTML()}
      ${quickHTML()}
      ${momentumHTML()}
      ${comebackHTML()}
      ${fadingHTML()}
      ${packHTML()}
      ${pathHTML()}
      ${sodHTML()}
      ${questStripHTML()}
      ${leagueHTML()}
      ${nextUpHTML()}
    `;

    return `<section class="screen home">
      <div class="home-stack stagger">${goal}</div>
    </section>`;
  },

  mount(root) {
    pendingToasts.splice(0).forEach((q) => {
      ui.toast(q.allDone ? 'All daily quests done · +50 coins' : `Quest complete · ${q.title}`, {
        icon: 'check',
        tone: 'mint',
      });
    });

    const xp = state.counters.xp || 0;
    const num = root.querySelector('[data-goal-xpnum]');
    if (num && xp > 0) ui.countUp(num, 0, xp, 620);

    root.querySelector('[data-goal]')?.addEventListener('click', openGoalSheet);
    root.querySelector('[data-guide]')?.addEventListener('click', openGuidebook);

    root.querySelectorAll('[data-node]').forEach((el) => {
      el.addEventListener('click', () => {
        audio.sfx('tap');
        router.go('lesson', { node: Number(el.dataset.node) });
      });
    });

    root.querySelectorAll('[data-locked]').forEach((el) => {
      el.addEventListener('click', () => ui.toast('Finish the node above first.'));
    });

    root.querySelectorAll('[data-chest]').forEach((el) => {
      el.addEventListener('click', openChestSheet);
    });
    root.querySelector('[data-warmup]')?.addEventListener('click', () => {
      router.go('lesson', { kind: 'practice' });
    });
    root.querySelector('[data-repair]')?.addEventListener('click', repairStreak);
    root.querySelector('[data-practice]')?.addEventListener('click', () => {
      router.go('lesson', { kind: 'practice' });
    });

    root.querySelector('[data-review]')?.addEventListener('click', () => {
      router.go('lesson', { kind: 'review' });
    });

    root.querySelector('[data-fading]')?.addEventListener('click', () => {
      router.go('lesson', { kind: 'review' });
    });

    root.querySelector('[data-next]')?.addEventListener('click', () => {
      const step = cheapestNextStep();
      if (step.screen) router.go(step.screen, step.params || {});
    });

    root.querySelector('[data-sod-reveal]')?.addEventListener('click', (ev) => {
      const btn = ev.currentTarget;
      btn.disabled = true;
      const first = state.flags.sodDate !== todayKey();
      if (first) {
        addXP(20, 'sod');
        state.flags.sodDate = todayKey();
        state.flags.sodRevealed = true;
        save();
        audio.sfx('coin');
        ui.confetti({ count: 18 });
        ui.toast('Sentence of the Day · +20 XP', { icon: 'sparkle', tone: 'amber' });
      }
      const wrap = root.querySelector('[data-sod-wrap]');
      if (wrap && currentSod) {
        wrap.classList.add('is-open');
        wrap.innerHTML = `<p class="sod-en">${esc(currentSod.english)}</p>
          <p class="small muted mt-2">Revealed today · +20 XP claimed</p>`;
      }
      const updated = state.counters.xp || 0;
      const numEl = root.querySelector('[data-goal-xpnum]');
      if (numEl) numEl.textContent = ui.fmt(updated);
      setTimeout(() => {
        if (router.currentScreen()?.id === 'home') router.refresh();
      }, 420);
    });
  },

  destroy() {},
};
