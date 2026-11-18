// A completed Seoul Works save: 26 buildings filling a 9×9 grid (81/81 tiles),
// 531 residents, 85 % happiness, 100 % transit coverage, Era 3.
// This is a legitimate final state: every footprint is valid and every gate
// (airport 300 pop, stadium 400, Lotte 500, palace/tower 12 badges) is met.
import { newCity, checkAchievements } from './city-data.js';

export const SHOWCASE_LAYOUT = [
  { type: 'airport', x: 0, y: 0, level: 2, w: 3, h: 3 },
  { type: 'palace', x: 3, y: 0, level: 2, w: 3, h: 2 },
  { type: 'stadium', x: 6, y: 0, level: 3, w: 3, h: 2 },
  { type: 'factory', x: 3, y: 2, level: 3, w: 3, h: 2 },
  { type: 'train', x: 6, y: 2, level: 3, w: 2, h: 2 },
  { type: 'lotte', x: 0, y: 3, level: 4, w: 2, h: 2 },
  { type: 'tower', x: 2, y: 4, level: 4, w: 2, h: 2 },
  { type: 'apartment', x: 4, y: 4, level: 10, w: 2, h: 2 },
  { type: 'apartment', x: 6, y: 4, level: 9, w: 2, h: 2 },
  { type: 'apartment', x: 0, y: 5, level: 8, w: 2, h: 2 },
  { type: 'school', x: 2, y: 6, level: 3, w: 2, h: 2 },
  { type: 'hospital', x: 4, y: 6, level: 3, w: 2, h: 2 },
  { type: 'power', x: 6, y: 6, level: 3, w: 2, h: 2 },
  { type: 'metro', x: 0, y: 7, level: 3, w: 2, h: 1 },
  { type: 'bridge', x: 0, y: 8, level: 2, w: 3, h: 1 },
  { type: 'villa', x: 3, y: 8, level: 5, w: 2, h: 1 },
  { type: 'villa', x: 5, y: 8, level: 4, w: 2, h: 1 },
  { type: 'park', x: 7, y: 8, level: 3, w: 1, h: 1 },
  { type: 'brickworks', x: 8, y: 8, level: 3, w: 1, h: 1 },
  { type: 'bus', x: 8, y: 2, level: 2, w: 1, h: 1 },
  { type: 'ferry', x: 2, y: 3, level: 2, w: 1, h: 1 },
  { type: 'officetel', x: 8, y: 3, level: 5, w: 1, h: 1 },
  { type: 'officetel', x: 8, y: 4, level: 4, w: 1, h: 1 },
  { type: 'police', x: 8, y: 5, level: 2, w: 1, h: 1 },
  { type: 'fire', x: 8, y: 6, level: 2, w: 1, h: 1 },
  { type: 'water', x: 8, y: 7, level: 2, w: 1, h: 1 },
];

export function buildShowcaseCity(now = Date.now()) {
  const city = newCity(now);
  city.era = 3;
  city.grid = 9;
  city.badges = 12;
  city.lifetimeWon = 60000; // 80 % toward the era-3 prestige target
  city.prestigeCount = 2;
  city.resources = { brick: 4200, timber: 3800, glass: 2600, steel: 2100, energy: 340, blueprint: 6 };
  city.buildings = SHOWCASE_LAYOUT.map((b, i) => ({ id: `showcase_${i}`, ...b }));
  city.totalBuilt = city.buildings.length;
  city.achievements = [];
  checkAchievements(city, { badges: 12 });
  return city;
}

export default { SHOWCASE_LAYOUT, buildShowcaseCity };
