// A completed Seoul Works save: 127 buildings filling a 16×16 grid (256/256
// tiles), 1,448 residents, 91.6 % happiness, 100 % transit coverage, Era 3.
// This is a legitimate final state: every footprint is valid, no two overlap,
// every service/transit/park radius reaches every resident, and every gate
// (airport 300 pop, stadium 400, Lotte 500, palace/tower 12 badges) is met.
//
// The layout was packed deterministically (16 columns × 16 rows) and is kept in
// row order so it stays easy to reason about: civic/transit north, high-rise
// housing with a park street, services + schools, industry, then commercial
// blocks and the riverfront row.
import { newCity, checkAchievements } from './city-data.js';

export const SHOWCASE_LAYOUT = [
  // North edge — airport, palace, stadium, the two towers, KTX, bus.
  { type: 'airport', x: 0, y: 0, level: 5, w: 3, h: 3 },
  { type: 'palace', x: 3, y: 0, level: 4, w: 3, h: 2 },
  { type: 'stadium', x: 6, y: 0, level: 5, w: 3, h: 2 },
  { type: 'lotte', x: 9, y: 0, level: 7, w: 2, h: 2 },
  { type: 'tower', x: 11, y: 0, level: 7, w: 2, h: 2 },
  { type: 'train', x: 13, y: 0, level: 5, w: 2, h: 2 },
  { type: 'bus', x: 15, y: 0, level: 2, w: 1, h: 1 },
  { type: 'shop', x: 15, y: 1, level: 3, w: 1, h: 1 },
  { type: 'metro', x: 3, y: 2, level: 4, w: 2, h: 1 },
  { type: 'subway', x: 5, y: 2, level: 5, w: 2, h: 1 },
  { type: 'ferry', x: 7, y: 2, level: 3, w: 1, h: 1 },
  { type: 'park', x: 8, y: 2, level: 2, w: 1, h: 1 },
  { type: 'shop', x: 9, y: 2, level: 3, w: 1, h: 1 },
  { type: 'park', x: 10, y: 2, level: 2, w: 1, h: 1 },
  { type: 'office', x: 11, y: 2, level: 4, w: 2, h: 1 },
  { type: 'office', x: 13, y: 2, level: 4, w: 2, h: 1 },
  { type: 'cafe', x: 15, y: 2, level: 3, w: 1, h: 1 },

  // High-rise housing band, level 8–10.
  { type: 'apartment', x: 0, y: 3, level: 10, w: 2, h: 2 },
  { type: 'apartment', x: 2, y: 3, level: 10, w: 2, h: 2 },
  { type: 'apartment', x: 4, y: 3, level: 9, w: 2, h: 2 },
  { type: 'apartment', x: 6, y: 3, level: 9, w: 2, h: 2 },
  { type: 'apartment', x: 8, y: 3, level: 8, w: 2, h: 2 },
  { type: 'apartment', x: 10, y: 3, level: 10, w: 2, h: 2 },
  { type: 'apartment', x: 12, y: 3, level: 9, w: 2, h: 2 },
  { type: 'apartment', x: 14, y: 3, level: 8, w: 2, h: 2 },

  // Park street, threaded with police/fire posts for full safety coverage.
  { type: 'park', x: 0, y: 5, level: 1, w: 1, h: 1 },
  { type: 'park', x: 1, y: 5, level: 2, w: 1, h: 1 },
  { type: 'police', x: 2, y: 5, level: 3, w: 1, h: 1 },
  { type: 'park', x: 3, y: 5, level: 1, w: 1, h: 1 },
  { type: 'park', x: 4, y: 5, level: 2, w: 1, h: 1 },
  { type: 'park', x: 5, y: 5, level: 3, w: 1, h: 1 },
  { type: 'park', x: 6, y: 5, level: 1, w: 1, h: 1 },
  { type: 'police', x: 7, y: 5, level: 2, w: 1, h: 1 },
  { type: 'park', x: 8, y: 5, level: 3, w: 1, h: 1 },
  { type: 'park', x: 9, y: 5, level: 1, w: 1, h: 1 },
  { type: 'park', x: 10, y: 5, level: 2, w: 1, h: 1 },
  { type: 'park', x: 11, y: 5, level: 3, w: 1, h: 1 },
  { type: 'park', x: 12, y: 5, level: 1, w: 1, h: 1 },
  { type: 'fire', x: 13, y: 5, level: 3, w: 1, h: 1 },
  { type: 'park', x: 14, y: 5, level: 3, w: 1, h: 1 },
  { type: 'park', x: 15, y: 5, level: 1, w: 1, h: 1 },

  // Low-rise villas/officetels and the first office row.
  { type: 'villa', x: 0, y: 6, level: 8, w: 2, h: 1 },
  { type: 'villa', x: 2, y: 6, level: 7, w: 2, h: 1 },
  { type: 'villa', x: 4, y: 6, level: 6, w: 2, h: 1 },
  { type: 'officetel', x: 6, y: 6, level: 8, w: 1, h: 1 },
  { type: 'officetel', x: 7, y: 6, level: 7, w: 1, h: 1 },
  { type: 'officetel', x: 8, y: 6, level: 6, w: 1, h: 1 },
  { type: 'office', x: 9, y: 6, level: 5, w: 2, h: 1 },
  { type: 'office', x: 11, y: 6, level: 5, w: 2, h: 1 },
  { type: 'shop', x: 13, y: 6, level: 3, w: 1, h: 1 },
  { type: 'cafe', x: 14, y: 6, level: 4, w: 1, h: 1 },
  { type: 'shop', x: 15, y: 6, level: 3, w: 1, h: 1 },
  { type: 'office', x: 0, y: 7, level: 5, w: 2, h: 1 },
  { type: 'office', x: 2, y: 7, level: 4, w: 2, h: 1 },
  { type: 'office', x: 4, y: 7, level: 6, w: 2, h: 1 },
  { type: 'office', x: 6, y: 7, level: 3, w: 2, h: 1 },
  { type: 'office', x: 8, y: 7, level: 5, w: 2, h: 1 },
  { type: 'office', x: 10, y: 7, level: 4, w: 2, h: 1 },
  { type: 'office', x: 12, y: 7, level: 6, w: 2, h: 1 },
  { type: 'office', x: 14, y: 7, level: 3, w: 2, h: 1 },

  // Education + health: three schools and two hospitals cover every resident.
  { type: 'school', x: 0, y: 8, level: 5, w: 2, h: 2 },
  { type: 'hospital', x: 2, y: 8, level: 5, w: 2, h: 2 },
  { type: 'office', x: 4, y: 8, level: 4, w: 2, h: 1 },
  { type: 'office', x: 6, y: 8, level: 4, w: 2, h: 1 },
  { type: 'school', x: 8, y: 8, level: 5, w: 2, h: 2 },
  { type: 'hospital', x: 10, y: 8, level: 4, w: 2, h: 2 },
  { type: 'school', x: 12, y: 8, level: 4, w: 2, h: 2 },
  { type: 'office', x: 14, y: 8, level: 4, w: 2, h: 1 },
  { type: 'factory', x: 4, y: 9, level: 4, w: 3, h: 2 },
  { type: 'cafe', x: 7, y: 9, level: 3, w: 1, h: 1 },
  { type: 'shop', x: 14, y: 9, level: 3, w: 1, h: 1 },
  { type: 'shop', x: 15, y: 9, level: 3, w: 1, h: 1 },

  // Industry, power and water, then the first mall pair.
  { type: 'office', x: 0, y: 10, level: 4, w: 2, h: 1 },
  { type: 'office', x: 2, y: 10, level: 4, w: 2, h: 1 },
  { type: 'power', x: 7, y: 10, level: 4, w: 2, h: 2 },
  { type: 'steelworks', x: 9, y: 10, level: 3, w: 2, h: 2 },
  { type: 'brickworks', x: 11, y: 10, level: 3, w: 1, h: 1 },
  { type: 'sawmill', x: 12, y: 10, level: 3, w: 1, h: 1 },
  { type: 'glassworks', x: 13, y: 10, level: 3, w: 1, h: 1 },
  { type: 'water', x: 14, y: 10, level: 3, w: 1, h: 1 },
  { type: 'cafe', x: 15, y: 10, level: 3, w: 1, h: 1 },
  { type: 'mall', x: 0, y: 11, level: 6, w: 2, h: 2 },
  { type: 'mall', x: 2, y: 11, level: 5, w: 2, h: 2 },
  { type: 'cafe', x: 4, y: 11, level: 3, w: 1, h: 1 },
  { type: 'shop', x: 5, y: 11, level: 3, w: 1, h: 1 },
  { type: 'cafe', x: 6, y: 11, level: 3, w: 1, h: 1 },
  { type: 'office', x: 11, y: 11, level: 4, w: 2, h: 1 },
  { type: 'office', x: 13, y: 11, level: 4, w: 2, h: 1 },
  { type: 'officetel', x: 15, y: 11, level: 7, w: 1, h: 1 },

  // Commercial south — malls, offices and pocket parks down to the river.
  { type: 'office', x: 4, y: 12, level: 5, w: 2, h: 1 },
  { type: 'office', x: 6, y: 12, level: 4, w: 2, h: 1 },
  { type: 'office', x: 8, y: 12, level: 5, w: 2, h: 1 },
  { type: 'office', x: 10, y: 12, level: 4, w: 2, h: 1 },
  { type: 'office', x: 12, y: 12, level: 5, w: 2, h: 1 },
  { type: 'park', x: 14, y: 12, level: 2, w: 1, h: 1 },
  { type: 'park', x: 15, y: 12, level: 2, w: 1, h: 1 },
  { type: 'park', x: 4, y: 13, level: 2, w: 1, h: 1 },
  { type: 'park', x: 5, y: 13, level: 2, w: 1, h: 1 },
  { type: 'park', x: 6, y: 13, level: 2, w: 1, h: 1 },
  { type: 'shop', x: 7, y: 13, level: 3, w: 1, h: 1 },
  { type: 'office', x: 8, y: 13, level: 4, w: 2, h: 1 },
  { type: 'office', x: 10, y: 13, level: 4, w: 2, h: 1 },
  { type: 'school', x: 12, y: 13, level: 4, w: 2, h: 2 },
  { type: 'bus', x: 14, y: 13, level: 2, w: 1, h: 1 },
  { type: 'shop', x: 15, y: 13, level: 3, w: 1, h: 1 },
  { type: 'mall', x: 0, y: 13, level: 6, w: 2, h: 2 },
  { type: 'mall', x: 2, y: 13, level: 5, w: 2, h: 2 },
  { type: 'park', x: 4, y: 14, level: 2, w: 1, h: 1 },
  { type: 'park', x: 5, y: 14, level: 2, w: 1, h: 1 },
  { type: 'park', x: 6, y: 14, level: 2, w: 1, h: 1 },
  { type: 'park', x: 7, y: 14, level: 2, w: 1, h: 1 },
  { type: 'office', x: 8, y: 14, level: 4, w: 2, h: 1 },
  { type: 'office', x: 10, y: 14, level: 4, w: 2, h: 1 },
  { type: 'park', x: 14, y: 14, level: 2, w: 1, h: 1 },
  { type: 'park', x: 15, y: 14, level: 2, w: 1, h: 1 },

  // Riverfront: two Han River bridge spans, riverside parks, last officetel.
  { type: 'bridge', x: 0, y: 15, level: 3, w: 3, h: 1 },
  { type: 'bridge', x: 3, y: 15, level: 3, w: 3, h: 1 },
  { type: 'cafe', x: 6, y: 15, level: 3, w: 1, h: 1 },
  { type: 'shop', x: 7, y: 15, level: 3, w: 1, h: 1 },
  { type: 'park', x: 8, y: 15, level: 2, w: 1, h: 1 },
  { type: 'park', x: 9, y: 15, level: 2, w: 1, h: 1 },
  { type: 'park', x: 10, y: 15, level: 2, w: 1, h: 1 },
  { type: 'park', x: 11, y: 15, level: 2, w: 1, h: 1 },
  { type: 'police', x: 12, y: 15, level: 2, w: 1, h: 1 },
  { type: 'park', x: 13, y: 15, level: 2, w: 1, h: 1 },
  { type: 'park', x: 14, y: 15, level: 2, w: 1, h: 1 },
  { type: 'officetel', x: 15, y: 15, level: 8, w: 1, h: 1 },
];

export function buildShowcaseCity(now = Date.now()) {
  const city = newCity(now);
  city.era = 3;
  city.grid = 16;
  city.badges = 12;
  city.lifetimeWon = 60000; // 80 % toward the era-3 prestige target
  city.prestigeCount = 2;
  city.resources = { brick: 6200, timber: 5400, glass: 3800, steel: 3200, energy: 420, blueprint: 6 };
  city.buildings = SHOWCASE_LAYOUT.map((b, i) => ({ id: `showcase_${i}`, ...b }));
  city.totalBuilt = city.buildings.length;
  city.achievements = [];
  checkAchievements(city, { badges: 12 });
  return city;
}

export default { SHOWCASE_LAYOUT, buildShowcaseCity };
