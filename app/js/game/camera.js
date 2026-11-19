// Seoul Works 3D — camera: pan, wheel / pinch zoom, 90° rotation, reset.
// The camera element is a zero-size point at the centre of the stage; the
// world is one preserve-3d tree below it, so buildings rotate with the map.

import { TILE } from './geometry.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const reduceMotion = () =>
  document.body.classList.contains('reduce-motion') ||
  (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

export function createCamera({ stage, cameraEl, getGrid, getMaxHeight, getWorldPoints, fitMargin = {} }) {
  const state = {
    panX: 0,
    panY: 0,
    zoom: 1,
    fit: 1,
    rot: 45,
    pitch: 58,
    autoFit: true,
    dragging: false,
  };
  const pointers = new Map();
  let pinch = null;
  let drag = null;
  let suppress = 0;
  let smoothTimer = 0;
  const cleanups = [];

  function apply(animate = false) {
    if (animate && !reduceMotion()) {
      cameraEl.classList.add('is-smooth');
      clearTimeout(smoothTimer);
      smoothTimer = setTimeout(() => cameraEl.classList.remove('is-smooth'), 460);
    }
    cameraEl.style.transform =
      `translate3d(${state.panX.toFixed(2)}px,${state.panY.toFixed(2)}px,0) ` +
      `rotateX(${state.pitch}deg) rotateZ(${state.rot}deg) scale3d(${state.zoom.toFixed(4)},${state.zoom.toFixed(4)},${state.zoom.toFixed(4)})`;
  }

  function computeFit() {
    const grid = Math.max(1, Number(getGrid()) || 6);
    const S = grid * TILE;
    const rect = stage.getBoundingClientRect();
    const vw = Math.max(240, rect.width);
    const vh = Math.max(240, rect.height);
    const desktop = vw >= 900;
    const padX = fitMargin.x ?? (desktop ? 130 : 26);
    const padTop = fitMargin.top ?? (desktop ? 150 : 132);
    const padBottom = fitMargin.bottom ?? (desktop ? 84 : 84);
    const availW = Math.max(220, vw - padX);
    const availH = Math.max(220, vh - padTop - padBottom);
    const maxH = Math.max(TILE * 2.4, Number(getMaxHeight?.()) || 0);
    const projW = S * 1.43 + 44;
    const projH = S * 0.83 + maxH * 0.92 + 54;
    return clamp(Math.min(availW / projW, availH / projH), 0.2, 1.5);
  }

  function margins() {
    const desktop = stage.getBoundingClientRect().width >= 900;
    return {
      left: fitMargin.left ?? (desktop ? 30 : 12),
      right: fitMargin.right ?? (desktop ? 30 : 12),
      top: fitMargin.top ?? (desktop ? 132 : 116),
      bottom: fitMargin.bottom ?? (desktop ? 96 : 76),
    };
  }

  function projectedBounds(zoom, panX, panY) {
    const rect = stage.getBoundingClientRect();
    const style = getComputedStyle(stage);
    const persp = parseFloat(style.perspective) || 1900;
    const [po0, po1] = (style.perspectiveOrigin || '0 0').split(/\s+/).map(parseFloat);
    const poX = Number.isFinite(po0) ? po0 : rect.width / 2;
    const poY = Number.isFinite(po1) ? po1 : rect.height * 0.44;
    const camX = cameraEl.offsetLeft;
    const camY = cameraEl.offsetTop;
    const rz = (state.rot * Math.PI) / 180;
    const rx = (state.pitch * Math.PI) / 180;
    const cz = Math.cos(rz);
    const sz = Math.sin(rz);
    const cx = Math.cos(rx);
    const sx = Math.sin(rx);
    const pts = typeof getWorldPoints === 'function' ? getWorldPoints() : null;
    if (!pts || !pts.length) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of pts) {
      const x = Number(p[0]) || 0;
      const y = Number(p[1]) || 0;
      const z = Number(p[2]) || 0;
      const x1 = x * cz - y * sz;
      const y1 = x * sz + y * cz;
      const y2 = y1 * cx - z * sx;
      const z2 = y1 * sx + z * cx;
      const zz = z2 * zoom;
      const f = Math.max(0.05, persp / (persp - zz));
      const px = poX + (camX + x1 * zoom + panX - poX) * f;
      const py = poY + (camY + y2 * zoom + panY - poY) * f;
      if (px < minX) minX = px;
      if (py < minY) minY = py;
      if (px > maxX) maxX = px;
      if (py > maxY) maxY = py;
    }
    return { minX, minY, maxX, maxY };
  }

  /**
   * Fit the actual projected city — including the tallest spire — instead of a
   * formula guess. Projection is analytic, so a 127-building showcase costs a
   * few hundred multiplications rather than 30k forced layout reads.
   */
  function fitContent({ animate = false } = {}) {
    const rect = stage.getBoundingClientRect();
    const m = margins();
    const availW = Math.max(120, rect.width - m.left - m.right);
    const availH = Math.max(120, rect.height - m.top - m.bottom);
    let b = projectedBounds(1, 0, 0);
    if (!b) {
      state.fit = computeFit();
      state.zoom = state.fit;
      state.panX = 0;
      state.panY = 0;
      state.autoFit = true;
      apply(animate);
      return;
    }
    const w0 = Math.max(10, b.maxX - b.minX);
    const h0 = Math.max(10, b.maxY - b.minY);
    const z = clamp(Math.min(availW / w0, availH / h0), 0.12, 1.6);
    // Pan is applied before the perspective divide, so converge in a few
    // cheap analytic passes (no DOM reads).
    let panX = 0;
    let panY = 0;
    for (let pass = 0; pass < 4; pass++) {
      b = projectedBounds(z, panX, panY);
      if (!b) break;
      const cx = (b.minX + b.maxX) / 2;
      const cy = (b.minY + b.maxY) / 2;
      panX += m.left + availW / 2 - cx;
      panY += m.top + availH / 2 - cy;
    }
    state.zoom = z;
    state.panX = panX;
    state.panY = panY;
    state.autoFit = true;
    apply(animate);
  }

  function fit(opts = {}) {
    fitContent({ animate: !!opts.animate });
  }

  function zoomBy(factor, { manual = true } = {}) {
    state.zoom = clamp(state.zoom * factor, 0.18, 2.6);
    if (manual) state.autoFit = false;
    apply();
  }

  function rotate() {
    state.rot = (state.rot + 90) % 360;
    fitContent({ animate: true });
  }

  function panBy(dx, dy) {
    state.autoFit = false;
    state.panX += dx;
    state.panY += dy;
    const r = stage.getBoundingClientRect();
    state.panX = clamp(state.panX, -r.width * 1.2, r.width * 1.2);
    state.panY = clamp(state.panY, -r.height * 1.2, r.height * 1.2);
    apply();
  }

  function reset() {
    state.rot = 45;
    state.pitch = 58;
    state.autoFit = true;
    fitContent({ animate: true });
  }

  function consumeDrag() {
    if (suppress && Date.now() < suppress) {
      suppress = 0;
      return true;
    }
    suppress = 0;
    return false;
  }

  function startDrag() {
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = {
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        zoom: state.zoom,
        mx: (a.x + b.x) / 2,
        my: (a.y + b.y) / 2,
        panX: state.panX,
        panY: state.panY,
      };
      drag = null;
      state.dragging = true;
    } else if (pointers.size === 1) {
      pinch = null;
      const p = [...pointers.values()][0];
      drag = { x: p.x, y: p.y, panX: state.panX, panY: state.panY, moved: 0 };
    }
  }

  const onDown = (e) => {
    if (e.target.closest('[data-nopan], .g-controls, .g-sheet, .g-menu, .g-top, .g-bottom')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    startDrag();
  };

  const onMove = (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      state.zoom = clamp(pinch.zoom * (dist / pinch.dist), 0.18, 2.6);
      state.autoFit = false;
      state.panX = pinch.panX + (mx - pinch.mx);
      state.panY = pinch.panY + (my - pinch.my);
      suppress = Date.now() + 350;
      apply();
      return;
    }
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.moved = Math.max(drag.moved, Math.abs(dx) + Math.abs(dy));
    if (drag.moved > 5) {
      state.dragging = true;
      state.autoFit = false;
      state.panX = drag.panX + dx;
      state.panY = drag.panY + dy;
      suppress = Date.now() + 350;
      apply();
    }
  };

  const onUp = (e) => {
    pointers.delete(e.pointerId);
    if (drag && drag.moved > 5) suppress = Date.now() + 250;
    drag = null;
    pinch = null;
    state.dragging = false;
    if (pointers.size === 1) startDrag();
  };

  const onWheel = (e) => {
    if (e.target.closest('.g-sheet, .g-menu, .g-top, .g-bottom')) return;
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 1.12 : 0.893);
  };

  const onResize = () => {
    if (state.autoFit) fitContent();
    else apply();
  };

  stage.addEventListener('pointerdown', onDown);
  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('pointerup', onUp);
  stage.addEventListener('pointercancel', onUp);
  const onLeave = (e) => {
    if (pointers.has(e.pointerId)) return;
    drag = null;
  };
  stage.addEventListener('pointerleave', onLeave);
  stage.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('resize', onResize);

  cleanups.push(() => {
    stage.removeEventListener('pointerdown', onDown);
    stage.removeEventListener('pointermove', onMove);
    stage.removeEventListener('pointerup', onUp);
    stage.removeEventListener('pointercancel', onUp);
    stage.removeEventListener('pointerleave', onLeave);
    stage.removeEventListener('wheel', onWheel);
    window.removeEventListener('resize', onResize);
    clearTimeout(smoothTimer);
  });

  return {
    state,
    apply,
    fit,
    fitContent,
    reset,
    rotate,
    zoomBy,
    panBy,
    consumeDrag,
    destroy() {
      cleanups.forEach((fn) => fn());
    },
    isDragging: () => state.dragging && Date.now() < suppress,
  };
}
