# 01 — Addiction Engine: Behavioral Psychology & Gamification Spec

**Status:** build-ready v1.0 · **Owner:** Research Agent 1 · **Consumers:** worker agents (UI, game logic, copy)
**Scope:** the 40-sentence MVP (A0). Everything here is implementable without further questions. Mechanic IDs (`M-xx`) are stable references — cite them in commits.

**Five design laws (these override every later instruction):**
1. **Learning is never blocked.** No mechanic may prevent a user from studying. Gate *bonus* XP, cosmetics, and challenge modes — never practice.
2. **Every session must produce a visible unlock within 180 seconds.** If a user can finish a session with zero visible change, the session is broken.
3. **The next goal is always ≤ 1 session away** and always visible on screen.
4. **Loss frames must describe real memory decay, not artificial punishment.** Streaks and withering sentences are honest signals; hearts that lock lessons are not.
5. **No guilt, no fake scarcity, no pay-to-win.** The dark-pattern blacklist in §10 is binding.

**Design targets (tune to these):** D1 ≥ 45%, D7 ≥ 30%, D30 ≥ 18%; median session 7–9 min; ≥ 60% of D1 users complete a second session within 24h; streak-3 conversion ≥ 35% of activated users.

---

## 1. Product model and units

| Unit | Definition | Count in MVP |
|---|---|---|
| **Sentence** | One Korean utterance with audio, romanization, English, and a situational tag. The atomic learning object. | 40 |
| **Pack** | Themed set of 10 sentences. | 4 |
| **Node** | A 3–5 min lesson: 3 new sentences × 3 exercise types (9 items) + optional reviews. | 1 per session |
| **Daily Run** | The canonical daily session: 12 exercises (~4 min), mixes new sentences with due reviews. | 1/day |
| **Mastery tier** | Per-sentence strength: 0 New, 1 Learning, 2 Familiar, 3 Strong, 4 Mastered, 5 Golden. | 0–5 |
| **Stamp** | Passport entry granted when a sentence hits tier 3. 40 stamps = Seoul Passport complete. | 40 |

**Packs (canonical, used by copy and boss challenges):**
- **P1 인사 Greetings:** 안녕하세요 / 감사합니다 / 네 / 아니요 / 죄송합니다 / 괜찮아요 / 안녕히 가세요 / 안녕히 계세요 / 반갑습니다 / 실례합니다
- **P2 자기소개 Self-intro:** 저는 ___입니다 / 만나서 반갑습니다 / 저는 학생이에요 / 한국어를 배워요 / 미국 사람이에요 / 이름이 뭐예요? / 제 이름은 ___예요 / 몇 살이에요? / 스물다섯 살이에요 / 잘 부탁합니다
- **P3 음식 Food & Ordering:** 이거 주세요 / 메뉴 주세요 / 물 주세요 / 얼마예요? / 맛있어요 / 매워요? / 안 매워요 / 커피 한 잔 주세요 / 계산해 주세요 / 포장해 주세요
- **P4 일상 Daily Life:** 어디에 가요? / 화장실이 어디예요? / 집에 가요 / 지금 몇 시예요? / 배고파요 / 피곤해요 / 도와주세요 / 한국어 못해요 / 천천히 말해 주세요 / 다시 말해 주세요

**Exercise types (all 6 ship in MVP):** `listen_pick` (audio → 4 meaning options), `tile_build` (tap word tiles in order), `fill_blank` (2 options: particle/ending), `translate_pick` (English → 3 Korean options), `speed_match` (6 pairs, 45s), `say_it` (mic, self-scored 1–3 stars, no ASR dependency in MVP).
**Three-touch rule:** a new sentence must appear in 3 different exercise types inside its first session (e.g. listen_pick → tile_build → say_it). This is the minimum encoding dose; do not reduce it. Three correct exposures in one session advance a new sentence to **tier 3**, which mints its Passport stamp at session end (this is what makes Day 0 produce 2–4 stamps without lying about mastery).

**Mastery intervals (review scheduling, per sentence):** tier 1 → +4h, tier 2 → +1d, tier 3 → +3d, tier 4 → +7d, tier 5 → +21d. Correct answer at due time = +1 tier (max 5). Wrong = −1 tier, floor 1. **Decay:** if `now > due_at + 1d` sentence is *Fading* (amber); `> due_at + 3d` *Wilting* (orange); `> due_at + 7d` drops exactly **one** tier and becomes *Dropped* (red). Decay never drops more than one tier per lapse — no punishment spiral.

---

## 2. The core loop, minute by minute

### 2.1 First 60 seconds (cold visitor → first win)

| t | What happens | UI detail |
|---|---|---|
| 0:00–0:06 | Landing page. One headline, one button, no signup, no pricing. | `Learn your first Korean sentence in 90 seconds.` CTA: **Start — it's free**. Secondary link: "I already have an account". No nav, no cookie wall above the fold. |
| 0:06–0:12 | **Goal chip** (one tap, auto-advance): 여행 Travel · 드라마 K-drama · 가족 Family · K-pop | 4 large cards with flag/emoji, tap = select + 180 ms slide. No "Continue" button — reduce decisions. |
| 0:12–0:18 | **Time commitment**: 5 / 10 / 15 min per day | Default preselected = 10 min. Sets `daily_goal_xp` (60/120/180) and session length. |
| 0:18–0:26 | **Name input** (optional, skippable): "What should Horang call you?" | Text field, 1 tap to skip. Name is injected into sentence #0. |
| 0:26–0:44 | **Sentence #0, personalised:** full-bleed card, audio autoplays `저는 루카스입니다` ("I am Lucas"). Tap the card to replay. User taps **Say it** → mic or "I said it" (self-report). +10 XP, confetti burst, Horang the tiger cub claps. | This is a *real* sentence and a *real* mastery record (tier 1). It is also **endowed progress**: Passport shows **1/40** before the user has done an exercise, and the first quest ships at 2/3. |
| 0:44–1:00 | Auto-transition: "One down. Nine to go in Greetings." First exercise `listen_pick` on 안녕하세요 loads; the Greetings ring sits at 0/10 with the label "0 of 10 met". | The ring animates 0→10% **the instant the first answer lands** — movement is always earned by an action, never gifted mid-lesson. |

**Why this works:** value before signup (no commitment cost), a personalised output in 26 seconds (IKEA effect + self-reference effect: material about oneself is remembered and valued more), and a pre-filled progress bar (endowed progress, Nunes & Drèze: 34% vs 19% completion).

### 2.2 First 5 minutes (first win → first level-up)

- 1:00–3:20 **Node 1** = 9 exercises: 3 sentences (안녕하세요, 감사합니다, 네/아니요) × 3 touches each. Difficulty curve: trivially easy → easy → 1 mild challenge. Every correct answer: +10 XP, green flash, 120 ms haptic, sound. Combo counter appears at answer 3.
- ~1:40 **Level 2** mid-node: inline toast +20 coins (NOT a full-screen — see the celebration budget in M-12). First **chest** opens at node end and is scripted Rare.
- 3:20 **Lesson complete screen**: stars (3★ if 0 mistakes), +20 perfect bonus, +30 node bonus, XP tally counts up, pack ring 10% → 30% (3 sentences met), **Passport 4/40** (3 new tier-3 sentences + the intro sentence). "You're 3 sentences into your first pack."
- 3:50 **Level 3** full-screen takeover (the one allowed full-screen of the session): Horang, `새싹 Sprout · Level 3`, +20 coins, CTA `Onward`, and one tease line: `1 level to Explorer`.
- 4:10 Prompt: **"Save your streak?"** → account creation (Apple/Google/email, 1 screen, no password if OAuth). If declined, progress persists in localStorage and the prompt reappears only after the next node completes. **Never ask for signup before the first level-up.**
- 5:00 End on an unfinished thing: "Next: 주세요 (please) — 1 sentence from your next stamp." Session ends with chest meter at 1/3 and the level bar at 30/130 (Zeigarnik).

### 2.3 First session (10 minutes, ~12 exercises)

1. Daily Run #1: 12 items = 3 new + 9 review/new reinforcement, interleaved (never 2 identical exercise types in a row).
2. Completing it: +50 coins, +40 XP daily-goal bonus, streak = 1 with a **deliberately quiet** celebration (confetti, no fireworks — day 1 should feel like "this is easy", not "I achieved something").
3. One daily quest completes automatically (the easy one is designed to be completed by any first session).
4. Reminder opt-in framed as help, not marketing: **"Horang can nudge you at 19:30. One nudge a day, that's it."** Default ON, dismissible, one notification/day max.
5. Session ends with: pack ring 60% (6 of 10 sentences met), chest 2/3, **Level 3 at 30/130 XP toward Level 4**, and 2 quest slots still locked (visible but greyed: "unlocks Day 2"). **Three unfinished bars on screen.**

### 2.4 What brings them back tomorrow (hook → habit → investment)

| Phase | Window | Mechanism | What the user feels |
|---|---|---|---|
| **Hook** | Session 1 | Personalised sentence, instant XP, level-up, first chest, visible unfinished bars | "That was fast and I was good at it." |
| **Habit** | Day 2–7 | Fixed reminder time, streak counter with gifted freeze, daily quest pool that changes, evening 2× window, "3 sentences are fading" (real memory decay) | "If I skip, something real degrades." |
| **Investment** | Day 7–30 | 40-stamp Passport, cosmetics bought with earned coins, league standing, mastered-sentence audio collection, personal stats page | "I built this. Leaving means losing it." |

Return trigger priority (highest first): **fading sentences > streak at risk > chest at 2/3 > quest 1 step from done > league rank change > new pack unlock.** Notification copy always uses the top available trigger.

---

## 3. Psychological triggers — mechanism, why, exact UI

### M-01 Variable-ratio reward: **Crit** (every answer)
Mechanism: variable-ratio reinforcement (Skinner) — unpredictable reward per action produces the highest, most extinction-resistant response rate.
Why: the learner cannot predict which answer pays double, so *every* answer is worth attending to. Cheap to build (one RNG call per answer).
Implementation: each correct answer rolls a crit.
- Base crit chance **15%**; **20%** at combo ≥ 5; **25%** at combo ≥ 10; **guaranteed crit on the 10th answer of any session** (scripted "Rhythm Bonus" so a session always contains at least one crit).
- Crit = **2× XP** for that answer, gold particle burst, distinct chime, "+20 XP — CRIT!" floating label, 400 ms pause so it registers.
- Cap: max 3 crits per exercise set of 12; crit XP does not multiply with the 2× booster (additive bonus only) to keep XP inflation bounded.
- Never crit on a wrong answer, never crit on a review the user failed last time (would teach nothing).

### M-02 Loot chests (variable-ratio, bounded)
Mechanism: variable-ratio + anticipatory dopamine (reward prediction error).
Why: the chest *animation* (build-up, shake, rarity colour) is the reward; contents are secondary. Bounded by pity timers so it never feels rigged against the user.
Implementation: **Chest meter** with 3 slots, refills to 0/3 at local midnight. +1 slot per completed node, max 3 chests/day. Chest opens with a 1.2 s shake + rarity fanfare.

| Rarity | Probability | Contents |
|---|---|---|
| Common | 70% | 20–40 coins |
| Rare | 25% | 60–90 coins **or** 2× XP booster (15 min) **or** cosmetic shard |
| Epic | 4.7% | 150 coins + 1 gem **or** one random cosmetic |
| Legendary | 0.3% | 500 coins + 1 gem + gold confetti + Horang animation |
Pity: **guaranteed Rare+ every 5th chest**, **Epic+ every 15th chest** (counters persist). First chest of a new account is scripted Rare. Chests are **never purchasable with money**; one paid re-roll per day costs 100 coins (not gems).

### M-03 Loss aversion A: **Streak + freeze**
Mechanism: loss aversion (Kahneman & Tversky, λ≈2.25) + endowed progress.
Why: after 7 days the streak is an owned asset worth ~2× more pain than the pleasure of an extra session. Deficiency framing ("don't lose it") outperforms gain framing ("earn it").
Implementation:
- Streak increments when `daily_goal_xp` is met (60/120/180 by commitment). One increment max/day.
- Display: flame + number in header, always visible, with a **7-dot week strip** (filled/empty) — the empties are the loss frame.
- **Streak Freeze:** max hold **2**. Auto-applies on a missed day (silent, no "you failed" screen). Granted free: 1 at Day 2 completion (frame: "insurance"), 1 at Day 7. Purchase: 200 coins or 1 gem. Never expires, never sold for money.
- Streak loss screen is **never** a sad mascot. It shows only: "Your streak stopped at N. Your N+1 sentences are still here." Then the repair offer (§8).
- Milestones: 3 / 7 / 14 / 30 / 50 / 100 with escalating celebration. No streak > 100 gets extra mechanics — diminishing returns by design.

### M-04 Loss aversion B: **Focus ♥** (contained hearts)
Mechanism: loss aversion, but scoped so it cannot block learning.
Why: hearts create tension and make a "safe" practice mode feel valuable; if they gate lessons they cause churn, so they are quarantined to bonus modes.
Implementation: **Focus** = 5 max. Consumed only in **Challenge** nodes and **Boss Challenges** (1 per wrong answer). At 0 Focus the challenge ends early with "Out of focus — practice is still open" and a single button **Practice instead** (no purchase prompt). Regen **1 per 25 min**, full refill at local midnight, +5 for 2 gems (max 1 purchase/day). Daily Run and Practice never consume Focus.
**No energy system.** It would cap learning and is explicitly blacklisted (§10).

### M-05 Zeigarnik effect: unfinished bars everywhere
Mechanism: Zeigarnik — interrupted/incomplete tasks stay active in memory and generate intrusive recall.
Why: an incomplete ring is a cognitive itch the user scratches by returning. Three simultaneous incomplete artefacts per session is the target.
Implementation: always surface exactly **three** incomplete elements from this set, chosen by fewest steps remaining:
`pack ring (x/10)`, `chest meter (x/3)`, `daily quests (x/3)`, `passport (x/40)`, `level bar (x/y XP)`, `weekly quest (x/5)`, `league gap to next rank`.
Rules: never show more than 4 progress bars on one screen (choice paralysis); the home screen shows pack ring (large), chest meter (small), quest list (3 rows), level bar (top). Session end screen names the single cheapest next step: "2 more answers to your next chest."

### M-06 Goal-gradient effect
Mechanism: goal-gradient (Kivetz) — effort accelerates as the perceived goal nears.
Why: users sprint the last 20% of a bar. Showing "3 answers to Level 3" converts intent into a session.
Implementation: XP bar displays **absolute remainder** ("42 XP to Level 3") not just a bar. When remainder < 25% of the level, the bar gains a shimmer and the mascot leans toward it. Daily goal ring shows "8 XP to go" and pulses when ≤ 15 XP remain. Quest rows show "1/3" and the 3rd slot glows when 2/3.

### M-07 Endowed progress (onboarding)
Mechanism: endowed progress effect — pre-filled progress increases completion because the goal looks nearer and effort already spent feels non-refundable.
Why: a bar that is already 60% full gets finished ~2× more often than an empty one. The endowment must be **real** (a sentence they actually said) or users sense the manipulation and it backfires.
Implementation: three simultaneous endowments at first paint — **Passport 1/40** (sentence #0, their own name, really spoken), **Level 30/60 XP** (3 answers from Level 2), **first quest 2/3 complete** ("First Steps"). The Greetings ring starts at **0/10** — a bar may never be pre-filled with activity the user did not do; the endowment lives in the Passport and the level bar instead. Fabricated steps: **zero** — every endowed unit maps to a stored record. If a user deletes sentence #0, the stamp and the 30 XP are removed with it (the endowment must survive an audit).

### M-08 Social proof: Week League
Mechanism: social comparison + social proof (Cialdini) + loss aversion on rank.
Why: a visible rank is a public-ish scoreboard; the 5-person promotion band makes "one more lesson" concretely valuable. Cohorts of 30 keep the chance of promotion high (~17%) so it stays winnable.
Implementation: unlocks Day 7. 30-user cohort, tiers **Bronze → Silver → Gold → Sapphire → Ruby → Diamond**. Weekly XP only (resets Sunday 23:59 local). Top 5 promote, bottom 5 → *Unranked* next week (never demote below Bronze; never demote someone who hit 0 XP — they simply don't rank). If cohort has < 10 real users, fill to 30 with **Pacers**: deterministic synthetic scores derived from the cohort median (±15%), visually labelled "Pacer" with a small ⓘ tooltip "average learner pace". Honesty is required; no fake humans with faces.
Rewards: Bronze 100 coins; Silver 150 + 1 gem; Gold 200 + 1 gem; Sapphire 250 + 2; Ruby 300 + 2; Diamond 400 + 3. Rank #1 in any tier: +50% coins and a profile flair.
Rows show: avatar, name, weekly XP, delta arrow (▲▼) since yesterday, and **your gap to the row above** ("40 XP behind Jiwoo").

### M-09 Commitment & consistency
Mechanism: commitment/consistency (Cialdini) + implementation intentions (Gollwitzer: "if 19:30, then I study" doubles adherence).
Why: a stated goal becomes an identity the user defends; a chosen time converts intention into cue-based action.
Implementation: onboarding captures goal, minutes, and reminder time (3 taps). At Day 3, one screen: **"You've studied 3 days straight. That makes you a daily learner."** with a 2-option confirm (Keep it going / Change my goal) — public-ish self-label. Sunday: "Pick your study time for next week" (pre-filled last week's answer, 1 tap). Never ask the user to re-commit more than once per week.

### M-10 Sunk cost / investment: the Passport + collection
Mechanism: sunk cost fallacy + IKEA effect + endowment.
Why: a user with 22 stamps, 4 cosmetics and 300 coins has built an asset; switching apps means abandoning it. Crucially, the asset is *also the learning record*, so retention and pedagogy point the same direction.
Implementation: **Seoul Passport** page — 40 stamp slots, 4 illustrated scenes (one per pack) that complete at 10/10 stamps. Each stamp unlocks a 1-sentence "postcard" from a Seoul location with native audio. Mastered (tier 4+) sentences are replayable in a **Collection** with a play-all button (this is the actual study payoff: listening library). Cosmetics: Horang outfits/backgrounds, 6 in MVP, 300–1,200 coins. Stats page: total XP, minutes, accuracy, sentences mastered, best streak — permanent, never resets.

### M-11 Curiosity gap: locked packs + Sentence of the Day
Mechanism: curiosity gap / information-gap theory (Loewenstein).
Why: a partially obscured Korean sentence with a known-but-missing meaning is an aversive state resolved only by tapping — and tapping teaches.
Implementation: locked packs show 3 real sentences with the Korean visible and the English blurred: **"?? — reveal on Day 4"**. **Sentence of the Day** card on home: a sentence from a later pack, Korean + audio visible, translation hidden behind **Tap to reveal**; first reveal = +20 XP, once/day. Also after each correct answer, 1-in-8 chance of a **Culture note** ("Koreans say 잘 먹겠습니다 before eating — it means 'I will eat well'") with a 2 s dismiss. Notes are content, not interruptions.

### M-12 Instant feedback + micro-celebrations
Mechanism: immediate reinforcement + peak-end rule.
Why: feedback within 100 ms reads as "the app is alive"; the *last* moment of a session determines memory of it, so the session must end on a win.
Implementation: correct → green flash 90 ms, chime, XP float, combo bump, tile snap. Wrong → red shake 200 ms, correct answer shown immediately with audio, **no XP loss**, no life lost in practice, retry queued at the end of the session (not immediately — immediate retry teaches position, not meaning).
Micro-celebration ladder: answer (particles) → combo 5 (mascot cheer) → node complete (stars + count-up) → level up (full-screen) → streak milestone (confetti + share card) → legendary chest (gold takeover). Each tier must differ in *kind*, not just size, or it becomes wallpaper. Never celebrate a wrong answer.
**Celebration budget (hard rule):** max **1 full-screen per 90 s** and **2 per session**. Full-screen is reserved for: the first level-up of a session, any level-up at L ≥ 5, streak milestones (3/7/14/30/50/100), legendary chest, Boss Challenge completion. Every other level-up is an inline toast with +20 coins. Node complete is always a panel, never a takeover, unless it is the user's 2nd session of the day (then it may take over once).

### M-13 Near-miss
Mechanism: near-miss effect / goal-gradient at the boundary.
Why: "1 mistake from perfect" motivates a retry 2–3× more than "2 stars", because the gap is attributable to a single fixable action.
Implementation: 3-star node rating. If the user has exactly 1 mistake: **"★★☆ — one slip from perfect. Retry (30s)."** with the retry button pre-focused. Speed Match shows "You were 1 match from your record (11 of 12)". Daily goal shows "8 XP short — one more answer does it." Never fabricate a near-miss: only display when the true gap is ≤ 1 unit or ≤ 15% of the target.

### M-14 Scarcity / daily reset
Mechanism: scarcity + loss aversion on resets; rhythmic structuring of the day.
Why: a daily reset creates a recurring appointment and prevents binge-then-quit (the #1 churn pattern in learning apps).
Implementation: hard resets at local midnight: Daily Run bonus, quests, chest meter, Sentence of the Day, Focus refill. **Evening Double XP: 19:00–21:00 local, +50% XP** (stacks with booster, total cap 3×). Weekly reset Sunday 23:59 (league, weekly quest). Nothing time-limited is ever purchasable; no countdown timers on offers. Grind guard: XP after the 3rd node of a day is **50%** (practice stays open, reward tapers).

### M-15 Surprise & delight
Mechanism: dopaminergic novelty + hedonic adaptation interrupt.
Why: predictable rewards stop working in ~2 weeks; unexpected, non-monetary events reset the novelty curve.
Implementation (all deterministic, 1 per session max): 1% of answers → **Golden Sentence** (gold screen, +50 coins, Horang in a hanbok); random mascot idle behaviours (8 animations, no reward); a handwritten-style note from Horang on Day 4, 11, 23; birthday greeting from onboarding date. Do **not** randomise rewards the user is working toward — only garnish.

### M-16 Implementation intentions / cue
Mechanism: habit loop (cue → routine → reward) + if-then planning.
Why: retention on Day 2–7 is a scheduling problem, not a motivation problem. A fixed cue at a user-chosen time with one notification converts intent at ~2–3× the rate of generic pushes.
Implementation: notification at chosen time, exactly one per day, max 2 if a comeback is active. Copy always names a concrete 3-minute action and a real number. Quiet hours 22:00–08:00 enforced. Streak-at-risk notification sends at `chosen_time + 4h` only if the goal is not yet met.

---

## 4. Economy

### 4.1 Currencies

| Currency | Earned by | Spent on | Earn rate/day | Cap |
|---|---|---|---|---|
| **XP** | Answers, bonuses, quests | Nothing (drives Level + League) | 200–260 | — |
| **Coins 엽전** | Answers (1 coin per 2 correct), nodes (+30), Daily Run completion (+50), daily goal (+40), chests | Cosmetics, freeze, chest re-roll | 110–160 | 99,999 |
| **Gems** | Level ≥ 5 (+1/level), streak 7/14/30 (+3/+1/+3), perfect week (+2), legendary chest | Legendary cosmetics (40), streak freeze (1), focus refill (2), streak repair (5) | 0–3 | 999 |
| **Focus ♥** | Regen 1/25 min, midnight refill, 2 gems | Wrong answers in Challenge and Boss only | — | 5 |
| **Streak Freeze** | Day 2 gift, Day 7 gift, 200 coins, 1 gem | Auto-consumed on miss | 0–1 | 2 held |

**XP per action:** first-try correct `10`; correct after hint `5`; wrong `0` (no penalty); crit `2×` (20/10); node complete `+30`; perfect node `+20`; daily goal `+40`; daily quest `30/40/50` (easy/med/hard); streak day bonus `10 + 5×min(streak,6)` = 10→40; Sentence of the Day `+20`; first Reveal of a locked pack teaser `+10` (once ever, per pack).

### 4.2 Level curve
`XP to go from level L to L+1 = round10(60 + 25 × (L−1)^1.5)`. So L1→2 = 60; L2→3 = 80; L3→4 = 130; L4→5 = 190; L5→6 = 260; L6→7 = 340; L9→10 = 630; L10→11 = 740; L19→20 = 1,970.
**Cumulative XP to reach:** L2 = 60 · L3 = 140 · L4 = 270 · L5 = 460 · L6 = 720 · L8 = 1,490 · L10 = 3,380 · L15 = 8,900 · L20 = 17,980 · L25 = 28,210 · L30 = 45,090.
At ~250 XP per active day: Level 5 on Day 2–3, Level 10 on Day 13, Level 20 on Day 72, Level 30 on Day 180. First level-up lands inside Node 1 (endowed 30 XP + ~60 XP from the first 6 answers). **Every level gives 20 coins; every level ≥ 5 gives 1 gem.** Ranks (title under the avatar): 1–3 새싹 Sprout · 4–7 탐험가 Explorer · 8–13 이야기꾼 Storyteller · 14–21 말하는 사람 Speaker · 22–31 서울 사람 Seoulite · 32+ 달인 Master. Levels 30–50 exist but are prestige-only (same curve extended, no new mechanics).
**Tuning invariant:** the level must be reachable in ≤ 3 sessions from any point, or the bar must change colour/label to a "milestone" frame ("2 levels to Seoulite").

### 4.3 Daily goal and the "always next goal" ladder
`daily_goal_xp` = 60 / 120 / 180 from the onboarding choice; user-changeable once per week.
Ladder (always exactly one of each visible):
- **Micro (seconds):** next answer, "8 XP to go".
- **Mini (≤ 1 session):** next chest slot, next level, next quest step, next stamp.
- **Meso (≤ 1 week):** next pack unlock, league promotion band, weekly quest.
- **Macro (≤ 30 days):** Passport completion, 30-day badge, Master rank.
Reward pacing rule: **no 3 consecutive answers may yield zero coins**, and **no session may end without at least one counter increasing.** If a user's XP gain would exceed a level, carry the remainder (no waste).

### 4.4 Spending sinks and pricing
Horang outfits 300 / 450 / 700 / 1,200 coins; backgrounds 300; profile flair 250; chest re-roll 100 coins (1/day); streak freeze 200 coins; focus refill 2 gems; streak repair 5 gems (after the free monthly one); legendary cosmetic bundle 40 gems. **MVP has no real-money store.** A user earning 130 coins/day can buy the cheapest cosmetic on Day 3 and the most expensive on Day 9 — that pacing keeps the shop meaningful without grinding.

---

## 5. Progression / unlock schedule

| Trigger | Unlock |
|---|---|
| t=0 | P1 Greetings, sentence #0 (own name — bonus stamp, counts to Passport but not to the P2 ring), Passport, chest meter, daily quests (1 active) |
| Node 1 complete | Level system visible, coins, Pack 2 preview (blurred) |
| Day 2 | Focus ♥ (Challenge preview), streak freeze gift, Sentence of the Day, 2nd quest slot |
| Day 3 | `speed_match` exercise, weekly quest, memory-decay map (first "3 sentences are fading" alert) |
| Day 4 | Pack 2 opens; cosmetics shop; 3rd quest slot |
| Day 7 | League placement; Pack 3 opens at 60% P2 mastery; Week-in-Review card |
| Day 10 | `say_it` scoring with stars + "Pronunciation streak" |
| Day 14 | Boss Challenge: Café Order (roleplay, 3 stars, 1 focus entry); full Cosmetic set |
| Day 21 | Pack 4 opens; Diamond league eligibility; "Review-only" endurance mode |
| Day 30 | 30-Day badge + Horang hanbok outfit; "Your 30 days" recap; Endless Practice |

Packs open on schedule *and* mastery gate (60% of the previous pack at tier 3), whichever is later — this prevents skipping into unknown sentences while never leaving a fast learner idle.

---

## 6. Daily quests

3 slots/day: easy (Day 0), medium (Day 2), stretch (Day 4). Values scale with commitment (×1 / ×1.5 / ×2 for 5 / 10 / 15 min). Rewards: easy 30 XP + 20 coins; medium 40 XP + 40 coins; stretch 50 XP + 60 coins. Completing all 3: +1 chest slot (respecting the 3/day cap) and 50 coins. Quest progress is **cumulative across the day**, so any practice counts.

Pool (serve without repeating within 3 days; weight the stretch slot toward decay):
1. Answer 5 questions correctly.
2. Complete 1 node.
3. Hit your daily goal.
4. Earn 2 crits.
5. Review 3 fading sentences.
6. Get a 5-answer combo.
7. Finish a node with 3 stars.
8. Listen to 5 sentences' audio.
9. Say 3 sentences out loud.
10. Score 8+ in Speed Match.
11. Learn 2 new sentences (only if new material remains).
12. Complete a Challenge without losing more than 2 Focus.
Weekly (resets Sunday): complete 5 daily goals → 1 gem + 200 coins; earn 3,000 XP → 2 chest slots + 100 coins.

---

## 7. Retention calendar (what a retained user actually experiences)

**Day 0 — "This is easy and it's mine".** Onboarding 4 taps, own-name sentence, Node 1, Level 2, first chest (scripted Rare), 2 stamps, streak 1 with quiet confetti, reminder set, ends at 3 unfinished bars. Signup deferred to after the level-up. **Success metric: 2nd session same day.**

**Day 1 — "It remembers me".** Notification: *"3 sentences are fading. 3 minutes?"* Session = 6 review + 2 new. Streak 2 → **gift streak freeze** framed as insurance. Unlock Sentence of the Day (curiosity gap) + Focus ♥ tease. **Success metric: D2 return ≥ 55% of D1.**

**Day 3 — "I'm the kind of person who does this".** Identity screen, weekly quest appears, Speed Match unlocks, decay map appears for the first time (3 amber sentences). Streak 3 chest = guaranteed Epic. First cosmetic affordable (~390 coins earned).

**Day 7 — "I'm competing and I have a record".** League placement (30-person cohort, Pacers if < 10 real), Pack 3 preview, streak-7 milestone (confetti + share card + 1 gem + freeze), **Week in Review**: minutes, XP, sentences mastered, accuracy, best combo, plus a shareable 1080×1080 image. Weekly quest likely completes → gem.

**Day 14 — "I can survive a real situation".** Boss Challenge **Café Order**: 5-turn roleplay (order, ask price, say it's delicious, pay), 3-star rating, Focus cost on errors, unique badge. Full shop. Memory map shows a healthy green deck (~22 mastered).

**Day 30 — "I built something".** Passport ~28–40/40, 30-Day badge, hanbok Horang, recap ("You studied 6h 40m, learned 38 sentences, 24-day best streak"), Endless Practice + teaser of the next level (A1 pack, "Coming next"). This is the moment to ask for a share and for a referral ("Give a friend your first sentence").

**Lapsed-user comeback (any day):** §8 state machine; the home screen for a lapse always shows the *asset*, never the loss: "22 sentences are still yours. 3 are fading."

---

## 8. Lapse & comeback state machine

`d = days since last completed Daily Run`.

| d | State | Home screen | Offer | Copy |
|---|---|---|---|---|
| 0 | Active | Normal | Next goal | — |
| 1 | At risk | Amber badge, freeze icon shown | 1 free freeze if held (auto-applied, silent) | "Your streak is safe. One 3-minute run keeps it." |
| 2–6 | Small lapse | Greeting card from Horang, pack ring intact | **Welcome Back chest** (guaranteed Rare, +2× XP for 3 days), 1-lesson quest for 40 coins | "Welcome back. Your warm-up is one sentence long." |
| 7–29 | Mid lapse | Show mastered count + 3 fading sentences only | **Rekindle**: complete 2 nodes in 24h → restore 50% of old streak (cap 30). Streak repair free once per 30 days; else 5 gems. | "You were at 19 days. Two short runs and we'll put 9 back on the board." |
| 30+ | Long lapse | Fresh start, no numbers about days missed; deck shown as "38 sentences waiting" | Starter run (5 exercises), streak starts at 1, no repair | "Your sentences are still here. Start with one." |

Rules: never mention "we missed you" more than once per lapse; never display the number of *days missed* (a deficit) — only the old streak as something recoverable; streak repair is **always** offered before a reset is final (48h window); no loss of cosmetics, coins, XP or mastery ever — only streak and time-limited bonuses lapse. Timers for repair are shown as a date, not a countdown clock.

---

## 9. Notifications (max 1/day, 2 during comeback)

Send at the user-chosen time; suppress if the goal is already met. Quiet hours 22:00–08:00. Priority: fading sentences → streak at risk (`time + 4h`) → chest 2/3 → quest 1 step → league rank shift → pack unlock. Every message ≤ 90 chars, names a number, no emoji spam (max 1), no guilt verbs ("don't lose", "you failed", "we miss you" are banned). Examples:
- "3 sentences are fading. 3 minutes?"
- "8 XP to your goal — that's one answer."
- "Your chest is 2/3 full. Horang is holding it."
- "You're 40 XP behind Silver promotion. 2 runs left this week."
- "Day 7. Your longest streak yet. 한 잔 할까요?" (only after 7)

---

## 10. Anti-patterns (binding blacklist)

1. **Hearts/energy that block lessons.** Learning must never be paywalled or timed-out. (Focus is quarantined to Challenge.)
2. **Purchasable loot boxes / gems for money.** No real-money store in MVP at all. If monetised later, cosmetics only, no random paid boxes.
3. **Guilt-trip copy or sad-mascot abandonment screens.** They produce one session and a permanent trust loss.
4. **Fake scarcity or countdown timers** ("offer ends in 9:59") on anything.
5. **Fake users on the leaderboard.** Pacers must be labelled.
6. **Loss of already-earned progress as punishment** (XP deletion, mastery reset, coin confiscation).
7. **Notification spam / re-engagement spam after lapse** (max 2, then stop until the user returns; no SMS/email drips).
8. **Infinite grind incentives at 3 a.m.** Reward taper after 3 nodes, no "unlimited XP weekend".
9. **Leaderboard demotion for absence** and public shaming ranks (no "last place" callouts, no global ranking of beginners).
10. **Streak anxiety for new users.** No streak before the first node; freeze gifted on Day 2.
11. **Pay-to-win in leagues** (XP boosts bought with money, paid leaderboard advantages).
12. **Streak-repair dark patterns** (charging gems repeatedly for the same break, or hiding the free repair).
13. **Autoplay audio without a visible mute control**; **haptics on wrong answers**.
14. **Variable rewards on the learning decision itself** (randomising whether an answer is accepted) — destroys trust in correctness.

**Ethical guardrails:** (a) every number shown must be true and derived from the user's data; (b) any mechanic that increases session count but reduces learning is rejected in review — we optimise *retained mastery*, measured as sentences at tier ≥3 at Day 30, not DAU alone; (c) session length capped at 20 min by default with a "you've done well today" exit at 3 nodes; (d) users can export/delete all data in 1 tap; (e) no dark-pattern A/B tests on loss framing of streaks without an explicit ethics sign-off.

---

## 11. MVP MUST vs LATER

**MUST (build in this order):**
1. M-12 instant feedback (green/red, XP float, audio) — nothing works without it.
2. M-07 endowed progress + personalised sentence #0 (onboarding) + no-signup start.
3. M-01 crit (15/20/25%, 2× XP, guaranteed 10th answer).
4. M-05 three visible incomplete bars + session-end "cheapest next step".
5. M-03 streak + 7-dot strip + gifted freeze + milestone celebrations + repair offer.
6. Economy v1: XP, coins, level curve, 6 cosmetics, Passport stamps.
7. M-02 chest meter (3/day, rarity table, pity timers, first-chest scripted Rare).
8. Daily quests: 3 slots, 12-template pool, cumulative progress, midnight reset.
9. Mastery/decay model + "fading sentences" alert (the single strongest honest return trigger).
10. M-14 daily reset + Evening 2× window + 3-node taper.
11. Reminder opt-in + the 5 notification templates.
12. Lapse states d1–d6 and d7–d29 (Rekindle) + copy deck.
13. 3-star node rating + M-13 near-miss line.
14. M-10 Collection (mastered audio) + stats page.
15. M-11 Sentence of the Day + blurred locked packs.

**LATER (post-MVP):** leagues v1 with real cohorts (needs >10 users), Week-in-Review share card, Boss Challenges, Pronunciation scoring (ASR), friends/duels, cosmetics catalog expansion, referrals, event seasons (e.g. "Chuseok week"), Perfect Week streak chest, AI conversation partner, social feed. **Never:** paid loot boxes, energy walls, ad-gated lessons.

---

## 12. Copy deck (exact strings — use verbatim)

**Landing / onboarding**
- H1: `Learn your first Korean sentence in 90 seconds.`
- Sub: `No signup. No grammar tables. Just the sentences you'll actually say.`
- CTA: `Start — it's free`
- Goal Q: `Why are you learning Korean?` → chips: `Travel` · `K-dramas` · `Family` · `K-pop`
- Time Q: `How long can you give me a day?` → `5 min` · `10 min` · `15 min`
- Time sub: `Pick the version of this you'll actually do.`
- Name Q: `What should Horang call you?` → placeholder `Your name` · link `Skip`
- Sentence #0 card: `저는 {name}입니다` · `I am {name}.` · button `Say it` · secondary `I said it`
- First win: `That was a real sentence. You're 1 of 40.` · CTA `Next: 안녕하세요`
- Signup: `Save your streak?` · sub `Your 2 sentences are saved on this device. An account keeps them forever.` · `Continue with Google` · `Use email` · `Not now`
- Reminder: `Horang can nudge you at 19:30.` · sub `One nudge a day. That's it.` · `Sounds good` · `Pick another time` · `No thanks`

**Session**
- Node complete: `Nice. 3 sentences stronger.` · stars `★★★` · `+{xp} XP` · button `Next`
- Near miss: `★★☆ — one slip from perfect. Retry? (30s)` · `Retry` · `Keep going`
- Wrong answer: `Not quite — it's {correct}.` · `Hear it` · auto-continue 1.2s
- Combo: `5 in a row` · `10 in a row — you're on fire` (no emoji)
- Crit: `CRIT ×2` · `+20 XP`
- Level toast (non-takeover): `Level 2 · +20 coins`
- Chest: `Chest 2 of 3` · `Open` · `You got 60 coins.` · `Rare! 2× XP for 15 minutes.`
- Out of focus: `Out of focus — practice is still open.` · `Practice instead`
- Level up: `Level 5` · `탐험가 Explorer` · `+20 coins` · `Onward`
- Daily goal hit: `Daily goal done. {n} XP.` · `+40 coins` · `See you tomorrow`
- End of session: `2 answers to your next chest.` · `Stop here` · `Keep going`

**Streak**
- Day 2: `2 days. Here's a freeze — insurance, not a nag.` · `Thanks`
- Day 3: `3 days straight. You're a daily learner now.` · `Keep it going` · `Change my goal`
- Day 7: `7 days. That's your longest streak yet.` · `Share` · `Continue`
- Streak lost: `Your streak stopped at 14.` · sub `Your 22 sentences are still here.` · `Repair streak (free)` · `Start fresh`
- At risk: `Your streak is safe. One 3-minute run keeps it.`
- Freeze consumed: `Your freeze covered yesterday. Streak intact at 12.` · `Good`

**Return after lapse**
- d2–6: `Welcome back. Your warm-up is one sentence long.` · `Start warm-up` · sub `+2× XP for 3 days`
- d7–29: `You were at 19 days.` · sub `Two short runs and we'll put 9 back on the board.` · `Rekindle streak` · `Just practice`
- d30+: `Your sentences are still here.` · sub `38 waiting. Start with one.` · `Start`

**Empty / edge states**
- No sentences due: `Nothing's fading. Rare.` · sub `Want 3 new ones early?` · `Learn ahead`
- League not started: `League starts Monday.` · sub `This week: 1,240 XP. That's your number to beat.`
- Shop owned out: `You own everything Horang has.` · sub `More arrives Day 14.`
- Pack locked: `?? — reveal on Day 4` · `Peek` (+10 XP, once)
- Offline: `You're offline. Your answers are saved and will sync.` · `Okay`
- No new material: `You've met all 40 sentences.` · sub `Now it's about keeping them.` · `Review 10`

**Home screen labels:** `Daily Run` · `Practice` · `Passport` · `Collection` · `League` · `Shop` · `Today's goal: 62 / 120 XP` · `3 fading` (amber chip)

---

## 13. Analytics events (emit these exact names)

`app_open`, `onboarding_step{1..4}`, `onboarding_complete{goal,minutes}`, `sentence0_said`, `node_start{pack,node}`, `answer{type,sentence_id,correct,ms,crit}`, `hint_used`, `node_complete{stars,xp,mistakes}`, `crit{combo}`, `chest_open{rarity}`, `quest_complete{id}`, `daily_goal_hit{xp}`, `streak_change{from,to,freeze_used}`, `level_up{level}`, `stamp_earned{sentence_id}`, `sentence_decay{sentence_id,tier}`, `league_view{rank}`, `shop_view`, `purchase{item,cost}`, `notif_sent{trigger}`, `notif_open`, `lapse_state{d}`, `comeback_cta_click{state}`, `session_end{duration,answers,xp}`.
Core funnel dashboard: landing → onboarding_complete → node_complete → level_up → signup → 2nd session → D1 → D7 → D30, segmented by goal chip and commitment.

---

## 14. Minimal data model (fields workers must store)

- **user:** `id, name, goal, daily_goal_xp(60|120|180), reminder_time, tz, xp_total, level, coins, gems, focus, focus_updated_at, streak_current, streak_best, freeze_count(max 2), last_run_date, created_at, repair_used_at`
- **sentence_mastery:** `user_id, sentence_id, tier(0–5), due_at, last_seen_at, correct_count, wrong_count, is_stamp`
- **node_attempt:** `id, user_id, pack, stars, mistakes, xp_awarded, started_at, finished_at`
- **quest:** `id, user_id, slot(easy|med|stretch), template_id, target, progress, reward_xp, reward_coins, completed_at, served_date`
- **chest_state:** `user_id, slots_filled(0–3), opened_today, rarity_pity_rare(0–5), rarity_pity_epic(0–15), date`
- **inventory:** `user_id, item_id, kind(cosmetic|freeze|booster), owned_at, equipped`
- **league_entry:** `week_id, user_id, tier, xp_week, rank, is_pacer`
- **event_log:** append-only, the §13 names.

Server authority: XP, coins, gems, streak, chest rarity, and league XP are computed server-side. Client may predict and animate; it must reconcile on response and never grant currency locally. RNG for chests/crits is seeded server-side per answer/node to prevent farming.

---

## 15. Instrumentation of the "addictive" claim (how we prove it works in the demo)

The MVP must include a **`/demo/timeline`** dev page that lets a reviewer fast-forward the clock and see, in order: Day 0 onboarding → Day 1 fading-sentence nudge → Day 3 identity screen → Day 7 league placement + Week in Review → Day 14 Boss Challenge → lapse to Day 22 with Rekindle offer → Day 30 recap. State is driven by the same code paths as production (a `simulate_day(n)` function mutating `last_run_date`, mastery due dates, and league week), so the demo is not a mock. This page is the deliverable that proves retention mechanics, not the marketing copy.
