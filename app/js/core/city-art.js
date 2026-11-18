// Seoul Works — inline SVG building art.
// Every silhouette is drawn inside the footprint's own viewBox (w×100 by h×100),
// so a 3×3 airport and a 1×1 hanok share the same code path. Flat token colours,
// no gradients, no external assets — readable from 28px to 120px.

import { CATALOG } from './city-data.js';

const BASE = {
  ink: '#2A2450',
  ink2: '#4A4270',
  wall: '#FFF6EA',
  wall2: '#F3E5D3',
  shade: '#E7D7C2',
  roof: '#C95B3E',
  roof2: '#9C3B24',
  glass: '#BFE3F2',
  glass2: '#8FC9DF',
  steel: '#B9C0CE',
  steel2: '#8B94A6',
  green: '#4FAE86',
  green2: '#2E7D63',
  leaf: '#5FBF95',
  water: '#8FD3E8',
  water2: '#6BBBD6',
  wood: '#C08A5B',
  amber: '#FFD166',
  coral: '#FF6B4A',
  ground: '#EFE3D2',
  groundLine: '#DECDB7',
  apron: '#E4E0D5',
};

/* Era only tints — the silhouettes stay identical, so a save from era 1 keeps
   rendering after prestige and the whole skyline shifts palette together. */
const ERA = {
  1: { roof: '#C95B3E', roof2: '#9C3B24', glass: '#BFE3F2', glass2: '#8FC9DF', accent: '#FF6B4A', ground: '#F0E2CE', groundLine: '#DDC7AC' },
  2: { roof: '#8C6A4F', roof2: '#6E5039', glass: '#A8DCE0', glass2: '#7FC6CC', accent: '#2E9E82', ground: '#EAF0E0', groundLine: '#D3DDC6' },
  3: { roof: '#5C6478', roof2: '#444B5C', glass: '#A9CBE8', glass2: '#7FAFD4', accent: '#4A3FA8', ground: '#E8E6F2', groundLine: '#D5D2E4' },
  4: { roof: '#6E7686', roof2: '#4E5563', glass: '#CFE9FF', glass2: '#9BCFF0', accent: '#D99A2B', ground: '#F2EBDD', groundLine: '#E0D4BF' },
};

function pal(era) {
  const k = Math.max(1, Math.min(4, Math.round(Number(era) || 1)));
  return { ...BASE, ...ERA[k] };
}

const n = (v) => Math.round(Number(v) * 10) / 10;
const r = (x, y, w, h, fill, rx = 0, extra = '') =>
  `<rect x="${n(x)}" y="${n(y)}" width="${n(Math.max(0, w))}" height="${n(Math.max(0, h))}" rx="${n(rx)}" fill="${fill}"${extra ? ' ' + extra : ''}/>`;
const c = (cx, cy, rad, fill, extra = '') =>
  `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(Math.max(0, rad))}" fill="${fill}"${extra ? ' ' + extra : ''}/>`;
const e = (cx, cy, rx, ry, fill, extra = '') =>
  `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}"${extra ? ' ' + extra : ''}/>`;
const path = (d, fill, extra = '') => `<path d="${d}" fill="${fill}"${extra ? ' ' + extra : ''}/>`;

function metrics(W, H) {
  const gh = Math.min(12, H * 0.09);
  const base = H - gh;
  const bh = H - gh - 5;
  const bw = Math.min(W * 0.84, bh * 2.2);
  return { W, H, cx: W / 2, base, bh, bw, gh };
}

function ground(m, p, fill) {
  return (
    r(0, m.base, m.W, m.gh, fill || p.ground) +
    r(0, m.base, m.W, 1.4, p.groundLine, 0, 'opacity=".8"')
  );
}
function shadow(m, p, rx, x) {
  return e(x == null ? m.cx : x, m.base + 1, rx, Math.min(5, m.H * 0.04), '#1E1B3A', 'opacity=".09"');
}

/** A grid of windows. Cells stay chunky so they survive a 28px render. */
function win(x, y, w, h, cols, rows, fill, pad = 2.4, extra = '') {
  if (w <= 0 || h <= 0) return '';
  const cw = (w - pad * (cols + 1)) / cols;
  const ch = (h - pad * (rows + 1)) / rows;
  if (cw <= 0.5 || ch <= 0.5) return '';
  let out = '';
  for (let yy = 0; yy < rows; yy++) {
    for (let xx = 0; xx < cols; xx++) {
      out += r(x + pad + xx * (cw + pad), y + pad + yy * (ch + pad), cw, ch, fill, Math.min(1.2, cw / 4), extra);
    }
  }
  return out;
}

function smoke(x, y, p, count = 3, scale = 1) {
  let out = '<g class="ca-smoke">';
  for (let i = 0; i < count; i++) {
    out += c(x + i * 3.2 * scale, y - i * 3.4 * scale, (2.1 + i * 1.1) * scale, '#FFFFFF', `opacity=".55" style="--i:${i}"`);
  }
  return out + '</g>';
}

function gable(x, y, w, h, fill, roofFill) {
  const peak = x + w / 2;
  return (
    r(x, y, w, h, fill) +
    path(`M${x - 3} ${y + 1} L${peak} ${y - h * 0.5} L${x + w + 3} ${y + 1} Z`, roofFill)
  );
}

function awning(x, y, w, p, h = 6) {
  let out = '';
  const stripes = 6;
  const sw = w / stripes;
  for (let i = 0; i < stripes; i++) {
    out += r(x + i * sw, y, sw, h, i % 2 ? p.wall : p.coral);
  }
  out += path(`M${x} ${y + h} L${x + w} ${y + h} L${x + w - 2} ${y + h + 2.5} L${x + 2} ${y + h + 2.5} Z`, p.coral);
  return out;
}

/* ---------- residential ---------- */

function hanok(m, p, lv) {
  const wallW = m.bw * 0.64;
  const wallH = Math.min(m.bw * 0.5 + lv, m.H * 0.42);
  const y = m.base - wallH;
  const roofH = Math.min(m.bw * 0.36, m.H * 0.3);
  const l = m.cx - m.bw * 0.58;
  const rr = m.cx + m.bw * 0.58;
  return (
    ground(m, p) +
    shadow(m, p, m.bw * 0.42) +
    r(m.cx - wallW / 2, y, wallW, wallH, p.wall, 1) +
    r(m.cx - wallW / 2, y, wallW, 1.2, p.shade) +
    win(m.cx - wallW / 2 + 3, y + 4, wallW * 0.34, wallH * 0.4, 1, 1, p.glass) +
    win(m.cx + wallW / 2 - wallW * 0.34 - 3, y + 4, wallW * 0.34, wallH * 0.4, 1, 1, p.glass) +
    r(m.cx - 4.5, m.base - Math.min(15, wallH * 0.55), 9, Math.min(15, wallH * 0.55), p.wood, 1) +
    path(
      `M${l} ${y + 2} Q${m.cx - m.bw * 0.34} ${y - roofH * 0.22} ${m.cx - m.bw * 0.22} ${y - roofH} L${m.cx + m.bw * 0.22} ${y - roofH} Q${m.cx + m.bw * 0.34} ${y - roofH * 0.22} ${rr} ${y + 2} Z`,
      p.roof,
      `stroke="${p.roof2}" stroke-width="1.1"`
    ) +
    path(
      `M${l + 2} ${y + 1.4} Q${m.cx} ${y - roofH * 0.34} ${rr - 2} ${y + 1.4}`,
      'none',
      `stroke="${p.roof2}" stroke-width="1.4" opacity=".45"`
    )
  );
}

function villa(m, p, lv) {
  const h1 = Math.min(m.bh * 0.58 + lv * 1.2, m.H * 0.56);
  const w1 = m.bw * 0.56;
  const x1 = m.cx - m.bw * 0.5;
  const y1 = m.base - h1;
  const w2 = m.bw * 0.32;
  const h2 = h1 * 0.5;
  const x2 = x1 + w1 + 3;
  return (
    ground(m, p) +
    shadow(m, p, m.bw * 0.46) +
    gable(x1, y1, w1, h1, p.wall, p.roof) +
    win(x1 + 5, y1 + 7, w1 * 0.44, h1 * 0.34, 2, 1, p.glass) +
    r(x1 + w1 * 0.68, m.base - h1 * 0.34, w1 * 0.18, h1 * 0.34, p.wood, 1) +
    r(x1 + w1 * 0.9, y1 + 3, 2, h1 * 0.2, p.roof2) +
    r(x2, m.base - h2, w2, h2, p.wall2, 1) +
    r(x2 - 2, m.base - h2 - 3, w2 + 4, 3.4, p.roof2, 1) +
    r(x2 + 3, m.base - h2 + 3, w2 - 6, h2 * 0.5, p.glass, 1) +
    c(m.cx + m.bw * 0.4, m.base - m.bh * 0.4, m.bw * 0.09, p.leaf) +
    r(m.cx + m.bw * 0.4 - 1.2, m.base - m.bh * 0.4, 2.4, m.bh * 0.4, p.wood)
  );
}

function officetel(m, p, lv) {
  const w = Math.min(m.bw * 0.44, m.H * 0.4);
  const h = Math.min(m.bh * 0.8 + lv * 2.4, m.H * 0.8);
  const x = m.cx - w / 2;
  const y = m.base - h;
  const rows = Math.min(6, 2 + Math.floor(lv / 1.6));
  return (
    ground(m, p) +
    shadow(m, p, w * 0.62) +
    r(x, y, w, h, p.wall2, 2) +
    r(x, y, w, 3, p.roof2, 1) +
    win(x + 2, y + 6, w - 4, h * 0.66, 3, rows, p.glass, 2) +
    r(x + w * 0.22, m.base - h * 0.13, w * 0.56, h * 0.13, p.ink2, 1, 'opacity=".85"') +
    r(x + w * 0.3, y - 6, w * 0.4, 6, p.accent, 1) +
    r(x + w * 0.46, y - 12, 2, 6, p.steel2)
  );
}

function apartment(m, p, lv) {
  const w = m.bw * 0.82;
  const h = Math.min(m.bh * 0.66 + lv * 2, m.H * 0.62);
  const x = m.cx - w / 2;
  const y = m.base - h;
  const rows = Math.min(5, 2 + Math.floor(lv / 1.8));
  return (
    ground(m, p) +
    shadow(m, p, w * 0.5) +
    r(x, y, w, h, p.wall, 2) +
    r(x, y, w, 4, p.roof2, 1) +
    r(x - 2, y + 4, w + 4, 1.6, p.shade) +
    win(x + 3, y + 8, w - 6, h - 16, 4, rows, p.glass2, 2.4) +
    r(x + 2, m.base - 2, w - 4, 2, p.shade) +
    r(x + w * 0.12, y - 5, 6, 5, p.steel) +
    r(x + w * 0.22, y - 7, 3, 7, p.steel2) +
    r(m.cx - w * 0.1, m.base - 9, w * 0.2, 9, p.ink2, 1, 'opacity=".8"')
  );
}

/* ---------- commercial ---------- */

function cafe(m, p, lv) {
  const w = m.bw * 0.66;
  const h = Math.min(m.bh * 0.46 + lv, m.H * 0.42);
  const x = m.cx - w / 2;
  const y = m.base - h;
  return (
    ground(m, p) +
    shadow(m, p, w * 0.55) +
    r(x, y, w, h, p.wall, 1.5) +
    r(x - 2, y, w + 4, 3, p.roof3 || p.roof2, 1) +
    r(x + 6, y + h * 0.42, w * 0.4, h * 0.5, p.glass, 1) +
    r(x + w - 13, m.base - h * 0.5, 8, h * 0.5, p.wood, 1) +
    awning(x + 2, y + h * 0.34, w - 4, p, 5) +
    c(x + w * 0.5, y - 7, 5.4, p.wall, `stroke="${p.roof2}" stroke-width="1.2"`) +
    path(`M${x + w * 0.5 - 5} ${y - 8} h10 v3 a5 5 0 0 1 -10 0 z`, p.coral) +
    r(x + w * 0.5 - 1, y - 13, 2, 4, p.coral) +
    r(x + w * 0.5 - 2, y - 17, 4, 4, p.wall, 1)
  );
}

function shop(m, p, lv) {
  const w = m.bw * 0.76;
  const h = Math.min(m.bh * 0.44 + lv, m.H * 0.4);
  const x = m.cx - w / 2;
  const y = m.base - h;
  let goods = '';
  for (let i = 0; i < 4; i++) goods += c(x + 8 + i * 7, m.base - h * 0.26, 2.4, [p.coral, p.amber, p.green, p.coral][i]);
  return (
    ground(m, p) +
    shadow(m, p, w * 0.56) +
    r(x + 3, y + h * 0.3, w - 6, h * 0.7, p.wall2, 1) +
    r(x + 5, y + h * 0.44, w - 10, h * 0.16, p.wall, 1) +
    r(x + 5, y + h * 0.64, w - 10, h * 0.16, p.wall, 1) +
    r(x + 2, m.base - h * 0.24, w - 4, h * 0.24, p.wood, 1) +
    r(x + 1, y + h * 0.24, 2.2, h * 0.76, p.wood) +
    r(x + w - 3.2, y + h * 0.24, 2.2, h * 0.76, p.wood) +
    awning(x, y + h * 0.1, w, p, 8) +
    goods +
    r(x + w * 0.5 - 9, y - 5, 18, 8, p.amber, 2) +
    r(x + w * 0.5 - 5, y - 2.6, 10, 1.8, p.roof2)
  );
}

function mall(m, p, lv) {
  const w = m.bw * 0.9;
  const h = Math.min(m.bh * 0.56 + lv * 1.6, m.H * 0.55);
  const x = m.cx - w / 2;
  const y = m.base - h;
  return (
    ground(m, p) +
    shadow(m, p, w * 0.52) +
    r(x, y + 4, w, h - 4, p.wall2, 2) +
    path(`M${x - 2} ${y + 5} Q${m.cx} ${y - 7} ${x + w + 2} ${y + 5} Z`, p.roof2) +
    win(x + 4, y + 10, w - 8, h * 0.5, 6, 2, p.glass, 2.2) +
    win(x + 4, y + h * 0.62, w - 8, h * 0.26, 3, 1, p.glass2, 2.4) +
    path(`M${m.cx - w * 0.12} ${m.base} L${m.cx - w * 0.12} ${m.base - h * 0.3} Q${m.cx} ${m.base - h * 0.46} ${m.cx + w * 0.12} ${m.base - h * 0.3} L${m.cx + w * 0.12} ${m.base} Z`, p.glass2) +
    r(m.cx - w * 0.12, m.base - 1.5, w * 0.24, 1.5, p.accent) +
    r(x + w * 0.5 - 11, y - 8, 22, 8, p.amber, 2) +
    r(x + w * 0.5 - 7, y - 5.6, 14, 1.8, p.roof2)
  );
}

/* ---------- industrial ---------- */

function chimney(m, p, x, y, w, h, lv) {
  return (
    r(x, y, w, h, p.wall2, 1) +
    r(x - 1.2, y, w + 2.4, 2.4, p.roof2, 1) +
    r(x + w * 0.22, y + 5, w * 0.56, Math.max(2, h * 0.12), p.shade, 1) +
    smoke(x + w * 0.5, y - 4, p, 2 + Math.min(2, lv), Math.min(1, w / 8))
  );
}

function factoryShed(m, p, w, h, x, y, teeth = 3) {
  let out = r(x, y, w, h, p.wall2, 1);
  const tw = w / teeth;
  for (let i = 0; i < teeth; i++) {
    out += path(`M${x + i * tw} ${y + 1} L${x + i * tw + tw * 0.62} ${y - h * 0.24} L${x + i * tw + tw} ${y + 1} Z`, p.roof2);
  }
  out += win(x + 3, y + h * 0.34, w - 6, h * 0.34, Math.max(2, Math.round(w / 12)), 1, p.glass, 2);
  return out;
}

function brickworks(m, p, lv) {
  const w = m.bw * 0.66;
  const h = Math.min(m.bh * 0.42, m.H * 0.4);
  const x = m.cx - m.bw * 0.5;
  const y = m.base - h;
  return (
    ground(m, p) +
    shadow(m, p, m.bw * 0.46) +
    roofMetal(m, p, x, y, w, h) +
    r(x + 4, m.base - h * 0.5, 8, h * 0.5, p.ink2, 1, 'opacity=".75"') +
    chimney(m, p, x + w + 3, y - m.bh * 0.34, 7, m.bh * 0.34 + h, lv) +
    brickStack(x - 2, m.base - 10, p) +
    brickStack(x - 2, m.base - 19, p) +
    brickStack(x + w - 16, m.base - 9, p)
  );
}
function brickStack(x, y, p) {
  let out = '';
  for (let i = 0; i < 3; i++) out += r(x + (i % 2) * 1.4, y + i * 3, 14, 2.6, '#C4694B', 0, 'opacity=".9"');
  return out;
}
function roofMetal(m, p, x, y, w, h) {
  return (
    r(x, y, w, h, p.wall2, 1) +
    path(`M${x - 2} ${y + 1} L${x + w * 0.5} ${y - h * 0.26} L${x + w + 2} ${y + 1} Z`, p.roof2) +
    r(x + 4, m.base - h * 0.46, w * 0.24, h * 0.46, p.glass2, 1, 'opacity=".8"')
  );
}

function sawmill(m, p, lv) {
  const w = m.bw * 0.6;
  const h = Math.min(m.bh * 0.4, m.H * 0.38);
  const x = m.cx - m.bw * 0.18;
  const y = m.base - h;
  let logs = '';
  for (let i = 0; i < 3; i++) {
    const ly = m.base - 3.8 - i * 3.6;
    logs += c(x - m.bw * 0.34, ly, 3.6, p.wood, `stroke="${p.roof2}" stroke-width="1"`);
    logs += c(x - m.bw * 0.34 + 6.4, ly - 1.6, 3.4, p.wall, `stroke="${p.roof2}" stroke-width="1"`);
    logs += c(x - m.bw * 0.34 + 6.4, ly, 3.4, p.wood, `stroke="${p.roof2}" stroke-width="1"`);
  }
  return (
    ground(m, p) +
    shadow(m, p, m.bw * 0.48) +
    factoryShed(m, p, w, h, x, y, 2) +
    r(x, m.base - h * 0.3, w * 0.22, h * 0.3, p.ink2, 1, 'opacity=".7"') +
    logs +
    r(x - m.bw * 0.34 - 4, m.base - 1.5, m.bw * 0.34 + 4, 2, p.wood, 1, 'opacity=".5"')
  );
}

function glassworks(m, p, lv) {
  const w = m.bw * 0.7;
  const h = Math.min(m.bh * 0.44, m.H * 0.42);
  const x = m.cx - m.bw * 0.48;
  const y = m.base - h;
  return (
    ground(m, p) +
    shadow(m, p, m.bw * 0.46) +
    roofMetal(m, p, x, y, w, h) +
    r(x + w * 0.2, m.base - h * 0.42, w * 0.3, h * 0.42, p.glass, 1) +
    r(x + w * 0.24, m.base - h * 0.36, w * 0.22, h * 0.3, p.amber, 1, 'opacity=".9"') +
    chimney(m, p, x + w + 4, y - m.bh * 0.2, 6, m.bh * 0.2 + h * 0.9, lv) +
    r(x + w * 0.62, m.base - h * 0.22, w * 0.3, h * 0.22, p.wall2, 1)
  );
}

function steelworks(m, p, lv) {
  const w = m.bw * 0.7;
  const h = Math.min(m.bh * 0.4, m.H * 0.38);
  const x = m.cx - m.bw * 0.5;
  const y = m.base - h;
  return (
    ground(m, p) +
    shadow(m, p, m.bw * 0.5) +
    factoryShed(m, p, w, h, x, y, 2) +
    chimney(m, p, x + w * 0.16, y - m.bh * 0.3, 7, m.bh * 0.3 + h, lv) +
    chimney(m, p, x + w * 0.7, y - m.bh * 0.22, 6.5, m.bh * 0.22 + h, lv + 1) +
    c(x + w + 8, m.base - m.bh * 0.16, m.bh * 0.12, p.steel, `stroke="${p.steel2}" stroke-width="1.2"`) +
    r(x + w + 2, m.base - m.bh * 0.16, 12, m.bh * 0.16, p.steel, 1) +
    path(`M${x + w + 8} ${m.base - m.bh * 0.28} q8 -6 14 0`, 'none', `stroke="${p.steel2}" stroke-width="1.6"`)
  );
}

function factory(m, p, lv) {
  const w = m.bw * 0.86;
  const h = Math.min(m.bh * 0.42, m.H * 0.4);
  const x = m.cx - w / 2;
  const y = m.base - h;
  return (
    ground(m, p) +
    shadow(m, p, w * 0.5) +
    factoryShed(m, p, w, h, x, y, 4) +
    chimney(m, p, x + w * 0.1, y - m.bh * 0.34, 8, m.bh * 0.34 + h, lv + 1) +
    chimney(m, p, x + w * 0.4, y - m.bh * 0.46, 6.5, m.bh * 0.46 + h, lv) +
    chimney(m, p, x + w * 0.74, y - m.bh * 0.28, 6, m.bh * 0.28 + h, lv + 1) +
    r(x + w * 0.62, m.base - h * 0.3, 7, h * 0.3, p.ink2, 1, 'opacity=".75"')
  );
}

/* ---------- services ---------- */

function park(m, p, lv) {
  const tree = (x, y, rad) =>
    r(x - 1.4, y, 2.8, m.H * 0.16, p.wood) +
    c(x, y - rad * 0.35, rad, p.green) +
    c(x - rad * 0.55, y + rad * 0.1, rad * 0.66, p.leaf) +
    c(x + rad * 0.6, y + rad * 0.16, rad * 0.6, p.green2);
  return (
    ground(m, p, '#D9EBD4') +
    e(m.cx + m.bw * 0.2, m.base - m.H * 0.02, m.bw * 0.2, m.H * 0.045, p.water) +
    e(m.cx + m.bw * 0.2, m.base - m.H * 0.02, m.bw * 0.1, m.H * 0.02, p.water2, 'opacity=".5"') +
    path(`M${m.cx - m.bw * 0.4} ${m.base} Q${m.cx - m.bw * 0.1} ${m.base - m.H * 0.16} ${m.cx + m.bw * 0.08} ${m.base} Z`, '#F6EEDC') +
    tree(m.cx - m.bw * 0.3, m.base - m.H * 0.28, Math.min(m.bw * 0.16, m.H * 0.13)) +
    tree(m.cx + m.bw * 0.02, m.base - m.H * 0.38, Math.min(m.bw * 0.13, m.H * 0.11)) +
    r(m.cx - m.bw * 0.34, m.base - m.H * 0.07, m.bw * 0.2, 2.4, p.wood, 1) +
    r(m.cx - m.bw * 0.32, m.base - m.H * 0.07, 1.6, 4, p.wood) +
    r(m.cx - m.bw * 0.16, m.base - m.H * 0.07, 1.6, 4, p.wood)
  );
}

function school(m, p, lv) {
  const w = m.bw * 0.8;
  const h = Math.min(m.bh * 0.4, m.H * 0.36);
  const x = m.cx - w / 2;
  const y = m.base - h;
  return (
    ground(m, p, '#EAF0DA') +
    shadow(m, p, w * 0.48) +
    r(x, y, w, h, p.wall, 1.5) +
    r(x - 1, y, w + 2, 3, p.roof2, 1) +
    win(x + 3, y + 7, w - 6, h * 0.34, 5, 1, p.glass, 2.4) +
    r(m.cx - w * 0.1, m.base - h * 0.4, w * 0.2, h * 0.4, p.wood, 1) +
    r(m.cx - w * 0.1, m.base - h * 0.4, w * 0.2, 3, p.amber) +
    r(x + w - 12, y - m.H * 0.22, 1.6, m.H * 0.22, p.steel2) +
    path(`M${x + w - 10.4} ${y - m.H * 0.22} l10 3 -10 3 z`, p.accent) +
    c(x + 6, m.base - 4, 2.6, p.green)
  );
}

function hospital(m, p, lv) {
  const w = m.bw * 0.62;
  const h = Math.min(m.bh * 0.62 + lv, m.H * 0.58);
  const x = m.cx - w / 2 - m.bw * 0.06;
  const y = m.base - h;
  return (
    ground(m, p) +
    shadow(m, p, m.bw * 0.48) +
    r(x, y, w, h, p.wall, 2) +
    r(x, y, w, 3.4, p.roof2, 1) +
    win(x + 4, y + 9, w - 8, h * 0.5, 3, 3, p.glass, 2.4) +
    r(x + w * 0.36, y - 9, 12, 12, p.coral, 2) +
    r(x + w * 0.36 + 4.6, y - 6.6, 2.8, 7.2, p.wall) +
    r(x + w * 0.36 + 2.4, y - 4.4, 9.2, 2.8, p.wall) +
    r(x + w * 0.4, m.base - 13, w * 0.44, 13, p.glass2, 1) +
    r(x + w * 0.4, m.base - 13, w * 0.44, 2, p.coral) +
    r(x + w * 0.4 + 3, m.base - 9.6, 5, 3, p.wall, 0.6) +
    r(x + w + 4, m.base - 8, 14, 8, p.wall, 2) +
    r(x + w + 5.5, m.base - 6, 4, 4, p.glass, 1)
  );
}

function police(m, p, lv) {
  const w = m.bw * 0.6;
  const h = Math.min(m.bh * 0.4, m.H * 0.34);
  const x = m.cx - w / 2;
  const y = m.base - h;
  return (
    ground(m, p) +
    shadow(m, p, w * 0.6) +
    r(x, y, w, h, p.wall, 1.5) +
    r(x - 2, y, w + 4, 3, p.roof2, 1) +
    r(m.cx - 4, m.base - h * 0.42, 8, h * 0.42, p.glass2, 1) +
    win(x + 3, y + 5, w - 6, h * 0.24, 2, 1, p.glass, 2) +
    r(m.cx + w * 0.18, y - 4, 3.4, 6, p.steel2) +
    c(m.cx + w * 0.18 + 1.7, y - 5.4, 3.4, '#4C7DF0', `stroke="${p.ink}" stroke-width=".8"`) +
    r(m.cx - w * 0.16, y + 1, 9, 7, p.accent, 1.6) +
    path(`M${m.cx - w * 0.16 + 4.5} ${y + 2.4} l1.6 3.2 3.4.4 -2.6 2.2 .8 3.2 -3.2-1.8 -3.2 1.8 .8-3.2 -2.6-2.2 3.4-.4 z`, p.wall)
  );
}

function fire(m, p, lv) {
  const w = m.bw * 0.58;
  const h = Math.min(m.bh * 0.42, m.H * 0.36);
  const x = m.cx - w / 2;
  const y = m.base - h;
  return (
    ground(m, p) +
    shadow(m, p, w * 0.66) +
    r(x, y, w, h, p.wall, 1.5) +
    r(x - 1.5, y, w + 3, 3, p.roof2, 1) +
    r(x + 4, m.base - h * 0.46, w * 0.32, h * 0.46, p.coral, 1) +
    r(x + 4 + w * 0.36, m.base - h * 0.46, w * 0.32, h * 0.46, p.coral, 1) +
    r(x + 4, m.base - h * 0.46, w * 0.32, 1.6, p.wall) +
    r(x + w * 0.72, y - m.bh * 0.24, m.bw * 0.16, m.bh * 0.24 + h * 0.5, p.wall2, 1) +
    r(x + w * 0.72 - 1.5, y - m.bh * 0.24, m.bw * 0.16 + 3, 3, p.roof2, 1) +
    c(x + w * 0.72 + m.bw * 0.08, y - m.bh * 0.14, 3.2, p.amber, `stroke="${p.roof2}" stroke-width="1"`) +
    c(m.cx, m.base - h - 8, 3, p.accent)
  );
}

function power(m, p, lv) {
  const w = m.bw * 0.4;
  const h = Math.min(m.bh * 0.66, m.H * 0.62);
  const x = m.cx - m.bw * 0.34;
  const y = m.base - h;
  return (
    ground(m, p) +
    shadow(m, p, m.bw * 0.42) +
    path(
      `M${x + w * 0.18} ${y} Q${x + w * 0.32} ${y + h * 0.5} ${x} ${y + h} L${x + w} ${y + h} Q${x + w * 0.68} ${y + h * 0.5} ${x + w * 0.82} ${y} Z`,
      p.wall2,
      `stroke="${p.shade}" stroke-width="1"`
    ) +
    e(x + w / 2, y + 1, w * 0.32, 2.6, p.shade) +
    e(x + w / 2, y - 4, w * 0.26, 4, '#FFFFFF', 'opacity=".5" class="ca-steam"') +
    e(x + w / 2, y - 10, w * 0.18, 3, '#FFFFFF', 'opacity=".35" class="ca-steam" style="--i:1"') +
    r(x + w + 4, m.base - m.bh * 0.2, m.bw * 0.2, m.bh * 0.2, p.wall, 1.5) +
    path(`M${x + w + 8} ${m.base - m.bh * 0.2 - 12} l-6 10 h5 l-2 8 8-11 h-5 z`, p.amber, `stroke="${p.roof2}" stroke-width=".8"`)
  );
}

function water(m, p, lv) {
  const w = m.bw * 0.5;
  const h = Math.min(m.bh * 0.52, m.H * 0.46);
  const x = m.cx - w / 2;
  const y = m.base - h;
  const legs = 4;
  let out = ground(m, p) + shadow(m, p, w * 0.56);
  for (let i = 0; i < legs; i++) {
    out += r(x + 4 + i * ((w - 9) / (legs - 1)) - 1.2, y + h * 0.32, 2.4, h * 0.68, p.steel2);
  }
  out += path(`M${x} ${y + h * 0.24} L${x + 2} ${y} L${x + w - 2} ${y} L${x + w} ${y + h * 0.24} Z`, p.wall2, `stroke="${p.steel}" stroke-width="1"`);
  out += e(x + w / 2, y + 0.6, w / 2 - 1, 3, p.steel);
  out += r(x + w / 2 - 1, y - 9, 2, 9, p.steel2);
  out += c(x + w / 2, y - 10, 3, p.accent);
  out += r(x + w * 0.3, y + h * 0.35, w * 0.4, 1.6, p.steel2, 0, 'opacity=".6"');
  return out;
}

/* ---------- transit ---------- */

function bus(m, p, lv) {
  const w = m.bw * 0.62;
  const h = Math.min(m.bh * 0.36, m.H * 0.32);
  const x = m.cx - m.bw * 0.4;
  const y = m.base - h;
  return (
    ground(m, p) +
    shadow(m, p, w * 0.6) +
    r(x, y, w, h, p.green2, 2.5) +
    r(x + 2, y + 3, w - 4, h * 0.34, p.glass, 1) +
    r(x + 2, y + h * 0.5, w - 4, h * 0.24, p.glass2, 1) +
    c(x + w * 0.24, m.base - 2, 2.8, p.ink) +
    c(x + w * 0.76, m.base - 2, 2.8, p.ink) +
    r(x + w * 0.86, y + h * 0.36, 4, h * 0.4, p.amber, 1) +
    r(x - m.bw * 0.2, y - 5, m.bw * 0.15, 1.8, p.steel2) +
    r(x - m.bw * 0.2, y - 5, 1.8, h * 0.4, p.steel2) +
    r(x - m.bw * 0.2, y - 9, m.bw * 0.3, 4, p.accent, 1)
  );
}

function subway(m, p, lv) {
  const w = m.bw * 0.72;
  const h = Math.min(m.bh * 0.5, m.H * 0.44);
  const x = m.cx - w / 2;
  const y = m.base - h;
  let steps = '';
  for (let i = 0; i < 4; i++) {
    steps += r(x + 7 + i * 1.6, m.base - h * 0.32 + i * (h * 0.09), w - 14 - i * 3.2, h * 0.09, i % 2 ? p.steel2 : p.steel, 1);
  }
  return (
    ground(m, p) +
    shadow(m, p, w * 0.6) +
    r(x + 4, y + h * 0.46, w - 8, h * 0.54, p.ink2, 2) +
    steps +
    r(x + 3, y + h * 0.4, 2, h * 0.6, p.steel) +
    r(x + w - 5, y + h * 0.4, 2, h * 0.6, p.steel) +
    r(x + 1, y + h * 0.08, 2.4, h * 0.42, p.steel2) +
    r(x + w - 3.4, y + h * 0.08, 2.4, h * 0.42, p.steel2) +
    path(`M${x - 3} ${y + h * 0.18} Q${m.cx} ${y - h * 0.14} ${x + w + 3} ${y + h * 0.18} L${x + w + 3} ${y + h * 0.26} L${x - 3} ${y + h * 0.26} Z`, p.accent) +
    c(m.cx, y + h * 0.02, 7, p.ink, `stroke="${p.wall}" stroke-width="1.6"`) +
    `<text x="${m.cx}" y="${y + h * 0.05}" text-anchor="middle" font-size="8.5" font-weight="800" fill="#FFF8EF" font-family="system-ui, sans-serif">M</text>`
  );
}

function metro(m, p, lv) {
  const w = m.bw * 0.92;
  const h = Math.min(m.bh * 0.44, m.H * 0.4);
  const x = m.cx - w / 2;
  const stationW = w * 0.34;
  const trainY = m.base - h * 0.86;
  const trainH = h * 0.52;
  return (
    ground(m, p) +
    shadow(m, p, w * 0.5) +
    r(x, m.base - h * 0.9, w, 1.8, p.steel2, 0, 'opacity=".55"') +
    r(x, m.base - 3.4, w, 1.6, p.steel2, 0, 'opacity=".45"') +
    r(x, m.base - h * 0.9, stationW, 3, p.roof2, 1) +
    r(x + 2, m.base - h * 0.9, 2, h * 0.9, p.steel2) +
    r(x + stationW - 4, m.base - h * 0.9, 2, h * 0.9, p.steel2) +
    r(x + 3, m.base - h * 0.5, stationW - 6, h * 0.2, p.glass, 1) +
    r(x + 3, m.base - h * 0.24, stationW - 6, h * 0.24, p.wall, 1) +
    c(x + stationW / 2, m.base - h * 1.14, 6.4, p.accent, `stroke="${p.wall}" stroke-width="1.4"`) +
    c(x + stationW / 2, m.base - h * 1.14, 2.2, '#FFF8EF') +
    `<g class="ca-train">` +
    r(x + stationW + 2, trainY, w - stationW - 2, trainH, p.wall, 3) +
    r(x + stationW + 2, trainY, w - stationW - 2, trainH * 0.2, p.accent, 3) +
    win(x + stationW + 4, trainY + trainH * 0.3, w - stationW - 6, trainH * 0.34, 5, 1, p.glass, 1.8) +
    r(x + stationW + w * 0.2, trainY, 1.6, trainH, p.steel, 0, 'opacity=".45"') +
    r(x + stationW + w * 0.42, trainY, 1.6, trainH, p.steel, 0, 'opacity=".45"') +
    c(x + stationW + 6, trainY + trainH, 2.2, p.ink) +
    c(x + w - 6, trainY + trainH, 2.2, p.ink) +
    `</g>` +
    r(x + stationW + 2, trainY + trainH + 1, w - stationW - 2, 1.4, p.steel2, 0, 'opacity=".5"')
  );
}

function train(m, p, lv) {
  const w = m.bw * 0.96;
  const h = Math.min(m.bh * 0.3, m.H * 0.26);
  const x = m.cx - w / 2;
  const trainY = m.base - h - 8;
  const stationW = w * 0.3;
  let cars = '';
  const carW = (w - stationW + 6) / 3;
  for (let i = 0; i < 3; i++) {
    const cx0 = x + stationW + i * carW;
    cars +=
      r(cx0, trainY, carW - 2, h, p.wall, 2.6) +
      r(cx0, trainY, carW - 2, h * 0.22, p.accent, 2.6) +
      win(cx0 + 2.4, trainY + h * 0.34, carW - 7, h * 0.34, 2, 1, p.glass, 1.6) +
      r(cx0 + carW - 2, trainY, 1.2, h, p.steel, 0, 'opacity=".5"');
  }
  return (
    ground(m, p, '#E4E0D5') +
    shadow(m, p, w * 0.5) +
    // rails
    r(x, m.base - 6, w, 1.6, p.steel2, 0, 'opacity=".6"') +
    r(x, m.base - 3, w, 1.6, p.steel2, 0, 'opacity=".45"') +
    // platform
    r(x, m.base - 9, stationW + 2, 2.2, p.wall2, 1) +
    // station canopy
    path(`M${x - 2} ${m.base - h - 12} L${x + stationW + 4} ${m.base - h - 12} L${x + stationW} ${m.base - h - 18} L${x + 2} ${m.base - h - 18} Z`, p.roof2) +
    r(x + 3, m.base - h - 12, 2, h * 0.7, p.steel2) +
    r(x + stationW - 3, m.base - h - 12, 2, h * 0.7, p.steel2) +
    r(x + 4, m.base - h - 6, stationW - 6, h * 0.24, p.glass, 1) +
    r(x + 5, m.base - h * 0.66, stationW - 8, h * 0.24, p.wall, 1) +
    `<g class="ca-train">${cars}</g>` +
    r(x + stationW + 3, m.base - 4.4, w - stationW - 6, 1.4, p.steel, 0, 'opacity=".5"')
  );
}

function ferry(m, p, lv) {
  const w = m.bw * 0.78;
  const h = Math.min(m.bh * 0.44, m.H * 0.4);
  const x = m.cx - w / 2;
  const y = m.base - h;
  return (
    ground(m, p) +
    r(0, m.base - m.H * 0.12, m.W, m.H * 0.12 + m.gh, p.water) +
    r(0, m.base - m.H * 0.12, m.W, 1.6, p.water2, 0, 'opacity=".7"') +
    shadow(m, p, w * 0.5) +
    r(x + w * 0.82, m.base - m.H * 0.2, 2.6, m.H * 0.2, p.wood) +
    r(x + w * 0.9, m.base - m.H * 0.2, 2.6, m.H * 0.2, p.wood) +
    `<g class="ca-bob">` +
    path(`M${x} ${m.base - m.H * 0.12} L${x + w} ${m.base - m.H * 0.12} L${x + w * 0.9} ${m.base - m.H * 0.03} L${x + w * 0.1} ${m.base - m.H * 0.03} Z`, p.accent) +
    r(x + w * 0.16, y + h * 0.4, w * 0.34, h * 0.34, p.wall, 1.6) +
    win(x + w * 0.19, y + h * 0.45, w * 0.28, h * 0.14, 3, 1, p.glass, 1.6) +
    r(x + w * 0.56, y + h * 0.5, w * 0.06, h * 0.26, p.roof2, 1) +
    e(x + w * 0.59, y + h * 0.48, w * 0.06, 2, p.roof2) +
    r(x + w * 0.62, y + h * 0.62, w * 0.2, h * 0.12, p.wall2, 1) +
    `</g>` +
    path(`M${x + w * 0.5} ${m.base - m.H * 0.12} q-4 4 -8 5`, 'none', `stroke="${p.steel2}" stroke-width="1"`)
  );
}

function airport(m, p, lv) {
  const apron = '#DFDBD0';
  const rw = m.W * 0.86;
  const rx = m.cx - rw / 2;
  const ry = m.base - m.H * 0.2;
  const termW = m.W * 0.42;
  const termH = m.H * 0.26;
  const tx = m.cx - m.W * 0.34;
  const ty = m.base - m.H * 0.44;
  let dashes = '';
  for (let i = 0; i < 8; i++) dashes += r(rx + rw * 0.08 + i * (rw * 0.11), ry + m.H * 0.075, rw * 0.055, 1.8, '#FFFFFF', 1, 'opacity=".85"');
  return (
    ground(m, p, '#EDE9DF') +
    r(rx, ry, rw, m.H * 0.16, '#5C6478', 2) +
    dashes +
    // terminal
    shadow(m, p, termW * 0.5, tx + termW / 2) +
    r(tx, ty, termW, termH, p.wall, 2) +
    r(tx, ty, termW, 4, p.roof2, 1.4) +
    win(tx + 4, ty + 8, termW - 8, termH * 0.46, 5, 2, p.glass, 2) +
    r(tx + termW * 0.36, ty + termH * 0.62, termW * 0.28, termH * 0.38, p.glass2, 1) +
    // jet bridge
    r(tx + termW, ty + termH * 0.5, m.W * 0.08, m.H * 0.03, p.steel, 1) +
    // control tower
    r(m.cx + m.W * 0.24, ty + termH * 0.42, 3.4, m.H * 0.22, p.wall2) +
    r(m.cx + m.W * 0.24 - 4, ty + termH * 0.3, 11.4, m.H * 0.09, p.glass2, 1.6) +
    r(m.cx + m.W * 0.28, ty + termH * 0.18, 1.4, m.H * 0.08, p.steel2) +
    c(m.cx + m.W * 0.285, ty + termH * 0.16, 1.6, p.coral) +
    // plane
    `<g class="ca-plane">` +
    `<g transform="translate(${m.cx - m.W * 0.02}, ${ry + m.H * 0.02}) scale(${Math.max(0.6, m.W / 260)})">` +
    path('M0 4 C0 0 10 -2 26 -2 L46 -2 C52 -2 56 1 56 4 C56 7 52 10 46 10 L26 10 C10 10 0 8 0 4 Z', '#FFFFFF', `stroke="${p.steel2}" stroke-width="1.2"`) +
    path('M18 0 L10 -13 L18 -13 L26 0 Z', p.steel) +
    path('M18 8 L10 21 L18 21 L26 8 Z', p.steel) +
    path('M44 0 L50 -7 L54 -7 L52 0 Z', p.steel) +
    path('M32 4 h8', 'none', `stroke="${p.accent}" stroke-width="2"`) +
    c(8, 2, 1.6, p.accent) +
    `</g>` +
    `</g>` +
    // fuel + luggage carts
    r(rx + rw * 0.1, ry + m.H * 0.03, 7, 4, p.amber, 1) +
    r(rx + rw * 0.1 + 10, ry + m.H * 0.03, 7, 4, p.wall2, 1)
  );
}

/* ---------- landmarks ---------- */

function tower(m, p, lv) {
  const w = Math.min(m.bw * 0.2, m.H * 0.14);
  const h = Math.min(m.bh * 0.78, m.H * 0.76);
  const x = m.cx - w / 2;
  const y = m.base - h;
  return (
    ground(m, p, '#E6DECB') +
    path(`M${m.cx - m.bw * 0.4} ${m.base} Q${m.cx} ${m.base - m.H * 0.16} ${m.cx + m.bw * 0.4} ${m.base} Z`, p.green2) +
    path(`M${x} ${y + h * 0.2} L${x + w * 0.16} ${y} L${x + w * 0.84} ${y} L${x + w} ${y + h * 0.2} L${x + w * 0.86} ${m.base - m.H * 0.1} L${x + w * 0.14} ${m.base - m.H * 0.1} Z`, p.wall, `stroke="${p.shade}" stroke-width="1"`) +
    r(x + w * 0.2, y + h * 0.18, w * 0.6, h * 0.16, p.glass2, 1) +
    r(x + w * 0.24, y + h * 0.44, w * 0.52, h * 0.12, p.accent, 1) +
    r(m.cx - 1.4, y - m.H * 0.16, 2.8, m.H * 0.16, p.steel2) +
    c(m.cx, y - m.H * 0.17, 2.2, p.coral) +
    c(m.cx + w * 0.9, y + h * 0.3, 1.6, p.amber)
  );
}

function lotte(m, p, lv) {
  const w = m.bw * 0.52;
  const h = Math.min(m.bh * 0.86, m.H * 0.84);
  const x = m.cx - w / 2;
  const y = m.base - h;
  const top = w * 0.42;
  return (
    ground(m, p, '#E8E4D8') +
    shadow(m, p, w * 0.6) +
    path(`M${x + w * 0.5 - top / 2} ${y} L${x + w * 0.5 + top / 2} ${y} L${x + w} ${m.base} L${x} ${m.base} Z`, p.wall, `stroke="${p.shade}" stroke-width="1"`) +
    r(x + w * 0.32, y + h * 0.06, w * 0.36, h * 0.06, p.glass2, 1) +
    r(x + w * 0.24, y + h * 0.22, w * 0.52, h * 0.05, p.glass, 1, 'opacity=".85"') +
    r(x + w * 0.2, y + h * 0.36, w * 0.6, h * 0.05, p.glass, 1, 'opacity=".75"') +
    r(x + w * 0.16, y + h * 0.5, w * 0.68, h * 0.05, p.glass2, 1, 'opacity=".7"') +
    r(x + w * 0.12, y + h * 0.64, w * 0.76, h * 0.05, p.glass, 1, 'opacity=".6"') +
    r(x + w * 0.08, y + h * 0.78, w * 0.84, h * 0.05, p.glass2, 1, 'opacity=".55"') +
    r(x + w * 0.5 - 1, y - h * 0.12, 2, h * 0.12, p.steel2) +
    c(x + w * 0.5, y - h * 0.13, 1.8, p.coral) +
    e(x + w * 0.5, m.base - 1, w * 0.5, 3, p.ink, 'opacity=".08"')
  );
}

function palace(m, p, lv) {
  const w = m.bw * 0.94;
  const h = Math.min(m.bh * 0.3, m.H * 0.3);
  const x = m.cx - w / 2;
  const y = m.base - h;
  const gateW = w * 0.3;
  const gx = m.cx - gateW / 2;
  const gy = m.base - h * 1.7;
  return (
    ground(m, p, '#E9E1CF') +
    shadow(m, p, w * 0.5) +
    r(x, y, w, h, p.wall2, 1) +
    r(x - 2, y - 1, w + 4, 3, p.roof2, 1.4) +
    r(x, y + h * 0.42, w, 1.4, p.shade, 0, 'opacity=".7"') +
    // gate body
    r(gx, gy, gateW, m.base - gy, p.wall, 1.4) +
    r(gx + gateW * 0.36, m.base - h * 0.9, gateW * 0.28, h * 0.9, p.wood, 1.4) +
    // lower roof
    path(`M${gx - gateW * 0.2} ${gy + 2} Q${m.cx - gateW * 0.4} ${gy - h * 0.2} ${m.cx - gateW * 0.5} ${gy - h * 0.34} L${m.cx + gateW * 0.5} ${gy - h * 0.34} Q${m.cx + gateW * 0.4} ${gy - h * 0.2} ${gx + gateW * 1.2} ${gy + 2} Z`, p.roof, `stroke="${p.roof2}" stroke-width="1"`) +
    // upper roof
    path(`M${m.cx - gateW * 0.36} ${gy - h * 0.38} Q${m.cx - gateW * 0.3} ${gy - h * 0.66} ${m.cx - gateW * 0.28} ${gy - h * 0.72} L${m.cx + gateW * 0.28} ${gy - h * 0.72} Q${m.cx + gateW * 0.3} ${gy - h * 0.66} ${m.cx + gateW * 0.36} ${gy - h * 0.38} Z`, p.roof2) +
    c(x + w * 0.12, m.base - h * 1.1, h * 0.28, p.leaf) +
    c(x + w * 0.88, m.base - h * 1.15, h * 0.3, p.green) +
    r(x + w * 0.12, m.base - h * 0.9, 2, h * 0.9, p.wood) +
    r(x + w * 0.88, m.base - h * 0.9, 2, h * 0.9, p.wood)
  );
}

function stadium(m, p, lv) {
  const w = m.bw * 0.9;
  const h = Math.min(m.bh * 0.46, m.H * 0.4);
  const x = m.cx - w / 2;
  const y = m.base - h;
  let petals = '';
  for (let i = 0; i < 7; i++) {
    petals += path(
      `M${x + (w / 7) * i + 1} ${y + h * 0.3} L${x + (w / 7) * i + w / 14} ${y} L${x + (w / 7) * (i + 1) - 1} ${y + h * 0.3} Z`,
      i % 2 ? p.wall : p.steel
    );
  }
  return (
    ground(m, p, '#E8E4D8') +
    shadow(m, p, w * 0.5) +
    e(m.cx, y + h * 0.52, w / 2, h * 0.48, p.steel2) +
    e(m.cx, y + h * 0.52, w * 0.42, h * 0.38, p.green) +
    e(m.cx, y + h * 0.52, w * 0.3, h * 0.26, p.green2) +
    r(m.cx - w * 0.2, y + h * 0.44, w * 0.4, 1.4, '#FFFFFF', 0, 'opacity=".6"') +
    r(m.cx - w * 0.01, y + h * 0.34, w * 0.02, h * 0.36, '#FFFFFF', 0, 'opacity=".5"') +
    petals +
    r(x + 3, y - h * 0.28, 2, h * 0.3, p.steel2) +
    r(x + 1, y - h * 0.3, 6, 3, p.accent, 1) +
    r(x + w - 5, y - h * 0.28, 2, h * 0.3, p.steel2) +
    r(x + w - 7, y - h * 0.3, 6, 3, p.accent, 1)
  );
}

function bridge(m, p, lv) {
  const w = m.bw * 0.96;
  const x = m.cx - w / 2;
  const deck = m.base - m.H * 0.26;
  const towerH = m.H * 0.4;
  const t1 = x + w * 0.26;
  const t2 = x + w * 0.74;
  const cables = (tx) =>
    `<path d="M${tx} ${deck - towerH} L${tx - w * 0.2} ${deck} M${tx} ${deck - towerH} L${tx + w * 0.2} ${deck} M${tx} ${deck - towerH} L${tx - w * 0.1} ${deck - towerH * 0.5} L${tx - w * 0.2} ${deck}" stroke="${p.steel2}" stroke-width=".9" fill="none" opacity=".8"/>`;
  return (
    r(0, deck + 6, m.W, m.base - deck - 6 + m.gh, p.water) +
    r(0, deck + 6, m.W, 1.6, p.water2, 0, 'opacity=".6"') +
    r(0, m.base, m.W, m.gh, p.ground) +
    shadow(m, p, w * 0.5) +
    r(x, deck, w, 5, p.wall2, 1) +
    r(x, deck + 5, w, 1.6, p.roof2, 0, 'opacity=".8"') +
    r(x, deck - 2, w, 2, p.steel, 1) +
    r(t1 - 2, deck - towerH, 4.4, towerH, p.roof2, 1) +
    r(t2 - 2, deck - towerH, 4.4, towerH, p.roof2, 1) +
    r(t1 - 4, deck - towerH - 2, 8.4, 3, p.roof2, 1) +
    r(t2 - 4, deck - towerH - 2, 8.4, 3, p.roof2, 1) +
    cables(t1) +
    cables(t2) +
    `<g class="ca-car">` +
    r(x + w * 0.44, deck - 6, 8, 4.4, p.accent, 1) +
    c(x + w * 0.44 + 2, deck - 1.4, 1.2, p.ink) +
    c(x + w * 0.44 + 6, deck - 1.4, 1.2, p.ink) +
    `</g>`
  );
}

/* ---------- registry ---------- */

const ART = {
  hanok,
  villa,
  officetel,
  apartment,
  cafe,
  shop,
  mall,
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
  tower,
  lotte,
  palace,
  stadium,
  bridge,
};

/**
 * Inline SVG for a building.
 * @param {string} type catalogue id
 * @param {{w?:number,h?:number,level?:number,era?:number,size?:number,compact?:boolean,emoji?:string}} opts
 */
export function buildingArt(type, opts = {}) {
  const { level = 1, era = 1, size = 0, compact = false } = opts;
  const w = Math.max(1, Math.min(3, Math.round(Number(opts.w) || 1)));
  const h = Math.max(1, Math.min(3, Math.round(Number(opts.h) || 1)));
  const cols = compact ? 1 : w;
  const rows = compact ? 1 : h;
  const W = cols * 100;
  const H = rows * 100;
  const p = pal(era);
  const draw = ART[type];

  if (typeof draw !== 'function') {
    // Unknown id (old save, removed catalogue row): fall back to the catalogue emoji.
    const emoji = opts.emoji || CATALOG?.[type]?.emoji || '🏗️';
    const px = size ? Math.round(size * 0.62) : 0;
    return `<span class="ca-emoji" style="font-size:${px ? px + 'px' : '62%'};line-height:1" aria-hidden="true">${emoji}</span>`;
  }

  const lv = Math.max(1, Math.round(Number(level) || 1));
  const m = metrics(W, H);
  let inner = '';
  try {
    inner = draw(m, p, lv);
  } catch {
    inner = '';
  }
  const sizing = size
    ? `width="${size}" height="${Math.round((size * H) / W)}"`
    : 'width="100%" height="100%"';
  return `<svg class="ca ca--${type}" viewBox="0 0 ${W} ${H}" ${sizing} preserveAspectRatio="xMidYMax meet" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${inner}</svg>`;
}

/** True when this module has real art for the id (screens can fall back to emoji). */
export function hasArt(type) {
  return typeof ART[type] === 'function';
}

export default { buildingArt, hasArt };
