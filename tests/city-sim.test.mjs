// Seoul Works — deep metropolis simulation tests. Pure rules, no DOM.
// Exercises every category, every new building, multi-tile footprints,
// coverage maths, tiers, the new achievements and long offline ticks.
import * as C from '../app/js/core/city-data.js';
import { buildShowcaseCity, SHOWCASE_LAYOUT } from '../app/js/core/showcase-city.js';

let pass = 0, fail = 0;
const out = [];
const ok = (n, c, e = '') => { if (c) pass++; else fail++; out.push(`  ${c ? '✓' : '✗'} ${n}${e ? ' — ' + e : ''}`); };
const section = (t) => out.push(`\n${t}`);
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

const seed = (c) => {
  c.resources = { brick: 1e6, timber: 1e6, glass: 1e6, steel: 1e6, energy: 1e6, blueprint: 20 };
  return c;
};
const mk = (type, x, y, level = 1) => {
  const s = C.sizeOf(type);
  return { id: `b_${type}_${x}_${y}_${level}`, type, x, y, w: s.w, h: s.h, level };
};
const cityOf = (list, extra = {}) => ({ ...C.newCity(1000), ...extra, buildings: list });
const earnedIds = (city, ctx = { badges: 0 }) => C.checkAchievements(city, ctx).map((a) => a.id);

section('Every category');
{
  const byCat = {};
  for (const d of C.catalogList()) byCat[d.category] = (byCat[d.category] || 0) + 1;
  for (const cat of ['res', 'com', 'ind', 'svc', 'transit', 'landmark']) {
    ok(`category ${cat} has buildings`, (byCat[cat] || 0) > 0, `${byCat[cat] || 0}`);
    ok(`category ${cat} has label/ko/color`, !!(C.CATEGORIES[cat].label && C.CATEGORIES[cat].ko && C.CATEGORIES[cat].color));
    ok(`category meta ${cat} has an icon`, !!C.CATEGORY_META[cat].icon && !!C.CATEGORY_META[cat].emoji);
  }
  ok('category keys match meta keys', Object.keys(C.CATEGORIES).join() === Object.keys(C.CATEGORY_META).join());
}

section('Every new building matches the contract');
const NEW = [
  ['villa', 'res', 2, 1, { income: 1.2, pop: 16, jobs: 0 }, { coins: 300 }, { buildings: 4 }],
  ['officetel', 'res', 1, 1, { income: 2.4, pop: 30, jobs: 0 }, { coins: 1200 }, { buildings: 8 }],
  ['mall', 'com', 2, 2, { income: 9, pop: 0, jobs: 30 }, { coins: 4000 }, { pop: 120 }],
  ['factory', 'ind', 3, 2, { income: 6, pop: 0, jobs: 40, pollution: 12 }, { coins: 8000 }, { buildings: 14 }],
  ['school', 'svc', 2, 2, { jobs: 6, coverage: 5, service: 'education' }, { coins: 1200 }, { pop: 80 }],
  ['hospital', 'svc', 2, 2, { jobs: 10, coverage: 6, service: 'health' }, { coins: 6000 }, { pop: 180 }],
  ['police', 'svc', 1, 1, { jobs: 4, coverage: 4, service: 'safety' }, { coins: 700 }, { buildings: 8 }],
  ['fire', 'svc', 1, 1, { jobs: 5, coverage: 4, service: 'safety' }, { coins: 900 }, { buildings: 10 }],
  ['power', 'svc', 2, 2, { jobs: 8, pollution: 10, service: 'utility' }, { coins: 3000 }, { buildings: 12 }],
  ['water', 'svc', 1, 1, { jobs: 3, service: 'utility' }, { coins: 400 }, { buildings: 6 }],
  ['bus', 'transit', 1, 1, { jobs: 1, coverage: 2, service: 'transit' }, { coins: 150 }, { buildings: 3 }],
  ['metro', 'transit', 2, 1, { jobs: 6, coverage: 4, service: 'transit', global: 0.05 }, { coins: 1800 }, { buildings: 10 }],
  ['train', 'transit', 2, 2, { jobs: 10, coverage: 6, service: 'transit', global: 0.08 }, { coins: 7000 }, { buildings: 18, pop: 150 }],
  ['ferry', 'transit', 1, 1, { jobs: 3, coverage: 3, service: 'transit', global: 0.03 }, { coins: 1200 }, { buildings: 8 }],
  ['airport', 'transit', 3, 3, { jobs: 60, coverage: 8, service: 'transit', global: 0.2, tourism: 10 }, { coins: 40000 }, { buildings: 20, pop: 300 }],
  ['palace', 'landmark', 3, 2, { jobs: 6, tourism: 6 }, { coins: 30000 }, { badges: 12 }],
  ['stadium', 'landmark', 3, 2, { jobs: 20, tourism: 5, happiness: 8, coverage: 5 }, { coins: 20000 }, { pop: 400 }],
  ['lotte', 'landmark', 2, 2, { income: 12, jobs: 80, global: 0.1, tourism: 8 }, { coins: 50000 }, { buildings: 24, pop: 500 }],
  ['bridge', 'landmark', 3, 1, { global: 0.06 }, { coins: 12000 }, { buildings: 15 }],
];
for (const [id, cat, w, h, econ, cost, req] of NEW) {
  const d = C.def(id);
  ok(`${id}: exists with a name`, !!d && !!d.name && !!d.ko, d?.name || 'missing');
  ok(`${id}: ${cat} ${w}×${h}`, d?.category === cat && d.w === w && d.h === h, d ? `${d.category} ${d.w}×${d.h}` : 'missing');
  let econOk = true;
  for (const [k, v] of Object.entries(econ)) econOk = econOk && d?.[k] === v;
  ok(`${id}: economy fields`, econOk, JSON.stringify(econ));
  ok(`${id}: cost ${cost.coins}`, d?.cost.coins === cost.coins);
  let reqOk = true;
  for (const [k, v] of Object.entries(req)) reqOk = reqOk && d?.requires?.[k] === v;
  ok(`${id}: requires`, reqOk, JSON.stringify(req));
  ok(`${id}: has a human description`, typeof d?.desc === 'string' && d.desc.length > 10);
}

section('Existing buildings keep their contract values');
{
  const checks = [
    ['hanok', { pop: 6 }],
    ['cafe', { jobs: 4 }],
    ['park', { coverage: 2, service: 'park', happiness: 4 }],
    ['shop', { jobs: 8 }],
    ['apartment', { w: 2, h: 2, pop: 48, income: 3 }],
    ['office', { w: 2, h: 1, jobs: 60, income: 10 }],
    ['brickworks', { jobs: 10, pollution: 4 }],
    ['sawmill', { jobs: 8, pollution: 2 }],
    ['glassworks', { jobs: 8, pollution: 3 }],
    ['steelworks', { w: 2, h: 2, jobs: 24, pollution: 8 }],
    ['subway', { w: 2, h: 1, coverage: 5, global: 0.1 }],
    ['tower', { w: 2, h: 2, global: 0.25, tourism: 6 }],
  ];
  for (const [id, fields] of checks) {
    const d = C.def(id);
    let good = true;
    for (const [k, v] of Object.entries(fields)) good = good && d?.[k] === v;
    ok(`${id}: unchanged core stats`, good, JSON.stringify(fields));
  }
  ok('subway is still unique', C.def('subway').unique === true);
  ok('tower is still unique', C.def('tower').unique === true);
  ok('all four old factories produce', ['brickworks', 'sawmill', 'glassworks', 'steelworks'].every((id) => !!C.def(id).produce));
}

section('3×3 airport placement');
{
  const c = seed(C.newCity(1000));
  c.grid = 12;
  for (const [x, y] of [[0, 0], [2, 0], [4, 0], [0, 2], [2, 2], [4, 2]]) c.buildings.push(mk('apartment', x, y));
  for (const [x, y] of [[6, 0], [7, 0], [8, 0], [6, 1], [7, 1], [8, 1], [6, 2], [7, 2], [8, 2], [6, 3], [7, 3], [8, 3], [6, 4], [7, 4], [8, 4]]) c.buildings.push(mk('hanok', x, y));
  ok('fixture has 21 buildings', c.buildings.length === 21);
  ok('fixture has 300+ residents', C.cityStats(c).population >= 300, `${C.cityStats(c).population}`);
  ok('airport is placeable at 0,6', C.placeable(c, 'airport', 0, 6).ok === true, C.placeable(c, 'airport', 0, 6).reason || '');
  const p = C.place(c, 'airport', 0, 6, 1e6);
  ok('airport places', p.ok === true);
  ok('airport stores a 3×3 footprint', p.building.w === 3 && p.building.h === 3);
  ok('airport occupies nine tiles', C.tilesOf(p.building).length === 9);
  ok('airport owns its far corner', C.buildingAt(c, 2, 8) === p.building);
  ok('airport overlaps are rejected', C.placeable(c, 'hanok', 1, 7).ok === false);
  ok('second airport overlaps', C.placeable(c, 'airport', 1, 6).ok === false);
  ok('airport rejects out-of-bounds x', C.placeable(c, 'airport', 10, 6).reason === 'Outside the grid');
  ok('airport rejects out-of-bounds y', C.placeable(c, 'airport', 3, 10).reason === 'Outside the grid');

  const lowPop = seed(C.newCity(1000));
  lowPop.grid = 12;
  for (let i = 0; i < 20; i++) lowPop.buildings.push(mk('hanok', i % 12, Math.floor(i / 12)));
  ok('airport needs 300 residents', C.placeable(lowPop, 'airport', 0, 6).reason.includes('residents'));

  const lowBuild = seed(C.newCity(1000));
  lowBuild.grid = 12;
  for (let i = 0; i < 10; i++) lowBuild.buildings.push(mk('apartment', (i % 4) * 2, Math.floor(i / 4) * 2));
  ok('airport needs 20 buildings', C.placeable(lowBuild, 'airport', 0, 6).reason.includes('buildings'));
}

section('Footprints and tile coverage');
{
  const c = cityOf([mk('apartment', 1, 1), mk('bridge', 0, 4), mk('villa', 4, 0)]);
  ok('apartment tiles start at origin', C.tilesOf(c.buildings[0])[0].x === 1 && C.tilesOf(c.buildings[0])[0].y === 1);
  ok('apartment covers (2,2)', C.buildingAt(c, 2, 2) === c.buildings[0]);
  ok('bridge covers three columns', C.tilesOf(c.buildings[1]).map((t) => t.x).join() === '0,1,2');
  ok('villa covers two columns', C.tilesOf(c.buildings[2]).length === 2);
  ok('occupiedMap tile total', C.occupiedMap(c).size === 4 + 3 + 2);
  ok('occupied returns the owner tile', C.occupied(c, 2, 2) === c.buildings[0]);
  ok('buildingAt on empty is null', C.buildingAt(c, 5, 5) === null);

  const legacy = cityOf([{ id: 'old', type: 'apartment', x: 0, y: 0, level: 1 }]);
  ok('old save: one tile', C.tilesOf(legacy.buildings[0]).length === 1);
  ok('old save: neighbour is free', C.buildingAt(legacy, 1, 0) === null);
  ok('old save: can place next door', C.placeable(legacy, 'hanok', 1, 0).ok === true);
  ok('old save: still counts 48 residents', C.cityStats(legacy).population === 48);
  ok('old save: sell still works', C.sell(legacy, 'old').ok === true);
}

section('Population and jobs maths');
{
  const c = cityOf([mk('hanok', 0, 0), mk('hanok', 1, 0), mk('officetel', 2, 0), mk('apartment', 3, 0), mk('office', 5, 0), mk('cafe', 0, 1)]);
  const s = C.cityStats(c);
  ok('population sums every resident', s.population === 6 + 6 + 30 + 48, `${s.population}`);
  ok('jobs sum every job', s.jobs === 60 + 4, `${s.jobs}`);
  ok('employment is jobs/pop', near(s.employment, 64 / 90), `${s.employment}`);

  const scaled = C.cityStats(cityOf([mk('hanok', 0, 0, 2), mk('apartment', 2, 0, 2), mk('office', 0, 2, 2)]));
  ok('level-2 hanok houses 7', scaled.population === 7 + 58, `${scaled.population}`);
  ok('level-2 apartment houses 58', C.cityStats(cityOf([mk('apartment', 0, 0, 2)])).population === 58);
  ok('level-2 office has 72 jobs', scaled.jobs === 72);

  const jobless = C.cityStats(cityOf([mk('hanok', 0, 0)]));
  ok('no jobs means 0 employment', jobless.employment === 0);
  ok('no residents means 0 population', C.cityStats(cityOf([mk('office', 0, 0)])).population === 0);
}

section('Happiness formula');
{
  const base = C.cityStats(cityOf([mk('hanok', 0, 0)]));
  ok('baseline 35', base.happiness === 35);

  const employed = C.cityStats(cityOf([mk('hanok', 0, 0), mk('office', 1, 0)]));
  ok('full employment adds 25', employed.happiness === 60);

  const houses = cityOf(Array.from({ length: 30 }, () => mk('hanok', 0, 0)));
  const factories = cityOf(Array.from({ length: 30 }, () => mk('factory', 0, 0)));
  ok('pollution-heavy city floors at 0', C.cityStats(factories).happiness === 0);
  ok('30 residents without services stay low', C.cityStats(houses).happiness === 35);
  ok('happiness never exceeds 100', C.cityStats(cityOf([
    mk('hanok', 0, 0), mk('office', 1, 0), mk('bus', 0, 1), mk('school', 2, 1),
    mk('police', 0, 2), mk('park', 0, 3), mk('power', 4, 0), mk('water', 3, 3),
  ])).happiness <= 100);
  ok('happiness is never negative', C.cityStats(factories).happiness >= 0);
}

section('Transit coverage maths');
{
  const one = cityOf([mk('hanok', 0, 0), mk('bus', 1, 0)]);
  ok('bus next door covers 100%', near(C.cityStats(one).transitCoverage, 1));

  const three = cityOf([mk('hanok', 0, 0), mk('hanok', 1, 0), mk('hanok', 5, 5), mk('bus', 2, 0)]);
  ok('bus covers two of three', near(C.cityStats(three).transitCoverage, 2 / 3), `${C.cityStats(three).transitCoverage}`);

  const radius = cityOf([mk('hanok', 0, 0), mk('bus', 2, 0)]);
  ok('bus radius 2 still covers', near(C.cityStats(radius).transitCoverage, 1));
  const radiusEdge = cityOf([mk('hanok', 0, 0), mk('bus', 2, 2)]);
  ok('bus radius is Chebyshev, not Manhattan', near(C.cityStats(radiusEdge).transitCoverage, 1));
  const outside = cityOf([mk('hanok', 0, 0), mk('bus', 3, 0)]);
  ok('bus beyond radius covers nothing', C.cityStats(outside).transitCoverage === 0);

  const lot = cityOf([mk('apartment', 0, 0), mk('bus', 3, 0)]);
  ok('multi-tile housing edge is distance 2', near(C.cityStats(lot).transitCoverage, 1));
  const lotFar = cityOf([mk('apartment', 0, 0), mk('bus', 4, 0)]);
  ok('multi-tile housing edge beyond radius fails', C.cityStats(lotFar).transitCoverage === 0);

  const odd = cityOf([mk('hanok', 0, 0), mk('hanok', 1, 0), mk('bus', 1, 1)]);
  ok('coverage is a population fraction', near(C.cityStats(odd).transitCoverage, 1));
}

section('Service coverage maths');
{
  const partial = cityOf([
    mk('hanok', 0, 0), mk('hanok', 1, 0), mk('hanok', 4, 5), mk('hanok', 5, 5), mk('police', 0, 1),
  ]);
  ok('safety covers 3 of 4 residents', near(C.cityStats(partial).serviceCoverage, 0.75), `${C.cityStats(partial).serviceCoverage}`);

  const twoTypes = cityOf([
    mk('hanok', 0, 0), mk('hanok', 1, 0), mk('hanok', 4, 5), mk('hanok', 5, 5),
    mk('police', 0, 1), mk('park', 5, 4),
  ]);
  ok('two service types average', near(C.cityStats(twoTypes).serviceCoverage, (0.75 + 0.5) / 2), `${C.cityStats(twoTypes).serviceCoverage}`);

  const none = cityOf([mk('hanok', 0, 0)]);
  ok('no services means 0 coverage', C.cityStats(none).serviceCoverage === 0);

  const utilities = cityOf([mk('hanok', 0, 0), mk('power', 1, 1), mk('water', 3, 0)]);
  ok('power + water is full utilities', near(C.cityStats(utilities).utilities, 1));
  ok('utilities lift happiness', near(C.cityStats(utilities).happiness, 35 + 25 + 5 - 6));
}

section('Tiers');
{
  const expected = [[0, 'village', 'Village', '마을'], [99, 'village', 'Village', '마을'], [100, 'town', 'Town', '읍'], [399, 'town', 'Town', '읍'], [400, 'city', 'City', '도시'], [1199, 'city', 'City', '도시'], [1200, 'metropolis', 'Metropolis', '대도시'], [2999, 'metropolis', 'Metropolis', '대도시'], [3000, 'megacity', 'Megacity', '메가시티']];
  for (const [pop, id, name, ko] of expected) {
    const t = C.tierFor(pop);
    ok(`tier at ${pop} is ${id}`, t.id === id && t.name === name && t.ko === ko);
  }
  ok('tier objects expose their threshold', C.tierFor(400).min === 400);
  const town = C.cityStats(cityOf([mk('apartment', 0, 0), mk('apartment', 2, 0), mk('apartment', 4, 0)]));
  ok('resident count drives the tier', town.tier.id === 'town');
  ok('next tier is exposed', town.nextTier.id === 'city');
  ok('top tier has no next', C.tierFor(5000) === C.TIERS[C.TIERS.length - 1]);
}

section('New achievements');
{
  const earn = (city) => earnedIds(city, { badges: 0 });

  ok('pop100', earn(cityOf([mk('apartment', 0, 0), mk('apartment', 2, 0), mk('apartment', 4, 0)])).includes('pop100'));
  ok('pop500', earn(cityOf(Array.from({ length: 11 }, () => mk('apartment', 0, 0)))).includes('pop500'));
  ok('pop2000', earn(cityOf(Array.from({ length: 42 }, () => mk('apartment', 0, 0)))).includes('pop2000'));
  ok('metropolis', earn(cityOf(Array.from({ length: 63 }, () => mk('apartment', 0, 0)))).includes('metropolis'));

  const half = cityOf([mk('hanok', 0, 0), mk('hanok', 1, 0), mk('hanok', 4, 4), mk('hanok', 5, 4), mk('bus', 2, 0)]);
  ok('transit50', earn(half).includes('transit50'));
  const nearlyAll = cityOf([
    mk('hanok', 0, 0), mk('hanok', 1, 0), mk('hanok', 2, 0), mk('hanok', 3, 0),
    mk('hanok', 4, 0), mk('hanok', 0, 1), mk('hanok', 1, 1), mk('hanok', 3, 1),
    mk('hanok', 4, 1), mk('hanok', 5, 5), mk('bus', 2, 1),
  ]);
  ok('transit90 boundary is exactly 90%', near(C.cityStats(nearlyAll).transitCoverage, 0.9), `${C.cityStats(nearlyAll).transitCoverage}`);
  ok('transit90', earn(nearlyAll).includes('transit90'));

  ok('airport achievement', earn(cityOf([mk('airport', 0, 0)])).includes('airport'));
  ok('metro achievement', earn(cityOf([mk('metro', 0, 0)])).includes('metro'));
  ok('train achievement', earn(cityOf([mk('train', 0, 0)])).includes('train'));
  ok('palace achievement', earn(cityOf([mk('palace', 0, 0)])).includes('palace'));
  ok('stadium achievement', earn(cityOf([mk('stadium', 0, 0)])).includes('stadium'));

  const happy = cityOf([
    mk('hanok', 2, 2), mk('cafe', 3, 0), mk('bus', 0, 0), mk('school', 0, 2),
    mk('police', 2, 0), mk('park', 0, 1), mk('power', 4, 4), mk('water', 4, 0), mk('office', 3, 3),
  ]);
  ok('fixture is at 100 happiness', C.cityStats(happy).happiness === 100);
  ok('happy90', earn(happy).includes('happy90'));

  const mixed = cityOf([
    mk('hanok', 0, 0), mk('cafe', 1, 0), mk('brickworks', 2, 0),
    mk('school', 3, 0), mk('bus', 0, 1), mk('palace', 1, 1),
  ]);
  ok('all_categories', earn(mixed).includes('all_categories'));
  ok('all_categories needs all six', !earn(cityOf([mk('hanok', 0, 0), mk('cafe', 1, 0)])).includes('all_categories'));

  ok('twenty_buildings', earn(cityOf(Array.from({ length: 20 }, (_, i) => mk('hanok', i % 6, Math.floor(i / 6))))).includes('twenty_buildings'));
  ok('thirty_buildings', earn(cityOf(Array.from({ length: 30 }, (_, i) => mk('hanok', i % 6, Math.floor(i / 6))))).includes('thirty_buildings'));

  ok('old achievements still fire', earn(cityOf([mk('subway', 0, 0), mk('tower', 2, 0)])).includes('subway'));
  ok('era achievement still fires', earn(cityOf([], { era: 3 })).includes('era3'));
  ok('badges from ctx still fire', C.checkAchievements(cityOf([]), { badges: 12 }).some((a) => a.id === 'a1_badges'));
  ok('award list has unique ids', new Set(C.ACHIEVEMENTS.map((a) => a.id)).size === C.ACHIEVEMENTS.length);
  ok('awarded achievements are not repeated', (() => {
    const c = cityOf([mk('hanok', 0, 0)]);
    C.checkAchievements(c, { badges: 0 });
    return C.checkAchievements(c, { badges: 6 }).length === 0;
  })());
}

section('24 hour tick');
{
  const c = cityOf([mk('hanok', 0, 0), mk('brickworks', 1, 0), mk('sawmill', 2, 0)]);
  const income = C.cityIncome(c);
  const gain = C.tick(c, 24 * 3600 * 1000);
  ok('elapsed time is capped at 8 hours', gain.seconds === 28800, `${gain.seconds}`);
  ok('bricks accrue at 2/min', near(c.resources.brick, 960, 1e-6), `${c.resources.brick}`);
  ok('timber accrues at 2/min', near(c.resources.timber, 960, 1e-6), `${c.resources.timber}`);
  ok('coins equal income × capped seconds', near(gain.coins, income * 28800, 1e-6));
  ok('lifetimeWon grows by the same amount', near(c.lifetimeWon, gain.coins));
  ok('gain reports resource keys', gain.resources.brick > 0 && gain.resources.timber > 0);
  ok('lastTick moves to now', c.lastTick === 24 * 3600 * 1000);
  ok('an immediate second tick is a no-op', C.tick(c, 24 * 3600 * 1000 + 500) === null);
}

section('Determinism and snapshot shape');
{
  const c = cityOf([
    mk('hanok', 0, 0), mk('cafe', 1, 0), mk('park', 2, 0), mk('bus', 3, 0),
    mk('apartment', 0, 2), mk('school', 2, 2), mk('power', 4, 2), mk('water', 4, 4),
    mk('factory', 0, 4, 2), mk('metro', 4, 0),
  ]);
  const a = C.cityStats(c);
  const b = C.cityStats(c);
  ok('two calls are identical', JSON.stringify(a) === JSON.stringify(b));
  for (const key of ['population', 'jobs', 'employment', 'happiness', 'transitCoverage', 'serviceCoverage', 'pollution', 'utilities', 'tax', 'tourism', 'buildingIncome', 'income', 'tier', 'nextTier', 'rates']) {
    ok(`stats has ${key}`, key in a);
  }
  ok('snapshot is JSON-safe', typeof JSON.stringify(a) === 'string');
  ok('stats does not mutate the city', c.buildings.length === 10);
}

section('Balance and early game');
{
  const lesson = C.studyRewards({ newSentences: 7, stars: 3, reviews: 4, words: 8, streakDay: true });
  ok('one lesson gives a hanok worth of bricks', lesson.brick >= C.costFor('hanok', 1).brick);
  ok('hanok keeps its 60 Won price', C.costFor('hanok', 1).coins === 60);
  ok('villa unlocks at four buildings', C.def('villa').requires.buildings === 4);
  ok('villa costs 300 Won', C.def('villa').cost.coins === 300);
  ok('bus unlocks at three buildings', C.def('bus').requires.buildings === 3);
  ok('bus is cheap early', C.def('bus').cost.coins === 150);

  const early = seed(C.newCity(1000));
  const placed = [
    C.place(early, 'hanok', 0, 0, 150),
    C.place(early, 'hanok', 1, 0, 150),
    C.place(early, 'park', 2, 0, 150),
    C.place(early, 'bus', 3, 0, 150),
    C.place(early, 'villa', 0, 1, 5000),
  ];
  ok('five early placements succeed', placed.every((p) => p.ok), placed.map((p) => p.reason).join('|'));
  ok('early city has residents', C.cityStats(early).population >= 22);
  ok('early city has positive income', C.cityIncome(early) > 0);
}

section('Grid scale 12 → 20');
{
  ok('grid constants are 12 → 20', C.GRID_START === 12 && C.GRID_MAX === 20);
  const c = seed(C.newCity(1000));
  ok('a new city starts 12×12', c.grid === 12);
  const first = C.expandCost(c);
  ok('first expansion is ₩4,000 · 60 brick · 25 steel', first.coins === 4000 && first.brick === 60 && first.steel === 25);
  let steps = 0;
  while (c.grid < C.GRID_MAX && steps < 20) {
    if (!C.expand(c, 1e12).ok) break;
    steps++;
  }
  ok('reaches the 20×20 maximum', c.grid === 20 && steps === 8, `${c.grid} after ${steps}`);
  ok('20×20 is 400 tiles', c.grid ** 2 === 400);
  ok('the last expansion compounds 1.55^7', C.expandCost({ grid: 19 }).coins === Math.round(4000 * 1.55 ** 7));
  ok('last expansion needs n = 8 materials', C.expandCost({ grid: 19 }).brick === 480 && C.expandCost({ grid: 19 }).steel === 200);
  ok('cannot expand past 20', C.expand(c, 1e12).ok === false);
  ok('legacy grids price from the 12×12 base', C.expandCost({ grid: 9 }).coins === 4000);
}

section('Showcase city (16×16)');
{
  const c = buildShowcaseCity(1000);
  const s = C.cityStats(c);
  const owner = new Map();
  let overlaps = 0;
  let outOfBounds = 0;
  for (const b of c.buildings) {
    for (const t of C.tilesOf(b)) {
      const k = `${t.x},${t.y}`;
      if (owner.has(k)) overlaps++;
      owner.set(k, b);
      if (t.x < 0 || t.y < 0 || t.x >= c.grid || t.y >= c.grid) outOfBounds++;
    }
  }
  const sumTiles = c.buildings.reduce((a, b) => a + C.tilesOf(b).length, 0);
  const types = new Set(c.buildings.map((b) => b.type));

  ok('showcase grid is 16×16', c.grid === 16);
  ok('showcase packs at least 240/256 tiles', owner.size >= 240 && owner.size <= 256, `${owner.size}`);
  ok('every footprint is inside the grid', outOfBounds === 0);
  ok('no footprints overlap', overlaps === 0 && owner.size === sumTiles, `${overlaps} overlaps`);
  ok('showcase is a Metropolis', s.population >= 1200 && s.tier.id === 'metropolis', `${s.population} / ${s.tier.id}`);
  ok('showcase happiness is 85–100', s.happiness >= 85 && s.happiness <= 100, `${s.happiness}`);
  ok('showcase transit is 100%', near(s.transitCoverage, 1), `${s.transitCoverage}`);
  ok('showcase services reach every resident', near(s.serviceCoverage, 1), `${s.serviceCoverage}`);
  ok('showcase has full utilities', s.utilities === 1);
  ok('showcase is Era 3 with 12 badges', c.era === 3 && c.badges === 12);

  for (const t of ['airport', 'train', 'metro', 'subway', 'ferry', 'palace', 'stadium', 'lotte', 'tower', 'bridge', 'apartment', 'office', 'mall', 'factory', 'school', 'hospital', 'police', 'fire', 'power', 'water', 'park', 'villa', 'officetel']) {
    ok(`showcase has ${t}`, types.has(t));
  }
  ok('showcase has several apartments/offices/malls/factories', c.buildings.filter((b) => b.type === 'apartment').length >= 4 && c.buildings.filter((b) => b.type === 'office').length >= 4 && c.buildings.filter((b) => b.type === 'mall').length >= 2 && c.buildings.filter((b) => b.type === 'factory').length >= 1);

  const uniqueTypes = ['subway', 'tower'];
  ok('unique buildings appear at most once', uniqueTypes.every((t) => c.buildings.filter((b) => b.type === t).length <= 1));

  let gatesOk = true;
  for (const b of c.buildings) {
    const req = C.def(b.type)?.requires || {};
    if ((req.buildings || 0) > c.buildings.length) gatesOk = false;
    if ((req.pop || 0) > s.population) gatesOk = false;
    if ((req.badges || 0) > c.badges) gatesOk = false;
    if ((req.era || 0) > c.era) gatesOk = false;
  }
  ok('every building gate is satisfied', gatesOk);
  ok('layout footprints match the catalogue', SHOWCASE_LAYOUT.every((b) => {
    const size = C.sizeOf(b.type);
    return !!C.def(b.type) && b.w === size.w && b.h === size.h;
  }));
  ok('showcase keeps its export shape', typeof buildShowcaseCity === 'function' && Array.isArray(SHOWCASE_LAYOUT) && SHOWCASE_LAYOUT.length === c.buildings.length);
}

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
