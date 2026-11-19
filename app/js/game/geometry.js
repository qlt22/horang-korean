// Seoul Works 3D — tiny CSS-3D geometry kit.
//
// The city lives in a Z-up world: x runs across the map, y runs "south"
// (towards the camera), z is height. Every face is a real quad positioned by a
// matrix3d, so a building is a set of volumetric faces rather than a picture.
// The third matrix basis must be the face normal — without it the plane is
// singular and the browser refuses to paint it.

export const TILE = 42;

const n = (v) => Math.round(Number(v) * 100) / 100;

/**
 * A single transformed quad.
 * @param {number} w div width in px
 * @param {number} h div height in px
 * @param {[number,number,number]} o world origin of the div's top-left corner
 * @param {[number,number,number]} u world vector spanned by the div's width
 * @param {[number,number,number]} v world vector spanned by the div's height
 */
export function face({ w, h, o, u, v, cls = '', style = '', content = '' }) {
  const W = Math.max(0.01, Number(w) || 0.01);
  const H = Math.max(0.01, Number(h) || 0.01);
  const ux = u[0] / W;
  const uy = u[1] / W;
  const uz = u[2] / W;
  const vx = v[0] / H;
  const vy = v[1] / H;
  const vz = v[2] / H;
  // Local +z is the plane normal, keeping the matrix non-singular.
  let nx = uy * vz - uz * vy;
  let ny = uz * vx - ux * vz;
  let nz = ux * vy - uy * vx;
  const len = Math.hypot(nx, ny, nz) || 1;
  nx /= len;
  ny /= len;
  nz /= len;
  const m =
    `matrix3d(${n(ux)},${n(uy)},${n(uz)},0,` +
    `${n(vx)},${n(vy)},${n(vz)},0,` +
    `${n(nx)},${n(ny)},${n(nz)},0,` +
    `${n(o[0])},${n(o[1])},${n(o[2])},1)`;
  return `<i class="g-face ${cls}"${style ? ` style="width:${n(W)}px;height:${n(H)}px;transform:${m};${style}"` : ` style="width:${n(W)}px;height:${n(H)}px;transform:${m}"`}>${content}</i>`;
}

/** Horizontal quad at height z (a floor, roof, road, shadow...). */
export function flat({ x = 0, y = 0, z = 0, w, d, cls = '', style = '', content = '' }) {
  return face({ w, h: d, o: [x, y, z], u: [w, 0, 0], v: [0, d, 0], cls, style, content });
}

/** Wall facing +y (the front-left face in the default camera). */
export function front({ x, y, z, w, h, cls = '', style = '', content = '', out = 0 }) {
  return face({
    w,
    h,
    o: [x, y + out, z + h],
    u: [w, 0, 0],
    v: [0, 0, -h],
    cls,
    style,
    content,
  });
}

/** Wall facing +x (the front-right face in the default camera). */
export function side({ x, y, z, d, h, cls = '', style = '', content = '', out = 0 }) {
  return face({
    w: d,
    h,
    o: [x + out, y, z + h],
    u: [0, d, 0],
    v: [0, 0, -h],
    cls,
    style,
    content,
  });
}

/** Back / west walls are rarely seen but close the volume. */
export function back({ x, y, z, w, h, cls = '', out = 0 }) {
  return face({
    w,
    h,
    o: [x, y - out, z + h],
    u: [w, 0, 0],
    v: [0, 0, -h],
    cls,
  });
}
export function west({ x, y, z, d, h, cls = '', out = 0 }) {
  return face({
    w: d,
    h,
    o: [x - out, y + d, z + h],
    u: [0, -d, 0],
    v: [0, 0, -h],
    cls,
  });
}

/** Axis-aligned cuboid with independent top / sunlit / shaded materials. */
export function box({
  x = 0,
  y = 0,
  z = 0,
  w,
  d,
  h,
  top = 'g-mat-roof',
  side: s1 = 'g-mat-wall',
  side2: s2 = 'g-mat-wall2',
  topStyle = '',
  style = '',
}) {
  if (w <= 0 || d <= 0 || h <= 0) return '';
  return [
    flat({ x, y, z: z + h, w, d, cls: top, style: topStyle }),
    front({ x, y: y + d, z, w, h, cls: s1 }),
    back({ x, y, z, w, h, cls: s2 }),
    side({ x: x + w, y, z, d, h, cls: s2 }),
    west({ x, y, z, d, h, cls: s1 }),
    // The camera always looks down; bottoms are never visible and cost a
    // sixth of every box in a dense 127-building showcase.
  ].join('');
}

/** Sloped gable roof, ridge running along x. */
export function gable({
  x,
  y,
  z,
  w,
  d,
  h,
  cls = 'g-mat-roof',
  cls2 = 'g-mat-roof2',
  ends = 'g-mat-wall',
  over = 0,
  endStyle = '',
}) {
  const ox = x - over;
  const oy = y - over;
  const ow = w + over * 2;
  const od = d + over * 2;
  const len = Math.hypot(od / 2, h);
  const clip = 'clip-path:polygon(50% 0,100% 100%,0 100%)';
  return [
    face({ w: ow, h: len, o: [ox, oy + od, z], u: [ow, 0, 0], v: [0, -od / 2, h], cls }),
    face({ w: ow, h: len, o: [ox, oy, z], u: [ow, 0, 0], v: [0, od / 2, h], cls: cls2 }),
    face({
      w: od,
      h,
      o: [x, y, z + h],
      u: [0, od, 0],
      v: [0, 0, -h],
      cls: 'g-gable-end ' + ends,
      style: clip + (endStyle ? ';' + endStyle : ''),
    }),
    face({
      w: od,
      h,
      o: [x + w, y + od, z + h],
      u: [0, -od, 0],
      v: [0, 0, -h],
      cls: 'g-gable-end ' + ends,
      style: clip + (endStyle ? ';' + endStyle : ''),
    }),
  ].join('');
}

/** Gable ridge running along y instead of x. */
export function gableY({
  x,
  y,
  z,
  w,
  d,
  h,
  cls = 'g-mat-roof',
  cls2 = 'g-mat-roof2',
  ends = 'g-mat-wall',
  over = 0,
}) {
  const ox = x - over;
  const oy = y - over;
  const ow = w + over * 2;
  const od = d + over * 2;
  const len = Math.hypot(ow / 2, h);
  const clip = 'clip-path:polygon(50% 0,100% 100%,0 100%)';
  return [
    face({ w: len, h: od, o: [ox, oy, z], u: [ow / 2, 0, h], v: [0, od, 0], cls }),
    face({ w: len, h: od, o: [ox + ow, oy, z], u: [-ow / 2, 0, h], v: [0, od, 0], cls: cls2 }),
    face({
      w: ow,
      h,
      o: [ox + ow, oy, z + h],
      u: [-ow, 0, 0],
      v: [0, 0, -h],
      cls: 'g-gable-end ' + ends,
      style: clip,
    }),
    face({
      w: ow,
      h,
      o: [ox, oy + od, z + h],
      u: [ow, 0, 0],
      v: [0, 0, -h],
      cls: 'g-gable-end ' + ends,
      style: clip,
    }),
  ].join('');
}

/** A stack of shrinking boxes — cooling towers, hill bases, tower setbacks. */
export function stack({
  x,
  y,
  z = 0,
  w,
  d,
  h,
  steps = 3,
  shrink = 0.84,
  cls = 'g-mat-wall',
  cls2 = 'g-mat-wall2',
  top = 'g-mat-roof',
}) {
  let out = '';
  let cw = w;
  let cd = d;
  const sh = h / steps;
  for (let i = 0; i < steps; i++) {
    const cx = x + (w - cw) / 2;
    const cy = y + (d - cd) / 2;
    out += box({
      x: cx,
      y: cy,
      z: z + i * sh,
      w: cw,
      d: cd,
      h: sh + 0.4,
      top: i === steps - 1 ? top : cls,
      side: cls,
      side2: cls2,
    });
    cw *= shrink;
    cd *= shrink;
  }
  return out;
}

/** Simple 3D tree: trunk + chunky canopy. */
export function tree({ x, y, z = 0, s = 1, leaf = 'g-mat-leaf', leaf2 = 'g-mat-leaf2' }) {
  const trunk = 3.2 * s;
  const tw = 2.8 * s;
  return [
    box({ x: x - tw / 2, y: y - tw / 2, z, w: tw, d: tw, h: 10 * s, top: 'g-mat-trunk', side: 'g-mat-trunk', side2: 'g-mat-wood2' }),
    box({ x: x - 8 * s, y: y - 8 * s, z: z + 8 * s, w: 16 * s, d: 16 * s, h: 11 * s, top: leaf, side: leaf, side2: leaf2 }),
    box({ x: x - 5 * s, y: y - 5 * s, z: z + 19 * s, w: 10 * s, d: 10 * s, h: 7 * s, top: leaf, side: leaf, side2: leaf2 }),
  ].join('');
}

/** Road / path strip painted flat on the ground. */
export function strip({ x, y, z = 1, w, d, cls = 'g-mat-asphalt' }) {
  return flat({ x, y, z, w, d, cls });
}

export function sign({ x, y, z, w, h, text, cls = 'g-sign', style = '', out = 0.7 }) {
  return front({
    x,
    y,
    z,
    w,
    h,
    cls,
    out,
    style,
    content: `<span>${text}</span>`,
  });
}
export function signSide({ x, y, z, d, h, text, cls = 'g-sign', style = '', out = 0.7 }) {
  return side({
    x,
    y,
    z,
    d,
    h,
    cls,
    out,
    style,
    content: `<span>${text}</span>`,
  });
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
