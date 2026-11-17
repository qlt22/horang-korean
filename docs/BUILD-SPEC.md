# BUILD SPEC — Horang (binding contract for worker agents)

Product: **Horang** — a Korean study app that feels like a premium puzzle game.
MVP scope: **40 absolute-beginner sentences**, 7 packs, 14 nodes. Do not add intermediate content.

Read first:
1. `docs/research/01-addiction-engine.md` (economy + mechanics — wins on numbers)
2. `docs/research/02-curriculum.md` (content — use `app/data/curriculum.js`, already generated)
3. `docs/research/03-ux-design.md` (pixels, copy, motion — wins on visuals)

**No build step. No npm dependencies. Vanilla ES modules + plain CSS.**
Run: `node server.js` → http://localhost:4173

---

## 1. File ownership (do not edit files you do not own)

Core (main agent, DONE — treat as read-only):

```
index.html
server.js
app/data/curriculum.js
app/styles/tokens.css        design tokens (verbatim from research 03 §4)
app/styles/base.css          reset, shell, nav, screen transitions
app/styles/components.css    buttons, cards, rings, chips, stamps, sheets, confetti
app/js/core/store.js         state + persistence + every game action
app/js/core/clock.js         virtual clock (demo can fast-forward days)
app/js/core/ui.js            helpers: esc, fmt, toast, modal, sheet, confetti, mascot, icons
app/js/core/audio.js         TTS (ko-KR) + synthesized sfx
app/js/core/srs.js           mastery tiers, due dates, decay
app/js/core/quiz.js          exercise generators for the 6 types
app/js/core/router.js        hash router + screen lifecycle + bottom nav
app/js/main.js               boot
app/js/screens/welcome.js    REFERENCE IMPLEMENTATION — copy its pattern
```

Workers:

| # | Files you own |
|---|---|
| W1 | `app/js/screens/onboarding.js` |
| W2 | `app/js/screens/lesson.js`, `app/js/screens/complete.js` |
| W3 | `app/js/screens/home.js`, `app/js/screens/quests.js` |
| W4 | `app/js/screens/shop.js`, `app/js/screens/league.js`, `app/js/screens/passport.js` |
| W5 | `app/js/screens/profile.js`, `app/js/screens/settings.js`, `app/js/screens/demo.js` |

Never edit `index.html`, core files, or another worker's screens. If core is missing something, implement locally in your screen, or note it in your final report.

---

## 2. Screen module contract

```js
import { state, save, addXP /* etc */ } from '../core/store.js';
import * as ui from '../core/ui.js';
import { router } from '../core/router.js';

export default {
  id: 'quests',
  nav: 'quests',        // 'learn'|'quests'|'shop'|'passport'|'me' — highlights bottom tab; null hides highlight
  hideNav: false,      // true for lesson/complete/demo/onboarding
  hideHeader: false,   // screens draw their own headers; nav bar is global
  render(params) { return `<section class="screen">…</section>`; }, // returns HTML string
  mount(root, params) { /* bind events with root.querySelector / addEventListener */ },
  destroy() {}
};
```

- `router.go(id, params)` pushes; `router.back()` pops; `router.refresh()` re-renders current screen.
- Re-render after state change with `router.refresh()`, or patch DOM manually for animations.
- All user text goes through `ui.esc()`.
- Every Korean string gets a speaker button: `data-say="안녕하세요"`.
- Router delegates `[data-say]` clicks to `audio.speak` globally — you do not need to wire it.
- Use `data-go="screenid"` for simple navigation (router delegates it too).
- Screens must render correctly at 390×844 **and** 1440×900 (shell is centered; never assume full window width).

---

## 3. Core API

### store
```js
import { state, save, subscribe, reset,
  addXP, addCoins, addGems, levelInfo, checkLevelUp,
  recordAnswer, completeNode, startSession, endSession,
  fillChest, openChest, checkQuests, claimDailyGoal,
  bumpCounter, refreshDay, packProgress, stampCount, dueSentences,
  decayReport, leagueWeekXp, setState } from '../core/store.js';
```

- `state` — the live persisted object (see §4). Mutate through helpers, then `save()`.
- `addXP(n, reason)` → handles level-ups, returns `{levelsUp, newLevel}`. Shows nothing; caller animates.
- `addCoins(n)`, `addGems(n)`.
- `levelInfo()` → `{level, into, need, pct, rank, rankKo, total}`.
- `recordAnswer({sentenceId, type, correct, ms, usedHint})` → `{xp, coins, crit, tier, stamp, combo, newSentence}`. Handles crit RNG (15/20/25%, guaranteed 10th answer), combo, mastery, counters, daily XP. **This is the single source of truth for grading.**
- `startSession(kind)` → creates `state.session` `{kind, items:[…], index, correct, wrong, xp, startedAt}` using `engine.buildSession`. `kind`: `'node'` (params `{nodeIndex}`), `'daily'`, `'review'`, `'practice'`.
- `completeNode()` → awards node bonus (+30 XP/+30 coins), perfect bonus (+20 XP), stars, fills chest slot, increments counters, returns summary `{xp, coins, stars, accuracy, seconds, stamps, chestFilled}`.
- `fillChest()` → slot +1 (max 3/day). `openChest()` → `{rarity, coins, gems, xp, freeze}` with pity timers; consumes a slot.
- `checkQuests()` → marks completable quests done and awards; returns newly completed quests.
- `packProgress(unitId)` → `{met, total, pct}` (met = tier ≥ 3).
- `stampCount()` → number 0–40. `dueSentences()` → array of `{sentence, mastery, status}` where status `'fading'|'wilting'|'dropped'`.
- `decayReport()` → `{fading, wilting, dropped, total}`.
- `bumpCounter(key, n=1)` — daily counters used by quests: `correct, crits, nodes, stars3, listens, said, comboBest, newSentences, fadingReviews, speed8`.
- `refreshDay()` — midnight rollover: resets quests/chest/daily XP pots, runs streak logic. Called on boot and after demo day jumps.

### clock
```js
import { now, today, addDays, dayIndex, fmtCountdown } from '../core/clock.js';
```
Always use these instead of `new Date()` so the demo timeline can time-travel.

### srs
```js
import { TIERS, tierMeta, grade, dueStatus, decayCheck } from '../core/srs.js';
TIERS // [{tier,label,labelKo,intervalMs,pips}]
tierMeta(tier) // {label, ko, color, pips}
```
`recordAnswer` already calls `grade`; screens only read.

### quiz
```js
import { buildExercise, exerciseLabel } from '../core/quiz.js';
buildExercise(sentenceId, type) → {
  type, sentenceId, prompt, instruction, korean, english, romanization,
  audio, options:[{id,label,sub,correct}], tiles:[…], answer:[…], pairs:[…],
  blank:{before, after, answer, options:[…]}, gloss:[…]
}
```
Types: `listen_pick` | `translate_pick` | `tile_build` | `fill_blank` | `speed_match` | `say_it`.
Every exercise is self-describing — render by `type`, do not recompute answers.

### ui
```js
ui.esc(s), ui.fmt(n), ui.pct(n)
ui.toast(msg, {icon, tone})            // bottom toast
ui.modal({title, body, actions, onClose}) // returns close()
ui.sheet({title, body, actions})       // bottom sheet, returns close()
ui.confetti({count, colors, origin})   // DOM particles, 1.4s, auto-cleanup
ui.countUp(el, from, to, ms)
ui.ring(pct, {size, stroke, color, track}) // returns SVG string
ui.flame(size), ui.coin(size), ui.gem(size), ui.heart(size), ui.chestSvg(size), ui.icon(name, size)
ui.mascot(size, mood)  // 'happy'|'cheer'|'think'|'sleepy'|'wow' — inline SVG tiger cub
ui.avatar(id, size)
ui.stars(n, {size})
ui.pips(tier)          // 5 mastery pips
ui.levelBadge(level)
ui.hexA(hex, alpha)
ui.todayLabel()
```
`ui.icon(name)` supports: `play, lock, check, close, back, flame, coin, gem, heart, chest, book, shop, user, quests, passport, sound, mute, sparkle, arrow, clock, snow, crown, trophy, settings, chart`.

### audio
```js
audio.speak('안녕하세요', {rate:0.85, onend})
audio.sfx('correct'|'wrong'|'levelup'|'chest'|'coin'|'tap'|'streak'|'stamp')
audio.setEnabled(bool), audio.supported
```
Never throw if unsupported.

---

## 4. State shape (persisted at `localStorage['horang.state.v2']`)

```js
{
  version: 2,
  createdAt, lastSeenAt,
  profile: { name, avatar, goal, minutes, dailyGoalXp, reminderTime },
  xpTotal, level,
  coins, gems, focus, focusUpdatedAt,
  streak: { current, best, lastGoalDate, freezes, repairUsedAt },
  mastery: { [sentenceId]: { tier, dueAt, lastSeenAt, correct, wrong, exposures, isStamp, firstDay } },
  path: { unlockedUnit: 0, completedNodes: [ids], currentNode: 0 },
  session: null | { kind, nodeIndex, items, index, correct, wrong, xp, startedAt, mistakes:[sentenceId] },
  chest: { slots, openedToday, pityRare, pityEpic, date, firstOpened },
  quests: { date, items:[{id, template, slot, title, metric, target, rewardXp, rewardCoins, done, rerolled}] },
  counters: { date, correct, crits, nodes, stars3, listens, said, comboBest, newSentences, fadingReviews, speed8, xp },
  stats: { answers, correct, minutes, bestCombo, sessions, nodesDone, daysActive, xpByDay:{}, stampsAtDay:{} },
  inventory: [ {id, name, kind, price, owned, equipped, art} ],
  league: { tier, weekId, xpWeek, rank, members:[{name, xp, isYou, isPacer}], joinedDay, history:[] },
  flags: { onboardingDone, signedUp, placementTaken, sentence0, identityShown, leagueSeen, sodDate, sodRevealed, firstChestDone, freezeGiftedDay2, freezeGiftedDay7, repairOffered },
  settings: { sound, haptics, reducedMotion, romanization: 'auto' },
  day: 0,             // virtual day index since install
  events: [],         // append-only analytics names (max 300)
  timeline: []        // day-by-day snapshots for the demo page
}
```

`state.day` and `clock` offset are what the Retention Lab (`demo.js`) advances.

---

## 5. Navigation map

Bottom tabs: **Learn** (`home`) · **Quests** (`quests`) · **Shop** (`shop`) · **Passport** (`passport`) · **Me** (`profile`).

Hidden-nav screens: `welcome`, `onboarding`, `lesson`, `complete`, `demo`, `settings`.

Pushes: `home → lesson → complete → home`, `home → quests`, `home → shop`, `passport → detail (sheet)`, `profile → settings`, `profile → league`, `home → league`.

Deep link hashes: `#/home`, `#/lesson?node=3`, `#/demo`, `#/passport`, etc.

---

## 6. Content rules

- `app/data/curriculum.js` exports `{units, sentences, words, grammar_points, boss_rounds, srs, …}`.
- Path = 7 units ("packs"). Each unit's sentences are chunked into nodes of **3** (last node may have 1–2).
- `state.path.nodes` is derived: build once in `engine` from curriculum — do not hardcode sentence lists in screens.
- Polish/formality: all content is polite `-요/합니다`. Never alter Hangul. If a string looks wrong, leave it.
- Romanization is hidden in listening exercises and whenever it would be the answer.

## 7. Definition of done (per screen)

1. Renders at 390×844 with no horizontal scroll and no console errors.
2. Every number comes from `state` — no lorem, no fake counters.
3. Has the entrance animation / press feedback from research 03 §4.7.
4. Keyboard usable on desktop (`Enter` continues, `1–4` answer, `Esc` closes sheets).
5. Empty states implemented (new user, all done, broke, owned-out).
6. Copy uses exact strings from research 03 where specified.

## 8. Verification

`npm test` runs Playwright against a real Chromium and writes screenshots to `docs/screenshots/`. Screens must survive the full scripted journey:

welcome → onboarding (goal/time/name) → node 1 (8 exercises) → complete → quick check → reminder → home → quests → shop (open chest) → passport → profile → demo timeline D0→D30.
