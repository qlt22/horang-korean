# Engagement Alternatives — the `gamification-lab` branch

The A1 course on `main` uses the **classic Horang stack**: streak, XP/levels, chests, crits, daily quests, weekly league, collection, unit badges. It works, but it is one particular bet: *loss aversion + variable reward + status*.

This branch prototypes three **different** bets. They are not reskins — each changes what the player is optimizing and why they come back. All three run on the real course data and real state.

Try them at `#/lab` → **Engagement Lab**.

---

## Why alternatives at all

Every engagement system creates a different answer to "why open the app tomorrow?":

| System | Core question | Fuel | Failure mode |
|---|---|---|---|
| **Classic** (main) | "Will I lose my streak / rank?" | loss aversion, status | anxiety, obligation |
| **Skill Constellation** | "What can I unlock next?" | autonomy, mastery, curiosity | choice paralysis |
| **Bounty Board** | "Which challenge do I choose today?" | autonomy, challenge, variable reward | over-optimising the reward |
| **Co-op Expedition** | "Will we make it this week?" | relatedness, shared goal, role identity | social loafing if contribution is invisible |

The product should test these as **modes**, not stack them. Stacking every system produces the bloated, notification-heavy mess that makes learning apps feel like work.

---

## 1. Skill Constellation — replace the linear path with a mastery map

**The bet:** adults quit linear paths when they feel behind. A map lets them choose the next star, and mastery is visible as light, not a number going up.

**Mechanic**
- 48 grammar patterns become 48 stars, clustered into 12 constellations (one per unit).
- A star lights when any sentence using that pattern is met; it brightens with strength (tier 3+).
- Prerequisite edges only gate a star when its unit is locked; within an unlocked unit, any star can be practised first.
- Tapping a star opens its pattern, two audio examples and **Practise 5** — a targeted session built from the sentences that actually use it.
- No XP is removed; the map is a second view of the same mastery data.

**Why it should engage**
- **Autonomy** (SDT): the player chooses the order inside a unit.
- **Mastery visibility**: the constellation is a picture of what they know, not a queue.
- **Curiosity gap**: unlit stars adjacent to lit ones are visible and named.
- **No single bottleneck**: a learner who hates dialogue can spend a day on particles and still make progress.

**Risk**
- Too much choice for absolute beginners. Mitigation: the current unit is highlighted, and a "recommended next star" is suggested but never forced.

**What to measure**
- Sessions started from the map vs from the linear path.
- Day-7 return rate for map users.
- Breadth of grammar practised (entropy across patterns).
- Completion rate of targeted practice sessions.

---

## 2. Bounty Board — chosen challenges with tiers, no punishment

**The bet:** the daily quest *pool* is assigned; a bounty *board* is chosen. Agency plus a harder optional goal produces more deliberate practice than three random chores.

**Mechanic**
- Three bounties per day, one per tier:
  - **Safe** — small reward, low target (e.g. 5 typed sentences).
  - **Risky** — medium reward, requires a clean run (e.g. a 3-star lesson).
  - **Epic** — large reward + gem, requires a hard combination (e.g. a 10-answer combo or 15 fading reviews).
- The player accepts **one** bounty. Accepting is a public-ish commitment (visible on Home and the board).
- Progress uses real counters (typed, combo, reviews, stars, words, say-it).
- **No stake, no penalty.** Failing only forfeits the bonus. This is deliberate: a coin wager would add loss aversion on top of an already loss-averse streak and push the app toward gambling mechanics.
- Claiming pays coins/XP/gem and stamps the card.

**Why it should engage**
- **Autonomy**: choosing the difficulty is itself a motivator.
- **Challenge–skill balance** (flow): three explicit difficulty tiers.
- **Endowed commitment**: accepting changes the Home CTA and creates a self-set goal.
- **Variable reward**: the epic tier is rare and visibly special.

**Risk**
- Reward-driven players may pick only the safe tier. Mitigation: the epic card shows a projected reward and a one-line "why this is hard"; the board tracks tier mix.

**What to measure**
- Accept rate per tier; claim rate per tier.
- Session length on bounty days vs non-bounty days.
- Share of users who ever accept an epic.

---

## 3. Co-op Expedition — a shared weekly goal with a role

**The bet:** solo streaks are about not losing; a shared expedition is about not letting the group down. Relatedness is the engagement lever the classic stack underuses.

**Mechanic**
- A weekly expedition goal (2,400 XP) shared by the learner and four **labelled pace-setters** (clearly NPCs, never fake humans).
- The learner picks a role that changes rewards for matching tasks:
  - **Scout** — listening and dictation +10 % XP.
  - **Scribe** — typing, reading and fill-blank +10 % XP.
  - **Envoy** — dialogue and say-it +10 % XP.
- The expedition track unlocks four story chapters at 25 / 50 / 75 / 100 % — short Seoul-trip vignettes, cosmetic only.
- Pace-setters contribute a deterministic daily amount; their names and "pace-setter" label are always visible. The learner's own bar is the only one that is real.
- Missing a day does not reduce anyone's progress; the group simply does not advance. No guilt copy.

**Why it should engage**
- **Relatedness** (SDT): a goal that is not only about the self.
- **Role identity**: choosing "Scribe" makes typing feel like a contribution, not a chore.
- **Weekly cadence**: a longer arc than the daily streak, with a clear finish line.
- **Narrative transport**: chapters give the XP a story.

**Risk**
- Fake social pressure can feel dishonest. Mitigation: pace-setters are explicitly labelled and the UI never implies a real person is waiting. If a real cohort exists, they replace the NPCs 1:1.

**What to measure**
- Weekly goal completion rate.
- Role distribution and whether role-matched task share rises.
- Day-7 and day-14 retention vs classic.
- Self-reported "studying for myself vs for the group" (short survey).

---

## Two more concepts (not built, for the next round)

### 4. Seoul Diary — narrative chapters with choices
Each unit unlocks a diary entry; two choices at the end change a cosmetic scene and the next chapter's opening line. Learning tasks are the only way to advance. The hook is curiosity/story, not score. Cheap to author, strong for the K-drama audience. Risk: narrative fatigue if chapters are not genuinely good.

### 5. Mastery Duels — asynchronous, same-content
Challenge a friend (or a labelled pace-setter) to the same 10 tasks; compare accuracy and speed, not XP. No loss of progress, no rank demotion. The hook is competence + relatedness without a global leaderboard. Risk: needs a backend and matchmaking; not viable for a local-first prototype.

---

## How to run the experiment

1. Ship the three modes behind `state.engagement.mode` (this branch).
2. Randomise new users 25 / 25 / 25 / 25 into classic / constellation / bounties / expedition at onboarding.
3. Primary metric: **retained mastery at Day 30** (sentences at tier ≥ 3), not DAU.
4. Secondary: D1/D7/D30, sessions per active day, session length, breadth of grammar, bounty/expedition completion.
5. Guardrail: no mode may reduce learning per minute. If constellation users open more but practise less, it loses.
6. Kill criterion: a mode that wins DAU but loses retained mastery is rejected — consistent with the ethics rule on `main`.

## Ethics

All three keep the main branch's rules: no energy wall, no paid loot boxes, no fake humans, no guilt copy, no confiscating earned progress. The bounty board deliberately has **no wager**; the expedition's companions are labelled; the constellation never removes mastery.
