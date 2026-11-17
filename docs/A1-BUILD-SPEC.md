# A1 BUILD SPEC — what changed from the MVP

Read `docs/A1-CONTENT-SPEC.md` (content), `docs/CONCEPT.md` (product logic), and `docs/BUILD-SPEC.md` (visual system — still binding).

## 1. The product is now a 60-session A1 course

- 12 units × (vocab · grammar · listening · reading · checkpoint) = **60 sessions**
- **288 sentences**, **576 word entries** (520 unique), **48 grammar points**, **12 dialogues**, **12 readings**
- Learner is assumed to read Hangul already; every word is new.
- Progress artifact: **unit badges** (12) + **sentences met / strong** (288) + **A1 certificate** (final exam).
- Units unlock sequentially after the previous unit's **four lessons** (not the checkpoint). Learning is never blocked by a test.

## 2. Core APIs (read the files; do not edit them)

### `core/course.js`
```js
UNITS, LESSONS, SENTENCES, WORDS, GRAMMAR, DIALOGUES, READINGS
SENTENCE_BY_ID, WORD_BY_ID, GRAMMAR_BY_ID, LESSON_BY_ID, UNIT_BY_ID
lessonAt(i), unitOfLesson(i), lessonsOf(unitId), sentencesOf(unitId), wordsOf(unitId), grammarOf(unitId)
lessonSentences(lesson), lessonWords(lesson), lessonGrammar(lesson), lessonDialogue(lesson), lessonReading(lesson)
unitUnlocked(unitId, completed), lessonUnlocked(i, completed), nextLessonIndex(completed)
unitProgress(unitId, mastery) → {lessonsDone, lessonsTotal, pct, sentences, met, strong, metPct, strongPct, stampPct}
```

### `core/quiz.js` — 13 task types
`word_card`, `grammar_card`, `listen_pick`, `translate_pick`, `tile_build`, `fill_blank`, `type_answer`, `dictation`, `dialogue_reply`, `reading_q`, `word_pick`, `word_match`, `say_it`.

```js
buildTask(type, {sentenceId, wordId, grammarId, pool, poolWords, dialogueId, lineIndex, readingId, qIndex, words})
gradeAnswer(ex, value) → {correct, near, correctLabel?, why?}
correctAnswerText(ex)
```
Task objects are self-describing. Notable fields:
- all: `id, type, prompt, instruction`
- sentence tasks: `korean, romanization, english, gloss, grammarTag, clipId, clipKind:'s'`
- `word_card`: `word, example, clipKind:'w', ungraded:true`
- `grammar_card`: `grammar, ungraded:true`
- `type_answer` / `dictation`: `answerText, input:true`, `dictation?`
- `fill_blank`: `blank:{before,after,answer,options}`, `options`
- `dialogue_reply`: `context[]`, `options`, `speaker`, `clipKind:'d'`
- `reading_q`: `reading:{title,ko,en}`, `question:{q,options,answer,why}`, `options`, `answerText`
- `word_match`: `pairs:[{id,ko,en,clipId}]`, `seconds`
- `say_it`: `selfAssess:true`

### `core/store.js` — new/changed
```js
recordAnswer({sentenceId, wordId, type, correct}) // wordId for word tasks; sentenceId for sentence tasks; both null for reading/dialogue
recordWord(wordId, correct), dueWords(), knownWordCount()
dailyPlan() → {items:[{id,label,progress,target,screen,params,icon}], done, claimed}
claimDailyBonus()
checkpoints, badges                      // state.checkpoints[unitId] = {passed,score}; state.badges = [unitId]
packProgress(unitId) → {met (tier≥1), strong (tier≥3), total, pct, strongPct}
stampCount() → strong sentences (rename in UI to "Strong")
completeNode() → summary {lessonKind, lessonId, unitId, unitTitle, met[], strong[], checkpoint:{passed,score,required}, ...}
```
`recordAnswer` already handles crit/combo/XP/mastery/quests. **Never call it for `ungraded` cards.**

### `core/audio.js` — bundled neural audio
```js
playClip('s'|'s-slow'|'w'|'d'|'g', id, {fallbackText, onend})
playTask(task, {slow, onend})   // ← use this everywhere
speak(text)                     // fallback only
```
Every sentence has `clipId` (its id). Words have `clipId=word.id`. Dialogue lines use line ids.
**Do not use speechSynthesis directly.** Use `data-clip` attributes for static buttons:
```html
<button data-clip="s01_1_1" data-clip-kind="s" data-say="저는 회사원이에요."></button>
```
The router handles it globally. A `data-clip-slow` button should pass `data-slow="1"`.

### Navigation
`router.go('vocab')`, `router.go('grammar')`, `router.go('exam')`, `router.go('lesson',{node})`.

## 3. Worker ownership

| # | Files | Job |
|---|---|---|
| W1 | `screens/lesson.js`, `styles/lesson.css` | Player for all 13 task types; audio via `playTask`; checkpoint mode; progress bar; keyboard |
| W2 | `screens/home.js`, `styles/home.css` | 12-unit course map (current unit expanded), daily plan, A1 progress, next lesson, retention cards |
| W3 | `screens/passport.js`, `screens/profile.js`, `styles/gamification.css`, `styles/profile.css` | Collection of 288 sentences + 576 words with pagination and filters; profile with unit badges/heatmap/strong count |
| W4 | `screens/vocab.js`, `screens/grammar.js`, `styles/learn-tools.css` | Word trainer (flashcards + word_pick quiz + due words) and grammar library (48 points + examples + audio) |
| W5 | `screens/complete.js`, `screens/onboarding.js`, `screens/exam.js`, `styles/exam.css` | Session receipt (met/strong/words), onboarding copy for A1, final 30-question A1 exam + certificate |

Do not edit core, main.js, index.html, or another worker's files.

## 4. Screen requirements (summary)

### W1 — lesson
- Render every type. Use `.opt`, `.tile`, `.tile-zone` from components.css.
- `word_card`: big Korean, romanization, English, example sentence, audio, "Got it" primary. No grading, +0 XP.
- `grammar_card`: pattern, one-line explanation, 2 examples with audio, common mistake, "Got it".
- `type_answer`: text input, Korean keyboard not required (IME works), Check; show `near` feedback as "Almost — check the spelling".
- `dictation`: audio-only first, replay + slow replay, input, reveal on wrong.
- `dialogue_reply`: show the previous 2 lines as chat bubbles (A left / B right), then 3 options.
- `reading_q`: collapsible passage card (Korean + English toggle), question, 4 options; after answering show `why`.
- `word_pick`: 4 Korean options.
- `word_match`: 5 pairs, 45s, tap Korean then English; mismatches count as mistakes.
- `say_it`: existing self-rating, but play the bundled clip.
- Checkpoint: header "Checkpoint · {unit}", no hints, show "80% to pass" and a pass/fail result at the end.
- Progress bar = items count. XP pill. Combo.
- On last Continue: `completeNode()` then `router.go('complete')`.
- Keyboard: 1–4 options, Enter check/continue, Esc leave.

### W2 — home
- Top: streak, coins/gems, avatar.
- **Daily plan card**: 3 rows from `store.dailyPlan()` with progress bars; claim button when done (calls `claimDailyBonus`).
- **A1 progress**: "X / 60 sessions · Y / 288 sentences met · Z strong" with a bar.
- Next lesson hero: unit ko + title, lesson title, kind chip, "Continue" → lesson.
- **Course map**: 12 unit sections. Current unit expanded, others collapsed to a header row (badge, title, progress, locked state). Inside: 5 nodes with kind icons (vocab/grammar/listening/reading/checkpoint), done/current/locked.
- Keep: fading alert, quests preview, league teaser, chest, Sentence of the Day, guidebook (now a unit grammar sheet).
- Fading sentences link to review.
- Never more than 4 progress bars visible at once above the map.

### W3 — passport + profile
- Rename the artifact: **Collection** (still route `passport`), subtitle "A1 · 288 sentences".
- Header: met / 288, strong / 288.
- Tabs: Sentences / Words / Badges.
- Sentences: grouped by unit, paginated 24 at a time (load more), search Korean/English, filter All/Met/Strong/Locked. Card: Korean, English, pips, "strong" seal at tier≥3, locked at tier 0.
- Words: 576 entries, search, filters, pips from `state.wordMastery`, "Train due words" button → `vocab`.
- Badges: 12 unit badges, earned = colored + date, locked = grey + requirement.
- Detail sheet: big Korean + bundled audio + slow, romanization toggle, English, grammar tags, gloss, next review, "Practice this sentence" → lesson practice (if unsupported, review + toast honestly).
- Profile: level, rank, streak, totals (sessions/288 sentences/576 words/minutes/accuracy), 5-week heatmap, 12 badges, memory health, A1 exam status, settings, retention lab.

### W4 — vocab + grammar
- **vocab.js**: header "Words", due count, "Start review" (10 due words, word_pick ×10), "Browse" list (search, unit filter, 576), word cards with audio + example + pips. A flashcard mode: show Korean → reveal meaning → "Again/Good/Easy" calls `recordWord`. Daily plan links here.
- **grammar.js**: 48 points grouped by unit, search, each card: pattern, ko, explanation, 2 examples with audio, common mistake, "practise this unit" → lesson of that unit. Progress: units with badge.
- Both mobile + desktop; reuse components.

### W5 — complete + onboarding + exam
- complete.js: accuracy headline, XP count-up, stars, **"X new sentences met"**, "Y words practised", strong list if any, chest, streak, next lesson CTA, checkpoint pass/fail panel when `summary.checkpoint`.
- onboarding.js: update copy to A1 (288 sentences, 60 sessions, "you can already read Hangul"), first node still sentence #0. Placement quiz should route to a sensible unit (beginner → u01; knows basics → skip to u02/u03 by score). Keep it under 90 seconds.
- exam.js: 30 mixed questions sampled across all units (listen/translate/type/fill/reading/word), 80% to pass, timer optional, certificate screen with name/date/badge, confetti. Entry only when all 12 badges earned (or a "preview" mode clearly labelled).

## 5. Visual rules (unchanged, binding)
Cream/coral/indigo/mint/amber tokens only. Chunky 3D buttons, 24px cards, staggered entrances, count-up numbers, press physics, no new hex values. 390×844 and 1440×900.

## 6. Definition of done
- No console errors on any screen.
- No horizontal overflow at 390px.
- Every Korean string has bundled audio (clip id), with a text fallback.
- Every number is real from state.
- `node --check` passes; the app boots; the full e2e journey still passes.
