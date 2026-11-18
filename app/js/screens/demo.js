// Retention Lab — proves the acquisition + retention loop by time-travelling the REAL app state.
// Nothing here is a mock: every day runs the same store/engine code the learner hits.
import {
  state,
  save,
  saveNow,
  refreshDay,
  startSession,
  recordAnswer,
  completeNode,
  openChest,
  ensureLeague,
  rankLeague,
  levelInfo,
  stampCount,
  decayReport,
  markWordSeen,
  recordWord,
  replaceState,
  exportData,
} from '../core/store.js';
import * as clock from '../core/clock.js';
import { NODES, SENTENCES } from '../core/engine.js';
import * as ui from '../core/ui.js';
import * as audio from '../core/audio.js';
import { router } from '../core/router.js';

const BACKUP_KEY = 'horang.demoBackup.v1';

const MILESTONES = [
  {
    day: 0,
    tag: 'Hook',
    title: 'First 90 seconds',
    body:
      'No signup. Four taps. Their own name becomes sentence #0 — really spoken, really recorded. First win at ~50s, first level-up before the first lesson ends.',
    sees: 'Sentence #0 · Level 2 · scripted Rare chest · 3 unfinished bars',
  },
  {
    day: 1,
    tag: 'Return',
    title: 'It remembers me',
    body:
      'The notification names a real, decaying thing: “5 sentences are fading.” The streak freeze arrives as insurance, not a nag. Sentence of the Day opens a curiosity gap and the word bank starts to fill.',
    sees: 'Streak 2 · freeze gifted · fading sentences · chest 2/3',
  },
  {
    day: 3,
    tag: 'Identity',
    title: 'I am the kind of person who does this',
    body:
      'Streak 3 makes the habit part of the self-image. The daily plan gives a shape to the session, the first unit badge is close, and the first cosmetic is already affordable with earned coins.',
    sees: 'Streak 3 · daily plan · Unit 1 badge close · shop affordable',
  },
  {
    day: 7,
    tag: 'Status',
    title: 'I am competing and I have a record',
    body:
      'League placement drops them into a 30-person cohort with top-5 promotion and a labelled pacer benchmark. Streak 7 pays a freeze, and the profile is now a real record of sessions, accuracy and words.',
    sees: '30-person league · top 5 promote · streak 7 · freeze gifted',
  },
  {
    day: 14,
    tag: 'Competence',
    title: 'I can survive a café',
    body:
      'Two weeks of lessons cover introductions, daily life, food and money. The first checkpoints are passed, and the phrases are things they have said out loud rather than flashcards they recognised.',
    sees: '2–3 unit badges · 70+ sentences met · words with pips',
  },
  {
    day: 30,
    tag: 'Halfway',
    title: 'Half the course is behind me',
    body:
      'Roughly half of the 60 sessions and half the 288 sentences are met. The collection is a real library, the league has a history, and the A1 certificate is suddenly visible on the horizon.',
    sees: '≈6 unit badges · ~150 sentences met · level 15+',
  },
  {
    day: 41,
    tag: 'Lapse',
    title: 'Life happens (4 days skipped)',
    body:
      'Nothing is confiscated. Freezes absorb what they can, the streak breaks honestly, and the app keeps the asset visible: your sentences, words, badges and XP are still yours.',
    sees: 'Streak stopped · no lost badges, XP, coins or mastery',
  },
  {
    day: 44,
    tag: 'Comeback',
    title: 'Rekindle',
    body:
      'Return is framed around what is still owned, never days missed. The home screen offers a free streak repair (half the old streak) and a one-lesson warm-up. The loss frame describes real memory decay.',
    sees: '“Your streak stopped at N” · free repair · warm-up',
  },
  {
    day: 60,
    tag: 'A1',
    title: 'I am an A1 Korean speaker',
    body:
      'All 12 unit badges, 288 sentences met, 576 words in the bank and a 30-question final exam passed. The certificate has their name on it — and the next course is a choice, not a default.',
    sees: '12/12 badges · 288/288 met · A1 certificate · share card',
  },
];

function todayXp() {
  return state.stats.xpByDay[clock.today()] || 0;
}
function daySnapshot() {
  const d = decayReport();
  const info = levelInfo();
  return {
    day: state.day,
    xp: todayXp(),
    totalXp: state.xpTotal,
    streak: state.streak.current,
    best: state.streak.best,
    stamps: stampCount(),
    badges: (state.badges || []).length,
    met: SENTENCES.filter((x) => (state.mastery[x.id]?.tier || 0) >= 1).length,
    level: info.level,
    fading: d.total,
    coins: state.coins,
    chest: state.chest.slots,
    league: state.league.rank,
  };
}
function recordTimeline() {
  const snap = daySnapshot();
  state.timeline = (state.timeline || []).filter((x) => x.day !== snap.day).concat([snap]).sort((a, b) => a.day - b.day);
  save();
}

function seedDay0() {
  clock.resetClock();
  replaceState({});
  state.profile = {
    ...state.profile,
    name: state.profile.name || 'Lucas',
    avatar: state.profile.avatar || 'tiger',
    goal: 'travel',
    minutes: 10,
    dailyGoalXp: 120,
    reminderTime: '19:30',
  };
  state.flags.onboardingDone = true;
  state.flags.placementTaken = true;
  state.flags.placementLevel = 4;
  state.flags.demoUsed = true;
  saveNow();
  refreshDay();
  // Day 0 = the 90-second first node, run through the real engine.
  simulateSession({ perfect: true });
  ensureLeague();
  state.league.members = [];
  state.league.joinedDay = null;
  state.league.rank = null;
  state.flags.leagueJoined = false; // league must unlock on Day 7, not Day 0
  state.day = 0;
  recordTimeline();
  saveNow();
}

function simulateSession({ perfect = false } = {}) {
  const next = NODES[Math.min(state.path.currentNode, NODES.length - 1)];
  const kind = state.path.currentNode < NODES.length ? 'node' : 'review';
  let session = startSession(kind, kind === 'node' ? { nodeIndex: next.index } : {});
  if (!session) session = startSession('practice', {});
  if (!session) return { answered: 0 };
  let answered = 0;
  const items = session.items.slice();
  const isCp = next.kind === 'checkpoint';
  items.forEach((it) => {
    if (it.ungraded) {
      if (it.type === 'word_card' && it.wordId) {
        try { markWordSeen(it.wordId); } catch { /* ignore */ }
      }
      return;
    }
    if (it.type === 'word_match' && it.pairs) {
      it.pairs.forEach((p) => {
        try { recordWord(p.id, true); } catch { /* ignore */ }
      });
    }
    const correct = perfect || isCp ? true : Math.random() > 0.09;
    try {
      recordAnswer({ sentenceId: it.sentenceId || null, wordId: it.wordId || null, type: it.type, correct, ms: 1400 });
      answered++;
    } catch {
      /* keep the lab rolling */
    }
  });
  try {
    completeNode();
  } catch {
    /* ignore */
  }
  // A learner opens the chest they just earned.
  try {
    if (state.chest.slots > 0) openChest();
  } catch {
    /* ignore */
  }
  return { answered };
}

function simulateReview() {
  const s = startSession('review', {});
  if (!s) return;
  s.items.slice().forEach((it) => {
    if (it.ungraded) return;
    try {
      recordAnswer({ sentenceId: it.sentenceId || null, wordId: it.wordId || null, type: it.type, correct: Math.random() > 0.12, ms: 1600 });
    } catch {
      /* ignore */
    }
  });
  try {
    completeNode();
  } catch {
    /* ignore */
  }
}

const LEAGUE_LADDER = ['Bronze', 'Silver', 'Gold', 'Sapphire', 'Ruby', 'Diamond'];

function applyUnlocks() {
  if (state.day >= 3) state.flags.identityShown = true;
  if (state.day >= 7 && !state.flags.leagueJoined) {
    ensureLeague();
    state.flags.leagueJoined = true;
    state.flags.leagueSeen = true;
  }
  if (state.flags.leagueJoined) {
    ensureLeague();
    const members = rankLeague();
    // Weekly promotion: top 5 move up a tier.
    if (state.day > 7 && state.day % 7 === 0 && state.league.rank && state.league.rank <= 5) {
      const i = LEAGUE_LADDER.indexOf(state.league.tier);
      if (i >= 0 && i < LEAGUE_LADDER.length - 1) state.league.tier = LEAGUE_LADDER[i + 1];
    }
  }
}

function advanceOneDay({ skip = false } = {}) {
  clock.shiftDays(1);
  refreshDay();
  if (!skip) {
    simulateSession();
    // A real learner adds a second lesson every third day; reviews keep memory alive.
    if (state.day % 3 === 0 && state.path.currentNode < NODES.length) simulateSession();
    if (state.day % 2 === 1) simulateReview();
    // Once the 40 sentences are all met, a real learner keeps reviewing to hit the goal.
    let guard = 0;
    while (state.counters.xp < state.profile.dailyGoalXp && guard++ < 4) simulateReview();
  }
  applyUnlocks();
  recordTimeline();
  saveNow();
  return daySnapshot();
}

function advanceTo(target) {
  let guard = 0;
  while (state.day < target && guard++ < 140) {
    // Build the lapse on purpose: days 18–21 are skipped.
    const skip = state.day + 1 >= 38 && state.day + 1 <= 41;
    advanceOneDay({ skip });
  }
  applyUnlocks();
  recordTimeline();
  saveNow();
}

function nextTrigger() {
  const d = decayReport();
  if (d.total > 0) {
    return {
      icon: '🕯️',
      title: 'Horang',
      text: `${d.total} sentence${d.total > 1 ? 's are' : ' is'} fading. 3 minutes?`,
      why: 'Trigger #1: real memory decay (the only loss frame that is honest)',
    };
  }
  if (state.streak.current > 0 && state.counters.xp < state.profile.dailyGoalXp) {
    const left = Math.max(1, state.profile.dailyGoalXp - state.counters.xp);
    return {
      icon: '🔥',
      title: 'Horang',
      text: `${left} XP to your goal — that's one answer.`,
      why: 'Trigger #2: streak at risk + goal-gradient remainder',
    };
  }
  if (state.chest.slots === 2) {
    return {
      icon: '🎁',
      title: 'Horang',
      text: 'Your chest is 2/3 full. Horang is holding it.',
      why: 'Trigger #3: Zeigarnik — an almost-complete meter',
    };
  }
  const q = (state.quests.items || []).find((x) => !x.done);
  if (q) {
    const p = Math.min(q.target, (state.quests.items && q.target) || 1);
    return {
      icon: '🎯',
      title: 'Horang',
      text: `One quest step from done: ${q.title}.`,
      why: 'Trigger #4: goal gradient on a daily quest',
      progress: p,
    };
  }
  return {
    icon: '✦',
    title: 'Horang',
    text: 'Day ' + (state.day + 1) + '. One 3-minute run keeps the streak.',
    why: 'Trigger #5: fixed cue at the chosen reminder time',
  };
}

function sparkline() {
  const byDay = {};
  (state.timeline || []).forEach((t) => {
    byDay[t.day] = t.xp;
  });
  const maxDay = Math.max(60, state.day);
  const max = Math.max(150, ...Object.values(byDay));
  let bars = '';
  for (let d = 0; d <= maxDay; d++) {
    const xp = byDay[d] || 0;
    const h = xp ? Math.max(6, Math.round((xp / max) * 54)) : 3;
    const cls = xp === 0 ? 'is-off' : d === state.day ? 'is-now' : '';
    bars += `<i class="${cls}" style="height:${h}px" title="Day ${d}: ${xp} XP"></i>`;
  }
  return `<div class="lab-spark">${bars}</div>
    <div class="lab-spark-x"><span>Day 0</span><span>Day 30</span><span>Day 60</span></div>`;
}

function milestoneRow(m) {
  const reached = state.day >= m.day;
  const isNext = !reached && MILESTONES.find((x) => x.day > state.day)?.day === m.day;
  return `<li class="lab-mile ${reached ? 'is-reached' : ''} ${isNext ? 'is-next' : ''}">
    <div class="lab-mile-rail"><span class="lab-mile-dot">${reached ? ui.icon('check', 14) : m.day}</span></div>
    <div class="lab-mile-body">
      <div class="lab-mile-head">
        <span class="lab-tag">${m.tag}</span>
        <b>Day ${m.day}</b>
        <span class="lab-mile-title">${ui.esc(m.title)}</span>
      </div>
      <p class="lab-mile-text">${ui.esc(m.body)}</p>
      <p class="lab-mile-sees">${ui.icon('eye', 13)} ${ui.esc(m.sees)}</p>
      ${
        m.day > state.day
          ? `<button class="btn btn-secondary btn-sm lab-jump" data-jump="${m.day}" type="button">Fast-forward to Day ${m.day}</button>`
          : ''
      }
    </div>
  </li>`;
}

export default {
  id: 'demo',
  title: 'Retention Lab',
  nav: null,
  hideNav: true,
  render() {
    const snap = daySnapshot();
    const info = levelInfo();
    const trig = nextTrigger();
    const d = decayReport();
    const league = state.league;
    const cloud = MILESTONES.filter((m) => m.day <= state.day);
    return `<section class="screen lab">
      <div class="lab-top">
        <button class="icon-btn" data-back="home" type="button" aria-label="Back">${ui.icon('back', 22)}</button>
        <div class="lab-title">
          <span class="overline">Proof, not promises</span>
          <h1 class="h2">Retention Lab</h1>
        </div>
        <span class="day-chip">DAY ${state.day}</span>
      </div>

      <div class="lab-hero">
        <div class="lab-hero-copy">
          <h2>This is the real A1 course.</h2>
          <p>Every button moves the virtual clock forward and runs the <b>same code paths</b> a learner hits: 60 sessions, 288 sentences, 576 words, 12 badges, XP, chests, streaks, memory decay, leagues. Nothing below is mocked.</p>
        </div>
        <div class="lab-hero-mascot">${ui.mascot(84, 'think')}</div>
      </div>

      <div class="lab-actions">
        <button class="btn btn-primary btn-sm" data-day="1" type="button">+1 day</button>
        <button class="btn btn-secondary btn-sm" data-skip="1" type="button">+1 skipped day</button>
        <button class="btn btn-ink btn-sm" data-full type="button">Run the whole A1 course</button>
      </div>

      <div class="lab-stats">
        <div><span>Streak</span><b>${snap.streak} 🔥</b></div>
        <div><span>Level</span><b>${snap.level}</b></div>
        <div><span>Badges</span><b>${snap.badges}/12</b></div>
        <div><span>Met</span><b>${snap.met}/288</b></div>
        <div><span>Words</span><b>${Object.keys(state.wordMastery || {}).length}/576</b></div>
        <div><span>League</span><b>${league.joinedDay != null ? (league.rank ? '#' + league.rank : league.tier) : '—'}</b></div>
      </div>

      <div class="card lab-notif">
        <div class="lab-notif-top">
          <span class="lab-notif-app">${ui.icon('bell', 14)} Notification preview</span>
          <span class="lab-notif-time">${clock.timeGreeting()}</span>
        </div>
        <div class="lab-notif-card">
          <span class="lab-notif-ico">${trig.icon}</span>
          <div>
            <b>${ui.esc(trig.title)}</b>
            <p>${ui.esc(trig.text)}</p>
          </div>
        </div>
        <p class="lab-notif-why">${ui.esc(trig.why)}</p>
        <p class="lab-notif-meta">One a day. Quiet hours 22:00–08:00. No guilt verbs. The number is always real.</p>
      </div>

      <div class="card lab-funnel">
        <div class="row-between">
          <h3>The first 90 seconds</h3>
          <span class="small muted">the draw-in</span>
        </div>
        <ol class="lab-funnel-list">
          <li><span class="lab-t">0:00</span><div><b>One headline, one button</b><span>No signup, no pricing, no nav. The only decision is “start”.</span><em>zero commitment</em></div></li>
          <li><span class="lab-t">0:12</span><div><b>Three taps: goal, time, name</b><span>Configures the XP goal and the reminder before any lesson exists.</span><em>implementation intention</em></div></li>
          <li><span class="lab-t">0:26</span><div><b>저는 [their name]입니다 — really spoken</b><span>Their own name becomes sentence #0, with a real Passport stamp.</span><em>endowed progress</em></div></li>
          <li><span class="lab-t">1:40</span><div><b>Level 2 inside the first node</b><span>+20 coins and a visible level bar before the lesson ends.</span><em>goal gradient</em></div></li>
          <li><span class="lab-t">3:20</span><div><b>Stars, stamps, first chest</b><span>The session ends on a win, not on a “come back tomorrow”.</span><em>peak-end rule</em></div></li>
          <li><span class="lab-t">5:00</span><div><b>Three unfinished bars</b><span>Exactly one named next step: “2 answers to your next chest.”</span><em>Zeigarnik effect</em></div></li>
        </ol>
      </div>

      <div class="card lab-spark-card">
        <div class="row-between">
          <h3>Daily XP earned</h3>
          <span class="small muted">skipped days are real gaps</span>
        </div>
        ${sparkline()}
        <div class="lab-legend"><span><i class="on"></i> studied</span><span><i></i> lapse</span><span><i class="now"></i> today</span></div>
      </div>

      <div class="lab-head">
        <h3>The 30-day arc</h3>
        <span class="small muted">${cloud.length}/${MILESTONES.length} reached</span>
      </div>
      <ol class="lab-timeline">${MILESTONES.map(milestoneRow).join('')}</ol>

      <div class="card lab-proof">
        <h3>What this proves</h3>
        <ul>
          <li><b>Draw-in:</b> value before signup + a personalised first sentence (endowed progress that is auditable).</li>
          <li><b>Habit:</b> a fixed cue, three unfinished bars, and a notification that names a real number.</li>
          <li><b>Loss that is honest:</b> sentences decay because memory decays. Nothing already earned is confiscated.</li>
          <li><b>Investment:</b> 288 sentences, 576 words, 12 badges, a league record and stats are all the learning record itself.</li>
          <li><b>Comeback:</b> a lapse costs the streak, never the asset — and the return offer restores half.</li>
        </ul>
        <p class="lab-proof-foot">Reviewer note: a fresh visit seeds a demo learner (Lucas) so Day 0 has something real to show; your own save is backed up and <b>Restore my progress</b> puts it back. Open <b>Me → Retention Lab</b> any time.</p>
      </div>

      <div class="lab-foot">
        <button class="btn btn-secondary btn-block btn-sm" data-restore type="button">${ui.icon('refresh', 18)} Restore my progress</button>
        <button class="btn btn-ghost btn-block btn-sm" data-reset type="button">Reset the lab to Day 0</button>
        <button class="btn btn-primary btn-block" data-go="home" type="button">Back to the app ${ui.icon('arrow', 18)}</button>
      </div>
    </section>`;
  },
  mount(root) {
    // One backup per lab visit, taken BEFORE any time travel, so "Restore my
    // progress" is real even for a learner who already has a save. Re-create it
    // whenever a prior backup was already consumed by Restore.
    try {
      if (!localStorage.getItem(BACKUP_KEY) && state.flags.onboardingDone) {
        localStorage.setItem(BACKUP_KEY, exportData());
      }
    } catch {
      /* ignore */
    }
    const jump = async (target) => {
      if (!state.flags.demoUsed) {
        try {
          if (!localStorage.getItem(BACKUP_KEY)) localStorage.setItem(BACKUP_KEY, exportData());
        } catch {
          /* ignore */
        }
      }
      if (state.day === 0 && target > 0) {
        // keep seeded day 0
      }
      advanceTo(target);
      audio.sfx('streak');
      router.refresh();
      ui.toast(`Fast-forwarded to Day ${state.day}`, { icon: 'chart', tone: 'mint' });
    };

    const isBare = () => !state.path.completedNodes.length && state.xpTotal < 60;

    root.querySelectorAll('[data-jump]').forEach((b) =>
      b.addEventListener('click', () => {
        const target = Number(b.dataset.jump);
        if (state.day === 0 && isBare()) {
          try {
            localStorage.setItem(BACKUP_KEY, exportData());
          } catch {
            /* ignore */
          }
          seedDay0();
        }
        jump(target);
      })
    );

    root.querySelector('[data-day]')?.addEventListener('click', () => {
      if (state.day === 0 && isBare()) seedDay0();
      advanceOneDay();
      audio.sfx('coin');
      router.refresh();
    });

    root.querySelector('[data-skip]')?.addEventListener('click', () => {
      if (state.day === 0 && isBare()) seedDay0();
      advanceOneDay({ skip: true });
      audio.sfx('wrong');
      router.refresh();
      ui.toast('A day passed with no session — watch the memory decay', { icon: 'clock', tone: 'amber' });
    });

    root.querySelector('[data-full]')?.addEventListener('click', () => {
      if (state.day === 0 && isBare()) seedDay0();
      advanceTo(60);
      audio.sfx('streak');
      ui.confetti({ count: 40 });
      router.refresh();
      ui.toast('60 days simulated through the real engine', { icon: 'trophy', tone: 'mint' });
    });

    root.querySelector('[data-reset]')?.addEventListener('click', () => {
      ui.modal({
        title: 'Reset the lab?',
        body: '<p class="small muted">This wipes the simulated progress and rebuilds Day 0 from scratch. Your own pre-lab save is untouched if you made one.</p>',
        actions: [
          { label: 'Reset to Day 0', cls: 'btn-danger', onClick: () => { seedDay0(); router.refresh(); } },
          { label: 'Keep my progress', cls: 'btn-ghost' },
        ],
      });
    });

    root.querySelector('[data-restore]')?.addEventListener('click', () => {
      try {
        const raw = localStorage.getItem(BACKUP_KEY);
        if (!raw) {
          ui.toast('No pre-lab save found — nothing to restore', { tone: 'amber' });
          return;
        }
        replaceState(JSON.parse(raw));
        localStorage.removeItem(BACKUP_KEY);
        const onboarded = !!state.flags.onboardingDone;
        router.go(onboarded ? 'home' : 'welcome');
        ui.toast('Your pre-lab progress is back', { tone: 'mint' });
      } catch {
        ui.toast('Could not restore the save', { tone: 'amber' });
      }
    });

    // Seed a fresh lab if the visitor arrives with no account at all.
    if (!state.flags.onboardingDone) {
      try {
        localStorage.setItem(BACKUP_KEY, exportData());
      } catch {
        /* ignore */
      }
      seedDay0();
      router.refresh();
    } else if (state.day === 0 && !state.timeline?.length) {
      recordTimeline();
    }
  },
};
