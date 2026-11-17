# 03 — Competitive Teardown, Positioning, UX & Visual Design Spec

**Owner:** Research Agent 3
**Status:** Build-ready. Worker agents implement this literally. No open questions assumed.
**Scope:** Competitive analysis, positioning, IA + screens, design tokens, components, layout, onboarding, first-load choreography.
**Out of scope:** App code, curriculum content beyond the onboarding placement quiz and the first-node skeleton, backend.

---

## 0. TL;DR for workers

- Build a **mobile-first PWA** that looks like a premium puzzle game. 390×844 is the canvas. 1440×900 is a floating app shell, not a stretched website.
- Brand: **cream paper, coral action, deep indigo ink, mint success, amber reward.** No flat white, no stock SaaS gradients, no purple-blue "AI" gradient.
- Every tappable thing has a **physical response** (translate on press + shadow collapse), every number **counts up**, every win **emits particles**. Nothing may "just appear."
- Retention model: **streak + daily quests + weekly league + Passport completion**. Focus ♥ is **never a paywall** and never blocks a node; it is only spent in Challenge/Boss.
- Ship the tokens in §4.1 verbatim. Do not invent new hex values.

Table of contents: §1 teardown · §2 positioning · §3 IA/screens · §4 design system · §5 components · §6 layout · §7 onboarding · §8 first 10 seconds · §9 build acceptance checklist.

### 0.1 Canonical terms (shared with `01-addiction-engine.md` — this doc defers to 01 for economy)

Workers must use exactly these strings/numbers. Where 01 and 03 differ, **01 wins on economics/mechanics**, **03 wins on pixels/copy/motion**.

| Concept | Canonical string | Notes |
|---|---|---|
| Product name / mascot | **Horang** (호랑, tiger cub) | Mascot = cream-and-amber tiger cub, coral stripes, indigo outline |
| Atomic learning object | **Sentence** | 40 in MVP, grouped into 4 **Packs** of 10 |
| Lesson | **Node** | 8 exercises, 3–4 min, one per session |
| Daily session | **Daily Run** | 12 exercises, new + due reviews |
| Curriculum area | **Pack** (P1 인사 Greetings, P2 자기소개, P3 음식 Food, P4 일상 Daily Life) | P1–P4 per 01 §1 |
| Mastery | tiers **0–5**: New · Learning · Familiar · Strong · Mastered · Golden | UI shows **5 pips** for tiers 1–5; tier 0 = all hollow + "New" tag |
| Progress artifact | **Passport** + **Stamp** (1 per sentence at tier 3) | 40 stamps = Seoul Passport |
| Currency | **XP** (level/league), **Coins 엽전** (shop), **Gems** (premium), **Focus ♥** (Challenge/Boss only) | 01 §4.1 |
| Daily goal | **60 / 120 / 180 XP** for 5 / 10 / 15 min | 01 §4.3 |
| Exercise types | `listen_pick`, `tile_build`, `fill_blank`, `translate_pick`, `speed_match`, `say_it` | 01 §1; no typing exercise in MVP |
| League | **Week League** (placement Day 7) | This doc's S13 |
| Daily ritual | **Sentence of the Day** | Unlocks Day 2 |
| Lesson tab label | **Learn** | Bottom nav: Learn · Quests · Shop · Passport · Me |

**Onboarding order (merged, canonical):** Welcome → Goal → Time → Name → First node CTA → **Node 1 (sentence #0 inside, first win by ~50s)** → Node complete → **Quick check (5-question placement quiz, skippable)** → Placement result → Reminder → Home. The quiz comes *after* the first win so the 90-second promise in 01 §2.1 is protected; it still personalizes the path before the user reaches the map. §3 and §7 below reflect this order.

---

## 1. Competitive teardown

### 1.1 Duolingo

| | |
|---|---|
| **Core loop** | Open → daily XP goal ring → 3–5 min lesson on a fixed "path" → XP/streak → back tomorrow. Meta loop: weekly leagues (30 users, promotion/demotion), daily quests, chests, friend streaks, streak freeze. |
| **Retention hook** | The **streak**. Loss aversion beats reward: users protect a 40-day chain. Supported by streak freeze (purchasable), streak repair, friend streaks, widgets, and notifications from a passive-aggressive owl. |
| **Best at** | Habit formation and clarity. One primary CTA per screen, obvious next node, extremely short sessions, celebration after every lesson, and an onboarding that asks "why are you here / how much time" then promises a personalized path. Their A/B testing on the first 60 seconds is the industry benchmark. |
| **Users complain about** | Hearts/energy gating (can't practice when you want), repetitive sentence drills, slow pacing, "gamification over learning," guilt-trip notifications, rigid path with no skipping, hollow mid-game, aggressive monetization, ads between lessons. |
| **Take** | Path with explicit next node; streak with free freeze; league with promotion zone; 3-minute lessons; end-of-lesson XP tally; daily quests; one-tap onboarding questions. |
| **Skip** | Hearts as a paywall. Notification guilt. Fake scarcity. Locking practice behind currency. |

### 1.2 Lingodeer

| | |
|---|---|
| **Core loop** | Structured course tree (Korean 1 → 2 …) → lesson with new vocab, grammar tip, native audio, sentence building → review queue (SRS-ish) → next lesson. Story dialogues for reading/listening. |
| **Retention hook** | Curriculum progress + daily streak + "fluency %" style completion. Weak social layer; retention is mostly "I paid for it" and structured momentum. |
| **Best at** | **Grammar explanations** and sentence breakdowns. Native-speaker audio per sentence. Asian-language-first scaffolding (Hangul introduction is explicit, not assumed). Story mode is genuinely useful for listening. |
| **Users complain about** | Dated, dense UI; low energy; repetitive drills; bugs and sync issues; content updates slow; price; weak gamification so motivation dies after the novelty; review system opaque. |
| **Take** | A 20-second grammar "why" card per lesson; tap-any-word sentence breakdown; native audio on every Korean string; explicit Hangul bootcamp unit. |
| **Skip** | Textbook density on the lesson screen. Progress screens that feel like a spreadsheet. |

### 1.3 Memrise

| | |
|---|---|
| **Core loop** | Learn new words via **real-world video clips of native speakers** → spaced repetition review → "difficult words" queue → points/leaderboard → next batch. |
| **Retention hook** | Streak, daily goal, points, weekly leaderboard, and the emotional pull of "real people saying real things." Mnemonic ("mem") community for hard words. |
| **Best at** | **Authentic audio/video** — the single most convincing "this is a real language" signal. Mnemonics for stubborn vocabulary. Frequency-based decks. |
| **Users complain about** | Aggressive Pro upsell and paywalls mid-flow; buggy app; inconsistent course quality; points feel meaningless; features removed/changed between versions; no coherent grammar path. |
| **Take** | Short native-speaker audio clips inside lessons (even if TTS at MVP, design the slot for real recordings); community-style mnemonics attached to hard words; a dedicated "Trouble words" queue. |
| **Skip** | Upsell interruptions. Currency that buys nothing. Feature churn. |

### 1.4 Clozemaster

| | |
|---|---|
| **Core loop** | Fill-in-the-blank **cloze sentences** ordered by word frequency → multiple choice, then typing → 100 Most Common Words / Fast Track collections → daily goal + streak + leaderboard. |
| **Retention hook** | Completionism: thousands of sentences, visible counts, "you've seen 1,240 of 4,000." Daily goal and streak. Very low decision cost — you just keep answering. |
| **Best at** | **Learning in context** from the first minute. Frequency ordering means immediate real-world payoff. Typing mode after recognition builds production, not just recognition. Perfect "dead time" app. |
| **Users complain about** | No grammar instruction at all; repetitive; beginner-hostile (sentences before basics); bare-bones UI; almost no speaking/listening; grind without a sense of progression. |
| **Take** | Cloze as a core exercise type; frequency-ordered vocabulary; **type-after-recognize** progression per word; visible "words seen / words mastered" counters. |
| **Skip** | Sentence firehose with no scaffolding. Treating UI polish as optional. |

### 1.5 Anki

| | |
|---|---|
| **Core loop** | Due cards today → reveal → self-grade (Again/Hard/Good/Easy) → scheduler (SM-2/FSRS) decides next interval → repeat until queue empty. |
| **Retention hook** | **Efficacy**, not fun: it measurably works, and the due count creates obligation. Habit apps (streak add-ons), shared decks, and years of accumulated cards create switching cost. |
| **Best at** | Efficiency per minute and long-term retention. Total user control. Enormous deck ecosystem. Runs offline, syncs, free on desktop/Android. FSRS is state-of-the-art scheduling. |
| **Users complain about** | Ugly, hostile UI; setup burden; card authoring is a second job; review debt ("500 due") causes quitting; no guidance on what to learn; iOS price; zero motivation layer; burnout. |
| **Take** | **Real SRS under the hood** (FSRS-lite) so the app is not just entertainment; "due today" surfaced as a clear, finite queue; keyboard shortcuts (1–4, Enter); honest mastery data. |
| **Skip** | Exposing scheduler knobs. Showing a 600-card debt wall. Making users author cards. |

### 1.6 Royal Match (mobile-game retention standout)

| | |
|---|---|
| **Core loop** | 60–120s match-3 level → win coins → spend on castle decoration → unlock new rooms/areas → events → next level. Fail → retry with a booster. |
| **Retention hook** | **Fail-forward + event stacking.** Levels are tuned for near-misses ("one move left!"), lives regenerate on a timer (come back in 30 min), and 3–5 simultaneous events (King's Cup, Team Battle, Lightning Rush, piggy bank) mean there is always a reason to return. Teams create social obligation. |
| **Best at** | **Juice**: every match pops, shakes, sparks, and sounds satisfying. Zero-friction first session (play in 5 seconds, no tutorial wall). Readable at a glance. Rewards feel generous even when they're not. |
| **Users complain about** | Difficulty spikes designed to sell boosters; lives gating; event FOMO overload; ad volume; repetitive; "rigged" level RNG. |
| **Take** | Micro-session shape (60–120s), screen shake on impact, particle bursts, chest shake-then-burst, event calendar with 2–3 concurrent goals, team/league obligation, instant first play. |
| **Skip** | Lives that block play. Pay-to-progress difficulty tuning. Five concurrent FOMO timers. |

### 1.7 Wordle (NYT Games)

| | |
|---|---|
| **Core loop** | One puzzle per day → 6 guesses → spoiler-free emoji share → streak → come back tomorrow. |
| **Retention hook** | **Scarcity + social proof.** Because there's only one, it's an event; because the share grid is spoiler-free, it's a status signal. No notifications required — the ritual is self-reinforcing. |
| **Best at** | Constraint as a feature. Zero onboarding. A 3-minute daily ritual with a shareable artifact. Proves you don't need infinite content to build a daily habit. |
| **Users complain about** | One-a-day frustration (want to keep playing); clones; occasional unfair words; no depth/learning. |
| **Take** | A **daily Korean challenge** with a copyable spoiler-free result card ("Horang #042 🟩🟩🟨⬛ …"), plus unlimited practice after it. Daily ritual > infinite feed. |
| **Skip** | Hard-stopping a motivated learner. If they want more after the daily, give them practice. |

### 1.8 Steal / Avoid matrix (decisions locked)

| Steal this | From | Implement as | Avoid this | From | Our rule |
|---|---|---|---|---|---|
| Streak + free freeze | Duolingo | Flame counter in top bar; 2 free freezes/month, auto-applied, shown in weekly strip | Hearts as paywall | Duolingo | Focus ♥ is spent only in Challenge/Boss; normal nodes never gate |
| Weekly league w/ promotion zone | Duolingo | 30-person league, top 10 promote, bottom 5 demote, visible zone divider | Guilt notifications | Duolingo | Max 1 notification/day, opt-in at onboarding, never shaming copy |
| Path with explicit next node | Duolingo | Zigzag node path, current node 88px + pulsing halo | Rigid no-skip path | Duolingo | Placement quiz + "test out" on every pack header |
| 3-min lesson, immediate feedback | Duolingo | 8–12 exercises, <180s, feedback within 120ms | Ads between lessons | Duolingo | No ads, no interstitials, ever |
| Grammar "why" card | Lingodeer | 1 card per lesson, ≤60 words, expandable | Textbook density | Lingodeer | Max 2 sentences visible before "More" |
| Native audio everywhere | Lingodeer / Memrise | Audio button on every Korean string; slot for real recordings | Upsell mid-flow | Memrise | Zero purchase prompts in first 3 sessions |
| Mnemonics for hard words | Memrise | Auto-attached mnemonic on words failed 2× | Meaningless points | Memrise | Every currency has a sink (§3.3 S14) |
| Cloze in context | Clozemaster | Exercise type #3; frequency-ordered vocab | Beginner sentence firehose | Clozemaster | First 40 words are concrete nouns/verbs with images |
| Type-after-recognize | Clozemaster | Production unlocks after recognition: `tile_build` and `say_it` follow `listen_pick` within the same session | Grind without progression | Clozemaster | Three-touch rule + every session ends with a visible delta |
| Real SRS (FSRS-lite) | Anki | Background scheduler; "Review" queue capped at 20/session | Review debt wall | Anki | Never show more than 20 due; overflow rolls over silently |
| Keyboard shortcuts | Anki | 1–4 select, Enter check/continue, Esc close | Scheduler knobs | Anki | Zero settings for SRS |
| Micro-session + near-miss | Royal Match | 60–120s lessons; combo counter; "1 left!" copy | Lives gating | Royal Match | No energy system, ever |
| Juice on every action | Royal Match | Pop/shake/particles/tickers (§4.8) | Event FOMO overload | Royal Match | Max 3 active quests, no countdown timers |
| Daily ritual + share card | Wordle | Sentence of the Day + emoji result copy | Artificial scarcity on practice | Wordle | Daily is special; practice is unlimited |
| Instant first play | Royal Match / Wordle | First lesson starts <90s after load | Tutorial walls | Lingodeer | Teach by doing, one coach mark max |

---

## 2. Positioning

### 2.1 One-sentence pitch

> **Horang turns Korean into a game you actually want to open: 3-minute quests, real conversation Korean, and a streak you'd be annoyed to break.**

Short form (store subtitle / meta description, 92 chars):
> **Korean, one quest at a time. 3-minute lessons. Real progress. Zero homework energy.**

### 2.2 "Why would I open this again tomorrow?"

Three stacked, concrete reasons — in priority order:

1. **A half-finished run.** The session ends mid-path with the next node glowing and a chest 2 nodes away. There is always a visible "almost."
2. **A streak I own.** Flame count + 7-day strip. Breaking it costs a freeze (limited), so tomorrow's open is a protection instinct, not a chore.
3. **A scoreboard that moved.** League rank changes while I'm away, and 3 daily quests reset at local midnight with a fresh chest at 3/3.

Reinforcement: the **Sentence of the Day** (one hand-built sentence puzzle/day, shareable as a spoiler-free emoji grid) gives a 60-second ritual even on low-motivation days.

### 2.3 Product principles (use to settle design arguments)

1. **Play first, study second.** If a screen looks like a worksheet, redesign it.
2. **Never block the willing.** No energy, no Focus paywall, no ads, no "come back in 30 min."
3. **Every session must end with a receipt.** XP earned, words strengthened, accuracy, streak — numbers that count up.
4. **One decision per screen.** One primary CTA. Secondary actions are ghost/tertiary.
5. **Korean is the hero, not decoration.** Hangul is large, tappable, audio-backed. Never render Hangul in a faux-italic or all-caps.
6. **Motion carries meaning.** Correct = pop up. Wrong = shake down. Reward = burst. Never decorative-only where meaning is needed.
7. **Fair monetization or none.** MVP: no real-money purchases. Cosmetics bought with coins earned by learning (gems only for rare items).

### 2.4 Name suggestions

Lead recommendation: **Horang (호랑, "tiger")** — Korean, mascot-native, two syllables, easy for English speakers, and it already matches the tiger cub mascot defined in `01-addiction-engine.md`. Alternative if a softer/premium feel is wanted: **Hanji (한지, Korean paper)** — matches the cream palette.

| Name | Meaning / rationale | Vibe | Watch-outs |
|---|---|---|---|
| **Horang** ⭐ | 호랑(이) = tiger. Mascot-native, playful, short. | Playful, gamey, warm | Check trademark/domain `horang.app`, `gethorang.com` |
| **Tokki** | 토끼 = rabbit. Cute, fast. | Soft, cute | Conflicts with tiger mascot |
| **Hanji** | 한지 = traditional Korean paper. Cream palette, craft, premium. | Warm, editorial | Less "game" |
| **Sori** | 소리 = sound. Audio-first positioning. | Clean, musical | Common word; likely taken in audio apps |
| **Byeol** | 별 = star. Level/star metaphor. | Bright, night-sky | Spelling ambiguity |
| **Nori** | 놀이 = play. Literal positioning. | Fun, simple | Crowded (Nori AI etc.) |
| **Maru** | 마루 = floor/ridge. | Soft, friendly | Generic |
| **Kko** | 꼬 = playful syllable, "kkokkio" energy. | Loud, meme-y | Hard to search |

**Mascot:** Horang — a cream-and-amber tiger cub with coral stripes and an indigo outline, 3 expressions (idle, celebrate, oops). Used in onboarding, empty states, streak celebration, chest. Keep it optional — the app must look complete without it.

**Voice & tone:** warm, brief, a little mischievous, never corporate. Second person. Max 1 exclamation mark per screen. Never shame. Examples:
- ✅ "That's a 7-day flame. Don't stop now."
- ❌ "You missed your goal yesterday 😢"
- ✅ "Almost. The particle is 이, not 가."
- ❌ "Wrong! Study harder."

---

## 3. Information architecture & screens

### 3.1 Navigation model

- **5 bottom tabs:** Learn · Quests · Shop · Passport · Me
- **Stack pushes** (slide from right, 320ms): Node player, Node complete, Streak celebration, Sentence of the Day, Settings, League detail, Pack guidebook.
- **Overlays** (fade + spring): modals (confirm, level-up), bottom sheets (word detail, chest open, filters).
- **No hamburger menu.** No settings gear in the top bar (it lives in Me).
- Modal stack depth max 2; bottom sheet max 1.

### 3.2 ASCII flow — first run and daily loop

```
                          ┌──────────────┐
                          │   APP LOAD   │
                          └──────┬───────┘
                                 │
                    ┌────────────┴─────────────┐
                    │                          │
             returning user?                new user
                    │                          │
                    ▼                          ▼
        ┌───────────────────┐        ┌────────────────────┐
        │ S1  HOME / PATH   │        │ S0  WELCOME (1 tap)│
        └─────────┬─────────┘        └──────────┬─────────┘
                  │                             ▼
                  │                  ┌────────────────────┐
                  │                  │ S2  GOAL PICK      │
                  │                  └──────────┬─────────┘
                  │                             ▼
                  │                  ┌────────────────────┐
                  │                  │ S3  TIME / DAY     │
                  │                  └──────────┬─────────┘
                  │                             ▼
                  │                  ┌────────────────────┐
                  │                  │ S5  NAME + AVATAR  │
                  │                  └──────────┬─────────┘
                  │                             ▼
                  │                  ┌────────────────────┐
                  │                  │ S8  FIRST NODE CTA │
                  │                  └──────────┬─────────┘
                  │                             ▼
                  │                  ┌────────────────────┐
                  │                  │ S9  NODE PLAYER    │◄── sentence #0 at ~0:50
                  │                  └──────────┬─────────┘
                  │                             ▼
                  │                  ┌────────────────────┐
                  │                  │ S10 NODE COMPLETE  │
                  │                  └──────────┬─────────┘
                  │                             ▼
                  │                  ┌────────────────────┐
                  │                  │ S4  QUICK CHECK ×5 │◄── "I'm brand new" (skip)
                  │                  └──────────┬─────────┘
                  │                             ▼
                  │                  ┌────────────────────┐
                  │                  │ S6  PLACEMENT      │
                  │                  └──────────┬─────────┘
                  │                             ▼
                  │                  ┌────────────────────┐
                  │                  │ S7  REMINDER TIME  │
                  │                  └──────────┬─────────┘
                  │                             ▼
                  │                  ┌────────────────────┐
                  │                  │ S11 STREAK / DAY 1 │
                  │                  └──────────┬─────────┘
                  │                             │
                  ├─────────────────────────────┘
                  ▼
        ┌────────────────────────────────────────────────┐
        │                 S1  HOME / HUB                 │
        │  [🔥12]           [🪙1,240] [❤×5] [avatar]     │
        │  ┌──────────────────────────────────────────┐  │
        │  │ Daily goal  ████████░░  90/120 XP       │  │
        │  └──────────────────────────────────────────┘  │
        │  PACK 3 · 음식 Food & Ordering      [Guidebook]│
        │        ●───────●───────◉───────○───────○       │
        │                (done) (now)  (lock)  (chest)   │
        │  ┌ Quests 2/3 ─────────────────────────────┐   │
        │  └──────────────────────────────────────────┘   │
        │  [Learn]  [Quests]  [Shop]  [Passport] [Me]    │
        └──────┬──────────┬──────────┬──────────┬───────┘
               │          │          │          │
               ▼          ▼          ▼          ▼
        ┌──────────┐┌──────────┐┌────────┐┌─────────────┐
        │ S9 NODE  ││ S12 DAILY││ S14    ││ S16         │
        │ PLAYER   ││ QUESTS   ││ SHOP   ││ PASSPORT    │
        └────┬─────┘└────┬─────┘└───┬────┘└──────┬──────┘
             │           │          │            │
             ▼           ▼          ▼            ▼
        ┌──────────┐┌──────────┐┌────────┐┌─────────────┐
        │ S10 DONE ││ S13 WEEK ││ S15    ││ S17 WORD    │
        │ + S11    ││ LEAGUE   ││ CHEST  ││ DETAIL SHEET│
        └────┬─────┘└──────────┘│ OPEN   │└─────────────┘
             │                  └────────┘
             ▼
        ┌──────────┐        ┌─────────────────┐
        │ BACK TO  │───────▶│ S18 PROFILE     │
        │ HOME     │        │ + S19 SETTINGS  │
        └──────────┘        └─────────────────┘
```

Screen IDs used in tickets: **S0–S19**.

### 3.3 Screen specs (top → bottom, exact)

All values assume 390px viewport. `safe-top` = `env(safe-area-inset-top)`, `safe-bottom` = `env(safe-area-inset-bottom)`. Horizontal page padding: **20px**.

---

#### S0 · Welcome (load screen + first tap)

Purpose: premium first impression, zero reading burden, one tap.

| Order | Element | Spec |
|---|---|---|
| 1 | Background | `--cream-50` #FFF8EF. Two blurred blobs: coral 320px at (-60,-40) opacity .35 blur 60px; mint 260px at (300,600) opacity .30 blur 70px. Three floating Hangul glyphs (가, 한, 글) 64px, `--ink-900` at 6% opacity, staggered float animation. |
| 2 | Logo mark | 96×96, radius 28, bg `--coral-500` #FF6B4A, inset highlight, 3D shadow `0 6px 0 #C93A1C`, centered glyph `ㅎ` in `--ink-900` 48px/800. |
| 3 | Wordmark | "Horang" 34px/800, `--ink-900`, letter-spacing -0.03em, margin-top 20 |
| 4 | Tagline | "Korean, one quest at a time." 16px/500 `--ink-500`, margin-top 8 |
| 5 | Spacer | flex:1 |
| 6 | Primary CTA | "Let's go" · full width 56px · `.btn-primary` |
| 7 | Microcopy | "No ads. No paywall. No homework energy." 13px `--ink-500`, center, margin-top 12 |
| 8 | Sign-in link | "I already have an account" ghost 15px `--ink-700`, margin-top 4 (height 44) |

Behavior: entire screen is static for 0–120ms (avoid flash), then choreography per §8. Tapping CTA → S2 with 320ms slide. If a session exists → go straight to S1 (still show the splash for 600ms minimum to avoid a flash of hub).

---

#### S1 · Home / Path (the hub)

| Order | Element | Spec |
|---|---|---|
| 1 | Status/top bar | 56px tall. Left: **streak flame** 28px + count 18px/800. Right: **coins pill** (🪙 1,240, 44px h, radius 999, bg `--indigo-100`, 15px/700 tabular), **Focus meter** (5×18px, hidden until Day 2 unlock), **avatar** 32px radius 999 with 2px white ring. |
| 2 | Daily goal card | Full width, 88px, radius 24, bg white, border `--line`, shadow-2. Left: **progress ring** 56px (stroke 7). Center: "Daily goal" 13px/600 `--ink-500`; "90 / 120 XP" 17px/800 `--ink-900` with count-up. Right: flame icon + "2 nodes to go" 12px `--mint-600`. Whole card taps → toast with goal detail (no nav). |
| 3 | Pack banner | Sticky at top when scrolling (`position: sticky; top: 0; z-index: 20`). 64px, bg `--cream-50` at 92% + blur 8px, bottom border `--line`. Left: "PACK 3" overline 11px/700 tracking .08em `--coral-800`; "음식 Food & Ordering" 20px/800 `--ink-900`. Right: "Guidebook" button 36px h, ghost, 13px/700, book icon. |
| 4 | Path | Vertical zigzag, 5 nodes per pack. Node centers offset: 0, +40, +8, −40, −8 px from center. Vertical gap 76px. Current node: 88px, coral fill, white icon, 3D shadow, pulsing halo (2.4s). Done: 72px, `--mint-100` fill, `--mint-600` check, no shadow. Locked: 64px, `--cream-200` fill, `--ink-300` lock, no shadow, tap → wiggle + toast "Finish the node above first." Chest node: 72px amber gift, shakes on tap, opens sheet. Boss/checkpoint node (end of pack): 96px indigo with crown. |
| 5 | Floating "Jump back in" pill | Only if user has an in-progress node: sticky bottom above nav, 48px, bg `--indigo-900`, cream text, "Resume · Node 4" + play icon. Tapping resumes at exercise index. |
| 6 | Quests preview strip | One 72px card: "Daily quests · 2/3" + 3 mini dots + chevron → S12. Margin-bottom 8. |
| 7 | Bottom nav | 64px + safe-bottom. 5 items, icon 24px + label 10px/700. Active = coral icon + coral label + 4px dot above label. Inactive `--ink-500`. |
| 8 | Scroll padding | `padding-bottom: 96px + safe-bottom` so last node clears nav. |

Empty/edge states:
- No streak yet → flame outlined gray, count "0".
- League ticker at top of path if rank changed: 40px mint banner "You moved to #7 in Silver League" (dismissible).

---

#### S2 · Onboarding — Goal pick

| Order | Element | Spec |
|---|---|---|
| 1 | Progress bar | 3 segments, 4px tall, 8px gap, radius 999. Segment 1 = coral (current), rest `--cream-200`. Margin-top 12. (Goal → Time → You) |
| 2 | Mascot | 96px tiger cub, `float` idle, top-right offset +120px, rotated 6deg |
| 3 | H1 | "What's your goal?" 32px/800, `--ink-900`, margin-top 24 |
| 4 | Sub | "We'll tune your first week around it." 16px `--ink-500`, margin-top 8 |
| 5 | Options | 4 cards, 72px each, gap 12, radius 20, bg white, border 2px `--line`; selected: border 2px `--coral-500`, bg `--coral-100`, check badge 24px. Emoji 24px + label 17px/700 + sub 13px `--ink-500`. |
| 6 | Primary CTA | "Continue" 56px, disabled until selection |
| 7 | Skip | "Skip" ghost, 15px `--ink-500`, height 44, centered |

Options copy:
1. 🗣️ **Travel & talk** — "Order food, ask directions, survive Seoul."
2. 🎬 **K-dramas & music** — "Stop reading subtitles."
3. 💼 **Work & study** — "TOPIK-ready, formal Korean."
4. 🌱 **Just curious** — "Start from zero, no pressure."

Behavior: tapping a card selects + 120ms scale pop + auto-advance after 260ms (no Continue needed; keep Continue visible for accessibility). Skipping defaults to "Just curious".

---

#### S3 · Onboarding — Time per day

| Order | Element | Spec |
|---|---|---|
| 1 | Progress | segment 2 of 3 |
| 2 | H1 | "How long each day?" |
| 3 | Sub | "You can change this later. Pick something you'd actually do." |
| 4 | Options | 4 rows (not cards): 88px, radio-style. Left: big number "5" 28px/800 + "min" 13px; right: outcome "Casual · 60 XP goal". Selected = coral border + coral-100 bg. Copy: 5 min "Casual · 60 XP", 10 min "Steady · 120 XP" (default, badge "Most picked"), 15 min "Serious · 180 XP", **Custom** "Set your own · 5–60 min". |
| 5 | CTA | "Continue" |

Daily XP goal mapping (canonical, from 01 §4.3): 5→60, 10→120, 15→180; Custom → minutes × 12 XP, rounded to nearest 10. XP per node ≈ 100–140 including bonuses, so this maps to ~1 / 1–2 / 2 nodes.

---

#### S4 · Onboarding — Quick check (placement quiz, after Node 1)

Entry: immediately after S10 (first win), or later from Settings → "Retake placement". This screen is **optional and skippable in one tap**; it personalizes the path but never gates play.

| Order | Element | Spec |
|---|---|---|
| 1 | Top bar | X (close, 44px target) left; "Quick check" 15px/700 center; "1 / 5" right 13px `--ink-500`. X → confirm sheet "Skip the check? We'll keep you at the very beginning." |
| 2 | Progress | 5 segments, fill coral as answered |
| 3 | Prompt | 24px/800, max 2 lines |
| 4 | Media slot | Optional 56px audio button (coral circle, play icon) for listening Q |
| 5 | Answer options | 4 × 56px, gap 10, radius 16, bg white, border 2px `--line`, 17px/600. Tap = select (indigo border) + 90ms; auto-advance 320ms after showing correct/wrong for 700ms. |
| 6 | Footer | "I'm a total beginner" ghost button, 44px, always visible → jumps straight to S6 with placement Level 1. |

Quiz content (fixed; answers marked •):

| # | Type | Prompt | Options |
|---|---|---|---|
| 1 | Vocab | Which one means **water**? | 물 • / 불 / 밥 / 집 |
| 2 | Meaning | What does **안녕하세요** mean? | Hello • / Thank you / Goodbye / Sorry |
| 3 | Particle | 저는 학생__ 입니다. | 이 • / 가 / 을 / 를 |
| 4 | Order | Which is correct for "I eat rice"? | 저는 밥을 먹어요 • / 저는 먹어요 밥을 / 밥을 저는 먹어요 / 먹어요 저는 밥을 |
| 5 | Listening | (audio: 감사합니다) What did you hear? | Thank you • / Hello / Goodbye / I'm sorry |

Scoring (ranks from 01 §4.2): 0–1 → **Level 1 · 새싹 Sprout**, start Pack 1 Node 1. 2–3 → **Level 2 · Sprout**, Pack 1 test-out offered. 4–5 → **Level 4 · 탐험가 Explorer**, Pack 1 test-out unlocked immediately.

Feedback: correct → option turns `--mint-100`/`--mint-600` + check + 180ms pop; wrong → `--berry-100`/`--berry-600` + correct option pulses dashed border. No "wrong" buzzer; copy stays neutral ("It's 물 — water.").

---

#### S5 · Onboarding — Name + avatar

| Order | Element | Spec |
|---|---|---|
| 1 | Progress | segment 3 of 3 |
| 2 | H1 | "What should we call you?" |
| 3 | Sub | "It shows up on the leaderboard. Make it good." |
| 4 | Input | 56px, radius 16, bg white, border 2px `--line`, focus border `--indigo-600`, 17px/600. Placeholder "Your name". Max 16 chars. Char counter appears at 12. |
| 5 | Avatar picker | Horizontal row of 6 × 56px circles (tiger, cat, bear, chick, robot, rabbit), selected = 3px coral ring + check badge. Default tiger. |
| 6 | CTA | "Continue" (disabled if name < 2 chars) |
| 7 | Legal microcopy | 11px `--ink-500`: "No email needed to start. You can add one later." |

Name validation: trim, collapse spaces, block profanity list, fallback "Explorer" if empty on blur.

---

#### S6 · Onboarding — Placement result

| Order | Element | Spec |
|---|---|---|
| 1 | Confetti | One-shot 900ms on entry (24 particles, coral/mint/amber) |
| 2 | Badge | 88px ring (SVG, 8px stroke) with "LV 4" 28px/800 center; ring animates 0→100% in 900ms |
| 3 | H1 | "You're a Level 4 Explorer" |
| 4 | Sub | "We'll skip what you already know. Pack 1 test-out unlocked." |
| 5 | Unlocked list | 3 rows, 44px: ✅ "Hangul basics" · ✅ "Greetings" · 🔓 "Test out of Pack 1" |
| 6 | Info card | 72px, `--indigo-100` bg: "You can test out of any pack later. Nothing is locked forever." 13px |
| 7 | CTA | "Sounds right" |

---

#### S7 · Onboarding — Reminder

| Order | Element | Spec |
|---|---|---|
| 1 | Progress | none (bonus screen, no bar) |
| 2 | Mascot | small 72px, bottom-right of header |
| 3 | H1 | "When should we nudge you?" |
| 4 | Sub | "One notification a day. That's it." |
| 5 | Time chips | Grid 3×2, 48px, radius 999: 07:00, 12:30, 18:00, 19:30 (default selected), 21:30, Custom. Selected = indigo-900 bg + cream text. |
| 6 | Toggle | "Skip reminders for now" 44px row with switch. Default off. |
| 7 | CTA | "Continue" |
| 8 | Microcopy | "We'll ask your browser only when you say yes." 11px |

No browser permission prompt yet — fire it after the first lesson completion (higher accept rate), tied to the chosen time.

---

#### S8 · Onboarding — First node CTA

| Order | Element | Spec |
|---|---|---|
| 1 | Full-bleed hero | 260px tall: coral→amber gradient panel with Horang + speech bubble "3 minutes. That's it." |
| 2 | H1 | "Your first quest is ready" 30px/800 |
| 3 | Meta row | 3 chips: "⏱ 3 min" · "8 exercises" · "~130 XP" |
| 4 | Node card preview | 96px: "P1 인사 Greetings · Node 1 — 안녕, Korea" + "3 sentences · first stamp" + play badge |
| 5 | CTA | "Start node 1" 60px, `.btn-primary`, with arrow |
| 6 | Microcopy | "No Focus cost. No ads. No paywall. Ever." 12px `--ink-500` |
| 7 | Skip | "I'll do it later" ghost 13px (goes to Home with node pulsing) |

Tapping CTA → S9. This is the conversion moment: **first sentence on screen by ~0:50, first exercise tappable before 0:45.**

---

#### S9 · Node player (lesson)

| Order | Element | Spec |
|---|---|---|
| 1 | Top bar | 56px: X (44px, confirm sheet if progress), **segmented progress bar** (1 segment per exercise, 6px tall, radius 999, done = coral, current = coral 60% + shimmer), **XP pill** "⚡ 40" (18px icon + 13px tabular). Focus meter appears **only** in Challenge/Boss modes, never in a normal node. |
| 2 | Combo pill | Appears at combo ≥3, top-right under bar: "🔥 ×3" 12px/800, amber-100 bg, indigo text, punch-in 180ms. Disappears on wrong. |
| 3 | Prompt block | 22–26px/800, `--ink-900`, max 3 lines. Optional instruction 13px `--ink-500` above ("Choose the Korean"). |
| 4 | Korean hero (when applicable) | 34px/800, `--ink-900`, centered, tappable → audio (speaker icon 20px, mint). `word-break: keep-all`. |
| 5 | Exercise body | One of the six canonical types (below). 2×2 image grid (140px tiles), 4 answer options (56px), sentence tiles (48px), 6-pair match grid, mic button, cloze sentence with blank. |
| 6 | Spacer | flex 1 |
| 7 | Feedback banner | Slide-up 56px (safe area aware): correct = `--mint-100` bg, `--mint-700` text, "Nice! +10 XP"; wrong = `--berry-100`, `--berry-700`, "It's 밥 — rice." Contains the correct answer + audio. Stays 900ms, then CTA swaps to "Continue". |
| 8 | Footer CTA | "Check" 56px full width `.btn-primary` (disabled until answer). After feedback: "Continue" (`.btn-ink`) with keyboard hint `Enter ↵` (desktop only). |

**Exercise types (canonical from 01 §1 — names are binding):**
1. `listen_pick` — audio plays, 4 meaning options.
2. `translate_pick` — English prompt, 3 Korean options.
3. `tile_build` — tap word tiles in order (Korean sentence).
4. `fill_blank` — 2 options for a particle/ending.
5. `speed_match` — 6 pairs, 45s timer.
6. `say_it` — mic, self-scored 1–3 stars (no ASR in MVP), skippable.

Node 1 order (8 exercises, 3 sentences + sentence #0): `say_it` (sentence #0, user's name) → `listen_pick` 안녕하세요 → `translate_pick` 감사합니다 → `tile_build` 안녕하세요 → `fill_blank` 네/아니요 → `listen_pick` 네 → `tile_build` 감사합니다 → `speed_match` (3 pairs, 30s on first run). Never two identical types in a row.

Rules:
- **Normal nodes never deduct Focus.** Focus is spent only in Challenge/Boss (01 §4.1). A normal node cannot be blocked, ever.
- Wrong answer → shake 320ms, option locks red, correct answer outlined mint, banner explains *why* in ≤12 words. Combo resets with a "poof" (scale 1.2→0).
- Three-touch rule: each new sentence must appear in 3 different exercise types in its first session; tier 3 at session end mints the Passport stamp.
- All Korean text has an audio button. TTS at MVP, `lang="ko-KR"`.

---

#### S10 · Node complete

| Order | Element | Spec |
|---|---|---|
| 1 | Confetti | 32 particles on entry, 1400ms, colors coral/mint/amber/indigo |
| 2 | Header | "Node complete" 13px overline coral + "Nice run." 28px/800 |
| 3 | XP tally | Center: big "+130 XP" 44px/800 with count-up (0→130, 600ms), amber sparkle behind. Breakdown rows below: "Answers +80" · "Node bonus +30" · "Perfect +20" (10px/600, `--ink-500`). |
| 4 | Stats row | 3 columns, 72px: Accuracy 92% · Time 3:41 · Best combo ×5. Values count up 500ms. |
| 5 | Stamps strip | "New stamps" + 2 stamp cards (sentence + English) horizontal scroll; Passport count animates 1/40 → 2/40 and the Greetings pack ring 10% → 30% |
| 6 | Chest teaser | If chest slot filled: "Chest unlocked" card with shaking chest, "Open" button → sheet |
| 7 | Streak block | 64px: flame + "Day 1" + week strip (M T W T F S S, one filled dot). **Day 1 is deliberately quiet — no full-screen takeover.** |
| 8 | CTAs | First node only: primary "Continue" → S4 quick check. Later nodes: "Continue" → Home; ghost "Review mistakes (3)". |
| 9 | Footer | "Next up: Node 5 · 3 min" 12px `--ink-500` |

Accuracy tiers: <70% → "Rough one. Run it back?" ; 70–89% → "Solid." ; 90–100% → "Clean sweep." Copy must never shame.

---

#### S11 · Streak celebration (full-screen, milestone only)

Triggers: **Day 7, 14, 30, 100**, streak repair, personal best. Day 1 uses the inline block in S10 only (01 §2.3: day 1 should feel easy, not momentous).

| Order | Element | Spec |
|---|---|---|
| 1 | Background | `--indigo-900` full-bleed with radial coral glow at 50% 30%, subtle star dots |
| 2 | Ring | 220px SVG ring draws 0→100% in 900ms, gradient coral→amber, thickness 10 |
| 3 | Flame | 96px flame inside ring, pulses 3× then settles, glow drop-shadow |
| 4 | Number | Streak count 64px/800 cream, count-up 700ms |
| 5 | Label | "day streak" 16px cream 70% |
| 6 | Week strip | 7 dots, today filled amber with ring |
| 7 | XP pill | "+130 XP today · goal hit" on indigo-800 pill |
| 8 | Copy | Rotating: "One week. You're dangerous." / "14 days. This is a habit now." / "30 days. You're not a beginner anymore." |
| 9 | CTA | "Keep going" cream button (ink text 15.65:1) |
| 10 | Share | ghost "Share streak" (copies text card) |

Exit: 320ms fade + scale down. Auto-advance disabled — user taps.

---

#### S12 · Daily quests

| Order | Element | Spec |
|---|---|---|
| 1 | Header | "Daily quests" 28px/800 + reset countdown "Resets in 6h 12m" 13px `--ink-500` (real time, no fake urgency) |
| 2 | Progress hero | 96px card: 3 chest slots, 2 filled 1 empty, "2/3 — chest ready at 3" + progress bar |
| 3 | Quest cards | 3 × 96px, radius 20, white, border line. Each: icon 40px in tinted circle, title 16px/700, progress "0/5 correct" or "0/1 node", progress bar 6px, reward stack "+30 XP" + "+20 🪙". Completed = mint check overlay + "Done" pill. |
| 4 | Reroll | One free reroll per day per quest (swap icon 20px). After use: "Reroll used" disabled. |
| 5 | Weekly quests | Section header + 2 larger cards (01 §6): "Complete 5 daily goals → 1 💎 + 200 🪙" · "Earn 3,000 XP → 2 chest slots + 100 🪙" |
| 6 | Footer note | "Quests reset at midnight, local time." 12px |

Quest pool (binding, from 01 §6 — do not invent others): answer 5 correctly · complete 1 node · hit your daily goal · earn 2 crits · review 3 fading sentences · get a 5-answer combo · finish a node with 3 stars · listen to 5 sentences' audio · say 3 sentences out loud · score 8+ in Speed Match · learn 2 new sentences · complete a Challenge losing ≤2 Focus. Rewards: easy 30 XP + 20 🪙 · medium 40 XP + 40 🪙 · stretch 50 XP + 60 🪙.

---

#### S13 · Week League / leaderboard

| Order | Element | Spec |
|---|---|---|
| 1 | Header | Back chevron + "Silver League" 22px/800 + info icon → modal explaining promotion |
| 2 | Tier hero | 120px indigo-900 card: league badge 64px, "Top 10 promote" + "3d 4h left", current rank "#7" 40px/800 |
| 3 | Zone divider | Sticky row "PROMOTION ZONE" 11px/800 mint on mint-100, appears above rank 10 |
| 4 | Rows | 56px each: rank 20px/800 (top 3 medal colors), avatar 32px, name 15px/700 (you = coral + "(you)"), XP 15px/800 tabular-nums. Row bg: you = `--coral-100`; promotion zone = mint tint 40%; demotion = berry tint 30%. |
| 5 | Bottom sticky | "You're 12 XP from #6" + ghost "Practice now" |
| 6 | Tabs | "This week" / "All time" segmented control 36px |

Tiers (01 §5): Bronze → Silver → Gold → Sapphire → Diamond. League placement unlocks on **Day 7**, not Day 1.

No public shaming: demotion zone is labeled "At risk" not "Losers". Demotion copy: "You'll drop to Bronze on Sunday."

---

#### S14 · Shop / loot

| Order | Element | Spec |
|---|---|---|
| 1 | Header | "Shop" + coins pill (🪙 1,240, 44px) + gems pill (💎 3, smaller) |
| 2 | Hero offer | 140px indigo-900 card: "Streak Freeze" 2-pack, 400 🪙 (or 1 💎), "Protect your flame" + snowflake art |
| 3 | Section: Chests | 2×2 grid, 120px tiles: Common 200 🪙 / Rare 500 🪙 / Epic 1,200 🪙 / Daily free (1/24h). Each shows contents preview (3 icons) + odds link. |
| 4 | Section: Boosts | Rows 64px: 2× XP for 15 min (300 🪙), Focus refill (2 💎, "free at midnight" tag), Streak repair (5 💎) |
| 5 | Section: Cosmetics | Avatar frames, app icon colors, Horang outfits 300–1,200 🪙 (01 §4.4) |
| 6 | Footer | "Everything here is earned by learning. Nothing costs real money." 12px. No "Restore purchases" in MVP. |

Chest odds must be real and displayed in a modal (no fake scarcity). No countdown timers except the truthful daily-free reset. The cheapest cosmetic must be affordable by Day 3 (~130 coins/day) — price accordingly.

---

#### S15 · Chest open (bottom sheet)

| Order | Element | Spec |
|---|---|---|
| 1 | Backdrop | `rgba(30,27,58,.45)`, blur 2px, fade 200ms |
| 2 | Sheet | 420px, radius 28 top, bg cream-50, drag handle 40×4 |
| 3 | Title | "Rare chest" + "Tap to open" |
| 4 | Chest | 160px SVG, idle float; on tap: shake 500ms (rotate ±4deg, 60ms alternating) then lid flies, burst 18 particles, glow |
| 5 | Rewards | 3 cards slide up staggered 80ms: "+50 🪙", "+20 XP", "Streak Freeze ×1" |
| 6 | CTA | "Collect all" primary; secondary "Open another (500 🪙)" if affordable |
| 7 | Close | X 44px top-right; swipe-down dismiss |

---

#### S16 · Passport (collection)

Purpose: the long-term completion artifact. A **Passport** of 40 sentence **Stamps** (one per sentence at tier 3), plus a searchable **Words** tab for vocabulary.

| Order | Element | Spec |
|---|---|---|
| 1 | Header | "Passport" 28px/800 + "12 / 40 stamps" 13px `--ink-500` |
| 2 | Passport hero | 112px indigo-900 card: passport booklet illustration 56px, "Seoul Passport", ring 40 segments or progress bar 8px at 30%, "28 to go" |
| 3 | Tabs | Segmented "Stamps" / "Words" 36px, sticky under header |
| 4 | Stamps tab | 2-column grid, gap 12; each **stamp card** 160×104: pack color top bar 4px, Korean sentence 17px/800 (2 lines max, keep-all), English 12px `--ink-500`, 5 mastery pips, stamp seal 28px in the corner when tier ≥3 (rotated −8deg, coral 80% opacity). Unearned = dashed border, 40% opacity, lock. Tap → S17. |
| 5 | Words tab | Mastery summary 4 pills (Learning 82 · Familiar 61 · Strong 74 · Mastered 31); search 48px "Search Korean or English"; filter chips All · Learning · Mastered · Bookmarked; word chip grid 2 cols (see §5.9), 5 pips |
| 6 | Sort | "Recent / A–Z / Pack" segmented, 32px |
| 7 | Empty state | Horang + "Your first stamp is one node away." + CTA "Start a node" |

Virtualize the grid. Show 24 per page with infinite scroll. A stamp is minted only on tier 3 — never fake a stamp for onboarding (01 §1: sentence #0 is the one intentional bonus stamp).

---

#### S17 · Word / sentence detail (bottom sheet)

| Order | Element | Spec |
|---|---|---|
| 1 | Sheet | 480px, radius 28 |
| 2 | Hero | Korean 40px/800 + romanization 15px `--ink-500` + audio 48px coral circle. If it's a sentence stamp, add a "STAMPED" seal 32px top-right. |
| 3 | Meaning | English 20px/700, part of speech / situation tag 12px |
| 4 | Mastery | 5 pips (tier 0 = all hollow) + "Strong · next review in 3 days" |
| 5 | Example | Sentence tile with the target word highlighted coral-100, translation below, audio |
| 6 | Mnemonic | Card `--amber-100`: "밥 sounds like 'bop' — bop the rice bowl." |
| 7 | Actions | Primary "Practice this sentence", secondary "Bookmark", ghost "Report an issue" |

---

#### S18 · Profile / stats

| Order | Element | Spec |
|---|---|---|
| 1 | Header | "Me" 28px/800 + settings icon (24px, 44 target) |
| 2 | Identity | Avatar 72px, name 22px/800, level badge "LV 4 · 탐험가 Explorer", join date |
| 3 | Streak card | 88px: flame 40px, "12 day streak", best "Best: 21", week strip |
| 4 | Totals | 2×2 grid 88px: Stamps 12/40 · Words 248 · Minutes 412 · Accuracy 91% |
| 5 | Activity | 5-week heatmap, 7px squares, 3px gap, 5 levels of coral tint; tap a day → tooltip |
| 6 | Achievements | Grid 3×N, 72px badges; locked = grayscale + lock; tap → requirements |
| 7 | League snapshot | Row → S13 |
| 8 | Settings row | 56px → S19 |

---

#### S19 · Settings

| Order | Element | Spec |
|---|---|---|
| 1 | Header | back + "Settings" |
| 2 | Group: Learning | Daily goal (row with value + chevron → sheet), Reminder time, Placement test (retake → confirm) |
| 3 | Group: Feel | Sound effects (toggle, default on), Haptics (on), Reduce motion (on/off, follows OS), Text size (S/M/L segmented) |
| 4 | Group: Account | Name, avatar, email (optional), export data, delete account (destructive, 2-step confirm) |
| 5 | Group: About | Version, privacy, terms, "Made for Korean learners" |
| 6 | Footer | "Horang v0.1.0" 12px |

No dark-mode toggle in MVP. The app is light-only (cream) by design; indigo is used for celebration surfaces.

---

## 4. Visual design system

### 4.1 Color tokens (paste verbatim)

All text/background pairs listed were measured with WCAG 2.1 relative luminance. **Do not swap these hexes.**

```css
:root {
  /* ---------- Brand: Coral (action / energy) ---------- */
  --coral-100: #FFE3DA;   /* tint bg, selected states */
  --coral-300: #FFAE97;   /* decorative, disabled-on-dark */
  --coral-500: #FF6B4A;   /* PRIMARY FILL. Ink text = 5.86:1 */
  --coral-600: #F0542F;   /* hover fill */
  --coral-700: #C93A1C;   /* 3D button shadow only, never text */
  --coral-800: #B83218;   /* coral TEXT on cream = 5.68:1, on coral-100 = 4.92:1 */

  /* ---------- Brand: Indigo (ink / depth) ---------- */
  --indigo-100: #ECE9FA;   /* chip bg */
  --indigo-300: #A9A0E0;
  --indigo-600: #4A3FA8;   /* focus ring, links on cream = 7.76:1 */
  --indigo-700: #3A3266;   /* cream text = 10.9:1 */
  --indigo-800: #2A2450;   /* dark cards, ink buttons */
  --indigo-900: #1E1B3A;   /* primary text, celebration bg. Cream = 15.65:1 */

  /* ---------- Brand: Mint (success / calm) ---------- */
  --mint-100: #DFF8EE;
  --mint-400: #7BE0C3;     /* on indigo-900 = 10.44:1 */
  --mint-600: #0E7C66;     /* success TEXT on cream = 4.87:1 */
  --mint-700: #0B6B58;     /* text on mint-100 = 5.77:1 */

  /* ---------- Accent: Amber (reward / streak) ---------- */
  --amber-100: #FFF1C9;
  --amber-400: #FFD166;    /* on ink = 11.44:1 */
  --amber-700: #7A4B00;    /* amber TEXT on cream = 7.03:1 */

  /* ---------- Accent: Berry (error / danger) ---------- */
  --berry-100: #FFE0E5;
  --berry-600: #D42440;    /* error TEXT on cream = 4.83:1; white on it = 5.09 */
  --berry-700: #B01B33;    /* text on berry-100 = 5.59:1 */

  /* ---------- Neutrals / surfaces ---------- */
  --cream-50:  #FFF8EF;    /* APP BACKGROUND */
  --cream-100: #FBF1E4;    /* recessed surface */
  --cream-200: #F4EDE3;    /* tracks, disabled fill */
  --line:      #E6DACB;    /* 1px borders */
  --line-strong:#D8C9B6;   /* 2px borders, 3D shadow neutral */
  --white:     #FFFFFF;

  --ink-900: #1E1B3A;      /* text primary (15.65 on cream) */
  --ink-700: #3F3A5C;      /* text secondary (10.11 on cream) */
  --ink-500: #6B6480;      /* text muted (5.30 on cream) — AA */
  --ink-300: #A8A1B8;      /* DISABLED ONLY (2.36:1 — never body text) */
  --ink-200: #C9C3D6;      /* disabled icons */

  /* ---------- Semantic aliases (use these in components) ---------- */
  --bg: var(--cream-50);
  --bg-raised: var(--white);
  --bg-sunken: var(--cream-200);
  --text: var(--ink-900);
  --text-muted: var(--ink-500);
  --text-on-dark: var(--cream-50);
  --brand: var(--coral-500);
  --brand-press: var(--coral-700);
  --success: var(--mint-600);
  --danger: var(--berry-600);
  --warning: var(--amber-700);
  --focus: var(--indigo-600);
  --overlay: rgba(30, 27, 58, 0.45);
}
```

**Contrast audit (shipped pairs):**

| Foreground | Background | Ratio | Verdict |
|---|---|---|---|
| #1E1B3A | #FFF8EF | 15.65 | AAA |
| #3F3A5C | #FFF8EF | 10.11 | AAA |
| #6B6480 | #FFF8EF | 5.30 | AA |
| #6B6480 | #F4EDE3 | 4.81 | AA |
| #1E1B3A | #FF6B4A | 5.86 | AA (primary button label) |
| #FFF8EF | #1E1B3A | 15.65 | AAA (celebration) |
| #FFF8EF | #4A3FA8 | 7.76 | AAA (focus/links) |
| #B83218 (coral text) | #FFF8EF | 5.68 | AA |
| #0E7C66 | #FFF8EF | 4.87 | AA (success text) |
| #0B6B58 | #DFF8EE | 5.77 | AA (success banner) |
| #B01B33 | #FFE0E5 | 5.59 | AA (error banner) |
| #7A4B00 | #FFF1C9 | 6.59 | AA (reward text) |

**Never do:** white text on `--coral-500` (2.82:1), `--ink-300` for body copy, mint-400 as text on cream, coral-500 as text on cream (2.67:1).

### 4.2 Typography

```css
:root {
  --font-sans: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo',
               'Malgun Gothic', 'Noto Sans KR', 'Segoe UI', Roboto, 'Helvetica Neue',
               Arial, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
}
html, body {
  font-family: var(--font-sans);
  color: var(--text);
  font-size: 16px;
  line-height: 1.5;
  letter-spacing: -0.01em;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
/* Hangul must not break mid-word */
.ko, .word-chip, .sentence-tile, h1, h2, h3 { word-break: keep-all; overflow-wrap: break-word; }
/* Tabular numbers for every counter */
.tabular, .xp, .rank, .timer { font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1; }
```

Scale (mobile → desktop via `clamp`):

| Token | Size / line-height | Weight | Letter-spacing | Use |
|---|---|---|---|---|
| `--t-display` | `clamp(36px, 9vw, 44px)` / 1.08 | 800 | -0.035em | Celebration numbers, streak count |
| `--t-h1` | `clamp(28px, 7vw, 34px)` / 1.15 | 800 | -0.03em | Screen titles, onboarding questions |
| `--t-h2` | 26px / 1.2 | 800 | -0.025em | Section titles, lesson prompt |
| `--t-h3` | 21px / 1.3 | 700 | -0.02em | Card titles |
| `--t-body-lg` | 17px / 1.5 | 500 | -0.01em | Answer options, body copy |
| `--t-body` | 16px / 1.5 | 500 | -0.01em | Default |
| `--t-sm` | 15px / 1.45 | 500 | 0 | Secondary copy, nav labels (nav uses 10px/700) |
| `--t-caption` | 13px / 1.4 | 500 | 0 | Meta, helper |
| `--t-overline` | 11px / 1.2 | 800 | 0.08em, uppercase | Unit labels, "PROMOTION ZONE" |
| `--t-ko-hero` | 34px / 1.25 | 800 | -0.02em | Korean word in exercise |
| `--t-ko-xl` | 40px / 1.2 | 800 | -0.02em | Word detail sheet |

Rules:
- Never italicize Hangul. Never `text-transform: uppercase` on Korean.
- Korean body copy needs `line-height ≥ 1.55`; add `letter-spacing: -0.01em`.
- Max line length 34ch on mobile.
- Font loading: `font-display: swap`; if Pretendard unavailable, the stack above must render without layout shift (size-adjust fallback optional).

### 4.3 Spacing, radii, shadows, z-index

```css
:root {
  /* Spacing — 4px base */
  --s-1: 4px;  --s-2: 8px;  --s-3: 12px; --s-4: 16px;
  --s-5: 20px; --s-6: 24px; --s-7: 32px; --s-8: 40px;
  --s-9: 48px; --s-10: 64px; --s-11: 80px; --s-12: 96px;

  /* Radii */
  --r-xs: 8px; --r-sm: 12px; --r-md: 16px; --r-lg: 20px;
  --r-xl: 24px; --r-2xl: 28px; --r-3xl: 32px; --r-pill: 999px;

  /* Shadows — indigo-tinted, never pure black */
  --shadow-1: 0 1px 2px rgba(30,27,58,.06), 0 2px 8px rgba(30,27,58,.05);
  --shadow-2: 0 2px 6px rgba(30,27,58,.07), 0 8px 24px rgba(30,27,58,.08);
  --shadow-3: 0 12px 32px rgba(30,27,58,.14), 0 2px 8px rgba(30,27,58,.08);
  --shadow-glow-coral: 0 0 0 6px rgba(255,107,74,.18), 0 8px 24px rgba(255,107,74,.28);
  --shadow-glow-amber: 0 0 0 6px rgba(255,209,102,.22), 0 8px 24px rgba(255,209,102,.30);

  /* 3D game-button depth */
  --depth-brand: 0 4px 0 var(--coral-700);
  --depth-neutral: 0 4px 0 var(--line-strong);
  --depth-ink: 0 4px 0 #120F26;

  /* Layout */
  --app-max: 480px;
  --shell-max: 1160px;
  --nav-h: 64px;

  /* Motion */
  --dur-1: 90ms;  --dur-2: 150ms; --dur-3: 220ms; --dur-4: 320ms;
  --dur-5: 480ms; --dur-6: 700ms; --dur-7: 1200ms;
  --ease-out: cubic-bezier(.22, 1, .36, 1);
  --ease-in-out: cubic-bezier(.65, 0, .35, 1);
  --ease-spring: cubic-bezier(.34, 1.56, .64, 1);
  --ease-snap: cubic-bezier(.2, .8, .2, 1);

  /* Z-index */
  --z-nav: 40; --z-sticky: 30; --z-toast: 60; --z-sheet: 70; --z-modal: 80; --z-confetti: 90;
}
```

### 4.4 Buttons

Common: font 17px/700, letter-spacing -0.01em, height 56px (`--btn-lg` 60px, `--btn-sm` 44px), padding 0 24px, radius `--r-md` 16px, `transition: transform 90ms var(--ease-snap), box-shadow 90ms, background 150ms`, `touch-action: manipulation`, minimum hit 44×44.

```css
.btn-primary {
  background: var(--coral-500);
  color: var(--ink-900);
  box-shadow: var(--depth-brand), inset 0 1px 0 rgba(255,255,255,.35);
  border: 0;
}
.btn-primary:hover { background: var(--coral-600); }
.btn-primary:active {
  transform: translateY(4px);
  box-shadow: inset 0 3px 6px rgba(0,0,0,.14);
}
.btn-primary:disabled {
  background: var(--cream-200); color: var(--ink-300);
  box-shadow: none; transform: none; cursor: not-allowed;
}
.btn-primary:focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; }

.btn-secondary {
  background: var(--white);
  color: var(--ink-900);
  border: 2px solid var(--line-strong);
  box-shadow: var(--depth-neutral);
}
.btn-secondary:active { transform: translateY(4px); box-shadow: none; }

.btn-ghost {
  background: transparent; color: var(--ink-700);
  border: 0; box-shadow: none; font-weight: 600;
}
.btn-ghost:hover { background: var(--cream-200); }
.btn-ghost:active { transform: scale(.98); }

.btn-ink {           /* high-emphasis confirm, celebration surfaces */
  background: var(--indigo-800); color: var(--cream-50);
  box-shadow: var(--depth-ink);
}
.btn-danger {
  background: var(--berry-600); color: #fff;
  box-shadow: 0 4px 0 var(--berry-700);
}
```

Rules: only **one** primary per viewport. Primary CTAs are full-width minus 20px gutters. Icon+label gap 10px. Never put a primary button on coral-100 without a white card behind it.

### 4.5 Cards, chips, inputs

```css
.card {
  background: var(--white);
  border: 1px solid var(--line);
  border-radius: var(--r-xl);
  box-shadow: var(--shadow-2);
  padding: var(--s-5);
}
.card-flat { box-shadow: none; }
.card-dark {
  background: var(--indigo-900); color: var(--cream-50);
  border: 0; box-shadow: var(--shadow-3);
}
.chip {
  display: inline-flex; align-items: center; gap: 6px;
  height: 32px; padding: 0 12px; border-radius: var(--r-pill);
  background: var(--cream-200); color: var(--ink-700);
  font-size: 13px; font-weight: 600;
}
.chip[aria-pressed="true"] { background: var(--indigo-900); color: var(--cream-50); }
.input {
  height: 56px; border-radius: var(--r-md); border: 2px solid var(--line);
  background: var(--white); padding: 0 16px; font-size: 17px; font-weight: 600;
  color: var(--ink-900); width: 100%;
}
.input::placeholder { color: var(--ink-500); font-weight: 500; }
.input:focus { outline: none; border-color: var(--indigo-600); box-shadow: 0 0 0 4px var(--indigo-100); }
.input[aria-invalid="true"] { border-color: var(--berry-600); }
```

### 4.6 Decorative background (desktop + mobile)

```css
body {
  background-color: var(--cream-50);
  background-image:
    radial-gradient(520px 520px at 12% -8%, rgba(255,107,74,.16), transparent 62%),
    radial-gradient(460px 460px at 92% 18%, rgba(123,224,195,.20), transparent 60%),
    radial-gradient(420px 420px at 82% 96%, rgba(255,209,102,.18), transparent 60%);
  background-attachment: fixed;
}
/* Paper grain, CSS-only, 6% opacity */
body::before {
  content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 0;
  opacity: .06; mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E");
}
```

Never place the grain above interactive content without `pointer-events:none`. It sits at z-0; the app shell is z-1.

### 4.7 Motion spec (exact)

**Global rules**
- Use only `transform` and `opacity` for animation (plus `box-shadow` on buttons, `stroke-dashoffset` on rings).
- Nothing animates longer than 1200ms except ambient loops (flame, float, shimmer).
- Stagger limit: 6 items × 60ms max.
- `prefers-reduced-motion: reduce` → all durations to 1ms, remove confetti/parallax, keep opacity changes.
- Screen push: 320ms `--ease-out`, incoming `translateX(24px)+opacity 0` → 0; outgoing `-8px`. Tab switch: 150ms crossfade only, no slide.
- Backdrop: 200ms fade to `rgba(30,27,58,.45)`; sheet 320ms `--ease-spring` from `translateY(100%)`.
- Modal: 240ms `--ease-spring`, scale .92 → 1 with opacity.

| # | Micro-animation | Trigger | Duration / easing | Exact behavior |
|---|---|---|---|---|
| 1 | **XP bar fill** | XP gained | 600ms `--ease-out` | `transform: scaleX(from→to)` with `transform-origin:left`; shimmer overlay sweeps 700ms; number counts up 600ms |
| 2 | **Streak flame pulse** | Always on home/streak | 2400ms `--ease-in-out` infinite | `scale 1 → 1.06 → 1`, `filter: drop-shadow(0 0 0 → 0 0 8px rgba(255,209,102,.7))`; pause when tab hidden |
| 3 | **Chest shake + burst** | Tap chest | shake 500ms; burst 700ms | rotate `0, -4deg, 4deg, -3deg, 3deg, 0` every 60ms; then lid `translateY(-40px) rotate(-12deg)` 300ms + 18 particles 700ms |
| 4 | **Correct-answer pop** | Correct | 260ms `--ease-spring` | option `scale 1 → 1.04 → 1`; check badge `scale 0 → 1`; green border fades in 120ms |
| 5 | **Combo counter punch** | Combo increments | 180ms `--ease-spring` | `scale 1 → 1.28 → 1` + `rotate -3deg`; pill bg flashes amber-400 for 120ms |
| 6 | **Confetti** | Lesson complete, streak, level-up | 1400–2200ms | 24–32 absolutely-positioned 8×12px rects; randomized x, rotation, 2 fall speeds; `translateY(0→110vh) rotate(0→540deg)`, opacity 1→0 at 85% |
| 7 | **Level-up ring** | Placement / new level | 900ms `--ease-out` | SVG `stroke-dashoffset: C → 0`; center number counts up 700ms; ring glow pulses once |
| 8 | **Button press** | Pointer down | 90ms `--ease-snap` | `translateY(4px)` + shadow collapse; release springs back 150ms |
| 9 | **Shake (wrong)** | Wrong answer | 320ms | `translateX: 0,-6,6,-4,4,0`; border turns berry; combo pill poofs (scale 1.2→0, 180ms) |
| 10 | **Number ticker** | Any stat change | 500–700ms `--ease-out` | JS `requestAnimationFrame`; integer only; `tabular-nums`; never animate from 0 on re-render (only on new gain) |
| 11 | **Staggered list reveal** | Screen enter | 320ms, 60ms stagger | `translateY(10px)+opacity 0 → 0/1`, max 6 items |
| 12 | **Toast** | Action confirm | in 220ms / hold 2400ms / out 180ms | `translateY(12px)+opacity`, sits 12px above nav |
| 13 | **Word chip mastery fill** | Word level up | 420ms `--ease-spring` | dot scales 0→1, chip border flashes mint 300ms |
| 14 | **Halo pulse (current node)** | Home | 2000ms infinite | `box-shadow: 0 0 0 0 rgba(255,107,74,.35) → 0 0 0 14px rgba(255,107,74,0)` |
| 15 | **Ambient float** | Logo/mascot | 3600ms infinite alternate | `translateY(0 → -6px)` |

Keyframes to ship:

```css
@keyframes xp-fill { from { transform: scaleX(var(--from, 0)); } to { transform: scaleX(var(--to, 1)); } }
@keyframes flame-pulse {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(255,209,102,0)); }
  50%      { transform: scale(1.06); filter: drop-shadow(0 0 8px rgba(255,209,102,.75)); }
}
@keyframes chest-shake {
  0%,100% { transform: rotate(0); } 15% { transform: rotate(-4deg); }
  30% { transform: rotate(4deg); } 45% { transform: rotate(-3deg); }
  60% { transform: rotate(3deg); } 75% { transform: rotate(-2deg); }
}
@keyframes pop-in {
  0% { transform: scale(.9); opacity: 0; }
  60% { transform: scale(1.04); opacity: 1; }
  100% { transform: scale(1); }
}
@keyframes shake-x {
  0%,100% { transform: translateX(0); } 20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); }
}
@keyframes rise-in { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes halo {
  from { box-shadow: 0 0 0 0 rgba(255,107,74,.35); }
  to   { box-shadow: 0 0 0 14px rgba(255,107,74,0); }
}
@keyframes float-y { from { transform: translateY(0); } to { transform: translateY(-6px); } }
@keyframes shimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }
@keyframes burst {
  from { transform: translate(0,0) scale(1); opacity: 1; }
  to   { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
}
@keyframes confetti-fall {
  0%   { transform: translate3d(var(--x), -10vh, 0) rotate(0); opacity: 1; }
  85%  { opacity: 1; }
  100% { transform: translate3d(calc(var(--x) + var(--drift)), 110vh, 0) rotate(540deg); opacity: 0; }
}
```

### 4.8 "Juice" checklist (definition of done for feel)

Every item must be present before a screen is considered done.

- [ ] **Press physics** on every button/card/node: 4px travel + shadow collapse, release spring.
- [ ] **Number tickers** on XP, gems, streak, accuracy, rank. Never snap.
- [ ] **Particle feedback** for: correct (6 sparks), wrong (0), combo (4 sparks), chest (18), node complete (32 confetti), level up (24).
- [ ] **Screen shake** only on wrong answer (4px, 320ms) and chest open (2px, 200ms). Never on nav.
- [ ] **Haptics-equivalent** (`navigator.vibrate` where supported; always mirror visually):
  - tap: `[10]`, correct: `[12, 40, 12]`, wrong: `[40, 30, 40]`, chest: `[20, 60, 20, 60, 20]`, level-up: `[30, 40, 30, 40, 60]`.
- [ ] **Audio-reactive visuals** (sound-free mode must feel complete): speaker icon pulses 3 rings while TTS plays.
- [ ] **Elastic easing** (`--ease-spring`) on anything that "arrives": sheets, badges, combo, checkmarks.
- [ ] **Color flash** on state change: correct = mint border 300ms; wrong = berry border 300ms.
- [ ] **Progress always visible**: during a node, segmented bar; on home, daily ring; in review, queue count.
- [ ] **Anticipation**: current node pulses; chest shakes idle every 6s (subtle, 2deg); "almost there" copy when ≥80% of goal.
- [ ] **Receipt**: every session ends with counted-up numbers and at least one particle event.
- [ ] **No dead taps**: any tap that can't act gives a 120ms wiggle + toast explaining why.
- [ ] **No spinners**: use skeletons with shimmer; max 400ms before content.

### 4.9 Iconography & illustration

- Icons: 24px grid, 2px stroke, rounded caps/joins, `currentColor`. Use Lucide-style geometry; custom flame/chest/gem graphics allowed.
- Emoji allowed only as **content** (goal picker, achievements), never as UI chrome (no emoji buttons in nav).
- Illustration: flat vector, 3 colors max per illustration (indigo, coral, cream), 2px indigo outline, offset shadow `3px 3px 0 rgba(30,27,58,.12)`.
- Hangul as decoration: single glyphs at 4–8% opacity, 64–120px, never overlapping text.

---

## 5. Component inventory (with states)

Every component below is a build ticket. Sizes are mobile; desktop inherits (see §6).

### 5.1 Node card (lesson card)
Anatomy: 96px h, 16px radius, white, border line, shadow-1, padding 16. Left: 48px icon tile (tinted by pack color). Middle: title 16px/700, meta 12px `--ink-500`. Right: 40px play/check/lock.
States: `default` · `hover` (shadow-2, translateY(-1px)) · `active` (translateY(2px)) · `in-progress` (coral left border 4px, "Resume" meta) · `complete` (mint-100 icon, check) · `locked` (opacity .55, lock icon, no shadow, cursor default) · `focus-visible` (3px indigo outline).

### 5.2 Progress ring
SVG 56/72/96/220px variants. Stroke 7 (56), 8 (72), 10 (220). Track `--cream-200`. Fill gradient `#FF6B4A → #FFD166` (linearGradient id per instance). `stroke-linecap: round`, start at -90deg. Center label 15px/800 tabular.
States: `empty` (0%, no fill) · `partial` (animated dashoffset 600ms) · `complete` (full + 400ms glow pulse, check replaces number) · `over-goal` (fill turns mint-400, small "+" badge).

### 5.3 XP pill
Height 28px, radius 999, padding 0 10px, bg `--indigo-100`, text `--indigo-700` 13px/800 tabular. Icon ⚡ 14px amber-700.
States: `idle` · `gaining` (number counts up; bg flashes amber-100 400ms; +10 floats up and fades 700ms) · `max` (bg amber-400, text ink).

### 5.4 Focus meter (heart meter)
5 Focus hearts, 18px each, gap 4. Filled: `--berry-600` with inner highlight (pseudo-element white .35, 4px circle). Empty: `--cream-200` fill, `--line-strong` stroke.
**Visible only in Challenge/Boss modes** (01 §4.1); it never appears in a normal node and can never block one.
States: `full` · `losing` (heart scales 1→1.3→0 + 6 particles, 320ms) · `empty` (all outline; label "Refill at midnight or 2 💎" 12px mint) · `refilled` (sequential pop 60ms stagger) · `hidden` (normal node).

### 5.5 Streak flame
SVG 28/40/96px. Two-layer flame: outer coral-500, inner amber-400. Idle pulse 2.4s. Count to the right 18px/800 tabular.
States: `zero` (outline only, `--ink-300`, no pulse) · `active` (pulse) · `at-risk` (after 8pm, desaturate 40% + amber halo pulsing 1.2s) · `frozen` (mint snowflake badge 16px, flame at 60% opacity) · `milestone` (96px in S11, 3× pulse then settle).

### 5.6 Quest card
96px h, radius 20, white, border, padding 16. Icon circle 40 (tint per quest type), title 16px/700, progress bar 6px (track cream-200, fill coral), right reward stack "+30 XP" + "+20 🪙" 12px/800 amber-100.
States: `idle` · `progress` (bar animates on change 600ms) · `complete` (mint check badge 24 top-right, bg mint-100 at 50%, "Done" pill) · `claimed` (opacity .6, "Claimed") · `reroll` (swap icon, 44 target, spin 300ms on tap).

### 5.7 Loot chest
SVG 72/160px: indigo body, amber bands, coral latch, 2px ink outline, highlight.
States: `idle` (float 3.6s, subtle 2deg wobble every 6s) · `ready` (amber glow, "Open" pill, shake on tap) · `opening` (shake 500ms → lid flies → burst) · `opened` (lid rotated, dim, "Opened" label) · `locked` (grayscale, lock badge).

### 5.8 Leaderboard row
56px, padding 0 12, radius 12, grid: 28px rank / 34px avatar / 1fr name / auto XP. Rank 15px/800 tabular; top 3 medal dot (gold `#FFD166`, silver `#D9D4E7`, bronze `#E0A46A`).
States: `normal` · `you` (bg coral-100, border coral-300, name coral-800 + "(you)") · `promotion` (mint tint bg, left 3px mint bar) · `demotion` (berry tint 30%, left 3px berry bar, label "At risk") · `passed` (row flashes mint 400ms when you overtake) · `loading` (skeleton shimmer).

### 5.9 Word chip / stamp card
Word chip: grid item 168×92, radius 18, white, border line, padding 12. Korean 20px/800 keep-all; English 13px `--ink-500` 1 line ellipsis; bottom row: **5 mastery pips** (5px, gap 3) + audio 24px; tier 0 = all hollow.
Stamp card (Passport): 160×104, same shell + 4px pack-color top bar, Korean 17px/800 (2 lines), English 12px; earned stamp seal 28px rotated −8deg at top-right.
States: `new` (tier 0, 5 hollow pips + "New" tag) · `learning` (1 pip coral) · `familiar` (2 pips amber) · `strong` (3 pips amber) · `mastered` (4 pips mint) · `golden` (5 pips amber-400 + star, card border amber-400) · `pressed` (scale .97) · `bookmarked` (corner ribbon amber) · `locked` (dashed border, .4 opacity).

### 5.10 Sentence tile
Used in "build the sentence". 48px h min, padding 0 14, radius 14, white, 2px line-strong, shadow 0 3px 0 line-strong, text 17px/700 keep-all.
States: `idle` · `selected` (indigo-900 bg, cream text, shadow collapse, translateY 3px) · `placed` (in answer tray, no shadow) · `correct` (mint border/bg) · `wrong` (berry border, shake) · `disabled` (opacity .45).
Answer tray: min-h 64, dashed 2px `--line-strong`, radius 16, cream-100 bg; empty hint "Tap the words in order".

### 5.11 Answer option
56px h, radius 16, white, 2px line, shadow 0 3px 0 line, padding 0 16, 17px/600, left-aligned, optional 24px image.
States:
- `idle`
- `hover` (border line-strong, translateY(-1px))
- `pressed` (translateY(3px), shadow none)
- `selected` (border indigo-600 2px, bg indigo-100, check dot 20px)
- `correct` (border mint-600, bg mint-100, check icon mint-700, pop 260ms)
- `wrong` (border berry-600, bg berry-100, X icon berry-700, shake 320ms)
- `reveal-correct` (when user was wrong: dashed 2px mint-600, mint-100 bg, label "Correct answer")
- `disabled` (opacity .45, no shadow, pointer-events none)
- `focus-visible` (3px indigo outline, offset 2)

### 5.12 Toast
56px h, max-width 340, radius 16, bg indigo-900, cream text 14px/600, icon 20px left, padding 0 16, shadow-3. Position: fixed bottom `calc(var(--nav-h) + 12px + env(safe-area-inset-bottom))`, centered. In 220ms rise, hold 2400ms, out 180ms. One at a time; queue max 3.
Variants: `info` (default) · `success` (mint icon) · `error` (berry icon) · `reward` (amber border + sparkle).
Copy max 60 chars, no period.

### 5.13 Modal
Max-width 360, radius 28, bg cream-50, padding 24, shadow-3, backdrop overlay. Pop 240ms spring.
Anatomy: optional 64px icon, title 22px/800, body 15px `--ink-700`, actions stacked (primary + ghost), close X 44px top-right.
Variants: `confirm` (two buttons) · `reward` (chest/level art) · `info` (single "Got it") · `destructive` (berry primary).
Rules: dismiss on backdrop tap only for non-destructive; Esc closes; focus trapped; returns focus to trigger.

### 5.14 Bottom sheet
Max-height 88dvh, radius 28 top corners, bg cream-50, handle 40×4 `--line-strong` at 8px top, padding 20 (bottom + safe area). Slide 320ms spring; backdrop fade 200ms. Drag-to-dismiss with 0.5 velocity threshold; snap back if <25% travel.
Variants: `word` (S17), `chest` (S15), `filters`, `goal-picker`.

### 5.15 Additional small components (must exist)
- **Segmented progress bar** (lesson): 6px h, 4px gap, radius 999; done coral, current coral 60% + shimmer, upcoming cream-200.
- **Stat block**: label 12px `--ink-500` uppercase-ish (no uppercase for Korean), value 22px/800 tabular.
- **Week strip**: 7 × 28px circles, 12px labels; filled = amber-400 with ink check; today = 2px indigo ring; future = cream-200.
- **Empty state**: 96px illustration, title 18px/700, body 14px `--ink-500`, one CTA.
- **Skeleton**: cream-200 base + shimmer gradient 1.4s infinite.
- **Badge**: 20px circle, 11px/800, coral bg ink text; max "99+".

---

## 6. Layout guidance

### 6.1 Breakpoints

| Name | Width | Behavior |
|---|---|---|
| `xs` | 0–389 | Fluid; page padding 16; type scales down 1 step |
| `sm` (design target) | 390–599 | **Canonical 390×844.** Padding 20. |
| `md` | 600–1023 | App shell centered, max 480, radius 32, shadow-3, 24px top/bottom margin, decorative bg visible around it |
| `lg` | 1024–1439 | Shell max 1080: left rail 88 + content 600 + right rail 320, gap 32 |
| `xl` | ≥1440 | Shell max 1160, centered; side decorations (floating Hangul glyphs, blobs) at page edges |

Mobile must be perfect first. Desktop is a **framed app**, never a full-bleed website: the user should always see cream/ambient background around the shell.

### 6.2 App shell CSS

```css
.app-shell {
  position: relative; z-index: 1;
  width: 100%; max-width: var(--app-max);
  margin: 0 auto;
  min-height: 100dvh;
  background: var(--bg);
  display: flex; flex-direction: column;
}
@media (min-width: 600px) {
  body { padding: 24px 16px; }
  .app-shell {
    min-height: calc(100dvh - 48px);
    border-radius: var(--r-3xl);
    box-shadow: var(--shadow-3);
    overflow: hidden;
    border: 1px solid var(--line);
  }
}
@media (min-width: 1024px) {
  .app-shell {
    max-width: var(--shell-max);
    display: grid;
    grid-template-columns: 88px minmax(0, 600px) 320px;
    gap: 32px;
    padding: 0 24px;
    align-items: start;
  }
  .rail-left { position: sticky; top: 24px; padding-top: 24px; }
  .rail-right { position: sticky; top: 24px; padding-top: 24px; display: grid; gap: 16px; }
  .app-main { min-height: calc(100dvh - 48px); border-left: 1px solid var(--line); border-right: 1px solid var(--line); }
  .bottom-nav { display: none; }           /* replaced by left rail */
}
```

**Desktop left rail (88px):** 5 icon buttons 48px stacked, active = coral pill + 3px left indicator; logo mark 40px at top; avatar 36px at bottom.
**Desktop right rail (320px):** stacked cards — "Today" (daily goal ring + streak), "Quests" (3 compact rows), "League" (top 3 + your rank), "Word of the day". Hidden below 1024.
**Desktop node player:** always centered max 600, even in lg — rails hidden during a node (`data-mode="focus"`), background dims to cream-100. This makes the exercise feel like a stage.

### 6.3 Safe areas & scrolling

```css
.app-main { padding-bottom: calc(var(--nav-h) + env(safe-area-inset-bottom) + 16px); }
.bottom-nav {
  position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
  width: 100%; max-width: var(--app-max);
  height: calc(var(--nav-h) + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: rgba(255,248,239,.92);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--line);
  z-index: var(--z-nav);
}
```
At ≥600px, bottom nav stays inside the shell (`position: sticky`), not viewport-fixed. Use `100dvh`, never `100vh` (mobile URL bar).

### 6.4 Responsive type & grid rules

- `--t-h1` uses `clamp` (see §4.2); everything else fixed.
- Lesson answer grid: 2 columns below 420px, 2 columns always (single column only for sentence tiles).
- Passport grid: 2 cols <600, 3 cols ≥600, 4 cols on lg right rail? No — collection is content, keep max 600 and 3 cols.
- All tap targets ≥44×44, ideally 48.
- Never horizontally scroll the page; only intentional carousels (word strip, filter chips) with `overscroll-behavior-x: contain`.

---

## 7. Onboarding script (screen by screen, exact copy)

**Budget: ≤45 seconds from first paint to first exercise; ≤90 seconds to first *win* (sentence #0 spoken).** Target median 38s to first tap in a lesson, 50s to sentence #0. Every screen has one job and one exit.

| # | Screen | Exact copy (verbatim) | Input | Time budget |
|---|---|---|---|---|
| 0 | Welcome | Logo · **Horang** · "Korean, one quest at a time." · CTA **"Let's go"** · micro "No ads. No paywall. No homework energy." · ghost "I already have an account" | 1 tap | 0:00–0:05 |
| 1 | Goal | **"What's your goal?"** · "We'll tune your first week around it." · cards: 🗣️ **Travel & talk** "Order food, ask directions, survive Seoul." / 🎬 **K-dramas & music** "Stop reading subtitles." / 💼 **Work & study** "TOPIK-ready, formal Korean." / 🌱 **Just curious** "Start from zero, no pressure." · ghost "Skip" | 1 tap (auto-advance 260ms) | 0:05–0:13 |
| 2 | Time | **"How long each day?"** · "You can change this later. Pick something you'd actually do." · **5 min** "Casual · 60 XP" / **10 min** "Steady · 120 XP" *Most picked* / **15 min** "Serious · 180 XP" / **Custom** "Set your own" · CTA "Continue" | 1 tap + 1 tap | 0:13–0:19 |
| 3 | Name | **"What should we call you?"** · "It shows up on the leaderboard. Make it good." · input placeholder **"Your name"** · 6 avatars · CTA **"Continue"** · micro "No email needed to start. You can add one later." | type + 1 tap (skippable: tap avatar → continue with "Explorer") | 0:19–0:30 |
| 4 | First node | Hero "3 minutes. That's it." · **"Your first quest is ready"** · chips ⏱ 3 min · 8 exercises · ~130 XP · card "P1 인사 Greetings · Node 1 — 안녕, Korea / 3 sentences · first stamp" · CTA **"Start node 1"** · micro "No Focus cost. No ads. No paywall. Ever." · ghost "I'll do it later" | 1 tap | 0:30–0:35 |
| 5 | Node 1 | Sentence #0: audio autoplays "저는 {name}입니다", full-bleed card, tap to replay, CTA **"Say it"** (mic or "I said it"). +10 XP + 6 sparks + first stamp (Passport 1/40). Then 7 more exercises. **First exercise tappable at ≤0:40.** | 8 interactions | 0:35–3:35 |
| 6 | Complete | **"Node complete"** → **"Nice run."** · **+130 XP** count-up · accuracy / time / combo · "New stamps" 2 cards · Passport 1/40 → 2/40 · CTA **"Continue"** | 1 tap | 3:35–3:50 |
| 7 | Quick check intro | **"Quick check"** · "5 questions. We'll skip what you already know." · CTA **"Start"** · ghost **"I'm a total beginner"** | 1 tap | 3:50–3:54 |
| 8 | Quick check Q1–Q5 | Q1 **"Which one means water?"** (물/불/밥/집) · Q2 **"What does 안녕하세요 mean?"** (Hello/Thank you/Goodbye/Sorry) · Q3 **"Fill the particle"** "저는 학생__ 입니다." (이/가/을/를) · Q4 **"Which is correct for 'I eat rice'?"** (4 orders) · Q5 **"What did you hear?"** (audio 감사합니다; Thank you/Hello/Goodbye/I'm sorry) · footer always **"I'm a total beginner"** | 5 taps, ~5s each | 3:54–4:25 |
| 9 | Placement | Confetti · ring **"LV 4"** · **"You're a Level 4 Explorer"** · "We'll skip what you already know. Pack 1 test-out unlocked." · list ✅ Hangul basics / ✅ Greetings / 🔓 Test out of Pack 1 · info "You can test out of any pack later. Nothing is locked forever." · CTA **"Sounds right"** | 1 tap | 4:25–4:32 |
| 10 | Reminder | **"When should we nudge you?"** · "One notification a day. That's it." · chips 07:00 / 12:30 / 18:00 / **19:30** / 21:30 / Custom · toggle **"Skip reminders for now"** · CTA "Continue" · micro "We'll ask your browser only when you say yes." | 1 tap + 1 tap | 4:32–4:38 |
| 11 | Home | Path with Node 1 done, Node 2 pulsing, Passport 2/40, quest 1/3 | — | 4:38 |

Timing note: if the team insists the placement quiz must precede the first node (not recommended), the quiz adds ~35s and still lands at ~70s to first exercise — inside the 90s ceiling. The *canonical* order above is preferred because 01 §2.1 promises a real Korean sentence within 90 seconds, and this order delivers it at ~0:50.

Skip paths: "I already have an account" → sign-in. "Total beginner" on quiz → placement Level 1, keeps name/reminder (saves ~30s). "Skip" on goal → defaults "Just curious". Closing the quiz (X) → Placement Level 1.

Rules:
- No email, no password, no terms wall before the first node. Guest account created silently (local ID; upgrade later, framed as "Save your streak").
- Browser notification permission is requested **after the first node**, with a pre-prompt card: "Get your 19:30 nudge? [Turn on] [Not now]".
- Progress is saved after every screen (refresh-safe).
- The 3-segment bar tracks Goal → Time → You. Post-node screens are "bonus" with no bar.
- Copy never says "test", "exam", or "assessment". Use "quick check", "placement".
- The word "lesson" may appear in body copy, but buttons say **"node"** ("Start node 1") to match 01's unit model.

---

## 8. "First 10 seconds" spec

The goal: by t=1.2s the app looks expensive; by t=6s the user has tapped once; by t=10s they have picked a goal and are choosing a daily commitment.

| t (ms) | Event | Exact spec |
|---|---|---|
| 0 | Paint | `--cream-50` background, ambient radial glows, grain. No logo yet. No layout shift after this point. |
| 120 | Logo mark enters | 96px coral squircle, `scale(.8)`+`opacity 0` → `scale(1)`+`opacity 1`, **320ms** `--ease-spring`, `transform-origin: center`. |
| 380 | Wordmark rises | "Horang" 34px/800, `translateY(10px)`+opacity 0 → 0/1, **260ms** `--ease-out`. |
| 560 | Tagline fades | "Korean, one quest at a time." 16px, **220ms** `--ease-out`, opacity 0→1. |
| 700 | Decorative glyphs drift in | 가 / 한 / 글, 64px, 6% ink, `translateY(16px)`+opacity 0→1, **600ms**, stagger 80ms; then infinite float 3.6s ±4px. |
| 820 | CTA rises | "Let's go" 56px primary, `translateY(14px)`+opacity 0 → 0/1, **320ms** spring. Tappable immediately (no delay gate). |
| 980 | Microcopy | "No ads. No paywall. No homework energy." 13px, fade 200ms. |
| 1100 | Idle begins | Logo `float-y` 3.6s infinite alternate; blob drift 12s; shimmer sweep across the logo mark once at 1400ms (600ms). |
| 1200+ | Interactive | User taps "Let's go" → S2 slides in 320ms. Goal screen elements stagger in 60ms × 4 (title, sub, cards, CTA). |

First-session-through-tap targets:

| Milestone | Target |
|---|---|
| First meaningful paint | <400ms |
| CTA visible/interactive | <900ms |
| Tap "Let's go" | ≤3s |
| Goal selected | ≤9s |
| First exercise on screen | ≤45s |

Desktop (1440×900) first load: same choreography, but the app shell fades in at 0ms (`opacity 0→1`, 200ms), floats at 24px margin with `--shadow-3`, and the background blobs are larger (560px) and positioned outside the shell. The CTA should sit around y=640, comfortably above the fold at 900px height.

Reduced motion: everything appears instantly at final state, no confetti, no float; the app must still look complete.

---

## 9. Build acceptance checklist

A screen is not done until all are true.

**Visual**
- [ ] Only tokens from §4.1; no arbitrary hex.
- [ ] Text contrast ≥4.5:1 (≥3:1 for ≥24px bold), verified.
- [ ] 20px page gutters at 390; nothing clipped at 320.
- [ ] 390×844: primary CTA fully visible without scroll on onboarding screens.
- [ ] 1440×900: shell centered, max-width respected, background visible, no stretched cards.
- [ ] Korean text uses `word-break: keep-all` and renders in Apple SD Gothic Neo / Malgun Gothic / Noto Sans KR fallback.

**Feel**
- [ ] Every button has press travel + shadow collapse.
- [ ] Every number that changes animates (ticker).
- [ ] Correct/wrong feedback within 120ms of tap.
- [ ] Confetti/particles cleaned up from DOM after animation (no leaks).
- [ ] `prefers-reduced-motion` respected.
- [ ] No layout shift after first paint (reserve space for counters, badges).

**Behavior**
- [ ] Nothing blocks a node: no Focus gate on normal nodes, no energy, no ad, no paywall in first 3 sessions.
- [ ] Back navigation never loses lesson progress.
- [ ] Toast queue max 3; never stacks visually.
- [ ] Modal/bottom sheet traps focus, Esc closes, returns focus.
- [ ] All tap targets ≥44×44.
- [ ] Onboarding reaches the first exercise in ≤45s with no typing required except the name field (and even that is skippable).

**Copy**
- [ ] No "wrong!", no shaming, no "you failed".
- [ ] Max one exclamation mark per screen.
- [ ] Buttons are verbs ("Start lesson 1", "Continue", "Open"), not "OK"/"Submit".
- [ ] Korean strings include romanization on first encounter only.

---

*End of spec. Questions from workers should be resolved by the nearest explicit token or rule above; if truly absent, default to the most restrained option and flag it in the PR.*
