# A1 CONTENT SPEC — Horang v2

Binding contract for content agents. Goal: a complete **CEFR A1 Korean** course for a learner who can already read Hangul but knows no vocabulary or grammar.

Read `docs/CONCEPT.md` for the product logic. This file is about **content only**.

- 12 units · 5 sessions per unit (4 lessons + 1 checkpoint) = **60 sessions**
- **288 sentences** (24 per unit: 6 per lesson)
- **576 words** (48 per unit, 12 per lesson)
- **48 grammar points** (4 per unit)
- **12 dialogues** (6–10 lines each)
- **12 readings** (50–90 words + 3 questions)
- Register: polite **해요체** unless the grammar point is specifically about `-습니다/ㅂ니다`.

Files: one JSON per unit in `docs/content/a1/u01.json` … `u12.json`. Do not create one giant file.

Validate after every unit:

```bash
node tools/validate-content.mjs            # all units
node tools/validate-content.mjs u01        # one unit
node tools/build-content.mjs               # merge → app/data/a1.js
```

A unit **must** pass with 0 errors before you report done.

---

## 1. Unit map (ids are fixed)

| # | id | ko | English | canDo |
|---|---|---|---|---|
| 1 | `u01_intro` | 자기소개 | Introductions | say who you are, your job, nationality; ask someone's name |
| 2 | `u02_daily` | 일상생활 | Daily life | say what exists / you have; say what you do every day; say you don't do something |
| 3 | `u03_food` | 음식 | Food & ordering | order food and drinks, ask the price, use counters, say you can't eat something |
| 4 | `u04_shopping` | 쇼핑 | Shopping & numbers | use Korean numbers and money, point at things, say "only", compare two things |
| 5 | `u05_places` | 장소 | Places & directions | say where you go, where you are, give a simple direction, ask where something is |
| 6 | `u06_time` | 시간 | Time & dates | tell the time, days of the week, dates, from–until, "when I…" |
| 7 | `u07_family` | 가족 | Family & people | talk about family, possession, age, honorifics, "to/from a person" |
| 8 | `u08_hobbies` | 취미 | Hobbies & ability | say what you like, what you can do, what you're good at, what you want to do |
| 9 | `u09_past` | 어제 | Yesterday (past) | tell a simple past event, sequence it, contrast it, give a reason |
| 10 | `u10_plans` | 계획 | Plans & invitations | say what you will do, suggest something, invite politely, give a reason |
| 11 | `u11_health` | 건강 | Health & weather | describe weather/health, use "if", "I'll", "must", "don't" |
| 12 | `u12_travel` | 여행 | Travel & A1 wrap-up | state intentions, before/after, make suggestions, handle a trip |

`u11_health` and `u12_travel` must feel like a capstone: recycle earlier patterns rather than introducing many new words.

---

## 2. Grammar map (ids and unit assignment are fixed)

| id | unit | ko | pattern | one-line explanation |
|---|---|---|---|---|
| g01 | u01 | 이에요/예요 | N + 이에요/예요 | "to be": 예요 after a vowel, 이에요 after a consonant |
| g02 | u01 | 은/는 | N + 은/는 | topic marker: "as for N…" |
| g03 | u01 | 이/가 | N + 이/가 | subject marker: who/what does it |
| g14 | u01 | 도 | N + 도 | "also / too" |
| g04 | u02 | 있어요/없어요 | N이/가 있어요 / 없어요 | "there is / I have" vs "there isn't" |
| g05 | u02 | 에 | N + 에 | time or destination particle |
| g06 | u02 | -아요/어요 | V-아요/어요 | present polite ending |
| g07 | u02 | 안 | 안 + V | simple negation "don't / doesn't" |
| g08 | u03 | 을/를 | N + 을/를 | object marker |
| g09 | u03 | 주세요 | N + 주세요 | polite request "please give me N" |
| g10 | u03 | counters | N + 개/잔/명 | counting things / drinks / people |
| g11 | u03 | 못 | 못 + V | "cannot" (unable) |
| g12 | u04 | numbers & money | Sino numbers + 원 | 1–100 and prices |
| g13 | u04 | 이/그/저 | 이/그/저 + N | this / that / that over there |
| g25 | u04 | 만 | N + 만 | "only N" |
| g46 | u04 | 더/제일 | 더 + adj / 제일 + adj | more / the most |
| g15 | u05 | 에 가다 | N + 에 가요 | "go to N" |
| g16 | u05 | 에서 | N + 에서 | "at / from N" (action location) |
| g17 | u05 | -(으)로 | N + (으)로 | direction / means: "toward, by" |
| g18 | u05 | 어디 / 위치 | 어디예요? / 앞·뒤·옆 | "where is it?" + basic position words |
| g19 | u06 | 시/분 | N시 N분 | telling the time |
| g20 | u06 | 요일/날짜 | 월요일 / N월 N일 | days of the week and dates |
| g21 | u06 | 부터/까지 | N부터 N까지 | from … until … |
| g48 | u06 | -(으)ㄹ 때 | V-(으)ㄹ 때 | "when I do V" |
| g22 | u07 | 의 | N + 의 | possessive "N's" |
| g23 | u07 | -(으)시- | V-(으)시- | honorific verb ending for elders |
| g24 | u07 | 살 | N + 살 | age counter "years old" |
| g47 | u07 | 한테/에게 | N + 한테/에게 | to / from a person |
| g26 | u08 | 좋아해요/좋아요 | N을/를 좋아해요 / N이 좋아요 | "I like N" vs "N is good" |
| g27 | u08 | -(으)ㄹ 수 있어요 | V-(으)ㄹ 수 있어요 | "can do V" |
| g28 | u08 | 잘/못 | 잘 V / 못 V | "do well" / "do poorly" |
| g29 | u08 | -고 싶어요 | V-고 싶어요 | "want to do V" |
| g30 | u09 | -았/었어요 | V-았/었어요 | past polite |
| g31 | u09 | -고 | V-고 | "and then / and" |
| g32 | u09 | 그래서 | clause + 그래서 + clause | "so / therefore" |
| g33 | u09 | -지만 | V-지만 | "but" |
| g34 | u10 | -(으)ㄹ 거예요 | V-(으)ㄹ 거예요 | future / plan |
| g35 | u10 | -(으)ㄹ까요? | V-(으)ㄹ까요? | "shall we…? / should I…?" |
| g36 | u10 | -아/어서 | V-아/어서 | "because / and then" |
| g37 | u10 | -(으)세요 | V-(으)세요 | polite imperative / request |
| g39 | u11 | -면 | V-면 | "if / when" |
| g40 | u11 | -겠- | V-겠어요 | "I will / it probably…" |
| g41 | u11 | -아/어야 해요 | V-아/어야 해요 | "must / have to" |
| g42 | u11 | -지 마세요 | V-지 마세요 | "don't do V" |
| g43 | u12 | -(으)려고 해요 | V-(으)려고 해요 | "I intend to V" |
| g44 | u12 | -기 전에 | V-기 전에 | "before doing V" |
| g45 | u12 | -(으)ㄴ 후에 | V-(으)ㄴ 후에 | "after doing V" |
| g38 | u12 | -(으)ㅂ시다 | V-(으)ㅂ시다 | "let's do V" (written/neutral) |

Each grammar record must include **2 examples**. Example sentences should be short and use vocabulary from the same unit.

---

## 3. Unit file schema

`docs/content/a1/uNN.json`:

```json
{
  "unit": {
    "id": "u01_intro",
    "order": 1,
    "title": "Introductions",
    "ko": "자기소개",
    "canDo": ["Introduce yourself by name, job and nationality", "Ask someone's name"],
    "grammarIds": ["g01", "g02", "g03", "g14"]
  },
  "lessons": [
    {
      "id": "l01_1",
      "unitId": "u01_intro",
      "order": 1,
      "kind": "vocab",
      "title": "Say who you are",
      "ko": "저는 학생이에요",
      "goal": "Use 이에요/예요 with jobs and nationalities",
      "grammarIds": ["g01"],
      "wordIds": ["w01_01"],
      "sentenceIds": ["s01_1_1"],
      "dialogueId": null,
      "readingId": null,
      "minutes": 5
    }
  ],
  "grammar": [
    {
      "id": "g01",
      "unitId": "u01_intro",
      "order": 1,
      "label": "to be (이에요/예요)",
      "ko": "이에요/예요",
      "pattern": "N + 이에요/예요",
      "explanation": "Use 예요 after a vowel and 이에요 after a consonant. It is the polite 'is/am/are'.",
      "examples": [
        { "ko": "저는 학생이에요.", "en": "I am a student." },
        { "ko": "저는 의사예요.", "en": "I am a doctor." }
      ],
      "mistake": "학생예요 ✗ → 학생이에요 ✓"
    }
  ],
  "words": [
    {
      "id": "w01_01",
      "ko": "학생",
      "rom": "haksaeng",
      "en": "student",
      "pos": "noun",
      "unitId": "u01_intro",
      "lessonId": "l01_1"
    }
  ],
  "sentences": [
    {
      "id": "s01_1_1",
      "unitId": "u01_intro",
      "lessonId": "l01_1",
      "korean": "저는 학생이에요.",
      "romanization": "jeoneun haksaeng-ieyo.",
      "english": "I am a student.",
      "literal": "As for me, student am.",
      "gloss": [
        { "ko": "저는", "rom": "jeoneun", "en": "I (topic)" },
        { "ko": "학생", "rom": "haksaeng", "en": "student" },
        { "ko": "이에요", "rom": "ieyo", "en": "am (polite)" }
      ],
      "grammarIds": ["g01", "g02"],
      "wordIds": ["w01_01"],
      "register": "polite",
      "difficulty": 1,
      "distractors": ["I am a teacher.", "I am not a student.", "Are you a student?"],
      "notes": "저는 is the humble 'I' + topic marker."
    }
  ],
  "dialogue": {
    "id": "d01",
    "unitId": "u01_intro",
    "title": "First day of class",
    "setting": "Two students meet before class.",
    "lines": [
      { "id": "d01_1", "speaker": "A", "ko": "안녕하세요. 저는 민수예요.", "rom": "annyeonghaseyo. jeoneun minsu-yeyo.", "en": "Hello. I'm Minsu." },
      { "id": "d01_2", "speaker": "B", "ko": "반가워요. 저는 안나예요.", "rom": "bangawoyo. jeoneun anna-yeyo.", "en": "Nice to meet you. I'm Anna." }
    ]
  },
  "reading": {
    "id": "r01",
    "unitId": "u01_intro",
    "title": "My first day",
    "ko": "저는 안나예요. 한국 사람이 아니에요. 미국 사람이에요. 저는 학생이에요. 한국어를 공부해요. 오늘은 학교에 가요.",
    "en": "I am Anna. I am not Korean. I am American. I am a student. I study Korean. Today I go to school.",
    "questions": [
      {
        "q": "Where is Anna from?",
        "options": ["America", "Korea", "Japan", "China"],
        "answer": 0,
        "why": "미국 사람이에요 = I am American."
      }
    ]
  }
}
```

### Hard requirements per unit

- Exactly **5 lessons** with `order` 1–5 and `kind` in this order: `vocab`, `grammar`, `listening`, `reading`, `checkpoint`.
- Exactly **24 sentences**: 6 per lesson 1–4. The checkpoint has **no own sentences** (`sentenceIds: []`) — it samples the unit.
- Exactly **48 words**, 12 assigned to each of lessons 1–4.
- Exactly **4 grammar points** from the unit's fixed list, each with 2 examples.
- 1 dialogue with 6–10 lines, attached to lesson 3 (`dialogueId: "dNN"`).
- 1 reading with 3 questions, attached to lesson 4 (`readingId: "rNN"`).
- Every sentence: ≥1 `grammarIds`, ≥2 `wordIds`, ≥2 `gloss` entries, exactly 3 `distractors`.
- Every word: used in at least one sentence **or** dialogue line **or** reading of the unit.
- Ids: sentences `sNN_l_k` (NN = unit, l = lesson order, k = 1..6), words `wNN_kk` (01..48), lessons `lNN_k`, dialogue `dNN`, reading `rNN`, dialogue lines `dNN_k`.

### Korean rules

- Natural, modern, polite Korean. Prefer sentences a beginner can actually say.
- No English, no romanization inside `korean`.
- Standard spacing. `word-break` is handled by CSS; do not insert spaces inside words.
- Use **Revised Romanization**, lowercase, hyphen between syllables only where ambiguity demands it. Keep it simple.
- Sentences 4–12 eojeol. No sentence longer than ~14 eojeol.
- Vary subjects and situations; do not repeat one pattern for all 6 sentences.
- Distractors must be plausible (wrong particle, wrong tense, wrong subject, negation flip), not random.
- **Particles must agree with batchim.** The validator enforces 은/는, 이/가, 을/를, 와/과, (으)로 on known vocabulary.
- Age: use native numbers (스무 살, 스물한 살). Money/time: Sino numbers. Do not mix.
- Check `-습니다` vs `-ㅂ니다` (먹습니다 / 갑니다).
- Avoid grammar beyond A1 and beyond the unit's assigned points.

---

## 4. Lesson kinds (how the app uses the data)

| kind | player composition |
|---|---|
| `vocab` | 6 word cards → 6 sentences (listen/pick/build) → word match |
| `grammar` | grammar card → fill-the-particle/ending → conjugation → tile build → say it |
| `listening` | audio-first: dictation ×2, listen-and-choose ×3, dialogue roleplay |
| `reading` | short passage → 3 comprehension questions → sentence mining |
| `checkpoint` | 12 mixed items across the unit, no hints, 3-star rating, unlocks the next unit |

The lesson builder samples from the unit's sentences/words; content should therefore give **variety within the unit**, not six near-identical sentences.

---

## 5. Quality bar

Write it as if a Korean teacher will read every line. Prefer 12 excellent sentences over 20 mediocre ones. If a pattern is hard to use naturally in A1, simplify the sentence rather than forcing the grammar.

Do not use these in the MVP content: slang, 반말, dialect, politics, romance, alcohol beyond 맥주/소주 in a food context, or anything requiring cultural explanation longer than one line.
