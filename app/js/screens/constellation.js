// Skill Constellation — a non-linear mastery map over the 48 grammar patterns.
import { state } from '../core/store.js';
import {
  ensureEngagement,
  constellationClusters,
  constellationNodes,
  markConstellationPractice,
  mode,
  setMode,
} from '../core/engagement.js';
import { grammarOf } from '../core/course.js';
import * as ui from '../core/ui.js';
import * as audio from '../core/audio.js';
import { router } from '../core/router.js';

const SIZE = 480;

function strengthColor(n) {
  if (n.strength >= 0.75) return 'var(--mint-600)';
  if (n.strength > 0) return 'var(--coral-500)';
  return 'var(--indigo-600)';
}

function nodeMarkup(n) {
  const r = n.unlocked ? 12 + n.strength * 5 : 9;
  const lit = n.strength > 0;
  return `<g class="cs-node ${n.unlocked ? '' : 'is-locked'} ${lit ? 'is-lit' : ''}" data-gnode="${n.id}" tabindex="0" role="button" aria-label="${ui.esc(n.ko)}">
    ${lit ? `<circle cx="${n.x}" cy="${n.y}" r="${r + 7}" fill="${strengthColor(n)}" opacity="${0.1 + n.strength * 0.14}"/>` : ''}
    <circle cx="${n.x}" cy="${n.y}" r="${r}" fill="${lit ? strengthColor(n) : 'var(--cream-100)'}"
      stroke="${n.unlocked ? 'var(--indigo-700)' : 'var(--line-strong)'}" stroke-width="${lit ? 2 : 2.5}" opacity="${n.unlocked ? 1 : 0.55}"/>
    ${lit ? `<circle cx="${n.x}" cy="${n.y}" r="${Math.max(3, r * 0.32)}" fill="var(--cream-50)" opacity=".9"/>` : ''}
    <title>${ui.esc(n.ko)} — ${n.met}/${n.total} met</title>
  </g>`;
}

function svgMarkup() {
  const clusters = constellationClusters();
  const edges = [];
  clusters.forEach((c) => {
    const cx = c.nodes.reduce((a, n) => a + n.x, 0) / c.nodes.length;
    const cy = c.nodes.reduce((a, n) => a + n.y, 0) / c.nodes.length;
    const ns = [...c.nodes].sort(
      (a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx)
    );
    for (let i = 0; i < ns.length; i++) {
      const a = ns[i];
      const b = ns[(i + 1) % ns.length];
      edges.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="var(--line-strong)" stroke-width="1.2" opacity=".7"/>`);
      edges.push(`<line x1="${c.x}" y1="${c.y}" x2="${a.x}" y2="${a.y}" stroke="var(--line)" stroke-width="1" stroke-dasharray="2 4" opacity=".55"/>`);
    }
  });
  for (let i = 0; i < clusters.length; i++) {
    const a = clusters[i];
    const b = clusters[(i + 1) % clusters.length];
    edges.push(`<path d="M ${a.x} ${a.y} Q 240 240 ${b.x} ${b.y}" fill="none" stroke="var(--line)" stroke-width="1" opacity=".55"/>`);
  }
  const labels = clusters
    .map(
      (c) => `<g class="cs-cluster ${c.unlocked ? '' : 'is-locked'}" data-cluster="${c.unit.id}">
        <circle cx="${c.x}" cy="${c.y}" r="14" fill="${c.unlocked ? 'var(--indigo-900)' : 'var(--cream-200)'}"/>
        <text x="${c.x}" y="${c.y + 4}" text-anchor="middle" font-size="10" font-weight="800" fill="${c.unlocked ? 'var(--cream-50)' : 'var(--ink-300)'}">${c.unit.order}</text>
        <text x="${c.x}" y="${c.y + 28}" text-anchor="middle" font-size="9" font-weight="700" fill="var(--ink-500)">${ui.esc(c.unit.ko)}</text>
      </g>`
    )
    .join('');
  return `<svg class="cs-map" viewBox="0 0 ${SIZE} ${SIZE}" role="img" aria-label="Grammar constellation">
    <defs>
      <radialGradient id="csGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#4A3FA8" stop-opacity=".16"/>
        <stop offset="100%" stop-color="#4A3FA8" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="240" cy="240" r="230" fill="url(#csGlow)"/>
    ${edges.join('')}
    ${labels}
    ${constellationNodes().map(nodeMarkup).join('')}
  </svg>`;
}

function grammarSheet(id) {
  const n = constellationNodes().find((x) => x.id === id);
  if (!n) return;
  const g = grammarOf(n.unitId).find((x) => x.id === id) || n;
  const examples = (g.examples || [])
    .map(
      (ex, i) => `<div class="cs-example">
        <button class="say-btn say-btn--sm" data-clip="${g.id}_${i + 1}" data-clip-kind="g" data-say="${ui.esc(ex.ko)}" aria-label="Hear example">${ui.icon('sound', 16)}</button>
        <div><b lang="ko">${ui.esc(ex.ko)}</b><span>${ui.esc(ex.en)}</span></div>
      </div>`
    )
    .join('');
  ui.sheet({
    title: g.ko,
    body: `<div class="cs-sheet">
      <div class="cs-pattern">${ui.esc(g.pattern)}</div>
      <p class="cs-explain">${ui.esc(g.explanation)}</p>
      <div class="cs-strength">
        <span class="lab-k">Mastery</span>
        <b>${n.met} / ${n.total} sentences met</b>
        <span class="small muted">${n.strong} strong · ${n.unitKo} ${ui.esc(n.unitTitle)}</span>
        <div class="bar bar--thin bar--mint mt-2"><i style="width:${ui.pct(n.strength * 100)}%"></i></div>
      </div>
      <div class="cs-examples">${examples}</div>
      ${g.mistake ? `<p class="cs-mistake">${ui.esc(g.mistake)}</p>` : ''}
      <button class="btn btn-primary btn-block mt-4" data-practise="${g.id}" type="button">Practise ${Math.min(6, n.total)} sentences</button>
    </div>`,
    actions: [{ label: 'Close', cls: 'btn-ghost' }],
  });
  const btn = document.querySelector(`[data-practise="${g.id}"]`);
  btn?.addEventListener('click', () => {
    markConstellationPractice(g.id);
    audio.sfx('tap');
    router.go('lesson', { kind: 'practice', grammarId: g.id });
  });
}

export default {
  id: 'constellation',
  title: 'Skill Constellation',
  nav: null,
  hideNav: true,
  render() {
    ensureEngagement();
    const nodes = constellationNodes();
    const lit = nodes.filter((n) => n.strength > 0).length;
    const strong = nodes.filter((n) => n.strength >= 0.75).length;
    const active = mode() === 'constellation';
    return `<section class="screen constellation">
      <div class="labhub-top">
        <button class="icon-btn" data-back="lab" type="button" aria-label="Back">${ui.icon('back', 22)}</button>
        <div class="grow">
          <span class="overline">Alternative 01</span>
          <h1 class="h2">Skill Constellation</h1>
        </div>
        <span class="pill pill--indigo pill--sm">${lit}/48 lit</span>
      </div>

      ${!active ? `<div class="lab-preview-banner"><b>Preview mode.</b><span>Activate to earn the role-free mastery bonuses.</span><button class="btn btn-primary btn-sm" data-activate type="button">Activate</button></div>` : `<div class="lab-active-banner">Running: <b>Skill Constellation</b> — pick any star you can reach.</div>`}

      <div class="cs-hero">
        <p>Each star is one grammar pattern. Light it by meeting any sentence that uses it; the glow grows with strength. No fixed order inside a unit.</p>
        <div class="cs-legend">
          <span><i class="cs-dot cs-dot--lit"></i>met</span>
          <span><i class="cs-dot cs-dot--strong"></i>strong</span>
          <span><i class="cs-dot"></i>unlit</span>
          <span><i class="cs-dot cs-dot--lock"></i>locked</span>
        </div>
      </div>

      <div class="cs-canvas">${svgMarkup()}</div>

      <div class="cs-stats">
        <div><span class="lab-k">Stars lit</span><b>${lit} / 48</b></div>
        <div><span class="lab-k">Full strength</span><b>${strong}</b></div>
        <div><span class="lab-k">Sentences met</span><b>${nodes.reduce((a, n) => a + n.met, 0)}</b></div>
      </div>

      <div class="card lab-why">
        <h3>Why this might retain better</h3>
        <p><b>Autonomy</b> — the learner chooses the next star instead of following a queue. <b>Mastery is visible</b> as light, not a number. <b>No single bottleneck</b> — a learner who dislikes dialogue can still progress on particles.</p>
        <p class="small muted">Risk: too much choice for a total beginner. The current unit always glows first, and every star opens with its pattern and two examples.</p>
      </div>

      <button class="btn btn-primary btn-block" data-go="home" type="button">Back to the course ${ui.icon('arrow', 18)}</button>
    </section>`;
  },
  mount(root) {
    root.querySelectorAll('[data-gnode]').forEach((el) => {
      const open = () => {
        audio.sfx('tap');
        grammarSheet(el.dataset.gnode);
      };
      el.addEventListener('click', open);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      });
    });
    root.querySelector('[data-activate]')?.addEventListener('click', () => {
      setMode('constellation');
      audio.sfx('levelup');
      ui.toast('Skill Constellation activated', { icon: 'sparkle', tone: 'mint' });
      router.refresh();
    });
  },
};
