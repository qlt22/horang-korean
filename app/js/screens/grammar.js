// W4 · Grammar — the 48 A1 patterns, grouped by unit, with bundled audio.
// A pattern is "seen" when any sentence that teaches it has mastery tier ≥ 1.
import { state } from '../core/store.js';
import * as ui from '../core/ui.js';
import * as audio from '../core/audio.js';
import { router } from '../core/router.js';
import {
  GRAMMAR,
  SENTENCES,
  UNITS,
  UNIT_BY_ID,
  lessonsOf,
  lessonUnlocked,
} from '../core/course.js';

let rootEl = null;
let query = '';
let unitFilter = 'all';
const expanded = new Set();

// ---------- derived state ----------
function seenGrammar() {
  const seen = new Set();
  for (const s of SENTENCES) {
    if ((state.mastery?.[s.id]?.tier || 0) >= 1) {
      (s.grammarIds || []).forEach((id) => seen.add(id));
    }
  }
  return seen;
}

function grammarFor(unitId) {
  return GRAMMAR.filter((g) => g.unitId === unitId).sort((a, b) => a.order - b.order);
}

function matches(g, q) {
  if (!q) return true;
  const unit = UNIT_BY_ID[g.unitId];
  const hay = [
    g.pattern,
    g.ko,
    g.label,
    g.explanation,
    g.mistake,
    unit?.title,
    unit?.ko,
    ...(g.examples || []).flatMap((ex) => [ex.ko, ex.en]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

function visibleUnits() {
  const q = query.trim().toLowerCase();
  return UNITS.filter((u) => unitFilter === 'all' || u.id === unitFilter)
    .map((u) => ({
      unit: u,
      cards: grammarFor(u.id).filter((g) => matches(g, q)),
    }))
    .filter((x) => x.cards.length);
}

function matchCount() {
  return visibleUnits().reduce((n, x) => n + x.cards.length, 0);
}

function patternWord(n) {
  return `${n} pattern${n === 1 ? '' : 's'}`;
}

// ---------- header + chrome ----------
function headerHTML() {
  return `<div class="top">
    <div class="top-left">
      <button class="icon-btn" data-back="home" type="button" aria-label="Back">${ui.icon('back', 22)}</button>
      <h1 class="screen-title">Grammar</h1>
    </div>
    <span class="pill pill--sm pill--indigo">${GRAMMAR.length} patterns · A1</span>
  </div>`;
}

function introHTML() {
  return `<div class="gintro">
    <span class="gintro-mark" aria-hidden="true">문</span>
    <div class="gintro-copy">
      <span class="overline">The method</span>
      <p>One pattern at a time, always inside a real sentence.</p>
    </div>
  </div>`;
}

function progressHTML(seen) {
  const total = GRAMMAR.length;
  const count = GRAMMAR.filter((g) => seen.has(g.id)).length;
  return `<div class="gprog card">
    <div class="row-between">
      <span class="overline">Patterns seen</span>
      <b class="gprog-num">${count} <span>/ ${total}</span></b>
    </div>
    <div class="bar mt-2"><i style="width:${total ? (count / total) * 100 : 0}%"></i></div>
    <p class="small muted gprog-note">Seen means one sentence using the pattern has reached tier 1.</p>
  </div>`;
}

function filtersHTML() {
  return `<div class="gfilters">
    <label class="lt-search">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>
      <input type="search" data-gsearch value="${ui.esc(query)}" placeholder="Search pattern, meaning or example" autocomplete="off" aria-label="Search grammar patterns" />
    </label>
    <div class="lt-chips" role="group" aria-label="Filter by unit">
      <button class="chip" data-gunit="all" type="button" aria-pressed="${unitFilter === 'all'}">All units</button>
      ${UNITS.map(
        (u) =>
          `<button class="chip" data-gunit="${u.id}" type="button" aria-pressed="${
            unitFilter === u.id
          }" title="${ui.esc(u.title)}">U${String(u.order).padStart(2, '0')}</button>`
      ).join('')}
    </div>
    <div class="row-between gcount-row">
      <span class="small muted" data-gcount>${patternWord(matchCount())}</span>
      <button class="glink glink--inline" data-act="clear" type="button">Clear filters</button>
    </div>
  </div>`;
}

// ---------- unit + cards ----------
function badgeHTML(unit) {
  const earned = (state.badges || []).includes(unit.id);
  return earned
    ? `<span class="gbadge gbadge--earned">${ui.icon('check', 13)} Badge earned</span>`
    : `<span class="gbadge gbadge--locked">${ui.icon('lock', 13)} Badge locked</span>`;
}

function unitHeaderHTML(unit, cards) {
  return `<header class="gunit-head">
    <div class="gunit-title">
      <span class="gunit-num">${String(unit.order).padStart(2, '0')}</span>
      <div class="gunit-names">
        <h2 class="gunit-name" id="gunit-${unit.id}">${ui.esc(unit.title)}</h2>
        <span class="gunit-ko">${ui.esc(unit.ko)} · ${cards.length} pattern${cards.length === 1 ? '' : 's'}</span>
      </div>
    </div>
    ${badgeHTML(unit)}
  </header>
  <ul class="gcando">
    ${(unit.canDo || []).slice(0, 2).map((c) => `<li>${ui.esc(c)}</li>`).join('')}
  </ul>`;
}

function examplesHTML(g) {
  return `<div class="gexamples" aria-label="Examples">
    ${(g.examples || [])
      .map(
        (ex, i) => `<div class="gex">
          <button class="say-btn say-btn--sm" data-clip="${ui.esc(`${g.id}_${i + 1}`)}" data-clip-kind="g" data-say="${ui.esc(
          ex.ko
        )}" type="button" aria-label="Play example ${i + 1}">${ui.icon('sound', 18)}</button>
          <span class="gex-text">
            <span class="gex-ko ko">${ui.esc(ex.ko)}</span>
            <span class="gex-en">${ui.esc(ex.en)}</span>
          </span>
        </div>`
      )
      .join('')}
  </div>`;
}

function cardHTML(g, unit, seen) {
  const open = expanded.has(g.id);
  const isSeen = seen.has(g.id);
  return `<article class="gcard ${open ? 'is-open' : ''} ${isSeen ? 'is-seen' : ''}" data-gcard="${g.id}">
    <button class="gcard-head" data-gtoggle="${g.id}" type="button" aria-expanded="${open}" aria-controls="gbody-${g.id}">
      <span class="gcard-top">
        <span class="gchip">${ui.esc(g.pattern)}</span>
        <span class="gcard-flags">
          ${isSeen ? `<span class="gseen">Seen</span>` : ''}
          <span class="gchev" aria-hidden="true">${ui.icon('chevron', 18)}</span>
        </span>
      </span>
      <span class="gko-row">
        <span class="gko ko">${ui.esc(g.ko)}</span>
        <span class="glabel">${ui.esc(g.label || '')}</span>
      </span>
      <span class="gexpl">${ui.esc(g.explanation)}</span>
      <span class="gpeek">${ui.icon('sound', 13)} ${(g.examples || []).length} examples · tap for detail</span>
    </button>
    <div class="gcard-body" id="gbody-${g.id}">
      ${examplesHTML(g)}
      ${
        g.mistake
          ? `<p class="gmistake"><b>Common mistake</b>${ui.esc(g.mistake)}</p>`
          : ''
      }
      <button class="glink" data-practise="${unit.id}" type="button">
        Practise Unit ${unit.order} ${ui.icon('arrow', 16)}
      </button>
    </div>
  </article>`;
}

function unitHTML(unit, cards, seen) {
  return `<section class="gunit" aria-labelledby="gunit-${unit.id}">
    ${unitHeaderHTML(unit, cards)}
    <div class="gcards">
      ${cards.map((g) => cardHTML(g, unit, seen)).join('')}
    </div>
  </section>`;
}

function listHTML() {
  const seen = seenGrammar();
  const groups = visibleUnits();
  if (!groups.length) {
    return `<div class="gempty">
      <span class="gempty-ico">${ui.icon('book', 26)}</span>
      <b>No patterns match.</b>
      <p class="small muted">Try “particle”, “past” or clear the unit filter.</p>
      <button class="btn btn-secondary btn-sm" data-act="clear" type="button">Clear filters</button>
    </div>`;
  }
  return groups.map(({ unit, cards }) => unitHTML(unit, cards, seen)).join('');
}

// ---------- interactions ----------
function refreshList() {
  if (!rootEl) return;
  const list = rootEl.querySelector('[data-glist]');
  if (list) list.innerHTML = listHTML();
  const count = rootEl.querySelector('[data-gcount]');
  if (count) count.textContent = `${patternWord(matchCount())}`;
}

function toggleCard(id) {
  if (!id) return;
  const open = !expanded.has(id);
  if (open) expanded.add(id);
  else expanded.delete(id);
  if (!rootEl) return;
  const card = [...rootEl.querySelectorAll('[data-gcard]')].find(
    (el) => el.dataset.gcard === id
  );
  if (!card) return;
  card.classList.toggle('is-open', open);
  card.querySelector('[data-gtoggle]')?.setAttribute('aria-expanded', String(open));
  audio.sfx('tap');
}

function clearFilters() {
  query = '';
  unitFilter = 'all';
  const input = rootEl?.querySelector('[data-gsearch]');
  if (input) input.value = '';
  refreshList();
  rootEl?.querySelectorAll('[data-gunit]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.gunit === 'all'));
  });
}

function practiseUnit(unitId) {
  const unit = UNIT_BY_ID[unitId];
  if (!unit) return;
  const first = lessonsOf(unit.id).slice().sort((a, b) => a.order - b.order)[0];
  if (!first) return;
  // Grammar is reference material for the whole course; opening a locked
  // lesson would strand the learner on a dead "still locked" screen.
  if (!lessonUnlocked(first.nodeIndex, state.path?.completedNodes || [])) {
    ui.toast(`Unit ${unit.order} opens after Unit ${Math.max(1, unit.order - 1)}’s lessons.`, {
      icon: 'lock',
    });
    return;
  }
  router.go('lesson', { node: first.nodeIndex });
}

export default {
  id: 'grammar',
  title: 'Grammar',
  nav: null,
  hideNav: false,
  render() {
    return `<section class="screen grammar">
      ${headerHTML()}
      ${introHTML()}
      ${progressHTML(seenGrammar())}
      ${filtersHTML()}
      <div class="glist" data-glist>${listHTML()}</div>
    </section>`;
  },
  mount(root) {
    rootEl = root;
    ui.initReducedMotion(state.settings.reducedMotion);

    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-clip]')) return; // router handles bundled audio

      const toggle = e.target.closest('[data-gtoggle]');
      if (toggle) return toggleCard(toggle.dataset.gtoggle);

      const practise = e.target.closest('[data-practise]');
      if (practise) return practiseUnit(practise.dataset.practise);

      const act = e.target.closest('[data-act]');
      if (act?.dataset.act === 'clear') {
        if (!query.trim() && unitFilter === 'all') {
          ui.toast('Filters are already clear', { icon: 'check' });
          return;
        }
        return clearFilters();
      }

      const chip = e.target.closest('[data-gunit]');
      if (chip) {
        unitFilter = chip.dataset.gunit;
        root.querySelectorAll('[data-gunit]').forEach((b) => {
          b.setAttribute('aria-pressed', String(b.dataset.gunit === unitFilter));
        });
        refreshList();
      }
    });

    root.addEventListener('input', (e) => {
      if (!e.target.matches('[data-gsearch]')) return;
      query = e.target.value;
      refreshList();
    });

    // Fresh visit starts with no filters; expanded cards are intentionally kept.
    query = '';
    unitFilter = 'all';
    const input = root.querySelector('[data-gsearch]');
    if (input) input.value = '';
    root.querySelectorAll('[data-gunit]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.gunit === 'all'));
    });
    refreshList();
  },
  destroy() {
    rootEl = null;
    query = '';
    unitFilter = 'all';
    expanded.clear();
  },
};
