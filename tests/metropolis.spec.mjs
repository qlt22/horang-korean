// Seoul Works — metropolis QA suite (QA agent D).
//
// Covers the whole expansion: multi-tile placement, requirements, the
// population/jobs/happiness/tier simulation, the build sheet + inspector +
// transit overlay + achievements + prestige, the Home / Profile / Complete
// integration surfaces, responsiveness, reduced motion, toast caps and the
// late-game balance path (airport / palace).
//
// Run with the dev server already listening on :4173:
//   node tests/metropolis.spec.mjs
//
// Rules: this file never edits app code. Browser state is seeded through
// window.horang.state.city so every fixture is deterministic.

import { chromium } from 'playwright';
import * as C from '../app/js/core/city-data.js';

const BASE = process.env.BASE || 'http://localhost:4173';
const CHROME =
  process.env.CHROME_PATH || '/home/luat/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';

let pass = 0;
let fail = 0;
let warn = 0;
const out = [];
const ok = (name, cond, extra = '') => {
  if (cond) pass++;
  else fail++;
  out.push(`  ${cond ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`);
};
const note = (name, extra = '') => {
  warn++;
  out.push(`  ⚠ ${name}${extra ? ` — ${extra}` : ''}`);
};
const section = (title) => out.push(`\n${title}`);
const near = (a, b, eps = 1e-6) => Math.abs(Number(a) - Number(b)) <= eps;

/* ------------------------------------------------------------------ */
/* Pure simulation fixtures                                            */
/* ------------------------------------------------------------------ */

const mk = (type, x, y, level = 1) => {
  const s = C.sizeOf(type);
  return { id: `b_${type}_${x}_${y}_${level}`, type, x, y, w: s.w, h: s.h, level };
};
const cityOf = (buildings = [], extra = {}) => ({ ...C.newCity(1_000), ...extra, buildings });
const rich = (c) => {
  c.resources = { brick: 1e6, timber: 1e6, glass: 1e6, steel: 1e6, energy: 1e6, blueprint: 20 };
  return c;
};
const earnedIds = (city, ctx = { badges: 0 }) => C.checkAchievements(city, ctx).map((a) => a.id);

/* ================================================================== */
section('CATALOGUE AND DATA MODEL');
/* ================================================================== */
{
  const list = C.catalogList();
  ok('catalogue has 31 buildings', list.length === 31, `${list.length}`);
  ok('catalogue ids are unique', new Set(list.map((d) => d.id)).size === list.length);
  ok(
    'every category has buildings',
    ['res', 'com', 'ind', 'svc', 'transit', 'landmark'].every((cat) => list.some((d) => d.category === cat))
  );
  const counts = list.reduce((a, d) => ((a[d.category] = (a[d.category] || 0) + 1), a), {});
  ok(
    'category split matches the catalogue (4/4/5/7/6/5)',
    counts.res === 4 && counts.com === 4 && counts.ind === 5 && counts.svc === 7 && counts.transit === 6 && counts.landmark === 5,
    JSON.stringify(counts)
  );
  ok(
    'all six categories expose label / Korean / colour',
    Object.values(C.CATEGORIES).every((m) => m.label && m.ko && m.color)
  );
  ok(
    'category meta exposes icon + emoji',
    Object.values(C.CATEGORY_META).every((m) => m.icon && m.emoji)
  );
  ok('every building has name/ko/emoji/description', list.every((d) => d.name && d.ko && d.emoji && d.desc && d.desc.length > 8));
  ok('every building has a positive Won cost', list.every((d) => d.cost && d.cost.coins > 0));

  const sizes = {
    airport: [3, 3],
    palace: [3, 2],
    stadium: [3, 2],
    bridge: [3, 1],
    factory: [3, 2],
    apartment: [2, 2],
    steelworks: [2, 2],
    mall: [2, 2],
    school: [2, 2],
    hospital: [2, 2],
    power: [2, 2],
    train: [2, 2],
    lotte: [2, 2],
    tower: [2, 2],
    office: [2, 1],
    villa: [2, 1],
    metro: [2, 1],
    subway: [2, 1],
    hanok: [1, 1],
  };
  for (const [id, [w, h]] of Object.entries(sizes)) {
    const s = C.sizeOf(id);
    ok(`${id} footprint is ${w}×${h}`, s.w === w && s.h === h, `${s.w}×${s.h}`);
  }
  ok('sizeOf handles an unknown id safely', C.sizeOf('nope').w === 1 && C.sizeOf('nope').h === 1);

  ok('achievements total 32', C.ACHIEVEMENTS.length === 32, `${C.ACHIEVEMENTS.length}`);
  ok('achievement ids unique', new Set(C.ACHIEVEMENTS.map((a) => a.id)).size === 32);
  for (const id of ['pop100', 'pop500', 'pop2000', 'metropolis', 'transit50', 'transit90', 'airport', 'metro', 'train', 'palace', 'stadium', 'happy90', 'all_categories', 'twenty_buildings', 'thirty_buildings']) {
    ok(`new achievement ${id} exists`, C.ACHIEVEMENTS.some((a) => a.id === id));
  }

  const tiers = [
    [0, 'Village', '마을'],
    [99, 'Village', '마을'],
    [100, 'Town', '읍'],
    [399, 'Town', '읍'],
    [400, 'City', '도시'],
    [1199, 'City', '도시'],
    [1200, 'Metropolis', '대도시'],
    [2999, 'Metropolis', '대도시'],
    [3000, 'Megacity', '메가시티'],
  ];
  for (const [pop, name, ko] of tiers) {
    const t = C.tierFor(pop);
    ok(`tier at ${pop} is ${name}`, t.name === name && t.ko === ko, `${t.name}/${t.ko}`);
  }
  ok('tierFor exposes its threshold', C.tierFor(400).min === 400);
}

/* ================================================================== */
section('MULTI-TILE PLACEMENT RULES');
/* ================================================================== */
{
  const c = rich(cityOf([], { grid: 9 }));
  // Eight hanoks satisfy the apartment's 8-building gate without blocking the
  // top-left quadrant used for the footprint assertions.
  for (let i = 0; i < 8; i++) c.buildings.push(mk('hanok', i % 4, 4 + Math.floor(i / 4)));
  const apt = C.place(c, 'apartment', 0, 0, 1e6);
  ok('2×2 apartment places', apt.ok === true, apt.reason || '');
  ok('apartment stores 2×2', apt.building?.w === 2 && apt.building?.h === 2);
  ok('apartment covers four tiles', C.tilesOf(apt.building).length === 4);
  ok('occupiedMap counts all covered tiles', C.occupiedMap(c).size === 12, `${C.occupiedMap(c).size}`);
  ok('buildingAt returns the owner on a covered tile', C.buildingAt(c, 1, 1) === apt.building);
  ok('buildingAt returns null outside the footprint', C.buildingAt(c, 2, 0) === null);

  ok('1×1 hanok overlaps a covered tile', C.placeable(c, 'hanok', 1, 1).ok === false);
  ok('2×1 villa overlaps a covered tile', C.placeable(c, 'villa', 1, 0).ok === false);
  ok('2×2 apartment overlaps a covered tile', C.placeable(c, 'apartment', 1, 0).ok === false);
  ok('3×3 airport overlaps a covered tile', C.placeable(c, 'airport', 0, 0).ok === false);
  ok('overlap reason is human-readable', /taken/i.test(C.placeable(c, 'hanok', 1, 1).reason || ''));

  ok('3×3 airport rejects out-of-bounds x', C.placeable(c, 'airport', 7, 0).reason === 'Outside the grid');
  ok('3×2 palace rejects out-of-bounds x', C.placeable(c, 'palace', 8, 0).reason === 'Outside the grid');
  ok('3×1 bridge rejects out-of-bounds x', C.placeable(c, 'bridge', 7, 0).reason === 'Outside the grid');
  ok('2×2 apartment rejects out-of-bounds y', C.placeable(c, 'apartment', 8, 8).reason === 'Outside the grid');
  ok('negative coordinates are rejected', C.placeable(c, 'hanok', -1, 0).ok === false);

  const villa = C.place(c, 'villa', 2, 0, 1e6);
  ok('2×1 villa places next to the apartment', villa.ok === true, villa.reason || '');
  ok('villa covers origin + far tile', C.tilesOf(villa.building).length === 2);
  ok('villa far tile resolves to villa', C.buildingAt(c, 3, 0) === villa.building);
  ok('occupiedMap now has fourteen tiles', C.occupiedMap(c).size === 14, `${C.occupiedMap(c).size}`);

  const airportCity = rich(cityOf([], { grid: 9 }));
  for (let i = 0; i < 20; i++) airportCity.buildings.push(mk('hanok', i % 8, Math.floor(i / 8), 9));
  const air = C.place(airportCity, 'airport', 0, 3, 1e6);
  ok('3×3 airport places once its 20-building / 300-resident gate is met', air.ok === true, air.reason || '');
  ok('airport covers nine tiles', air.ok && C.tilesOf(air.building).length === 9);
  ok('airport owns its far corner', air.ok && C.buildingAt(airportCity, 2, 5) === air.building);
  ok('airport occupiedMap grows by nine entries', C.occupiedMap(airportCity).size === 20 * 1 + 9);
  ok('sold airport frees every tile', (() => {
    if (!air.ok) return false;
    C.sell(airportCity, air.building.id);
    return C.buildingAt(airportCity, 2, 5) === null && C.occupiedMap(airportCity).size === 20;
  })());

  const bridgeCity = rich(cityOf([], { grid: 9 }));
  for (let i = 0; i < 15; i++) bridgeCity.buildings.push(mk('hanok', i % 9, 2 + Math.floor(i / 9)));
  const bridge = C.place(bridgeCity, 'bridge', 0, 0, 1e6);
  ok('3×1 bridge places and covers three columns',
    bridge.ok === true && C.tilesOf(bridge.building).map((t) => t.x).join() === '0,1,2', bridge.reason || '');

  const palaceCity = rich(cityOf([], { grid: 9 }));
  palaceCity.badges = 12;
  const palace = C.place(palaceCity, 'palace', 0, 0, 1e6);
  ok('3×2 palace places with 12 badges', palace.ok === true, palace.reason || '');
  ok('palace covers six tiles', C.tilesOf(palace.building).length === 6);
  ok('palace owns its far corner', C.buildingAt(palaceCity, 2, 1) === palace.building);
}

/* ================================================================== */
section('UNIQUE BUILDINGS');
/* ================================================================== */
{
  const c = rich(cityOf([], { grid: 9 }));
  for (let i = 0; i < 15; i++) c.buildings.push(mk('hanok', i % 8, Math.floor(i / 8)));
  const first = C.place(c, 'subway', 0, 2, 1e6);
  ok('first subway places', first.ok === true, first.reason || '');
  const second = C.place(c, 'subway', 2, 2, 1e6);
  ok('second subway is rejected as unique', second.ok === false && /one per city/i.test(second.reason || ''), second.reason || '');
  ok('subway count is still one', C.countType(c, 'subway') === 1);

  const t = rich(cityOf([], { grid: 9 }));
  t.badges = 12;
  for (let i = 0; i < 20; i++) t.buildings.push(mk('hanok', i % 8, Math.floor(i / 8)));
  const tower = C.place(t, 'tower', 0, 4, 1e6);
  ok('tower places once with 20 buildings + 12 badges', tower.ok === true, tower.reason || '');
  ok('second tower is rejected', C.place(t, 'tower', 2, 4, 1e6).ok === false);
}

/* ================================================================== */
section('REQUIREMENTS (BUILDINGS / POP / BADGES / ERA)');
/* ================================================================== */
{
  const one = rich(cityOf([mk('hanok', 0, 0)], { grid: 9 }));
  ok('cafe needs 2 buildings', /Needs 2 buildings/.test(C.placeable(one, 'cafe', 1, 0).reason || ''));
  ok('sawmill needs 5 buildings', /Needs 5 buildings/.test(C.placeable(one, 'sawmill', 1, 0).reason || ''));

  const tiny = rich(cityOf([mk('hanok', 0, 0)], { grid: 9 }));
  ok('mall needs 120 residents', /Needs 120 residents/.test(C.placeable(tiny, 'mall', 1, 0).reason || ''));

  const threeApts = rich(cityOf([], { grid: 9 }));
  threeApts.buildings.push(mk('apartment', 0, 0), mk('apartment', 2, 0), mk('apartment', 4, 0));
  ok('fixture has 144 residents', C.cityStats(threeApts).population === 144);
  ok('mall unlocks at 120 residents', C.placeable(threeApts, 'mall', 0, 2).ok === true, C.placeable(threeApts, 'mall', 0, 2).reason || '');

  const noBadges = rich(cityOf([], { grid: 9 }));
  ok('palace needs 12 A1 badges', /Needs 12 A1 badges/.test(C.placeable(noBadges, 'palace', 0, 0).reason || ''));
  ok('palace places with 12 badges', C.placeable(noBadges, 'palace', 0, 0, { badges: 12 }).ok === true);
  ok('palace still rejects 11 badges', C.placeable(noBadges, 'palace', 0, 0, { badges: 11 }).ok === false);

  // No shipped building uses requires.era yet, so prove the rule with a
  // temporary catalogue entry (removed again immediately).
  C.CATALOG.__era_test = {
    ...C.def('hanok'),
    id: '__era_test',
    name: 'Era Test',
    cost: { coins: 1 },
    requires: { era: 3 },
    unique: false,
  };
  const era1 = rich(cityOf([], { grid: 9, era: 1 }));
  const era3 = rich(cityOf([], { grid: 9, era: 3 }));
  ok('era-gated building is rejected in era 1', /Needs era 3/.test(C.placeable(era1, '__era_test', 0, 0).reason || ''));
  ok('era-gated building is accepted in era 3', C.placeable(era3, '__era_test', 0, 0).ok === true);
  delete C.CATALOG.__era_test;

  const poor = cityOf([], { grid: 9 });
  poor.resources.brick = 8;
  const paid = C.place(poor, 'hanok', 0, 0, 60);
  ok('place charges the full material cost', paid.ok === true && poor.resources.brick === 0, `brick=${poor.resources.brick}`);
  ok('place reports the Won cost', paid.cost?.coins === 60);
  const again = C.place(poor, 'hanok', 1, 0, 60);
  ok('place refuses when materials are gone', again.ok === false && /Not enough resources/.test(again.reason || ''), again.reason || '');
}

/* ================================================================== */
section('LEGACY SAVES (PURE API)');
/* ================================================================== */
{
  const legacy = cityOf([{ id: 'old', type: 'apartment', x: 0, y: 0, level: 1 }]);
  ok('old save without w/h covers one tile', C.tilesOf(legacy.buildings[0]).length === 1);
  ok('old save neighbour is free', C.buildingAt(legacy, 1, 0) === null);
  ok('old save still counts 48 residents', C.cityStats(legacy).population === 48);
  ok('old save can build next door', C.placeable(legacy, 'hanok', 1, 0).ok === true);
  ok('old save sell works', C.sell(legacy, 'old').ok === true);
}

/* ================================================================== */
section('POPULATION / JOBS / HAPPINESS / INCOME');
/* ================================================================== */
{
  const base = C.cityStats(cityOf([mk('hanok', 0, 0)]));
  ok('one hanok houses 6', base.population === 6);
  ok('baseline happiness is 35', base.happiness === 35);
  ok('no jobs means 0 employment', base.employment === 0);
  ok('no transit means 0 transit coverage', base.transitCoverage === 0);
  ok('no service means 0 service coverage', base.serviceCoverage === 0);
  ok('empty city tier is Village', C.cityStats(cityOf([])).tier.id === 'village');

  const busy = C.cityStats(cityOf([mk('hanok', 0, 0), mk('officetel', 1, 0), mk('apartment', 2, 0), mk('office', 4, 0), mk('cafe', 0, 1)]));
  ok('population sums every resident', busy.population === 6 + 30 + 48, `${busy.population}`);
  ok('jobs sum every job', busy.jobs === 60 + 4, `${busy.jobs}`);
  ok('employment is jobs/pop', near(busy.employment, 64 / 84), `${busy.employment}`);

  const scaled = C.cityStats(cityOf([mk('hanok', 0, 0, 2), mk('apartment', 2, 0, 2), mk('office', 0, 2, 2)]));
  ok('level 2 hanok houses 7', scaled.population === 7 + 58);
  ok('level 2 office has 72 jobs', scaled.jobs === 72);

  const employed = C.cityStats(cityOf([mk('hanok', 0, 0), mk('office', 1, 0)]));
  ok('full employment adds 25 happiness', employed.happiness === 60);

  const bus = C.cityStats(cityOf([mk('hanok', 0, 0), mk('bus', 1, 0)]));
  ok('bus lifts transit coverage to 100%', near(bus.transitCoverage, 1));
  ok('bus also adds its 1 job', near(bus.happiness, 35 + 25 / 6 + 20), `${bus.happiness}`);

  const metro = C.cityStats(cityOf([mk('hanok', 0, 0), mk('hanok', 1, 0), mk('metro', 2, 0)]));
  ok('metro covers both hanoks', near(metro.transitCoverage, 1));
  ok('metro adds six jobs', metro.jobs === 6);
  ok('metro lifts happiness', metro.happiness > 60);

  const schoolCity = C.cityStats(cityOf([mk('hanok', 0, 0), mk('hanok', 1, 0), mk('hanok', 2, 0), mk('school', 0, 1)]));
  ok('school gives full service coverage', near(schoolCity.serviceCoverage, 1));
  ok('school adds six jobs', schoolCity.jobs === 6);
  ok('school lifts happiness', schoolCity.happiness > 50);

  const parkCity = C.cityStats(cityOf([mk('hanok', 0, 0), mk('park', 1, 0)]));
  ok('park is a service + park score', near(parkCity.serviceCoverage, 1) && parkCity.happiness === 65);

  const powerOnly = C.cityStats(cityOf([mk('hanok', 0, 0), mk('power', 1, 1)]));
  const powerWater = C.cityStats(cityOf([mk('hanok', 0, 0), mk('power', 1, 1), mk('water', 3, 0)]));
  ok('power gives half utilities', near(powerOnly.utilities, 0.5));
  ok('power + water gives full utilities', near(powerWater.utilities, 1));
  ok('water raises happiness over power alone', powerWater.happiness > powerOnly.happiness);
  ok('power adds its pollution', powerOnly.pollution === 10);

  const officeCity = C.cityStats(cityOf([mk('hanok', 0, 0), mk('hanok', 1, 0), mk('hanok', 2, 0), mk('office', 0, 1)]));
  const dirty = C.cityStats(cityOf([mk('hanok', 0, 0), mk('hanok', 1, 0), mk('hanok', 2, 0), mk('office', 0, 1), mk('brickworks', 2, 1)]));
  ok('office city is fully employed and clean', officeCity.happiness === 60);
  ok('industry pollution lowers happiness', dirty.happiness < officeCity.happiness, `${officeCity.happiness} -> ${dirty.happiness}`);
  ok('industry pollution is summed', dirty.pollution === 4);

  const noJobs = C.cityStats(cityOf([mk('office', 0, 0)]));
  ok('no residents means 0 population', noJobs.population === 0);
  ok('service coverage is 0 without residents', noJobs.serviceCoverage === 0);
}

/* ================================================================== */
section('TRANSIT / SERVICE COVERAGE MATHS');
/* ================================================================== */
{
  const three = C.cityStats(cityOf([mk('hanok', 0, 0), mk('hanok', 1, 0), mk('hanok', 5, 5), mk('bus', 2, 0)]));
  ok('bus covers two of three hanoks', near(three.transitCoverage, 2 / 3), `${three.transitCoverage}`);

  const edge = C.cityStats(cityOf([mk('hanok', 0, 0), mk('bus', 2, 2)]));
  ok('coverage is Chebyshev (diagonal counts 1)', near(edge.transitCoverage, 1));

  const outside = C.cityStats(cityOf([mk('hanok', 0, 0), mk('bus', 3, 0)]));
  ok('bus beyond radius covers nothing', outside.transitCoverage === 0);

  const multi = C.cityStats(cityOf([mk('apartment', 0, 0), mk('bus', 3, 0)]));
  ok('multi-tile housing edge is distance 2', near(multi.transitCoverage, 1));

  const partial = C.cityStats(cityOf([
    mk('hanok', 0, 0), mk('hanok', 1, 0), mk('hanok', 4, 5), mk('hanok', 5, 5), mk('police', 0, 1),
  ]));
  ok('safety covers 3 of 4 residents', near(partial.serviceCoverage, 0.75), `${partial.serviceCoverage}`);

  const both = C.cityStats(cityOf([
    mk('hanok', 0, 0), mk('hanok', 1, 0), mk('hanok', 4, 5), mk('hanok', 5, 5), mk('police', 0, 1), mk('park', 5, 4),
  ]));
  ok('two service types are averaged', near(both.serviceCoverage, (0.75 + 0.5) / 2), `${both.serviceCoverage}`);

  ok('no services means 0 coverage', C.cityStats(cityOf([mk('hanok', 0, 0)])).serviceCoverage === 0);
}

/* ================================================================== */
section('INCOME FORMULA');
/* ================================================================== */
{
  const c = cityOf([mk('hanok', 0, 0), mk('cafe', 1, 0), mk('park', 2, 0), mk('apartment', 3, 0)]);
  const s = C.cityStats(c);
  const hf = 0.55 + (s.happiness / 100) * 0.9;
  ok('tax = population × 0.01 × happiness', near(s.tax, s.population * 0.01 * (s.happiness / 100)));
  ok('income = buildingIncome × happinessFactor + tax + tourism', near(s.income, s.buildingIncome * hf + s.tax + s.tourism));
  ok('cityIncome agrees with the snapshot', near(C.cityIncome(c), s.income));
  ok('happiness factor is bounded', hf >= 0.55 && hf <= 1.45, `${hf}`);
  ok('happiness never exceeds 100', s.happiness <= 100);
  ok('happiness never goes negative', C.cityStats(cityOf(Array.from({ length: 30 }, () => mk('factory', 0, 0)))).happiness === 0);

  const rates = C.cityRates(cityOf([mk('brickworks', 0, 0), mk('sawmill', 1, 0)]));
  ok('material rates are per second', near(rates.brick, 2 / 60) && near(rates.timber, 2 / 60), JSON.stringify(rates));

  const tour = C.cityStats(cityOf([mk('palace', 0, 0), mk('hanok', 1, 0)]));
  ok('palace produces tourism income', tour.tourism > 0, `${tour.tourism}`);
  ok(
    'tourism uses the same happiness factor',
    near(tour.tourism, 6 * (0.55 + (tour.happiness / 100) * 0.9)),
    `tourism=${tour.tourism}, happiness=${tour.happiness}`
  );
}

/* ================================================================== */
section('TIERS FROM REAL CITY SNAPSHOTS');
/* ================================================================== */
{
  const atPop = (buildings) => C.cityStats(cityOf(buildings));
  ok('96 residents is Village', atPop([mk('apartment', 0, 0), mk('apartment', 2, 0)]).tier.id === 'village');
  ok('144 residents is Town', atPop([mk('apartment', 0, 0), mk('apartment', 2, 0), mk('apartment', 4, 0)]).tier.id === 'town');
  ok('432 residents is City', atPop(Array.from({ length: 9 }, () => mk('apartment', 0, 0))).tier.id === 'city');
  ok('1200 residents is Metropolis', atPop(Array.from({ length: 25 }, () => mk('apartment', 0, 0))).tier.id === 'metropolis');
  ok('3024 residents is Megacity', atPop(Array.from({ length: 63 }, () => mk('apartment', 0, 0))).tier.id === 'megacity');
  const town = atPop([mk('apartment', 0, 0), mk('apartment', 2, 0), mk('apartment', 4, 0)]);
  ok('next tier is exposed', town.nextTier.id === 'city');
  ok('top tier has no next tier', atPop(Array.from({ length: 63 }, () => mk('apartment', 0, 0))).nextTier === null);
}

/* ================================================================== */
section('TICK / OFFLINE CAP / ACHIEVEMENTS');
/* ================================================================== */
{
  const c = cityOf([mk('hanok', 0, 0), mk('brickworks', 1, 0), mk('sawmill', 2, 0)]);
  const income = C.cityIncome(c);
  const gain = C.tick(c, 24 * 3600 * 1000);
  ok('24h tick is capped at 8h', gain.seconds === 28800, `${gain.seconds}`);
  ok('bricks accrue at 2/min', near(c.resources.brick, 960, 1e-6), `${c.resources.brick}`);
  ok('timber accrues at 2/min', near(c.resources.timber, 960, 1e-6));
  ok('coins equal income × capped seconds', near(gain.coins, income * 28800, 1e-6));
  ok('lifetimeWon grows with the tick', near(c.lifetimeWon, gain.coins));
  ok('lastTick moves to now', c.lastTick === 24 * 3600 * 1000);
  ok('an immediate second tick is a no-op', C.tick(c, 24 * 3600 * 1000 + 500) === null);

  ok('achievements are monotonic', (() => {
    const a = cityOf([mk('hanok', 0, 0)]);
    C.checkAchievements(a, { badges: 12 });
    return C.checkAchievements(a, { badges: 12 }).length === 0;
  })());
  ok('pop100 fires', earnedIds(cityOf([mk('apartment', 0, 0), mk('apartment', 2, 0), mk('apartment', 4, 0)])).includes('pop100'));
  ok('pop500 fires', earnedIds(cityOf(Array.from({ length: 11 }, () => mk('apartment', 0, 0)))).includes('pop500'));
  ok('transit90 fires at 90%', earnedIds(cityOf([
    mk('hanok', 0, 0), mk('hanok', 1, 0), mk('hanok', 2, 0), mk('hanok', 3, 0), mk('hanok', 4, 0),
    mk('hanok', 0, 1), mk('hanok', 1, 1), mk('hanok', 3, 1), mk('hanok', 4, 1), mk('hanok', 5, 5), mk('bus', 2, 1),
  ])).includes('transit90'));
  ok('all_categories fires for a full mix', earnedIds(cityOf([
    mk('hanok', 0, 0), mk('cafe', 1, 0), mk('brickworks', 2, 0), mk('school', 3, 0), mk('bus', 0, 1), mk('palace', 1, 1),
  ])).includes('all_categories'));
  ok('happy90 fires for a happy city', earnedIds(cityOf([
    mk('hanok', 2, 2), mk('cafe', 3, 0), mk('bus', 0, 0), mk('school', 0, 2),
    mk('police', 2, 0), mk('park', 0, 1), mk('power', 4, 4), mk('water', 4, 0), mk('office', 3, 3),
  ])).includes('happy90'));
}

/* ================================================================== */
section('PRESTIGE (PURE)');
/* ================================================================== */
{
  const c = cityOf([mk('hanok', 0, 0), mk('cafe', 1, 0)], {
    lifetimeWon: C.PRESTIGE_BASE,
    achievements: ['first_brick', 'skyline'],
    era: 1,
    badges: 3,
  });
  ok('prestige is ready at the threshold', C.prestigeReady(c) === true);
  const next = C.prestige(c);
  ok('prestige advances the era', next.era === 2);
  ok('prestige clears buildings', next.buildings.length === 0);
  ok('prestige keeps achievements', next.achievements.includes('first_brick') && next.achievements.includes('skyline'));
  ok('prestige keeps badges', next.badges === 3);
  ok('prestige resets lifetime Won', next.lifetimeWon === 0);
  ok('prestige increments the prestige count', next.prestigeCount === 1);

  const notReady = cityOf([], { lifetimeWon: 0 });
  ok('prestige refuses before the threshold', C.prestige(notReady) === null);

  const era4 = cityOf([mk('hanok', 0, 0)], { era: 4, lifetimeWon: C.PRESTIGE_BASE * 4 });
  const maxPrestige = C.prestige(era4);
  ok('prestige refuses at the final era', maxPrestige === null && C.prestigeReady(era4) === false, `result=${maxPrestige}`);
}

/* ================================================================== */
section('BALANCE: AIRPORT / PALACE / NEXT UNLOCK');
/* ================================================================== */
{
  // 20 villas = 320 residents in 40 tiles: the airport's 3×3 still fits.
  const villas = rich(cityOf([], { grid: 9 }));
  for (let i = 0; i < 20; i++) villas.buildings.push(mk('villa', (i % 4) * 2, Math.floor(i / 4)));
  const cover = C.placeable(villas, 'airport', 0, 5);
  ok('20 villas give 320 residents', C.cityStats(villas).population === 320, `${C.cityStats(villas).population}`);
  ok('airport is placeable after 20 villas', cover.ok === true, cover.reason || '');
  const airport = C.place(villas, 'airport', 0, 5, 1e6);
  ok('airport actually fits on the 9×9 grid', airport.ok === true, airport.reason || '');
  ok('airport adds nine covered tiles', airport.ok && C.tilesOf(airport.building).length === 9);

  // 20 level-1 hanoks are only 120 residents: the requirement means something.
  const hanoks = rich(cityOf([], { grid: 9 }));
  for (let i = 0; i < 20; i++) hanoks.buildings.push(mk('hanok', i % 8, Math.floor(i / 8)));
  ok('20 level-1 hanoks are 120 residents', C.cityStats(hanoks).population === 120);
  ok('airport rejects 20 level-1 hanoks on population', /residents/.test(C.placeable(hanoks, 'airport', 0, 4).reason || ''));
  // Upgrade them to level 9 → 320 residents, same 20 buildings.
  const upgraded = rich(cityOf([], { grid: 9 }));
  for (let i = 0; i < 20; i++) upgraded.buildings.push(mk('hanok', i % 8, Math.floor(i / 8), 9));
  ok('20 level-9 hanoks reach 320 residents', C.cityStats(upgraded).population === 320);
  ok('upgrading is enough to unlock the airport', C.placeable(upgraded, 'airport', 0, 4).ok === true);

  // Palace needs badges, not population.
  const palaceCity = rich(cityOf([], { grid: 9 }));
  palaceCity.badges = 12;
  ok('palace is placeable with 12 badges and no other buildings', C.placeable(palaceCity, 'palace', 0, 0).ok === true);
  ok('palace placed on an empty map', C.place(palaceCity, 'palace', 0, 0, 1e6).ok === true);

  // Other late-game requirements are reachable in a 9×9 city.
  const lotteCity = rich(cityOf([], { grid: 9 }));
  for (let i = 0; i < 24; i++) lotteCity.buildings.push(mk('officetel', i % 8, Math.floor(i / 8)));
  ok('24 officetels reach 720 residents', C.cityStats(lotteCity).population === 720);
  ok('Lotte Tower unlocks at 24 buildings / 500 residents', C.placeable(lotteCity, 'lotte', 0, 3).ok === true);

  const trainCity = rich(cityOf([], { grid: 9 }));
  for (let i = 0; i < 18; i++) trainCity.buildings.push(mk('villa', (i % 4) * 2, Math.floor(i / 4)));
  ok('18 villas reach 288 residents', C.cityStats(trainCity).population === 288);
  ok('train station unlocks at 18 buildings / 150 residents', C.placeable(trainCity, 'train', 0, 5).ok === true);

  const stadiumCity = rich(cityOf([], { grid: 9 }));
  for (let i = 0; i < 9; i++) stadiumCity.buildings.push(mk('apartment', (i % 3) * 2, Math.floor(i / 3) * 2));
  ok('9 apartments reach 432 residents', C.cityStats(stadiumCity).population === 432);
  ok('stadium unlocks at 400 residents', C.placeable(stadiumCity, 'stadium', 6, 0).ok === true);

  const mallCity = rich(cityOf([], { grid: 9 }));
  mallCity.buildings.push(mk('apartment', 0, 0), mk('apartment', 2, 0), mk('apartment', 4, 0));
  ok('mall unlocks at 144 residents', C.placeable(mallCity, 'mall', 0, 2).ok === true);

  // The next unlock from a fresh city is reachable with two hanoks.
  const fresh = rich(cityOf([], { grid: 6 }));
  const firstLocked = C.catalogList().find((d) => !C.placeable(fresh, d.id, 0, 0).ok);
  ok('fresh city has a next unlock', !!firstLocked, firstLocked?.id || 'none');
  ok('fresh next unlock is the cafe', firstLocked?.id === 'cafe', firstLocked?.id || '');
  C.place(fresh, 'hanok', 0, 0, 1e6);
  C.place(fresh, 'hanok', 1, 0, 1e6);
  ok('two hanoks unlock the cafe', C.placeable(fresh, 'cafe', 2, 0).ok === true);
  const secondLocked = C.catalogList().find((d) => !C.placeable(fresh, d.id, 2, 0).ok);
  ok('a new next unlock appears after the cafe', !!secondLocked && secondLocked.id !== 'cafe', secondLocked?.id || 'none');
  ok('next unlock requirement is finite', (secondLocked?.requires?.buildings || 0) <= 30 && (secondLocked?.requires?.pop || 0) <= 3402);


}

/* ================================================================== */
/* Browser fixtures                                                    */
/* ================================================================== */

const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.setDefaultTimeout(6000);
const errs = [];
page.on('pageerror', (e) => errs.push(`PAGEERROR ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error' && !/404|Failed to load resource|favicon/i.test(m.text())) errs.push(`CONSOLE ${m.text()}`);
});

const loc = (sel) => page.locator(sel).first();
const count = async (sel) => page.locator(sel).count().catch(() => 0);
const text = async (sel) => {
  try {
    const l = loc(sel);
    if (!(await l.count())) return '';
    return (await l.innerText()).replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
};
const click = async (sel, opts = {}) => {
  try {
    const l = loc(sel);
    if (!(await l.count())) return false;
    if (await l.isDisabled().catch(() => false)) return false;
    await l.click(opts);
    return true;
  } catch {
    return false;
  }
};
const attr = async (sel, name) => {
  try {
    return await loc(sel).getAttribute(name);
  } catch {
    return null;
  }
};
const closeSheet = async () => {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(220);
};
const wait = (ms = 250) => page.waitForTimeout(ms);

/** Seed the shared store, then reload so boot-time sync/settings see it. */
async function seedCity(buildings = [], opts = {}) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ buildings, opts }) => {
      const s = window.horang.state;
      s.flags.onboardingDone = true;
      s.profile.name = opts.name || 'QA';
      s.coins = opts.coins ?? 1e6;
      s.gems = opts.gems ?? 10;
      s.badges = Array.from({ length: opts.badges || 0 }, (_, i) => `qa_badge_${i}`);
      s.settings.reducedMotion = !!opts.reducedMotion;
      s.lastSummary = opts.lastSummary ?? null;
      const resources = { brick: 1e6, timber: 1e6, glass: 1e6, steel: 1e6, energy: 1e4, blueprint: 9 };
      Object.assign(resources, opts.resources || {});
      s.city = {
        version: 1,
        era: opts.era ?? 1,
        grid: opts.grid ?? 6,
        buildings: buildings.map((b) => ({ level: 1, ...b })),
        resources,
        lastTick: opts.lastTick ?? Date.now(),
        lifetimeWon: opts.lifetimeWon ?? 0,
        totalBuilt: buildings.length,
        achievements: opts.achievements || [],
        prestigeCount: opts.prestigeCount || 0,
        badges: opts.badges || 0,
        unbanked: 0,
      };
      delete s.city.pendingReport;
      window.horang.store.saveNow();
    },
    { buildings, opts }
  );
  await page.goto(`${BASE}/#/${opts.route || 'city'}`, { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(opts.wait ?? 500);
}

const readStats = () => page.evaluate(async () => (await import('/app/js/core/city.js')).stats());
const readCity = () =>
  page.evaluate(() => ({
    era: window.horang.state.city.era,
    grid: window.horang.state.city.grid,
    buildings: window.horang.state.city.buildings.map((b) => ({ id: b.id, type: b.type, x: b.x, y: b.y, w: b.w, h: b.h, level: b.level })),
    achievements: [...window.horang.state.city.achievements],
    resources: { ...window.horang.state.city.resources },
    badges: window.horang.state.city.badges,
    coins: window.horang.state.coins,
  }));
const openBuildAt = async (x, y) => {
  const did = await click(`[data-tile="${x},${y}"]`);
  await wait(260);
  return did && (await count('.sheet')) > 0;
};
const placeFromSheet = async (type) => {
  const did = await click(`[data-build="${type}"]`);
  await wait(650);
  return did;
};
const openBuildingOfType = async (type) => {
  const id = await page.evaluate(
    (t) => window.horang.state.city.buildings.find((b) => b.type === t)?.id || null,
    type
  );
  if (!id) return false;
  const cover = page.locator(`[data-owner="${id}"]`);
  if ((await cover.count()) > 0) {
    await cover.first().click();
  } else {
    await page.locator(`[data-bid="${id}"]`).first().click();
  }
  await wait(350);
  return (await count('.sheet')) > 0;
};

const overflow = () =>
  page.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
    body: document.body.scrollWidth,
  }));

/* ================================================================== */
section('UI: GRID, BUILD SHEET, CATEGORY FILTERS');
/* ================================================================== */
try {
  await seedCity([], { grid: 6 });
  ok('6×6 grid renders 36 tiles', (await count('[data-tile]')) === 36, `${await count('[data-tile]')}`);
  ok('map shows 0 buildings', (await text('.cmb-title')).includes('0 buildings'));
  ok('City tab is active', (await text('.tab[aria-current="page"]')).includes('City'));

  ok('Build CTA opens the sheet', await click('[data-build-cta]'));
  await wait(300);
  ok('build sheet title names the first plot', /Build · plot 1, 1/.test(await text('.sheet h2')), await text('.sheet h2'));
  ok('sheet has 7 category chips (All + 6)', (await count('[data-cat]')) === 7, `${await count('[data-cat]')}`);
  ok('sheet lists all 31 buildings', (await count('[data-build]')) === 31, `${await count('[data-build]')}`);
  ok('every build row has art', (await count('.br-art svg')) + (await count('.br-art .ca-emoji')) === 31);

  const hanokRow = await text('[data-build="hanok"]');
  ok('hanok row shows size / pop / cost', /1×1/.test(hanokRow) && /6 pop/.test(hanokRow) && /60/.test(hanokRow), hanokRow);
  const villaRow = await text('[data-build="villa"]');
  ok('villa row shows 2×1 / 16 pop / lock reason', /2×1/.test(villaRow) && /16 pop/.test(villaRow) && /4 buildings/.test(villaRow), villaRow);
  const airportRow = await text('[data-build="airport"]');
  ok('airport row shows 3×3 / 60 jobs / tourism / global', /3×3/.test(airportRow) && /60 jobs/.test(airportRow) && /tour \+10\.0\/s/.test(airportRow) && /\+20% city/.test(airportRow), airportRow);
  ok('airport row shows its lock reason', /20 buildings/.test(airportRow), airportRow);
  ok('mall row shows its population lock', /120 residents/.test(await text('[data-build="mall"]')), await text('[data-build="mall"]'));

  await click('[data-cat="res"]');
  await wait(200);
  ok('Residential chip filters to 4 rows', (await count('[data-build]')) === 4, `${await count('[data-build]')}`);
  ok('Residential chip is pressed', (await attr('[data-cat="res"]', 'aria-pressed')) === 'true');
  ok('Residential group heading is correct', /RESIDENTIAL/i.test(await text('.build-group-head')));
  ok('Residential filter only shows res rows', (await page.locator('[data-build]').evaluateAll((els) => els.every((e) => e.className.includes('cat-res')))) === true);

  await click('[data-cat="transit"]');
  await wait(200);
  ok('Transit chip filters to 6 rows', (await count('[data-build]')) === 6, `${await count('[data-build]')}`);
  ok('Transit rows are all cat-transit', (await page.locator('[data-build]').evaluateAll((els) => els.every((e) => e.className.includes('cat-transit')))) === true);
  ok('Transit chip count is 6', /6/.test(await text('[data-cat="transit"]')), await text('[data-cat="transit"]'));

  await click('[data-cat="all"]');
  await wait(200);
  ok('All chip restores 31 rows', (await count('[data-build]')) === 31);
  const catCases = [
    ['com', 4, /COMMERCIAL/i],
    ['ind', 5, /INDUSTRY|INDUSTRIAL/i],
    ['svc', 7, /SERVICES/i],
    ['landmark', 5, /LANDMARK/i],
  ];
  for (const [cat, n, heading] of catCases) {
    await click(`[data-cat="${cat}"]`);
    await wait(180);
    ok(`${cat} chip filters to ${n} rows`, (await count('[data-build]')) === n, `${await count('[data-build]')}`);
    ok(`${cat} chip shows only ${cat} rows`, (await page.locator('[data-build]').evaluateAll((els, c) => els.every((e) => e.classList.contains(`cat-${c}`)), cat)) === true);
    ok(`${cat} group heading is correct`, heading.test(await text('.build-group-head')), await text('.build-group-head'));
  }
  await click('[data-cat="all"]');
  await wait(180);
  const ov390 = await overflow();
  ok('no horizontal overflow at 390 with the sheet open', ov390.doc <= ov390.client + 1 && ov390.body <= ov390.client + 1, JSON.stringify(ov390));
  await closeSheet();
  await page.setViewportSize({ width: 1440, height: 900 });
  await wait(250);
  await click('[data-build-cta]');
  await wait(300);
  const ov1440 = await overflow();
  ok('no horizontal overflow at 1440 with the sheet open', ov1440.doc <= ov1440.client + 1, JSON.stringify(ov1440));
  await closeSheet();
  await page.setViewportSize({ width: 390, height: 844 });
} catch (e) {
  ok('build sheet section completed', false, e.message);
}

/* ================================================================== */
section('UI: AFFORDABILITY AND LOCK REASONS');
/* ================================================================== */
try {
  await seedCity([], { grid: 6, coins: 0, resources: { brick: 0, timber: 0, glass: 0, steel: 0, energy: 0, blueprint: 0 } });
  await openBuildAt(0, 0);
  ok('zero-wallet hanok row is disabled', await loc('[data-build="hanok"]').isDisabled().catch(() => false));
  ok('zero-wallet hanok shows missing cost', /Missing/.test(await text('[data-build="hanok"]')), await text('[data-build="hanok"]'));
  ok('zero-wallet status is NEED', /NEED/i.test(await text('[data-build="hanok"]')), await text('[data-build="hanok"]'));
  ok('zero-wallet sheet says 0 ready', /0 ready/.test(await text('.build-ready')), await text('.build-ready'));
  ok('all 31 rows are off', (await count('.build-row.is-off')) === 31, `${await count('.build-row.is-off')}`);
  ok('locked cafe row shows 2 buildings', /2 buildings/.test(await text('[data-build="cafe"]')), await text('[data-build="cafe"]'));
  ok('locked palace row shows 12 badges', /12 A1 badges/.test(await text('[data-build="palace"]')), await text('[data-build="palace"]'));
  ok('locked row is disabled', await loc('[data-build="palace"]').isDisabled().catch(() => false));
  await closeSheet();
} catch (e) {
  ok('affordability section completed', false, e.message);
}

/* ================================================================== */
section('UI: EVERY CATEGORY + 1×1 / 2×1 / 3×2 PLACEMENT');
/* ================================================================== */
try {
  const hanoks = [mk('hanok', 0, 5), mk('hanok', 1, 5), mk('hanok', 2, 5), mk('hanok', 3, 5)];
  await seedCity(hanoks, { grid: 6, badges: 12 });

  ok('villa (res) opens the sheet', await openBuildAt(0, 0));
  ok('villa (res) places', await placeFromSheet('villa'));
  ok('cafe (com) opens the sheet', await openBuildAt(2, 0));
  ok('cafe (com) places', await placeFromSheet('cafe'));
  ok('brickworks (ind) opens the sheet', await openBuildAt(3, 0));
  ok('brickworks (ind) places', await placeFromSheet('brickworks'));
  ok('park (svc) opens the sheet', await openBuildAt(4, 0));
  ok('park (svc) places', await placeFromSheet('park'));
  ok('bus (transit) opens the sheet', await openBuildAt(5, 0));
  ok('bus (transit) places', await placeFromSheet('bus'));
  ok('palace (landmark) opens the sheet', await openBuildAt(0, 2));
  ok('palace (landmark) places', await placeFromSheet('palace'));
  await wait(500);

  const city = await readCity();
  const cats = await page.evaluate(async () => {
    const C = await import('/app/js/core/city-data.js');
    return [...new Set(window.horang.state.city.buildings.map((b) => C.def(b.type)?.category))];
  });
  ok('one building exists in every category', ['res', 'com', 'ind', 'svc', 'transit', 'landmark'].every((c) => cats.includes(c)), cats.join(','));
  ok('all_categories achievement fires', city.achievements.includes('all_categories'), city.achievements.join(','));
  ok('villa stored a 2×1 footprint', city.buildings.some((b) => b.type === 'villa' && b.w === 2 && b.h === 1));
  ok('palace stored a 3×2 footprint', city.buildings.some((b) => b.type === 'palace' && b.w === 3 && b.h === 2));
  ok('map has res / com / ind / svc / transit / landmark cells',
    (await count('.city-cell.cat-res')) > 0 &&
      (await count('.city-cell.cat-com')) > 0 &&
      (await count('.city-cell.cat-ind')) > 0 &&
      (await count('.city-cell.cat-svc')) > 0 &&
      (await count('.city-cell.cat-transit')) > 0 &&
      (await count('.city-cell.cat-landmark')) > 0);

  ok('villa has a tappable covered tile', (await count('[data-owner]')) > 0);
  ok('tapping the villa cover opens its inspector', await openBuildingOfType('villa'));
  ok('villa inspector shows 2×1', /2×1/.test(await text('.sheet')), await text('.sheet'));
  await closeSheet();
  ok('palace cover opens its inspector', await openBuildingOfType('palace'));
  ok('palace inspector shows 3×2', /3×2/.test(await text('.sheet')), await text('.sheet'));
  await closeSheet();
} catch (e) {
  ok('category placement section completed', false, e.message);
}

/* ================================================================== */
section('UI: 2×2 APARTMENT + UNIQUE SUBWAY');
/* ================================================================== */
try {
  const hanoks = Array.from({ length: 8 }, (_, i) => mk('hanok', i % 4, 4 + Math.floor(i / 4)));
  await seedCity(hanoks, { grid: 6 });
  ok('apartment sheet opens', await openBuildAt(0, 0));
  ok('apartment places', await placeFromSheet('apartment'));
  const apt = (await readCity()).buildings.find((b) => b.type === 'apartment');
  ok('apartment stored 2×2', apt?.w === 2 && apt?.h === 2, JSON.stringify(apt));
  ok('apartment has three covered placeholders', (await count(`[data-owner="${apt?.id}"]`)) === 3, `${await count(`[data-owner="${apt?.id}"]`)}`);
  ok('apartment cover opens the inspector', await openBuildingOfType('apartment'));
  ok('apartment inspector shows 2×2 and 4 tiles', /2×2/.test(await text('.sheet')) && /4 tiles/.test(await text('.sheet')), await text('.sheet'));
  await closeSheet();

  const fifteen = Array.from({ length: 15 }, (_, i) => mk('hanok', i % 8, Math.floor(i / 8)));
  await seedCity(fifteen, { grid: 9 });
  ok('subway unlocks at 15 buildings', await openBuildAt(0, 2));
  ok('subway places once', await placeFromSheet('subway'));
  ok('subway count is one', (await readCity()).buildings.filter((b) => b.type === 'subway').length === 1);
  ok('subway sheet reopens', await openBuildAt(0, 4));
  ok('second subway row is disabled', await loc('[data-build="subway"]').isDisabled().catch(() => false));
  ok('second subway row says Already built', /Already built/i.test(await text('[data-build="subway"]')), await text('[data-build="subway"]'));
  await closeSheet();
} catch (e) {
  ok('2×2 / unique section completed', false, e.message);
}

/* ================================================================== */
section('UI: 3×3 AIRPORT + COVERED TAPS + PERSISTENCE');
/* ================================================================== */
try {
  const villas = [];
  for (let i = 0; i < 20; i++) villas.push(mk('villa', (i % 4) * 2, Math.floor(i / 4)));
  await seedCity(villas, { grid: 9, badges: 12, era: 2, coins: 1e7 });

  ok('airport sheet opens on a free plot', await openBuildAt(0, 5));
  const row = await text('[data-build="airport"]');
  ok('airport row is unlocked and affordable', !/LOCKED|NEEDS/i.test(row) && /BUILD/i.test(row), row);
  ok('airport places', await placeFromSheet('airport'));
  await wait(350);
  const city = await readCity();
  const air = city.buildings.find((b) => b.type === 'airport');
  ok('airport stored 3×3', air?.w === 3 && air?.h === 3, JSON.stringify(air));
  ok('airport origin is (0,5)', air?.x === 0 && air?.y === 5);
  ok('airport has eight covered placeholders', (await count(`[data-owner="${air?.id}"]`)) === 8, `${await count(`[data-owner="${air?.id}"]`)}`);
  ok('airport origin spans 3 columns and 3 rows', /span 3/.test((await attr('[data-tile="0,5"]', 'style')) || ''), (await attr('[data-tile="0,5"]', 'style')) || '');
  const tiles = await page.evaluate(async (id) => {
    const C = await import('/app/js/core/city-data.js');
    const b = window.horang.state.city.buildings.find((x) => x.id === id);
    return C.tilesOf(b).length;
  }, air?.id);
  ok('airport covers nine tiles in the store', tiles === 9, `${tiles}`);
  ok('airport far corner opens the owner', await openBuildingOfType('airport'));
  ok('airport inspector shows 3×3', /3×3/.test(await text('.sheet')), await text('.sheet'));
  ok('airport inspector shows Transit / 60 jobs', /Transit/i.test(await text('.sheet')) && /60/.test(await text('.sheet')));
  await closeSheet();
  ok('toast burst is capped at 3', (await count('.toast')) <= 3, `${await count('.toast')}`);

  ok('airport row rejects the far edge (no room)', await openBuildAt(8, 8));
  ok('out-of-bounds airport row is disabled', await loc('[data-build="airport"]').isDisabled().catch(() => false));
  ok('out-of-bounds row explains the 3×3 requirement', /Needs 3×3 inside the map|No room/i.test(await text('[data-build="airport"]')), await text('[data-build="airport"]'));
  await closeSheet();

  const before = await readCity();
  await page.reload({ waitUntil: 'networkidle' });
  await wait(500);
  const after = await readCity();
  ok('reload keeps the airport', after.buildings.some((b) => b.type === 'airport' && b.w === 3 && b.h === 3));
  ok('reload keeps population', (await readStats()).population >= 320, `${(await readStats()).population}`);
  ok('reload keeps era and achievements',
    after.era === before.era && after.achievements.length >= before.achievements.length,
    `era ${after.era}, ${after.achievements.length} achievements`);
} catch (e) {
  ok('airport section completed', false, e.message);
}

/* ================================================================== */
section('UI: STATS MOVE IN THE RIGHT DIRECTION');
/* ================================================================== */
try {
  // bus
  await seedCity([mk('hanok', 0, 4), mk('hanok', 1, 4), mk('hanok', 0, 5), mk('hanok', 1, 5)], { grid: 6 });
  const base = await readStats();
  ok('four hanoks show 24 residents', (await text('[data-live="pop"]')) === '24', await text('[data-live="pop"]'));
  ok('base happiness is 35', (await text('[data-live="happy"]')) === '35', await text('[data-live="happy"]'));
  await openBuildAt(2, 4);
  ok('bus places', await placeFromSheet('bus'));
  const bus = await readStats();
  ok('bus raises transit coverage', bus.transitCoverage > base.transitCoverage && bus.transitCoverage === 1, `${base.transitCoverage} -> ${bus.transitCoverage}`);
  ok('bus raises happiness', bus.happiness > base.happiness, `${base.happiness} -> ${bus.happiness}`);
  ok('bus adds jobs', bus.jobs === 1);
  ok('transit readout is 100%', (await text('[data-live="transit"]')) === '100');
  ok('happiness readout matches stats', Number(await text('[data-live="happy"]')) === Math.round(bus.happiness));

  // school
  await seedCity([mk('apartment', 0, 0), mk('apartment', 2, 0), mk('apartment', 4, 0)], { grid: 6 });
  const schoolBase = await readStats();
  await openBuildAt(0, 2);
  ok('school places', await placeFromSheet('school'));
  const school = await readStats();
  ok('school raises service coverage from 0 to 1', schoolBase.serviceCoverage === 0 && school.serviceCoverage === 1);
  ok('school raises happiness', school.happiness > schoolBase.happiness, `${schoolBase.happiness} -> ${school.happiness}`);
  ok('school adds six jobs', school.jobs === 6);

  // park
  await seedCity([mk('hanok', 0, 0), mk('hanok', 1, 0)], { grid: 6 });
  const parkBase = await readStats();
  await openBuildAt(2, 0);
  ok('park places', await placeFromSheet('park'));
  const park = await readStats();
  ok('park raises service coverage', park.serviceCoverage > parkBase.serviceCoverage);
  ok('park raises happiness by 10 + service', park.happiness > parkBase.happiness + 9, `${parkBase.happiness} -> ${park.happiness}`);

  // power
  const twelve = Array.from({ length: 12 }, (_, i) => mk('hanok', i % 6, Math.floor(i / 6)));
  await seedCity(twelve, { grid: 6 });
  const powerBase = await readStats();
  await openBuildAt(0, 2);
  ok('power places', await placeFromSheet('power'));
  const power = await readStats();
  ok('power raises utilities', power.utilities > powerBase.utilities && power.utilities === 0.5, `${powerBase.utilities} -> ${power.utilities}`);
  ok('power adds pollution', power.pollution > powerBase.pollution && power.pollution === 10);
  ok('power pollution lowers happiness versus a clean city', power.happiness < powerBase.happiness, `${powerBase.happiness} -> ${power.happiness}`);

  // metro
  const ten = Array.from({ length: 10 }, (_, i) => mk('hanok', i % 5, Math.floor(i / 5)));
  await seedCity(ten, { grid: 6 });
  const metroBase = await readStats();
  await openBuildAt(0, 2);
  ok('metro places', await placeFromSheet('metro'));
  const metro = await readStats();
  ok('metro raises transit coverage to 100%', metro.transitCoverage === 1);
  ok('metro adds six jobs', metro.jobs === metroBase.jobs + 6);
  ok('metro raises happiness', metro.happiness > metroBase.happiness, `${metroBase.happiness} -> ${metro.happiness}`);

  // industry pollution
  const clean = [mk('hanok', 0, 0), mk('hanok', 1, 0), mk('hanok', 2, 0), mk('office', 0, 1)];
  await seedCity(clean, { grid: 6 });
  const cleanStats = await readStats();
  await openBuildAt(2, 1);
  ok('brickworks places', await placeFromSheet('brickworks'));
  const dirty = await readStats();
  ok('industry pollution rises', dirty.pollution === cleanStats.pollution + 4, `${cleanStats.pollution} -> ${dirty.pollution}`);
  ok('industry pollution lowers happiness', dirty.happiness < cleanStats.happiness, `${cleanStats.happiness} -> ${dirty.happiness}`);
  ok('pollution readout matches stats', Number(await text('[data-live="pollution"]')) === Math.round(dirty.pollution));
} catch (e) {
  ok('stats section completed', false, e.message);
}

/* ================================================================== */
section('UI: TIER TRANSITIONS AT DOCUMENTED POPULATIONS');
/* ================================================================== */
try {
  const cases = [
    [3, 90, 'Village'],
    [4, 120, 'Town'],
    [14, 420, 'City'],
    [40, 1200, 'Metropolis'],
  ];
  for (const [n, pop, tier] of cases) {
    const buildings = Array.from({ length: n }, (_, i) => mk('officetel', i % 8, Math.floor(i / 8)));
    await seedCity(buildings, { grid: 9 });
    const s = await readStats();
    ok(`${pop} residents show ${tier}`, s.population === pop && s.tier.name === tier, `${s.population}/${s.tier.name}`);
    ok(`${tier} is the UI tier`, (await text('[data-live="tier"]')) === tier, await text('[data-live="tier"]'));
  }
  const mega = Array.from({ length: 81 }, (_, i) => mk('officetel', i % 9, Math.floor(i / 9), 3));
  await seedCity(mega, { grid: 9 });
  const ms = await readStats();
  ok('3402 residents show Megacity', ms.population === 3402 && ms.tier.name === 'Megacity', `${ms.population}/${ms.tier.name}`);
  ok('Megacity is the UI tier', (await text('[data-live="tier"]')) === 'Megacity');
} catch (e) {
  ok('tier section completed', false, e.message);
}

/* ================================================================== */
section('UI: INSPECTOR — UPGRADE, SELL, MAX LEVEL');
/* ================================================================== */
try {
  await seedCity([mk('villa', 0, 0)], { grid: 6, coins: 1e7 });
  ok('villa inspector opens from its cover', await openBuildingOfType('villa'));
  const ins = await text('.sheet');
  ok('inspector shows category / footprint / level', /Residential/i.test(ins) && /2×1/.test(ins) && /Level 1/i.test(ins), ins);
  ok('inspector shows residents', /16/.test(ins));
  ok('upgrade button is enabled', !(await loc('[data-up]').isDisabled().catch(() => true)));
  ok('upgrade button shows the gain', /Upgrade/.test(await text('[data-up]')), await text('[data-up]'));
  ok('villa upgrades', await click('[data-up]'));
  await wait(600);
  const up = (await readCity()).buildings.find((b) => b.type === 'villa');
  ok('villa reaches level 2', up?.level === 2);
  ok('level 2 villa houses 19', (await readStats()).population === 19, `${(await readStats()).population}`);
  ok('population readout updates to 19', (await text('[data-live="pop"]')) === '19', await text('[data-live="pop"]'));

  ok('villa inspector reopens', await openBuildingOfType('villa'));
  ok('sell button opens the confirmation modal', await click('[data-sell]'));
  await wait(300);
  ok('sell modal names the building', /Sell Villa\?/.test(await text('.modal h2')), await text('.modal h2'));
  ok('sell modal mentions the 2 tiles', /2 tiles/.test(await text('.modal')), await text('.modal'));
  ok('sell confirmation runs', await click('.modal [data-act="0"]'));
  await wait(650);
  const sold = await readCity();
  ok('selling removes the building', sold.buildings.length === 0);
  ok('selling frees the map', (await count('.city-cell.is-built')) === 0);

  await seedCity([mk('hanok', 0, 0, 10)], { grid: 6 });
  ok('max-level inspector opens', await openBuildingOfType('hanok'));
  ok('max-level building has no upgrade button', (await count('[data-up]')) === 0);
  ok('max-level copy is shown', /Maximum level/.test(await text('.sheet')), await text('.sheet'));
  await closeSheet();
} catch (e) {
  ok('inspector section completed', false, e.message);
}

/* ================================================================== */
section('UI: TRANSIT OVERLAY');
/* ================================================================== */
try {
  await seedCity([mk('hanok', 0, 0), mk('bus', 1, 0)], { grid: 6 });
  ok('overlay button shows 100% coverage', /100%/.test(await text('[data-overlay]')), await text('[data-overlay]'));
  ok('overlay starts off', (await attr('[data-overlay]', 'aria-pressed')) === 'false');
  ok('overlay toggles on', await click('[data-overlay]'));
  await wait(250);
  ok('overlay aria-pressed is true', (await attr('[data-overlay]', 'aria-pressed')) === 'true');
  ok('map gets the is-overlay class', /is-overlay/.test((await attr('.city-map', 'class')) || ''));
  ok('coverage cells are marked', (await count('.city-cell.is-in-cov')) > 0, `${await count('.city-cell.is-in-cov')}`);
  const dim = await page.evaluate(() => {
    const built = document.querySelector('.city-cell.is-built:not(.cat-transit)');
    const transit = document.querySelector('.city-cell.cat-transit');
    return {
      built: built ? Number(getComputedStyle(built).opacity) : 1,
      transit: transit ? Number(getComputedStyle(transit).opacity) : 1,
    };
  });
  ok('non-transit tiles are dimmed', dim.built < 0.8, JSON.stringify(dim));
  ok('transit tiles stay bright', dim.transit === 1);
  ok(
    'overlay legend shows coverage while on',
    /Transit coverage/i.test(await text('.city-legend')) && /100% of residents/i.test(await text('.city-legend')),
    await text('.city-legend')
  );
  ok('overlay toggles off', await click('[data-overlay]'));
  await wait(250);
  ok('overlay aria-pressed is false', (await attr('[data-overlay]', 'aria-pressed')) === 'false');
  ok('map loses the is-overlay class', !/is-overlay/.test((await attr('.city-map', 'class')) || ''));

  await seedCity([mk('hanok', 0, 0)], { grid: 6 });
  await click('[data-overlay]');
  await wait(250);
  ok('no-transit overlay explains itself', /No transit yet/i.test(await text('.toast')), await text('.toast'));
  ok('no-transit overlay still shows 0%', /0%/.test(await text('[data-overlay]')));
} catch (e) {
  ok('overlay section completed', false, e.message);
}

/* ================================================================== */
section('UI: ACHIEVEMENTS SHEET');
/* ================================================================== */
try {
  await seedCity([], { grid: 6 });
  ok('achievements button opens the sheet', await click('[data-ach]'));
  await wait(300);
  ok('achievements sheet title is correct', /City achievements/i.test(await text('.sheet h2')), await text('.sheet h2'));
  ok('achievements sheet lists all 32', (await count('.ach')) === 32, `${await count('.ach')}`);
  ok('achievements header starts at 0/32', /0/.test(await text('.ach-head')) && /32/.test(await text('.ach-head')), await text('.ach-head'));
  ok('a known achievement is present', /Open skies/.test(await text('.ach-wrap')) && /Airport/i.test(await text('.ach-wrap')));
  await closeSheet();
  ok('achievements button is not dead', (await count('[data-ach]')) === 1);
} catch (e) {
  ok('achievements section completed', false, e.message);
}

/* ================================================================== */
section('UI: PRESTIGE');
/* ================================================================== */
try {
  await seedCity([mk('hanok', 0, 0), mk('hanok', 1, 0)], {
    grid: 6,
    lifetimeWon: 25000,
    achievements: ['first_brick', 'pop100'],
    badges: 2,
    prestigeCount: 1,
  });
  ok('prestige button appears when ready', (await count('[data-prestige]')) === 1);
  ok('prestige modal opens', await click('[data-prestige]'));
  await wait(300);
  ok('prestige modal names Era 2', /Begin Era 2\?/.test(await text('.modal h2')), await text('.modal h2'));
  ok('prestige modal promises the permanent bonus', /\+50%/.test(await text('.modal')));
  ok('prestige confirmation runs', await click('.modal [data-act="0"]'));
  await wait(700);
  const p = await readCity();
  ok('prestige advances the era', p.era === 2, `${p.era}`);
  ok('prestige clears buildings', p.buildings.length === 0, `${p.buildings.length}`);
  ok('prestige keeps achievements', p.achievements.includes('first_brick') && p.achievements.includes('pop100'), p.achievements.join(','));
  ok('prestige keeps badges', p.badges === 2, `${p.badges}`);
  ok('prestige resets Won', p.coins === 0, `${p.coins}`);
  ok('prestige resets materials', Object.values(p.resources).every((v) => v === 0), JSON.stringify(p.resources));
  ok('city screen shows Era 2', /Era 2/i.test(await text('.city-hero')), await text('.city-hero'));
  ok('prestige button disappears until ready again', (await count('[data-prestige]')) === 0);

  await seedCity([mk('hanok', 0, 0)], { era: 4, lifetimeWon: 1e6, badges: 3, prestigeCount: 3 });
  ok('max-era prestige does not promise Era 5', !/Era 5/.test(await text('[data-prestige]')), await text('[data-prestige]'));
  if (await click('[data-prestige]')) {
    await wait(300);
    await click('.modal [data-act="0"]');
    await wait(700);
    ok('max-era prestige does not waste the city', (await readCity()).buildings.length === 1, `buildings=${(await readCity()).buildings.length}`);
  } else {
    ok('max-era prestige cannot be triggered', true);
  }
} catch (e) {
  ok('prestige section completed', false, e.message);
}

/* ================================================================== */
section('UI: LEGACY SAVE MIGRATION');
/* ================================================================== */
try {
  // The old catalogue had no footprints: apartment/office were 1×1. A save with
  // two of them side by side must not become an overlapping 2×2 pair on load.
  const legacy = [
    { id: 'old_apt_a', type: 'apartment', x: 0, y: 0, level: 1 },
    { id: 'old_apt_b', type: 'apartment', x: 1, y: 0, level: 1 },
    { id: 'old_off_a', type: 'office', x: 3, y: 3, level: 1 },
    { id: 'old_off_b', type: 'office', x: 4, y: 3, level: 1 },
  ];
  await seedCity(legacy, { grid: 6 });
  const migration = await page.evaluate(async () => {
    const C = await import('/app/js/core/city-data.js');
    const c = window.horang.state.city;
    const tiles = c.buildings.flatMap((b) => C.tilesOf(b));
    return {
      buildings: c.buildings.map((b) => ({ type: b.type, x: b.x, y: b.y, w: b.w, h: b.h })),
      sum: tiles.length,
      unique: new Set(tiles.map((t) => `${t.x},${t.y}`)).size,
    };
  });
  ok('legacy buildings receive catalogue footprints', migration.buildings.every((b) => b.w >= 1 && b.h >= 1), JSON.stringify(migration.buildings));
  ok(
    'legacy migration does not create overlapping footprints',
    migration.sum === migration.unique,
    `covered tiles=${migration.sum}, unique tiles=${migration.unique}`
  );
  ok(
    'legacy map has one cell per unique tile',
    (await count('.city-cell.is-built')) + (await count('.city-cell.is-cover')) === migration.unique,
    `built+cover=${(await count('.city-cell.is-built')) + (await count('.city-cell.is-cover'))}, unique=${migration.unique}`
  );
} catch (e) {
  ok('legacy migration section completed', false, e.message);
}

/* ================================================================== */
section('UI: OFFLINE REPORT (2 HOURS)');
/* ================================================================== */
try {
  const twoHoursAgo = Date.now() - 2 * 3600 * 1000;
  await seedCity([mk('brickworks', 0, 0)], { grid: 6, lastTick: twoHoursAgo, coins: 0 });
  await page.waitForTimeout(900);
  const report = await text('.sheet');
  ok('offline report appears', /While you were away/i.test(report), report.split(' ').slice(0, 4).join(' '));
  ok('offline report shows 2h', /2h 0m/.test(report), report);
  ok('offline report shows coins gained', /\+/.test(report));
  ok('offline report shows bricks gained', /\+/.test(report) && /🧱/.test(report));
  ok('offline report has Collect', /Collect/i.test(report));
  await click('.sheet [data-act="0"]');
  await wait(350);
  ok('Collect closes the report', (await count('.sheet')) === 0);
  const consumed = await page.evaluate(() => window.horang.state.city.pendingReport || null);
  ok('report is consumed once', consumed === null);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  ok('report does not reappear after reload', (await count('.sheet')) === 0);
} catch (e) {
  ok('offline section completed', false, e.message);
}

/* ================================================================== */
section('INTEGRATION: HOME / PROFILE / COMPLETE / NAV');
/* ================================================================== */
const CITY_FIXTURE = [
  mk('apartment', 0, 0),
  mk('apartment', 2, 0),
  mk('apartment', 4, 0),
  mk('cafe', 2, 3),
  mk('bus', 3, 2),
  mk('school', 0, 2),
  mk('park', 2, 2),
  mk('palace', 0, 4),
];
try {
  await seedCity(CITY_FIXTURE, { grid: 6, badges: 12 });
  const s = await readStats();
  ok('integration city has 144 residents', s.population === 144, `${s.population}`);
  ok('integration city is Town', s.tier.name === 'Town');
  ok('integration city has 8 buildings', (await readCity()).buildings.length === 8);
  ok('panel income matches the snapshot', Number(await text('[data-live="income"]')) === Number(s.income.toFixed(1)), `${await text('[data-live="income"]')} vs ${s.income.toFixed(1)}`);
  ok('panel building income matches', Number(await text('[data-live="binc"]')) === Number(s.buildingIncome.toFixed(1)), `${await text('[data-live="binc"]')} vs ${s.buildingIncome.toFixed(1)}`);
  ok('panel tax breakdown matches', Number(await text('[data-live="tax"]')) === Number(s.tax.toFixed(1)), `${await text('[data-live="tax"]')} vs ${s.tax.toFixed(1)}`);
  ok('panel tourism breakdown matches', Number(await text('[data-live="tour"]')) === Number(s.tourism.toFixed(1)), `${await text('[data-live="tour"]')} vs ${s.tourism.toFixed(1)}`);
  ok('panel jobs / transit / pollution match', Number(await text('[data-live="jobs"]')) === s.jobs && Number(await text('[data-live="transit"]')) === Math.round(s.transitCoverage * 100) && Number(await text('[data-live="pollution"]')) === Math.round(s.pollution));

  await page.goto(`${BASE}/#/home`, { waitUntil: 'networkidle' });
  await wait(500);
  const card = (await text('.city-card')).toLowerCase();
  ok('home city card exists', (await count('.city-card')) === 1);
  ok('home card shows era + tier', card.includes('era 1') && card.includes('town'), card);
  ok('home card shows population', card.includes('144 residents'), card);
  ok('home card shows income to one decimal', card.includes(`₩${s.income.toFixed(1)}/s`), `₩${s.income.toFixed(1)}/s / ${card}`);
  ok('home card shows happiness', card.includes(`${Math.round(s.happiness)}%`), card);
  ok('home card shows building count', card.includes('8 buildings'), card);
  ok('home card links to the city', await click('.city-card'));
  await wait(500);
  ok('home card navigates to #/city', (await page.evaluate(() => location.hash)) === '#/city');
  ok('City tab is active after the home card', (await text('.tab[aria-current="page"]')).includes('City'));

  await page.goto(`${BASE}/#/profile`, { waitUntil: 'networkidle' });
  await wait(500);
  ok('profile has one Seoul Works row', (await count('[data-go="city"]')) === 1);
  const prof = (await text('[data-go="city"]')).toLowerCase();
  ok('profile row shows era + tier', prof.includes('era 1') && prof.includes('town'), prof);
  ok('profile row shows population', prof.includes('144 residents'), prof);
  ok('profile row shows income', prof.includes(`₩${s.income.toFixed(1)}/s`), `₩${s.income.toFixed(1)}/s / ${prof}`);
  ok('profile row links to the city', await click('[data-go="city"]'));
  await wait(500);
  ok('profile row navigates to #/city', (await page.evaluate(() => location.hash)) === '#/city');

  await page.evaluate(() => {
    const s = window.horang.state;
    s.lastSummary = {
      kind: 'node',
      lessonKind: 'node',
      lessonId: 'qa-lesson',
      unitId: 'qa-unit',
      unitTitle: 'QA Unit',
      nodeIndex: 0,
      nodeTitle: 'QA Session',
      stars: 3,
      accuracy: 0.9,
      seconds: 90,
      correct: 9,
      wrong: 1,
      answers: 10,
      answerXp: 50,
      bonusXp: 20,
      coins: 12,
      xp: 70,
      stamps: [],
      strong: [],
      met: [],
      newStamps: [],
      chestFilled: false,
      bestCombo: 5,
      levelsUp: false,
      level: 1,
      materials: { brick: 12, timber: 4, glass: 2, steel: 0, energy: 0, blueprint: 0 },
    };
    window.horang.store.saveNow();
  });
  await page.goto(`${BASE}/#/complete`, { waitUntil: 'networkidle' });
  await wait(500);
  ok('complete screen has a materials strip', (await count('.cmp-mat')) === 3, `${await count('.cmp-mat')}`);
  const mats = await text('.cmp-mats');
  ok('materials strip shows brick +12', /\+12/.test(mats) && /Bricks/i.test(mats), mats);
  ok('materials strip shows timber +4', /\+4/.test(mats) && /Timber/i.test(mats));
  ok('complete screen shows the city line', /Town/i.test(mats) && /144 residents/i.test(mats) && /82% happy/i.test(mats), mats);
  ok('complete screen links to Seoul Works', (await count('.cmp-mats [data-go="city"]')) === 1);

  // Save/reload the whole fixture.
  const before = await readCity();
  await page.goto(`${BASE}/#/city`, { waitUntil: 'networkidle' });
  await page.reload({ waitUntil: 'networkidle' });
  await wait(500);
  const after = await readCity();
  ok('reload keeps the city buildings', after.buildings.length === before.buildings.length);
  ok('reload keeps population / era', (await readStats()).population === 144 && after.era === before.era);
  ok('reload keeps achievements', after.achievements.length >= before.achievements.length);
} catch (e) {
  ok('integration section completed', false, e.message);
}

/* ================================================================== */
section('QUALITY: OVERFLOW, DEAD BUTTONS, TOASTS, REDUCED MOTION, ERRORS');
/* ================================================================== */
try {
  // city at both widths, including a 9×9 grid and an open sheet
  const villas = [];
  for (let i = 0; i < 20; i++) villas.push(mk('villa', (i % 4) * 2, Math.floor(i / 4)));
  villas.push(mk('airport', 0, 5));
  await seedCity(villas, { grid: 9, badges: 12, era: 2 });
  const ovMobile = await overflow();
  ok('9×9 city has no overflow at 390', ovMobile.doc <= ovMobile.client + 1 && ovMobile.body <= ovMobile.client + 1, JSON.stringify(ovMobile));
  await page.setViewportSize({ width: 1440, height: 900 });
  await wait(300);
  const ovDesktop = await overflow();
  ok('9×9 city has no overflow at 1440', ovDesktop.doc <= ovDesktop.client + 1, JSON.stringify(ovDesktop));
  await page.setViewportSize({ width: 390, height: 844 });
  await wait(250);

  // recognized handlers on every enabled button on the city screen
  const buttons = await page.locator('.city button:not([disabled])').evaluateAll((els) =>
    els.map((e) => ({
      label: (e.innerText || '').trim().slice(0, 24),
      handled: ['data-tile', 'data-bid', 'data-owner', 'data-build-cta', 'data-ach', 'data-expand', 'data-go', 'data-next', 'data-prestige', 'data-overlay'].some((a) => e.hasAttribute(a)),
    }))
  );
  const dead = buttons.filter((b) => !b.handled);
  ok('every enabled city button has a handler', dead.length === 0, JSON.stringify(dead));

  ok('Build CTA is not dead', await click('[data-build-cta]'));
  await wait(250);
  ok('Build CTA opened the sheet', (await count('.sheet')) === 1);
  await closeSheet();
  ok('Achievements button is not dead', await click('[data-ach]'));
  await wait(250);
  ok('Achievements opened the sheet', (await count('.sheet')) === 1);
  await closeSheet();
  ok('Next unlock card is not dead', await click('[data-next]'));
  await wait(250);
  ok('Next unlock card opened a sheet', (await count('.sheet')) === 1);
  await closeSheet();
  await seedCity([], { grid: 6, coins: 1e7 });
  const gridBefore = (await readCity()).grid;
  ok('Expand is not dead', await click('[data-expand]'));
  await wait(500);
  ok('Expand grew the grid', (await readCity()).grid === gridBefore + 1, `${gridBefore} -> ${(await readCity()).grid}`);
  await page.goto(`${BASE}/#/city`, { waitUntil: 'networkidle' });
  await wait(350);
  ok('Market link is not dead', await click('[data-go="shop"]'));
  await wait(450);
  ok('Market link goes to the shop', /#\/shop/.test(await page.evaluate(() => location.hash)), await page.evaluate(() => location.hash));
  await page.goto(`${BASE}/#/city`, { waitUntil: 'networkidle' });
  await wait(350);

  // toast cap + viewport bounds
  await page.evaluate(() => {
    for (let i = 0; i < 6; i++) window.horang.ui.toast(`QA toast ${i}`);
  });
  await wait(100);
  ok('toasts are capped at three', (await count('.toast')) === 3, `${await count('.toast')}`);
  const toastBox = await page.evaluate(() => {
    const t = document.querySelector('.toast-wrap');
    if (!t) return null;
    const r = t.getBoundingClientRect();
    return { left: r.left, right: r.right, width: r.width, vw: innerWidth };
  });
  ok('toast stack stays inside the viewport', toastBox && toastBox.left >= 0 && toastBox.right <= toastBox.vw + 1, JSON.stringify(toastBox));

  // reduced motion
  await seedCity([mk('hanok', 0, 0)], { grid: 6, reducedMotion: true });
  ok('reduced motion class is applied', /reduce-motion/.test(await page.evaluate(() => document.body.className)));
  await page.evaluate(() => window.horang.ui.confetti({ count: 20 }));
  await wait(100);
  ok('reduced motion suppresses confetti', (await count('.confetti-layer')) === 0, `${await count('.confetti-layer')}`);
  const anim = await page.evaluate(() => {
    const el = document.querySelector('.city-cell.is-built');
    return el ? getComputedStyle(el).transitionDuration : '';
  });
  ok('reduced motion shortens CSS transitions', /0\.001s|0s/.test(anim), anim);
  ok('reduced motion still places a building', await openBuildAt(1, 0) && await placeFromSheet('hanok'));
  ok('reduced motion placement does not add confetti', (await count('.confetti-layer')) === 0);

  // Home / Profile / Complete overflow at both widths
  for (const route of ['home', 'profile', 'complete']) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/#/${route}`, { waitUntil: 'networkidle' });
    await wait(300);
    const m = await overflow();
    ok(`${route} has no overflow at 390`, m.doc <= m.client + 1 && m.body <= m.client + 1, JSON.stringify(m));
    await page.setViewportSize({ width: 1440, height: 900 });
    await wait(300);
    const d = await overflow();
    ok(`${route} has no overflow at 1440`, d.doc <= d.client + 1, JSON.stringify(d));
  }
} catch (e) {
  ok('quality section completed', false, e.message);
}

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */

ok('no unexpected console/page errors', errs.length === 0, errs.join(' | '));

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed, ${warn} warnings`);

if (fail) {
  console.log('\nFailing checks (see the bug report in the QA hand-off):');
  out.filter((l) => l.includes('✗')).forEach((l) => console.log(l));
}
if (warn) {
  console.log('\nWarnings / observations:');
  out.filter((l) => l.includes('⚠')).forEach((l) => console.log(l));
}

await browser.close();
process.exit(fail || errs.length ? 1 : 0);
