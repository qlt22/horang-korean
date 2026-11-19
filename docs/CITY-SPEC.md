# Seoul Works — metropolis spec

**The loop:** study → materials → build → automate → grow population → reach a new tier → prestige → a bigger city.

Seoul Works is the city-factory layer of Horang. It is deliberately a *builder*, not a shop: the reward for studying is **stuff you place on a map**, and the map keeps producing while you are away.

Implementation: `app/js/core/city-data.js` (pure rules), `app/js/core/city.js` (store wrapper), `app/js/screens/city.js` (UI), `app/styles/city.css`, `app/js/core/city-art.js`.

---

## 1 · How studying feeds the city

| Study action | Delivers | Why |
|---|---|---|
| Finishing a lesson | **Bricks** (+3 for a 3★ run) | The core unit of progress becomes the core building material |
| Reviewing sentences | **Timber** (1 per 2 reviews) | Maintenance work builds the frame |
| Practising words | **Glass** (1 per 4 words) | Vocabulary is what makes the city legible |
| Passing a checkpoint | **Steel + a blueprint** | Milestones unlock the skyline |
| Hitting the daily goal / streak | **Energy** | Consistency powers transit |

Exact bundle (`studyRewards`):

```js
brick     = 4 + 2 × newSentences + (stars === 3 ? 3 : 0)
timber    = floor(reviews / 2)        // if reviews
glass     = floor(words / 4)          // if words
steel     = 12, blueprint = 1         // if checkpoint
steel    += 5                         // if kind === 'checkpoint'
energy    = 2                         // if streakDay
```

The player never buys materials with real money. Every brick is a sentence they met.

## 2 · The city and its grid

- **12×12 grid** at the start (144 tiles), expandable to **20×20** (400 tiles).
- Buildings have a rectangular footprint (`w × h`). Footprints never overlap; every covered tile belongs to exactly one building.
- Every building has levels **1–10**.
- Income is **Won/second** and is the same Won used by the shop, so the city funds cosmetics and chests.
- Industry produces **materials/minute**, so the city keeps working while you study.
- **Eras:** prestige resets the city but grants a permanent multiplier and a new palette. Hanok Era → Modern → Skyline → Future.

Expansion cost for the next grid size (`n = grid − 11`, so `n = 1` at the 12×12 start):

```js
coins = round(4000 × 1.55^(grid − 12))
brick = 60 × n
steel = 25 × n
```

| From | To | Coins | Bricks | Steel |
|---:|---:|---:|---:|---:|
| 12×12 | 13×13 | ₩4,000 | 60 | 25 |
| 15×15 | 16×16 | ₩14,896 | 240 | 100 |
| 18×18 | 19×19 | ₩55,469 | 420 | 175 |
| 19×19 | 20×20 | ₩85,977 | 480 | 200 |

Saves older than the 12×12 start are normalised to 12 on load (buildings keep their coordinates); `newCity` starts at 12 so the constants and the wrapper agree.

## 3 · Categories

| id | Label | Korean | Used for |
|---|---|---|---|
| `res` | Residential | 주거 | Population |
| `com` | Commercial | 상업 | Income + jobs |
| `ind` | Industry | 산업 | Materials + jobs + pollution |
| `svc` | Services | 서비스 | Education, health, safety, parks, utilities |
| `transit` | Transit | 교통 | Coverage + global bonus + tourism |
| `landmark` | Landmarks | 명소 | Tourism, global bonus, late-game goals |

## 4 · Catalogue — 31 buildings

Income, population and jobs are **level 1** values. `Pop` and `Jobs` grow **+20 % of base per level** (linear, rounded). Income grows ×1.45 per level; tourism ×1.3.

| Building | 한국어 | Cat | Size | ₩/s | Pop | Jobs | Coverage | Pollution | Other | Cost | Unlock |
|---|---|---|---:|---:|---:|---:|---|---:|---|---|---|
| Hanok | 한옥 | res | 1×1 | 0.4 | 6 | 0 | — | — | — | ₩60 · 8 brick | start |
| Café | 카페 | com | 1×1 | 1.5 | 0 | 4 | — | — | — | ₩150 · 20 brick · 10 timber | 2 buildings |
| Pocket Park | 공원 | svc | 1×1 | — | 0 | 0 | park 2 | — | +4 happiness (copy), +12 % to adjacent tiles | ₩120 · 15 timber | 1 building |
| Market Stall | 상점 | com | 1×1 | 3 | 0 | 8 | — | — | — | ₩400 · 30 timber · 10 glass | 4 buildings |
| Brickworks | 벽돌공장 | ind | 1×1 | — | 0 | 10 | — | 4 | +2 brick/min | ₩500 · 20 timber | 3 buildings |
| Sawmill | 제재소 | ind | 1×1 | — | 0 | 8 | — | 2 | +2 timber/min | ₩600 · 20 brick | 5 buildings |
| Apartment | 아파트 | res | 2×2 | 3 | 48 | 0 | — | — | — | ₩900 · 60 brick · 25 steel | 8 buildings |
| Glassworks | 유리공장 | ind | 1×1 | — | 0 | 8 | — | 3 | +1.5 glass/min | ₩900 · 20 steel | 7 buildings |
| Steelworks | 제철소 | ind | 2×2 | — | 0 | 24 | — | 8 | +1 steel/min | ₩1,500 · 40 brick · 40 glass | 10 buildings |
| Office Tower | 오피스 | com | 2×1 | 10 | 0 | 60 | — | — | — | ₩2,500 · 80 steel · 40 glass | 12 buildings |
| Subway | 지하철 | transit | 2×1 | — | 0 | 8 | transit 5 | — | +10 % global, unique | ₩5,000 · 100 steel · 20 energy | 15 buildings |
| N Seoul Tower | N서울타워 | landmark | 2×2 | — | 0 | 30 | — | — | +25 % global, tourism 6, unique | ₩25,000 · 200 steel · 100 glass | 20 buildings · 12 badges |
| Villa | 빌라 | res | 2×1 | 1.2 | 16 | 0 | — | — | — | ₩300 · 45 brick · 20 timber | 4 buildings |
| Officetel | 오피스텔 | res | 1×1 | 2.4 | 30 | 0 | — | — | — | ₩1,200 · 80 brick · 40 glass | 8 buildings |
| Mall | 쇼핑몰 | com | 2×2 | 9 | 0 | 30 | — | — | — | ₩4,000 · 120 steel · 80 glass | 120 residents |
| Factory | 공장 | ind | 3×2 | 6 | 0 | 40 | — | 12 | — | ₩8,000 · 150 steel · 60 glass | 14 buildings |
| School | 학교 | svc | 2×2 | — | 0 | 6 | education 5 | — | — | ₩1,200 · 80 brick · 40 timber | 80 residents |
| Hospital | 병원 | svc | 2×2 | — | 0 | 10 | health 6 | — | — | ₩6,000 · 150 steel · 100 glass | 180 residents |
| Police Box | 파출소 | svc | 1×1 | — | 0 | 4 | safety 4 | — | — | ₩700 · 40 brick · 20 timber | 8 buildings |
| Fire Station | 소방서 | svc | 1×1 | — | 0 | 5 | safety 4 | — | — | ₩900 · 50 brick · 25 steel | 10 buildings |
| Power Plant | 발전소 | svc | 2×2 | — | 0 | 8 | utility | 10 | Utility score | ₩3,000 · 100 steel · 40 glass | 12 buildings |
| Water Tower | 급수탑 | svc | 1×1 | — | 0 | 3 | utility | — | Utility score | ₩400 · 30 brick · 10 steel | 6 buildings |
| Bus Stop | 버스 정류장 | transit | 1×1 | — | 0 | 1 | transit 2 | — | — | ₩150 · 20 brick · 10 timber | 3 buildings |
| Metro Station | 지하철역 | transit | 2×1 | — | 0 | 6 | transit 4 | — | +5 % global | ₩1,800 · 120 steel · 40 glass · 10 energy | 10 buildings |
| Train Station | 기차역 | transit | 2×2 | — | 0 | 10 | transit 6 | — | +8 % global | ₩7,000 · 200 steel · 60 glass · 20 energy | 18 buildings · 150 residents |
| Ferry Terminal | 여객선 터미널 | transit | 1×1 | — | 0 | 3 | transit 3 | — | +3 % global | ₩1,200 · 60 timber · 40 steel | 8 buildings |
| Airport | 공항 | transit | 3×3 | — | 0 | 60 | transit 8 | — | +20 % global, tourism 10 | ₩40,000 · 400 steel · 200 glass · 60 energy · 1 blueprint | 20 buildings · 300 residents |
| Gyeongbokgung | 경복궁 | landmark | 3×2 | — | 0 | 6 | — | — | tourism 6 | ₩30,000 · 300 steel · 150 glass · 1 blueprint | 12 badges |
| World Cup Stadium | 월드컵 경기장 | landmark | 3×2 | — | 0 | 20 | park 5 | — | tourism 5, happiness +8 (copy) | ₩20,000 · 250 steel · 150 glass | 400 residents |
| Lotte World Tower | 롯데월드타워 | landmark | 2×2 | 12 | 0 | 80 | — | — | +10 % global, tourism 8 | ₩50,000 · 500 steel · 250 glass · 80 energy · 2 blueprints | 24 buildings · 500 residents |
| Han River Bridge | 한강대교 | landmark | 3×1 | — | 0 | 0 | — | — | +6 % global | ₩12,000 · 300 steel | 15 buildings |

All costs are bought with Won **and** materials; upgrades cost ×1.7 per level and consume the same materials again.

**Level curves.** Income ×1.45 per level; tourism ×1.3 per level; production ×1.3 per level (plus +10 % per era); population and jobs `round(base × (1 + 0.2 × (level − 1)))`; max level 10.

**Selling** refunds 35 % of invested Won and 30 % of invested materials.

## 5 · Population, jobs, happiness and income

### Coverage

Coverage is a **Chebyshev radius** measured between the closest tiles of two footprints. A service building with `coverage: r` covers a residential building if any tile of one is within `r` tiles of any tile of the other (diagonals count as 1).

- `transitCoverage` = covered residential population ÷ total population, using transit buildings only.
- `serviceCoverage` = average, over the **present non-transit, non-utility service types** (education, health, safety, park), of that type's covered residential fraction.
- Power and water are not coverage services; they feed `utilities` instead.

### Deterministic happiness (0–100)

```js
employment      = pop ? min(1, jobs / pop) : 0
transitCoverage = coveredResidentialPopulation / population
serviceCoverage = average covered fraction over present service types
pollution       = Σ building pollution
utilities       = min(1, (powerCount + waterCount) / 2)
parkScore       = min(1, parkCount / max(1, population / 60))

happiness = clamp(
  35
  + employment      × 25
  + transitCoverage × 20
  + serviceCoverage × 20
  + parkScore       × 10
  + utilities       × 5
  − pollution       × 0.6,
  0, 100
)
```

Building `happiness` values (park +4, stadium +8) appear in UI copy only; they are **not** additional terms in the formula.

### Income

```js
global          = eraMultiplier × (1 + Σ unique global bonuses) × (1 + 0.01 × badges)
rawIncome       = Σ d.income × 1.45^(level−1) × (1 + adjacencyBonus) × global
rawTourism      = Σ d.tourism × 1.3^(level−1)

adjacencyBonus  = min(0.60, 0.12 × adjacent park count)
happinessFactor = 0.55 + happiness / 100 × 0.9

tax     = population × 0.01 × happiness / 100
tourism = rawTourism × happinessFactor
income  = rawIncome × happinessFactor + tax + tourism
```

So happiness is a real economic lever: it multiplies building income and tourism up to ×1.45, and it scales the per-resident tax line.

### Material rates

`rate = Σ basePerMinute / 60 × 1.3^(level−1) × (1 + 0.1 × (era−1))` per second.

## 6 · Tiers

Tiers are driven by **population**, not buildings.

| Tier | Korean | Population |
|---|---|---:|
| Village | 마을 | 0 |
| Town | 읍 | 100 |
| City | 도시 | 400 |
| Metropolis | 대도시 | 1,200 |
| Megacity | 메가시티 | 3,000 |

## 7 · Achievements — 32

Rewards are banked immediately by the wrapper (`coins` and `gems` go to the wallet, materials to the city). Achievement checks are monotonic and never repeat.

| id | Name | Condition | Reward |
|---|---|---|---|
| `first_brick` | First brick | Place your first building | 100 coins |
| `neighborhood` | Neighborhood | 10 buildings | 300 coins · 20 brick |
| `twenty_buildings` | District | 20 buildings | 1,500 coins · 50 brick |
| `thirty_buildings` | Borough | 30 buildings | 3 gems · 1 blueprint |
| `skyline` | Skyline | 25 buildings | 800 coins · 20 glass |
| `full_grid` | Full block | Every tile covered | 1 gem · 30 steel |
| `first_factory` | Industry | Build any factory | 400 coins |
| `all_factories` | Supply chain | Brickworks, sawmill, glassworks, steelworks | 1 gem · 5 energy |
| `level5` | Going up | A building at level 5 | 500 coins |
| `level10` | Top floor | A building at level 10 | 1 gem · 40 steel |
| `income10` | Small economy | 10 ₩/s | 300 coins |
| `income100` | Boom town | 100 ₩/s | 1,000 coins · 1 gem |
| `income1000` | Megacity | 1,000 ₩/s | 3 gems · 1 blueprint |
| `subway` | Express line | Build the subway | 1,000 coins · 5 energy |
| `tower` | Landmark | Build N Seoul Tower | 2 gems · 2,000 coins |
| `grid7` | Growing out | Expand to a 13×13 grid | 800 coins · 30 brick |
| `era2` | New era | Prestige into Era 2 | 2 gems |
| `era3` | Third skyline | Prestige into Era 3 | 3 gems · 1 blueprint |
| `a1_badges` | A1 architect | All 12 A1 unit badges | 2 gems · 3,000 coins |
| `pop100` | Hundred neighbours | 100 residents | 600 coins · 40 brick |
| `pop500` | Half a thousand | 500 residents | 1,500 coins · 1 gem |
| `pop2000` | Two thousand | 2,000 residents | 2 gems · 50 steel |
| `metropolis` | Metropolis | 3,000 residents | 3 gems · 1 blueprint |
| `transit50` | Getting around | Transit covers 50 % of residents | 800 coins |
| `transit90` | Car-free | Transit covers 90 % of residents | 2 gems · 10 energy |
| `airport` | Open skies | Build the airport | 5,000 coins · 2 gems |
| `metro` | Under the city | Build a metro station | 1,200 coins · 5 energy |
| `train` | Regional line | Build a train station | 3,000 coins · 1 gem |
| `palace` | Old Seoul | Build Gyeongbokgung | 3 gems |
| `stadium` | Match day | Build the World Cup Stadium | 2 gems · 3,000 coins |
| `happy90` | Happy city | 90 happiness | 3 gems |
| `all_categories` | Mixed city | Own a building in every category | 2,000 coins · 2 gems |

## 8 · Prestige

- Threshold: **25,000 Won generated × current era** (`lifetimeWon`).
- Prestige advances one era, resets buildings, materials, Won and city income, and grants **+50 % permanent income per era** (`1 + 0.5 × (era − 1)`).
- Every era keeps A1 badges, city achievements, cosmetics and course progress. Prestige itself grants **+2 gems**.
- Prestige is always confirmed and never removes learning progress.

## 9 · Offline production and banking

- Production is capped at **8 hours** (`OFFLINE_CAP_SECONDS = 28,800`) per tick.
- Coins are banked in **whole Won**; fractions carry in `unbanked` so the shop never shows decimals.
- Materials accrue fractionally and are shown rounded in the HUD.
- If a tick covers at least **2 minutes**, the wrapper stores an offline report. The city screen shows it on next open; the report is consumed once.

## 10 · Integration surfaces

| Surface | What it shows |
|---|---|
| `#/city` | The builder: HUD, multi-tile grid, category chips, build sheet, inspector, stats, transit overlay, achievements, prestige |
| Home city card | Tier · era, population, income, happiness face, building count, next unlock → `#/city` |
| Complete receipt | "Materials for Seoul Works" strip, plus population/happiness when the city has residents |
| Profile | Compact Seoul Works row: era · tier · residents · income → `#/city` |

Wrapper API (`app/js/core/city.js`): `ensureCity`, `sync`, `tick`, `consumeReport`, `place`, `upgrade`, `sell`, `expand`, `prestigeNow`, `info`, `stats`, `at`, `tilesOf`, `categories`, `slot`, `buildingAt`, `byId`, `incomeOf`, `canAffordType`, `missingFor`, `catalog`, `achievements`, `achievementById`.

## 11 · Economy guardrails

- No real-money purchases, no paid resources, no timers that block building.
- Offline production is capped and shown honestly.
- Prestige is optional and always confirmed; it never removes badges, achievements, cosmetics or course progress.
- Materials are awarded only for learning actions; idling produces Won/materials only from what you already built.
- Footprints follow the catalogue. Old saves without `w`/`h` are upgraded on first load, so every surface agrees on which tiles a building covers.

## 12 · Showcase city (16×16)

`app/js/core/showcase-city.js` exports a completed, legitimate save used by the Showcase button and `#/city?showcase=1` (same `SHOWCASE_LAYOUT` / `buildShowcaseCity` shape). It assumes a finished A1 learner: Era 3 and all 12 badges.

| | |
|---|---|
| Grid | 16×16 — **256 / 256 tiles** covered, no overlaps |
| Buildings | **127** |
| Residents | **1,448** — Metropolis |
| Happiness | **91.6 / 100** |
| Transit coverage | **100 %** |
| Service coverage | **100 %** (education, health, safety, park) |
| Utilities | 1.0 (power + water) |
| Pollution | 39 |
| Income | **≈ ₩15,042/s** (buildings ₩10,811 · tax ₩13 · tourism ₩170) |
| Materials | brick 4.1/min · timber 4.1/min · glass 3/min · steel 2/min |

Contents: airport, KTX/train station, metro, subway, ferry terminal, Gyeongbokgung, World Cup Stadium, Lotte World Tower, N Seoul Tower, two Han River bridge spans, eight apartments (levels 8–10), villas, officetels, a dense office district, four malls, a factory plus the full supply chain (brickworks, sawmill, glassworks, steelworks), four schools, two hospitals, police and fire posts, power, water, and 32 pocket parks. Every unlock gate is met by the finished city (20+ buildings, 300 airport residents, 400 stadium, 500 Lotte, 12 badges), so it is a valid final state rather than a decorated mock.
