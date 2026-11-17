# 02 — Beginner Sentence Curriculum & Learning Engine

**Status:** MVP spec · **Owner:** Research Agent 2 · **Date:** 2026-11-16
**Scope:** 40 absolute-beginner sentences, 7 units, polite speech only. Every number in this document is meant to be implemented as written.

---

## 0. Scope guardrail (read this first)

The long-term target is B2. **This MVP is not allowed to touch it.** The MVP teaches exactly 40 sentences, and every one of them must be usable by someone who landed in Incheon this morning.

| In scope | Out of scope (v1.1+) |
|---|---|
| Polite speech: `-요` and `-ㅂ니다` | 반말 (casual speech), 하오체, archaic endings |
| Present, past, and `-(으)ㄹ 수 있어요` | Future `-(으)ㄹ 거예요`, `-겠-`, hearsay `-대요` |
| `안 / 못` negation | `-지 않다`, double negation, `-밖에 없다` |
| `은/는`, `이/가`, `을/를`, `에`, `에서`, `으로` | `-는데`, `-면서`, `-더라도`, relative clauses |
| 40 fixed sentences | Free composition, honorific speech levels beyond `-시-` |

**Hard rule for future contributors:** the sentence bank stays at 40 until v1.1 ships. To add a sentence, delete one. This is the single biggest defence against the project drifting into an intermediate textbook that nobody finishes.

---

## 1. Why 40 sentences is the right MVP

| Constraint | Consequence for design |
|---|---|
| 3-5 minute sessions | 14 items per session (max 20). Nothing longer competes with a phone notification. |
| Absolute beginners quit on ambiguity | No exercise may show a Korean sentence the learner has not already been shown once, with audio. |
| Typing Korean is a wall | No typing until Unit 3, and even then it is 15% of the session. |
| Motivation needs a finish line | 7 units, 3 boss rounds, one visible map. The whole course is a one-screen object. |

**Success metric for the MVP:** after 7 sessions (≈30 minutes total) the learner can produce **at least 25 of the 40 sentences from an English prompt** with ≥90% accuracy, and can *understand* all 40 when spoken at 0.85x.

### Why it feels fast (the four mechanisms)

1. **First win in under 30 seconds.** Session opens with two questions the learner already knows. No placement test, no theory screen.
2. **Every item is ≤20 seconds.** The longest exercise (type the Korean) has a visible 20s soft limit; at 0 it reveals the answer instead of punishing.
3. **Guaranteed win at the end.** The final item is always one the learner got right before, and the summary shows a number that went up.
4. **Progress is counted in sentences, not points.** "You can now say 12 things in Korean" beats "+340 XP".

---

## 2. Curriculum map

| # | Unit | Hook | Sentences | Grammar spine | Boss |
|---|---|---|---|---|---|
| 1 | **Greetings** | The 6 sentences that open every door | 6 | -아요 / -어요 / -해요, -ㅂ니다 / -습니다, 네 / 아니요 | — |
| 2 | **Introducing yourself** | Name, job, country, and one humble brag | 6 | 이에요 / 예요, 은 / 는, 을 / 를, -(으)ㄹ 수 있어요 | — |
| 3 | **Food & ordering** | Order it, price it, refuse the spice | 6 | 주세요, 얼마예요?, 안 / 못 | 카페 주문 (Café order) |
| 4 | **Daily routine** | Your day, in five verbs | 6 | Time + 에, -고, -았/었어요 | — |
| 5 | **Places & directions** | Never be lost for more than one sentence | 6 | 어디예요?, 있어요 / 없어요, -(으)로 | 지하철 대시 (Subway dash) |
| 6 | **Feelings & small talk** | Sound like a person, not a phrasebook | 6 | 좋아요 vs 좋아해요, 기분이 좋아요, 시간이 있어요? | — |
| 7 | **Wrap-up & boss round** | The four sentences that save a conversation | 4 | -아/어 주세요, 아직 잘 못해요, Past tense review | 첫 만남 (First meeting) |

### All 40 sentences at a glance

| # | id | Korean | English |
|---|---|---|---|
| 1 | `greet_hello` | 안녕하세요. | Hello. |
| 2 | `greet_thanks` | 감사합니다. | Thank you. |
| 3 | `greet_sorry` | 죄송합니다. | I'm sorry. |
| 4 | `greet_bye_leaving` | 안녕히 가세요. | Goodbye. (to someone who is leaving) |
| 5 | `greet_yes_right` | 네, 맞아요. | Yes, that's right. |
| 6 | `greet_fine_thanks` | 아니요, 괜찮아요. | No, I'm fine. / No, it's okay. |
| 7 | `intro_name` | 제 이름은 민수예요. | My name is Minsu. |
| 8 | `intro_student` | 저는 학생이에요. | I am a student. |
| 9 | `intro_american` | 저는 미국 사람이에요. | I am American. |
| 10 | `intro_study_korean` | 저는 한국어를 공부해요. | I study Korean. |
| 11 | `intro_nice_to_meet` | 만나서 반가워요. | Nice to meet you. |
| 12 | `intro_little_korean` | 한국어를 조금 할 수 있어요. | I can speak a little Korean. |
| 13 | `food_price` | 이거 얼마예요? | How much is this? |
| 14 | `food_order_stew` | 김치찌개 하나 주세요. | One kimchi stew, please. |
| 15 | `food_cant_eat_spicy` | 저는 매운 음식을 못 먹어요. | I can't eat spicy food. |
| 16 | `food_water` | 물 좀 주세요. | Some water, please. |
| 17 | `food_delicious` | 이거 맛있어요. | This is delicious. |
| 18 | `food_bill` | 계산서 주세요. | The bill, please. |
| 19 | `daily_wake` | 저는 아침 일곱 시에 일어나요. | I get up at 7 in the morning. |
| 20 | `daily_breakfast_school` | 아침을 먹고 학교에 가요. | I eat breakfast and go to school. |
| 21 | `daily_study_every_day` | 저는 매일 한국어를 공부해요. | I study Korean every day. |
| 22 | `daily_weather_nice` | 오늘은 날씨가 좋아요. | The weather is nice today. |
| 23 | `daily_yesterday_friend` | 어제는 친구를 만났어요. | Yesterday I met a friend. |
| 24 | `daily_sleep_late` | 저는 보통 열한 시에 자요. | I usually go to bed at 11. |
| 25 | `place_bathroom` | 화장실이 어디예요? | Where is the bathroom? |
| 26 | `place_go_left` | 왼쪽으로 가세요. | Please go to the left. |
| 27 | `place_close_here` | 여기에서 가까워요? | Is it close from here? |
| 28 | `place_station_over_there` | 지하철역은 저쪽에 있어요. | The subway station is over there. |
| 29 | `place_bus_to_cityhall` | 버스를 타고 시청에 가요. | I take the bus and go to City Hall. |
| 30 | `place_lost` | 길을 잃었어요. | I'm lost. |
| 31 | `feel_how_are_you` | 요즘 어떻게 지내세요? | How have you been lately? |
| 32 | `feel_busy_lately` | 저는 요즘 좀 바빠요. | I'm a bit busy these days. |
| 33 | `feel_good_today` | 오늘 기분이 좋아요. | I feel good today. |
| 34 | `feel_like_korean_food` | 저는 한국 음식을 좋아해요. | I like Korean food. |
| 35 | `feel_time_tomorrow` | 내일 시간이 있어요? | Do you have time tomorrow? |
| 36 | `feel_korean_is_fun` | 저는 한국어가 재미있어요. | Korean is fun to me. |
| 37 | `wrap_say_again` | 다시 한번 말씀해 주세요. | Please say that one more time. |
| 38 | `wrap_speak_slowly` | 천천히 말해 주세요. | Please speak slowly. |
| 39 | `wrap_not_good` | 저는 아직 잘 못해요. | I'm still not good at it. |
| 40 | `wrap_had_fun` | 오늘 정말 즐거웠어요. | I really had fun today. |

---

## 3. Unit-by-unit curriculum

Each sentence record below is the same object that appears in the JSON block in §11. Fields: `id`, `korean`, `romanization` (Revised Romanization), `english`, word-by-word gloss, literal reading, grammar tag, and 3 distractors.

### Unit 1 — Greetings

*The 6 sentences that open every door*

**Goal:** Say hello, thank you, sorry, goodbye, and answer yes/no without freezing.

**Grammar:** `-아요 / -어요 / -해요 (polite ending)` · `-ㅂ니다 / -습니다 (formal polite)` · `네 / 아니요`

| id | Korean | Romanization | English | Word-by-word | Grammar point | Distractors (wrong answers) |
|---|---|---|---|---|---|---|
| `greet_hello` | **안녕하세요.** | annyeonghaseyo | Hello. | 안녕 peace/well-being · 하세요 do/be (polite) | polite ending -세요 | Goodbye. / Thank you. / Excuse me. |
| `greet_thanks` | **감사합니다.** | gamsahamnida | Thank you. | 감사 thanks · 합니다 do (formal polite) | -ㅂ니다 formal polite | I'm sorry. / You're welcome. / Nice to meet you. |
| `greet_sorry` | **죄송합니다.** | joesonghamnida | I'm sorry. | 죄송 apology · 합니다 do (formal polite) | -ㅂ니다 formal polite | Thank you. / It's okay. / Goodbye. |
| `greet_bye_leaving` | **안녕히 가세요.** | annyeonghi gaseyo | Goodbye. (to someone who is leaving) | 안녕히 peacefully · 가세요 go (polite) | polite ending -세요 | Hello. / Goodbye. (to someone who is staying) / See you tomorrow. |
| `greet_yes_right` | **네, 맞아요.** | ne, majayo | Yes, that's right. | 네 yes · 맞아요 is correct (polite) | polite ending -아요/어요 | No, that's not right. / Yes, I'm sorry. / I don't know. |
| `greet_fine_thanks` | **아니요, 괜찮아요.** | aniyo, gwaenchanayo | No, I'm fine. / No, it's okay. | 아니요 no · 괜찮아요 is okay (polite) | polite ending -아요/어요 | Yes, I'm okay. / No, I'm not okay. / I'm sorry. |

| id | Literal reading |
|---|---|
| `greet_hello` | be at peace, please |
| `greet_thanks` | I do thanks |
| `greet_sorry` | I do apology |
| `greet_bye_leaving` | go peacefully |
| `greet_yes_right` | yes, it is correct |
| `greet_fine_thanks` | no, it is okay |

### Unit 2 — Introducing yourself

*Name, job, country, and one humble brag*

**Goal:** Give your name, nationality, and what you study, and say nice to meet you.

**Grammar:** `이에요 / 예요 (to be)` · `은 / 는 (topic marker)` · `을 / 를 (object marker)` · `-(으)ㄹ 수 있어요 (can)`

| id | Korean | Romanization | English | Word-by-word | Grammar point | Distractors (wrong answers) |
|---|---|---|---|---|---|---|
| `intro_name` | **제 이름은 민수예요.** | je ireumeun Minsuyeyo | My name is Minsu. | 제 my (humble) · 이름 name · 은 topic · 민수 Minsu · 예요 is | 이에요/예요 copula | Your name is Minsu. / My name is not Minsu. / Minsu studies Korean. |
| `intro_student` | **저는 학생이에요.** | jeoneun haksaengieyo | I am a student. | 저 I (humble) · 는 topic · 학생 student · 이에요 is | 이에요/예요 copula | I am a teacher. / I am not a student. / The student is here. |
| `intro_american` | **저는 미국 사람이에요.** | jeoneun miguk saramieyo | I am American. | 저 I (humble) · 는 topic · 미국 USA · 사람 person · 이에요 is | 이에요/예요 copula | I am Korean. / I live in America. / I am a student from America. |
| `intro_study_korean` | **저는 한국어를 공부해요.** | jeoneun hangugeoreul gongbuhaeyo | I study Korean. | 저 I (humble) · 는 topic · 한국어를 Korean + object · 공부해요 study (polite) | object marker 을/를 | I teach Korean. / I study English. / Korean is difficult. |
| `intro_nice_to_meet` | **만나서 반가워요.** | mannaseo bangawoyo | Nice to meet you. | 만나서 meet-and · 반가워요 am glad (polite) | -아/어서 connective | Nice to see you again. / Goodbye. / I'm glad it's over. |
| `intro_little_korean` | **한국어를 조금 할 수 있어요.** | hangugeoreul jogeum hal su isseoyo | I can speak a little Korean. | 한국어를 Korean + object · 조금 a little · 할 do (attributive) · 수 way / ability · 있어요 there is | -ㄹ 수 있어요 ability | I can't speak Korean. / I speak Korean very well. / I am learning Korean. |

| id | Literal reading |
|---|---|
| `intro_name` | as for me, name is Minsu |
| `intro_student` | as for me, [I] am a student |
| `intro_american` | as for me, [I] am an American person |
| `intro_study_korean` | as for me, [I] study the Korean language |
| `intro_nice_to_meet` | having met [you], I am glad |
| `intro_little_korean` | as for Korean, a little, the way to do exists |

### Unit 3 — Food & ordering

*Order it, price it, refuse the spice*

**Goal:** Order one dish, ask the price, ask for water and the bill, state what you can't eat.

**Grammar:** `주세요 (please give)` · `얼마예요? (how much)` · `안 / 못 (don't / can't)`

| id | Korean | Romanization | English | Word-by-word | Grammar point | Distractors (wrong answers) |
|---|---|---|---|---|---|---|
| `food_price` | **이거 얼마예요?** | igeo eolmayeyo | How much is this? | 이거 this thing · 얼마 how much · 예요 is | 얼마예요 price | Where is this? / How many are there? / What is this? |
| `food_order_stew` | **김치찌개 하나 주세요.** | kimchijjigae hana juseyo | One kimchi stew, please. | 김치찌개 kimchi stew · 하나 one · 주세요 please give | 주세요 request | Two kimchi stews, please. / The bill, please. / Is the kimchi spicy? |
| `food_cant_eat_spicy` | **저는 매운 음식을 못 먹어요.** | jeoneun maeun eumsigeul mot meogeoyo | I can't eat spicy food. | 저 I (humble) · 는 topic · 매운 spicy · 음식을 food + object · 못 cannot · 먹어요 eat (polite) | negation 안/못 | I don't like spicy food. / I can eat spicy food. / The food is too spicy. |
| `food_water` | **물 좀 주세요.** | mul jom juseyo | Some water, please. | 물 water · 좀 a little / please · 주세요 please give | 주세요 request | Some coffee, please. / No water, thank you. / Where is the water? |
| `food_delicious` | **이거 맛있어요.** | igeo masisseoyo | This is delicious. | 이거 this thing · 맛있어요 is delicious (polite) | polite ending -아요/어요 | This is expensive. / This is not delicious. / This is too spicy. |
| `food_bill` | **계산서 주세요.** | gyesanseo juseyo | The bill, please. | 계산서 bill / check · 주세요 please give | 주세요 request | The menu, please. / Water, please. / Where is the bathroom? |

| id | Literal reading |
|---|---|
| `food_price` | this thing, is how much? |
| `food_order_stew` | kimchi stew one, please give |
| `food_cant_eat_spicy` | as for me, spicy food cannot eat |
| `food_water` | water a little, please give |
| `food_delicious` | this thing is delicious |
| `food_bill` | bill, please give |

> **Checkpoint at the end of this unit:** 카페 주문 (Café order) — You order lunch in a Seoul café and the barista actually understands you.

### Unit 4 — Daily routine

*Your day, in five verbs*

**Goal:** Say when you wake up, eat, study, go, and sleep, and describe yesterday.

**Grammar:** `Time + 에` · `-고 (and then)` · `-았/었어요 (past tense)`

| id | Korean | Romanization | English | Word-by-word | Grammar point | Distractors (wrong answers) |
|---|---|---|---|---|---|---|
| `daily_wake` | **저는 아침 일곱 시에 일어나요.** | jeoneun achim ilgop sie ireonayo | I get up at 7 in the morning. | 저 I (humble) · 는 topic · 아침 morning · 일곱 seven · 시에 at o'clock · 일어나요 get up (polite) | time particle 에 | I go to bed at 7. / I get up at 11. / I eat breakfast at 7. |
| `daily_breakfast_school` | **아침을 먹고 학교에 가요.** | achimeul meokgo hakgyoe gayo | I eat breakfast and go to school. | 아침을 breakfast + object · 먹고 eat-and · 학교에 to school · 가요 go (polite) | -고 connective | I go to school and eat breakfast. / I eat lunch at school. / I don't eat breakfast. |
| `daily_study_every_day` | **저는 매일 한국어를 공부해요.** | jeoneun maeil hangugeoreul gongbuhaeyo | I study Korean every day. | 저 I (humble) · 는 topic · 매일 every day · 한국어를 Korean + object · 공부해요 study (polite) | object marker 을/를 | I study Korean on Mondays. / I studied Korean every day. / I teach Korean every day. |
| `daily_weather_nice` | **오늘은 날씨가 좋아요.** | oneureun nalssiga joayo | The weather is nice today. | 오늘은 today + topic · 날씨가 weather + subject · 좋아요 is good (polite) | 은/는 vs 이/가 | The weather was nice today. / The weather is bad today. / It's cold today. |
| `daily_yesterday_friend` | **어제는 친구를 만났어요.** | eojeneun chingureul mannasseoyo | Yesterday I met a friend. | 어제는 yesterday + topic · 친구를 friend + object · 만났어요 met (past, polite) | past tense -았/었어요 | I meet a friend today. / I met my teacher yesterday. / Yesterday I didn't meet anyone. |
| `daily_sleep_late` | **저는 보통 열한 시에 자요.** | jeoneun botong yeolhan sie jayo | I usually go to bed at 11. | 저 I (humble) · 는 topic · 보통 usually · 열한 eleven · 시에 at o'clock · 자요 sleep (polite) | time particle 에 | I usually wake up at 11. / I sleep at 7. / I usually work at 11. |

| id | Literal reading |
|---|---|
| `daily_wake` | as for me, morning seven at-the-hour, get up |
| `daily_breakfast_school` | breakfast eat-and, to school go |
| `daily_study_every_day` | as for me, every day Korean study |
| `daily_weather_nice` | today, the weather is good |
| `daily_yesterday_friend` | yesterday, [I] a friend met |
| `daily_sleep_late` | as for me, usually eleven at-the-hour, sleep |

### Unit 5 — Places & directions

*Never be lost for more than one sentence*

**Goal:** Ask where something is, understand left/right/near, say you are lost.

**Grammar:** `어디예요? (where is it?)` · `있어요 / 없어요 (there is / isn't)` · `-(으)로 (toward)`

| id | Korean | Romanization | English | Word-by-word | Grammar point | Distractors (wrong answers) |
|---|---|---|---|---|---|---|
| `place_bathroom` | **화장실이 어디예요?** | hwajangsiri eodiyeyo | Where is the bathroom? | 화장실이 bathroom + subject · 어디 where · 예요 is | 어디예요 location question | Where is the subway station? / Is the bathroom here? / The bathroom is over there. |
| `place_go_left` | **왼쪽으로 가세요.** | oenjjogeuro gaseyo | Please go to the left. | 왼쪽으로 to the left · 가세요 go (polite) | direction -(으)로 | Please go to the right. / Please come here. / Please stop. |
| `place_close_here` | **여기에서 가까워요?** | yeogieseo gakkawayo | Is it close from here? | 여기에서 from here · 가까워요 is near (polite) | polite ending -아요/어요 | Is it far from here? / Is it open now? / Where is here? |
| `place_station_over_there` | **지하철역은 저쪽에 있어요.** | jihacheollyeogeun jeojjoge isseoyo | The subway station is over there. | 지하철역은 subway station + topic · 저쪽에 at that side · 있어요 there is (polite) | 있어요/없어요 existence | The subway station is far away. / The bus stop is over there. / Where is the subway station? |
| `place_bus_to_cityhall` | **버스를 타고 시청에 가요.** | beoseureul tago sicheonge gayo | I take the bus and go to City Hall. | 버스를 bus + object · 타고 ride-and · 시청에 to City Hall · 가요 go (polite) | -고 connective | I walk to City Hall. / I take the subway to City Hall. / I take the bus to the bathroom. |
| `place_lost` | **길을 잃었어요.** | gireul irheosseoyo | I'm lost. | 길을 road + object · 잃었어요 lost (past, polite) | past tense -았/었어요 | I lost my phone. / I'm late. / I found the road. |

| id | Literal reading |
|---|---|
| `place_bathroom` | the bathroom is where? |
| `place_go_left` | to the left, please go |
| `place_close_here` | from here, is it near? |
| `place_station_over_there` | the subway station, at that side exists |
| `place_bus_to_cityhall` | bus ride-and, to City Hall go |
| `place_lost` | I lost the road |

> **Checkpoint at the end of this unit:** 지하철 대시 (Subway dash) — You have 90 seconds to reach City Hall using only Korean directions.

### Unit 6 — Feelings & small talk

*Sound like a person, not a phrasebook*

**Goal:** Ask how someone is, say you're busy/good/tired, say what you like, offer tomorrow.

**Grammar:** `좋아요 vs 좋아해요` · `기분이 좋아요 (I feel good)` · `시간이 있어요? (have time?)`

| id | Korean | Romanization | English | Word-by-word | Grammar point | Distractors (wrong answers) |
|---|---|---|---|---|---|---|
| `feel_how_are_you` | **요즘 어떻게 지내세요?** | yojeum eotteoke jinaeseyo | How have you been lately? | 요즘 these days · 어떻게 how · 지내세요 get along / spend time (honorific) | honorific -시- | What are you doing now? / How do I get there? / How old are you? |
| `feel_busy_lately` | **저는 요즘 좀 바빠요.** | jeoneun yojeum jom bappayo | I'm a bit busy these days. | 저 I (humble) · 는 topic · 요즘 these days · 좀 a bit · 바빠요 am busy (polite) | polite ending -아요/어요 | I'm not busy these days. / I was busy yesterday. / I'm a little tired these days. |
| `feel_good_today` | **오늘 기분이 좋아요.** | oneul gibuni joayo | I feel good today. | 오늘 today · 기분이 mood + subject · 좋아요 is good (polite) | 기분이 좋아요 feeling | I feel bad today. / The weather is good today. / I was happy yesterday. |
| `feel_like_korean_food` | **저는 한국 음식을 좋아해요.** | jeoneun hanguk eumsigeul joahaeyo | I like Korean food. | 저 I (humble) · 는 topic · 한국 Korea · 음식을 food + object · 좋아해요 like (polite) | 좋아요 vs 좋아해요 | I don't like Korean food. / I like Korean music. / Korean food is delicious. |
| `feel_time_tomorrow` | **내일 시간이 있어요?** | naeil sigani isseoyo | Do you have time tomorrow? | 내일 tomorrow · 시간이 time + subject · 있어요 exists (polite) | 시간이 있어요 possession | Do you have time today? / I don't have time tomorrow. / What time is it tomorrow? |
| `feel_korean_is_fun` | **저는 한국어가 재미있어요.** | jeoneun hangugeoga jaemiisseoyo | Korean is fun to me. | 저 I (humble) · 는 topic · 한국어가 Korean + subject · 재미있어요 is fun (polite) | 은/는 vs 이/가 | Korean is difficult for me. / I am fun. / Korean is not fun. |

| id | Literal reading |
|---|---|
| `feel_how_are_you` | these days, how do you spend [your time]? |
| `feel_busy_lately` | as for me, these days a bit busy |
| `feel_good_today` | today, the mood is good |
| `feel_like_korean_food` | as for me, Korean food I like |
| `feel_time_tomorrow` | tomorrow, does time exist? |
| `feel_korean_is_fun` | as for me, Korean is fun |

### Unit 7 — Wrap-up & boss round

*The four sentences that save a conversation*

**Goal:** Ask someone to repeat or slow down, admit you're still learning, close warmly.

**Grammar:** `-아/어 주세요 (do it for me)` · `아직 잘 못해요 (still not good)` · `Past tense review (-았/었어요)`

| id | Korean | Romanization | English | Word-by-word | Grammar point | Distractors (wrong answers) |
|---|---|---|---|---|---|---|
| `wrap_say_again` | **다시 한번 말씀해 주세요.** | dasi hanbeon malsseumhae juseyo | Please say that one more time. | 다시 again · 한번 one time · 말씀해 speak (honorific) · 주세요 please do for me | -아/어 주세요 request | Please speak more loudly. / Please write it down. / Please say it in English. |
| `wrap_speak_slowly` | **천천히 말해 주세요.** | cheoncheonhi malhae juseyo | Please speak slowly. | 천천히 slowly · 말해 speak · 주세요 please do for me | -아/어 주세요 request | Please speak faster. / Please listen carefully. / Please say it again. |
| `wrap_not_good` | **저는 아직 잘 못해요.** | jeoneun ajik jal mothaeyo | I'm still not good at it. | 저 I (humble) · 는 topic · 아직 still / yet · 잘 well · 못해요 cannot do (polite) | 아직 + 잘 못해요 | I'm good at it now. / I don't like it. / I'm still learning. |
| `wrap_had_fun` | **오늘 정말 즐거웠어요.** | oneul jeongmal jeulgeowosseoyo | I really had fun today. | 오늘 today · 정말 really · 즐거웠어요 was enjoyable (past, polite) | past tense review | Today was boring. / I had fun yesterday. / Today I was very busy. |

| id | Literal reading |
|---|---|
| `wrap_say_again` | again one time, speak, please do for me |
| `wrap_speak_slowly` | slowly, speak, please do for me |
| `wrap_not_good` | as for me, still, well, cannot do |
| `wrap_had_fun` | today, really, it was enjoyable |

> **Checkpoint at the end of this unit:** 첫 만남 (First meeting) — A 6-turn chat with a Korean peer that ends with you saying '오늘 정말 즐거웠어요'.

---

## 4. The grammar spine

Each unit teaches **3 core points maximum**. A point is only introduced if at least one of the unit's sentences needs it *that day* - with one deliberate exception: `있어요 / 없어요` is taught as a pair, because a beginner needs to hear "there isn't" as early as "there is". Explanations are capped at one line so they fit in a 3-second feedback chip.

### Unit 1 — Greetings

| Tier | Point | Plain-English explanation (3 seconds) | Example |
|---|---|---|---|
| core | `-아요 / -어요 / -해요 (polite ending)` | Add -요 to a verb and you're automatically polite to strangers. | 안녕하세요. |
| core | `-ㅂ니다 / -습니다 (formal polite)` | The 'news anchor' ending: extra polite, used for thanks and apologies. | 감사합니다. |
| core | `네 / 아니요` | 네 means yes and also 'I hear you'; 아니요 means no. | 네, 맞아요. |

### Unit 2 — Introducing yourself

| Tier | Point | Plain-English explanation (3 seconds) | Example |
|---|---|---|---|
| core | `이에요 / 예요 (to be)` | Vowel before it gets 예요, consonant gets 이에요: 민수예요, 학생이에요. | 제 이름은 민수예요. |
| core | `은 / 는 (topic marker)` | 은/는 means 'as for...' and puts the spotlight on that word. | 저는 학생이에요. |
| core | `을 / 를 (object marker)` | Stick 을/를 on the thing being acted on: 한국어를 공부해요. | 저는 한국어를 공부해요. |
| bonus | `-(으)ㄹ 수 있어요 (can)` | Literally 'the way exists': 할 수 있어요 = I can do it. | 한국어를 조금 할 수 있어요. |

### Unit 3 — Food & ordering

| Tier | Point | Plain-English explanation (3 seconds) | Example |
|---|---|---|---|
| core | `주세요 (please give)` | Put 주세요 after a thing and you're politely asking for it. | 물 좀 주세요. |
| core | `얼마예요? (how much)` | 얼마 = how much; add 예요 and point at anything. | 이거 얼마예요? |
| core | `안 / 못 (don't / can't)` | 안 = won't do it; 못 = can't, physically unable. | 저는 매운 음식을 못 먹어요. |

### Unit 4 — Daily routine

| Tier | Point | Plain-English explanation (3 seconds) | Example |
|---|---|---|---|
| core | `Time + 에` | Put 에 after a time: 일곱 시에 = at seven o'clock. | 저는 아침 일곱 시에 일어나요. |
| core | `-고 (and then)` | Glue -고 onto a verb to chain 'do A, and then B'. | 아침을 먹고 학교에 가요. |
| core | `-았/었어요 (past tense)` | Add -았/었어요 and it already happened: 만났어요 = met. | 어제는 친구를 만났어요. |

### Unit 5 — Places & directions

| Tier | Point | Plain-English explanation (3 seconds) | Example |
|---|---|---|---|
| core | `어디예요? (where is it?)` | Noun + 이/가 어디예요 = where is [noun]? | 화장실이 어디예요? |
| core | `있어요 / 없어요 (there is / isn't)` | 있어요 = it exists or you have it; 없어요 = no such thing. | 지하철역은 저쪽에 있어요. |
| core | `-(으)로 (toward)` | 왼쪽으로 = to the left; -(으)로 points the direction. | 왼쪽으로 가세요. |

### Unit 6 — Feelings & small talk

| Tier | Point | Plain-English explanation (3 seconds) | Example |
|---|---|---|---|
| core | `좋아요 vs 좋아해요` | 좋아요 = 'it's good'; 좋아해요 = 'I like it'. Different jobs, same word root. | 저는 한국 음식을 좋아해요. |
| core | `기분이 좋아요 (I feel good)` | Korean says 'the mood is good', not 'I am good'. | 오늘 기분이 좋아요. |
| core | `시간이 있어요? (have time?)` | Korean says 'time exists' instead of 'I have time'. | 내일 시간이 있어요? |

### Unit 7 — Wrap-up & boss round

| Tier | Point | Plain-English explanation (3 seconds) | Example |
|---|---|---|---|
| core | `-아/어 주세요 (do it for me)` | Add -주세요 to a verb to ask someone to do it on your behalf. | 천천히 말해 주세요. |
| core | `아직 잘 못해요 (still not good)` | The beginner's shield: 'I still can't do it well.' | 저는 아직 잘 못해요. |
| core | `Past tense review (-았/었어요)` | Same past ending, now on an adjective: 즐거웠어요 = it was fun. | 오늘 정말 즐거웠어요. |

**Teaching note:** the spine is deliberately shallow. A beginner does not need the full particle system; they need three particles (`은/는`, `이/가`, `을/를`) and the confidence to guess the fourth. Anything deeper belongs in the reference drawer, not the lesson.

---

## 5. Vocabulary

**75 words** are surfaced by the 40 sentences. **38** of them get dedicated word cards in the MVP; the rest are recognised in context only and graduate to cards in v1.1 once the learner's review load is stable.

A word earns a card if it is (a) high-frequency in tourist Korean, (b) not guessable from English, and (c) reusable in a sentence the learner already knows. Adverbs that only decorate (`정말`, `매일`) are deliberately not carded - they get learned by sentence repetition.

| id | Korean | Romanization | English | POS | Unit | Word card |
|---|---|---|---|---|---|---|
| `w_annyeong` | 안녕 | annyeong | peace / well-being (hi) | interj | 1 | ★ |
| `w_gamsa` | 감사 | gamsa | thanks | noun | 1 | ★ |
| `w_joesong` | 죄송 | joesong | apology | noun | 1 |  |
| `w_ne` | 네 | ne | yes (also: I hear you) | interj | 1 | ★ |
| `w_aniyo` | 아니요 | aniyo | no | interj | 1 | ★ |
| `w_gwaenchanta` | 괜찮다 | gwaenchanta | to be okay / fine | adj | 1 | ★ |
| `w_jeo` | 저 | jeo | I / me (humble) | pron | 2 | ★ |
| `w_ireum` | 이름 | ireum | name | noun | 2 | ★ |
| `w_haksaeng` | 학생 | haksaeng | student | noun | 2 | ★ |
| `w_saram` | 사람 | saram | person | noun | 2 |  |
| `w_miguk` | 미국 | miguk | the USA | noun | 2 |  |
| `w_hangugeo` | 한국어 | hangugeo | Korean (language) | noun | 2 | ★ |
| `w_gongbuhada` | 공부하다 | gongbuhada | to study | verb | 2 | ★ |
| `w_jogeum` | 조금 | jogeum | a little | adv | 2 |  |
| `w_bangapda` | 반갑다 | bangapda | to be glad to meet | adj | 2 |  |
| `w_igeo` | 이거 | igeo | this thing | pron | 3 | ★ |
| `w_eolma` | 얼마 | eolma | how much | pron | 3 | ★ |
| `w_gimchijjigae` | 김치찌개 | kimchijjigae | kimchi stew | noun | 3 |  |
| `w_hana` | 하나 | hana | one (native number) | num | 3 |  |
| `w_mul` | 물 | mul | water | noun | 3 | ★ |
| `w_masitda` | 맛있다 | masitda | to be delicious | adj | 3 | ★ |
| `w_juseyo` | 주세요 | juseyo | please give (me) | chunk | 3 | ★ |
| `w_gyesanseo` | 계산서 | gyesanseo | bill / check | noun | 3 | ★ |
| `w_maeun` | 매운 | maeun | spicy | adj | 3 |  |
| `w_eumsik` | 음식 | eumsik | food | noun | 3 | ★ |
| `w_jom` | 좀 | jom | a little / please | adv | 3 |  |
| `w_achim` | 아침 | achim | morning / breakfast | noun | 4 | ★ |
| `w_ilgop` | 일곱 | ilgop | seven (native number) | num | 4 |  |
| `w_si` | 시 | si | o'clock | counter | 4 | ★ |
| `w_ireonada` | 일어나다 | ireonada | to get up | verb | 4 |  |
| `w_meokda` | 먹다 | meokda | to eat | verb | 4 | ★ |
| `w_hakgyo` | 학교 | hakgyo | school | noun | 4 | ★ |
| `w_gada` | 가다 | gada | to go | verb | 4 | ★ |
| `w_maeil` | 매일 | maeil | every day | adv | 4 |  |
| `w_oneul` | 오늘 | oneul | today | noun | 4 | ★ |
| `w_nalssi` | 날씨 | nalssi | weather | noun | 4 |  |
| `w_jota` | 좋다 | jota | to be good | adj | 4 | ★ |
| `w_eoje` | 어제 | eoje | yesterday | noun | 4 | ★ |
| `w_chingu` | 친구 | chingu | friend | noun | 4 | ★ |
| `w_mannada` | 만나다 | mannada | to meet | verb | 4 |  |
| `w_botong` | 보통 | botong | usually | adv | 4 |  |
| `w_yeolhana` | 열한 | yeolhan | eleven (native number) | num | 4 |  |
| `w_jada` | 자다 | jada | to sleep | verb | 4 | ★ |
| `w_hwajangsil` | 화장실 | hwajangsil | bathroom | noun | 5 | ★ |
| `w_eodi` | 어디 | eodi | where | pron | 5 | ★ |
| `w_oenjjok` | 왼쪽 | oenjjok | left side | noun | 5 |  |
| `w_gakkapda` | 가깝다 | gakkapda | to be near | adj | 5 |  |
| `w_jihacheollyeok` | 지하철역 | jihacheollyeok | subway station | noun | 5 |  |
| `w_jeojjok` | 저쪽 | jeojjok | that side / over there | noun | 5 |  |
| `w_beoseu` | 버스 | beoseu | bus | noun | 5 |  |
| `w_tada` | 타다 | tada | to ride / take | verb | 5 |  |
| `w_sicheong` | 시청 | sicheong | city hall | noun | 5 |  |
| `w_gil` | 길 | gil | road / way | noun | 5 |  |
| `w_irta` | 잃다 | irta | to lose | verb | 5 |  |
| `w_isseoyo` | 있어요 | isseoyo | there is / I have | chunk | 5 | ★ |
| `w_yojeum` | 요즘 | yojeum | these days / lately | adv | 6 | ★ |
| `w_eotteoke` | 어떻게 | eotteoke | how | adv | 6 |  |
| `w_jinaeda` | 지내다 | jinaeda | to get along / spend time | verb | 6 |  |
| `w_bappeuda` | 바쁘다 | bappeuda | to be busy | adj | 6 | ★ |
| `w_gibun` | 기분 | gibun | mood / feeling | noun | 6 | ★ |
| `w_naeil` | 내일 | naeil | tomorrow | noun | 6 |  |
| `w_sigan` | 시간 | sigan | time | noun | 6 | ★ |
| `w_jaemiitda` | 재미있다 | jaemiitda | to be fun / interesting | adj | 6 |  |
| `w_joahada` | 좋아하다 | joahada | to like | verb | 6 |  |
| `w_hanguk` | 한국 | hanguk | Korea | noun | 6 |  |
| `w_dasi` | 다시 | dasi | again | adv | 7 | ★ |
| `w_hanbeon` | 한번 | hanbeon | one time | adv | 7 |  |
| `w_malsseumhada` | 말씀하다 | malsseumhada | to speak (honorific) | verb | 7 |  |
| `w_malhada` | 말하다 | malhada | to speak / say | verb | 7 |  |
| `w_cheoncheonhi` | 천천히 | cheoncheonhi | slowly | adv | 7 | ★ |
| `w_ajik` | 아직 | ajik | still / yet | adv | 7 | ★ |
| `w_jal` | 잘 | jal | well | adv | 7 |  |
| `w_mot` | 못 | mot | cannot | adv | 7 | ★ |
| `w_jeulgeopda` | 즐겁다 | jeulgeopda | to be enjoyable / fun | adj | 7 |  |
| `w_jeongmal` | 정말 | jeongmal | really | adv | 7 |  |

### Word card design (30-second card)

| Side | Content |
|---|---|
| Front | Korean word, large. Audio auto-plays once. Romanization hidden unless the global toggle is on. |
| Tap | Reveals English + the one sentence from the curriculum where the word appears (with that word highlighted). |
| Grade | 4 buttons: again / hard / good / easy, mapped to the same scheduler as sentences. |
| Rule | A word card never appears before the learner has met the word inside its sentence. Words are anchors to sentences, not a separate deck. |

---

## 6. Exercise engine

Ranked by **retention value for whole sentences** (not by how fun they are to build). The ranking drives the session shares in the last column: the exercises that produce the most durable memory get the most repetitions.

| Rank | Exercise | Primary skill | Retention | Time/item | Session share |
|---|---|---|---|---|---|
| 1 | **Build the sentence** | syntax + active production | 5/5 | 18s | 30% |
| 2 | **Type the Korean** | free recall + spelling | 5/5 | 20s | 15% |
| 3 | **Listen & choose the meaning** | listening comprehension | 4/5 | 10s | 20% |
| 4 | **Translate this (word bank)** | cued production | 4/5 | 16s | 10% |
| 5 | **Speak it (self-assess)** | pronunciation + fluency | 3/5 | 12s | 10% |
| 6 | **Fill the particle** | grammar precision | 3/5 | 8s | 5% |
| 7 | **Minimal-pair listening** | sound discrimination | 2/5 | 8s | 5% |
| 8 | **Matching pairs** | fast recognition | 2/5 | 12s | 5% |

Why this order: **production beats recognition** for retention, and *constrained* production beats free production for completion rate. Building a sentence from tiles forces syntax without the Korean-IME wall, which is why it is #1 and typing is #2 despite testing the same thing.

### 1. Build the sentence

**Tests:** syntax + active production · **18s per item** · **30% of a session**

- **Screen:** English prompt + speaker button on top, an empty slot row, and a tray of Korean word tiles (particles attached to nouns).
- **Counts as correct:** Tile order equals korean (or an accepted alt_order / particle-drop variant).
- **Typos:** Not possible - tiles are tapped, not typed. This is why it has the highest completion rate of any production exercise.
- **Feedback:** Wrong: lock the correct prefix in green, return the rest to the tray, one retry. Second failure: assemble the answer, play it at 0.7x, show a one-line reason tied to grammar_tag.
- **Korean gotcha:** Korean puts the verb LAST. English speakers drop it third. Time and place may float; the verb may not.

### 2. Type the Korean

**Tests:** free recall + spelling · **20s per item** · **15% of a session**

- **Screen:** English + speaker + a single text field with the Korean IME expected. On mobile, a jamo strip (ㄱ ㄴ ㄷ ...) sits above the keyboard.
- **Counts as correct:** NFC-normalized, whitespace and punctuation stripped, the input equals korean or an accepted alt_order.
- **Typos:** Levenshtein on syllables AFTER normalization: distance 0 = correct (Good); distance 1 = 'almost', accepted with a syllable diff and graded Hard; distance >= 2 = incorrect, answer revealed after a second try. Particle-only slips (을/를, 은/는, 에/에서) are never treated as typos - they are graded Hard and get the particle rule card.
- **Feedback:** Character-level diff; wrong syllables in amber, never red. Audio replays automatically once. A 'why' chip opens the 6-word grammar rule.
- **Korean gotcha:** Final consonants change which particle you need. Typing the right word with the wrong particle is a grammar error, not a typo.

### 3. Listen & choose the meaning

**Tests:** listening comprehension · **10s per item** · **20% of a session**

- **Screen:** One large speaker button (auto-plays once on mount), 4 English options, romanization hidden until answered.
- **Counts as correct:** Exactly one option matches the sentence's english meaning.
- **Typos:** Not applicable.
- **Feedback:** Correct: Korean + gloss appear, sentence replays. Wrong: the chosen option reveals which word fooled you ('you picked yesterday - 어제 is yesterday; this one was 오늘, today').
- **Korean gotcha:** Distractors are built from the sentence's own traps: flipped negation, flipped tense, swapped subject, or a near-synonym verb.

### 4. Translate this (word bank)

**Tests:** cued production · **16s per item** · **10% of a session**

- **Screen:** English prompt, no slot row, 6-8 tiles including 2 decoys drawn from the same unit.
- **Counts as correct:** Assembled tokens equal the target (any accepted order) and no decoy is used.
- **Typos:** Not applicable. A used decoy gets specific feedback ('못 = cannot, not don't').
- **Feedback:** On success, animate the alignment between English chunks and Korean tokens so the mapping is visible, then play audio once.
- **Korean gotcha:** Decoys are always grammar-adjacent (안 vs 못, 은 vs 가), never random noise.

### 5. Speak it (self-assess)

**Tests:** pronunciation + fluency · **12s per item** · **10% of a session**

- **Screen:** Sentence + speaker + a large mic button. Recording is optional and never uploaded.
- **Counts as correct:** Path A (SpeechRecognition ko-KR available): transcript compared to target, <40% syllable match = 'try again' with no penalty, >=40% = 'sounds close' then self-rate. Path B (no recognition): say it out loud, reveal, self-rate Again/Hard/Good.
- **Typos:** Pronunciation is never graded 'wrong' in the MVP. Speech recognition is noisy on purpose - the app only nudges.
- **Feedback:** Syllable-by-syllable highlight synced to the audio, plus one targeted tip from the pronunciation trap list when the transcript shows a known collapse (감사합니다 -> '감사함니다').
- **Korean gotcha:** Self-assessment is a real SRS signal: users who self-rate 'again' genuinely need the item sooner. Do not silently override it.

### 6. Fill the particle

**Tests:** grammar precision · **8s per item** · **5% of a session**

- **Screen:** Sentence with one blank, 3 particle chips (correct + 2 from the same family).
- **Counts as correct:** The single correct particle.
- **Typos:** Not applicable.
- **Feedback:** On wrong, highlight the noun's final letter and the rule ('학생 ends in a consonant -> 은 / 이에요'). Rule text is capped at 8 words.
- **Korean gotcha:** This is the exercise that fixes the Korean-only problem: you must look at the LAST letter of the noun, not the word's meaning.

### 7. Minimal-pair listening

**Tests:** sound discrimination · **8s per item** · **5% of a session**

- **Screen:** Two speaker buttons, A and B, no text. Prompt: 'Which did you hear?'
- **Counts as correct:** The clip that was actually played.
- **Typos:** Not applicable.
- **Feedback:** Reveal both at 0.55x with the differing syllable bolded, then play the target sentence in context once.
- **Korean gotcha:** Only use pairs that the 40 sentences actually contain: 물/불, 살/쌀, 시청/시정, 잃었어요/이렀어요. No invented pairs.

### 8. Matching pairs

**Tests:** fast recognition · **12s per item** · **5% of a session**

- **Screen:** 5 Korean tiles on the left, 5 English on the right, both shuffled. Tap to match.
- **Counts as correct:** All 5 pairs matched. Errors are tracked for the session summary but do not move SRS intervals.
- **Typos:** Not applicable.
- **Feedback:** Wrong pair shakes and stays. On solve, one audio pass over all five in order.
- **Korean gotcha:** Best as a warm-up or a boss-round breather. Never used to introduce a new sentence.

### How an exercise result becomes an SRS grade

The exercise layer never invents its own scheduling. It maps every outcome onto one of four grades:

| Outcome | Grade |
|---|---|
| Wrong twice, or "show me the answer" | again |
| Wrong once, then right | hard |
| Right first try but used ≥3 replays or a hint | hard |
| Right first try, no hint | good |
| Right in <6s, no hint, item already has interval ≥3d | easy |
| Speak-it self-rated "again" | again (self-report always wins) |
| Matching pairs / boss rounds | not graded (session stats only) |

---

## 7. Spaced repetition (SM-2-lite)

**Algorithm:** `sm2_lite` — a four-grade SM-2 variant with a 10-minute relearning step.

**Why not FSRS:** FSRS needs thousands of review logs and per-user parameter fitting to beat SM-2. At 40 items and 3-5 minute sessions, SM-2-lite captures most of the benefit in ~30 lines of code. Swap to FSRS in v1.1 once there is review history.

### Item state

```
item = { id, reps, lapses, ease, interval_days, due_at, last_reviewed_at, last_grade, mode }
mode = new | learning | review | leech
```

### Constants

| Constant | Value |
|---|---|
| ease_start | 2.5 |
| ease_min | 1.3 |
| ease_max | 3.0 |
| graduating_interval_days | 1 |
| easy_interval_days | 3 |
| relearn_minutes | 10 |
| max_interval_days | 180 |
| fuzz_pct | 5 |
| day_cutoff_local | 04:00 |
| leech_lapses | 4 |
| leech_max_interval_days | 2 |

### Grade table

| Grade | ease Δ | New / learning item (reps 0) | reps 1 | reps ≥ 2 | Comes back this session? |
|---|---|---|---|---|---|
| **again** | −0.20 | 10 min, stays learning | 10 min, reps→0, lapses+1 | 10 min, reps→0, lapses+1 | yes, after 4 items (max 2×) |
| **hard** | −0.15 | 1 day | max(1, round(interval×1.2)) d | round(interval×1.2) d | no |
| **good** | 0 | 1 day | 3 days | round(interval×ease) d | no |
| **easy** | +0.15 | 3 days | 4 days | round(interval×ease×1.3) d | no |

Then: `interval = round(interval × random(0.95, 1.05))`, clamp to **[1, 180] days**, ease clamped to **[1.3, 3.0]**.

**Due time rule:** intervals under a day are due at `now + 10 min`. Day-or-longer intervals are due at **04:00 local** on the target day, so a day's reviews batch at the daily reset instead of scattering across the clock.

### Worked example (one sentence, 7 reviews)

| Review | State | Grade | Ease | Interval | Next due |
|---|---|---|---|---|---|
| 1 | new | good | 2.50 | 1 d | day 1 |
| 2 |  | good | 2.50 | 3 d | day 4 |
| 3 |  | good | 2.50 | 8 d | day 12 |
| 4 |  | hard | 2.35 | 10 d | day 22 |
| 5 |  | good | 2.35 | 24 d | day 46 |
| 6 |  | again | 2.15 | 10 min | same day, +4 items |
| 7 | relearning | good | 2.15 | 1 d | day 47 |

The drop from 24 days to 1 day after a lapse is aggressive by design: a sentence you failed cold has decayed, and pretending otherwise inflates the review queue. It is also cheap here - the whole course is 40 items, so a full re-walk takes 10 minutes.

### Leech handling

After **4 lapses**, an item becomes a `leech`: interval capped at 2 days, rendered as a *trouble card* (sentence + literal + audio + one minimal pair), and it must be answered `good` twice in a row to leave leech. Without this, one cursed sentence eats an entire session forever.

### Mastery

`interval_days >= 21 AND reps >= 4` → "mastered" badge. Mastered items still appear, just rarely. The badge is the only place the app says the word *mastered* - never on a single correct answer.

### Reconciliation with `01-addiction-engine.md` (the 5-tier ladder)

That document specifies a tier ladder (4h → 1d → 3d → 7d → 21d, +1 tier per correct answer). Treat it as the **display layer**, not a second scheduler: the tier is a bucket of the interval this scheduler already computed. One source of truth for `due_at`, five visible stars on top.

| Tier | Interval bucket | Meaning on screen |
|---|---|---|
| 1 | < 1 day (learning) | "Just met" |
| 2 | 1-2 days | "New" |
| 3 | 3-6 days | "Getting there" |
| 4 | 7-20 days | "Solid" |
| 5 | ≥ 21 days, reps ≥ 4 | "Mastered" |

If the build team prefers the fixed ladder as the actual scheduler, delete SM-2-lite and keep the tiers - but do not run both. Two schedulers on one item is the fastest way to produce a review queue nobody trusts.

### New-vs-review mixing

| Rule | Value |
|---|---|
| Default session size | **14 items** (max 20, "practice more" appends up to 6) |
| New share | **30%** → `new = clamp(round(0.3 × 14), 0, 6)` = **4 new / 10 review** |
| Cap | Never more than **6 new sentences** in one day, even with a big backlog |
| Catch-up | If due count > session size, `new = 0` and a "catch-up" banner appears |
| Adaptive | Last session accuracy <70% → 3 new. ≥90% and median latency <8s → 6 new |
| Fatigue rule | No first-exposure item in the last 25% of a session |

**Ordering recipe (implement exactly):**

1. Two warm-up reviews with `ease >= 2.5` (oldest due first). These are the guaranteed wins.
2. Then alternate **2 reviews : 1 new**. Never two new sentences back to back.
3. Never three consecutive items of the same exercise type.
4. Final item = one review the learner answered correctly last time.

---

## 8. Audio strategy (no recorded audio)

The MVP ships zero audio files. Everything is synthesised with the browser's Web Speech API. This is a real trade-off: voice quality varies by OS, and there is no Korean voice on some Linux installs. The design rule is therefore: **audio is an enhancement, never a gate.**

### Engine

```js
// shape only - implementation lives in the app
const u = new SpeechSynthesisUtterance(text);
u.lang = 'ko-KR';
u.rate = 0.85;      // sentences    (0.70 word cards, 0.55 slow replay)
u.pitch = 1.0;
speechSynthesis.cancel();   // never queue
speechSynthesis.speak(u);
```

### Voice selection

| Step | Rule |
|---|---|
| 1 | `getVoices()` often returns `[]` on first call - wait for `voiceschanged`, timeout **1500 ms** |
| 2 | Prefer `voice.lang === 'ko-KR'`, then any `lang` starting with `ko` |
| 3 | Tie-break by name: +3 for `Yuna`, `Google`, `Microsoft`, `Heami`, `Sora` |
| 4 | Cache the resolved voice for the session; re-resolve only on `voiceschanged` |

### Rate map

| Context | Rate |
|---|---|
| Sentence playback (default) | 0.85 |
| Word card | 0.70 |
| Slow replay (long-press) | 0.55 |
| Normal replay (double-tap) | 1.00 |

### Autoplay unlock

Browsers block speech before a user gesture. The very first screen is a single **tap to start** button; that gesture also fires a zero-length utterance to unlock the speech queue for the rest of the session. Without this, the first listen exercise silently fails and the learner assumes the app is broken.

### Graceful degradation matrix

| Situation | Behaviour |
|---|---|
| speechSynthesis missing | Hide all speaker icons. Show a one-time 'audio unavailable' chip. Listening exercises swap to 'read this, then choose the meaning' with romanization shown. No SRS penalty; the item grades at most Good. |
| no ko-KR / ko voice | Same as above, plus a single toast: 'No Korean voice on this device - Chrome usually has one, or add Korean in your OS speech settings.' |
| onstart never fires within 1200ms | Treat the play as failed, show the text fallback button, and log one telemetry event per session (not per play). |
| tab muted / user in silent mode | Nothing to detect reliably; the text + romanization fallback is always one tap away. |

In every degraded path the item still completes, still grades, and still counts toward the streak. **A learner on a silent Linux box must be able to finish the course.**

### Pronunciation traps (feedback copy)

Use these to explain *why* a sentence sounds different from its spelling. They are also the only source of minimal pairs.

| Written | Sounds like | Why |
|---|---|---|
| 감사합니다 | 감사함니다 | ㅂ before ㄴ becomes ㅁ |
| 맛있어요 | 마시써요 | ㅅ + 이 palatalizes; ㅆ is tense |
| 괜찮아요 | 괜차나요 | ㄶ drops to ㄴ |
| 좋아요 | 조아요 | ㅎ goes silent between vowels |
| 지하철역 | 지하철력 | ㄹ + ㅇ nasalizes to ㄹㄹ |

### Romanization toggle

| Mode | Behaviour |
|---|---|
| `always` | Romanization under every Korean string. Default for Units 1-2. |
| `auto` | Shown on new items; once the item has 2 correct answers the romanization collapses into a small chip. Default from Unit 3. |
| `never` | Hangul only. |

- Persisted at `localStorage["sk.romanization"]`.
- **Hidden** during listen & choose (before answering), minimal pairs, and type-the-Korean (until submitted) - in all three it *is* the answer.
- In build-the-sentence, romanization appears only while a tile is long-pressed.
- Rationale: romanization competes with Hangul for attention. Fade it, don't delete it - beginners panic when it vanishes overnight.

---

## 9. Session structure (3-5 minutes)

**Target:** 3-5 minutes (180-300s) · **14 items** default (20 max) · **~14s** per item.

| Clock | Block | What happens |
|---|---|---|
| 0:00-0:20 | **Continue screen** | Due count, streak, one primary button. No menu, no settings. |
| 0:20-0:50 | **Warm-up** | 2 review items, recognition-only (listen & choose or matching). Guaranteed-nice start. |
| 0:50-2:30 | **Core block 1** | 5-7 items. New sentences get a 12s intro card (hear + meaning + one gloss line) then 2 production touches. |
| 2:30-2:45 | **Micro-reward** | 1s combo flash + streak tick. No screen change, no interruption. |
| 2:45-4:20 | **Core block 2** | 5-7 items, production-heavy (build / type / speak). Hard items resurface here. |
| 4:20-4:40 | **Close** | Hard-item resurface if pending, then 1 review the user already knows well. |
| 4:40-5:00 | **Summary** | Items practiced, accuracy, best combo, words unlocked, the one sentence to watch, when it returns, unit map. |

The clock above is the 20-item shape. At the default 14 items it compresses to **~3:40**: the warm-up stays, Core block 1 keeps 4 items, Core block 2 drops to 4, and the Close stays exactly as written - the ending is never the part that gets cut.

### First exposure of a new sentence

A new sentence gets a **12-second intro** and exactly three touches, never a quiz:

1. **Hear it + read it** - Korean large, English below, audio auto-plays once, one gloss line.
2. **Build it** - word tiles, always solvable in one attempt because the model was just on screen.
3. **Recognise it** - listen & choose, or speak it.

Only after those three touches does the sentence enter the review pool with an interval.

### Exercise switching rules

| # | Rule |
|---|---|
| 1 | No 3 consecutive items of the same exercise type. |
| 2 | An item is never re-tested in the same exercise type twice in a row. |
| 3 | Recognition exercises fill the first 40% of the session; production the back 60%. |
| 4 | Across its lifetime every sentence sees at least 3 different exercise types. |

### Where the hard item resurfaces

A sentence graded **again** is requeued **after exactly 4 intervening items**, in a **different exercise type** (build → type, type → speak, speak → build). If it fails a second time it does **not** come back this session; it is pinned as the first item of tomorrow's session and named in the summary. This is the difference between "spaced repetition" and "a treadmill of failure".

### End-of-lesson summary

| Element | Content |
|---|---|
| Numbers | sentences practiced · accuracy % · best combo · new words unlocked |
| One thing to watch | the lowest-recall sentence today, with an optional 1-tap "practice now" |
| Next due | plain language: "You'll see these 6 again tomorrow." |
| Progress | the 7-node unit map, current node pulsing |
| CTA | one big **Next** button. Never "Done". |

**Stop rules:** end at the item target; if median latency exceeds 12s across 3 items, drop remaining new material and finish on reviews; quitting mid-session is free (resume from item index, streak preserved).

---

## 10. Boss rounds

Boss rounds are **victory laps, not tests**. Three rules make that true:

1. A boss only asks sentences the learner has already answered correctly at least once in a normal session.
2. There is no hard fail. Failure produces a hint, a slower replay, or a same-turn retry.
3. Boss performance does **not** move SRS intervals, except that an item missed twice is graded `hard`. Curiosity must never be punished by a bigger review queue tomorrow.

| Boss | Unlock | Length | Win condition | Failure handling |
|---|---|---|---|---|
| 카페 주문 (Café order) | after Unit 3 | 90s | 3/3 tickets served. | No fail state. A wrong card fades out and the barista repeats the line at 0.7x. Max 2 hints per turn. |
| 지하철 대시 (Subway dash) | after Unit 5 | 85s | Arrive at City Hall before the clock drains (deliberately generous). | Clock at zero -> instant '다시' on the same route, no penalty, no lost streak. |
| 첫 만남 (First meeting) | after Unit 7 | 150s | Reach the closing turn with at least 1 heart. | Hearts at 0 -> the peer says '괜찮아요!' and re-asks the same turn with the gloss visible. No restart. |

### Boss 1 — 카페 주문 (Café order)

**Fantasy:** You order lunch in a Seoul café and the barista actually understands you.

- **Screen:** Illustrated counter, barista with a speech bubble, 3 order tickets on the right, coin counter top-right.
- **Loop:** Barista speaks (TTS). 3 reply cards. 4 turns: greet -> order -> 'is spicy okay?' -> ask for the bill. Each correct pick stamps a ticket.
- **Win:** 3/3 tickets served.
- **Fail:** No fail state. A wrong card fades out and the barista repeats the line at 0.7x. Max 2 hints per turn.
- **Reward:** '주문 완료' stamp, 30 XP, unit 4 unlocks.
- **Sentences tested:** `greet_hello`, `greet_thanks`, `food_order_stew`, `food_cant_eat_spicy`, `food_price`, `food_bill`

Design note: the barista's lines are *always* slower (0.7x) than the app's normal 0.85x, because a real café is the first place a beginner freezes. Beating the boss should feel like the audio got easier, not like the test got harder.

### Boss 2 — 지하철 대시 (Subway dash)

**Fantasy:** You have 90 seconds to reach City Hall using only Korean directions.

- **Screen:** Stylised 3-stop map, you at the bottom, three big arrows (left / straight / right), a soft clock, a panic button labelled 길을 잃었어요.
- **Loop:** TTS gives one direction sentence per leg. Tap the matching arrow. 4 legs. The panic button plays the recovery phrase and puts you back on the route for a 5-second clock cost.
- **Win:** Arrive at City Hall before the clock drains (deliberately generous).
- **Fail:** Clock at zero -> instant '다시' on the same route, no penalty, no lost streak.
- **Reward:** Route stamp, 40 XP, and a '길찾기' badge.
- **Sentences tested:** `place_bathroom`, `place_go_left`, `place_close_here`, `place_station_over_there`, `place_bus_to_cityhall`, `place_lost`

Design note: the panic button (길을 잃었어요) is a *feature*, not a fail state. The most valuable thing a tourist can say is "I'm lost", so the boss rewards saying it out loud.

### Boss 3 — 첫 만남 (First meeting)

**Fantasy:** A 6-turn chat with a Korean peer that ends with you saying '오늘 정말 즐거웠어요'.

- **Screen:** Chat-style thread with an avatar, 3 reply options per turn, 3 hearts as a confidence meter.
- **Loop:** 6 turns pulling from all 7 units. Two turns are intentionally hard to parse, and the winning move is 다시 한번 말씀해 주세요 or 천천히 말해 주세요 - the recovery phrases are scored as correct, not as a cop-out.
- **Win:** Reach the closing turn with at least 1 heart.
- **Fail:** Hearts at 0 -> the peer says '괜찮아요!' and re-asks the same turn with the gloss visible. No restart.
- **Reward:** '40문장 졸업' certificate card + your 5 weakest sentences become a personal review deck.
- **Sentences tested:** `intro_name`, `intro_nice_to_meet`, `feel_how_are_you`, `feel_like_korean_food`, `wrap_say_again`, `wrap_speak_slowly`, `wrap_had_fun`

Design note: two of the six turns are deliberately hard to parse, and the *correct* answer is 다시 한번 말씀해 주세요 / 천천히 말해 주세요. Beginners believe asking for a repeat is failure. This boss teaches the opposite by making it the winning move.

---

## 11. Data block (paste-ready)

Single JSON object. Everything the app needs for the MVP: units, grammar points, 40 sentences, 75 words, the exercise definitions, the scheduler config, audio rules, session shape, and the boss rounds.

```json
{
  "meta": {
    "version": "1.0.0",
    "scope": "absolute_beginner_mvp",
    "target_cefr_longterm": "B2",
    "unit_count": 7,
    "sentence_count": 40,
    "word_count": 75,
    "word_card_count": 38,
    "grammar_point_count": 23,
    "speech_level": "polite (-요 / -ㅂ니다)",
    "romanization_scheme": "Revised Romanization",
    "locale": "ko-KR",
    "generated": "2026-11-16"
  },
  "units": [
    {
      "id": "u1_greetings",
      "order": 1,
      "title": "Greetings",
      "subtitle": "The 6 sentences that open every door",
      "goal": "Say hello, thank you, sorry, goodbye, and answer yes/no without freezing.",
      "grammar_point_ids": [
        "gp_polite_yo",
        "gp_formal_nida",
        "gp_yes_no"
      ],
      "sentence_ids": [
        "greet_hello",
        "greet_thanks",
        "greet_sorry",
        "greet_bye_leaving",
        "greet_yes_right",
        "greet_fine_thanks"
      ],
      "boss_round_id": null,
      "unlock_rule": "80% of this unit's sentences answered correctly at least once"
    },
    {
      "id": "u2_introducing_yourself",
      "order": 2,
      "title": "Introducing yourself",
      "subtitle": "Name, job, country, and one humble brag",
      "goal": "Give your name, nationality, and what you study, and say nice to meet you.",
      "grammar_point_ids": [
        "gp_copula_ieyo",
        "gp_topic_eun_neun",
        "gp_object_eul_reul",
        "gp_can_su_isseoyo"
      ],
      "sentence_ids": [
        "intro_name",
        "intro_student",
        "intro_american",
        "intro_study_korean",
        "intro_nice_to_meet",
        "intro_little_korean"
      ],
      "boss_round_id": null,
      "unlock_rule": "80% of this unit's sentences answered correctly at least once"
    },
    {
      "id": "u3_food_ordering",
      "order": 3,
      "title": "Food & ordering",
      "subtitle": "Order it, price it, refuse the spice",
      "goal": "Order one dish, ask the price, ask for water and the bill, state what you can't eat.",
      "grammar_point_ids": [
        "gp_juseyo",
        "gp_eolmayeyo",
        "gp_negation_an_mot"
      ],
      "sentence_ids": [
        "food_price",
        "food_order_stew",
        "food_cant_eat_spicy",
        "food_water",
        "food_delicious",
        "food_bill"
      ],
      "boss_round_id": "boss_cafe_order",
      "unlock_rule": "80% of this unit's sentences answered correctly at least once"
    },
    {
      "id": "u4_daily_routine",
      "order": 4,
      "title": "Daily routine",
      "subtitle": "Your day, in five verbs",
      "goal": "Say when you wake up, eat, study, go, and sleep, and describe yesterday.",
      "grammar_point_ids": [
        "gp_time_e",
        "gp_go_and",
        "gp_past_asseosseoyo"
      ],
      "sentence_ids": [
        "daily_wake",
        "daily_breakfast_school",
        "daily_study_every_day",
        "daily_weather_nice",
        "daily_yesterday_friend",
        "daily_sleep_late"
      ],
      "boss_round_id": null,
      "unlock_rule": "80% of this unit's sentences answered correctly at least once"
    },
    {
      "id": "u5_places_directions",
      "order": 5,
      "title": "Places & directions",
      "subtitle": "Never be lost for more than one sentence",
      "goal": "Ask where something is, understand left/right/near, say you are lost.",
      "grammar_point_ids": [
        "gp_eodiyeyo",
        "gp_isseoyo_eopseoyo",
        "gp_direction_euro"
      ],
      "sentence_ids": [
        "place_bathroom",
        "place_go_left",
        "place_close_here",
        "place_station_over_there",
        "place_bus_to_cityhall",
        "place_lost"
      ],
      "boss_round_id": "boss_subway_dash",
      "unlock_rule": "80% of this unit's sentences answered correctly at least once"
    },
    {
      "id": "u6_feelings_smalltalk",
      "order": 6,
      "title": "Feelings & small talk",
      "subtitle": "Sound like a person, not a phrasebook",
      "goal": "Ask how someone is, say you're busy/good/tired, say what you like, offer tomorrow.",
      "grammar_point_ids": [
        "gp_joayo_vs_joahaeyo",
        "gp_gibun_joayo",
        "gp_sigan_isseoyo"
      ],
      "sentence_ids": [
        "feel_how_are_you",
        "feel_busy_lately",
        "feel_good_today",
        "feel_like_korean_food",
        "feel_time_tomorrow",
        "feel_korean_is_fun"
      ],
      "boss_round_id": null,
      "unlock_rule": "80% of this unit's sentences answered correctly at least once"
    },
    {
      "id": "u7_wrap_up",
      "order": 7,
      "title": "Wrap-up & boss round",
      "subtitle": "The four sentences that save a conversation",
      "goal": "Ask someone to repeat or slow down, admit you're still learning, close warmly.",
      "grammar_point_ids": [
        "gp_ha_juseyo",
        "gp_ajik_jal_mothaeyo",
        "gp_past_review"
      ],
      "sentence_ids": [
        "wrap_say_again",
        "wrap_speak_slowly",
        "wrap_not_good",
        "wrap_had_fun"
      ],
      "boss_round_id": "boss_first_meeting",
      "unlock_rule": "80% of this unit's sentences answered correctly at least once"
    }
  ],
  "grammar_points": [
    {
      "id": "gp_polite_yo",
      "unit_id": "u1_greetings",
      "label": "-아요 / -어요 / -해요 (polite ending)",
      "tag": "polite ending -요",
      "explanation": "Add -요 to a verb and you're automatically polite to strangers.",
      "example_sentence_id": "greet_hello",
      "core": true
    },
    {
      "id": "gp_formal_nida",
      "unit_id": "u1_greetings",
      "label": "-ㅂ니다 / -습니다 (formal polite)",
      "tag": "-ㅂ니다 formal polite",
      "explanation": "The 'news anchor' ending: extra polite, used for thanks and apologies.",
      "example_sentence_id": "greet_thanks",
      "core": true
    },
    {
      "id": "gp_yes_no",
      "unit_id": "u1_greetings",
      "label": "네 / 아니요",
      "tag": "네 / 아니요 answer",
      "explanation": "네 means yes and also 'I hear you'; 아니요 means no.",
      "example_sentence_id": "greet_yes_right",
      "core": true
    },
    {
      "id": "gp_copula_ieyo",
      "unit_id": "u2_introducing_yourself",
      "label": "이에요 / 예요 (to be)",
      "tag": "이에요/예요 copula",
      "explanation": "Vowel before it gets 예요, consonant gets 이에요: 민수예요, 학생이에요.",
      "example_sentence_id": "intro_name",
      "core": true
    },
    {
      "id": "gp_topic_eun_neun",
      "unit_id": "u2_introducing_yourself",
      "label": "은 / 는 (topic marker)",
      "tag": "은/는 topic marker",
      "explanation": "은/는 means 'as for...' and puts the spotlight on that word.",
      "example_sentence_id": "intro_student",
      "core": true
    },
    {
      "id": "gp_object_eul_reul",
      "unit_id": "u2_introducing_yourself",
      "label": "을 / 를 (object marker)",
      "tag": "object marker 을/를",
      "explanation": "Stick 을/를 on the thing being acted on: 한국어를 공부해요.",
      "example_sentence_id": "intro_study_korean",
      "core": true
    },
    {
      "id": "gp_can_su_isseoyo",
      "unit_id": "u2_introducing_yourself",
      "label": "-(으)ㄹ 수 있어요 (can)",
      "tag": "-ㄹ 수 있어요 ability",
      "explanation": "Literally 'the way exists': 할 수 있어요 = I can do it.",
      "example_sentence_id": "intro_little_korean",
      "core": false
    },
    {
      "id": "gp_juseyo",
      "unit_id": "u3_food_ordering",
      "label": "주세요 (please give)",
      "tag": "주세요 request",
      "explanation": "Put 주세요 after a thing and you're politely asking for it.",
      "example_sentence_id": "food_water",
      "core": true
    },
    {
      "id": "gp_eolmayeyo",
      "unit_id": "u3_food_ordering",
      "label": "얼마예요? (how much)",
      "tag": "얼마예요 price",
      "explanation": "얼마 = how much; add 예요 and point at anything.",
      "example_sentence_id": "food_price",
      "core": true
    },
    {
      "id": "gp_negation_an_mot",
      "unit_id": "u3_food_ordering",
      "label": "안 / 못 (don't / can't)",
      "tag": "negation 안/못",
      "explanation": "안 = won't do it; 못 = can't, physically unable.",
      "example_sentence_id": "food_cant_eat_spicy",
      "core": true
    },
    {
      "id": "gp_time_e",
      "unit_id": "u4_daily_routine",
      "label": "Time + 에",
      "tag": "time particle 에",
      "explanation": "Put 에 after a time: 일곱 시에 = at seven o'clock.",
      "example_sentence_id": "daily_wake",
      "core": true
    },
    {
      "id": "gp_go_and",
      "unit_id": "u4_daily_routine",
      "label": "-고 (and then)",
      "tag": "-고 connective",
      "explanation": "Glue -고 onto a verb to chain 'do A, and then B'.",
      "example_sentence_id": "daily_breakfast_school",
      "core": true
    },
    {
      "id": "gp_past_asseosseoyo",
      "unit_id": "u4_daily_routine",
      "label": "-았/었어요 (past tense)",
      "tag": "past tense -았/었어요",
      "explanation": "Add -았/었어요 and it already happened: 만났어요 = met.",
      "example_sentence_id": "daily_yesterday_friend",
      "core": true
    },
    {
      "id": "gp_eodiyeyo",
      "unit_id": "u5_places_directions",
      "label": "어디예요? (where is it?)",
      "tag": "어디예요 location question",
      "explanation": "Noun + 이/가 어디예요 = where is [noun]?",
      "example_sentence_id": "place_bathroom",
      "core": true
    },
    {
      "id": "gp_isseoyo_eopseoyo",
      "unit_id": "u5_places_directions",
      "label": "있어요 / 없어요 (there is / isn't)",
      "tag": "있어요/없어요 existence",
      "explanation": "있어요 = it exists or you have it; 없어요 = no such thing.",
      "example_sentence_id": "place_station_over_there",
      "core": true
    },
    {
      "id": "gp_direction_euro",
      "unit_id": "u5_places_directions",
      "label": "-(으)로 (toward)",
      "tag": "direction -(으)로",
      "explanation": "왼쪽으로 = to the left; -(으)로 points the direction.",
      "example_sentence_id": "place_go_left",
      "core": true
    },
    {
      "id": "gp_joayo_vs_joahaeyo",
      "unit_id": "u6_feelings_smalltalk",
      "label": "좋아요 vs 좋아해요",
      "tag": "좋아요 vs 좋아해요",
      "explanation": "좋아요 = 'it's good'; 좋아해요 = 'I like it'. Different jobs, same word root.",
      "example_sentence_id": "feel_like_korean_food",
      "core": true
    },
    {
      "id": "gp_gibun_joayo",
      "unit_id": "u6_feelings_smalltalk",
      "label": "기분이 좋아요 (I feel good)",
      "tag": "기분이 좋아요 feeling",
      "explanation": "Korean says 'the mood is good', not 'I am good'.",
      "example_sentence_id": "feel_good_today",
      "core": true
    },
    {
      "id": "gp_sigan_isseoyo",
      "unit_id": "u6_feelings_smalltalk",
      "label": "시간이 있어요? (have time?)",
      "tag": "시간이 있어요 possession",
      "explanation": "Korean says 'time exists' instead of 'I have time'.",
      "example_sentence_id": "feel_time_tomorrow",
      "core": true
    },
    {
      "id": "gp_si_honorific",
      "unit_id": "u6_feelings_smalltalk",
      "label": "-시- (honorific infix)",
      "tag": "honorific -시-",
      "explanation": "Insert -시- before the ending when the subject is someone you respect.",
      "example_sentence_id": "feel_how_are_you",
      "core": false
    },
    {
      "id": "gp_ha_juseyo",
      "unit_id": "u7_wrap_up",
      "label": "-아/어 주세요 (do it for me)",
      "tag": "-아/어 주세요 request",
      "explanation": "Add -주세요 to a verb to ask someone to do it on your behalf.",
      "example_sentence_id": "wrap_speak_slowly",
      "core": true
    },
    {
      "id": "gp_ajik_jal_mothaeyo",
      "unit_id": "u7_wrap_up",
      "label": "아직 잘 못해요 (still not good)",
      "tag": "아직 + 잘 못해요",
      "explanation": "The beginner's shield: 'I still can't do it well.'",
      "example_sentence_id": "wrap_not_good",
      "core": true
    },
    {
      "id": "gp_past_review",
      "unit_id": "u7_wrap_up",
      "label": "Past tense review (-았/었어요)",
      "tag": "past tense review",
      "explanation": "Same past ending, now on an adjective: 즐거웠어요 = it was fun.",
      "example_sentence_id": "wrap_had_fun",
      "core": true
    }
  ],
  "sentences": [
    {
      "id": "greet_hello",
      "unit_id": "u1_greetings",
      "korean": "안녕하세요.",
      "romanization": "annyeonghaseyo",
      "english": "Hello.",
      "gloss": [
        {
          "ko": "안녕",
          "rom": "annyeong",
          "en": "peace/well-being"
        },
        {
          "ko": "하세요",
          "rom": "haseyo",
          "en": "do/be (polite)"
        }
      ],
      "gloss_literal": "be at peace, please",
      "grammar_tag": "polite ending -세요",
      "grammar_point_id": "gp_polite_yo",
      "distractors": [
        "Goodbye.",
        "Thank you.",
        "Excuse me."
      ],
      "word_ids": [
        "w_annyeong"
      ],
      "alt_orders": [],
      "register": "polite",
      "difficulty": 1,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "안녕하세요"
      }
    },
    {
      "id": "greet_thanks",
      "unit_id": "u1_greetings",
      "korean": "감사합니다.",
      "romanization": "gamsahamnida",
      "english": "Thank you.",
      "gloss": [
        {
          "ko": "감사",
          "rom": "gamsa",
          "en": "thanks"
        },
        {
          "ko": "합니다",
          "rom": "hamnida",
          "en": "do (formal polite)"
        }
      ],
      "gloss_literal": "I do thanks",
      "grammar_tag": "-ㅂ니다 formal polite",
      "grammar_point_id": "gp_formal_nida",
      "distractors": [
        "I'm sorry.",
        "You're welcome.",
        "Nice to meet you."
      ],
      "word_ids": [
        "w_gamsa"
      ],
      "alt_orders": [],
      "register": "formal polite",
      "difficulty": 1,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "감사합니다"
      }
    },
    {
      "id": "greet_sorry",
      "unit_id": "u1_greetings",
      "korean": "죄송합니다.",
      "romanization": "joesonghamnida",
      "english": "I'm sorry.",
      "gloss": [
        {
          "ko": "죄송",
          "rom": "joesong",
          "en": "apology"
        },
        {
          "ko": "합니다",
          "rom": "hamnida",
          "en": "do (formal polite)"
        }
      ],
      "gloss_literal": "I do apology",
      "grammar_tag": "-ㅂ니다 formal polite",
      "grammar_point_id": "gp_formal_nida",
      "distractors": [
        "Thank you.",
        "It's okay.",
        "Goodbye."
      ],
      "word_ids": [
        "w_joesong"
      ],
      "alt_orders": [],
      "register": "formal polite",
      "difficulty": 1,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "죄송합니다"
      }
    },
    {
      "id": "greet_bye_leaving",
      "unit_id": "u1_greetings",
      "korean": "안녕히 가세요.",
      "romanization": "annyeonghi gaseyo",
      "english": "Goodbye. (to someone who is leaving)",
      "gloss": [
        {
          "ko": "안녕히",
          "rom": "annyeonghi",
          "en": "peacefully"
        },
        {
          "ko": "가세요",
          "rom": "gaseyo",
          "en": "go (polite)"
        }
      ],
      "gloss_literal": "go peacefully",
      "grammar_tag": "polite ending -세요",
      "grammar_point_id": "gp_polite_yo",
      "distractors": [
        "Hello.",
        "Goodbye. (to someone who is staying)",
        "See you tomorrow."
      ],
      "word_ids": [
        "w_annyeong",
        "w_gada"
      ],
      "alt_orders": [],
      "register": "polite",
      "difficulty": 2,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "안녕히 가세요"
      }
    },
    {
      "id": "greet_yes_right",
      "unit_id": "u1_greetings",
      "korean": "네, 맞아요.",
      "romanization": "ne, majayo",
      "english": "Yes, that's right.",
      "gloss": [
        {
          "ko": "네",
          "rom": "ne",
          "en": "yes"
        },
        {
          "ko": "맞아요",
          "rom": "majayo",
          "en": "is correct (polite)"
        }
      ],
      "gloss_literal": "yes, it is correct",
      "grammar_tag": "polite ending -아요/어요",
      "grammar_point_id": "gp_yes_no",
      "distractors": [
        "No, that's not right.",
        "Yes, I'm sorry.",
        "I don't know."
      ],
      "word_ids": [
        "w_ne"
      ],
      "alt_orders": [],
      "register": "polite",
      "difficulty": 2,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "네, 맞아요"
      }
    },
    {
      "id": "greet_fine_thanks",
      "unit_id": "u1_greetings",
      "korean": "아니요, 괜찮아요.",
      "romanization": "aniyo, gwaenchanayo",
      "english": "No, I'm fine. / No, it's okay.",
      "gloss": [
        {
          "ko": "아니요",
          "rom": "aniyo",
          "en": "no"
        },
        {
          "ko": "괜찮아요",
          "rom": "gwaenchanayo",
          "en": "is okay (polite)"
        }
      ],
      "gloss_literal": "no, it is okay",
      "grammar_tag": "polite ending -아요/어요",
      "grammar_point_id": "gp_yes_no",
      "distractors": [
        "Yes, I'm okay.",
        "No, I'm not okay.",
        "I'm sorry."
      ],
      "word_ids": [
        "w_aniyo",
        "w_gwaenchanta"
      ],
      "alt_orders": [],
      "register": "polite",
      "difficulty": 2,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "아니요, 괜찮아요"
      }
    },
    {
      "id": "intro_name",
      "unit_id": "u2_introducing_yourself",
      "korean": "제 이름은 민수예요.",
      "romanization": "je ireumeun Minsuyeyo",
      "english": "My name is Minsu.",
      "gloss": [
        {
          "ko": "제",
          "rom": "je",
          "en": "my (humble)"
        },
        {
          "ko": "이름",
          "rom": "ireum",
          "en": "name"
        },
        {
          "ko": "은",
          "rom": "eun",
          "en": "topic"
        },
        {
          "ko": "민수",
          "rom": "Minsu",
          "en": "Minsu"
        },
        {
          "ko": "예요",
          "rom": "yeyo",
          "en": "is"
        }
      ],
      "gloss_literal": "as for me, name is Minsu",
      "grammar_tag": "이에요/예요 copula",
      "grammar_point_id": "gp_copula_ieyo",
      "distractors": [
        "Your name is Minsu.",
        "My name is not Minsu.",
        "Minsu studies Korean."
      ],
      "word_ids": [
        "w_jeo",
        "w_ireum"
      ],
      "alt_orders": [],
      "register": "polite",
      "difficulty": 2,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "제 이름은 민수예요"
      }
    },
    {
      "id": "intro_student",
      "unit_id": "u2_introducing_yourself",
      "korean": "저는 학생이에요.",
      "romanization": "jeoneun haksaengieyo",
      "english": "I am a student.",
      "gloss": [
        {
          "ko": "저",
          "rom": "jeo",
          "en": "I (humble)"
        },
        {
          "ko": "는",
          "rom": "neun",
          "en": "topic"
        },
        {
          "ko": "학생",
          "rom": "haksaeng",
          "en": "student"
        },
        {
          "ko": "이에요",
          "rom": "ieyo",
          "en": "is"
        }
      ],
      "gloss_literal": "as for me, [I] am a student",
      "grammar_tag": "이에요/예요 copula",
      "grammar_point_id": "gp_copula_ieyo",
      "distractors": [
        "I am a teacher.",
        "I am not a student.",
        "The student is here."
      ],
      "word_ids": [
        "w_jeo",
        "w_haksaeng"
      ],
      "alt_orders": [],
      "register": "polite",
      "difficulty": 1,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "저는 학생이에요"
      }
    },
    {
      "id": "intro_american",
      "unit_id": "u2_introducing_yourself",
      "korean": "저는 미국 사람이에요.",
      "romanization": "jeoneun miguk saramieyo",
      "english": "I am American.",
      "gloss": [
        {
          "ko": "저",
          "rom": "jeo",
          "en": "I (humble)"
        },
        {
          "ko": "는",
          "rom": "neun",
          "en": "topic"
        },
        {
          "ko": "미국",
          "rom": "miguk",
          "en": "USA"
        },
        {
          "ko": "사람",
          "rom": "saram",
          "en": "person"
        },
        {
          "ko": "이에요",
          "rom": "ieyo",
          "en": "is"
        }
      ],
      "gloss_literal": "as for me, [I] am an American person",
      "grammar_tag": "이에요/예요 copula",
      "grammar_point_id": "gp_copula_ieyo",
      "distractors": [
        "I am Korean.",
        "I live in America.",
        "I am a student from America."
      ],
      "word_ids": [
        "w_jeo",
        "w_miguk",
        "w_saram"
      ],
      "alt_orders": [],
      "register": "polite",
      "difficulty": 2,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "저는 미국 사람이에요"
      }
    },
    {
      "id": "intro_study_korean",
      "unit_id": "u2_introducing_yourself",
      "korean": "저는 한국어를 공부해요.",
      "romanization": "jeoneun hangugeoreul gongbuhaeyo",
      "english": "I study Korean.",
      "gloss": [
        {
          "ko": "저",
          "rom": "jeo",
          "en": "I (humble)"
        },
        {
          "ko": "는",
          "rom": "neun",
          "en": "topic"
        },
        {
          "ko": "한국어를",
          "rom": "hangugeoreul",
          "en": "Korean + object"
        },
        {
          "ko": "공부해요",
          "rom": "gongbuhaeyo",
          "en": "study (polite)"
        }
      ],
      "gloss_literal": "as for me, [I] study the Korean language",
      "grammar_tag": "object marker 을/를",
      "grammar_point_id": "gp_object_eul_reul",
      "distractors": [
        "I teach Korean.",
        "I study English.",
        "Korean is difficult."
      ],
      "word_ids": [
        "w_jeo",
        "w_hangugeo",
        "w_gongbuhada"
      ],
      "alt_orders": [
        "한국어를 저는 공부해요."
      ],
      "register": "polite",
      "difficulty": 2,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "저는 한국어를 공부해요"
      }
    },
    {
      "id": "intro_nice_to_meet",
      "unit_id": "u2_introducing_yourself",
      "korean": "만나서 반가워요.",
      "romanization": "mannaseo bangawoyo",
      "english": "Nice to meet you.",
      "gloss": [
        {
          "ko": "만나서",
          "rom": "mannaseo",
          "en": "meet-and"
        },
        {
          "ko": "반가워요",
          "rom": "bangawoyo",
          "en": "am glad (polite)"
        }
      ],
      "gloss_literal": "having met [you], I am glad",
      "grammar_tag": "-아/어서 connective",
      "grammar_point_id": "gp_copula_ieyo",
      "distractors": [
        "Nice to see you again.",
        "Goodbye.",
        "I'm glad it's over."
      ],
      "word_ids": [
        "w_bangapda"
      ],
      "alt_orders": [],
      "register": "polite",
      "difficulty": 2,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "만나서 반가워요"
      }
    },
    {
      "id": "intro_little_korean",
      "unit_id": "u2_introducing_yourself",
      "korean": "한국어를 조금 할 수 있어요.",
      "romanization": "hangugeoreul jogeum hal su isseoyo",
      "english": "I can speak a little Korean.",
      "gloss": [
        {
          "ko": "한국어를",
          "rom": "hangugeoreul",
          "en": "Korean + object"
        },
        {
          "ko": "조금",
          "rom": "jogeum",
          "en": "a little"
        },
        {
          "ko": "할",
          "rom": "hal",
          "en": "do (attributive)"
        },
        {
          "ko": "수",
          "rom": "su",
          "en": "way / ability"
        },
        {
          "ko": "있어요",
          "rom": "isseoyo",
          "en": "there is"
        }
      ],
      "gloss_literal": "as for Korean, a little, the way to do exists",
      "grammar_tag": "-ㄹ 수 있어요 ability",
      "grammar_point_id": "gp_can_su_isseoyo",
      "distractors": [
        "I can't speak Korean.",
        "I speak Korean very well.",
        "I am learning Korean."
      ],
      "word_ids": [
        "w_hangugeo",
        "w_jogeum",
        "w_isseoyo"
      ],
      "alt_orders": [
        "조금 한국어를 할 수 있어요."
      ],
      "register": "polite",
      "difficulty": 3,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "한국어를 조금 할 수 있어요"
      }
    },
    {
      "id": "food_price",
      "unit_id": "u3_food_ordering",
      "korean": "이거 얼마예요?",
      "romanization": "igeo eolmayeyo",
      "english": "How much is this?",
      "gloss": [
        {
          "ko": "이거",
          "rom": "igeo",
          "en": "this thing"
        },
        {
          "ko": "얼마",
          "rom": "eolma",
          "en": "how much"
        },
        {
          "ko": "예요",
          "rom": "yeyo",
          "en": "is"
        }
      ],
      "gloss_literal": "this thing, is how much?",
      "grammar_tag": "얼마예요 price",
      "grammar_point_id": "gp_eolmayeyo",
      "distractors": [
        "Where is this?",
        "How many are there?",
        "What is this?"
      ],
      "word_ids": [
        "w_igeo",
        "w_eolma"
      ],
      "alt_orders": [
        "얼마예요, 이거?"
      ],
      "register": "polite",
      "difficulty": 1,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "이거 얼마예요?"
      }
    },
    {
      "id": "food_order_stew",
      "unit_id": "u3_food_ordering",
      "korean": "김치찌개 하나 주세요.",
      "romanization": "kimchijjigae hana juseyo",
      "english": "One kimchi stew, please.",
      "gloss": [
        {
          "ko": "김치찌개",
          "rom": "kimchijjigae",
          "en": "kimchi stew"
        },
        {
          "ko": "하나",
          "rom": "hana",
          "en": "one"
        },
        {
          "ko": "주세요",
          "rom": "juseyo",
          "en": "please give"
        }
      ],
      "gloss_literal": "kimchi stew one, please give",
      "grammar_tag": "주세요 request",
      "grammar_point_id": "gp_juseyo",
      "distractors": [
        "Two kimchi stews, please.",
        "The bill, please.",
        "Is the kimchi spicy?"
      ],
      "word_ids": [
        "w_gimchijjigae",
        "w_hana",
        "w_juseyo"
      ],
      "alt_orders": [
        "김치찌개 하나를 주세요."
      ],
      "register": "polite",
      "difficulty": 2,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "김치찌개 하나 주세요"
      }
    },
    {
      "id": "food_cant_eat_spicy",
      "unit_id": "u3_food_ordering",
      "korean": "저는 매운 음식을 못 먹어요.",
      "romanization": "jeoneun maeun eumsigeul mot meogeoyo",
      "english": "I can't eat spicy food.",
      "gloss": [
        {
          "ko": "저",
          "rom": "jeo",
          "en": "I (humble)"
        },
        {
          "ko": "는",
          "rom": "neun",
          "en": "topic"
        },
        {
          "ko": "매운",
          "rom": "maeun",
          "en": "spicy"
        },
        {
          "ko": "음식을",
          "rom": "eumsigeul",
          "en": "food + object"
        },
        {
          "ko": "못",
          "rom": "mot",
          "en": "cannot"
        },
        {
          "ko": "먹어요",
          "rom": "meogeoyo",
          "en": "eat (polite)"
        }
      ],
      "gloss_literal": "as for me, spicy food cannot eat",
      "grammar_tag": "negation 안/못",
      "grammar_point_id": "gp_negation_an_mot",
      "distractors": [
        "I don't like spicy food.",
        "I can eat spicy food.",
        "The food is too spicy."
      ],
      "word_ids": [
        "w_maeun",
        "w_eumsik",
        "w_mot",
        "w_meokda"
      ],
      "alt_orders": [
        "매운 음식을 저는 못 먹어요."
      ],
      "register": "polite",
      "difficulty": 3,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "저는 매운 음식을 못 먹어요"
      }
    },
    {
      "id": "food_water",
      "unit_id": "u3_food_ordering",
      "korean": "물 좀 주세요.",
      "romanization": "mul jom juseyo",
      "english": "Some water, please.",
      "gloss": [
        {
          "ko": "물",
          "rom": "mul",
          "en": "water"
        },
        {
          "ko": "좀",
          "rom": "jom",
          "en": "a little / please"
        },
        {
          "ko": "주세요",
          "rom": "juseyo",
          "en": "please give"
        }
      ],
      "gloss_literal": "water a little, please give",
      "grammar_tag": "주세요 request",
      "grammar_point_id": "gp_juseyo",
      "distractors": [
        "Some coffee, please.",
        "No water, thank you.",
        "Where is the water?"
      ],
      "word_ids": [
        "w_mul",
        "w_jom",
        "w_juseyo"
      ],
      "alt_orders": [
        "물을 좀 주세요."
      ],
      "register": "polite",
      "difficulty": 1,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "물 좀 주세요"
      }
    },
    {
      "id": "food_delicious",
      "unit_id": "u3_food_ordering",
      "korean": "이거 맛있어요.",
      "romanization": "igeo masisseoyo",
      "english": "This is delicious.",
      "gloss": [
        {
          "ko": "이거",
          "rom": "igeo",
          "en": "this thing"
        },
        {
          "ko": "맛있어요",
          "rom": "masisseoyo",
          "en": "is delicious (polite)"
        }
      ],
      "gloss_literal": "this thing is delicious",
      "grammar_tag": "polite ending -아요/어요",
      "grammar_point_id": "gp_polite_yo",
      "distractors": [
        "This is expensive.",
        "This is not delicious.",
        "This is too spicy."
      ],
      "word_ids": [
        "w_igeo",
        "w_masitda"
      ],
      "alt_orders": [],
      "register": "polite",
      "difficulty": 1,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "이거 맛있어요"
      }
    },
    {
      "id": "food_bill",
      "unit_id": "u3_food_ordering",
      "korean": "계산서 주세요.",
      "romanization": "gyesanseo juseyo",
      "english": "The bill, please.",
      "gloss": [
        {
          "ko": "계산서",
          "rom": "gyesanseo",
          "en": "bill / check"
        },
        {
          "ko": "주세요",
          "rom": "juseyo",
          "en": "please give"
        }
      ],
      "gloss_literal": "bill, please give",
      "grammar_tag": "주세요 request",
      "grammar_point_id": "gp_juseyo",
      "distractors": [
        "The menu, please.",
        "Water, please.",
        "Where is the bathroom?"
      ],
      "word_ids": [
        "w_gyesanseo",
        "w_juseyo"
      ],
      "alt_orders": [
        "계산서를 주세요."
      ],
      "register": "polite",
      "difficulty": 1,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "계산서 주세요"
      }
    },
    {
      "id": "daily_wake",
      "unit_id": "u4_daily_routine",
      "korean": "저는 아침 일곱 시에 일어나요.",
      "romanization": "jeoneun achim ilgop sie ireonayo",
      "english": "I get up at 7 in the morning.",
      "gloss": [
        {
          "ko": "저",
          "rom": "jeo",
          "en": "I (humble)"
        },
        {
          "ko": "는",
          "rom": "neun",
          "en": "topic"
        },
        {
          "ko": "아침",
          "rom": "achim",
          "en": "morning"
        },
        {
          "ko": "일곱",
          "rom": "ilgop",
          "en": "seven"
        },
        {
          "ko": "시에",
          "rom": "sie",
          "en": "at o'clock"
        },
        {
          "ko": "일어나요",
          "rom": "ireonayo",
          "en": "get up (polite)"
        }
      ],
      "gloss_literal": "as for me, morning seven at-the-hour, get up",
      "grammar_tag": "time particle 에",
      "grammar_point_id": "gp_time_e",
      "distractors": [
        "I go to bed at 7.",
        "I get up at 11.",
        "I eat breakfast at 7."
      ],
      "word_ids": [
        "w_achim",
        "w_ilgop",
        "w_si",
        "w_ireonada"
      ],
      "alt_orders": [
        "아침 일곱 시에 저는 일어나요."
      ],
      "register": "polite",
      "difficulty": 3,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "저는 아침 일곱 시에 일어나요"
      }
    },
    {
      "id": "daily_breakfast_school",
      "unit_id": "u4_daily_routine",
      "korean": "아침을 먹고 학교에 가요.",
      "romanization": "achimeul meokgo hakgyoe gayo",
      "english": "I eat breakfast and go to school.",
      "gloss": [
        {
          "ko": "아침을",
          "rom": "achimeul",
          "en": "breakfast + object"
        },
        {
          "ko": "먹고",
          "rom": "meokgo",
          "en": "eat-and"
        },
        {
          "ko": "학교에",
          "rom": "hakgyoe",
          "en": "to school"
        },
        {
          "ko": "가요",
          "rom": "gayo",
          "en": "go (polite)"
        }
      ],
      "gloss_literal": "breakfast eat-and, to school go",
      "grammar_tag": "-고 connective",
      "grammar_point_id": "gp_go_and",
      "distractors": [
        "I go to school and eat breakfast.",
        "I eat lunch at school.",
        "I don't eat breakfast."
      ],
      "word_ids": [
        "w_achim",
        "w_meokda",
        "w_hakgyo",
        "w_gada"
      ],
      "alt_orders": [
        "아침을 먹고, 학교에 가요."
      ],
      "register": "polite",
      "difficulty": 2,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "아침을 먹고 학교에 가요"
      }
    },
    {
      "id": "daily_study_every_day",
      "unit_id": "u4_daily_routine",
      "korean": "저는 매일 한국어를 공부해요.",
      "romanization": "jeoneun maeil hangugeoreul gongbuhaeyo",
      "english": "I study Korean every day.",
      "gloss": [
        {
          "ko": "저",
          "rom": "jeo",
          "en": "I (humble)"
        },
        {
          "ko": "는",
          "rom": "neun",
          "en": "topic"
        },
        {
          "ko": "매일",
          "rom": "maeil",
          "en": "every day"
        },
        {
          "ko": "한국어를",
          "rom": "hangugeoreul",
          "en": "Korean + object"
        },
        {
          "ko": "공부해요",
          "rom": "gongbuhaeyo",
          "en": "study (polite)"
        }
      ],
      "gloss_literal": "as for me, every day Korean study",
      "grammar_tag": "object marker 을/를",
      "grammar_point_id": "gp_object_eul_reul",
      "distractors": [
        "I study Korean on Mondays.",
        "I studied Korean every day.",
        "I teach Korean every day."
      ],
      "word_ids": [
        "w_maeil",
        "w_hangugeo",
        "w_gongbuhada"
      ],
      "alt_orders": [
        "매일 저는 한국어를 공부해요."
      ],
      "register": "polite",
      "difficulty": 2,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "저는 매일 한국어를 공부해요"
      }
    },
    {
      "id": "daily_weather_nice",
      "unit_id": "u4_daily_routine",
      "korean": "오늘은 날씨가 좋아요.",
      "romanization": "oneureun nalssiga joayo",
      "english": "The weather is nice today.",
      "gloss": [
        {
          "ko": "오늘은",
          "rom": "oneureun",
          "en": "today + topic"
        },
        {
          "ko": "날씨가",
          "rom": "nalssiga",
          "en": "weather + subject"
        },
        {
          "ko": "좋아요",
          "rom": "joayo",
          "en": "is good (polite)"
        }
      ],
      "gloss_literal": "today, the weather is good",
      "grammar_tag": "은/는 vs 이/가",
      "grammar_point_id": "gp_topic_eun_neun",
      "distractors": [
        "The weather was nice today.",
        "The weather is bad today.",
        "It's cold today."
      ],
      "word_ids": [
        "w_oneul",
        "w_nalssi",
        "w_jota"
      ],
      "alt_orders": [
        "날씨가 오늘은 좋아요."
      ],
      "register": "polite",
      "difficulty": 2,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "오늘은 날씨가 좋아요"
      }
    },
    {
      "id": "daily_yesterday_friend",
      "unit_id": "u4_daily_routine",
      "korean": "어제는 친구를 만났어요.",
      "romanization": "eojeneun chingureul mannasseoyo",
      "english": "Yesterday I met a friend.",
      "gloss": [
        {
          "ko": "어제는",
          "rom": "eojeneun",
          "en": "yesterday + topic"
        },
        {
          "ko": "친구를",
          "rom": "chingureul",
          "en": "friend + object"
        },
        {
          "ko": "만났어요",
          "rom": "mannasseoyo",
          "en": "met (past, polite)"
        }
      ],
      "gloss_literal": "yesterday, [I] a friend met",
      "grammar_tag": "past tense -았/었어요",
      "grammar_point_id": "gp_past_asseosseoyo",
      "distractors": [
        "I meet a friend today.",
        "I met my teacher yesterday.",
        "Yesterday I didn't meet anyone."
      ],
      "word_ids": [
        "w_eoje",
        "w_chingu",
        "w_mannada"
      ],
      "alt_orders": [
        "어제 친구를 만났어요."
      ],
      "register": "polite",
      "difficulty": 2,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "어제는 친구를 만났어요"
      }
    },
    {
      "id": "daily_sleep_late",
      "unit_id": "u4_daily_routine",
      "korean": "저는 보통 열한 시에 자요.",
      "romanization": "jeoneun botong yeolhan sie jayo",
      "english": "I usually go to bed at 11.",
      "gloss": [
        {
          "ko": "저",
          "rom": "jeo",
          "en": "I (humble)"
        },
        {
          "ko": "는",
          "rom": "neun",
          "en": "topic"
        },
        {
          "ko": "보통",
          "rom": "botong",
          "en": "usually"
        },
        {
          "ko": "열한",
          "rom": "yeolhan",
          "en": "eleven"
        },
        {
          "ko": "시에",
          "rom": "sie",
          "en": "at o'clock"
        },
        {
          "ko": "자요",
          "rom": "jayo",
          "en": "sleep (polite)"
        }
      ],
      "gloss_literal": "as for me, usually eleven at-the-hour, sleep",
      "grammar_tag": "time particle 에",
      "grammar_point_id": "gp_time_e",
      "distractors": [
        "I usually wake up at 11.",
        "I sleep at 7.",
        "I usually work at 11."
      ],
      "word_ids": [
        "w_botong",
        "w_yeolhana",
        "w_si",
        "w_jada"
      ],
      "alt_orders": [
        "보통 저는 열한 시에 자요."
      ],
      "register": "polite",
      "difficulty": 3,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "저는 보통 열한 시에 자요"
      }
    },
    {
      "id": "place_bathroom",
      "unit_id": "u5_places_directions",
      "korean": "화장실이 어디예요?",
      "romanization": "hwajangsiri eodiyeyo",
      "english": "Where is the bathroom?",
      "gloss": [
        {
          "ko": "화장실이",
          "rom": "hwajangsiri",
          "en": "bathroom + subject"
        },
        {
          "ko": "어디",
          "rom": "eodi",
          "en": "where"
        },
        {
          "ko": "예요",
          "rom": "yeyo",
          "en": "is"
        }
      ],
      "gloss_literal": "the bathroom is where?",
      "grammar_tag": "어디예요 location question",
      "grammar_point_id": "gp_eodiyeyo",
      "distractors": [
        "Where is the subway station?",
        "Is the bathroom here?",
        "The bathroom is over there."
      ],
      "word_ids": [
        "w_hwajangsil",
        "w_eodi"
      ],
      "alt_orders": [
        "화장실 어디예요?"
      ],
      "register": "polite",
      "difficulty": 1,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "화장실이 어디예요?"
      }
    },
    {
      "id": "place_go_left",
      "unit_id": "u5_places_directions",
      "korean": "왼쪽으로 가세요.",
      "romanization": "oenjjogeuro gaseyo",
      "english": "Please go to the left.",
      "gloss": [
        {
          "ko": "왼쪽으로",
          "rom": "oenjjogeuro",
          "en": "to the left"
        },
        {
          "ko": "가세요",
          "rom": "gaseyo",
          "en": "go (polite)"
        }
      ],
      "gloss_literal": "to the left, please go",
      "grammar_tag": "direction -(으)로",
      "grammar_point_id": "gp_direction_euro",
      "distractors": [
        "Please go to the right.",
        "Please come here.",
        "Please stop."
      ],
      "word_ids": [
        "w_oenjjok",
        "w_gada"
      ],
      "alt_orders": [],
      "register": "polite",
      "difficulty": 2,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "왼쪽으로 가세요"
      }
    },
    {
      "id": "place_close_here",
      "unit_id": "u5_places_directions",
      "korean": "여기에서 가까워요?",
      "romanization": "yeogieseo gakkawayo",
      "english": "Is it close from here?",
      "gloss": [
        {
          "ko": "여기에서",
          "rom": "yeogieseo",
          "en": "from here"
        },
        {
          "ko": "가까워요",
          "rom": "gakkawayo",
          "en": "is near (polite)"
        }
      ],
      "gloss_literal": "from here, is it near?",
      "grammar_tag": "polite ending -아요/어요",
      "grammar_point_id": "gp_polite_yo",
      "distractors": [
        "Is it far from here?",
        "Is it open now?",
        "Where is here?"
      ],
      "word_ids": [
        "w_gakkapda"
      ],
      "alt_orders": [
        "여기서 가까워요?"
      ],
      "register": "polite",
      "difficulty": 2,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "여기에서 가까워요?"
      }
    },
    {
      "id": "place_station_over_there",
      "unit_id": "u5_places_directions",
      "korean": "지하철역은 저쪽에 있어요.",
      "romanization": "jihacheollyeogeun jeojjoge isseoyo",
      "english": "The subway station is over there.",
      "gloss": [
        {
          "ko": "지하철역은",
          "rom": "jihacheollyeogeun",
          "en": "subway station + topic"
        },
        {
          "ko": "저쪽에",
          "rom": "jeojjoge",
          "en": "at that side"
        },
        {
          "ko": "있어요",
          "rom": "isseoyo",
          "en": "there is (polite)"
        }
      ],
      "gloss_literal": "the subway station, at that side exists",
      "grammar_tag": "있어요/없어요 existence",
      "grammar_point_id": "gp_isseoyo_eopseoyo",
      "distractors": [
        "The subway station is far away.",
        "The bus stop is over there.",
        "Where is the subway station?"
      ],
      "word_ids": [
        "w_jihacheollyeok",
        "w_jeojjok",
        "w_isseoyo"
      ],
      "alt_orders": [
        "저쪽에 지하철역은 있어요."
      ],
      "register": "polite",
      "difficulty": 3,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "지하철역은 저쪽에 있어요"
      }
    },
    {
      "id": "place_bus_to_cityhall",
      "unit_id": "u5_places_directions",
      "korean": "버스를 타고 시청에 가요.",
      "romanization": "beoseureul tago sicheonge gayo",
      "english": "I take the bus and go to City Hall.",
      "gloss": [
        {
          "ko": "버스를",
          "rom": "beoseureul",
          "en": "bus + object"
        },
        {
          "ko": "타고",
          "rom": "tago",
          "en": "ride-and"
        },
        {
          "ko": "시청에",
          "rom": "sicheonge",
          "en": "to City Hall"
        },
        {
          "ko": "가요",
          "rom": "gayo",
          "en": "go (polite)"
        }
      ],
      "gloss_literal": "bus ride-and, to City Hall go",
      "grammar_tag": "-고 connective",
      "grammar_point_id": "gp_go_and",
      "distractors": [
        "I walk to City Hall.",
        "I take the subway to City Hall.",
        "I take the bus to the bathroom."
      ],
      "word_ids": [
        "w_beoseu",
        "w_tada",
        "w_sicheong",
        "w_gada"
      ],
      "alt_orders": [
        "시청에 버스를 타고 가요."
      ],
      "register": "polite",
      "difficulty": 3,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "버스를 타고 시청에 가요"
      }
    },
    {
      "id": "place_lost",
      "unit_id": "u5_places_directions",
      "korean": "길을 잃었어요.",
      "romanization": "gireul irheosseoyo",
      "english": "I'm lost.",
      "gloss": [
        {
          "ko": "길을",
          "rom": "gireul",
          "en": "road + object"
        },
        {
          "ko": "잃었어요",
          "rom": "irheosseoyo",
          "en": "lost (past, polite)"
        }
      ],
      "gloss_literal": "I lost the road",
      "grammar_tag": "past tense -았/었어요",
      "grammar_point_id": "gp_past_asseosseoyo",
      "distractors": [
        "I lost my phone.",
        "I'm late.",
        "I found the road."
      ],
      "word_ids": [
        "w_gil",
        "w_irta"
      ],
      "alt_orders": [],
      "register": "polite",
      "difficulty": 2,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "길을 잃었어요"
      }
    },
    {
      "id": "feel_how_are_you",
      "unit_id": "u6_feelings_smalltalk",
      "korean": "요즘 어떻게 지내세요?",
      "romanization": "yojeum eotteoke jinaeseyo",
      "english": "How have you been lately?",
      "gloss": [
        {
          "ko": "요즘",
          "rom": "yojeum",
          "en": "these days"
        },
        {
          "ko": "어떻게",
          "rom": "eotteoke",
          "en": "how"
        },
        {
          "ko": "지내세요",
          "rom": "jinaeseyo",
          "en": "get along / spend time (honorific)"
        }
      ],
      "gloss_literal": "these days, how do you spend [your time]?",
      "grammar_tag": "honorific -시-",
      "grammar_point_id": "gp_si_honorific",
      "distractors": [
        "What are you doing now?",
        "How do I get there?",
        "How old are you?"
      ],
      "word_ids": [
        "w_yojeum",
        "w_eotteoke",
        "w_jinaeda"
      ],
      "alt_orders": [
        "어떻게 요즘 지내세요?"
      ],
      "register": "polite + honorific",
      "difficulty": 3,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "요즘 어떻게 지내세요?"
      }
    },
    {
      "id": "feel_busy_lately",
      "unit_id": "u6_feelings_smalltalk",
      "korean": "저는 요즘 좀 바빠요.",
      "romanization": "jeoneun yojeum jom bappayo",
      "english": "I'm a bit busy these days.",
      "gloss": [
        {
          "ko": "저",
          "rom": "jeo",
          "en": "I (humble)"
        },
        {
          "ko": "는",
          "rom": "neun",
          "en": "topic"
        },
        {
          "ko": "요즘",
          "rom": "yojeum",
          "en": "these days"
        },
        {
          "ko": "좀",
          "rom": "jom",
          "en": "a bit"
        },
        {
          "ko": "바빠요",
          "rom": "bappayo",
          "en": "am busy (polite)"
        }
      ],
      "gloss_literal": "as for me, these days a bit busy",
      "grammar_tag": "polite ending -아요/어요",
      "grammar_point_id": "gp_polite_yo",
      "distractors": [
        "I'm not busy these days.",
        "I was busy yesterday.",
        "I'm a little tired these days."
      ],
      "word_ids": [
        "w_yojeum",
        "w_jom",
        "w_bappeuda"
      ],
      "alt_orders": [
        "요즘 저는 좀 바빠요."
      ],
      "register": "polite",
      "difficulty": 2,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "저는 요즘 좀 바빠요"
      }
    },
    {
      "id": "feel_good_today",
      "unit_id": "u6_feelings_smalltalk",
      "korean": "오늘 기분이 좋아요.",
      "romanization": "oneul gibuni joayo",
      "english": "I feel good today.",
      "gloss": [
        {
          "ko": "오늘",
          "rom": "oneul",
          "en": "today"
        },
        {
          "ko": "기분이",
          "rom": "gibuni",
          "en": "mood + subject"
        },
        {
          "ko": "좋아요",
          "rom": "joayo",
          "en": "is good (polite)"
        }
      ],
      "gloss_literal": "today, the mood is good",
      "grammar_tag": "기분이 좋아요 feeling",
      "grammar_point_id": "gp_gibun_joayo",
      "distractors": [
        "I feel bad today.",
        "The weather is good today.",
        "I was happy yesterday."
      ],
      "word_ids": [
        "w_oneul",
        "w_gibun",
        "w_jota"
      ],
      "alt_orders": [
        "기분이 오늘 좋아요."
      ],
      "register": "polite",
      "difficulty": 1,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "오늘 기분이 좋아요"
      }
    },
    {
      "id": "feel_like_korean_food",
      "unit_id": "u6_feelings_smalltalk",
      "korean": "저는 한국 음식을 좋아해요.",
      "romanization": "jeoneun hanguk eumsigeul joahaeyo",
      "english": "I like Korean food.",
      "gloss": [
        {
          "ko": "저",
          "rom": "jeo",
          "en": "I (humble)"
        },
        {
          "ko": "는",
          "rom": "neun",
          "en": "topic"
        },
        {
          "ko": "한국",
          "rom": "hanguk",
          "en": "Korea"
        },
        {
          "ko": "음식을",
          "rom": "eumsigeul",
          "en": "food + object"
        },
        {
          "ko": "좋아해요",
          "rom": "joahaeyo",
          "en": "like (polite)"
        }
      ],
      "gloss_literal": "as for me, Korean food I like",
      "grammar_tag": "좋아요 vs 좋아해요",
      "grammar_point_id": "gp_joayo_vs_joahaeyo",
      "distractors": [
        "I don't like Korean food.",
        "I like Korean music.",
        "Korean food is delicious."
      ],
      "word_ids": [
        "w_hanguk",
        "w_eumsik",
        "w_joahada"
      ],
      "alt_orders": [
        "한국 음식을 저는 좋아해요."
      ],
      "register": "polite",
      "difficulty": 2,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "저는 한국 음식을 좋아해요"
      }
    },
    {
      "id": "feel_time_tomorrow",
      "unit_id": "u6_feelings_smalltalk",
      "korean": "내일 시간이 있어요?",
      "romanization": "naeil sigani isseoyo",
      "english": "Do you have time tomorrow?",
      "gloss": [
        {
          "ko": "내일",
          "rom": "naeil",
          "en": "tomorrow"
        },
        {
          "ko": "시간이",
          "rom": "sigani",
          "en": "time + subject"
        },
        {
          "ko": "있어요",
          "rom": "isseoyo",
          "en": "exists (polite)"
        }
      ],
      "gloss_literal": "tomorrow, does time exist?",
      "grammar_tag": "시간이 있어요 possession",
      "grammar_point_id": "gp_sigan_isseoyo",
      "distractors": [
        "Do you have time today?",
        "I don't have time tomorrow.",
        "What time is it tomorrow?"
      ],
      "word_ids": [
        "w_naeil",
        "w_sigan",
        "w_isseoyo"
      ],
      "alt_orders": [
        "내일은 시간이 있어요?"
      ],
      "register": "polite",
      "difficulty": 2,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "내일 시간이 있어요?"
      }
    },
    {
      "id": "feel_korean_is_fun",
      "unit_id": "u6_feelings_smalltalk",
      "korean": "저는 한국어가 재미있어요.",
      "romanization": "jeoneun hangugeoga jaemiisseoyo",
      "english": "Korean is fun to me.",
      "gloss": [
        {
          "ko": "저",
          "rom": "jeo",
          "en": "I (humble)"
        },
        {
          "ko": "는",
          "rom": "neun",
          "en": "topic"
        },
        {
          "ko": "한국어가",
          "rom": "hangugeoga",
          "en": "Korean + subject"
        },
        {
          "ko": "재미있어요",
          "rom": "jaemiisseoyo",
          "en": "is fun (polite)"
        }
      ],
      "gloss_literal": "as for me, Korean is fun",
      "grammar_tag": "은/는 vs 이/가",
      "grammar_point_id": "gp_topic_eun_neun",
      "distractors": [
        "Korean is difficult for me.",
        "I am fun.",
        "Korean is not fun."
      ],
      "word_ids": [
        "w_hangugeo",
        "w_jaemiitda"
      ],
      "alt_orders": [
        "한국어가 저는 재미있어요."
      ],
      "register": "polite",
      "difficulty": 3,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "저는 한국어가 재미있어요"
      }
    },
    {
      "id": "wrap_say_again",
      "unit_id": "u7_wrap_up",
      "korean": "다시 한번 말씀해 주세요.",
      "romanization": "dasi hanbeon malsseumhae juseyo",
      "english": "Please say that one more time.",
      "gloss": [
        {
          "ko": "다시",
          "rom": "dasi",
          "en": "again"
        },
        {
          "ko": "한번",
          "rom": "hanbeon",
          "en": "one time"
        },
        {
          "ko": "말씀해",
          "rom": "malsseumhae",
          "en": "speak (honorific)"
        },
        {
          "ko": "주세요",
          "rom": "juseyo",
          "en": "please do for me"
        }
      ],
      "gloss_literal": "again one time, speak, please do for me",
      "grammar_tag": "-아/어 주세요 request",
      "grammar_point_id": "gp_ha_juseyo",
      "distractors": [
        "Please speak more loudly.",
        "Please write it down.",
        "Please say it in English."
      ],
      "word_ids": [
        "w_dasi",
        "w_hanbeon",
        "w_malsseumhada",
        "w_juseyo"
      ],
      "alt_orders": [
        "한번 다시 말씀해 주세요."
      ],
      "register": "polite + honorific",
      "difficulty": 3,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "다시 한번 말씀해 주세요"
      }
    },
    {
      "id": "wrap_speak_slowly",
      "unit_id": "u7_wrap_up",
      "korean": "천천히 말해 주세요.",
      "romanization": "cheoncheonhi malhae juseyo",
      "english": "Please speak slowly.",
      "gloss": [
        {
          "ko": "천천히",
          "rom": "cheoncheonhi",
          "en": "slowly"
        },
        {
          "ko": "말해",
          "rom": "malhae",
          "en": "speak"
        },
        {
          "ko": "주세요",
          "rom": "juseyo",
          "en": "please do for me"
        }
      ],
      "gloss_literal": "slowly, speak, please do for me",
      "grammar_tag": "-아/어 주세요 request",
      "grammar_point_id": "gp_ha_juseyo",
      "distractors": [
        "Please speak faster.",
        "Please listen carefully.",
        "Please say it again."
      ],
      "word_ids": [
        "w_cheoncheonhi",
        "w_malhada",
        "w_juseyo"
      ],
      "alt_orders": [
        "말해 주세요, 천천히."
      ],
      "register": "polite",
      "difficulty": 1,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "천천히 말해 주세요"
      }
    },
    {
      "id": "wrap_not_good",
      "unit_id": "u7_wrap_up",
      "korean": "저는 아직 잘 못해요.",
      "romanization": "jeoneun ajik jal mothaeyo",
      "english": "I'm still not good at it.",
      "gloss": [
        {
          "ko": "저",
          "rom": "jeo",
          "en": "I (humble)"
        },
        {
          "ko": "는",
          "rom": "neun",
          "en": "topic"
        },
        {
          "ko": "아직",
          "rom": "ajik",
          "en": "still / yet"
        },
        {
          "ko": "잘",
          "rom": "jal",
          "en": "well"
        },
        {
          "ko": "못해요",
          "rom": "mothaeyo",
          "en": "cannot do (polite)"
        }
      ],
      "gloss_literal": "as for me, still, well, cannot do",
      "grammar_tag": "아직 + 잘 못해요",
      "grammar_point_id": "gp_ajik_jal_mothaeyo",
      "distractors": [
        "I'm good at it now.",
        "I don't like it.",
        "I'm still learning."
      ],
      "word_ids": [
        "w_ajik",
        "w_jal",
        "w_mot"
      ],
      "alt_orders": [
        "아직 저는 잘 못해요."
      ],
      "register": "polite",
      "difficulty": 2,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "저는 아직 잘 못해요"
      }
    },
    {
      "id": "wrap_had_fun",
      "unit_id": "u7_wrap_up",
      "korean": "오늘 정말 즐거웠어요.",
      "romanization": "oneul jeongmal jeulgeowosseoyo",
      "english": "I really had fun today.",
      "gloss": [
        {
          "ko": "오늘",
          "rom": "oneul",
          "en": "today"
        },
        {
          "ko": "정말",
          "rom": "jeongmal",
          "en": "really"
        },
        {
          "ko": "즐거웠어요",
          "rom": "jeulgeowosseoyo",
          "en": "was enjoyable (past, polite)"
        }
      ],
      "gloss_literal": "today, really, it was enjoyable",
      "grammar_tag": "past tense review",
      "grammar_point_id": "gp_past_review",
      "distractors": [
        "Today was boring.",
        "I had fun yesterday.",
        "Today I was very busy."
      ],
      "word_ids": [
        "w_oneul",
        "w_jeongmal",
        "w_jeulgeopda"
      ],
      "alt_orders": [
        "정말 오늘 즐거웠어요."
      ],
      "register": "polite",
      "difficulty": 2,
      "audio": {
        "lang": "ko-KR",
        "rate": 0.85,
        "text": "오늘 정말 즐거웠어요"
      }
    }
  ],
  "words": [
    {
      "id": "w_annyeong",
      "korean": "안녕",
      "romanization": "annyeong",
      "english": "peace / well-being (hi)",
      "pos": "interj",
      "unit_id": "u1_greetings",
      "word_card": true
    },
    {
      "id": "w_gamsa",
      "korean": "감사",
      "romanization": "gamsa",
      "english": "thanks",
      "pos": "noun",
      "unit_id": "u1_greetings",
      "word_card": true
    },
    {
      "id": "w_joesong",
      "korean": "죄송",
      "romanization": "joesong",
      "english": "apology",
      "pos": "noun",
      "unit_id": "u1_greetings",
      "word_card": false
    },
    {
      "id": "w_ne",
      "korean": "네",
      "romanization": "ne",
      "english": "yes (also: I hear you)",
      "pos": "interj",
      "unit_id": "u1_greetings",
      "word_card": true
    },
    {
      "id": "w_aniyo",
      "korean": "아니요",
      "romanization": "aniyo",
      "english": "no",
      "pos": "interj",
      "unit_id": "u1_greetings",
      "word_card": true
    },
    {
      "id": "w_gwaenchanta",
      "korean": "괜찮다",
      "romanization": "gwaenchanta",
      "english": "to be okay / fine",
      "pos": "adj",
      "unit_id": "u1_greetings",
      "word_card": true
    },
    {
      "id": "w_jeo",
      "korean": "저",
      "romanization": "jeo",
      "english": "I / me (humble)",
      "pos": "pron",
      "unit_id": "u2_introducing_yourself",
      "word_card": true
    },
    {
      "id": "w_ireum",
      "korean": "이름",
      "romanization": "ireum",
      "english": "name",
      "pos": "noun",
      "unit_id": "u2_introducing_yourself",
      "word_card": true
    },
    {
      "id": "w_haksaeng",
      "korean": "학생",
      "romanization": "haksaeng",
      "english": "student",
      "pos": "noun",
      "unit_id": "u2_introducing_yourself",
      "word_card": true
    },
    {
      "id": "w_saram",
      "korean": "사람",
      "romanization": "saram",
      "english": "person",
      "pos": "noun",
      "unit_id": "u2_introducing_yourself",
      "word_card": false
    },
    {
      "id": "w_miguk",
      "korean": "미국",
      "romanization": "miguk",
      "english": "the USA",
      "pos": "noun",
      "unit_id": "u2_introducing_yourself",
      "word_card": false
    },
    {
      "id": "w_hangugeo",
      "korean": "한국어",
      "romanization": "hangugeo",
      "english": "Korean (language)",
      "pos": "noun",
      "unit_id": "u2_introducing_yourself",
      "word_card": true
    },
    {
      "id": "w_gongbuhada",
      "korean": "공부하다",
      "romanization": "gongbuhada",
      "english": "to study",
      "pos": "verb",
      "unit_id": "u2_introducing_yourself",
      "word_card": true
    },
    {
      "id": "w_jogeum",
      "korean": "조금",
      "romanization": "jogeum",
      "english": "a little",
      "pos": "adv",
      "unit_id": "u2_introducing_yourself",
      "word_card": false
    },
    {
      "id": "w_bangapda",
      "korean": "반갑다",
      "romanization": "bangapda",
      "english": "to be glad to meet",
      "pos": "adj",
      "unit_id": "u2_introducing_yourself",
      "word_card": false
    },
    {
      "id": "w_igeo",
      "korean": "이거",
      "romanization": "igeo",
      "english": "this thing",
      "pos": "pron",
      "unit_id": "u3_food_ordering",
      "word_card": true
    },
    {
      "id": "w_eolma",
      "korean": "얼마",
      "romanization": "eolma",
      "english": "how much",
      "pos": "pron",
      "unit_id": "u3_food_ordering",
      "word_card": true
    },
    {
      "id": "w_gimchijjigae",
      "korean": "김치찌개",
      "romanization": "kimchijjigae",
      "english": "kimchi stew",
      "pos": "noun",
      "unit_id": "u3_food_ordering",
      "word_card": false
    },
    {
      "id": "w_hana",
      "korean": "하나",
      "romanization": "hana",
      "english": "one (native number)",
      "pos": "num",
      "unit_id": "u3_food_ordering",
      "word_card": false
    },
    {
      "id": "w_mul",
      "korean": "물",
      "romanization": "mul",
      "english": "water",
      "pos": "noun",
      "unit_id": "u3_food_ordering",
      "word_card": true
    },
    {
      "id": "w_masitda",
      "korean": "맛있다",
      "romanization": "masitda",
      "english": "to be delicious",
      "pos": "adj",
      "unit_id": "u3_food_ordering",
      "word_card": true
    },
    {
      "id": "w_juseyo",
      "korean": "주세요",
      "romanization": "juseyo",
      "english": "please give (me)",
      "pos": "chunk",
      "unit_id": "u3_food_ordering",
      "word_card": true
    },
    {
      "id": "w_gyesanseo",
      "korean": "계산서",
      "romanization": "gyesanseo",
      "english": "bill / check",
      "pos": "noun",
      "unit_id": "u3_food_ordering",
      "word_card": true
    },
    {
      "id": "w_maeun",
      "korean": "매운",
      "romanization": "maeun",
      "english": "spicy",
      "pos": "adj",
      "unit_id": "u3_food_ordering",
      "word_card": false
    },
    {
      "id": "w_eumsik",
      "korean": "음식",
      "romanization": "eumsik",
      "english": "food",
      "pos": "noun",
      "unit_id": "u3_food_ordering",
      "word_card": true
    },
    {
      "id": "w_jom",
      "korean": "좀",
      "romanization": "jom",
      "english": "a little / please",
      "pos": "adv",
      "unit_id": "u3_food_ordering",
      "word_card": false
    },
    {
      "id": "w_achim",
      "korean": "아침",
      "romanization": "achim",
      "english": "morning / breakfast",
      "pos": "noun",
      "unit_id": "u4_daily_routine",
      "word_card": true
    },
    {
      "id": "w_ilgop",
      "korean": "일곱",
      "romanization": "ilgop",
      "english": "seven (native number)",
      "pos": "num",
      "unit_id": "u4_daily_routine",
      "word_card": false
    },
    {
      "id": "w_si",
      "korean": "시",
      "romanization": "si",
      "english": "o'clock",
      "pos": "counter",
      "unit_id": "u4_daily_routine",
      "word_card": true
    },
    {
      "id": "w_ireonada",
      "korean": "일어나다",
      "romanization": "ireonada",
      "english": "to get up",
      "pos": "verb",
      "unit_id": "u4_daily_routine",
      "word_card": false
    },
    {
      "id": "w_meokda",
      "korean": "먹다",
      "romanization": "meokda",
      "english": "to eat",
      "pos": "verb",
      "unit_id": "u4_daily_routine",
      "word_card": true
    },
    {
      "id": "w_hakgyo",
      "korean": "학교",
      "romanization": "hakgyo",
      "english": "school",
      "pos": "noun",
      "unit_id": "u4_daily_routine",
      "word_card": true
    },
    {
      "id": "w_gada",
      "korean": "가다",
      "romanization": "gada",
      "english": "to go",
      "pos": "verb",
      "unit_id": "u4_daily_routine",
      "word_card": true
    },
    {
      "id": "w_maeil",
      "korean": "매일",
      "romanization": "maeil",
      "english": "every day",
      "pos": "adv",
      "unit_id": "u4_daily_routine",
      "word_card": false
    },
    {
      "id": "w_oneul",
      "korean": "오늘",
      "romanization": "oneul",
      "english": "today",
      "pos": "noun",
      "unit_id": "u4_daily_routine",
      "word_card": true
    },
    {
      "id": "w_nalssi",
      "korean": "날씨",
      "romanization": "nalssi",
      "english": "weather",
      "pos": "noun",
      "unit_id": "u4_daily_routine",
      "word_card": false
    },
    {
      "id": "w_jota",
      "korean": "좋다",
      "romanization": "jota",
      "english": "to be good",
      "pos": "adj",
      "unit_id": "u4_daily_routine",
      "word_card": true
    },
    {
      "id": "w_eoje",
      "korean": "어제",
      "romanization": "eoje",
      "english": "yesterday",
      "pos": "noun",
      "unit_id": "u4_daily_routine",
      "word_card": true
    },
    {
      "id": "w_chingu",
      "korean": "친구",
      "romanization": "chingu",
      "english": "friend",
      "pos": "noun",
      "unit_id": "u4_daily_routine",
      "word_card": true
    },
    {
      "id": "w_mannada",
      "korean": "만나다",
      "romanization": "mannada",
      "english": "to meet",
      "pos": "verb",
      "unit_id": "u4_daily_routine",
      "word_card": false
    },
    {
      "id": "w_botong",
      "korean": "보통",
      "romanization": "botong",
      "english": "usually",
      "pos": "adv",
      "unit_id": "u4_daily_routine",
      "word_card": false
    },
    {
      "id": "w_yeolhana",
      "korean": "열한",
      "romanization": "yeolhan",
      "english": "eleven (native number)",
      "pos": "num",
      "unit_id": "u4_daily_routine",
      "word_card": false
    },
    {
      "id": "w_jada",
      "korean": "자다",
      "romanization": "jada",
      "english": "to sleep",
      "pos": "verb",
      "unit_id": "u4_daily_routine",
      "word_card": true
    },
    {
      "id": "w_hwajangsil",
      "korean": "화장실",
      "romanization": "hwajangsil",
      "english": "bathroom",
      "pos": "noun",
      "unit_id": "u5_places_directions",
      "word_card": true
    },
    {
      "id": "w_eodi",
      "korean": "어디",
      "romanization": "eodi",
      "english": "where",
      "pos": "pron",
      "unit_id": "u5_places_directions",
      "word_card": true
    },
    {
      "id": "w_oenjjok",
      "korean": "왼쪽",
      "romanization": "oenjjok",
      "english": "left side",
      "pos": "noun",
      "unit_id": "u5_places_directions",
      "word_card": false
    },
    {
      "id": "w_gakkapda",
      "korean": "가깝다",
      "romanization": "gakkapda",
      "english": "to be near",
      "pos": "adj",
      "unit_id": "u5_places_directions",
      "word_card": false
    },
    {
      "id": "w_jihacheollyeok",
      "korean": "지하철역",
      "romanization": "jihacheollyeok",
      "english": "subway station",
      "pos": "noun",
      "unit_id": "u5_places_directions",
      "word_card": false
    },
    {
      "id": "w_jeojjok",
      "korean": "저쪽",
      "romanization": "jeojjok",
      "english": "that side / over there",
      "pos": "noun",
      "unit_id": "u5_places_directions",
      "word_card": false
    },
    {
      "id": "w_beoseu",
      "korean": "버스",
      "romanization": "beoseu",
      "english": "bus",
      "pos": "noun",
      "unit_id": "u5_places_directions",
      "word_card": false
    },
    {
      "id": "w_tada",
      "korean": "타다",
      "romanization": "tada",
      "english": "to ride / take",
      "pos": "verb",
      "unit_id": "u5_places_directions",
      "word_card": false
    },
    {
      "id": "w_sicheong",
      "korean": "시청",
      "romanization": "sicheong",
      "english": "city hall",
      "pos": "noun",
      "unit_id": "u5_places_directions",
      "word_card": false
    },
    {
      "id": "w_gil",
      "korean": "길",
      "romanization": "gil",
      "english": "road / way",
      "pos": "noun",
      "unit_id": "u5_places_directions",
      "word_card": false
    },
    {
      "id": "w_irta",
      "korean": "잃다",
      "romanization": "irta",
      "english": "to lose",
      "pos": "verb",
      "unit_id": "u5_places_directions",
      "word_card": false
    },
    {
      "id": "w_isseoyo",
      "korean": "있어요",
      "romanization": "isseoyo",
      "english": "there is / I have",
      "pos": "chunk",
      "unit_id": "u5_places_directions",
      "word_card": true
    },
    {
      "id": "w_yojeum",
      "korean": "요즘",
      "romanization": "yojeum",
      "english": "these days / lately",
      "pos": "adv",
      "unit_id": "u6_feelings_smalltalk",
      "word_card": true
    },
    {
      "id": "w_eotteoke",
      "korean": "어떻게",
      "romanization": "eotteoke",
      "english": "how",
      "pos": "adv",
      "unit_id": "u6_feelings_smalltalk",
      "word_card": false
    },
    {
      "id": "w_jinaeda",
      "korean": "지내다",
      "romanization": "jinaeda",
      "english": "to get along / spend time",
      "pos": "verb",
      "unit_id": "u6_feelings_smalltalk",
      "word_card": false
    },
    {
      "id": "w_bappeuda",
      "korean": "바쁘다",
      "romanization": "bappeuda",
      "english": "to be busy",
      "pos": "adj",
      "unit_id": "u6_feelings_smalltalk",
      "word_card": true
    },
    {
      "id": "w_gibun",
      "korean": "기분",
      "romanization": "gibun",
      "english": "mood / feeling",
      "pos": "noun",
      "unit_id": "u6_feelings_smalltalk",
      "word_card": true
    },
    {
      "id": "w_naeil",
      "korean": "내일",
      "romanization": "naeil",
      "english": "tomorrow",
      "pos": "noun",
      "unit_id": "u6_feelings_smalltalk",
      "word_card": false
    },
    {
      "id": "w_sigan",
      "korean": "시간",
      "romanization": "sigan",
      "english": "time",
      "pos": "noun",
      "unit_id": "u6_feelings_smalltalk",
      "word_card": true
    },
    {
      "id": "w_jaemiitda",
      "korean": "재미있다",
      "romanization": "jaemiitda",
      "english": "to be fun / interesting",
      "pos": "adj",
      "unit_id": "u6_feelings_smalltalk",
      "word_card": false
    },
    {
      "id": "w_joahada",
      "korean": "좋아하다",
      "romanization": "joahada",
      "english": "to like",
      "pos": "verb",
      "unit_id": "u6_feelings_smalltalk",
      "word_card": false
    },
    {
      "id": "w_hanguk",
      "korean": "한국",
      "romanization": "hanguk",
      "english": "Korea",
      "pos": "noun",
      "unit_id": "u6_feelings_smalltalk",
      "word_card": false
    },
    {
      "id": "w_dasi",
      "korean": "다시",
      "romanization": "dasi",
      "english": "again",
      "pos": "adv",
      "unit_id": "u7_wrap_up",
      "word_card": true
    },
    {
      "id": "w_hanbeon",
      "korean": "한번",
      "romanization": "hanbeon",
      "english": "one time",
      "pos": "adv",
      "unit_id": "u7_wrap_up",
      "word_card": false
    },
    {
      "id": "w_malsseumhada",
      "korean": "말씀하다",
      "romanization": "malsseumhada",
      "english": "to speak (honorific)",
      "pos": "verb",
      "unit_id": "u7_wrap_up",
      "word_card": false
    },
    {
      "id": "w_malhada",
      "korean": "말하다",
      "romanization": "malhada",
      "english": "to speak / say",
      "pos": "verb",
      "unit_id": "u7_wrap_up",
      "word_card": false
    },
    {
      "id": "w_cheoncheonhi",
      "korean": "천천히",
      "romanization": "cheoncheonhi",
      "english": "slowly",
      "pos": "adv",
      "unit_id": "u7_wrap_up",
      "word_card": true
    },
    {
      "id": "w_ajik",
      "korean": "아직",
      "romanization": "ajik",
      "english": "still / yet",
      "pos": "adv",
      "unit_id": "u7_wrap_up",
      "word_card": true
    },
    {
      "id": "w_jal",
      "korean": "잘",
      "romanization": "jal",
      "english": "well",
      "pos": "adv",
      "unit_id": "u7_wrap_up",
      "word_card": false
    },
    {
      "id": "w_mot",
      "korean": "못",
      "romanization": "mot",
      "english": "cannot",
      "pos": "adv",
      "unit_id": "u7_wrap_up",
      "word_card": true
    },
    {
      "id": "w_jeulgeopda",
      "korean": "즐겁다",
      "romanization": "jeulgeopda",
      "english": "to be enjoyable / fun",
      "pos": "adj",
      "unit_id": "u7_wrap_up",
      "word_card": false
    },
    {
      "id": "w_jeongmal",
      "korean": "정말",
      "romanization": "jeongmal",
      "english": "really",
      "pos": "adv",
      "unit_id": "u7_wrap_up",
      "word_card": false
    }
  ],
  "exercise_types": [
    {
      "id": "build_sentence",
      "name": "Build the sentence",
      "rank": 1,
      "primary_skill": "syntax + active production",
      "retention_value": 5,
      "seconds_per_item": 18,
      "session_share_pct": 30,
      "screen": "English prompt + speaker button on top, an empty slot row, and a tray of Korean word tiles (particles attached to nouns).",
      "correct_when": "Tile order equals korean (or an accepted alt_order / particle-drop variant).",
      "typo_policy": "Not possible - tiles are tapped, not typed. This is why it has the highest completion rate of any production exercise.",
      "feedback": "Wrong: lock the correct prefix in green, return the rest to the tray, one retry. Second failure: assemble the answer, play it at 0.7x, show a one-line reason tied to grammar_tag.",
      "gotcha": "Korean puts the verb LAST. English speakers drop it third. Time and place may float; the verb may not."
    },
    {
      "id": "type_korean",
      "name": "Type the Korean",
      "rank": 2,
      "primary_skill": "free recall + spelling",
      "retention_value": 5,
      "seconds_per_item": 20,
      "session_share_pct": 15,
      "screen": "English + speaker + a single text field with the Korean IME expected. On mobile, a jamo strip (ㄱ ㄴ ㄷ ...) sits above the keyboard.",
      "correct_when": "NFC-normalized, whitespace and punctuation stripped, the input equals korean or an accepted alt_order.",
      "typo_policy": "Levenshtein on syllables AFTER normalization: distance 0 = correct (Good); distance 1 = 'almost', accepted with a syllable diff and graded Hard; distance >= 2 = incorrect, answer revealed after a second try. Particle-only slips (을/를, 은/는, 에/에서) are never treated as typos - they are graded Hard and get the particle rule card.",
      "feedback": "Character-level diff; wrong syllables in amber, never red. Audio replays automatically once. A 'why' chip opens the 6-word grammar rule.",
      "gotcha": "Final consonants change which particle you need. Typing the right word with the wrong particle is a grammar error, not a typo."
    },
    {
      "id": "listen_choose_meaning",
      "name": "Listen & choose the meaning",
      "rank": 3,
      "primary_skill": "listening comprehension",
      "retention_value": 4,
      "seconds_per_item": 10,
      "session_share_pct": 20,
      "screen": "One large speaker button (auto-plays once on mount), 4 English options, romanization hidden until answered.",
      "correct_when": "Exactly one option matches the sentence's english meaning.",
      "typo_policy": "Not applicable.",
      "feedback": "Correct: Korean + gloss appear, sentence replays. Wrong: the chosen option reveals which word fooled you ('you picked yesterday - 어제 is yesterday; this one was 오늘, today').",
      "gotcha": "Distractors are built from the sentence's own traps: flipped negation, flipped tense, swapped subject, or a near-synonym verb."
    },
    {
      "id": "translate_wordbank",
      "name": "Translate this (word bank)",
      "rank": 4,
      "primary_skill": "cued production",
      "retention_value": 4,
      "seconds_per_item": 16,
      "session_share_pct": 10,
      "screen": "English prompt, no slot row, 6-8 tiles including 2 decoys drawn from the same unit.",
      "correct_when": "Assembled tokens equal the target (any accepted order) and no decoy is used.",
      "typo_policy": "Not applicable. A used decoy gets specific feedback ('못 = cannot, not don't').",
      "feedback": "On success, animate the alignment between English chunks and Korean tokens so the mapping is visible, then play audio once.",
      "gotcha": "Decoys are always grammar-adjacent (안 vs 못, 은 vs 가), never random noise."
    },
    {
      "id": "speak_it",
      "name": "Speak it (self-assess)",
      "rank": 5,
      "primary_skill": "pronunciation + fluency",
      "retention_value": 3,
      "seconds_per_item": 12,
      "session_share_pct": 10,
      "screen": "Sentence + speaker + a large mic button. Recording is optional and never uploaded.",
      "correct_when": "Path A (SpeechRecognition ko-KR available): transcript compared to target, <40% syllable match = 'try again' with no penalty, >=40% = 'sounds close' then self-rate. Path B (no recognition): say it out loud, reveal, self-rate Again/Hard/Good.",
      "typo_policy": "Pronunciation is never graded 'wrong' in the MVP. Speech recognition is noisy on purpose - the app only nudges.",
      "feedback": "Syllable-by-syllable highlight synced to the audio, plus one targeted tip from the pronunciation trap list when the transcript shows a known collapse (감사합니다 -> '감사함니다').",
      "gotcha": "Self-assessment is a real SRS signal: users who self-rate 'again' genuinely need the item sooner. Do not silently override it."
    },
    {
      "id": "fill_particle",
      "name": "Fill the particle",
      "rank": 6,
      "primary_skill": "grammar precision",
      "retention_value": 3,
      "seconds_per_item": 8,
      "session_share_pct": 5,
      "screen": "Sentence with one blank, 3 particle chips (correct + 2 from the same family).",
      "correct_when": "The single correct particle.",
      "typo_policy": "Not applicable.",
      "feedback": "On wrong, highlight the noun's final letter and the rule ('학생 ends in a consonant -> 은 / 이에요'). Rule text is capped at 8 words.",
      "gotcha": "This is the exercise that fixes the Korean-only problem: you must look at the LAST letter of the noun, not the word's meaning."
    },
    {
      "id": "minimal_pair",
      "name": "Minimal-pair listening",
      "rank": 7,
      "primary_skill": "sound discrimination",
      "retention_value": 2,
      "seconds_per_item": 8,
      "session_share_pct": 5,
      "screen": "Two speaker buttons, A and B, no text. Prompt: 'Which did you hear?'",
      "correct_when": "The clip that was actually played.",
      "typo_policy": "Not applicable.",
      "feedback": "Reveal both at 0.55x with the differing syllable bolded, then play the target sentence in context once.",
      "gotcha": "Only use pairs that the 40 sentences actually contain: 물/불, 살/쌀, 시청/시정, 잃었어요/이렀어요. No invented pairs."
    },
    {
      "id": "matching_pairs",
      "name": "Matching pairs",
      "rank": 8,
      "primary_skill": "fast recognition",
      "retention_value": 2,
      "seconds_per_item": 12,
      "session_share_pct": 5,
      "screen": "5 Korean tiles on the left, 5 English on the right, both shuffled. Tap to match.",
      "correct_when": "All 5 pairs matched. Errors are tracked for the session summary but do not move SRS intervals.",
      "typo_policy": "Not applicable.",
      "feedback": "Wrong pair shakes and stays. On solve, one audio pass over all five in order.",
      "gotcha": "Best as a warm-up or a boss-round breather. Never used to introduce a new sentence."
    }
  ],
  "srs": {
    "algorithm": "sm2_lite",
    "why_not_fsrs": "FSRS needs thousands of review logs and per-user parameter fitting to beat SM-2. At 40 items and 3-5 minute sessions, SM-2-lite captures most of the benefit in ~30 lines of code. Swap to FSRS in v1.1 once there is review history.",
    "state_fields": [
      "item_id",
      "reps",
      "lapses",
      "ease",
      "interval_days",
      "due_at",
      "last_reviewed_at",
      "last_grade",
      "mode"
    ],
    "modes": [
      "new",
      "learning",
      "review",
      "leech"
    ],
    "constants": {
      "ease_start": 2.5,
      "ease_min": 1.3,
      "ease_max": 3.0,
      "graduating_interval_days": 1,
      "easy_interval_days": 3,
      "relearn_minutes": 10,
      "max_interval_days": 180,
      "fuzz_pct": 5,
      "day_cutoff_local": "04:00",
      "leech_lapses": 4,
      "leech_max_interval_days": 2
    },
    "grades": {
      "again": {
        "ease_delta": -0.2,
        "interval": "0 (10 minutes)",
        "reps": 0,
        "lapses": "+1",
        "requeue_after_items": 4,
        "max_requeues_per_session": 2
      },
      "hard": {
        "ease_delta": -0.15,
        "interval": "max(1, round(current * 1.2)) days",
        "reps": "+1",
        "lapses": 0,
        "requeue_after_items": null,
        "max_requeues_per_session": 0
      },
      "good": {
        "ease_delta": 0.0,
        "interval": "reps 0 -> 1d; reps 1 -> 3d; else round(current * ease)",
        "reps": "+1",
        "lapses": 0,
        "requeue_after_items": null,
        "max_requeues_per_session": 0
      },
      "easy": {
        "ease_delta": 0.15,
        "interval": "reps 0 -> 3d; reps 1 -> 4d; else round(current * ease * 1.3)",
        "reps": "+1",
        "lapses": 0,
        "requeue_after_items": null,
        "max_requeues_per_session": 0
      }
    },
    "clamps": {
      "ease": [
        1.3,
        3.0
      ],
      "interval_days": [
        1,
        180
      ],
      "fuzz": "interval = round(interval * random(0.95, 1.05)) before clamping, so reviews do not stack on one day"
    },
    "due_rule": "If interval < 1 day -> due_at = now + 10 min. Otherwise due_at = 04:00 local on (today + interval) so a day's reviews batch at the daily reset.",
    "mastery_rule": "interval_days >= 21 AND reps >= 4 -> 'mastered' badge. Mastered items keep being reviewed, just less often.",
    "leech_rule": "lapses >= 4 -> mode='leech', interval capped at 2 days, and the item renders as a trouble card (sentence + literal + audio + one minimal pair). Leaves leech after 2 consecutive 'good'.",
    "session_mixing": {
      "target_items_default": 14,
      "target_items_max": 20,
      "new_share_target": 0.3,
      "new_quota_formula": "new = clamp(round(0.3 * target_items), 0, 6); review = target_items - new",
      "backlog_rule": "if due_count > target_items -> new = 0 and show a 'catch-up' banner",
      "adaptive_rule": "last session accuracy < 70% -> new = 3; >= 90% and median latency < 8s -> new = 6 (never above 6)",
      "no_new_at_end_rule": "no first-exposure item may be scheduled in the last 25% of a session",
      "order_recipe": [
        "2 warm-up reviews (ease >= 2.5)",
        "alternate 2 reviews : 1 new",
        "no 3 consecutive items of the same exercise type",
        "no 2 consecutive new sentences",
        "final item = 1 review the user got right last time"
      ]
    }
  },
  "audio": {
    "engine": "window.speechSynthesis + SpeechSynthesisUtterance",
    "feature_detect": "'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window",
    "voice_selection": {
      "steps": [
        "voices = speechSynthesis.getVoices(); if empty, wait for 'voiceschanged' with a 1500ms timeout",
        "prefer voice.lang === 'ko-KR', then any voice.lang starting with 'ko'",
        "tie-break by name score: +3 for Yuna / Google / Microsoft / Heami / Sora",
        "cache the resolved voice for the session"
      ],
      "fallback": "If no ko voice exists, audio is unavailable - see degradation matrix."
    },
    "utterance_defaults": {
      "lang": "ko-KR",
      "rate": 0.85,
      "pitch": 1.0,
      "volume": 1.0
    },
    "rate_options": {
      "sentence": 0.85,
      "word_card": 0.7,
      "slow_replay": 0.55,
      "normal_replay": 1.0
    },
    "autoplay_policy": "Browsers block speech before a user gesture. The first screen has one 'tap to start' button that also plays a silent utterance, unlocking audio for the session. Every later auto-play is allowed.",
    "interaction": "Speaker button = replay. Long-press = 0.55x. Double-tap = 1.0x. Never queue more than one utterance: always speechSynthesis.cancel() before speak().",
    "pronunciation_traps": [
      {
        "korean": "감사합니다",
        "sounds_like": "감사함니다",
        "note": "ㅂ before ㄴ becomes ㅁ"
      },
      {
        "korean": "맛있어요",
        "sounds_like": "마시써요",
        "note": "ㅅ + 이 palatalizes; ㅆ is tense"
      },
      {
        "korean": "괜찮아요",
        "sounds_like": "괜차나요",
        "note": "ㄶ drops to ㄴ"
      },
      {
        "korean": "좋아요",
        "sounds_like": "조아요",
        "note": "ㅎ goes silent between vowels"
      },
      {
        "korean": "지하철역",
        "sounds_like": "지하철력",
        "note": "ㄹ + ㅇ nasalizes to ㄹㄹ"
      }
    ],
    "degradation": [
      {
        "situation": "speechSynthesis missing",
        "behaviour": "Hide all speaker icons. Show a one-time 'audio unavailable' chip. Listening exercises swap to 'read this, then choose the meaning' with romanization shown. No SRS penalty; the item grades at most Good."
      },
      {
        "situation": "no ko-KR / ko voice",
        "behaviour": "Same as above, plus a single toast: 'No Korean voice on this device - Chrome usually has one, or add Korean in your OS speech settings.'"
      },
      {
        "situation": "onstart never fires within 1200ms",
        "behaviour": "Treat the play as failed, show the text fallback button, and log one telemetry event per session (not per play)."
      },
      {
        "situation": "tab muted / user in silent mode",
        "behaviour": "Nothing to detect reliably; the text + romanization fallback is always one tap away."
      }
    ],
    "romanization": {
      "modes": [
        "always",
        "auto",
        "never"
      ],
      "storage_key": "sk.romanization",
      "default": "always for units 1-2; auto from the first session of unit 3",
      "auto_behaviour": "Once an item has been answered correctly twice, its romanization collapses into a small chip that expands on tap (spaced fading).",
      "hidden_during": [
        "listen_choose_meaning (before answering)",
        "minimal_pair",
        "type_korean (until submitted)"
      ],
      "tile_behaviour": "In build-the-sentence the romanization appears only while a tile is long-pressed.",
      "rationale": "Romanization is a crutch that competes with Hangul for attention. Fade it, do not delete it - beginners panic when it vanishes overnight."
    }
  },
  "session": {
    "duration_target_seconds": [
      180,
      300
    ],
    "items_default": 14,
    "items_max": 20,
    "seconds_per_item_avg": 14,
    "blocks": [
      {
        "t": "0:00-0:20",
        "name": "Continue screen",
        "detail": "Due count, streak, one primary button. No menu, no settings."
      },
      {
        "t": "0:20-0:50",
        "name": "Warm-up",
        "detail": "2 review items, recognition-only (listen & choose or matching). Guaranteed-nice start."
      },
      {
        "t": "0:50-2:30",
        "name": "Core block 1",
        "detail": "5-7 items. New sentences get a 12s intro card (hear + meaning + one gloss line) then 2 production touches."
      },
      {
        "t": "2:30-2:45",
        "name": "Micro-reward",
        "detail": "1s combo flash + streak tick. No screen change, no interruption."
      },
      {
        "t": "2:45-4:20",
        "name": "Core block 2",
        "detail": "5-7 items, production-heavy (build / type / speak). Hard items resurface here."
      },
      {
        "t": "4:20-4:40",
        "name": "Close",
        "detail": "Hard-item resurface if pending, then 1 review the user already knows well."
      },
      {
        "t": "4:40-5:00",
        "name": "Summary",
        "detail": "Items practiced, accuracy, best combo, words unlocked, the one sentence to watch, when it returns, unit map."
      }
    ],
    "new_item_intro": {
      "seconds": 12,
      "touches": [
        "hear it + read the English",
        "build it from tiles",
        "listen & choose (or speak it)"
      ],
      "rule": "A new sentence never gets its first exposure inside a multiple-choice quiz. It is always shown, then produced."
    },
    "exercise_switching": {
      "rule_1": "No 3 consecutive items of the same exercise type.",
      "rule_2": "An item is never re-tested in the same exercise type twice in a row.",
      "rule_3": "Recognition exercises occupy the first 40% of the session; production the back 60%.",
      "rule_4": "Every sentence sees at least 3 different exercise types across its lifetime."
    },
    "hard_item_resurface": {
      "trigger": "grade 'again'",
      "returns_after": "exactly 4 intervening items",
      "modality": "always a DIFFERENT exercise type (build -> type; type -> speak; speak -> build)",
      "second_failure": "does not return this session; pinned as the first item of tomorrow's session and shown in the summary"
    },
    "summary_screen": {
      "numbers": [
        "sentences practiced",
        "accuracy %",
        "best combo",
        "new words unlocked"
      ],
      "one_thing": "The single sentence with the lowest recall today, with a 1-tap 'practice now' (optional, never forced).",
      "next_due": "Plain language: 'You'll see these 6 again tomorrow.'",
      "progress": "The 7-node unit map with the current node pulsing.",
      "cta": "One big 'Next' button. Never 'Done'."
    },
    "stop_rules": [
      "End at the item target.",
      "If median latency > 12s across 3 items, drop the remaining new items and finish with reviews.",
      "Quitting mid-session is free: resume from item index, streak preserved."
    ]
  },
  "boss_rounds": [
    {
      "id": "boss_cafe_order",
      "name": "카페 주문 (Café order)",
      "after_unit": "u3_food_ordering",
      "fantasy": "You order lunch in a Seoul café and the barista actually understands you.",
      "screen": "Illustrated counter, barista with a speech bubble, 3 order tickets on the right, coin counter top-right.",
      "loop": "Barista speaks (TTS). 3 reply cards. 4 turns: greet -> order -> 'is spicy okay?' -> ask for the bill. Each correct pick stamps a ticket.",
      "win": "3/3 tickets served.",
      "fail": "No fail state. A wrong card fades out and the barista repeats the line at 0.7x. Max 2 hints per turn.",
      "reward": "'주문 완료' stamp, 30 XP, unit 4 unlocks.",
      "tests": [
        "greet_hello",
        "greet_thanks",
        "food_order_stew",
        "food_cant_eat_spicy",
        "food_price",
        "food_bill"
      ],
      "duration_seconds": 90
    },
    {
      "id": "boss_subway_dash",
      "name": "지하철 대시 (Subway dash)",
      "after_unit": "u5_places_directions",
      "fantasy": "You have 90 seconds to reach City Hall using only Korean directions.",
      "screen": "Stylised 3-stop map, you at the bottom, three big arrows (left / straight / right), a soft clock, a panic button labelled 길을 잃었어요.",
      "loop": "TTS gives one direction sentence per leg. Tap the matching arrow. 4 legs. The panic button plays the recovery phrase and puts you back on the route for a 5-second clock cost.",
      "win": "Arrive at City Hall before the clock drains (deliberately generous).",
      "fail": "Clock at zero -> instant '다시' on the same route, no penalty, no lost streak.",
      "reward": "Route stamp, 40 XP, and a '길찾기' badge.",
      "tests": [
        "place_bathroom",
        "place_go_left",
        "place_close_here",
        "place_station_over_there",
        "place_bus_to_cityhall",
        "place_lost"
      ],
      "duration_seconds": 85
    },
    {
      "id": "boss_first_meeting",
      "name": "첫 만남 (First meeting)",
      "after_unit": "u7_wrap_up",
      "fantasy": "A 6-turn chat with a Korean peer that ends with you saying '오늘 정말 즐거웠어요'.",
      "screen": "Chat-style thread with an avatar, 3 reply options per turn, 3 hearts as a confidence meter.",
      "loop": "6 turns pulling from all 7 units. Two turns are intentionally hard to parse, and the winning move is 다시 한번 말씀해 주세요 or 천천히 말해 주세요 - the recovery phrases are scored as correct, not as a cop-out.",
      "win": "Reach the closing turn with at least 1 heart.",
      "fail": "Hearts at 0 -> the peer says '괜찮아요!' and re-asks the same turn with the gloss visible. No restart.",
      "reward": "'40문장 졸업' certificate card + your 5 weakest sentences become a personal review deck.",
      "tests": [
        "intro_name",
        "intro_nice_to_meet",
        "feel_how_are_you",
        "feel_like_korean_food",
        "wrap_say_again",
        "wrap_speak_slowly",
        "wrap_had_fun"
      ],
      "duration_seconds": 150
    }
  ]
}
```

---

## 12. Proofreading log

Hangul was proofread twice: once token-by-token against the gloss, once sentence-by-sentence for spacing and particle agreement. Items that are easy to get wrong, and the decision made:

| Item | Common error | Why it is right |
|---|---|---|
| `맛있어요` | not 맛잇어요 / 마싰어요 | ㅆ is part of 있다; spelling is 맛 + 있 + 어요 |
| `잃었어요` | not 일었어요 / 잃었서요 | 잃 + 었 + 어요; ㅀ reduces to ㄹ before a vowel |
| `괜찮아요` | not 괜찬아요 / 괜찮어요 | ㄶ + 아 → 나 |
| `반가워요` | not 반갑어요 | ㅂ-irregular: 반갑다 → 반가워요 |
| `가까워요` | not 가깝어요 | same ㅂ-irregular pattern |
| `바빠요` | not 바쁘어요 | ㅡ deletion: 바쁘다 → 바빠요 |
| `즐거웠어요` | not 즐겁웠어요 | ㅂ-irregular past: 즐겁다 → 즐거웠어요 |
| `지하철역은` | not 지하철역은 with a space or 지하철력은 | pronounced 지하철력 but spelled 지하철역 |
| `제 이름은` | space after 제 | 제 is a possessive pronoun, not a prefix |
| `못 먹어요` | space between 못 and 먹어요 | 못 negating a verb is written separately |
| `잘 못해요` | written as one word | 못하다 meaning 'be poor at' is a single word; contrast with 못 먹어요 |
| `한번` | one word | adverbial 'once / give it a try'; 한 번 with a space is the counter |
| `감사합니다` | not 감사햅니다 | ㅂ니다 after a vowel-final stem; pronounced 감사함니다 |
| `열한 시` | not 열하나 시 | native numbers 11-19 drop the final ㄹ before a counter |
| `김치찌개` | double ㅉ | 찌개, not 지개 |

**Particle audit (verified programmatically against final consonants):** `을/은/이` appear only after a consonant-final syllable and `를/는/가` only after a vowel-final one - including the pairs that usually trip people up (`음식을` vs `친구를`, `오늘은` vs `어제는`, `날씨가` vs `기분이`). `이에요` follows consonant-final nouns (`학생이에요`, `사람이에요`) and `예요` follows vowel-final ones (`민수예요`, `이거 얼마예요?`, `화장실이 어디예요?`).

**Register audit:** all 40 sentences are polite or formal-polite. There is no 반말 in the curriculum bank, no plain-form dictionary ending inside a lesson sentence, and `-시-` appears only when addressing the other person (`지내세요`, `말씀해`).

---

## 13. Open questions for the build team

| # | Question | Recommendation |
|---|---|---|
| 1 | Do we need a Korean IME fallback for type-the-Korean? | Yes - a 14-key jamo strip. Without it the exercise is unusable on desktop Linux. |
| 2 | Should word cards be a separate session type? | No for MVP. They ride along inside sentence sessions; a separate deck doubles the UI for a 40-item course. |
| 3 | How do we handle a learner who already knows some Korean? | One "I know this" button on the intro card → marks the item `easy` (3-day interval) and skips its remaining touches. No placement test. |
| 4 | Streak length? | 1 session/day counts. One freeze per week, earned automatically, never purchasable. |
