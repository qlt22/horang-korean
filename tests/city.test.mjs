// Seoul Works economy tests — pure rules, no DOM.
import * as C from '../app/js/core/city-data.js';

let pass = 0, fail = 0;
const out = [];
const ok = (n, c, e = '') => { if (c) pass++; else fail++; out.push(`  ${c ? '✓' : '✗'} ${n}${e ? ' — ' + e : ''}`); };
const section = (t) => out.push(`\n${t}`);

section('Catalogue');
ok('12 buildings', C.catalogList().length === 12, `${C.catalogList().length}`);
ok('every building has a cost', C.catalogList().every((d) => d.cost.coins > 0));
ok('hanok is affordable at the start', C.costFor('hanok', 1).coins === 60 && C.costFor('hanok', 1).brick === 8);
ok('upgrade cost scales', C.costFor('hanok', 2).coins > C.costFor('hanok', 1).coins, `${C.costFor('hanok', 2).coins}`);

section('Placement');
const seed = (c) => { c.resources = { brick: 1e6, timber: 1e6, glass: 1e6, steel: 1e6, energy: 1e4, blueprint: 10 }; return c; };
let city = seed(C.newCity(1000));
ok('empty city is 6x6', city.grid === 6 && city.buildings.length === 0);
let r = C.place(city, 'hanok', 0, 0, 100);
ok('places a hanok', r.ok && city.buildings.length === 1);
ok('cannot place on an occupied tile', C.place(city, 'hanok', 0, 0, 100).ok === false);
ok('cannot place outside the grid', C.place(city, 'hanok', 6, 0, 100).ok === false);
ok('cannot afford without coins', C.place(city, 'hanok', 1, 1, 10).ok === false);
ok('park is locked at one building', C.placeable(city, 'cafe', 1, 1).ok === false);
city.buildings.push({ id: 'x1', type: 'park', x: 3, y: 3, level: 1 });
ok('park unlocks at two buildings', C.placeable(city, 'cafe', 1, 1).ok === true);
ok('unique tower needs 12 badges', C.placeable(city, 'tower', 1, 1, { badges: 0 }).ok === false);

section('Income and adjacency');
city = seed(C.newCity(1000));
C.place(city, 'hanok', 0, 0, 1000);
const base = C.cityIncome(city);
ok('hanok earns 0.4/s', Math.abs(base - 0.4) < 1e-9, `${base}`);
city.buildings.push({ id: 'p1', type: 'park', x: 1, y: 1, level: 1 });
const boosted = C.cityIncome(city);
ok('adjacent park boosts income by 12%', Math.abs(boosted - 0.448) < 1e-6, `${boosted}`);
city.buildings[0].level = 2;
ok('level 2 multiplies income by 1.45', Math.abs(C.cityIncome(city) - 0.448 * 1.45) < 1e-6);
city.era = 2;
ok('era 2 adds a 1.5x global multiplier', Math.abs(C.cityIncome(city) - 0.448 * 1.45 * 1.5) < 1e-6);

section('Production');
city = C.newCity(1000);
city.buildings.push({ id: 'f1', type: 'brickworks', x: 0, y: 0, level: 1 });
const rates = C.cityRates(city);
ok('brickworks makes 2 bricks/min', Math.abs(rates.brick - 2 / 60) < 1e-9, `${rates.brick}`);
ok('no phantom timber', rates.timber === 0);
const g = C.tick(city, 1000 + 60000);
ok('60 seconds produces 2 bricks', Math.abs(city.resources.brick - 2) < 0.05, `${city.resources.brick}`);
ok('tick reports elapsed seconds', Math.abs(g.seconds - 60) < 0.1);
ok('offline production is capped at 8h', (() => { const c2 = C.newCity(0); c2.buildings.push({ id: 'f', type: 'brickworks', x: 0, y: 0, level: 1 }); C.tick(c2, 100 * 3600 * 1000); return c2.resources.brick <= 2 / 60 * 8 * 3600 + 1; })());

section('Upgrades and selling');
city = seed(C.newCity(1000));
C.place(city, 'hanok', 0, 0, 5000);
const up = C.upgrade(city, city.buildings[0].id, 5000);
ok('upgrade succeeds', up.ok && city.buildings[0].level === 2);
ok('upgrade costs coins and materials', up.cost.coins > 60 && up.cost.brick > 0);
for (let i = 0; i < 12; i++) C.upgrade(city, city.buildings[0].id, 999999);
ok('level caps at 10', city.buildings[0].level === 10);
ok('cannot upgrade past 10', C.upgrade(city, city.buildings[0].id, 999999).ok === false);
const refund = C.sellValue(city.buildings[0]);
ok('sell refunds coins', refund.coins > 0);
ok('sell removes the building', C.sell(city, city.buildings[0].id).ok && city.buildings.length === 0);

section('Expansion');
city = C.newCity(1000);
city.resources.brick = 500; city.resources.steel = 500;
const ex = C.expand(city, 999999);
ok('expands the grid', ex.ok && city.grid === 7);
ok('expansion gets more expensive', C.expandCost(city).coins > C.expandCost(C.newCity(1000)).coins);

section('Achievements');
city = seed(C.newCity(1000));
C.place(city, 'hanok', 0, 0, 1000);
const earned = C.checkAchievements(city, { badges: 0 });
ok('first building earns first_brick', earned.some((a) => a.id === 'first_brick'));
ok('achievements are not awarded twice', C.checkAchievements(city, { badges: 0 }).length === 0);
city.buildings = Array.from({ length: 10 }, (_, i) => ({ id: 'b' + i, type: 'hanok', x: i % 6, y: Math.floor(i / 6), level: 1 }));
ok('10 buildings earns neighborhood', C.checkAchievements(city, { badges: 0 }).some((a) => a.id === 'neighborhood'));

section('Study rewards');
const rw = C.studyRewards({ kind: 'vocab', newSentences: 6, reviews: 4, words: 8, stars: 3, checkpoint: false, streakDay: true });
ok('new sentences give bricks', rw.brick === 4 + 12 + 3, `${rw.brick}`);
ok('reviews give timber', rw.timber === 2);
ok('words give glass', rw.glass === 2);
ok('streak gives energy', rw.energy === 2);
const cp = C.studyRewards({ kind: 'checkpoint', newSentences: 0, stars: 3, checkpoint: true });
ok('checkpoint gives steel and a blueprint', cp.steel >= 12 && cp.blueprint === 1);

section('Prestige');
city = C.newCity(1000);
city.lifetimeWon = C.PRESTIGE_BASE - 1;
ok('not ready before the threshold', C.prestigeReady(city) === false);
city.lifetimeWon = C.PRESTIGE_BASE;
ok('ready at the threshold', C.prestigeReady(city) === true);
const next = C.prestige(city);
ok('prestige raises the era', next.era === 2);
ok('prestige clears buildings', next.buildings.length === 0);
ok('prestige keeps achievements', Array.isArray(next.achievements));
ok('era multiplier is +50%', Math.abs(C.globalMultiplier({ ...city, era: 2, buildings: [], badges: 0 }) - 1.5) < 1e-9);

section('Rewards');
const bank = C.applyRewards(city, { coins: 50, gems: 2, brick: 10 });
ok('applyRewards returns bank currency', bank.coins === 50 && bank.gems === 2);
ok('applyRewards adds materials', city.resources.brick >= 10);

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
