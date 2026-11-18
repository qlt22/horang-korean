# Seoul Works — Metropolis expansion contract

Binding interface between three parallel workers. Do not edit files outside your ownership.

- **A (simulation):** `app/js/core/city-data.js`, `tests/city.test.mjs`, `tests/city-sim.test.mjs`
- **B (UI):** `app/js/screens/city.js`, `app/styles/city.css`, `app/js/core/city-art.js`
- **C (wrapper + surfaces):** `app/js/core/city.js`, `app/js/screens/home.js`, `app/js/screens/complete.js`, `app/js/screens/profile.js`, `docs/CITY-SPEC.md`

Existing: 12 buildings, 1×1 only, income + materials + achievements + prestige. Expansion target: a **Cities-Skylines-like metropolis** with multi-tile buildings, population, jobs, happiness, transit coverage, services, airport.

---

## 1. Data model changes (A implements, B/C consume)

Building definition gains:

```js
{
  id, name, ko, emoji, category,          // category: res|com|ind|svc|transit|landmark
  w: 1, h: 1,                             // footprint in tiles
  income: 0,                              // Won/s at level 1
  pop: 0,                                 // residents at level 1
  jobs: 0,                                // jobs at level 1
  produce: { brick: 2 },                  // materials/min
  coverage: 0,                            // transit radius (Chebyshev) or service radius
  service: 'transit'|'education'|'health'|'safety'|'park'|'utility'|null,
  pollution: 0,
  tourism: 0,                             // Won/s at level 1
  global: 0,                              // +fraction to all income
  happiness: 0,                           // flat happiness contribution when covering residents
  unique: false,
  requires: { buildings, pop, badges, era }
}
```

### Required exports (exact names)

```js
CATEGORIES               // {res:{label,ko,color}, com:…, ind:…, svc:…, transit:…, landmark:…}
CATEGORY_META            // same, plus icon/emoji
sizeOf(type) -> {w,h}
buildingAt(city,x,y) -> building|null      // any covered tile returns the owner
occupiedMap(city) -> Map<"x,y", building>
tilesOf(building) -> [{x,y},…]
cityStats(city) -> {
  population, jobs, employment, happiness,        // 0–100
  transitCoverage, serviceCoverage,               // 0–1
  pollution, utilities,                           // numbers
  tax, tourism, buildingIncome, income,           // Won/s
  tier: {id,name,ko,min}, nextTier,
  rates                                           // materials/s
}
cityIncome(city)          // building + tax + tourism, includes happiness multiplier
tierFor(population) -> {id,name,ko,min}
placeable/place/upgrade/sell/expand/prestige/tick  // same signatures, multi-tile aware
```

`cityIncome` formula: `(buildingIncome * (0.55 + happiness/100 * 0.9)) + tax + tourism`, where `tax = population * 0.01 * happiness/100` and tourism uses the same happiness factor.

Happiness (keep simple, deterministic):
```
employment = pop ? min(1, jobs/pop) : 0
transitCoverage = coveredResidentialPopulation / population
serviceCoverage = average over present service types of covered residential fraction
pollution = sum(building pollution)
utilities = min(1, (powerCount + waterCount) / 2)
parkScore = min(1, parkCount / max(1, pop/60))
happiness = clamp(35 + employment*25 + transitCoverage*20 + serviceCoverage*20 + parkScore*10 + utilities*5 - pollution*0.6, 0, 100)
```

Coverage is Chebyshev distance from the transit/service building's tiles to the residential building's tiles, ≤ `coverage`. Multi-tile buildings use their origin..origin+w/h.

Tiers: Village 0, Town 100, City 400, Metropolis 1200, Megacity 3000.

## 2. Catalogue (A implements exactly these ids)

Existing ids stay (hanok, cafe, park, shop, brickworks, sawmill, apartment, glassworks, steelworks, office, subway, tower) with sizes/categories/pop/jobs added. Rename `shop` → Market Stall stays.

New:

| id | name | cat | size | income | pop | jobs | coverage/service | requires |
|---|---|---|---|---|---|---|---|---|
| villa | Villa | res | 2×1 | 1.2 | 16 | 0 | — | 4 buildings |
| officetel | Officetel | res | 1×1 | 2.4 | 30 | 0 | — | 8 buildings |
| mall | Mall | com | 2×2 | 9 | 0 | 30 | — | pop 120 |
| factory | Factory | ind | 3×2 | 6 | 0 | 40 | pollution 12 | 14 buildings |
| school | School | svc | 2×2 | 0 | 0 | 6 | coverage 5, education | pop 80 |
| hospital | Hospital | svc | 2×2 | 0 | 0 | 10 | coverage 6, health | pop 180 |
| police | Police Box | svc | 1×1 | 0 | 0 | 4 | coverage 4, safety | 8 buildings |
| fire | Fire Station | svc | 1×1 | 0 | 0 | 5 | coverage 4, safety | 10 buildings |
| power | Power Plant | svc | 2×2 | 0 | 0 | 8 | utility, pollution 10 | 12 buildings |
| water | Water Tower | svc | 1×1 | 0 | 0 | 3 | utility | 6 buildings |
| bus | Bus Stop | transit | 1×1 | 0 | 0 | 1 | coverage 2, transit | 3 buildings |
| metro | Metro Station | transit | 2×1 | 0 | 0 | 6 | coverage 4, transit, global .05 | 10 buildings |
| train | Train Station | transit | 2×2 | 0 | 0 | 10 | coverage 6, transit, global .08 | 18 buildings, pop 150 |
| ferry | Ferry Terminal | transit | 1×1 | 0 | 0 | 3 | coverage 3, transit, global .03 | 8 buildings |
| airport | Airport | transit | 3×3 | 0 | 0 | 60 | coverage 8, transit, global .20, tourism 10 | pop 300, 20 buildings |
| palace | Gyeongbokgung | landmark | 3×2 | 0 | 0 | 6 | tourism 6 | 12 badges |
| stadium | World Cup Stadium | landmark | 3×2 | 0 | 0 | 20 | tourism 5, happiness 8, coverage 5 | pop 400 |
| lotte | Lotte World Tower | landmark | 2×2 | 12 | 0 | 80 | global .10, tourism 8 | 24 buildings, pop 500 |
| bridge | Han River Bridge | landmark | 3×1 | 0 | 0 | 0 | global .06 | 15 buildings |

Existing sizes: hanok 1×1 pop 6; cafe 1×1 jobs 4; park 1×1 service park coverage 2 happiness 4; shop 1×1 jobs 8; apartment 2×2 pop 48 income 3; office 2×1 jobs 60 income 10; brickworks 1×1 jobs 10 pollution 4; sawmill 1×1 jobs 8 pollution 2; glassworks 1×1 jobs 8 pollution 3; steelworks 2×2 jobs 24 pollution 8; subway 2×1 transit coverage 5 global .10; tower 2×2 landmark global .25 tourism 6.

Costs: keep existing; new ones scale roughly with power (villa 300, officetel 1200, mall 4000, factory 8000, school 1200, hospital 6000, police 700, fire 900, power 3000, water 400, bus 150, metro 1800, train 7000, ferry 1200, airport 40000, palace 30000, stadium 20000, lotte 50000, bridge 12000). Materials must be reachable from study; airports are late-game.

## 3. New achievements (A)

`pop100`, `pop500`, `pop2000`, `metropolis` (pop 3000), `transit50`, `transit90`, `airport`, `metro`, `train`, `palace`, `stadium`, `happy90`, `all_categories`, `twenty_buildings`, `thirty_buildings`. Keep the existing 17.

## 4. UI requirements (B)

- Category filter chips + grouped build sheet. Show size, population/jobs, coverage, pollution, cost, lock reason.
- **Multi-tile grid**: every cell must be positioned explicitly with `grid-column/grid-row`; origin renders a single tile spanning `w×h`; covered cells render an empty placeholder that opens the owner when tapped. No auto-placement drift.
- Stats panel: population, happiness (0–100 + face), jobs, transit coverage, tier, tax/tourism breakdown.
- A **Transit overlay** toggle: dim non-transit tiles and draw a subtle coverage ring or tint around transit buildings; show coverage %.
- Inspector: size, category, residents/jobs, coverage radius, pollution, upgrade/sell.
- Build art: `city-art.js` exports `buildingArt(type, {w,h,level,era})` returning inline SVG (or a styled emoji fallback). Provide distinct silhouettes for res/com/ind/svc/transit/landmark. Airport gets a plane, metro a train, bridge a span, tower a spire.
- Offline report, achievements, prestige keep working.
- 390×844 and 1440×900, no horizontal overflow.

## 5. Integration requirements (C)

- `core/city.js` consumes A's new exports; expose `stats()`, `at(x,y)`, `tilesOf`, and multi-tile placement through the existing wrapper names. Keep old screen calls working where possible.
- Home city card: tier name, population, happiness, income; link to city.
- Complete screen: keep materials strip; no changes needed beyond imports.
- Profile: add a compact Seoul Works row (population, income, era) linking to city.
- Update `docs/CITY-SPEC.md` with the final catalogue/economy.

## 6. Rules

- No new dependencies.
- Do not edit `store.js`, `main.js`, `index.html`, `server.js`, tests owned by another agent, or each other's files.
- `node --check` every file you touch.
- Server is already running at http://localhost:4173; do not restart or kill it. Chromium: `/home/luat/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`.
- Do not commit to git.
- Backwards compatibility: old saves have 1×1 buildings without w/h; `sizeOf`/`tilesOf` must handle missing fields.
