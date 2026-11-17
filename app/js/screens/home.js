// S1 · Home — the A1 course map.
// One glance answers "what do I do next?" while every retention surface stays:
// streak, daily plan, A1 progress, fading sentences, sentence of the day,
// quests, chest, league and one honest cheapest next step.
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
  dailyPlan,
  claimDailyBonus,
} from '../core/store.js';
import { NODES, UNIT_META } from '../core/engine.js';
import { SENTENCES, nextLessonIndex, unitUnlocked, grammarOf } from '../core/course.js';
import * as ui from '../core/ui.js';
import * as routerApi from '../core/router.js';
import * as clock from '../core/clock.js';
import * as audio from '../core/audio.js';

// Core currently ships a default router object; accept a named export too.
const router = routerApi.router || routerApi.default;

const KIND = {
  vocab: { label: 'Vocabulary', icon: 'book' },
  grammar: { label: 'Grammar', icon: 'sparkle' },
  listening: { label: 'Listening', icon: 'sound' },
  reading: { label: 'Reading', icon: 'book' },
  checkpoint: { label: 'Checkpoint', icon: 'trophy' },
};

let seenQuests = new Set();
let pendingToasts = [];
let currentSod = null;
let renderedNextStep = null;

function todayKey() {
  return clock.today();
}

function esc(s) {
  return ui.esc(s);
}

function collectQuests() {
  const newly = checkQuests() || [];
  const fresh = newly.filter((q) => !q.id || !seenQuests.has(q.id));
  newly.forEach((q) => {
    if (q.id) seenQuests.add(q.id);
  });
  pendingToasts = fresh;
}

function stats() {
  const completed = state.path.completedNodes || [];
  const done = new Set(completed);
  const next = nextLessonIndex(completed);
  const complete = NODES.every((n) => done.has(n.index));
  let met = 0;
  let strong = 0;
  SENTENCES.forEach((s) => {
    const tier = state.mastery[s.id]?.tier || 0;
    if (tier >= 1) met++;
    if (tier >= 3) strong++;
  });
  const unitId = complete ? null : NODES[next]?.unitId;
  return { completed, done, next, complete, met, strong, currentUnitId: unitId };
}

// ---------- 1 · HUD ----------
function hudHTML() {
  // No hearts or energy on the hub: studying is never gated.
  const gems = `<span class="pill pill--sm pill--mint" aria-label="${state.gems} gems">${ui.gem(14)} ${ui.fmt(state.gems)}</span>`;
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

// ---------- 2 · Daily plan ----------
function goalText() {
  const goal = state.profile.dailyGoalXp || 120;
  const xp = state.counters.xp || 0;
  if (xp >= goal) return { text: 'Goal hit', cls: 'is-hit' };
  const left = Math.max(0, goal - xp);
  return { text: `${left} XP to goal`, cls: left <= 15 ? 'is-close' : '' };
}

function planRow(it) {
  const complete = it.progress >= it.target;
  const pct = it.target ? (it.progress / it.target) * 100 : 0;
  const icon = it.icon === 'refresh' ? 'refresh' : it.icon === 'book' ? 'book' : 'play';
  const params = JSON.stringify(it.params || {});
  return `<button class="plan-row plan-row--${esc(it.id)} ${complete ? 'is-done' : ''}"
      data-go="${esc(it.screen)}" data-params="${esc(params)}" type="button"
      aria-label="${esc(it.label)}, ${it.progress} of ${it.target}">
    <span class="plan-ico">${ui.icon(icon, 19)}</span>
    <span class="plan-main">
      <span class="plan-line">
        <span class="plan-label">${esc(it.label)}</span>
        <span class="plan-count">${it.progress}/${it.target}</span>
      </span>
      <span class="bar bar--thin ${complete ? 'bar--mint' : ''}"><i style="width:${ui.pct(pct)}%"></i></span>
    </span>
    <span class="plan-end">${complete ? ui.icon('check', 17) : ui.icon('chevron', 16)}</span>
  </button>`;
}

function dailyPlanHTML(plan) {
  const goal = goalText();
  const claim = plan.done
    ? plan.claimed
      ? `<div class="plan-claimed">${ui.icon('check', 17)} Collected today · +60 coins</div>`
      : `<button class="btn btn-primary btn-block plan-claim" data-claim-daily type="button">
          ${ui.coin(18)} Collect +60 coins
        </button>`
    : `<p class="plan-foot">Three small wins. Then 60 coins are yours.</p>`;
  return `<section class="plan-card ${plan.done ? 'is-complete' : ''}" aria-label="Today's plan">
    <div class="plan-head">
      <div>
        <span class="overline">Today</span>
        <h2 class="plan-title">3 small wins</h2>
      </div>
      <span class="plan-goal ${goal.cls}">${ui.icon('target', 14)} ${esc(goal.text)}</span>
    </div>
    <div class="plan-rows">${plan.items.map(planRow).join('')}</div>
    ${claim}
  </section>`;
}

// ---------- 3 · A1 progress strip ----------
function progressHTML(s) {
  const sessions = s.completed.length;
  const pct = NODES.length ? (sessions / NODES.length) * 100 : 0;
  return `<section class="a1-strip" aria-label="A1 course progress">
    <div class="a1-top">
      <span class="overline">A1 course</span>
      <span class="a1-unit">${s.complete ? `All ${UNIT_META.length} units` : `Unit ${UNIT_META.find((u) => u.id === s.currentUnitId)?.order || 1} of ${UNIT_META.length}`}</span>
    </div>
    <div class="a1-count"><b>${sessions}</b><span>/ ${NODES.length} sessions</span></div>
    <div class="bar bar--indigo bar--thin a1-bar"><i style="width:${ui.pct(pct)}%"></i></div>
    <div class="a1-foot">
      <span><b>${s.met}</b> / ${SENTENCES.length} sentences met</span>
      <span class="a1-strong"><b>${s.strong}</b> strong</span>
    </div>
  </section>`;
}

// ---------- 4 · Next lesson hero ----------
function heroHTML(s) {
  if (s.complete) {
    return `<section class="hero-lesson hero-lesson--done">
      <div class="hero-glow" aria-hidden="true"></div>
      <div class="hero-top">
        <span class="hero-unit">A1 · all ${NODES.length} sessions</span>
        <span class="hero-min">${ui.icon('trophy', 14)} Course complete</span>
      </div>
      <h2 class="hero-title">A1 course complete.</h2>
      <div class="hero-meta">
        <span class="kind-chip kind-chip--checkpoint">${ui.icon('trophy', 15)} Final exam</span>
        <span class="hero-xp">${s.met} / ${SENTENCES.length} sentences met</span>
      </div>
      <button class="btn btn-primary btn-block hero-cta" data-continue-exam type="button">
        Take the final exam ${ui.icon('arrow', 19)}
      </button>
      <button class="hero-review" data-review type="button">or keep your sentences warm · review</button>
    </section>`;
  }
  const lesson = NODES[s.next];
  const unit = UNIT_META.find((u) => u.id === lesson?.unitId) || UNIT_META[0];
  const kind = KIND[lesson?.kind] || KIND.vocab;
  return `<section class="hero-lesson">
    <div class="hero-glow" aria-hidden="true"></div>
    <div class="hero-top">
      <span class="hero-unit">Unit ${unit.order} · ${esc(unit.ko)} ${esc(unit.title)}</span>
      <span class="hero-min">${ui.icon('clock', 14)} ~6 min</span>
    </div>
    <h2 class="hero-title">${esc(lesson?.title || 'Your next lesson')}</h2>
    <div class="hero-meta">
      <span class="kind-chip kind-chip--${esc(lesson?.kind || 'vocab')}">${ui.icon(kind.icon, 15)} ${kind.label}</span>
      <span class="hero-xp">+150 XP</span>
    </div>
    <button class="btn btn-primary btn-block hero-cta" data-continue type="button">
      Continue ${ui.icon('arrow', 19)}
    </button>
  </section>`;
}

// ---------- 5 · Fading alert ----------
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

// ---------- 6 · Course map ----------
function unitStatus(unit, s) {
  const done = s.done;
  const nodes = NODES.filter((n) => n.unitId === unit.id);
  if (nodes.every((n) => done.has(n.index))) return 'done';
  if (!unitUnlocked(unit.id, s.completed)) return 'locked';
  if (unit.id === s.currentUnitId) return 'current';
  const learnDone = nodes.filter((n) => n.kind !== 'checkpoint').every((n) => done.has(n.index));
  return learnDone ? 'checkpoint' : 'open';
}

function nodeHTML(node, s) {
  const kind = KIND[node.kind] || KIND.vocab;
  const isDone = s.done.has(node.index);
  const isNow = !isDone && node.index === s.next;
  const locked = !isDone && !isNow;
  const title = String(node.title || '').replace(/^Checkpoint:\s*/, '');
  const cls = isDone ? 'is-done' : isNow ? 'is-now' : 'is-locked';
  const stateMark = isDone
    ? `<span class="node-state node-state--done" aria-hidden="true">${ui.icon('check', 15)}</span>`
    : isNow
      ? `<span class="node-start-pill">START</span>`
      : `<span class="node-state node-state--lock" aria-hidden="true">${ui.icon('lock', 13)}</span>`;
  const aria = isDone
    ? `Replay ${kind.label}: ${title}`
    : isNow
      ? `Start ${kind.label}: ${title}`
      : `${kind.label}: ${title}, locked`;
  return `<li class="unit-node ${cls}">
    <button class="node-card" data-node="${node.index}" ${locked ? 'data-node-locked="1" aria-disabled="true"' : ''}
        type="button" aria-label="${esc(aria)}">
      <span class="node-ico node-ico--${esc(node.kind)}">${ui.icon(kind.icon, 20)}</span>
      <span class="node-text">
        <span class="node-kind">${kind.label}</span>
        <span class="node-title">${esc(title)}</span>
      </span>
      ${stateMark}
    </button>
  </li>`;
}

function unitHTML(unit, s) {
  const status = unitStatus(unit, s);
  const pp = packProgress(unit.id);
  const open = status !== 'locked' && unit.id === s.currentUnitId;
  const canOpen = status !== 'locked';
  const statusText =
    status === 'done' ? 'Done' : status === 'current' ? 'Current' : status === 'checkpoint' ? 'Checkpoint' : status === 'open' ? 'Open' : 'Locked';
  const statusMark = status === 'done' ? ui.icon('check', 12) : '';
  const hint = status === 'locked' ? `<span class="unit-hint">Finish Unit ${Math.max(1, unit.order - 1)} first</span>` : '';
  const nodes = NODES.filter((n) => n.unitId === unit.id);
  const bodyId = `unit-body-${unit.id}`;
  return `<section class="unit unit--${status} ${open ? 'is-open' : ''}" data-unit="${esc(unit.id)}">
    <div class="unit-head">
      <button class="unit-toggle" data-unit-toggle="${esc(unit.id)}" data-unit-order="${unit.order}"
          aria-expanded="${open}" ${canOpen ? `aria-controls="${esc(bodyId)}"` : ''} type="button">
        <span class="unit-badge">${unit.order}</span>
        <span class="unit-id">
          <span class="unit-name">
            <span class="unit-ko">${esc(unit.ko)}</span>
            <span class="unit-title">${esc(unit.title)}</span>
          </span>
          ${hint}
        </span>
        <span class="unit-meta">
          <span class="unit-met">${pp.met}/${pp.total}</span>
          <span class="unit-status unit-status--${status}">${statusMark} ${statusText}</span>
        </span>
        <span class="unit-chev">${canOpen ? ui.icon('chevron', 17) : ui.icon('lock', 15)}</span>
      </button>
      <button class="unit-info" data-unit-info="${esc(unit.id)}" type="button"
          aria-label="Guidebook for Unit ${unit.order}: ${esc(unit.title)}">
        ${ui.icon('info', 17)}
      </button>
    </div>
    ${
      canOpen
        ? `<div class="unit-body" id="${esc(bodyId)}">
            <ol class="unit-nodes">${nodes.map((n) => nodeHTML(n, s)).join('')}</ol>
          </div>`
        : ''
    }
  </section>`;
}

function mapHTML(s) {
  return `<section class="map-section" aria-label="A1 course map">
    <div class="map-head">
      <h2 class="map-title">A1 course map</h2>
      <span class="map-count">${s.completed.length}/${NODES.length} sessions</span>
    </div>
    <div class="map">${UNIT_META.map((u) => unitHTML(u, s)).join('')}</div>
  </section>`;
}

// ---------- 7 · Sentence of the Day ----------
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
      <button class="say-btn say-btn--sm" data-clip="${esc(s.id)}" data-clip-kind="s"
          data-say="${esc(s.korean)}" type="button" aria-label="Play the sentence">${ui.icon('sound', 18)}</button>
    </div>
    ${
      revealed
        ? `<p class="sod-en">${english}</p>
           <p class="small muted mt-2">Revealed today · +20 XP claimed</p>`
        : `<div class="sod-en-wrap" data-sod-wrap>
             <p class="sod-en is-blurred" aria-hidden="true">${english}</p>
             <button class="sod-reveal" data-sod-reveal type="button">${ui.icon('eye', 16)} Tap to reveal</button>
           </div>
           <p class="small muted mt-2">A real sentence from your A1 course.</p>`
    }
  </div>`;
}

// ---------- 8 · Retention rows (below the map) ----------
function chestHTML() {
  const slots = state.chest.slots || 0;
  const dots = [0, 1, 2]
    .map((i) => `<i class="${i < slots ? 'on' : ''}"></i>`)
    .join('');
  return `<button class="chest-row" data-chest-open type="button" aria-label="Chest ${slots} of 3">
    <span class="chest-row-ico">${ui.chestSvg(34)}</span>
    <span class="grow">
      <span class="chest-row-title">Chest ${slots}/3</span>
      <span class="chest-row-sub">${slots ? 'Ready to open' : 'Finish a lesson to fill a slot'}</span>
    </span>
    <span class="chest-dots">${dots}</span>
    <span class="quest-chev">${ui.icon('chevron', 17)}</span>
  </button>`;
}

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

// ---------- 9 · Cheapest next step ----------
function metricWord(q, n) {
  const map = {
    correct: 'correct answer',
    nodes: 'lesson',
    xp: 'XP',
    crits: 'crit',
    fadingReviews: 'fading review',
    comboBest: 'combo step',
    stars3: '3-star lesson',
    listens: 'listen',
    said: 'spoken sentence',
    speed8: 'speed round',
    newSentences: 'new sentence',
    words: 'word',
    reading: 'reading check',
  };
  const w = map[q.metric] || 'step';
  return n > 1 && w !== 'XP' ? `${w}s` : w;
}

function cheapestStep(s) {
  const cand = [];
  const due = decayReport().total;
  if (due > 0) {
    cand.push({
      steps: 1 + due * 0.05,
      label: `Review ${due} fading sentence${due > 1 ? 's' : ''} — 3 min`,
      screen: 'lesson',
      params: { kind: 'review' },
    });
  }

  const plan = dailyPlan();
  plan.items.forEach((it) => {
    const left = Math.max(0, it.target - it.progress);
    if (!left) return;
    const label =
      it.id === 'lesson'
        ? 'Finish today’s lesson'
        : it.id === 'review'
          ? `Review ${left} more sentence${left > 1 ? 's' : ''}`
          : `Practise ${left} more word${left > 1 ? 's' : ''}`;
    cand.push({ steps: left, label, screen: it.screen, params: it.params });
  });

  if (state.chest.slots > 0) {
    cand.push({ steps: 2, label: `Open your chest (${state.chest.slots}/3)`, action: 'chest' });
  }

  const li = levelInfo();
  if (li.remaining > 0) {
    const answers = Math.max(1, Math.ceil(li.remaining / 10));
    cand.push({
      steps: answers + 0.4,
      label: `${answers} answer${answers > 1 ? 's' : ''} to Level ${li.level + 1}`,
      screen: 'lesson',
      params: { kind: 'practice' },
    });
  }

  (state.quests.items || [])
    .filter((q) => !q.done)
    .forEach((q) => {
      const left = Math.max(0, q.target - questProgress(q));
      if (!left) return;
      cand.push({
        steps: left + 0.6,
        label: `${left} ${metricWord(q, left)} to finish a quest`,
        screen: 'quests',
        params: {},
      });
    });

  const unit = UNIT_META.find((u) => u.id === s.currentUnitId);
  if (unit && !s.complete) {
    const pp = packProgress(unit.id);
    const left = pp.total - pp.met;
    if (left > 0) {
      cand.push({
        steps: left + 0.8,
        label: `${left} sentence${left > 1 ? 's' : ''} to complete ${unit.title}`,
        screen: 'lesson',
        params: { node: s.next },
      });
    }
  }

  if (s.complete) {
    cand.push({ steps: 5, label: 'Take the A1 final exam', screen: 'exam', params: {} });
  }

  cand.sort((a, b) => a.steps - b.steps);
  return (
    cand[0] || {
      label: 'Today is clear — keep a few sentences warm',
      screen: 'lesson',
      params: { kind: 'review' },
    }
  );
}

function nextUpHTML(step) {
  return `<button class="next-up" data-next type="button">
    <span class="next-up-ico">${ui.icon('arrow', 18)}</span>
    <span class="grow">
      <span class="overline">Next up</span>
      <span class="next-up-text">${esc(step.label)}</span>
    </span>
    ${ui.icon('chevron', 16)}
  </button>`;
}

// ---------- overlays ----------
function openGuidebook(unitId) {
  const unit = UNIT_META.find((u) => u.id === unitId);
  if (!unit) return;
  const gps = grammarOf(unit.id);
  const pp = packProgress(unit.id);
  const canDo = (unit.canDo || [])
    .map((c) => `<li>${ui.icon('check', 14)}<span>${esc(c)}</span></li>`)
    .join('');
  const body = `<p class="small muted">By the end of this unit you can:</p>
    <ul class="can-do">${canDo}</ul>
    <div class="gp-list mt-4">
      ${gps
        .map(
          (g) => `<div class="gp-row">
            <div class="gp-pattern">${esc(g.pattern || g.ko || g.label)}</div>
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
  ui.sheet({
    title: `${unit.ko} ${unit.title}`,
    body,
    actions: [
      { label: 'Practise grammar', onClick: () => router.go('grammar') },
      { label: 'Got it' },
    ],
  });
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
    <p class="center small muted mt-3">${slots ? 'Open it now, or save the suspense.' : 'One chest slot per finished lesson, up to 3 a day.'}</p>`;
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
        : [{ label: 'Start a lesson', onClick: () => router.go('lesson', { kind: 'practice' }) }],
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
    const s = stats();
    renderedNextStep = cheapestStep(s);
    const plan = dailyPlan();

    return `<section class="screen home">
      <div class="home-stack stagger">
        ${hudHTML()}
        ${dailyPlanHTML(plan)}
        ${progressHTML(s)}
        ${heroHTML(s)}
        ${fadingHTML()}
        ${mapHTML(s)}
        ${sodHTML()}
        ${comebackHTML()}
        ${chestHTML()}
        ${questStripHTML()}
        ${leagueHTML()}
        ${nextUpHTML(renderedNextStep)}
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

    root.querySelector('[data-claim-daily]')?.addEventListener('click', () => {
      if (!claimDailyBonus()) {
        ui.toast('Already collected today', { icon: 'check', tone: 'mint' });
        return;
      }
      audio.sfx('coin');
      ui.confetti({ count: 26 });
      ui.toast('Today complete · +60 coins, +30 XP', { icon: 'check', tone: 'mint' });
      router.refresh();
    });

    root.querySelector('[data-continue]')?.addEventListener('click', () => {
      const next = nextLessonIndex(state.path.completedNodes || []);
      router.go('lesson', { node: next });
    });

    root.querySelector('[data-continue-exam]')?.addEventListener('click', () => {
      router.go('exam');
    });

    root.querySelector('[data-review]')?.addEventListener('click', () => {
      router.go('lesson', { kind: 'review' });
    });

    root.querySelector('[data-fading]')?.addEventListener('click', () => {
      router.go('lesson', { kind: 'review' });
    });

    root.querySelector('[data-chest-open]')?.addEventListener('click', openChestSheet);
    root.querySelector('[data-warmup]')?.addEventListener('click', () => {
      router.go('lesson', { kind: 'practice' });
    });
    root.querySelector('[data-repair]')?.addEventListener('click', repairStreak);

    root.querySelectorAll('[data-unit-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const section = btn.closest('.unit');
        if (!section) return;
        if (section.closest('.unit--locked') || section.classList.contains('unit--locked')) {
          ui.toast(`Finish Unit ${Math.max(1, Number(btn.dataset.unitOrder) - 1)} first.`, { icon: 'lock' });
          return;
        }
        const willOpen = !section.classList.contains('is-open');
        root.querySelectorAll('.unit.is-open').forEach((u) => {
          u.classList.remove('is-open');
          u.querySelector('[data-unit-toggle]')?.setAttribute('aria-expanded', 'false');
        });
        if (willOpen) {
          section.classList.add('is-open');
          btn.setAttribute('aria-expanded', 'true');
        }
        audio.sfx('tap');
      });
    });

    root.querySelectorAll('[data-unit-info]').forEach((btn) => {
      btn.addEventListener('click', () => openGuidebook(btn.dataset.unitInfo));
    });

    root.querySelectorAll('[data-node]').forEach((el) => {
      el.addEventListener('click', () => {
        if (el.dataset.nodeLocked) {
          ui.toast('Finish the session above first.', { icon: 'lock' });
          return;
        }
        audio.sfx('tap');
        router.go('lesson', { node: Number(el.dataset.node) });
      });
    });

    root.querySelector('[data-next]')?.addEventListener('click', () => {
      const step = renderedNextStep || cheapestStep(stats());
      if (step.action === 'chest') {
        openChestSheet();
        return;
      }
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
      setTimeout(() => {
        if (router.currentScreen()?.id === 'home') router.refresh();
      }, 1100);
    });
  },

  destroy() {},
};
