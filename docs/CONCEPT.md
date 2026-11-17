# The Concept — why Horang is hard to put down

This document is the scheme the A1 product implements. It is deliberately specific: every mechanic named here exists in the app, and the **Retention Lab** (`#/demo`) proves it by time-travelling the real game state through 60 days.

---

## 1. The thesis

Most language apps fail on **return**, not on content. The first lesson is easy to make; day 7 is not.

Horang is built around one sentence:

> **A learner should feel that skipping today costs something real, and that showing up today produces something visible within 180 seconds.**

Everything else is machinery for that sentence.

Two constraints keep it from becoming a slot machine:

- **Learning is never blocked.** No energy wall, no hearts on lessons, no ads.
- **The loss must be honest.** Sentences fade because memory fades — not because a timer was invented to punish you.

That combination is the product bet: the pull comes from *real decay* and *real progress*, so the addictive loop and the learning loop point in the same direction.

---

## 2. The 90-second hook (how it draws people in)

The funnel has one job: get a stranger to produce Korean, out loud, before they have decided to care.

| t | Experience | Mechanism |
|---|---|---|
| 0:00 | One headline, one button. No signup, no pricing, no nav. | Zero commitment cost. The CTA is the only decision. |
| 0:06 | “Why are you learning Korean?” — 4 cards, tap to advance. | Commitment & consistency; personalisation without a form. |
| 0:12 | “How long each day?” — 5 / 10 / 15 min. | Implementation intention; sets the daily XP goal. |
| 0:18 | “What should we call you?” — optional. | Self-reference effect. |
| 0:26 | **저는 {name}입니다** — a real sentence with their name, spoken. | The endowment is real, not a fake progress bar. IKEA effect. |
| 0:44 | First exercise: 안녕하세요, listen → choose. | Instant feedback; first XP before a minute is up. |
| 1:40 | Level 2 mid-session, +20 coins. | Goal gradient; a visible unlock inside the first session. |
| 3:20 | First word cards, then listen → choose. | Bounded new information, then immediate use. |
| 5:30 | Session complete: new sentences met, first chest (scripted Rare), quiet Day-1 streak. | Peak-end rule; the session ends on a win. |
| 4:10 | No account asked. Progress is saved on the device. | The commitment ask is deferred — value first, account later (not built in this MVP). |
| 5:00 | Ends with 3 unfinished bars and one named next step. | Zeigarnik effect: the open loops are the reason to return. |

The first session is **12 tasks** (sentence #0, four word cards, six sentence tasks, a word-match and a say-it). Every one of the course's 288 sentences appears in at least one task in its lesson, so the "new sentences met" ceremony at the end is earned rather than gifted.

---

## 3. The daily loop

```
open app
  → see: streak, goal ring, exactly 3 unfinished things
  → daily plan: 1 lesson + reviews + words
  → 6-minute lesson: 8–13 mixed tasks
  → crit / combo / XP / chest
  → complete: stars, new sentences met, streak
  → end on: "2 answers to your next chest" + one untouched bar
```

The session is capped by design (reward tapers after the third node). A learner cannot binge to the end of the course in one night and then churn — the content is gated by memory, not by a timer.

---

## 4. The five retention engines

### 4.1 Variable reward (why every answer is worth attending to)

- **Crit:** 15 % base, 20 % at combo 5, 25 % at combo 10, **guaranteed on the 10th answer** of a session, max 3 per session. Crit = 2× XP, gold burst, distinct sound. The learner cannot predict it, so attention stays on each item.
- **Chests:** 3 slots/day, filled by finishing nodes. Rarity 70 / 25 / 4.7 / 0.3 %, with pity timers (Rare+ every 5th, Epic+ every 15th) and a scripted Rare for the first chest. Chests are **never purchasable**, and the odds are published in-app.
- **Curiosity gap:** Sentence of the Day — a real sentence from a later pack with the translation hidden behind one tap (+20 XP, once a day). Novelty that never gates progress.

Bounded, published, and never applied to the correctness of an answer. (Randomising whether an answer is accepted would destroy trust; that is blacklisted.)

### 4.2 Honest loss aversion (why tomorrow matters)

- **Streak:** increments when the daily XP goal is met. A 7-dot week strip makes the empty days visible.
- **Freezes:** max 2 held. Gifted on Day 2 and Day 7, framed as insurance. They apply silently — no “you failed” screen.
- **Memory decay:** every sentence has a next-due date (4 h → 1 d → 3 d → 7 d → 21 d). Overdue sentences become **Fading → Wilting → Dropped**, and after 7 days a sentence loses exactly **one** tier. Never more.
- The strongest return trigger is the prompt **“3 sentences are fading. 3 minutes?”** — previewed live in the Retention Lab, because it is literally true. (Push delivery is stubbed in this MVP; the reminder time and priority logic exist.)

The user is not losing a number. They are losing access to something they could say.

### 4.3 Visible progress (why the next step is always obvious)

- Three simultaneous incomplete artefacts on the hub, chosen by fewest steps remaining: pack ring, chest meter, quests, Passport, level bar.
- Absolute remainders, not just bars: “42 XP to Level 3”, “2 answers to your next chest”.
- The Collection (288 sentences, 12 unit badges) is the long arc; the level bar is the short arc; a quest step or a word is the micro arc.
- Every session ends by naming the single cheapest next step.

### 4.4 Investment (why leaving is expensive)

- **Collection:** 288 sentences with mastery pips, 576 words with their own SRS, and 12 checkpoint badges. A sentence is "met" at tier 1 and "strong" at tier 3.
- **Collection:** mastered sentences are a listening library; words have their own mastery pips and bookmarks.
- **Cosmetics** bought with earned coins (never money): frames, backgrounds, Horang outfits.
- **Stats that never reset:** minutes, accuracy, best combo, best streak, heatmap, achievements.

Crucially, the asset *is* the learning record. There is no separate “engagement currency” that can be ground without learning.

### 4.5 Status (why the 8th day is different from the 2nd)

- **Week League** unlocks on Day 7: a 30-person cohort, top 5 promote, bottom 5 marked **“At risk”** (never “losers”, never a public shame rank).
- If the cohort is smaller than 30, the rest are **Pacers** — deterministic benchmarks explicitly labelled “average learner pace”, never fake people with faces.
- The row shows the gap to the person above: “60 XP behind Jiwoo”. That is a one-session goal, not a fantasy.

---

## 5. The 60-day A1 calendar

At a realistic pace of one lesson a day (with an extra lesson every third day and reviews in between), the 60-session course lands inside 60 days.

| Day | What the learner feels | What actually unlocks |
|---|---|---|
| **0** | “That was fast and I was good at it.” | Sentence #0, level 2, first chest, streak 1, 3 unfinished bars |
| **1** | “It remembers me.” | Fading-sentence alert, streak freeze gift, Sentence of the Day, word bank starts filling |
| **3** | “I'm the kind of person who does this.” | Daily plan, weekly quest card, first cosmetic affordable, Unit 1 badge close |
| **7** | “I'm competing and I have a record.” | 30-person league, promotion zone, streak-7 freeze, profile becomes a record |
| **14** | “I can order lunch.” | 2–3 unit badges, 70+ sentences met, food/money/places unlocked |
| **30** | “Half the course is behind me.” | ~6 badges, ~150 sentences met, A1 certificate visible on the horizon |
| **41** | *A lapse (4 days skipped).* | Freezes absorb what they can; the streak breaks honestly; nothing is confiscated |
| **44** | “I can come back.” | Free repair restores half the old streak; one-lesson warm-up |
| **60** | “I am an A1 speaker.” | 12/12 badges, 288/288 sentences met, 30-question exam, certificate |

The lab runs exactly this arc on the real state. One observed run:

```
Day 60 · 20,502 XP · Level 22 · 12/12 badges · 288/288 sentences met
149 words in the SRS · 99 strong · streak 19 (best 38) · League #1
4-day lapse at Day 38 · streak repaired on return · 57 active days
```

---

## 6. Economy, in one table

| Currency | Earned by | Spent on | Daily pace |
|---|---|---|---|
| **XP** | answers (10, crit 20), lesson bonus 30, perfect 20, goal 40, quests 30–50 | nothing — drives level & league | 250–320 |
| **Coins** | 1 per 2 correct, lesson 30, daily goal 40, daily plan 60, quests, chests | cosmetics, freeze, repair | 140–200 |
| **Gems** | level ≥ 5, streak 7/14/30, legendary chest | legendary cosmetics, focus, repair | 0–3 |
| **Stamps** | 1 per sentence reaching tier 3 | nothing (the artifact) | 3–6 early |
| **Freezes** | Day 2 / Day 7 gift, 200 coins | auto-consumed on a missed day | max 2 held |

Level curve: 60 → 80 → 130 → 190 → 260 → 340 XP, then `round10(60 + 25·(L−1)^1.5)`. First level-up lands *inside* lesson 1; level 10 arrives around day 12 and level 20 around day 52 at a normal pace.

XP is capped at 60/answer, reward tapers after 3 nodes/day, and evening (19:00–21:00) gives +50 % — a reason to open the app at a chosen hour without a fake countdown.

---

## 7. What is deliberately *not* in the design

These were considered and rejected, and the code enforces the rejection:

1. Hearts/energy that block lessons. (Focus exists only as a bonus-mode resource; it cannot block study.)
2. Paid loot boxes or gems for money. There is **no real-money store at all**.
3. Guilt copy and sad-mascot screens. Banned strings: “don't lose”, “you failed”, “we miss you”.
4. Fake scarcity or countdown offers.
5. Fake humans on the leaderboard. Pacers are labelled.
6. Confiscating earned XP, stamps, coins or mastery as punishment.
7. Notification spam. One a day, quiet hours 22:00–08:00.
8. Infinite grind incentives after 3 nodes.
9. Leaderboard demotion for absence, or shaming last place.
10. Variable correctness. Rewards are random; grading never is.

The ethics test used in review: **does this mechanic increase sessions without increasing retained mastery?** If yes, it is cut.

---

## 8. Where each claim lives in the code

| Claim | Implementation | Visible at |
|---|---|---|
| 90-second hook | `screens/onboarding.js`, `screens/lesson.js` | Welcome → Node 1 |
| Crits / combo | `core/store.js:recordAnswer` | Lesson, `+XP` floats |
| Chest economy + pity | `core/store.js:openChest` | Shop → Open, complete screen |
| Streak + freezes + repair | `core/store.js:checkDailyGoal`, `refreshDay` | Home HUD, comeback banner |
| SRS + decay | `core/srs.js`, `store.dueSentences` | Home fading alert, Profile memory card |
| Quests | `core/store.js:makeQuests/checkQuests` | Quests tab |
| League + labelled pacers | `core/store.js:ensureLeague` | League |
| Passport | `screens/passport.js` | Passport tab |
| 60-day proof | `screens/demo.js` | `#/demo` |
| Curiosity gap | `screens/home.js` Sentence of the Day | Home |

---

## 9. What would be measured next

Design targets (not claims about this MVP's performance): D1 ≥ 45 %, D7 ≥ 30 %, D30 ≥ 18 %; median session 7–9 minutes; ≥ 60 % of D1 users complete a second session within 24 hours; streak-3 conversion ≥ 35 % of activated users.

The instrumentation is already there: `state.events` emits `onboarding_step`, `sentence0_said`, `answer`, `crit`, `chest_open`, `quest_complete`, `daily_goal_hit`, `streak_change`, `level_up`, `stamp_earned`, `sentence_decay`, `purchase`, `lapse_state`, `session_end`. The funnel is landing → onboarding_complete → node_complete → level_up → 2nd session → D1 → D7 → D30.

The metric that matters is **retained mastery** (sentences at tier ≥ 3 on Day 30), not DAU.

---

## 10. Scope

The product now covers **A1 end-to-end**: 12 units, 60 sessions, 288 sentences, 576 words and 48 grammar patterns.

A2 work (past/future narration, connectors, honorific depth, longer texts, ASR, boss roleplays) is **not** started. The next proficiency step waits for a separate go-ahead.
