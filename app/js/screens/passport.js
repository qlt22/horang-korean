// S16/S17 · Passport — 40 sentence stamps + a searchable word bank.
import { state, save, stampCount, packProgress, masteryOf } from '../core/store.js';
import * as ui from '../core/ui.js';
import * as audio from '../core/audio.js';
import router from '../core/router.js';
import { UNIT_META } from '../core/engine.js';
import { nextDueLabel, tierMeta } from '../core/srs.js';
import data from '../../data/curriculum.js';

const SENTENCES = data.sentences;
const WORDS = data.words;
const TOTAL_STAMPS = 40;
const BY_ID = Object.fromEntries(SENTENCES.map((s) => [s.id, s]));
const WORD_BY_ID = Object.fromEntries(WORDS.map((w) => [w.id, w]));
const UNIT_BY_ID = Object.fromEntries(UNIT_META.map((u) => [u.id, u]));

const SENTENCES_WITH_WORD = {};
SENTENCES.forEach((s) => {
  (s.word_ids || []).forEach((wid) => {
    if (!SENTENCES_WITH_WORD[wid]) SENTENCES_WITH_WORD[wid] = [];
    SENTENCES_WITH_WORD[wid].push(s);
  });
});

let tab = 'stamps';
let sort = 'pack';
let filter = 'all';
let query = '';

function sheetBox() {
  const all = document.querySelectorAll('.sheet');
  return all[all.length - 1] || null;
}

function bookmarks() {
  return Array.isArray(state.flags.bookmarks) ? state.flags.bookmarks : [];
}
function isBookmarked(id) {
  return bookmarks().includes(id);
}
function toggleBookmark(id) {
  const list = bookmarks().slice();
  const at = list.indexOf(id);
  if (at >= 0) list.splice(at, 1);
  else list.push(id);
  state.flags.bookmarks = list;
  save();
  return at < 0;
}

function wordTier(id) {
  const list = SENTENCES_WITH_WORD[id] || [];
  let tier = 0;
  list.forEach((s) => {
    const t = state.mastery[s.id]?.tier || 0;
    if (t > tier) tier = t;
  });
  return tier;
}

function orderedSentences() {
  const base = SENTENCES.slice();
  if (sort === 'az') return base.sort((a, b) => a.korean.localeCompare(b.korean, 'ko'));
  if (sort === 'recent') {
    return base.sort(
      (a, b) => (state.mastery[b.id]?.lastSeenAt || 0) - (state.mastery[a.id]?.lastSeenAt || 0)
    );
  }
  return base;
}

/* ---------------- stamps ---------------- */

function stampCard(id) {
  const s = BY_ID[id];
  if (!s) return '';
  const tier = state.mastery[id]?.tier || 0;
  const stamped = tier >= 3;
  return `<button class="stamp ${stamped ? 'is-stamped' : 'stamp--locked'}" data-stamp="${ui.esc(id)}" type="button"
    aria-label="${ui.esc(s.korean)} — ${stamped ? 'stamped' : 'not stamped yet'}">
    <div class="stamp-ko">${ui.esc(s.korean)}</div>
    <div class="stamp-en">${ui.esc(s.english)}</div>
    <div class="stamp-foot">${ui.pips(tier, { mint: stamped })}</div>
    ${stamped ? '<span class="stamp-seal" aria-hidden="true">STAMP</span>' : ''}
  </button>`;
}

function gridHtml() {
  if (sort === 'pack') {
    return UNIT_META.map((unit, i) => {
      const { met, total, pct } = packProgress(unit.id);
      return `<section class="pp-pack">
        <div class="pp-pack-head">
          <div class="pp-pack-ring">${ui.ring(pct, {
            size: 38,
            stroke: 5,
            color: 'var(--mint-600)',
          })}<span>${met}/${total}</span></div>
          <div class="grow">
            <div class="pp-pack-title">${ui.esc(unit.title)}</div>
            <div class="pp-pack-ko">${ui.esc(unit.koTitle || '')} · pack ${i + 1} of ${UNIT_META.length}</div>
          </div>
          <span class="pp-pack-pct">${Math.round(pct)}%</span>
        </div>
        <div class="stamp-grid">${unit.sentence_ids.map(stampCard).join('')}</div>
      </section>`;
    }).join('');
  }
  return `<div class="stamp-grid pp-flat">${orderedSentences()
    .map((s) => stampCard(s.id))
    .join('')}</div>`;
}

function stampsTab(stamps) {
  return `<div class="pp-sortrow g-rise" style="--i:3">
      <div class="tabs pp-sort" role="tablist" aria-label="Sort stamps">
        <button role="tab" aria-selected="${sort === 'recent'}" data-sort="recent" type="button">Recent</button>
        <button role="tab" aria-selected="${sort === 'az'}" data-sort="az" type="button">A–Z</button>
        <button role="tab" aria-selected="${sort === 'pack'}" data-sort="pack" type="button">Pack</button>
      </div>
    </div>
    ${
      stamps === 0
        ? `<div class="pp-empty g-rise" style="--i:4">
            ${ui.mascot(96, 'think')}
            <div class="h3 mt-2">Your first stamp is one node away.</div>
            <p class="small muted mt-2">A sentence becomes a stamp the moment it reaches Strong — three correct answers in one node.</p>
            <button class="btn btn-primary btn-sm mt-4" data-first-node type="button">${ui.icon('play', 16)} Start a node</button>
          </div>`
        : ''
    }
    <div class="g-rise" style="--i:5">${gridHtml()}</div>`;
}

/* ---------------- words ---------------- */

function wordsTab() {
  const items = WORDS.map((w) => ({ ...w, wTier: wordTier(w.id), bm: isBookmarked(w.id) }));
  const counts = { fresh: 0, learning: 0, familiar: 0, strong: 0, mastered: 0 };
  items.forEach((it) => {
    if (it.wTier === 0) counts.fresh++;
    else if (it.wTier === 1) counts.learning++;
    else if (it.wTier === 2) counts.familiar++;
    else if (it.wTier === 3) counts.strong++;
    else counts.mastered++;
  });
  const sorted = items.sort((a, b) => a.korean.localeCompare(b.korean, 'ko'));

  const pills = [
    ['Learning', counts.learning, 'pill--coral'],
    ['Familiar', counts.familiar, 'pill--amber'],
    ['Strong', counts.strong, 'pill--indigo'],
    ['Mastered', counts.mastered, 'pill--mint'],
  ]
    .map(
      ([label, n, cls]) =>
        `<span class="pill pill--sm ${cls} pp-pill"><b class="tabular">${n}</b> ${label}</span>`
    )
    .join('');

  const chips = [
    ['all', 'All'],
    ['learning', 'Learning'],
    ['mastered', 'Mastered'],
    ['book', 'Bookmarked'],
  ]
    .map(
      ([key, label]) =>
        `<button class="chip ${filter === key ? 'is-on' : ''}" data-filter="${key}" aria-pressed="${
          filter === key
        }" type="button">${label}</button>`
    )
    .join('');

  const cards = sorted
    .map(
      (it) => `<button class="word-chip ${it.wTier >= 3 ? 'is-strong' : ''}" data-word="${ui.esc(it.id)}"
        data-tier="${it.wTier}" data-book="${it.bm ? 1 : 0}"
        data-q="${ui.esc(`${it.korean} ${it.english} ${it.romanization}`.toLowerCase())}" type="button">
        <span class="wc-ko">${ui.esc(it.korean)}</span>
        <span class="wc-en">${ui.esc(it.english)}</span>
        <span class="wc-foot">${ui.pips(it.wTier)}${it.bm ? '<span class="wc-bm" aria-label="Bookmarked">★</span>' : ''}</span>
      </button>`
    )
    .join('');

  return `<div class="pp-summary g-rise" style="--i:3">${pills}</div>
    <p class="pp-summary-note g-rise" style="--i:3">${counts.fresh} new · ${items.length} words total</p>
    <div class="pp-search-wrap g-rise" style="--i:4">
      <span class="pp-search-ico" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5 21 21"/></svg>
      </span>
      <input class="pp-search" id="ppSearch" type="search" placeholder="Search Korean or English" autocomplete="off"
        aria-label="Search words" value="${ui.esc(query)}" />
    </div>
    <div class="pp-filters g-rise" style="--i:5" role="group" aria-label="Filter words">${chips}</div>
    <div class="pp-words" id="ppWords">${cards}</div>
    <p class="pp-none hide" id="ppNone">No words match that search — try a shorter word.</p>
    <p class="pp-wordcount" id="ppCount">${items.length} words</p>`;
}

/* ---------------- detail sheets ---------------- */

function stampSheet(id) {
  const s = BY_ID[id];
  if (!s) return;
  const m = masteryOf(id);
  const tier = m.tier || 0;
  const meta = tierMeta(tier);
  const bm = isBookmarked(id);

  const close = ui.sheet({
    dismiss: true,
    body: `<div class="dtl">
      <div class="dtl-hero">
        <div class="grow">
          <div class="dtl-ko">${ui.esc(s.korean)}</div>
          <div class="dtl-rom">${ui.esc(s.romanization)}</div>
        </div>
        ${ui.sayBtn(s.audio?.text || s.korean)}
      </div>
      <div class="dtl-en">${ui.esc(s.english)}</div>
      <div class="dtl-tags">
        <span class="chip chip-coral">${ui.esc(s.grammar_tag || 'grammar')}</span>
        ${
          s.register && !(s.grammar_tag || '').toLowerCase().includes(String(s.register).toLowerCase())
            ? `<span class="chip">${ui.esc(s.register)}</span>`
            : ''
        }
        ${tier >= 3 ? '<span class="chip chip-mint">Stamped</span>' : ''}
      </div>
      <div class="dtl-mastery">
        ${ui.pips(tier, { lg: true, mint: tier >= 3 })}
        <div class="grow">
          <div class="dtl-tier">${meta.label}</div>
          <div class="small muted">${m.dueAt ? `Next review ${nextDueLabel(m)}` : 'Not studied yet'}</div>
        </div>
      </div>
      <div class="dtl-label">Word by word</div>
      <ul class="gloss">
        ${(s.gloss || [])
          .map(
            (g) =>
              `<li><b>${ui.esc(g.ko)}</b><span class="gloss-rom">${ui.esc(g.rom || '')}</span><em>${ui.esc(
                g.en || ''
              )}</em></li>`
          )
          .join('')}
      </ul>
      <p class="small muted mt-2">Literally: ${ui.esc(s.gloss_literal || s.english)}</p>
      <div class="stack-2 mt-5">
        <button class="btn btn-primary btn-block" data-practice-sentence type="button">Practice this sentence</button>
        <button class="btn btn-secondary btn-block" data-bookmark type="button">${bm ? 'Bookmarked ★' : 'Bookmark'}</button>
      </div>
    </div>`,
  });
  const box = sheetBox();
  box?.querySelector('[data-practice-sentence]')?.addEventListener('click', () => {
    close();
    ui.toast('Single-sentence practice isn’t wired yet — opening your review queue.', { icon: 'refresh' });
    router.go('lesson', { kind: 'review' });
  });
  box?.querySelector('[data-bookmark]')?.addEventListener('click', (e) => {
    const on = toggleBookmark(id);
    e.currentTarget.textContent = on ? 'Bookmarked ★' : 'Bookmark';
    ui.toast(on ? 'Bookmarked — find it in Words → Bookmarked.' : 'Bookmark removed.', {
      icon: 'star',
      tone: on ? 'mint' : undefined,
    });
  });
}

function exampleHtml(s, word) {
  const needle = ui.esc(word.korean);
  const korean = ui.esc(s.korean).split(needle).join(`<mark class="pp-mark">${needle}</mark>`);
  return `<button class="dtl-ex" data-say="${ui.esc(s.audio?.text || s.korean)}" type="button">
    <span class="dtl-ex-ko">${korean}</span>
    <span class="dtl-ex-en">${ui.esc(s.english)}</span>
  </button>`;
}

function wordSheet(id) {
  const w = WORD_BY_ID[id];
  if (!w) return;
  const tier = wordTier(id);
  const meta = tierMeta(tier);
  const examples = (SENTENCES_WITH_WORD[id] || []).slice(0, 3);
  const unit = UNIT_BY_ID[w.unit_id];
  const bm = isBookmarked(id);

  const close = ui.sheet({
    dismiss: true,
    body: `<div class="dtl">
      <div class="dtl-hero">
        <div class="grow">
          <div class="dtl-ko">${ui.esc(w.korean)}</div>
          <div class="dtl-rom">${ui.esc(w.romanization)}</div>
        </div>
        ${ui.sayBtn(w.korean)}
      </div>
      <div class="dtl-en">${ui.esc(w.english)}</div>
      <div class="dtl-tags">
        <span class="chip chip-coral">${ui.esc(w.pos || 'word')}</span>
        ${unit ? `<span class="chip">${ui.esc(unit.title)}</span>` : ''}
        ${w.word_card ? '<span class="chip chip-amber">Word card</span>' : ''}
      </div>
      <div class="dtl-mastery">
        ${ui.pips(tier, { lg: true })}
        <div class="grow">
          <div class="dtl-tier">${meta.label}</div>
          <div class="small muted">${
            tier ? 'From the sentences you’ve practised' : 'Not seen in a sentence yet'
          }</div>
        </div>
      </div>
      <div class="dtl-label">Appears in</div>
      ${
        examples.length
          ? `<div class="dtl-examples">${examples.map((s) => exampleHtml(s, w)).join('')}</div>`
          : `<p class="small muted">No example sentence in this pack yet.</p>`
      }
      <div class="stack-2 mt-5">
        <button class="btn btn-primary btn-block" data-practice-word type="button">Practice in review</button>
        <button class="btn btn-secondary btn-block" data-bookmark type="button">${bm ? 'Bookmarked ★' : 'Bookmark'}</button>
      </div>
    </div>`,
  });
  const box = sheetBox();
  box?.querySelector('[data-practice-word]')?.addEventListener('click', () => {
    close();
    ui.toast('Opening review — the sentences with this word are queued first.', { icon: 'refresh' });
    router.go('lesson', { kind: 'review' });
  });
  box?.querySelector('[data-bookmark]')?.addEventListener('click', (e) => {
    const on = toggleBookmark(id);
    e.currentTarget.textContent = on ? 'Bookmarked ★' : 'Bookmark';
    ui.toast(on ? 'Word bookmarked.' : 'Bookmark removed.', { icon: 'star', tone: on ? 'mint' : undefined });
  });
}

/* ---------------- screen ---------------- */

export default {
  id: 'passport',
  title: 'Passport',
  nav: 'passport',
  hideNav: false,

  render(params) {
    if (params?.tab === 'words' || params?.tab === 'stamps') tab = params.tab;
    const stamps = stampCount();
    const name = (state.profile.name || 'Lucas').trim() || 'Lucas';
    const pct = Math.min(100, (stamps / TOTAL_STAMPS) * 100);
    const bonus = state.flags.sentence0
      ? `<span class="chip pp-bonus">★ First Words — ${ui.esc(`저는 ${name}입니다`)}</span>`
      : '';

    return `<section class="screen passport">
      <header class="top g-rise" style="--i:0">
        <h1 class="screen-title">Passport</h1>
        <span class="pp-head">${stamps} / ${TOTAL_STAMPS} stamps</span>
      </header>

      <div class="pp-hero g-rise" style="--i:1">
        <div class="pp-book" aria-hidden="true">
          <svg viewBox="0 0 62 78" width="56" height="70" fill="none">
            <rect class="pp-book-cover" x="3" y="2" width="56" height="74" rx="8" stroke-width="2.5" />
            <rect class="pp-book-inner" x="9" y="9" width="44" height="60" rx="4" />
            <circle class="pp-book-line" cx="31" cy="27" r="10" stroke-width="1.8" />
            <path class="pp-book-star" d="M31 19.5l2.2 4.5 5 .7-3.6 3.5.8 5-4.4-2.4-4.4 2.4.8-5-3.6-3.5 5-.7z" />
            <path class="pp-book-line" d="M18 44h26M18 50h18" stroke-width="1.8" stroke-linecap="round" />
            <text class="pp-book-text" x="31" y="65" text-anchor="middle" font-size="7.5" font-weight="800">SEOUL</text>
          </svg>
        </div>
        <div class="grow">
          <div class="pp-kicker">Seoul Passport</div>
          <div class="pp-count">${stamps}<span> / ${TOTAL_STAMPS}</span></div>
          <div class="bar bar--thick pp-bar"><i style="width:${pct}%"></i></div>
          <div class="pp-togo">${
            stamps >= TOTAL_STAMPS ? 'Complete — all 40 sentences are yours.' : `${TOTAL_STAMPS - stamps} to go`
          }</div>
          ${bonus}
        </div>
      </div>

      <div class="tabs pp-tabs g-rise" style="--i:2" role="tablist" aria-label="Passport sections">
        <button role="tab" aria-selected="${tab === 'stamps'}" data-pptab="stamps" type="button">Stamps</button>
        <button role="tab" aria-selected="${tab === 'words'}" data-pptab="words" type="button">Words</button>
      </div>

      ${tab === 'stamps' ? stampsTab(stamps) : wordsTab()}
    </section>`;
  },

  mount(root) {
    root.querySelectorAll('[data-pptab]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const next = btn.dataset.pptab;
        if (next === tab) return;
        tab = next;
        audio.sfx('tap');
        router.refresh();
      })
    );

    root.querySelectorAll('[data-sort]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const next = btn.dataset.sort;
        if (next === sort) return;
        sort = next;
        audio.sfx('tap');
        router.refresh();
      })
    );

    root.querySelector('[data-first-node]')?.addEventListener('click', () => {
      router.go('lesson', { node: 0 });
    });

    const grid = root.querySelector('#ppWords');
    if (grid) {
      const input = root.querySelector('#ppSearch');
      const none = root.querySelector('#ppNone');
      const count = root.querySelector('#ppCount');
      const chips = [...grid.querySelectorAll('.word-chip')];
      const apply = () => {
        const q = (input?.value || '').trim().toLowerCase();
        let shown = 0;
        chips.forEach((chip) => {
          const tier = Number(chip.dataset.tier || 0);
          const bookmarked = chip.dataset.book === '1';
          const matchQuery = !q || (chip.dataset.q || '').includes(q);
          const matchFilter =
            filter === 'all' ||
            (filter === 'learning' && tier < 4) ||
            (filter === 'mastered' && tier >= 4) ||
            (filter === 'book' && bookmarked);
          const show = matchQuery && matchFilter;
          chip.classList.toggle('hide', !show);
          if (show) shown++;
        });
        if (none) none.classList.toggle('hide', shown > 0);
        if (count) count.textContent = `${shown} of ${chips.length} words`;
      };
      query = input?.value || '';
      input?.addEventListener('input', () => {
        query = input.value;
        apply();
      });
      root.querySelectorAll('[data-filter]').forEach((btn) =>
        btn.addEventListener('click', () => {
          filter = btn.dataset.filter;
          root.querySelectorAll('[data-filter]').forEach((b) => {
            const on = b.dataset.filter === filter;
            b.classList.toggle('is-on', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
          });
          apply();
        })
      );
      apply();
    }

    const openStamp = (el) => {
      const id = el.dataset.stamp;
      if (id) stampSheet(id);
    };
    const openWord = (el) => {
      const id = el.dataset.word;
      if (id) wordSheet(id);
    };
    root.querySelectorAll('[data-stamp]').forEach((el) =>
      el.addEventListener('click', () => openStamp(el))
    );
    root.querySelectorAll('.word-chip[data-word]').forEach((el) =>
      el.addEventListener('click', () => openWord(el))
    );
  },

  destroy() {},
};
