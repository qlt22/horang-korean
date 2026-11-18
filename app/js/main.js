// Boot: register screens, build shell chrome, render side panels.
import * as ui from './core/ui.js';
import * as audio from './core/audio.js';
import * as store from './core/store.js';
import { state, refreshDay, subscribe, levelInfo, stampCount, decayReport, weekDaysActive } from './core/store.js';
import { router } from './core/router.js';
import { NODES, UNIT_META, SENTENCES } from './core/engine.js';
import * as clock from './core/clock.js';

import welcome from './screens/welcome.js';
import onboarding from './screens/onboarding.js';
import home from './screens/home.js';
import lesson from './screens/lesson.js';
import complete from './screens/complete.js';
import quests from './screens/quests.js';
import shop from './screens/shop.js';
import league from './screens/league.js';
import passport from './screens/passport.js';
import profile from './screens/profile.js';
import settings from './screens/settings.js';
import demo from './screens/demo.js';
import vocab from './screens/vocab.js';
import grammar from './screens/grammar.js';
import exam from './screens/exam.js';
import lab from './screens/lab.js';
import constellation from './screens/constellation.js';
import bounties from './screens/bounties.js';
import expedition from './screens/expedition.js';
import city from './screens/city.js';
import * as cityCore from './core/city.js';
import { ensureEngagement } from './core/engagement.js';

const SCREENS = { welcome, onboarding, home, lesson, complete, quests, shop, league, passport, profile, settings, demo, vocab, grammar, exam, lab, constellation, bounties, expedition, city };

const TABS = [
  { id: 'home', label: 'Learn', icon: 'home' },
  { id: 'city', label: 'City', icon: 'city' },
  { id: 'quests', label: 'Quests', icon: 'quests' },
  { id: 'passport', label: 'Collection', icon: 'passport' },
  { id: 'profile', label: 'Me', icon: 'user' },
];

function buildTabs() {
  const nav = document.getElementById('tabbar');
  nav.innerHTML = TABS.map(
    (t) => `<button class="tab" data-tab="${t.id}" type="button" aria-label="${t.label}">
      ${ui.icon(t.icon, 24)}<span>${t.label}</span>
    </button>`
  ).join('');
}

function renderSidePanels() {
  const info = levelInfo();
  const stamps = stampCount();
  const decay = decayReport();
  const left = document.getElementById('sideLeft');
  const right = document.getElementById('sideRight');
  if (!left || !right) return;

  left.innerHTML = `
    <div class="brand-panel">
      <div class="brand-mark">
        <div class="brand-logo">ㅎ</div>
        <div>
          <div class="brand-name">Horang</div>
          <div class="brand-tag">Korean, one quest at a time.</div>
        </div>
      </div>
      <div class="panel-card">
        <h3>The loop</h3>
        <div class="panel-stat"><span>1 · 6-minute lesson</span><b>+150 XP</b></div>
        <div class="panel-stat"><span>2 · crits &amp; chests</span><b>variable</b></div>
        <div class="panel-stat"><span>3 · streak &amp; goal</span><b>daily</b></div>
        <div class="panel-stat"><span>4 · 288 sentences fade</span><b>come back</b></div>
        <p class="panel-note">Every session ends with an unfinished bar and a named next step. That is the retention engine — not a guilt-trip notification.</p>
      </div>
      <div class="panel-card">
        <h3>Course</h3>
        <div class="panel-stat"><span>Units</span><b>12 · A1</b></div>
        <div class="panel-stat"><span>Sessions</span><b>${state.path.completedNodes.length} / ${NODES.length}</b></div>
        <div class="panel-stat"><span>Words</span><b>576</b></div>
        <div class="panel-stat"><span>Grammar</span><b>48 points</b></div>
      </div>
      <div class="panel-card">
        <h3>Show a reviewer</h3>
        <button class="btn btn-secondary btn-block btn-sm" data-go="demo" type="button">${ui.icon('chart', 18)} 30-day retention lab</button>
        <p class="panel-note">Time-travels the real app state through Day 0 → 7 → 14 → 30, including a lapse and comeback.</p>
      </div>
    </div>`;

  const fadingLine = decay.total
    ? `<span style="color:var(--amber-700);font-weight:700">${decay.total} fading</span>`
    : `<span style="color:var(--mint-700);font-weight:700">nothing fading</span>`;
  const courseDone = state.path.currentNode >= NODES.length;
  const nextNode = NODES[Math.min(state.path.currentNode, NODES.length - 1)];
  const unit = UNIT_META.find((u) => u.id === nextNode?.unitId);
  right.innerHTML = `
    <div class="brand-panel">
      <div class="panel-card" style="margin-top:0">
        <h3>Live player state</h3>
        <div class="panel-stat"><span>Name</span><b>${ui.esc(state.profile.name || 'Explorer')}</b></div>
        <div class="panel-stat"><span>Level</span><b>${info.level} · ${info.rank}</b></div>
        <div class="panel-stat"><span>Streak</span><b>${state.streak.current} 🔥</b></div>
        <div class="panel-stat"><span>Sentences strong</span><b>${stamps} / ${SENTENCES.length}</b></div>
        <div class="panel-stat"><span>Memory</span><b>${fadingLine}</b></div>
        <div class="panel-stat"><span>Coins / gems</span><b>${ui.fmt(state.coins)} / ${state.gems}</b></div>
        <div class="panel-stat"><span>Day</span><b>Day ${state.day}</b></div>
      </div>
      <div class="panel-card">
        <h3>Today</h3>
        <div class="panel-stat"><span>Goal</span><b>${Math.min(state.counters.xp, state.profile.dailyGoalXp)} / ${state.profile.dailyGoalXp} XP</b></div>
        <div class="panel-stat"><span>Next session</span><b>${courseDone ? 'All met' : `Session ${(nextNode?.index ?? 0) + 1}`}</b></div>
        <div class="panel-stat"><span>Up next</span><b>${courseDone ? 'Review &amp; retain' : unit ? unit.title : ''}</b></div>
        <div class="panel-quote">“${state.streak.current > 0 ? `Day ${state.streak.current}. One 3-minute run keeps it.` : 'One sentence is enough to start the streak.'}”</div>
      </div>
    </div>`;
}

function boot() {
  buildTabs();
  ensureEngagement();
  cityCore.ensureCity();
  cityCore.tick();
  refreshDay();
  setInterval(() => cityCore.tick(), 15000);
  audio.setEnabled(state.settings.sound);
  if (state.settings.voice && audio.getVoice() !== state.settings.voice) audio.setVoice(state.settings.voice);
  ui.initReducedMotion(state.settings.reducedMotion);
  router.register(SCREENS);
  const start = state.flags.onboardingDone ? 'home' : 'welcome';
  router.boot(start);
  renderSidePanels();
  subscribe(() => renderSidePanels());

  document.addEventListener(
    'pointerdown',
    () => {
      audio.unlock();
    },
    { once: true }
  );

  // Debug/test handle
  window.horang = { state, store, router, clock, ui, audio };
}

boot();
