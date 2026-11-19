// Seoul Works 3D — one volumetric model per catalogue type.
//
// Every model is built inside its footprint (W × D px) and rises along +z.
// Level drives height; the footprint comes from the wrapper's w×h; era only
// changes the palette (see .g-world.era-N in game.css).
//
// The models use only CSS cuboids, wedges, slabs, setbacks, canopies, spires
// and window quads. No images, emoji or SVG buildings.

import { TILE, face, flat, front, side, box, gable, gableY, stack, tree, strip, sign, signSide } from './geometry.js';

const GROW = {
  office: 0.1,
  apart: 0.09,
  lotte: 0.06,
  tower: 0.04,
  hospital: 0.07,
  hotel: 0.08,
};

const BASE_TILES = {
  hanok: 1.32,
  villa: 1.72,
  apartment: 3.5,
  officetel: 3.1,
  cafe: 1.42,
  shop: 1.36,
  mall: 1.95,
  office: 3.9,
  brickworks: 3.35,
  sawmill: 1.85,
  glassworks: 3.4,
  steelworks: 3.15,
  factory: 3.6,
  park: 1.45,
  school: 1.9,
  hospital: 3.05,
  police: 1.55,
  fire: 2.45,
  power: 3.3,
  water: 3.8,
  bus: 1.45,
  subway: 2.7,
  metro: 3.25,
  train: 2.95,
  ferry: 1.9,
  airport: 3.6,
  palace: 2.7,
  stadium: 1.9,
  tower: 6.2,
  lotte: 7.0,
  bridge: 2.5,
};

/** Visual peak height in world px, used for camera fit + mini previews. */
export function heightOf(type, level = 1) {
  const base = BASE_TILES[type] || 2.6;
  const grow = GROW[type] ?? 0.07;
  const lv = Math.max(1, Math.min(10, Math.round(Number(level) || 1)));
  return base * TILE * (1 + grow * (lv - 1));
}

const PEAK = {
  lotte: 1.2,
  office: 1.06,
  tower: 1.03,
  factory: 1.02,
  bridge: 1.0,
  airport: 1.0,
};

/** Peak used for camera fitting / preview framing (spires exceed heightOf). */
export function peakOf(type, level = 1) {
  return heightOf(type, level) * (PEAK[type] || 1);
}

const P = 2; // plinth height

function plinth(W, D, top = 'g-mat-concrete', side = 'g-mat-concrete2', inset = 1.2) {
  return box({ x: inset, y: inset, z: 0, w: W - inset * 2, d: D - inset * 2, h: P, top, side, side2: 'g-mat-concrete2' });
}

function bands({ x, y, z, w, d, h, cols = 5, rows = 4, cls = 'g-mat-glassgrid' }) {
  // A window face on the front and one on the sunlit side. The CSS classes draw
  // the mullions, so the same face scales from a 1×1 shack to a 3×3 terminal.
  return (
    front({ x, y, z, w, h, cls, out: 0.55, style: `--cols:${cols};--rows:${rows}` }) +
    side({ x: x + w, y, z, d, h, cls, out: 0.55, style: `--cols:${Math.max(2, Math.round(cols * (d / Math.max(1, w))))};--rows:${rows}` })
  );
}

function balconyRow({ x, y, z, w, cls = 'g-mat-concrete' }) {
  return box({ x, y, z, w, d: 3.2, h: 1.4, top: cls, side: cls, side2: 'g-mat-concrete2' });
}

/* ------------------------------------------------------------------ models */

function hanok(W, D, lv) {
  const bodyH = heightOf('hanok', lv) * 0.5;
  const roofH = heightOf('hanok', lv) * 0.34;
  const bx = W * 0.14;
  const by = D * 0.18;
  const bw = W * 0.72;
  const bd = D * 0.64;
  let o = plinth(W, D, 'g-mat-grass2', 'g-mat-earth', 0.4);
  o += box({ x: W * 0.08, y: D * 0.1, z: P, w: W * 0.84, d: D * 0.8, h: 5, top: 'g-mat-stone', side: 'g-mat-stone', side2: 'g-mat-concrete2' });
  o += box({ x: bx, y: by, z: P + 5, w: bw, d: bd, h: bodyH, top: 'g-mat-wood2', side: 'g-mat-paper', side2: 'g-mat-paper2' });
  const z0 = P + 5;
  // timber frame posts
  for (let i = 0; i < 4; i++) {
    const px = bx + (bw * i) / 3;
    o += box({ x: px - 1.5, y: by + bd - 2, z: z0, w: 3, d: 2.2, h: bodyH, top: 'g-mat-wood', side: 'g-mat-wood', side2: 'g-mat-wood2' });
    o += box({ x: px - 1.5, y: by, z: z0, w: 3, d: 2.2, h: bodyH, top: 'g-mat-wood', side: 'g-mat-wood', side2: 'g-mat-wood2' });
  }
  o += box({ x: bx, y: by + bd - 2.4, z: z0 + bodyH * 0.55, w: bw, d: 2.4, h: 2.2, top: 'g-mat-wood', side: 'g-mat-wood2', side2: 'g-mat-wood2' });
  // paper doors and windows
  o += front({ x: bx + bw * 0.34, y: by + bd + 0.4, z: z0 + 2, w: bw * 0.12, h: bodyH * 0.72, cls: 'g-mat-wood2' });
  o += front({ x: bx + bw * 0.52, y: by + bd + 0.4, z: z0 + 2, w: bw * 0.12, h: bodyH * 0.72, cls: 'g-mat-wood2' });
  o += front({ x: bx + bw * 0.06, y: by + bd + 0.5, z: z0 + bodyH * 0.36, w: bw * 0.2, h: bodyH * 0.34, cls: 'g-mat-paper' });
  o += front({ x: bx + bw * 0.7, y: by + bd + 0.5, z: z0 + bodyH * 0.36, w: bw * 0.2, h: bodyH * 0.34, cls: 'g-mat-paper' });
  // deep eaves + tiled gable
  o += flat({ x: W * 0.03, y: D * 0.06, z: z0 + bodyH, w: W * 0.94, d: D * 0.88, cls: 'g-mat-roof2' });
  o += gable({ x: bx - 4, y: by - 5, z: z0 + bodyH + 1.4, w: bw + 8, d: bd + 10, h: roofH, over: 2, ends: 'g-mat-paper' });
  o += box({ x: bx - 5, y: by + bd / 2 - 2.5, z: z0 + bodyH + roofH - 1, w: bw + 10, d: 5, h: 3.4, top: 'g-mat-roof', side: 'g-mat-roof2', side2: 'g-mat-roof2' });
  // courtyard wall
  o += box({ x: 1, y: D * 0.84, z: P, w: W * 0.2, d: 3, h: 7, top: 'g-mat-roof2', side: 'g-mat-paper', side2: 'g-mat-paper2' });
  o += box({ x: W * 0.8, y: D * 0.84, z: P, w: W * 0.19, d: 3, h: 7, top: 'g-mat-roof2', side: 'g-mat-paper', side2: 'g-mat-paper2' });
  return o;
}

function villa(W, D, lv) {
  const h = heightOf('villa', lv) * 0.82;
  const bw = W * 0.9;
  const bd = D * 0.68;
  const bx = W * 0.05;
  const by = D * 0.14;
  let o = plinth(W, D, 'g-mat-path', 'g-mat-earth');
  o += box({ x: bx, y: by, z: P, w: bw, d: bd, h, top: 'g-mat-roof3', side: 'g-mat-wall', side2: 'g-mat-wall2' });
  o += bands({ x: bx + 2, y: by + bd, z: P + 5, w: bw - 4, d: bd, h: h - 8, cols: 7, rows: Math.max(2, Math.round(h / 13)) });
  // balconies + the shaded side windows
  for (let z = P + 10, floors = 0; z < P + h - 8 && z < P + 100 && floors < 4; z += 13, floors++) {
    o += balconyRow({ x: bx + 2, y: by + bd - 1, z, w: bw * 0.42 });
    o += front({ x: bx + bw * 0.56, y: by + bd + 0.6, z: z + 1.5, w: bw * 0.32, h: 8, cls: 'g-mat-glass' });
  }
  o += front({ x: bx + bw * 0.14, y: by + bd + 0.7, z: P, w: bw * 0.18, h: 12, cls: 'g-mat-glass2' });
  // stair bulkhead + small pitched cap + roof tank
  o += box({ x: bx + bw * 0.62, y: by + bd * 0.2, z: P + h, w: bw * 0.2, d: bd * 0.4, h: 9, top: 'g-mat-roof3', side: 'g-mat-wall', side2: 'g-mat-wall2' });
  o += gable({ x: bx + bw * 0.58, y: by + bd * 0.15, z: P + h + 9, w: bw * 0.28, d: bd * 0.5, h: 9, over: 1.5 });
  o += box({ x: bx + bw * 0.1, y: by + bd * 0.25, z: P + h, w: 7, d: 7, h: 8, top: 'g-mat-steel', side: 'g-mat-steel', side2: 'g-mat-steel2' });
  o += sign({ x: bx + bw * 0.3, y: by + bd, z: P + h * 0.52, w: bw * 0.24, h: 8, text: '빌라', cls: 'g-sign g-sign--small', out: 0.9 });
  return o;
}

function apartment(W, D, lv) {
  const h = heightOf('apartment', lv) * 0.85;
  const bx = W * 0.15;
  const by = D * 0.18;
  const bw = W * 0.68;
  const bd = D * 0.5;
  let o = plinth(W, D, 'g-mat-grass2', 'g-mat-earth');
  // podium / parking
  o += box({ x: W * 0.06, y: D * 0.08, z: P, w: W * 0.88, d: D * 0.78, h: 10, top: 'g-mat-concrete', side: 'g-mat-concrete', side2: 'g-mat-concrete2' });
  o += box({ x: bx, y: by, z: P + 10, w: bw, d: bd, h, top: 'g-mat-roof3', side: 'g-mat-wall', side2: 'g-mat-wall2' });
  o += bands({ x: bx + 1, y: by + bd, z: P + 16, w: bw - 2, d: bd, h: h - 12, cols: 8, rows: Math.max(3, Math.round(h / 12)) });
  // balcony stack on the sunny face
  for (let z = P + 20, floors = 0; z < P + 10 + h - 10 && z < P + 190 && floors < 6; z += 13, floors++) {
    o += balconyRow({ x: bx + 2, y: by + bd - 1, z, w: bw * 0.5 });
    o += front({ x: bx + bw * 0.6, y: by + bd + 0.65, z: z + 1.4, w: bw * 0.36, h: 7.4, cls: 'g-mat-glass' });
  }
  // entrance canopy
  o += box({ x: bx + bw * 0.32, y: by + bd, z: P + 12, w: bw * 0.36, d: 7, h: 2, top: 'g-mat-coral', side: 'g-mat-coral', side2: 'g-mat-coral2' });
  o += front({ x: bx + bw * 0.38, y: by + bd + 0.6, z: P + 10, w: bw * 0.24, h: 8, cls: 'g-mat-glass2' });
  // rooftop stair + water tank + aerial
  o += box({ x: bx + bw * 0.12, y: by + bd * 0.2, z: P + 10 + h, w: bw * 0.22, d: bd * 0.32, h: 8, top: 'g-mat-roof3', side: 'g-mat-wall', side2: 'g-mat-wall2' });
  o += box({ x: bx + bw * 0.55, y: by + bd * 0.3, z: P + 10 + h, w: 8, d: 8, h: 9, top: 'g-mat-steel', side: 'g-mat-steel', side2: 'g-mat-steel2' });
  o += box({ x: bx + bw * 0.62, y: by + bd * 0.36, z: P + 19 + h, w: 1.4, d: 1.4, h: 14, top: 'g-mat-steel', side: 'g-mat-steel', side2: 'g-mat-steel2' });
  o += sign({ x: bx + bw * 0.26, y: by + bd, z: P + 10 + h * 0.75, w: bw * 0.3, h: 7, text: '아파트', cls: 'g-sign g-sign--small', out: 0.9 });
  return o;
}

function officetel(W, D, lv) {
  const h = heightOf('officetel', lv) * 0.82;
  const bw = W * 0.68;
  const bd = D * 0.64;
  let o = plinth(W, D, 'g-mat-path', 'g-mat-earth');
  o += box({ x: W * 0.12, y: D * 0.12, z: P, w: W * 0.76, d: D * 0.76, h: 8, top: 'g-mat-concrete', side: 'g-mat-concrete', side2: 'g-mat-concrete2' });
  o += box({ x: (W - bw) / 2, y: (D - bd) / 2, z: P + 8, w: bw, d: bd, h, top: 'g-mat-roof3', side: 'g-mat-wall', side2: 'g-mat-wall2' });
  o += bands({ x: (W - bw) / 2 + 1, y: (D + bd) / 2, z: P + 10, w: bw - 2, d: bd, h: h - 6, cols: 5, rows: Math.max(4, Math.round(h / 10)) });
  o += front({ x: W * 0.36, y: (D + bd) / 2 + 0.6, z: P + 8, w: W * 0.28, h: 9, cls: 'g-mat-glass2' });
  o += box({ x: W * 0.36, y: (D + bd) / 2, z: P + 8, w: W * 0.28, d: 5, h: 2, top: 'g-mat-coral', side: 'g-mat-coral', side2: 'g-mat-coral2' });
  o += box({ x: W * 0.42, y: D * 0.5, z: P + 8 + h, w: 6, d: 6, h: 7, top: 'g-mat-steel', side: 'g-mat-steel', side2: 'g-mat-steel2' });
  o += sign({ x: W * 0.22, y: (D + bd) / 2, z: P + 12 + h * 0.72, w: W * 0.56, h: 8, text: '오피스텔', cls: 'g-sign g-sign--small', out: 0.9 });
  return o;
}

function cafe(W, D, lv) {
  const h = heightOf('cafe', lv) * 0.55;
  const bx = W * 0.08;
  const by = D * 0.12;
  const bw = W * 0.84;
  const bd = D * 0.66;
  let o = plinth(W, D, 'g-mat-path', 'g-mat-earth');
  o += box({ x: bx, y: by, z: P, w: bw, d: bd, h, top: 'g-mat-roof3', side: 'g-mat-wall', side2: 'g-mat-wall2' });
  o += front({ x: bx + bw * 0.08, y: by + bd + 0.5, z: P + 3, w: bw * 0.84, h: h - 5, cls: 'g-mat-glassgrid' });
  o += side({ x: bx + bw, y: by + 4, z: P + 4, d: bd - 8, h: h * 0.6, cls: 'g-mat-glass', out: 0.6 });
  o += sign({ x: bx + bw * 0.24, y: by + bd, z: P + h - 10, w: bw * 0.52, h: 8, text: '카페', cls: 'g-sign g-sign--cafe', out: 1 });
  // striped awning
  o += face({
    w: bw * 0.9,
    h: 11,
    o: [bx + bw * 0.05, by + bd, P + h * 0.62],
    u: [bw * 0.9, 0, 0],
    v: [0, 10, -3.4],
    cls: 'g-mat-awning',
  });
  // tables under umbrellas
  o += box({ x: W * 0.18, y: D * 0.82, z: P, w: 1.4, d: 1.4, h: 7, top: 'g-mat-steel', side: 'g-mat-steel', side2: 'g-mat-steel2' });
  o += flat({ x: W * 0.06, y: D * 0.72, z: P + 8, w: W * 0.28, d: D * 0.2, cls: 'g-mat-awning2' });
  o += box({ x: W * 0.7, y: D * 0.83, z: P, w: 5, d: 5, h: 2.5, top: 'g-mat-wood', side: 'g-mat-wood', side2: 'g-mat-wood2' });
  return o;
}

function shop(W, D, lv) {
  const h = heightOf('shop', lv) * 0.55;
  let o = plinth(W, D, 'g-mat-path', 'g-mat-earth');
  const leg = 2.2;
  for (const [lx, ly] of [
    [W * 0.16, D * 0.2],
    [W * 0.78, D * 0.2],
    [W * 0.16, D * 0.76],
    [W * 0.78, D * 0.76],
  ]) {
    o += box({ x: lx, y: ly, z: P, w: leg, d: leg, h, top: 'g-mat-wood', side: 'g-mat-wood', side2: 'g-mat-wood2' });
  }
  o += box({ x: W * 0.08, y: D * 0.14, z: P + h, w: W * 0.84, d: D * 0.72, h: 2.2, top: 'g-mat-awning', side: 'g-mat-awning', side2: 'g-mat-awning2' });
  o += gable({ x: W * 0.02, y: D * 0.06, z: P + h + 1.8, w: W * 0.96, d: D * 0.88, h: 7, over: 1.5, cls: 'g-mat-awning', cls2: 'g-mat-awning2', ends: 'g-mat-awning2' });
  // counter, crates, produce
  o += box({ x: W * 0.16, y: D * 0.26, z: P, w: W * 0.5, d: 5, h: 6, top: 'g-mat-wood', side: 'g-mat-wood2', side2: 'g-mat-wood2' });
  o += box({ x: W * 0.72, y: D * 0.28, z: P, w: 8, d: 8, h: 4, top: 'g-mat-coral', side: 'g-mat-coral', side2: 'g-mat-coral2' });
  o += box({ x: W * 0.72, y: D * 0.5, z: P, w: 8, d: 8, h: 4, top: 'g-mat-amber', side: 'g-mat-amber', side2: 'g-mat-amber2' });
  o += sign({ x: W * 0.28, y: D * 0.5, z: P + h + 3, w: W * 0.44, h: 8, text: '상점', cls: 'g-sign g-sign--small', out: 0.8 });
  return o;
}

function mall(W, D, lv) {
  const h = heightOf('mall', lv) * 0.78;
  const bx = W * 0.05;
  const by = D * 0.08;
  const bw = W * 0.9;
  const bd = D * 0.68;
  let o = plinth(W, D, 'g-mat-path', 'g-mat-earth');
  o += box({ x: bx, y: by, z: P, w: bw, d: bd, h, top: 'g-mat-roof3', side: 'g-mat-wall', side2: 'g-mat-wall2' });
  // glass atrium
  o += box({ x: W * 0.34, y: by + bd * 0.12, z: P, w: W * 0.32, d: bd * 0.76, h: h + 6, top: 'g-mat-glass2', side: 'g-mat-glassgrid', side2: 'g-mat-glass', bottom: 'g-mat-glass' });
  o += front({ x: bx + 3, y: by + bd, z: P + 4, w: bw * 0.26, h: h - 12, cls: 'g-mat-glassgrid' });
  o += front({ x: bx + bw * 0.7, y: by + bd, z: P + 4, w: bw * 0.26, h: h - 12, cls: 'g-mat-glassgrid' });
  o += box({ x: W * 0.3, y: by + bd, z: P + 10, w: W * 0.4, d: 8, h: 2.2, top: 'g-mat-coral', side: 'g-mat-coral', side2: 'g-mat-coral2' });
  o += sign({ x: W * 0.18, y: by + bd * 0.98, z: P + h - 15, w: W * 0.64, h: 11, text: '쇼핑몰', cls: 'g-sign g-sign--mall', out: 1 });
  // roof plant + parking / cars on the apron
  o += box({ x: bx + 6, y: by + 5, z: P + h, w: bw * 0.2, d: bd * 0.22, h: 7, top: 'g-mat-steel', side: 'g-mat-steel', side2: 'g-mat-steel2' });
  o += strip({ x: W * 0.05, y: D * 0.8, z: 1.1, w: W * 0.9, d: D * 0.16, cls: 'g-mat-asphalt' });
  for (let i = 0; i < 3; i++) {
    o += box({ x: W * (0.12 + i * 0.26), y: D * 0.82, z: 1.2, w: 9, d: 6, h: 4, top: 'g-mat-car' + (i % 3), side: 'g-mat-car' + (i % 3), side2: 'g-mat-steel2' });
  }
  return o;
}

function office(W, D, lv) {
  const h = heightOf('office', lv) * 0.86;
  const bw = W * 0.42;
  const bd = D * 0.6;
  const bx = W * 0.08;
  const by = D * 0.18;
  let o = plinth(W, D, 'g-mat-path', 'g-mat-earth');
  o += box({ x: bx, y: by, z: P, w: bw, d: bd, h, top: 'g-mat-roof3', side: 'g-mat-glassgrid', side2: 'g-mat-glass' });
  // setback crown
  o += box({ x: bx + bw * 0.1, y: by + bd * 0.08, z: P + h, w: bw * 0.8, d: bd * 0.84, h: 12, top: 'g-mat-roof3', side: 'g-mat-glassgrid', side2: 'g-mat-glass' });
  o += box({ x: bx + bw * 0.34, y: by + bd * 0.38, z: P + h + 12, w: 2, d: 2, h: 17, top: 'g-mat-steel', side: 'g-mat-steel', side2: 'g-mat-steel2' });
  // lobby + plaza canopy
  o += box({ x: W * 0.58, y: by + 2, z: P, w: W * 0.3, d: bd * 0.9, h: 12, top: 'g-mat-concrete', side: 'g-mat-wall', side2: 'g-mat-wall2' });
  o += box({ x: W * 0.54, y: by + bd - 4, z: P + 10, w: W * 0.38, d: 8, h: 2, top: 'g-mat-coral', side: 'g-mat-coral', side2: 'g-mat-coral2' });
  o += tree({ x: W * 0.3, y: D * 0.86, z: P, s: 0.8 });
  o += sign({ x: bx + bw * 0.2, y: by + bd, z: P + h * 0.8, w: bw * 0.6, h: 8, text: '오피스', cls: 'g-sign g-sign--small', out: 0.9 });
  return o;
}

function brickworks(W, D, lv) {
  const h = heightOf('brickworks', lv) * 0.42;
  const cx = W * 0.66;
  const cy = D * 0.28;
  let o = plinth(W, D, 'g-mat-earth', 'g-mat-earth2');
  o += box({ x: W * 0.08, y: D * 0.3, z: P, w: W * 0.58, d: D * 0.52, h, top: 'g-mat-roof3', side: 'g-mat-brickwall', side2: 'g-mat-brickwall2' });
  // sawtooth roofs
  for (let i = 0; i < 3; i++) {
    const sw = W * 0.155;
    o += gableY({ x: W * 0.1 + i * sw, y: D * 0.32, z: P + h, w: sw, d: D * 0.48, h: 7, over: 0.8, cls: 'g-mat-roof', cls2: 'g-mat-roof3' });
  }
  // kiln chimney
  o += box({ x: cx, y: cy, z: P, w: 7, d: 7, h: heightOf('brickworks', lv), top: 'g-mat-brick', side: 'g-mat-brickwall', side2: 'g-mat-brickwall2' });
  o += box({ x: cx - 1, y: cy - 1, z: P + heightOf('brickworks', lv) - 5, w: 9, d: 9, h: 2, top: 'g-mat-brick', side: 'g-mat-brick', side2: 'g-mat-brick2' });
  // drying brick stacks
  for (let i = 0; i < 3; i++) {
    o += box({ x: W * (0.78 + (i % 2) * 0.08), y: D * (0.55 + Math.floor(i / 2) * 0.17), z: P, w: 7, d: 5, h: 3.5, top: 'g-mat-brick', side: 'g-mat-brickwall', side2: 'g-mat-brickwall2' });
  }
  o += sign({ x: W * 0.12, y: D * 0.82, z: P + h - 7, w: W * 0.3, h: 6, text: '벽돌', cls: 'g-sign g-sign--small', out: 0.8 });
  return o;
}

function sawmill(W, D, lv) {
  const h = heightOf('sawmill', lv) * 0.5;
  let o = plinth(W, D, 'g-mat-earth', 'g-mat-earth2');
  // open shed
  for (const [lx, ly] of [
    [W * 0.12, D * 0.18],
    [W * 0.12, D * 0.78],
    [W * 0.84, D * 0.18],
    [W * 0.84, D * 0.78],
  ]) {
    o += box({ x: lx, y: ly, z: P, w: 2.4, d: 2.4, h, top: 'g-mat-wood', side: 'g-mat-wood', side2: 'g-mat-wood2' });
  }
  o += gable({ x: W * 0.06, y: D * 0.1, z: P + h, w: W * 0.88, d: D * 0.8, h: 10, over: 2.5, cls: 'g-mat-roof', cls2: 'g-mat-roof3', ends: 'g-mat-wood2' });
  o += box({ x: W * 0.28, y: D * 0.3, z: P, w: W * 0.34, d: 6, h: 5, top: 'g-mat-wood', side: 'g-mat-wood2', side2: 'g-mat-wood2' });
  // log piles
  for (let i = 0; i < 3; i++) {
    o += box({ x: W * 0.16, y: D * 0.62 + i * 4.2, z: P + (i === 2 ? 3.6 : 0), w: W * 0.4, d: 3.6, h: 3.6, top: 'g-mat-wood', side: 'g-mat-wood', side2: 'g-mat-wood2' });
  }
  o += box({ x: W * 0.66, y: D * 0.52, z: P, w: 8, d: 8, h: 8, top: 'g-mat-wood', side: 'g-mat-wood2', side2: 'g-mat-wood2' });
  o += sign({ x: W * 0.34, y: D * 0.82, z: P + h - 6, w: W * 0.3, h: 6, text: '제재', cls: 'g-sign g-sign--small', out: 0.8 });
  return o;
}

function glassworks(W, D, lv) {
  const h = heightOf('glassworks', lv) * 0.42;
  let o = plinth(W, D, 'g-mat-concrete2', 'g-mat-earth2');
  o += box({ x: W * 0.08, y: D * 0.3, z: P, w: W * 0.68, d: D * 0.54, h, top: 'g-mat-roof3', side: 'g-mat-wall', side2: 'g-mat-wall2' });
  // glass roof slopes
  o += face({ w: W * 0.7, h: D * 0.3, o: [W * 0.07, D * 0.84, P + h + 5], u: [W * 0.7, 0, 0], v: [0, -D * 0.28, -5], cls: 'g-mat-glassroof' });
  o += face({ w: W * 0.7, h: D * 0.3, o: [W * 0.07, D * 0.3, P + h + 5], u: [W * 0.7, 0, 0], v: [0, D * 0.28, -5], cls: 'g-mat-glassroof2' });
  // glowing furnace
  o += box({ x: W * 0.66, y: D * 0.38, z: P, w: W * 0.2, d: D * 0.2, h: h + 8, top: 'g-mat-furnace', side: 'g-mat-furnace', side2: 'g-mat-furnace2' });
  o += box({ x: W * 0.72, y: D * 0.26, z: P, w: 6, d: 6, h: heightOf('glassworks', lv), top: 'g-mat-steel', side: 'g-mat-steel', side2: 'g-mat-steel2' });
  o += front({ x: W * 0.14, y: D * 0.84, z: P + 3, w: W * 0.24, h: h - 6, cls: 'g-mat-glass' });
  o += sign({ x: W * 0.2, y: D * 0.84, z: P + h - 6, w: W * 0.3, h: 6, text: '유리', cls: 'g-sign g-sign--small', out: 0.9 });
  return o;
}

function steelworks(W, D, lv) {
  const h = heightOf('steelworks', lv) * 0.42;
  let o = plinth(W, D, 'g-mat-concrete2', 'g-mat-earth2');
  o += box({ x: W * 0.04, y: D * 0.42, z: P, w: W * 0.58, d: D * 0.46, h, top: 'g-mat-roof3', side: 'g-mat-steel', side2: 'g-mat-steel2' });
  // sawtooth steel roof
  for (let i = 0; i < 4; i++) {
    o += gableY({ x: W * 0.04 + i * W * 0.145, y: D * 0.44, z: P + h, w: W * 0.145, d: D * 0.42, h: 8, over: 0.6, cls: 'g-mat-steel', cls2: 'g-mat-roof3' });
  }
  // blast furnace
  const fx = W * 0.62;
  const fy = D * 0.28;
  o += box({ x: fx, y: fy, z: P, w: W * 0.22, d: D * 0.22, h: h * 1.5, top: 'g-mat-steel2', side: 'g-mat-steel', side2: 'g-mat-steel2' });
  o += stack({ x: fx + 3, y: fy + 3, z: P + h * 1.5, w: W * 0.22 - 6, d: D * 0.22 - 6, h: heightOf('steelworks', lv) * 0.52, steps: 3, shrink: 0.72, cls: 'g-mat-steel', cls2: 'g-mat-steel2', top: 'g-mat-steel2' });
  o += box({ x: fx + 1, y: fy + 1, z: P + h * 1.5 - 4, w: W * 0.2, d: D * 0.2, h: 3, top: 'g-mat-rust', side: 'g-mat-rust', side2: 'g-mat-rust2' });
  // storage tanks + pipes
  o += stack({ x: W * 0.68, y: D * 0.62, z: P, w: W * 0.24, d: D * 0.22, h: 24, steps: 2, shrink: 0.92, cls: 'g-mat-steel', cls2: 'g-mat-steel2', top: 'g-mat-steel2' });
  o += box({ x: W * 0.32, y: D * 0.34, z: P + h * 0.42, w: W * 0.36, d: 2.4, h: 2.4, top: 'g-mat-pipe', side: 'g-mat-pipe', side2: 'g-mat-steel2' });
  o += box({ x: W * 0.5, y: D * 0.34, z: P + h * 0.74, w: 2.2, d: D * 0.22, h: 2.2, top: 'g-mat-pipe', side: 'g-mat-pipe', side2: 'g-mat-steel2' });
  o += sign({ x: W * 0.1, y: D * 0.86, z: P + h - 6, w: W * 0.26, h: 6, text: '제철', cls: 'g-sign g-sign--small', out: 0.8 });
  return o;
}

function factory(W, D, lv) {
  const h = heightOf('factory', lv) * 0.52;
  let o = plinth(W, D, 'g-mat-concrete2', 'g-mat-earth2');
  o += strip({ x: W * 0.04, y: D * 0.72, z: 1.2, w: W * 0.92, d: D * 0.18, cls: 'g-mat-asphalt' });
  o += box({ x: W * 0.06, y: D * 0.18, z: P, w: W * 0.72, d: D * 0.5, h, top: 'g-mat-roof3', side: 'g-mat-corrugated', side2: 'g-mat-corrugated2' });
  // four sawtooth bays
  for (let i = 0; i < 4; i++) {
    o += gableY({ x: W * 0.06 + i * W * 0.18, y: D * 0.2, z: P + h, w: W * 0.18, d: D * 0.46, h: 9, over: 0.8, cls: 'g-mat-roof', cls2: 'g-mat-roof3' });
  }
  // chimneys
  o += box({ x: W * 0.8, y: D * 0.26, z: P, w: 7, d: 7, h: heightOf('factory', lv) * 0.92, top: 'g-mat-steel', side: 'g-mat-brickwall', side2: 'g-mat-brickwall2' });
  o += box({ x: W * 0.86, y: D * 0.46, z: P, w: 5, d: 5, h: heightOf('factory', lv) * 0.72, top: 'g-mat-steel', side: 'g-mat-concrete', side2: 'g-mat-concrete2' });
  o += box({ x: W * 0.78, y: D * 0.24, z: P + heightOf('factory', lv) * 0.9, w: 11, d: 11, h: 2, top: 'g-mat-roof3', side: 'g-mat-roof3', side2: 'g-mat-rust' });
  // loading dock + truck
  o += box({ x: W * 0.08, y: D * 0.7, z: P, w: W * 0.26, d: 9, h: 7, top: 'g-mat-concrete', side: 'g-mat-concrete', side2: 'g-mat-concrete2' });
  o += box({ x: W * 0.14, y: D * 0.78, z: 1.2, w: 12, d: 6, h: 5, top: 'g-mat-coral', side: 'g-mat-coral', side2: 'g-mat-coral2' });
  o += sign({ x: W * 0.1, y: D * 0.68, z: P + h - 8, w: W * 0.2, h: 7, text: '공장', cls: 'g-sign g-sign--small', out: 0.8 });
  return o;
}

function park(W, D, lv) {
  const s = Math.min(W, D);
  let o = plinth(W, D, 'g-mat-grass', 'g-mat-earth', 0.5);
  o += strip({ x: W * 0.12, y: D * 0.46, z: P + 0.5, w: W * 0.76, d: 5, cls: 'g-mat-path' });
  o += strip({ x: W * 0.46, y: D * 0.12, z: P + 0.5, w: 5, d: D * 0.76, cls: 'g-mat-path' });
  o += flat({ x: W * 0.12, y: D * 0.1, z: P + 0.8, w: W * 0.3, d: D * 0.26, cls: 'g-mat-water' });
  o += box({ x: W * 0.12, y: D * 0.1, z: P, w: W * 0.3, d: D * 0.26, h: 1.2, top: 'g-mat-water', side: 'g-mat-stone', side2: 'g-mat-stone' });
  o += tree({ x: W * 0.68, y: D * 0.24, z: P, s: 1.05 });
  o += tree({ x: W * 0.8, y: D * 0.64, z: P, s: 0.85 });
  o += tree({ x: W * 0.3, y: D * 0.78, z: P, s: 0.8 });
  o += tree({ x: W * 0.2, y: D * 0.56, z: P, s: 0.55 });
  // bench + fountain
  o += box({ x: W * 0.56, y: D * 0.44, z: P, w: 10, d: 2.4, h: 2.4, top: 'g-mat-wood', side: 'g-mat-wood', side2: 'g-mat-wood2' });
  o += box({ x: W * 0.56, y: D * 0.42, z: P + 2.4, w: 1.4, d: 5, h: 2, top: 'g-mat-wood', side: 'g-mat-wood', side2: 'g-mat-wood2' });
  o += box({ x: W * 0.66, y: D * 0.46, z: P, w: 5, d: 5, h: 3, top: 'g-mat-stone', side: 'g-mat-stone', side2: 'g-mat-stone2' });
  o += flat({ x: W * 0.66, y: D * 0.46, z: P + 3.2, w: 5, d: 5, cls: 'g-mat-water' });
  o += box({ x: W * 0.69, y: D * 0.49, z: P + 3, w: 1.2, d: 1.2, h: 6, top: 'g-mat-water', side: 'g-mat-water', side2: 'g-mat-water2' });
  return o;
}

function school(W, D, lv) {
  const h = heightOf('school', lv) * 0.5;
  let o = plinth(W, D, 'g-mat-grass2', 'g-mat-earth');
  o += box({ x: W * 0.06, y: D * 0.1, z: P, w: W * 0.88, d: D * 0.26, h, top: 'g-mat-roof3', side: 'g-mat-wall', side2: 'g-mat-wall2' });
  o += box({ x: W * 0.06, y: D * 0.3, z: P, w: W * 0.22, d: D * 0.36, h: h * 0.9, top: 'g-mat-roof3', side: 'g-mat-wall', side2: 'g-mat-wall2' });
  o += box({ x: W * 0.72, y: D * 0.3, z: P, w: W * 0.22, d: D * 0.36, h: h * 0.9, top: 'g-mat-roof3', side: 'g-mat-wall', side2: 'g-mat-wall2' });
  o += bands({ x: W * 0.1, y: D * 0.36, z: P + 4, w: W * 0.8, d: D * 0.24, h: h - 8, cols: 9, rows: 2 });
  // gym
  o += box({ x: W * 0.68, y: D * 0.7, z: P, w: W * 0.26, d: D * 0.22, h: h * 0.62, top: 'g-mat-roof3', side: 'g-mat-wall', side2: 'g-mat-wall2' });
  o += gableY({ x: W * 0.66, y: D * 0.68, z: P + h * 0.62, w: W * 0.3, d: D * 0.26, h: 6, over: 1 });
  // yard + flag
  {
    const cx0 = W * 0.08;
    const cy0 = D * 0.4;
    const cw = W * 0.6;
    const cd = D * 0.54;
    for (let ix = 0; ix < 2; ix++) {
      for (let iy = 0; iy < 2; iy++) {
        o += flat({ x: cx0 + (ix * cw) / 2, y: cy0 + (iy * cd) / 2, z: P + 0.4, w: cw / 2, d: cd / 2, cls: 'g-mat-court' });
      }
    }
  }
  o += box({ x: W * 0.64, y: D * 0.5, z: P, w: 1.2, d: 1.2, h: 20, top: 'g-mat-steel', side: 'g-mat-steel', side2: 'g-mat-steel2' });
  o += flat({ x: W * 0.645, y: D * 0.5, z: P + 18, w: 9, d: 5, cls: 'g-mat-flag' });
  o += sign({ x: W * 0.34, y: D * 0.36, z: P + h - 6, w: W * 0.28, h: 7, text: '학교', cls: 'g-sign g-sign--small', out: 0.8 });
  return o;
}

function hospital(W, D, lv) {
  const h = heightOf('hospital', lv) * 0.78;
  const bx = W * 0.2;
  const by = D * 0.16;
  const bw = W * 0.46;
  const bd = D * 0.5;
  let o = plinth(W, D, 'g-mat-path', 'g-mat-earth');
  o += box({ x: bx, y: by, z: P, w: bw, d: bd, h, top: 'g-mat-roof3', side: 'g-mat-wall', side2: 'g-mat-wall2' });
  o += bands({ x: bx + 1, y: by + bd, z: P + 5, w: bw - 2, d: bd, h: h - 9, cols: 5, rows: Math.max(3, Math.round(h / 12)) });
  // lower wing
  o += box({ x: W * 0.68, y: D * 0.24, z: P, w: W * 0.24, d: D * 0.56, h: h * 0.52, top: 'g-mat-roof3', side: 'g-mat-wall', side2: 'g-mat-wall2' });
  o += front({ x: W * 0.7, y: D * 0.8, z: P + 3, w: W * 0.2, h: h * 0.32, cls: 'g-mat-glassgrid' });
  // red cross on the roof
  o += box({ x: bx + bw * 0.38, y: by + bd * 0.32, z: P + h, w: bw * 0.24, d: bw * 0.08, h: 1.4, top: 'g-mat-red', side: 'g-mat-red', side2: 'g-mat-red2' });
  o += box({ x: bx + bw * 0.46, y: by + bd * 0.18, z: P + h, w: bw * 0.08, d: bd * 0.28, h: 1.4, top: 'g-mat-red', side: 'g-mat-red', side2: 'g-mat-red2' });
  // helipad on the wing
  o += flat({ x: W * 0.72, y: D * 0.34, z: P + h * 0.52 + 1, w: W * 0.16, d: W * 0.16, cls: 'g-mat-helipad', style: 'border-radius:50%' });
  // ambulance canopy
  o += box({ x: W * 0.4, y: by + bd, z: P + 8, w: bw * 0.5, d: 7, h: 2, top: 'g-mat-red', side: 'g-mat-red', side2: 'g-mat-red2' });
  o += sign({ x: bx + bw * 0.2, y: by + bd, z: P + h * 0.55, w: bw * 0.6, h: 8, text: '병원', cls: 'g-sign g-sign--small', out: 0.9 });
  return o;
}

function police(W, D, lv) {
  const h = heightOf('police', lv) * 0.55;
  let o = plinth(W, D, 'g-mat-path', 'g-mat-earth');
  o += box({ x: W * 0.1, y: D * 0.22, z: P, w: W * 0.8, d: D * 0.62, h, top: 'g-mat-roof3', side: 'g-mat-wall', side2: 'g-mat-wall2' });
  o += front({ x: W * 0.24, y: D * 0.84, z: P + 3, w: W * 0.3, h: h - 7, cls: 'g-mat-glassgrid' });
  o += box({ x: W * 0.2, y: D * 0.36, z: P + h, w: 8, d: 3, h: 2, top: 'g-mat-blue', side: 'g-mat-blue', side2: 'g-mat-blue2' });
  o += box({ x: W * 0.2, y: D * 0.36, z: P + h + 2, w: 2, d: 3, h: 2, top: 'g-mat-red', side: 'g-mat-red', side2: 'g-mat-red2' });
  o += sign({ x: W * 0.24, y: D * 0.84, z: P + h * 0.6, w: W * 0.52, h: 8, text: '파출소', cls: 'g-sign g-sign--police', out: 0.9 });
  o += strip({ x: W * 0.08, y: D * 0.88, z: 1.1, w: W * 0.5, d: D * 0.1, cls: 'g-mat-asphalt' });
  return o;
}

function fire(W, D, lv) {
  const h = heightOf('fire', lv) * 0.5;
  let o = plinth(W, D, 'g-mat-path', 'g-mat-earth');
  o += box({ x: W * 0.06, y: D * 0.26, z: P, w: W * 0.66, d: D * 0.58, h, top: 'g-mat-roof3', side: 'g-mat-brickwall', side2: 'g-mat-brickwall2' });
  o += front({ x: W * 0.12, y: D * 0.84, z: P, w: W * 0.2, h: h * 0.7, cls: 'g-mat-garage' });
  o += front({ x: W * 0.4, y: D * 0.84, z: P, w: W * 0.2, h: h * 0.7, cls: 'g-mat-garage' });
  // hose tower + light
  o += box({ x: W * 0.72, y: D * 0.34, z: P, w: W * 0.2, d: D * 0.24, h: heightOf('fire', lv) * 0.9, top: 'g-mat-roof3', side: 'g-mat-brickwall', side2: 'g-mat-brickwall2' });
  o += box({ x: W * 0.74, y: D * 0.4, z: P + heightOf('fire', lv) * 0.9, w: W * 0.16, d: D * 0.12, h: 2, top: 'g-mat-red', side: 'g-mat-red', side2: 'g-mat-red2' });
  o += sign({ x: W * 0.12, y: D * 0.84, z: P + h * 0.78, w: W * 0.52, h: 7, text: '소방서', cls: 'g-sign g-sign--fire', out: 0.8 });
  return o;
}

function power(W, D, lv) {
  const h = heightOf('power', lv) * 0.45;
  let o = plinth(W, D, 'g-mat-concrete2', 'g-mat-earth2');
  o += box({ x: W * 0.05, y: D * 0.3, z: P, w: W * 0.5, d: D * 0.46, h, top: 'g-mat-roof3', side: 'g-mat-corrugated', side2: 'g-mat-corrugated2' });
  // cooling towers
  for (let i = 0; i < 2; i++) {
    const cx = W * (0.58 + i * 0.2);
    const cy = D * 0.28;
    o += stack({ x: cx, y: cy, z: P, w: W * 0.18, d: D * 0.2, h: heightOf('power', lv) * 0.72, steps: 3, shrink: 0.86, cls: 'g-mat-concrete', cls2: 'g-mat-concrete2', top: 'g-mat-cooling' });
  }
  // chimney + stacks
  o += box({ x: W * 0.16, y: D * 0.36, z: P + h, w: 7, d: 7, h: heightOf('power', lv) * 0.72, top: 'g-mat-steel', side: 'g-mat-concrete', side2: 'g-mat-concrete2' });
  o += box({ x: W * 0.15, y: D * 0.35, z: P + h + heightOf('power', lv) * 0.7, w: 9, d: 9, h: 2, top: 'g-mat-steel', side: 'g-mat-steel2', side2: 'g-mat-steel2' });
  // transformer yard
  for (let i = 0; i < 3; i++) {
    o += box({ x: W * (0.1 + i * 0.16), y: D * 0.82, z: P, w: 9, d: 7, h: 5, top: 'g-mat-steel', side: 'g-mat-steel', side2: 'g-mat-steel2' });
  }
  o += sign({ x: W * 0.1, y: D * 0.78, z: P + h - 6, w: W * 0.24, h: 6, text: '전력', cls: 'g-sign g-sign--small', out: 0.8 });
  return o;
}

function water(W, D, lv) {
  const legH = heightOf('water', lv) * 0.52;
  const tankH = heightOf('water', lv) * 0.34;
  let o = plinth(W, D, 'g-mat-grass2', 'g-mat-earth');
  for (const [lx, ly] of [
    [W * 0.26, D * 0.26],
    [W * 0.66, D * 0.26],
    [W * 0.26, D * 0.66],
    [W * 0.66, D * 0.66],
  ]) {
    o += box({ x: lx, y: ly, z: P, w: 2.4, d: 2.4, h: legH, top: 'g-mat-steel', side: 'g-mat-steel', side2: 'g-mat-steel2' });
  }
  o += box({ x: W * 0.22, y: D * 0.22, z: P + legH, w: W * 0.56, d: D * 0.56, h: tankH, top: 'g-mat-watertop', side: 'g-mat-water', side2: 'g-mat-water2' });
  o += stack({ x: W * 0.24, y: D * 0.24, z: P + legH + tankH - 1, w: W * 0.52, d: D * 0.52, h: 10, steps: 2, shrink: 0.4, cls: 'g-mat-water', cls2: 'g-mat-water2', top: 'g-mat-watertop' });
  o += box({ x: W * 0.48, y: D * 0.48, z: P + legH - 2, w: 2, d: 2, h: 9, top: 'g-mat-pipe', side: 'g-mat-pipe', side2: 'g-mat-steel2' });
  o += sign({ x: W * 0.3, y: D * 0.78, z: P + 4, w: W * 0.4, h: 6, text: '급수', cls: 'g-sign g-sign--small', out: 0.8 });
  return o;
}

function bus(W, D, lv) {
  const h = heightOf('bus', lv) * 0.55;
  let o = plinth(W, D, 'g-mat-path', 'g-mat-earth', 0.6);
  o += strip({ x: W * 0.02, y: D * 0.62, z: 1.1, w: W * 0.96, d: D * 0.24, cls: 'g-mat-asphalt' });
  // shelter
  o += box({ x: W * 0.12, y: D * 0.2, z: P, w: W * 0.64, d: 2.4, h: 1.4, top: 'g-mat-wood', side: 'g-mat-wood2', side2: 'g-mat-wood2' });
  o += box({ x: W * 0.12, y: D * 0.2, z: P + h, w: W * 0.7, d: D * 0.36, h: 1.8, top: 'g-mat-roof', side: 'g-mat-roof', side2: 'g-mat-roof2' });
  o += front({ x: W * 0.15, y: D * 0.56, z: P + 3, w: W * 0.58, h: h - 5, cls: 'g-mat-glass' });
  o += box({ x: W * 0.74, y: D * 0.24, z: P, w: 1.6, d: 1.6, h: h + 18, top: 'g-mat-steel', side: 'g-mat-steel', side2: 'g-mat-steel2' });
  o += sign({ x: W * 0.8, y: D * 0.3, z: P + h + 10, w: W * 0.17, h: 7, text: 'BUS', cls: 'g-sign g-sign--bus', out: 0.5, style: '--fs:7px' });
  o += box({ x: W * 0.3, y: D * 0.28, z: P, w: W * 0.28, d: 2.4, h: 2.4, top: 'g-mat-wood', side: 'g-mat-wood', side2: 'g-mat-wood2' });
  return o;
}

function subway(W, D, lv) {
  const h = heightOf('subway', lv) * 0.38;
  let o = plinth(W, D, 'g-mat-path', 'g-mat-earth', 0.5);
  // stair mouth recessed into the ground
  o += flat({ x: W * 0.24, y: D * 0.36, z: 0.7, w: W * 0.36, d: D * 0.4, cls: 'g-mat-stair' });
  for (let i = 0; i < 4; i++) {
    o += box({ x: W * 0.26, y: D * 0.38 + i * 3, z: 1.2, w: W * 0.32, d: 3, h: 1.6 + i * 1.2, top: 'g-mat-stairstep', side: 'g-mat-concrete', side2: 'g-mat-concrete2' });
  }
  // side walls + glass balustrades
  o += box({ x: W * 0.2, y: D * 0.3, z: P, w: 2, d: D * 0.54, h: 6, top: 'g-mat-concrete', side: 'g-mat-concrete', side2: 'g-mat-concrete2' });
  o += box({ x: W * 0.64, y: D * 0.3, z: P, w: 2, d: D * 0.54, h: 6, top: 'g-mat-concrete', side: 'g-mat-concrete', side2: 'g-mat-concrete2' });
  o += front({ x: W * 0.2, y: D * 0.56, z: P + 2, w: W * 0.46, h: 5, cls: 'g-mat-glassrail' });
  // canopy + M pylon
  o += box({ x: W * 0.14, y: D * 0.28, z: P + 9, w: W * 0.58, d: D * 0.5, h: 2, top: 'g-mat-roof', side: 'g-mat-roof2', side2: 'g-mat-roof2' });
  const px = W * 0.78;
  o += box({ x: px, y: D * 0.38, z: P, w: W * 0.12, d: W * 0.12, h: h + 26, top: 'g-mat-mint', side: 'g-mat-mint', side2: 'g-mat-mint2' });
  o += sign({ x: px, y: D * 0.38 + W * 0.12, z: P + h + 12, w: W * 0.12, h: 12, text: 'M', cls: 'g-sign g-sign--metro', out: 0.5, style: '--fs:11px' });
  o += signSide({ x: px + W * 0.12, y: D * 0.38, z: P + h + 12, d: W * 0.12, h: 12, text: 'M', cls: 'g-sign g-sign--metro', out: 0.5, style: '--fs:11px' });
  return o;
}

function metro(W, D, lv) {
  const h = heightOf('metro', lv) * 0.4;
  let o = plinth(W, D, 'g-mat-path', 'g-mat-earth', 0.5);
  o += strip({ x: W * 0.02, y: D * 0.62, z: 1.2, w: W * 0.96, d: D * 0.2, cls: 'g-mat-asphalt' });
  for (let i = 0; i < 8; i++) o += flat({ x: W * (0.06 + i * 0.12), y: D * 0.66, z: 1.4, w: W * 0.05, d: 2, cls: 'g-mat-line' });
  // platform + canopy
  o += box({ x: W * 0.08, y: D * 0.22, z: P, w: W * 0.62, d: D * 0.38, h: 4, top: 'g-mat-concrete', side: 'g-mat-concrete', side2: 'g-mat-concrete2' });
  for (let i = 0; i < 3; i++) {
    for (const yy of [D * 0.28, D * 0.5]) {
      o += box({ x: W * (0.12 + i * 0.22), y: yy, z: P + 4, w: 2, d: 2, h: h, top: 'g-mat-steel', side: 'g-mat-steel', side2: 'g-mat-steel2' });
    }
  }
  o += box({ x: W * 0.06, y: D * 0.2, z: P + 4 + h, w: W * 0.7, d: D * 0.44, h: 2.2, top: 'g-mat-roof', side: 'g-mat-roof2', side2: 'g-mat-roof2' });
  o += box({ x: W * 0.1, y: D * 0.24, z: P + 4 + h + 2, w: W * 0.22, d: D * 0.12, h: 1, top: 'g-mat-glass', side: 'g-mat-glass', side2: 'g-mat-glass2' });
  // M pylon
  const px = W * 0.8;
  const py = D * 0.3;
  o += box({ x: px, y: py, z: P, w: W * 0.13, d: W * 0.13, h: heightOf('metro', lv) * 0.78, top: 'g-mat-mint', side: 'g-mat-mint', side2: 'g-mat-mint2' });
  o += sign({ x: px, y: py + W * 0.13, z: P + heightOf('metro', lv) * 0.54, w: W * 0.13, h: 15, text: 'M', cls: 'g-sign g-sign--metro', out: 0.6, style: '--fs:12px' });
  o += signSide({ x: px + W * 0.13, y: py, z: P + heightOf('metro', lv) * 0.54, d: W * 0.13, h: 15, text: 'M', cls: 'g-sign g-sign--metro', out: 0.6, style: '--fs:12px' });
  // benches
  for (let i = 0; i < 2; i++) o += box({ x: W * (0.2 + i * 0.24), y: D * 0.34, z: P + 4, w: 12, d: 3, h: 2.2, top: 'g-mat-wood', side: 'g-mat-wood', side2: 'g-mat-wood2' });
  return o;
}

function train(W, D, lv) {
  const h = heightOf('train', lv) * 0.42;
  let o = plinth(W, D, 'g-mat-concrete2', 'g-mat-earth', 0.5);
  // tracks
  o += strip({ x: W * 0.02, y: D * 0.52, z: 1.2, w: W * 0.96, d: D * 0.3, cls: 'g-mat-ballast' });
  o += strip({ x: W * 0.02, y: D * 0.56, z: 1.4, w: W * 0.96, d: 2, cls: 'g-mat-rail' });
  o += strip({ x: W * 0.02, y: D * 0.72, z: 1.4, w: W * 0.96, d: 2, cls: 'g-mat-rail' });
  // platforms
  o += box({ x: W * 0.04, y: D * 0.34, z: P, w: W * 0.9, d: D * 0.14, h: 7, top: 'g-mat-concrete', side: 'g-mat-concrete', side2: 'g-mat-concrete2' });
  o += box({ x: W * 0.04, y: D * 0.82, z: P, w: W * 0.9, d: D * 0.12, h: 7, top: 'g-mat-concrete', side: 'g-mat-concrete', side2: 'g-mat-concrete2' });
  // station hall
  o += box({ x: W * 0.06, y: D * 0.08, z: P, w: W * 0.4, d: D * 0.2, h: h, top: 'g-mat-roof3', side: 'g-mat-wall', side2: 'g-mat-wall2' });
  o += front({ x: W * 0.1, y: D * 0.28, z: P + 3, w: W * 0.32, h: h - 7, cls: 'g-mat-glassgrid' });
  // long platform roof
  for (let i = 0; i < 4; i++) o += box({ x: W * (0.1 + i * 0.2), y: D * 0.38, z: P + 7, w: 2, d: 2, h: h, top: 'g-mat-steel', side: 'g-mat-steel', side2: 'g-mat-steel2' });
  o += box({ x: W * 0.04, y: D * 0.3, z: P + 7 + h, w: W * 0.9, d: D * 0.38, h: 2.4, top: 'g-mat-roof', side: 'g-mat-roof2', side2: 'g-mat-roof2' });
  // a waiting train
  o += box({ x: W * 0.24, y: D * 0.58, z: 5, w: W * 0.62, d: D * 0.16, h: 10, top: 'g-mat-train', side: 'g-mat-train', side2: 'g-mat-train2' });
  o += front({ x: W * 0.27, y: D * 0.74, z: 8, w: W * 0.56, h: 5.4, cls: 'g-mat-trainwin' });
  o += strip({ x: W * 0.24, y: D * 0.58, z: 15, w: W * 0.62, d: D * 0.16, cls: 'g-mat-train2' });
  o += sign({ x: W * 0.1, y: D * 0.3, z: P + h - 7, w: W * 0.26, h: 7, text: 'KTX', cls: 'g-sign g-sign--ktx', out: 0.8 });
  return o;
}

function ferry(W, D, lv) {
  const h = heightOf('ferry', lv) * 0.4;
  let o = flat({ x: 0, y: 0, z: 0.8, w: W, d: D, cls: 'g-mat-water' });
  // pier
  o += box({ x: W * 0.08, y: D * 0.32, z: P, w: W * 0.46, d: D * 0.36, h: 3, top: 'g-mat-wood', side: 'g-mat-wood', side2: 'g-mat-wood2' });
  o += box({ x: W * 0.14, y: D * 0.22, z: P + 3, w: W * 0.3, d: D * 0.2, h, top: 'g-mat-roof3', side: 'g-mat-wall', side2: 'g-mat-wall2' });
  o += front({ x: W * 0.18, y: D * 0.42, z: P + 4, w: W * 0.2, h: h - 4, cls: 'g-mat-glass' });
  // boat
  o += box({ x: W * 0.56, y: D * 0.42, z: 1, w: W * 0.34, d: D * 0.22, h: 6, top: 'g-mat-white', side: 'g-mat-white', side2: 'g-mat-white2' });
  o += strip({ x: W * 0.56, y: D * 0.42, z: 7, w: W * 0.34, d: D * 0.22, cls: 'g-mat-blue' });
  o += box({ x: W * 0.6, y: D * 0.46, z: 8, w: W * 0.2, d: D * 0.14, h: 7, top: 'g-mat-white', side: 'g-mat-white', side2: 'g-mat-white2' });
  o += box({ x: W * 0.64, y: D * 0.48, z: 15, w: 3, d: 3, h: 8, top: 'g-mat-steel', side: 'g-mat-steel', side2: 'g-mat-steel2' });
  o += box({ x: W * 0.84, y: D * 0.36, z: 2, w: 1.2, d: 1.2, h: 18, top: 'g-mat-steel', side: 'g-mat-steel', side2: 'g-mat-steel2' });
  o += flat({ x: W * 0.835, y: D * 0.36, z: 19, w: 7, d: 4, cls: 'g-mat-flag' });
  return o;
}

function airport(W, D, lv) {
  const h = heightOf('airport', lv) * 0.3;
  let o = flat({ x: 0, y: 0, z: 0.8, w: W, d: D, cls: 'g-mat-asphalt' });
  // runway + dashes
  o += strip({ x: W * 0.02, y: D * 0.6, z: 1.1, w: W * 0.96, d: D * 0.2, cls: 'g-mat-runway' });
  for (let i = 0; i < 9; i++) o += flat({ x: W * (0.05 + i * 0.106), y: D * 0.695, z: 1.3, w: W * 0.05, d: 2.4, cls: 'g-mat-runwayline' });
  // terminal
  o += box({ x: W * 0.08, y: D * 0.12, z: P, w: W * 0.52, d: D * 0.24, h, top: 'g-mat-roof3', side: 'g-mat-wall', side2: 'g-mat-wall2' });
  o += front({ x: W * 0.1, y: D * 0.36, z: P + 3, w: W * 0.48, h: h - 6, cls: 'g-mat-glassgrid' });
  o += box({ x: W * 0.18, y: D * 0.34, z: P + h, w: W * 0.24, d: D * 0.06, h: 2, top: 'g-mat-coral', side: 'g-mat-coral', side2: 'g-mat-coral2' });
  // control tower
  const tx = W * 0.7;
  const ty = D * 0.16;
  o += box({ x: tx, y: ty, z: P, w: W * 0.09, d: W * 0.09, h: heightOf('airport', lv) * 0.58, top: 'g-mat-white', side: 'g-mat-white', side2: 'g-mat-white2' });
  o += box({ x: tx - 3, y: ty - 1.5, z: P + heightOf('airport', lv) * 0.58, w: W * 0.09 + 6, d: W * 0.09 + 3, h: 9, top: 'g-mat-glass', side: 'g-mat-glass', side2: 'g-mat-glass2' });
  o += box({ x: tx + 1, y: ty + 2, z: P + heightOf('airport', lv) * 0.58 + 9, w: 1.4, d: 1.4, h: 12, top: 'g-mat-steel', side: 'g-mat-steel', side2: 'g-mat-steel2' });
  // hangar
  o += box({ x: W * 0.08, y: D * 0.72, z: P, w: W * 0.2, d: D * 0.18, h: h * 0.7, top: 'g-mat-roof3', side: 'g-mat-corrugated', side2: 'g-mat-corrugated2' });
  o += gableY({ x: W * 0.06, y: D * 0.7, z: P + h * 0.7, w: W * 0.24, d: D * 0.22, h: 8, over: 1 });
  // plane on the runway
  const px = W * 0.42;
  const py = D * 0.62;
  o += box({ x: px, y: py, z: 3, w: W * 0.32, d: 6.4, h: 5, top: 'g-mat-plane', side: 'g-mat-plane', side2: 'g-mat-plane2' });
  o += box({ x: px + W * 0.33, y: py + 1, z: 4, w: 5, d: 4, h: 3, top: 'g-mat-plane2', side: 'g-mat-plane2', side2: 'g-mat-plane2' });
  // wings across the fuselage
  o += flat({ x: px + W * 0.07, y: py - D * 0.13, z: 7.2, w: W * 0.16, d: D * 0.28, cls: 'g-mat-plane2' });
  o += flat({ x: px + W * 0.24, y: py - D * 0.04, z: 6.4, w: W * 0.08, d: D * 0.13, cls: 'g-mat-plane2' });
  // tail fin
  o += box({ x: px + W * 0.27, y: py + 1.2, z: 7.4, w: 2.4, d: 4, h: 11, top: 'g-mat-plane', side: 'g-mat-plane', side2: 'g-mat-plane2' });
  // jet bridge + apron line to the terminal
  o += box({ x: px + W * 0.02, y: D * 0.37, z: 4, w: W * 0.05, d: D * 0.26, h: 3.4, top: 'g-mat-white', side: 'g-mat-white', side2: 'g-mat-white2' });
  o += strip({ x: W * 0.2, y: D * 0.54, z: 1.4, w: W * 0.6, d: 1.4, cls: 'g-mat-line' });
  // windsock
  o += box({ x: W * 0.84, y: D * 0.2, z: P, w: 1.2, d: 1.2, h: 16, top: 'g-mat-steel', side: 'g-mat-steel', side2: 'g-mat-steel2' });
  o += flat({ x: W * 0.84, y: D * 0.2, z: P + 16, w: 8, d: 3, cls: 'g-mat-coral' });
  // apron lights
  for (let i = 0; i < 4; i++) o += box({ x: W * (0.12 + i * 0.22), y: D * 0.58, z: 1.1, w: 1, d: 1, h: 1.6, top: 'g-mat-amber', side: 'g-mat-amber', side2: 'g-mat-amber2' });
  o += sign({ x: W * 0.12, y: D * 0.36, z: P + h - 7, w: W * 0.16, h: 6, text: '공항', cls: 'g-sign g-sign--small', out: 0.9 });
  return o;
}

function palace(W, D, lv) {
  const h = heightOf('palace', lv) * 0.48;
  let o = plinth(W, D, 'g-mat-stone', 'g-mat-stone2', 0.6);
  // courtyard
  o += flat({ x: W * 0.06, y: D * 0.55, z: P + 0.3, w: W * 0.88, d: D * 0.4, cls: 'g-mat-courtstone' });
  // stone terrace
  o += box({ x: W * 0.16, y: D * 0.12, z: P, w: W * 0.68, d: D * 0.46, h: 6, top: 'g-mat-stone', side: 'g-mat-stone', side2: 'g-mat-stone2' });
  // columns + hall
  for (let i = 0; i < 5; i++) {
    o += box({ x: W * (0.2 + i * 0.13), y: D * 0.46, z: P + 6, w: 3, d: 3, h: h * 0.46, top: 'g-mat-red2', side: 'g-mat-red2', side2: 'g-mat-red' });
    o += box({ x: W * (0.2 + i * 0.13), y: D * 0.2, z: P + 6, w: 3, d: 3, h: h * 0.46, top: 'g-mat-red2', side: 'g-mat-red2', side2: 'g-mat-red' });
  }
  o += front({ x: W * 0.2, y: D * 0.5, z: P + 8, w: W * 0.6, h: h * 0.34, cls: 'g-mat-palace' });
  o += box({ x: W * 0.18, y: D * 0.18, z: P + 6, w: W * 0.64, d: D * 0.34, h: h * 0.4, top: 'g-mat-roof3', side: 'g-mat-palace', side2: 'g-mat-palace2' });
  // two tier tiled roof
  o += flat({ x: W * 0.1, y: D * 0.12, z: P + 6 + h * 0.4, w: W * 0.8, d: D * 0.48, cls: 'g-mat-tile' });
  o += gable({ x: W * 0.14, y: D * 0.14, z: P + 7 + h * 0.4, w: W * 0.72, d: D * 0.42, h: h * 0.22, over: 3, cls: 'g-mat-tile', cls2: 'g-mat-tile2', ends: 'g-mat-palace' });
  o += flat({ x: W * 0.26, y: D * 0.24, z: P + 7 + h * 0.62, w: W * 0.48, d: D * 0.26, cls: 'g-mat-tile2' });
  o += gable({ x: W * 0.3, y: D * 0.26, z: P + 8 + h * 0.62, w: W * 0.4, d: D * 0.22, h: h * 0.2, over: 2, cls: 'g-mat-tile', cls2: 'g-mat-tile2', ends: 'g-mat-palace' });
  // side halls + trees + gate
  o += box({ x: W * 0.04, y: D * 0.2, z: P, w: W * 0.1, d: D * 0.28, h: h * 0.28, top: 'g-mat-tile', side: 'g-mat-palace', side2: 'g-mat-palace2' });
  o += box({ x: W * 0.86, y: D * 0.2, z: P, w: W * 0.1, d: D * 0.28, h: h * 0.28, top: 'g-mat-tile', side: 'g-mat-palace', side2: 'g-mat-palace2' });
  o += tree({ x: W * 0.12, y: D * 0.78, z: P, s: 0.7 });
  o += tree({ x: W * 0.88, y: D * 0.8, z: P, s: 0.66 });
  o += box({ x: W * 0.42, y: D * 0.88, z: P, w: W * 0.16, d: 4, h: 9, top: 'g-mat-tile', side: 'g-mat-red2', side2: 'g-mat-red' });
  return o;
}

function stadium(W, D, lv) {
  const h = heightOf('stadium', lv) * 0.32;
  const cx = W / 2;
  const cy = D / 2;
  let o = plinth(W, D, 'g-mat-grass2', 'g-mat-earth', 0.5);
  // solid plinth + pitch
  o += flat({ x: W * 0.08, y: D * 0.1, z: P + 0.3, w: W * 0.84, d: D * 0.8, cls: 'g-mat-stadiumbase', style: 'border-radius:50%' });
  o += flat({ x: W * 0.2, y: D * 0.24, z: P + 0.8, w: W * 0.6, d: D * 0.52, cls: 'g-mat-pitch' });
  o += flat({ x: W * 0.34, y: D * 0.34, z: P + 1, w: W * 0.32, d: D * 0.32, cls: 'g-mat-pitch2' });
  const segs = 18;
  const rx = W * 0.46;
  const ry = D * 0.44;
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const b = ((i + 1) / segs) * Math.PI * 2;
    const p1 = [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
    const p2 = [cx + Math.cos(b) * rx, cy + Math.sin(b) * ry];
    const segLen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * 1.01;
    const tx = (p2[0] - p1[0]) / Math.max(1, segLen);
    const ty = (p2[1] - p1[1]) / Math.max(1, segLen);
    const mid = (a + b) / 2;
    // outer concrete wall closes the bowl
    o += face({
      w: segLen,
      h,
      o: [p1[0], p1[1], P + 1],
      u: [tx * segLen, ty * segLen, 0],
      v: [Math.cos(mid) * 2, Math.sin(mid) * 2, h],
      cls: 'g-mat-standwall',
    });
    // sloped seating deck
    o += face({
      w: segLen,
      h: Math.hypot(8, h),
      o: [p1[0] - Math.cos(mid) * 5, p1[1] - Math.sin(mid) * 5, P + 2],
      u: [tx * segLen, ty * segLen, 0],
      v: [Math.cos(mid) * 7, Math.sin(mid) * 7, h],
      cls: 'g-mat-stand',
    });
  }
  // floodlights
  for (const [fx, fy] of [
    [W * 0.08, D * 0.14],
    [W * 0.92, D * 0.14],
    [W * 0.08, D * 0.86],
    [W * 0.92, D * 0.86],
  ]) {
    o += box({ x: fx - 1.5, y: fy - 1.5, z: P, w: 3, d: 3, h: heightOf('stadium', lv) * 0.9, top: 'g-mat-steel', side: 'g-mat-steel', side2: 'g-mat-steel2' });
    o += box({ x: fx - 5, y: fy - 5, z: P + heightOf('stadium', lv) * 0.9, w: 10, d: 10, h: 3, top: 'g-mat-light', side: 'g-mat-light', side2: 'g-mat-steel2' });
  }
  o += sign({ x: W * 0.36, y: D * 0.86, z: P + h + 2, w: W * 0.28, h: 6, text: '경기장', cls: 'g-sign g-sign--small', out: 0.6 });
  return o;
}

function tower(W, D, lv) {
  const H = heightOf('tower', lv);
  const cx = W / 2;
  const cy = D / 2;
  let o = plinth(W, D, 'g-mat-grass2', 'g-mat-earth', 0.5);
  // wooded hill base
  o += stack({ x: W * 0.12, y: D * 0.16, z: P, w: W * 0.76, d: D * 0.68, h: H * 0.18, steps: 3, shrink: 0.72, cls: 'g-mat-grass', cls2: 'g-mat-grass2', top: 'g-mat-grass2' });
  let z = P + H * 0.18;
  // lower shaft
  const sw = W * 0.28;
  const sd = D * 0.28;
  o += box({ x: cx - sw / 2, y: cy - sd / 2, z, w: sw, d: sd, h: H * 0.34, top: 'g-mat-white', side: 'g-mat-white', side2: 'g-mat-white2' });
  o += bands({ x: cx - sw / 2, y: cy + sd / 2, z: z + 3, w: sw, d: sd, h: H * 0.32 - 5, cols: 3, rows: 9 });
  z += H * 0.34;
  // observation deck — wider than the shaft, no floating gaps
  o += box({ x: cx - W * 0.21, y: cy - D * 0.2, z, w: W * 0.42, d: D * 0.4, h: H * 0.08, top: 'g-mat-white', side: 'g-mat-glassgrid', side2: 'g-mat-glass' });
  o += sign({ x: cx - W * 0.09, y: cy + D * 0.2, z: z + 1, w: W * 0.18, h: 6, text: 'N SEOUL', cls: 'g-sign g-sign--tower', out: 0.8, style: '--fs:5px' });
  z += H * 0.08;
  // upper shaft + neck
  o += box({ x: cx - W * 0.12, y: cy - D * 0.1, z, w: W * 0.24, d: D * 0.2, h: H * 0.12, top: 'g-mat-white', side: 'g-mat-glassgrid', side2: 'g-mat-glass' });
  z += H * 0.12;
  o += box({ x: cx - W * 0.06, y: cy - D * 0.05, z, w: W * 0.12, d: D * 0.1, h: H * 0.08, top: 'g-mat-white', side: 'g-mat-white', side2: 'g-mat-white2' });
  z += H * 0.08;
  // spire + red aircraft light
  o += box({ x: cx - 1.4, y: cy - 1.4, z, w: 2.8, d: 2.8, h: H * 0.13, top: 'g-mat-white', side: 'g-mat-white', side2: 'g-mat-white2' });
  z += H * 0.13;
  o += box({ x: cx - 0.7, y: cy - 0.7, z, w: 1.4, d: 1.4, h: H * 0.07, top: 'g-mat-red', side: 'g-mat-red', side2: 'g-mat-red2' });
  return o;
}

function lotte(W, D, lv) {
  const H = heightOf('lotte', lv);
  const cx = W / 2;
  const cy = D / 2;
  let o = plinth(W, D, 'g-mat-path', 'g-mat-earth', 0.5);
  // podium
  o += box({ x: W * 0.08, y: D * 0.14, z: P, w: W * 0.84, d: D * 0.72, h: H * 0.1, top: 'g-mat-roof3', side: 'g-mat-glass', side2: 'g-mat-glass2' });
  // stacked setbacks
  const steps = [
    [0.56, 0.56, 0.18],
    [0.5, 0.5, 0.16],
    [0.44, 0.44, 0.14],
    [0.38, 0.38, 0.12],
    [0.32, 0.32, 0.11],
    [0.26, 0.26, 0.1],
  ];
  let z = P + H * 0.1;
  steps.forEach(([sw, sd, sh], i) => {
    o += box({ x: cx - (W * sw) / 2, y: cy - (D * sd) / 2, z, w: W * sw, d: D * sd, h: H * sh, top: 'g-mat-roof3', side: 'g-mat-glassgrid', side2: 'g-mat-glass' });
    z += H * sh;
    if (i < 3) o += box({ x: cx - (W * sw) / 2 - 1, y: cy - (D * sd) / 2 - 1, z: z - 1.5, w: W * sw + 2, d: D * sd + 2, h: 3, top: 'g-mat-white', side: 'g-mat-white', side2: 'g-mat-white2' });
  });
  // crown + spire
  o += box({ x: cx - W * 0.08, y: cy - D * 0.08, z, w: W * 0.16, d: D * 0.16, h: H * 0.08, top: 'g-mat-gold', side: 'g-mat-gold', side2: 'g-mat-gold2' });
  o += box({ x: cx - 1.4, y: cy - 1.4, z: z + H * 0.08, w: 2.8, d: 2.8, h: H * 0.12, top: 'g-mat-white', side: 'g-mat-white', side2: 'g-mat-white2' });
  o += box({ x: cx - 0.6, y: cy - 0.6, z: z + H * 0.2, w: 1.2, d: 1.2, h: H * 0.09, top: 'g-mat-red', side: 'g-mat-red', side2: 'g-mat-red2' });
  o += sign({ x: cx - W * 0.1, y: cy + D * 0.14, z: P + H * 0.14, w: W * 0.2, h: 7, text: 'LOTTE', cls: 'g-sign g-sign--lotte', out: 0.7, style: '--fs:6px' });
  return o;
}

function bridge(W, D, lv) {
  const H = heightOf('bridge', lv);
  const deckZ = H * 0.42;
  let o = flat({ x: 0, y: 0, z: 0.8, w: W, d: D, cls: 'g-mat-water' });
  o += flat({ x: W * 0.02, y: D * 0.05, z: 1, w: W * 0.96, d: D * 0.9, cls: 'g-mat-water2', style: 'opacity:.45' });
  // Piers under a proper road deck.
  for (let i = 0; i < 3; i++) {
    o += box({ x: W * (0.2 + i * 0.3) - 2, y: D * 0.3, z: 0, w: 4.5, d: D * 0.4, h: deckZ, top: 'g-mat-concrete', side: 'g-mat-concrete', side2: 'g-mat-concrete2' });
  }
  o += box({ x: W * 0.01, y: D * 0.26, z: deckZ, w: W * 0.98, d: D * 0.48, h: 5, top: 'g-mat-road', side: 'g-mat-concrete', side2: 'g-mat-concrete2' });
  // white side beams + coral railings
  o += box({ x: W * 0.01, y: D * 0.24, z: deckZ + 4.6, w: W * 0.98, d: 2, h: 3.6, top: 'g-mat-white', side: 'g-mat-white', side2: 'g-mat-white2' });
  o += box({ x: W * 0.01, y: D * 0.72, z: deckZ + 4.6, w: W * 0.98, d: 2, h: 3.6, top: 'g-mat-white', side: 'g-mat-white', side2: 'g-mat-white2' });
  o += box({ x: W * 0.01, y: D * 0.22, z: deckZ + 8, w: W * 0.98, d: 1.4, h: 2.2, top: 'g-mat-coral', side: 'g-mat-coral', side2: 'g-mat-coral2' });
  o += box({ x: W * 0.01, y: D * 0.74, z: deckZ + 8, w: W * 0.98, d: 1.4, h: 2.2, top: 'g-mat-coral', side: 'g-mat-coral', side2: 'g-mat-coral2' });
  o += strip({ x: W * 0.02, y: D * 0.46, z: deckZ + 5.2, w: W * 0.96, d: 2, cls: 'g-mat-line' });
  // two towers, cables and a lit deck
  for (let i = 0; i < 2; i++) {
    const px = W * (0.3 + i * 0.4);
    o += box({ x: px - 2.4, y: D * 0.16, z: 0, w: 4.8, d: D * 0.68, h: H * 0.92, top: 'g-mat-white', side: 'g-mat-white', side2: 'g-mat-white2' });
    o += box({ x: px - 3.4, y: D * 0.12, z: H * 0.92, w: 6.8, d: D * 0.76, h: 3.2, top: 'g-mat-coral', side: 'g-mat-coral', side2: 'g-mat-coral2' });
    for (let c = 0; c < 3; c++) {
      const off = (c - 1) * 5;
      o += face({
        w: Math.hypot(W * 0.14, H * 0.3),
        h: 1.5,
        o: [px, D * 0.5 + off, H * 0.9],
        u: [W * 0.11, 0, -H * 0.28],
        v: [1.5, 0, 0],
        cls: 'g-mat-cable',
      });
      o += face({
        w: Math.hypot(W * 0.14, H * 0.3),
        h: 1.5,
        o: [px, D * 0.5 + off, H * 0.9],
        u: [-W * 0.11, 0, -H * 0.28],
        v: [1.5, 0, 0],
        cls: 'g-mat-cable',
      });
    }
  }
  // a boat crossing under the span
  o += box({ x: W * 0.58, y: D * 0.1, z: 1, w: 11, d: 5, h: 3.2, top: 'g-mat-white', side: 'g-mat-white', side2: 'g-mat-white2' });
  o += box({ x: W * 0.6, y: D * 0.11, z: 4.2, w: 6, d: 3.4, h: 3, top: 'g-mat-blue', side: 'g-mat-blue', side2: 'g-mat-blue2' });
  return o;
}

function generic(W, D, lv) {
  const h = heightOf('office', lv) * 0.6;
  return (
    plinth(W, D) +
    box({ x: W * 0.15, y: D * 0.15, z: P, w: W * 0.7, d: D * 0.7, h, top: 'g-mat-roof3', side: 'g-mat-wall', side2: 'g-mat-wall2' }) +
    bands({ x: W * 0.16, y: D * 0.85, z: P + 5, w: W * 0.68, d: D * 0.7, h: h - 9, cols: 4, rows: 3 })
  );
}

const MODELS = {
  hanok,
  villa,
  apartment,
  officetel,
  cafe,
  shop,
  mall,
  office,
  brickworks,
  sawmill,
  glassworks,
  steelworks,
  factory,
  park,
  school,
  hospital,
  police,
  fire,
  power,
  water,
  bus,
  subway,
  metro,
  train,
  ferry,
  airport,
  palace,
  stadium,
  tower,
  lotte,
  bridge,
};

/** Build the interior of a building footprint (no wrapper, no shadow). */
export function modelHTML(type, { w = 1, h = 1, level = 1, era = 1 } = {}) {
  const W = Math.max(1, Number(w) || 1) * TILE;
  const D = Math.max(1, Number(h) || 1) * TILE;
  const lv = Math.max(1, Math.min(10, Number(level) || 1));
  const fn = MODELS[type] || generic;
  const body = fn(W, D, lv, era);
  // A low kerb ties every model to its plot.
  const kerb = box({ x: 0, y: 0, z: 0, w: W, d: D, h: 0.8, top: 'g-mat-kerb', side: 'g-mat-kerb', side2: 'g-mat-kerb2' });
  return kerb + body;
}

export { TILE };
