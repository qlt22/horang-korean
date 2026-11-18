// UI helpers: escaping, icons, mascot, rings, overlays, confetti.
export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
export function fmt(n) {
  const v = Number(n || 0);
  return v.toLocaleString('en-US');
}
export function pct(n) {
  return Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
}
export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

const ICONS = {
  play: '<path d="M8 5.5v13l10-6.5-10-6.5z" fill="currentColor" stroke="none"/>',
  lock: '<rect x="4.5" y="10" width="15" height="10" rx="2.5"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10"/>',
  check: '<path d="M4.5 12.5l5 5 10-11"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  chevron: '<path d="M9 5l7 7-7 7"/>',
  flame:
    '<path d="M12 3c.8 3.4 4.6 4.6 4.6 8.6a4.6 4.6 0 0 1-9.2 0c0-1.9.9-2.9 2-4 0 1.8.8 2.7 1.7 2.7.4-2.6-.6-4.6.9-7.3z" fill="currentColor" stroke="none"/><path d="M12 13.4c.5 1.4 1.8 2 1.8 3.4a1.8 1.8 0 0 1-3.6 0c0-1.4 1.2-2 1.8-3.4z" fill="#FFF8EF" stroke="none" opacity=".9"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M9.6 9.6h3.6a2 2 0 0 1 0 4H9.6h4.2" stroke-width="2"/>',
  gem: '<path d="M7 3.5h10l4 5.5-9 11.5L3 9z"/><path d="M3 9h18M9.5 3.5L7 9l5 11M14.5 3.5L17 9l-5 11"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-9.5A4.5 4.5 0 0 1 12 7.6a4.5 4.5 0 0 1 7.5 2.9C19.5 15.4 12 20 12 20z" fill="currentColor" stroke="none"/>',
  chest: '<rect x="3.5" y="9.5" width="17" height="10" rx="2"/><path d="M3.5 12.5c0-3.5 3.8-5.5 8.5-5.5s8.5 2 8.5 5.5"/><path d="M10 12.5h4v4h-4z"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 5.5v15"/>',
  shop: '<path d="M4 9.5V20h16V9.5"/><path d="M3 9.5l2-5.5h14l2 5.5"/><path d="M3 9.5a2.6 2.6 0 0 0 5.3 0 2.6 2.6 0 0 0 5.3 0 2.6 2.6 0 0 0 5.3 0"/>',
  user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20.5c0-3.9 3.4-6 7.5-6s7.5 2.1 7.5 6"/>',
  quests: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8 12l2.6 2.6L16 9"/>',
  passport: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><circle cx="12" cy="10" r="3"/><path d="M9 16.5h6"/>',
  sound: '<path d="M4 9.5h3.5L13 5.5v13L7.5 14.5H4z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11"/>',
  mute: '<path d="M4 9.5h3.5L13 5.5v13L7.5 14.5H4z"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5"/>',
  sparkle: '<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" fill="currentColor" stroke="none"/>',
  arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M12 6.5L9.8 4M12 6.5L14.2 4M12 17.5l-2.2 2.5M12 17.5l2.2 2.5"/>',
  crown: '<path d="M4 17h16M4 17l-1-9 5 3 4-6 4 6 5-3-1 9"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 5H4.5v2A3.5 3.5 0 0 0 8 10.5M16 5h3.5v2A3.5 3.5 0 0 1 16 10.5"/><path d="M12 13v4M8.5 20.5h7"/>',
  settings: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2.4"/><circle cx="7.5" cy="17" r="2.4"/>',
  chart: '<path d="M4 20V4"/><path d="M4 20h16"/><rect x="7" y="12" width="3" height="5" rx="1"/><rect x="12" y="8" width="3" height="9" rx="1"/><rect x="17" y="5" width="3" height="12" rx="1"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  gift: '<rect x="3.5" y="9" width="17" height="11" rx="2"/><path d="M2.5 9h19M12 9v11"/><path d="M12 9S10.5 4 7.5 4a2.5 2.5 0 0 0 0 5zM12 9s1.5-5 4.5-5a2.5 2.5 0 0 1 0 5z"/>',
  map: '<path d="M9 4L3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/>',
  city: '<path d="M3 21h18M5 21V10l3.5-2.5V21M8.5 21V7L14 3v18M14 21V12l5-2v11"/><path d="M11 8h.01M11 11h.01M11 14h.01"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.5 9.7l5.9-.8z"/>',
  edit: '<path d="M4 20l4.5-1 11-11-3.5-3.5-11 11z"/><path d="M14.5 6l3.5 3.5"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>',
  eye: '<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  bolt: '<path d="M13 3L5 13.5h5.5L10.5 21 19 10h-6z" fill="currentColor" stroke="none"/>',
  home: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M9.5 20v-5h5v5"/>',
  bell: '<path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5 1.5 5h-15S6 14 6 10z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v6M12 8h.01"/>',
};

export function icon(name, size = 24, cls = '') {
  const p = ICONS[name] || ICONS.sparkle;
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}

export function flame(size = 26) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${ICONS.flame}</svg>`;
}
export function coin(size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="#FFD166" stroke="#7A4B00"/><path d="M9.5 8.5h4a1.8 1.8 0 0 1 0 3.6h-4m0 0v3.4m0-3.4h3.4" stroke="#7A4B00" stroke-linecap="round"/></svg>`;
}
export function gem(size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h10l4 5.5-9 11.5L3 9z" fill="#7BE0C3" stroke="#0B6B58" stroke-width="1.6" stroke-linejoin="round"/><path d="M3 9h18" stroke="#0B6B58" stroke-width="1.4"/></svg>`;
}
export function heart(size = 18, filled = true) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-9.5A4.5 4.5 0 0 1 12 7.6a4.5 4.5 0 0 1 7.5 2.9C19.5 15.4 12 20 12 20z" fill="${filled ? '#D42440' : 'none'}" stroke="#D42440" stroke-width="1.8"/></svg>`;
}
export function chestSvg(size = 120) {
  return `<svg width="${size}" height="${size * 0.85}" viewBox="0 0 120 100" aria-hidden="true">
    <rect x="10" y="42" width="100" height="50" rx="8" fill="#E09A32" stroke="#7A4B00" stroke-width="4"/>
    <path d="M10 50c0-17 22-27 50-27s50 10 50 27v4H10z" fill="#F2A73B" stroke="#7A4B00" stroke-width="4" stroke-linejoin="round"/>
    <path d="M10 50h100" stroke="#7A4B00" stroke-width="4"/>
    <rect x="49" y="52" width="22" height="24" rx="4" fill="#FFD166" stroke="#7A4B00" stroke-width="3"/>
    <circle cx="60" cy="63" r="3.4" fill="#7A4B00"/>
    <circle cx="26" cy="60" r="3" fill="#7A4B00" opacity=".35"/>
    <circle cx="94" cy="60" r="3" fill="#7A4B00" opacity=".35"/>
  </svg>`;
}
export function stars(n, size = 22) {
  let out = '';
  for (let i = 0; i < 3; i++) {
    out += `<span style="color:${i < n ? 'var(--amber-400)' : 'var(--cream-200)'};filter:${i < n ? 'drop-shadow(0 2px 0 rgba(122,75,0,.25))' : 'none'}">${icon('star', size)}</span>`;
  }
  return `<span class="row" style="gap:4px;display:inline-flex;align-items:center">${out}</span>`;
}
export function pips(tier, opts = {}) {
  const cls = ['pips', opts.mint ? 'pips--mint' : '', opts.lg ? 'pips--lg' : ''].join(' ');
  let out = `<span class="${cls}" aria-label="Level ${tier} of 5">`;
  for (let i = 1; i <= 5; i++) out += `<i class="${i <= tier ? 'on' : ''}"></i>`;
  return out + '</span>';
}
export function ring(percent, o = {}) {
  const size = o.size || 56;
  const stroke = o.stroke || 7;
  const p = clamp(percent, 0, 100);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (p / 100) * c;
  const color = o.color || 'var(--coral-500)';
  const track = o.track || 'var(--cream-200)';
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
      stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/>
  </svg>`;
}

export function sayBtn(text, o = {}) {
  return `<button class="say-btn ${o.small ? 'say-btn--sm' : ''}" data-say="${esc(text)}" aria-label="Play audio" type="button">${icon('sound', o.small ? 18 : 24)}</button>`;
}

const MOODS = {
  happy: { mouth: 'M52 84q8 8 16 0', eyes: 'dot', stripe: 1 },
  cheer: {
    mouth: 'M50 82q10 12 20 0z',
    eyes: 'arc',
    stripe: 1,
    paws: true,
  },
  think: { mouth: 'M55 86h10', eyes: 'dot', stripe: 1, brow: true },
  sleepy: { mouth: 'M56 86q4 3 8 0', eyes: 'closed', stripe: 1 },
  wow: { mouth: 'M54 82q6 9 12 0z', eyes: 'big', stripe: 1 },
};

export function mascot(size = 96, mood = 'happy') {
  const m = MOODS[mood] || MOODS.happy;
  const eyes =
    m.eyes === 'arc'
      ? '<path d="M40 60q5-6 10 0M70 60q5-6 10 0" stroke="#1E1B3A" stroke-width="3.4" fill="none" stroke-linecap="round"/>'
      : m.eyes === 'closed'
        ? '<path d="M40 61h10M70 61h10" stroke="#1E1B3A" stroke-width="3.4" stroke-linecap="round"/>'
        : m.eyes === 'big'
          ? '<circle cx="45" cy="60" r="6.4" fill="#1E1B3A"/><circle cx="75" cy="60" r="6.4" fill="#1E1B3A"/><circle cx="47" cy="58" r="2.1" fill="#fff"/><circle cx="77" cy="58" r="2.1" fill="#fff"/>'
          : '<circle cx="45" cy="60" r="5" fill="#1E1B3A"/><circle cx="75" cy="60" r="5" fill="#1E1B3A"/><circle cx="46.6" cy="58.4" r="1.7" fill="#fff"/><circle cx="76.6" cy="58.4" r="1.7" fill="#fff"/>';
  const paws = m.paws
    ? '<circle cx="18" cy="96" r="11" fill="#FFF3E0" stroke="#1E1B3A" stroke-width="3.5"/><circle cx="102" cy="96" r="11" fill="#FFF3E0" stroke="#1E1B3A" stroke-width="3.5"/>'
    : '';
  const brow = m.brow ? '<path d="M70 46q8-3 13 2" stroke="#1E1B3A" stroke-width="3" fill="none" stroke-linecap="round"/>' : '';
  return `<svg class="mascot" width="${size}" height="${size}" viewBox="0 0 120 120" fill="none" aria-hidden="true">
    <ellipse cx="60" cy="112" rx="30" ry="4" fill="#1E1B3A" opacity=".08"/>
    ${paws}
    <circle cx="28" cy="34" r="16" fill="#FFF3E0" stroke="#1E1B3A" stroke-width="4"/>
    <circle cx="92" cy="34" r="16" fill="#FFF3E0" stroke="#1E1B3A" stroke-width="4"/>
    <circle cx="28" cy="34" r="8" fill="#FFAE97"/>
    <circle cx="92" cy="34" r="8" fill="#FFAE97"/>
    <ellipse cx="60" cy="66" rx="43" ry="41" fill="#FFF3E0" stroke="#1E1B3A" stroke-width="4"/>
    <path d="M48 30l3 13M60 26v13M72 30l-3 13" stroke="#C93A1C" stroke-width="6" stroke-linecap="round"/>
    <path d="M19 62l14 2M19 72l13 1M101 62l-14 2M101 72l-13 1" stroke="#C93A1C" stroke-width="5" stroke-linecap="round" opacity=".85"/>
    ${eyes}${brow}
    <ellipse cx="60" cy="84" rx="21" ry="15" fill="#FFFFFF"/>
    <path d="M55 78h10l-5 6z" fill="#FF6B4A"/>
    <path d="${m.mouth}" stroke="#1E1B3A" stroke-width="3" fill="${m.mouth.includes('z') ? '#C93A1C' : 'none'}" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="30" cy="78" r="5" fill="#FFAE97" opacity=".55"/>
    <circle cx="90" cy="78" r="5" fill="#FFAE97" opacity=".55"/>
  </svg>`;
}

const AV_STYLE = {
  tiger: { bg: '#FFD166', emoji: '🐯' },
  cat: { bg: '#FFE3DA', emoji: '🐱' },
  bear: { bg: '#F4EDE3', emoji: '🐻' },
  chick: { bg: '#FFF1C9', emoji: '🐥' },
  robot: { bg: '#ECE9FA', emoji: '🤖' },
  rabbit: { bg: '#DFF8EE', emoji: '🐰' },
};
export const AVATARS = Object.keys(AV_STYLE);
export function avatar(id = 'tiger', size = 32) {
  const a = AV_STYLE[id] || AV_STYLE.tiger;
  return `<span class="avatar" style="width:${size}px;height:${size}px;background:${a.bg};font-size:${size * 0.56}px;line-height:1" aria-hidden="true">${a.emoji}</span>`;
}
export function avatarEmoji(id) {
  return (AV_STYLE[id] || AV_STYLE.tiger).emoji;
}

export function weekStrip(daysOn = [], todayIdx = -1) {
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  // Accept either day indexes [0,2,4] or a boolean[7] from store.weekDaysActive().
  const isOn = (i) =>
    Array.isArray(daysOn) && typeof daysOn[0] === 'boolean' ? !!daysOn[i] : daysOn.includes(i);
  return `<div class="weekstrip">${labels
    .map((l, i) => `<i class="${isOn(i) ? 'on' : ''} ${i === todayIdx ? 'today' : ''}">${l}</i>`)
    .join('')}</div>`;
}

// ---------- overlays ----------
let toastWrap = null;
export function toast(msg, opts = {}) {
  if (!toastWrap) {
    toastWrap = document.createElement('div');
    toastWrap.className = 'toast-wrap';
    document.body.appendChild(toastWrap);
  }
  const el = document.createElement('div');
  el.className = 'toast' + (opts.tone ? ` toast--${opts.tone}` : '');
  el.innerHTML = `${opts.icon ? icon(opts.icon, 18) : ''}<span>${esc(msg)}</span>`;
  toastWrap.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 180ms, transform 180ms';
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px)';
    setTimeout(() => el.remove(), 200);
  }, opts.duration || 2400);
}

export function confetti(o = {}) {
  if (document.body.classList.contains('reduce-motion')) return;
  const colors = o.colors || ['#FF6B4A', '#7BE0C3', '#FFD166', '#4A3FA8', '#FFAE97'];
  const count = o.count || 28;
  const layer = document.createElement('div');
  layer.className = 'confetti-layer';
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i');
    p.className = 'confetti-piece';
    p.style.left = `${Math.random() * 100}%`;
    p.style.top = `${-10 - Math.random() * 20}px`;
    p.style.background = colors[i % colors.length];
    p.style.setProperty('--dx', `${(Math.random() - 0.5) * 180}px`);
    p.style.animationDuration = `${1100 + Math.random() * 900}ms`;
    p.style.animationDelay = `${Math.random() * 180}ms`;
    p.style.opacity = '0.95';
    if (i % 3 === 0) p.style.borderRadius = '999px';
    layer.appendChild(p);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 2400);
}

function overlay(kind, opts) {
  const scrim = document.createElement('div');
  scrim.className = 'scrim' + (kind === 'modal' ? ' scrim--center' : '');
  const box = document.createElement('div');
  box.className = kind === 'modal' ? 'modal' : 'sheet';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  const actions = (opts.actions || [])
    .map(
      (a, i) =>
        `<button class="btn ${a.cls || (i === 0 ? 'btn-primary' : 'btn-ghost')} btn-block" data-act="${i}" type="button">${esc(a.label)}</button>`
    )
    .join('');
  box.innerHTML = `${kind === 'sheet' ? '<div class="sheet-grip"></div>' : ''}
    ${opts.dismiss ? `<button class="icon-btn" data-close style="position:absolute;right:12px;top:12px">${icon('close', 20)}</button>` : ''}
    ${opts.title ? `<h2 class="center">${esc(opts.title)}</h2>` : ''}
    ${opts.body ? `<div class="mt-3">${opts.body}</div>` : ''}
    ${actions ? `<div class="stack-2 mt-5">${actions}</div>` : ''}`;
  scrim.appendChild(box);
  document.body.appendChild(scrim);
  const close = () => {
    scrim.style.transition = 'opacity 160ms';
    scrim.style.opacity = '0';
    setTimeout(() => scrim.remove(), 160);
    document.removeEventListener('keydown', onKey);
    opts.onClose?.();
  };
  function onKey(e) {
    if (e.key === 'Escape') close();
  }
  document.addEventListener('keydown', onKey);
  scrim.addEventListener('click', (e) => {
    if (e.target === scrim) close();
  });
  box.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  box.querySelectorAll('[data-act]').forEach((b) =>
    b.addEventListener('click', () => {
      const a = opts.actions[Number(b.dataset.act)];
      if (a?.keepOpen) a.onClick?.(close);
      else {
        close();
        a?.onClick?.();
      }
    })
  );
  if (opts.dismiss) {
    setTimeout(() => box.querySelector('[data-close]')?.focus(), 50);
  }
  return close;
}
export function modal(opts) {
  return overlay('modal', opts);
}
export function sheet(opts) {
  return overlay('sheet', opts);
}

export function countUp(el, from, to, ms = 600) {
  const start = performance.now();
  const delta = to - from;
  function frame(t) {
    const k = Math.min(1, (t - start) / ms);
    const eased = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(Math.round(from + delta * eased));
    if (k < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

export function el(html) {
  const d = document.createElement('div');
  d.innerHTML = html.trim();
  return d.firstElementChild;
}

export function setBar(elRef, percent) {
  if (!elRef) return;
  elRef.style.width = pct(percent) + '%';
}

export function levelBadge(level) {
  return `<span class="pill pill--indigo pill--sm" style="font-weight:800">LV ${level}</span>`;
}

export function timeAgo(ms) {
  const d = Date.now() - ms;
  const m = Math.floor(d / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function initReducedMotion(reduced) {
  document.body.classList.toggle('reduce-motion', !!reduced);
}
