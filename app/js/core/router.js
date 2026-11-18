// Hash router with screen lifecycle + global delegation.
import * as ui from './ui.js';
import * as audio from './audio.js';
import { logEvent } from './store.js';

let screens = {};
let current = null;
let stack = [];
const listeners = new Set();

export function register(map) {
  screens = map;
  Object.entries(map).forEach(([id, mod]) => {
    if (mod && !mod.id) mod.id = id;
  });
}
export function onNavigate(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function currentScreen() {
  return current;
}

function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  if (!h) return null;
  const [id, qs] = h.split('?');
  const params = {};
  if (qs) {
    qs.split('&').forEach((pair) => {
      const [k, v] = pair.split('=');
      if (k) params[k] = decodeURIComponent(v || '');
    });
  }
  return { id, params };
}

export function go(id, params = {}, opts = {}) {
  const mod = screens[id];
  if (!mod) {
    console.warn('[router] unknown screen', id);
    // A stale deep link must not dead-end the app; fall back to Learn.
    if (id !== 'home' && screens.home && !opts.fallback) go('home', {}, { replace: true, fallback: true });
    return;
  }
  const root = document.getElementById('screen');
  if (!root) return;
  if (current?.mod?.destroy) {
    try {
      current.mod.destroy();
    } catch (e) {
      console.warn('[router] destroy failed', e);
    }
  }
  if (!opts.replace && current) stack.push({ id: current.id, params: current.params });
  if (opts.replace && stack.length) stack.pop();
  if (stack.length > 30) stack = stack.slice(-30);

  root.scrollTop = 0;
  // Overlays live on <body>; a route change must not leave a sheet behind.
  document.querySelectorAll('.scrim').forEach((el) => el.remove());
  const activeTab = mod.nav || null;
  root.innerHTML = `<div class="screen-host">${renderScreen(mod, params, id)}</div>`;
  const tabbar = document.getElementById('tabbar');
  if (tabbar) tabbar.hidden = !!mod.hideNav;
  document.querySelectorAll('.tab').forEach((t) => {
    if (activeTab && t.dataset.tab === activeTab) t.setAttribute('aria-current', 'page');
    else t.removeAttribute('aria-current');
  });
  document.title = `${mod.title || id} · Horang`;

  current = { id, mod, params };
  try {
    mod.mount?.(root.firstElementChild || root, params);
  } catch (e) {
    console.error('[router] mount failed for', id, e);
  }
  const hash = `#/${id}${Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : ''}`;
  if (location.hash !== hash) history.replaceState(null, '', hash);
  logEvent('screen_view', { screen: id });
  listeners.forEach((fn) => {
    try {
      fn(id, params);
    } catch (e) {
      console.error('[router] navigate listener failed', e);
    }
  });
}

function renderScreen(mod, params, id) {
  try {
    const html = mod.render(params);
    return typeof html === 'string' ? html : '';
  } catch (e) {
    // A malformed save or a broken screen must not leave the old DOM (and its
    // dead Continue button) on screen with no way forward.
    console.error('[router] render failed for', id, e);
    try {
      logEvent('screen_error', { screen: id, message: String(e?.message || e) });
    } catch {
      /* analytics is a nicety */
    }
    return `<section class="screen">
      <div class="lesson-blocked">
        <h1 class="h2">This screen could not load</h1>
        <p class="muted mt-2">Your progress is safe. Head back and keep going.</p>
        <button class="btn btn-primary btn-block mt-6" data-go="home" type="button">Back to Learn</button>
      </div>
    </section>`;
  }
}

export function replace(id, params = {}) {
  go(id, params, { replace: true });
}
export function back(fallback = 'home') {
  const prev = stack.pop();
  if (prev) {
    const mod = screens[prev.id];
    if (mod) {
      // pop the entry go() would add
      go(prev.id, prev.params, { replace: false });
      stack.pop();
      return;
    }
  }
  go(fallback, {}, { replace: true });
}
export function refresh() {
  if (!current) return;
  const { id, params } = current;
  const mod = screens[id];
  if (!mod) return;
  try {
    mod.destroy?.();
  } catch (e) {
    console.warn('[router] destroy failed', e);
  }
  const root = document.getElementById('screen');
  if (!root) return;
  const y = root.scrollTop;
  document.querySelectorAll('.scrim').forEach((el) => el.remove());
  root.innerHTML = `<div class="screen-host">${renderScreen(mod, params, id)}</div>`;
  try {
    mod.mount?.(root.firstElementChild || root, params);
  } catch (e) {
    console.error('[router] mount failed', e);
  }
  root.scrollTop = y;
}

// ---------- global delegation ----------
function bindGlobal() {
  document.addEventListener('click', (e) => {
    const clip = e.target.closest('[data-clip]');
    if (clip) {
      e.preventDefault();
      const kind = clip.dataset.clipKind || 's';
      const slow = clip.dataset.slow === '1';
      audio.playClip(slow && kind === 's' ? 's-slow' : kind, clip.dataset.clip, {
        slow,
        fallbackText: clip.dataset.say || '',
      });
      clip.classList.add('is-speaking');
      setTimeout(() => clip.classList.remove('is-speaking'), 700);
      return;
    }
    const say = e.target.closest('[data-say]');
    if (say) {
      e.preventDefault();
      audio.neuralSpeak(say.dataset.say, { rate: '-6%' });
      say.classList.add('is-speaking');
      setTimeout(() => say.classList.remove('is-speaking'), 700);
      return;
    }
    const nav = e.target.closest('[data-go]');
    if (nav) {
      e.preventDefault();
      audio.sfx('tap');
      go(nav.dataset.go, nav.dataset.params ? JSON.parse(nav.dataset.params) : {});
      return;
    }
    const tab = e.target.closest('[data-tab]');
    if (tab) {
      e.preventDefault();
      audio.sfx('tap');
      const id = tab.dataset.tab;
      if (current?.id === id) refresh();
      else go(id);
      return;
    }
    const backBtn = e.target.closest('[data-back]');
    if (backBtn) {
      e.preventDefault();
      back(backBtn.dataset.back || 'home');
      return;
    }
    const b = e.target.closest('.btn, .card-press, .opt, .tile');
    if (b && !b.disabled) audio.sfx('tap');
  });

  // Keyboard shortcuts used by the lesson player and overlays.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const scrim = document.querySelector('.scrim');
      if (scrim) {
        scrim.querySelector('[data-close]')?.click();
      }
    }
  });

  window.addEventListener('hashchange', () => {
    const parsed = parseHash();
    if (!parsed) return;
    const sameParams =
      current && JSON.stringify(parsed.params || {}) === JSON.stringify(current.params || {});
    if (!current || parsed.id !== current.id || !sameParams) {
      go(parsed.id, parsed.params, { replace: true });
    }
  });
}

export function boot(initial = 'welcome') {
  bindGlobal();
  const parsed = parseHash();
  const mod = parsed && screens[parsed.id];
  if (mod) go(parsed.id, parsed.params, { replace: true });
  else go(initial, {}, { replace: true });
}

export { ui };
export const router = { register, go, replace, back, refresh, boot, currentScreen, onNavigate };
export default router;
