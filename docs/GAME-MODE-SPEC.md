# Game mode + 3D city — build contract

Goal: **Cities-Skylines on a grid, funded by studying.**
A study screen (Home) and a full-screen game mode, switched with one button. The city is rendered as real 3D volumes (CSS 3D transforms, no images), with far more tiles.

## Ownership (do not edit outside your row)

| Agent | Files |
|---|---|
| **A — core/grid** | `app/js/core/city-data.js`, `app/js/core/showcase-city.js`, `tests/city.test.mjs`, `tests/city-sim.test.mjs`, `docs/CITY-SPEC.md` |
| **B — 3D game** | `app/js/screens/game.js` (new), `app/js/game/*.js` (new), `app/styles/game.css` (new) |
| **C — mode switch** | `app/js/screens/home.js`, `app/js/screens/profile.js`, `index.html` (CSS link only), `app/styles/home.css` |
| **D — QA (later)** | `tests/game.spec.mjs` (new), `tests/city-ui.mjs`, `tests/metropolis.spec.mjs`, `tests/showcase.spec.mjs` |

No one edits `store.js`, `main.js`, `app/js/screens/city.js`, `app/js/core/city.js`, `app/js/screens/lesson.js`, or another agent's files.

## A — bigger grid

- `GRID_START = 12`, `GRID_MAX = 20` (144 → 400 tiles).
- `expandCost`: base at 12 tiles, then `coins ≈ 4000 × 1.55^(grid−12)`, `brick 60×n`, `steel 25×n` where `n = grid − 11`. Keep it reachable with city income.
- Old saves with `grid < 12` become 12 (buildings keep coordinates); `ensureCity` in the wrapper already clamps, but `newCity` and constants must agree.
- `showcase-city.js`: rebuild a **16×16** showcase, packed to ≥240/256 tiles, **≥1,200 residents (Metropolis)**, 85–100 % happiness, 100 % transit, including airport, KTX, metro, ferry, palace, stadium, Lotte Tower, N tower, bridge, multiple apartments/offices/malls/factories, services. Keep it a valid final state (no overlaps, all gates met). Same export shape (`buildShowcaseCity`, `SHOWCASE_LAYOUT`).
- Update `docs/CITY-SPEC.md` grid/expansion/showcase numbers.
- Update your two test files for 12/20 and the new showcase-scale math. Keep 0 failures.

## B — the 3D game screen

New route `game` (id `game`, `hideNav: true`, `title: 'Seoul Works'`). It must fill the whole viewport (`position: fixed; inset: 0; z-index` above the app shell) on mobile **and** desktop.

### 3D rules (non-negotiable)
- Buildings are **volumetric CSS 3D objects**, not flat pictures, emoji, or SVG illustrations used as the building. Use `transform-style: preserve-3d`, cuboid faces (top/front/back/left/right), pitched roofs, setbacks, canopies, platforms, spires, chimneys, windows.
- Camera: isometric-ish `rotateX(58deg) rotateZ(45deg)` with pan (drag), zoom (wheel/pinch/buttons), and 90° rotation. Ground plane is a grid of tiles.
- Height is data-driven by `level`; footprints by `w×h`; era changes palette.
- Distinct silhouettes per type: hanok pitched roof, apartment tower with window bands, office glass tower, factory sawtooth roof + chimney, metro station with canopy + M pylon, train station with platforms + long roof, airport with runway + terminal + plane/control tower, palace tiered roof, stadium oval bowl, Lotte/N tower setbacks + spire, bridge deck + pylons, park trees, school/hospital/police/fire/power/water recognizable.
- Ground tiles capture pointer events; the 3D objects are `pointer-events: none`, so tapping a footprint selects the owner.

### Screen
- **Top bar:** `Study` button → `home`; city name/Era/Tier; income/s; coins + material chips; population/happiness; a `List` button → `city` (2D overview).
- **Map:** the 3D city; tap empty tile → build; tap building → inspect. A build-mode banner ("Placing: Metro · tap a tile · Cancel").
- **Build tray:** bottom sheet/panel with category chips (6 categories), cards showing name, size, cost, population/jobs, lock reason. Selecting arms placement.
- **Inspector:** 3D preview/badge, level, income, residents/jobs, coverage, upgrade/sell, close.
- **Transit overlay:** a toggle that tints covered tiles and dims non-transit buildings.
- **Resources/achievements/prestige** accessible from the game top bar or a menu (keep functions reachable).
- **No dead buttons**, no horizontal overflow, 390×844 and 1440×900. Reduced motion respected.
- Use the existing wrapper: `city.info()`, `city.stats()`, `city.catalog()`, `city.place/upgrade/sell/expand`, `city.achievements()`, `city.categories()`, `city.byId()`. Do not touch core.

## C — study ⇄ game switch

- Home: a prominent **Enter city** control (button or segmented `Study | City`) that routes to `game`. Keep the existing city card but make it open `game`.
- Profile: Seoul Works row → `game` (fallback `city` if game missing).
- Add `app/styles/game.css` link to `index.html`.
- Game screen provides the `Study` return; no bottom nav in game.
- Do not change main.js; the lead will register the screen and repoint the City tab.

## Integration (lead)
- `main.js`: import/register `game`, City tab → `game`, keep `city` registered for the 2D overview.
- Final QA updates old grid-9 UI tests to 12/20 and the new showcase, plus `tests/game.spec.mjs`.

## Acceptance
- You can study, hit one button, and be in a full-screen 3D city with 12×12 tiles, build a recognizable 3D house/metro/airport, pan/zoom/rotate, upgrade, and return to study.
- The 16×16 showcase is a dense, valid little city.
- All existing/updated suites pass; no console errors.
