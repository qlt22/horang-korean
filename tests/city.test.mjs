// Seoul Works economy tests — pure rules, no DOM.
import * as C from '../app/js/core/city-data.js';

let pass = 0, fail = 0;
const out = [];
const ok = (n, c, e = '') => { if (c) pass++; else fail++; out.push(`  ${c ? '✓' : '✗'} ${n}${e ? ' — ' + e : ''}`); };
const section = (t) => out.push(`\n${t}`);
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

const seed = (c) => {
  c.resources = { brick: 1e6, timber: 1e6, glass: 1e6, steel: 1e6, energy: 1e4, blueprint: 10 };
  return c;
};
const mk = (type, x, y, level = 1, extra = {}) => {
  const s = C.sizeOf(type);
  return { id: `b_${type}_${x}_${y}_${level}`, type, x, y, w: s.w, h: s.h, level, ...extra };
};
const cityOf = (list, extra = {}) => ({ ...C.newCity(1000), ...extra, buildings: list });

section('Catalogue');
ok('31 buildings (12 original + 19 new)', C.catalogList().length === 31, `${C.catalogList().length}`);
ok('every building has a cost', C.catalogList().every((d) => d.cost.coins > 0));
ok('every building has a valid category', C.catalogList().every((d) => !!C.CATEGORIES[d.category]));
ok('every building has a footprint', C.catalogList().every((d) => d.w >= 1 && d.h >= 1 && d.w <= 3 && d.h <= 3));
ok('hanok is affordable at the start', C.costFor('hanok', 1).coins === 60 && C.costFor('hanok', 1).brick === 8);
ok('upgrade cost scales', C.costFor('hanok', 2).coins > C.costFor('hanok', 1).coins, `${C.costFor('hanok', 2).coins}`);
ok('six categories', Object.keys(C.CATEGORIES).length === 6);
ok('CATEGORY_META mirrors categories with icons', Object.keys(C.CATEGORY_META).length === 6 && Object.values(C.CATEGORY_META).every((m) => m.emoji && m.icon && m.label && m.ko));
for (const id of ['villa', 'officetel', 'mall', 'factory', 'school', 'hospital', 'police', 'fire', 'power', 'water', 'bus', 'metro', 'train', 'ferry', 'airport', 'palace', 'stadium', 'lotte', 'bridge']) {
  ok(`catalogue has ${id}`, !!C.def(id));
}
ok('villa is 2×1', C.sizeOf('villa').w === 2 && C.sizeOf('villa').h === 1);
ok('airport is 3×3', C.sizeOf('airport').w === 3 && C.sizeOf('airport').h === 3);
ok('office is 2×1', C.sizeOf('office').w === 2 && C.sizeOf('office').h === 1);
ok('bridge is 3×1', C.sizeOf('bridge').w === 3 && C.sizeOf('bridge').h === 1);
ok('unknown type is 1×1', C.sizeOf('nope').w === 1 && C.sizeOf('nope').h === 1);

section('Tile geometry');
{
  const c = seed(C.newCity(1000));
  c.buildings.push(mk('apartment', 1, 1));
  ok('apartment covers four tiles', C.tilesOf(c.buildings[0]).length === 4);
  ok('buildingAt finds the origin', C.buildingAt(c, 1, 1) === c.buildings[0]);
  ok('buildingAt finds a covered tile', C.buildingAt(c, 2, 2) === c.buildings[0]);
  ok('buildingAt returns null outside', C.buildingAt(c, 3, 3) === null);
  ok('occupiedMap covers every tile', C.occupiedMap(c).size === 4);
  ok('overlap check sees covered tiles', C.placeable(c, 'hanok', 2, 2).ok === false);
  c.buildings.push({ id: 'legacy', type: 'apartment', x: 5, y: 5, level: 1 });
  ok('save without w/h is 1×1', C.tilesOf(c.buildings[1]).length === 1);
  ok('legacy footprint does not claim neighbours', C.buildingAt(c, 6, 6) === null);
}

section('Placement');
let city = seed(C.newCity(1000));
ok('empty city is 12x12', city.grid === 12 && city.buildings.length === 0);
let r = C.place(city, 'hanok', 0, 0, 100);
ok('places a hanok', r.ok && city.buildings.length === 1);
ok('stored footprint on new buildings', r.building.w === 1 && r.building.h === 1);
ok('cannot place on an occupied tile', C.place(city, 'hanok', 0, 0, 100).ok === false);
ok('cannot place outside the grid', C.place(city, 'hanok', 12, 0, 100).ok === false);
ok('cannot afford without coins', C.place(city, 'hanok', 1, 1, 10).ok === false);
ok('cafe locked at one building', C.placeable(city, 'cafe', 1, 1).ok === false);
city.buildings.push({ id: 'x1', type: 'park', x: 3, y: 3, level: 1 });
ok('cafe unlocks at two buildings', C.placeable(city, 'cafe', 1, 1).ok === true);
ok('tower needs 12 badges', (() => {
  const c = seed(C.newCity(1000));
  c.buildings = Array.from({ length: 20 }, (_, i) => mk('hanok', i % 6, Math.floor(i / 6)));
  return C.placeable(c, 'tower', 2, 4, { badges: 0 }).reason.includes('badges');
})());
ok('tower also needs 20 buildings', C.placeable(city, 'tower', 1, 1, { badges: 12 }).reason.includes('buildings'));

{
  const c = seed(C.newCity(1000));
  // 4 buildings so the villa unlocks.
  for (const [x, y] of [[0, 0], [1, 0], [2, 0], [3, 0]]) c.buildings.push(mk('hanok', x, y));
  ok('villa needs 4 buildings', C.placeable(c, 'villa', 0, 3).ok === true);
  const v = C.place(c, 'villa', 0, 3, 1e6);
  ok('villa places as 2×1', v.ok && v.building.w === 2 && v.building.h === 1);
  ok('villa blocks both tiles', C.placeable(c, 'hanok', 1, 3).ok === false);
  ok('villa rejects out-of-bounds x', C.placeable(c, 'villa', 11, 11).ok === false);
  ok('apartment needs 8 buildings', C.placeable(c, 'apartment', 2, 3).reason.includes('8'));
}

{
  const c = seed(C.newCity(1000));
  c.buildings.push(mk('mall', 0, 0)); // 2×2
  ok('2×2 blocks a sub-tile', C.placeable(c, 'hanok', 1, 1).ok === false);
  ok('2×2 leaves the rest free', C.placeable(c, 'hanok', 2, 0).ok === true);
  ok('overlap reason is tile taken', C.placeable(c, 'hanok', 0, 1).reason === 'That tile is taken');
}

{
  const c = seed(C.newCity(1000));
  c.grid = 12;
  c.buildings.push(mk('airport', 0, 9));
  ok('airport tiles are 9', C.tilesOf(c.buildings[0]).length === 9);
  ok('airport covers its far corner', C.buildingAt(c, 2, 11) === c.buildings[0]);
  ok('3×3 rejects a neighbour overlap', C.placeable(c, 'airport', 2, 8).ok === false);
}

{
  const c = seed(C.newCity(1000));
  c.buildings.push(mk('subway', 0, 0));
  ok('unique buildings cannot repeat', C.placeable(c, 'subway', 3, 0).reason === 'Only one per city');
}

{
  // Era requirement is part of the requires contract.
  const c = seed(C.newCity(1000));
  c.era = 1;
  const fake = { ...C.CATALOG.hanok, id: 'futurething', requires: { era: 2 } };
  // placeable reads the catalogue, so exercise the era guard through a copy.
  const probe = { ...c };
  const saved = C.CATALOG.futurething;
  C.CATALOG.futurething = fake;
  const eraBlock = C.placeable(probe, 'futurething', 0, 0);
  probe.era = 2;
  const eraOk = C.placeable(probe, 'futurething', 0, 0);
  if (saved) C.CATALOG.futurething = saved; else delete C.CATALOG.futurething;
  ok('era requirement blocks early placement', eraBlock.ok === false && eraBlock.reason.includes('era'));
  ok('era requirement opens later', eraOk.ok === true);
}

section('Income and adjacency');
{
  city = cityOf([mk('hanok', 0, 0)]);
  const s = C.cityStats(city);
  ok('hanok raw income is 0.4/s', near(s.buildingIncome, 0.4));
  ok('happiness baseline is 35', near(s.happiness, 35));
  ok('income applies the happiness factor + tax', near(s.income, 0.4 * 0.865 + 0.021), `${s.income}`);
  ok('cityIncome matches cityStats', near(C.cityIncome(city), s.income));

  city = cityOf([mk('hanok', 0, 0), mk('park', 1, 1)]);
  const p = C.cityStats(city);
  ok('adjacent park boosts raw income by 12%', near(p.buildingIncome, 0.448));
  ok('park services raise happiness', near(p.happiness, 65), `${p.happiness}`);
  ok('park income end-to-end', near(p.income, 0.448 * 1.135 + 6 * 0.01 * 0.65));

  const up = cityOf([mk('hanok', 0, 0, 2)]);
  ok('level 2 multiplies raw income by 1.45', near(C.cityStats(up).buildingIncome, 0.4 * 1.45));
  const era = cityOf([mk('hanok', 0, 0)], { era: 2 });
  ok('era 2 adds a 1.5x global multiplier', near(C.cityStats(era).buildingIncome, 0.4 * 1.5));
  const badge = cityOf([mk('hanok', 0, 0)], { badges: 12 });
  ok('12 badges add 12% global', near(C.cityStats(badge).buildingIncome, 0.4 * 1.12));
}

section('Population, jobs, happiness');
{
  const c = cityOf([mk('hanok', 0, 0), mk('cafe', 1, 0)]);
  const s = C.cityStats(c);
  ok('hanok houses 6', s.population === 6);
  ok('cafe has 4 jobs', s.jobs === 4);
  ok('employment is jobs/pop capped at 1', near(s.employment, 4 / 6));
  ok('employment feeds happiness', near(s.happiness, 35 + (4 / 6) * 25), `${s.happiness}`);

  const lv = cityOf([mk('hanok', 0, 0, 3), mk('cafe', 1, 0, 2)]);
  const ls = C.cityStats(lv);
  ok('population scales +20% per level', ls.population === Math.round(6 * 1.4), `${ls.population}`);
  ok('jobs scale +20% per level', ls.jobs === Math.round(4 * 1.2), `${ls.jobs}`);

  const over = cityOf([mk('hanok', 0, 0), mk('office', 1, 0)]);
  ok('employment caps at 1', C.cityStats(over).employment === 1);

  const empty = cityOf([]);
  ok('empty city has no NaN happiness', Number.isFinite(C.cityStats(empty).happiness));
  ok('empty city is 0% employment', C.cityStats(empty).employment === 0);
}

section('Transit coverage');
{
  const c = cityOf([mk('hanok', 0, 0), mk('hanok', 5, 5), mk('bus', 2, 2)]);
  const s = C.cityStats(c);
  ok('bus covers one of two hanoks', near(s.transitCoverage, 0.5), `${s.transitCoverage}`);
  c.buildings.push(mk('bus', 4, 4));
  ok('two buses cover both residents', near(C.cityStats(c).transitCoverage, 1));

  const multi = cityOf([mk('apartment', 0, 0), mk('metro', 3, 1)]);
  // Apartment tiles (0,0)-(1,1); metro tiles (3,1)-(4,1): distance 2 ≤ 4.
  ok('multi-tile transit covers multi-tile housing', near(C.cityStats(multi).transitCoverage, 1));
  const far = cityOf([mk('apartment', 0, 0), mk('metro', 7, 7)], { grid: 12 });
  ok('metro coverage has a real radius', C.cityStats(far).transitCoverage === 0);
}

section('Service coverage, utilities, pollution');
{
  const c = cityOf([mk('hanok', 0, 0), mk('hanok', 5, 5), mk('police', 0, 1)]);
  ok('police covers one of two', near(C.cityStats(c).serviceCoverage, 0.5), `${C.cityStats(c).serviceCoverage}`);

  const two = cityOf([mk('hanok', 0, 0), mk('police', 0, 1), mk('park', 1, 0)]);
  ok('two service types average to 1', near(C.cityStats(two).serviceCoverage, 1));

  const util = cityOf([mk('hanok', 0, 0), mk('power', 1, 1)]);
  ok('one utility gives 0.5', near(C.cityStats(util).utilities, 0.5));
  util.buildings.push(mk('water', 3, 0));
  ok('power + water gives full utilities', near(C.cityStats(util).utilities, 1));

  const dirty = cityOf([mk('hanok', 0, 0), mk('factory', 2, 2)]);
  ok('pollution sums across buildings', C.cityStats(dirty).pollution === 12);
  const dirty2 = cityOf([mk('hanok', 0, 0), mk('factory', 2, 2), mk('brickworks', 0, 3)]);
  ok('pollution adds up', C.cityStats(dirty2).pollution === 16);
  ok('pollution lowers happiness', near(C.cityStats(dirty).happiness - C.cityStats(dirty2).happiness, 4 * 0.6));
}

section('Happiness floors and caps');
{
  const floor = cityOf([mk('hanok', 0, 0), ...Array.from({ length: 50 }, () => mk('factory', 0, 0))]);
  ok('happiness floors at 0', C.cityStats(floor).happiness === 0);

  const ideal = cityOf([
    mk('hanok', 2, 2),
    mk('cafe', 3, 0),
    mk('bus', 0, 0),
    mk('school', 0, 2),
    mk('police', 2, 0),
    mk('park', 0, 1),
    mk('power', 4, 4),
    mk('water', 4, 0),
    mk('office', 3, 3),
  ]);
  const s = C.cityStats(ideal);
  ok('ideal city caps at 100', s.happiness === 100, `${s.happiness}`);
  ok('ideal city transit is 100%', near(s.transitCoverage, 1));
  ok('ideal city services are 100%', near(s.serviceCoverage, 1));
}

section('Tax, tourism, rates');
{
  const c = cityOf([mk('hanok', 0, 0)]);
  const s = C.cityStats(c);
  ok('tax is population × 1% × happiness', near(s.tax, 6 * 0.01 * (s.happiness / 100)));

  const t = cityOf([mk('hanok', 0, 0), mk('tower', 2, 2)]);
  const ts = C.cityStats(t);
  const factor = 0.55 + (ts.happiness / 100) * 0.9;
  ok('tower tourism is 6/s before happiness', near(ts.tourism, 6 * factor), `${ts.tourism}`);
  ok('income includes tourism', ts.income > ts.buildingIncome * factor + ts.tax);

  const prod = cityOf([mk('brickworks', 0, 0), mk('sawmill', 1, 0)]);
  const rates = C.cityRates(prod);
  ok('cityRates exposes brick/s', near(rates.brick, 2 / 60));
  ok('cityRates exposes timber/s', near(rates.timber, 2 / 60));
  ok('stats carry the same rates', near(C.cityStats(prod).rates.brick, 2 / 60));
}

section('Tiers');
ok('tier 0 is Village', C.tierFor(0).id === 'village');
ok('tier 99 is still Village', C.tierFor(99).id === 'village');
ok('tier 100 is Town', C.tierFor(100).id === 'town');
ok('tier 400 is City', C.tierFor(400).id === 'city');
ok('tier 1200 is Metropolis', C.tierFor(1200).id === 'metropolis');
ok('tier 3000 is Megacity', C.tierFor(3000).id === 'megacity');
ok('tier 9999 stays Megacity', C.tierFor(9999).id === 'megacity');
{
  const s = C.cityStats(cityOf([mk('apartment', 0, 0), mk('apartment', 2, 0), mk('apartment', 4, 0)]));
  ok('cityStats reports the tier', s.tier.id === 'town' && s.nextTier.id === 'city');
  ok('megacity has no next tier', C.cityStats(cityOf(Array.from({ length: 63 }, () => mk('apartment', 0, 0)))).nextTier === null);
}

section('Production and ticks');
{
  city = cityOf([mk('brickworks', 0, 0)]);
  const rates = C.cityRates(city);
  ok('brickworks makes 2 bricks/min', near(rates.brick, 2 / 60), `${rates.brick}`);
  ok('no phantom timber', rates.timber === 0);
  const g = C.tick(city, 61000);
  ok('60 seconds produces 2 bricks', near(city.resources.brick, 2, 1e-6), `${city.resources.brick}`);
  ok('tick reports elapsed seconds', near(g.seconds, 60, 0.1));

  const c2 = cityOf([mk('brickworks', 0, 0)]);
  C.tick(c2, 24 * 3600 * 1000);
  ok('24h tick is capped at 8h', near(c2.resources.brick, (2 / 60) * 8 * 3600, 1e-6), `${c2.resources.brick}`);
  ok('tick records the gain', c2.lastGain.seconds === 28800);

  const inc = cityOf([mk('hanok', 0, 0), mk('brickworks', 1, 0)]);
  const before = C.cityIncome(inc);
  const gain = C.tick(inc, 61000);
  ok('tick banks income for the elapsed time', near(gain.coins, before * 60, 1e-6));
  ok('tick grows lifetimeWon', near(inc.lifetimeWon, gain.coins));
}

section('Upgrades and selling');
{
  city = seed(cityOf([mk('hanok', 0, 0)]));
  const up = C.upgrade(city, city.buildings[0].id, 5000);
  ok('upgrade succeeds', up.ok && city.buildings[0].level === 2);
  ok('upgrade costs coins and materials', up.cost.coins > 60 && up.cost.brick > 0);
  for (let i = 0; i < 12; i++) C.upgrade(city, city.buildings[0].id, 999999);
  ok('level caps at 10', city.buildings[0].level === 10);
  ok('cannot upgrade past 10', C.upgrade(city, city.buildings[0].id, 999999).ok === false);
  const refund = C.sellValue(city.buildings[0]);
  ok('sell refunds coins', refund.coins > 0);
  ok('sell removes the building', C.sell(city, city.buildings[0].id).ok && city.buildings.length === 0);
  ok('selling an unknown id fails', C.sell(city, 'nope').ok === false);
}

section('Expansion');
{
  city = seed(C.newCity(1000));
  ok('grid constants are 12 → 20', C.GRID_START === 12 && C.GRID_MAX === 20);
  ok('new cities start at 12×12', city.grid === 12);
  const first = C.expandCost(city);
  ok('first expansion costs ₩4,000 · 60 brick · 25 steel', first.coins === 4000 && first.brick === 60 && first.steel === 25);
  const ex = C.expand(city, 999999);
  ok('expands the grid', ex.ok && city.grid === 13);
  const second = C.expandCost(city);
  ok('next expansion compounds 1.55× and adds a row of materials', second.coins === 6200 && second.brick === 120 && second.steel === 50);
  ok('expansion gets more expensive', second.coins > first.coins);
  ok('legacy grids price from the 12×12 base', C.expandCost({ grid: 9 }).coins === first.coins);
  city.grid = C.GRID_MAX;
  ok('cannot expand past 20', C.expand(city, 1e9).ok === false);
}

section('Achievements');
{
  ok('32 achievements', C.ACHIEVEMENTS.length === 32, `${C.ACHIEVEMENTS.length}`);
  const ids = new Set(C.ACHIEVEMENTS.map((a) => a.id));
  for (const id of ['pop100', 'pop500', 'pop2000', 'metropolis', 'transit50', 'transit90', 'airport', 'metro', 'train', 'palace', 'stadium', 'happy90', 'all_categories', 'twenty_buildings', 'thirty_buildings']) {
    ok(`new achievement ${id} exists`, ids.has(id));
  }
  ok('old achievement first_brick stays', ids.has('first_brick'));

  city = seed(cityOf([mk('hanok', 0, 0)]));
  const earned = C.checkAchievements(city, { badges: 0 });
  ok('first building earns first_brick', earned.some((a) => a.id === 'first_brick'));
  ok('achievements are not awarded twice', C.checkAchievements(city, { badges: 0 }).length === 0);

  const ten = cityOf(Array.from({ length: 10 }, (_, i) => mk('hanok', i, 0)));
  ok('10 buildings earns neighborhood', C.checkAchievements(ten, { badges: 0 }).some((a) => a.id === 'neighborhood'));

  const badgeCity = cityOf([mk('hanok', 0, 0)]);
  ok('ctx.badges unlocks a1_badges', C.checkAchievements(badgeCity, { badges: 12 }).some((a) => a.id === 'a1_badges'));

  const broken = { achievements: [] };
  ok('missing city fields do not throw', Array.isArray(C.checkAchievements(broken, {})));
}

section('Study rewards');
const rw = C.studyRewards({ kind: 'vocab', newSentences: 6, reviews: 4, words: 8, stars: 3, checkpoint: false, streakDay: true });
ok('new sentences give bricks', rw.brick === 4 + 12 + 3, `${rw.brick}`);
ok('reviews give timber', rw.timber === 2);
ok('words give glass', rw.glass === 2);
ok('streak gives energy', rw.energy === 2);
const cp = C.studyRewards({ kind: 'checkpoint', newSentences: 0, stars: 3, checkpoint: true });
ok('checkpoint gives steel and a blueprint', cp.steel >= 12 && cp.blueprint === 1);
{
  // One lesson's bricks must cover a hanok.
  const lesson = C.studyRewards({ newSentences: 7, stars: 3 });
  ok('one lesson covers a hanok', lesson.brick >= C.costFor('hanok', 1).brick, `${lesson.brick}`);
}

section('Prestige');
{
  city = C.newCity(1000);
  city.lifetimeWon = C.PRESTIGE_BASE - 1;
  ok('not ready before the threshold', C.prestigeReady(city) === false);
  city.lifetimeWon = C.PRESTIGE_BASE;
  ok('ready at the threshold', C.prestigeReady(city) === true);
  const next = C.prestige(city);
  ok('prestige raises the era', next.era === 2);
  ok('prestige clears buildings', next.buildings.length === 0);
  ok('prestige keeps achievements', Array.isArray(next.achievements));
  ok('era multiplier is +50%', near(C.globalMultiplier({ ...city, era: 2, buildings: [], badges: 0 }), 1.5));
}

section('Rewards');
{
  const bank = C.applyRewards(city, { coins: 50, gems: 2, brick: 10 });
  ok('applyRewards returns bank currency', bank.coins === 50 && bank.gems === 2);
  ok('applyRewards adds materials', city.resources.brick >= 10);
}

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
