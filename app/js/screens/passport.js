// Collection (route: passport) — the A1 library: 288 sentences · 576 words · 12 badges.
// Everything is derived from state; the sentence list renders 24 cards at a time.
import {
  state,
  save,
  masteryOf,
  recordWord,
  dueWords,
  knownWordCount,
} from '../core/store.js';
import {
  SENTENCES,
  WORDS,
  UNITS,
  SENTENCE_BY_ID,
  WORD_BY_ID,
  UNIT_BY_ID,
  GRAMMAR_BY_ID,
  lessonsOf,
} from '../core/course.js';
import { tierMeta, nextDueLabel } from '../core/srs.js';
import * as ui from '../core/ui.js';
import * as audio from '../core/audio.js';
import router from '../core/router.js';

const PAGE = 24;
const TOTAL_S = SENTENCES.length;
const TOTAL_W = WORDS.length;
const UNIT_COUNT = UNITS.length;

const UNIT_ORDER = Object.fromEntries(UNITS.map((u) => [u.id, u.order]));
const SENT_INDEX = new Map(SENTENCES.map((s, i) => [s.id, i]));
const BADGE_TONES = ['coral', 'indigo', 'mint', 'amber'];

// word id → the sentences that use it (built once; 576 × 288 is tiny)
const WORD_SENTENCES = new Map();
SENTENCES.forEach((s) => {
  (s.wordIds || []).forEach((wid) => {
    if (!WORD_SENTENCES.has(wid)) WORD_SENTENCES.set(wid, []);
    WORD_SENTENCES.get(wid).push(s);
  });
});

// ---------- view state (survives a trip to another screen) ----------
let tab = 'sentences'; // sentences | words | badges
let sq = '';
let sfilter = 'all'; // all | met | strong | locked
let ssort = 'unit'; // unit | recent | az
let sShown = PAGE;
let wq = '';
let wunit = 'all';
let wShown = PAGE;
// Which `?tab=` value this screen has already honoured. Without this, a
// router.refresh() (e.g. after "I know this") would re-apply the URL's original
// tab and yank the user away from the tab they are actually on.
let appliedRouteTab = null;

// ---------- tiny helpers ----------
const esc = ui.esc;
const tierOf = (id) => state.mastery[id]?.tier || 0;
const wordTier = (id) => state.wordMastery[id]?.tier || 0;

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function romOn() {
  return state.settings?.romanization !== 'never';
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

function sheetBox() {
  const all = document.querySelectorAll('.sheet');
  return all[all.length - 1] || null;
}

/** Sentences met / strong for a unit — always from live mastery. */
function unitStats(unitId) {
  const list = SENTENCES.filter((s) => s.unitId === unitId);
  let met = 0;
  let strong = 0;
  list.forEach((s) => {
    const t = tierOf(s.id);
    if (t >= 1) met++;
    if (t >= 3) strong++;
  });
  return { met, strong, total: list.length };
}

function courseSort(a, b) {
  const ua = UNIT_ORDER[a.unitId] || 0;
  const ub = UNIT_ORDER[b.unitId] || 0;
  if (ua !== ub) return ua - ub;
  return a.id.localeCompare(b.id);
}

function counts() {
  let met = 0;
  let strong = 0;
  SENTENCES.forEach((s) => {
    const t = tierOf(s.id);
    if (t >= 1) met++;
    if (t >= 3) strong++;
  });
  const badges = UNITS.filter((u) => (state.badges || []).includes(u.id)).length;
  return { met, strong, badges, pctMet: TOTAL_S ? (met / TOTAL_S) * 100 : 0, pctStrong: TOTAL_S ? (strong / TOTAL_S) * 100 : 0 };
}

function examBest() {
  // exam.js stores raw marks in flags.a1Exam; Profile/Collection speak percent.
  const a1 = state.flags?.a1Exam;
  if (a1 && typeof a1.score === 'number') {
    return Math.round((a1.score / (a1.total || 30)) * 100);
  }
  const candidates = [
    state.exam?.best,
    state.exam?.score,
    state.examResult?.best,
    state.examResult?.score,
    state.flags?.examBest,
    state.flags?.examScore,
  ];
  const n = candidates.find((v) => typeof v === 'number' && Number.isFinite(v));
  return typeof n === 'number' ? n : null;
}

// ---------- sentences ----------
function sentFiltered() {
  const q = sq.trim().toLowerCase();
  const list = SENTENCES.filter((s) => {
    const t = tierOf(s.id);
    if (sfilter === 'met' && t < 1) return false;
    if (sfilter === 'strong' && t < 3) return false;
    if (sfilter === 'locked' && t !== 0) return false;
    if (!q) return true;
    return `${s.korean} ${s.romanization || ''} ${s.english}`.toLowerCase().includes(q);
  });
  if (ssort === 'recent') {
    return list.sort(
      (a, b) =>
        (state.mastery[b.id]?.lastSeenAt || 0) - (state.mastery[a.id]?.lastSeenAt || 0) ||
        SENT_INDEX.get(a.id) - SENT_INDEX.get(b.id)
    );
  }
  if (ssort === 'az') return list.sort((a, b) => a.english.localeCompare(b.english));
  return list.sort(courseSort);
}

function sentenceCard(s) {
  const t = tierOf(s.id);
  const strong = t >= 3;
  const unmet = t === 0;
  const label = strong
    ? `${s.korean} — Strong`
    : unmet
      ? `${s.korean} — not met yet`
      : `${s.korean} — level ${t} of 5`;
  return `<button class="cl-card ${strong ? 'is-strong' : ''} ${unmet ? 'is-unmet' : ''}" type="button"
    data-sentence="${esc(s.id)}" aria-label="${esc(label)}">
    <span class="cl-ko">${esc(s.korean)}</span>
    <span class="cl-en">${esc(s.english)}</span>
    <span class="cl-foot">
      ${ui.pips(t, { mint: strong })}
      <span class="cl-state">${unmet ? 'Not met yet' : ''}</span>
    </span>
    ${strong ? '<span class="cl-seal" aria-hidden="true">STRONG</span>' : ''}
  </button>`;
}

function unitHead(unit) {
  const st = unitStats(unit.id);
  return `<header class="cl-unit-head">
    <span class="cl-unit-no" aria-hidden="true">${String(unit.order).padStart(2, '0')}</span>
    <span class="grow">
      <span class="cl-unit-ko">${esc(unit.ko)}</span>
      <span class="cl-unit-title">${esc(unit.title)}</span>
    </span>
    <span class="cl-unit-count ${st.met === st.total ? 'is-done' : ''}">${st.met}/${st.total}</span>
  </header>`;
}

function sentenceListHtml(list, shown) {
  if (!list.length) {
    return `<div class="cl-empty">
      <div class="h3">Nothing here yet.</div>
      <p class="small muted mt-2">${
        sq.trim() || sfilter !== 'all'
          ? 'No sentence matches that search and filter. Try a shorter word.'
          : 'Finish a lesson and your first sentences will land here.'
      }</p>
      ${
        sq.trim() || sfilter !== 'all'
          ? '<button class="btn btn-secondary btn-sm mt-4" type="button" data-clear-s>Clear filters</button>'
          : '<button class="btn btn-primary btn-sm mt-4" type="button" data-go="home">Back to Learn</button>'
      }
    </div>`;
  }

  if (ssort !== 'unit') {
    return `<div class="cl-grid">${shown.map(sentenceCard).join('')}</div>`;
  }

  const groups = new Map();
  shown.forEach((s) => {
    if (!groups.has(s.unitId)) groups.set(s.unitId, []);
    groups.get(s.unitId).push(s);
  });
  return [...groups.entries()]
    .map(([unitId, arr]) => {
      const u = UNIT_BY_ID[unitId];
      if (!u) return '';
      return `<section class="cl-unit">
        ${unitHead(u)}
        <div class="cl-grid">${arr.map(sentenceCard).join('')}</div>
      </section>`;
    })
    .join('');
}

function sentenceBodyHtml() {
  const list = sentFiltered();
  const shown = list.slice(0, sShown);
  const left = list.length - shown.length;
  const met = shown.filter((s) => tierOf(s.id) >= 1).length;
  const freshHint =
    counts().met === 0 && !sq.trim() && sfilter === 'all' && ssort === 'unit'
      ? `<p class="cl-hint">${ui.icon('sparkle', 14)}<span>Finish your first lesson and these cards start filling in — an empty card just means “not met yet”.</span></p>`
      : '';
  return `${freshHint}${sentenceListHtml(list, shown)}
    <p class="cl-meta">Showing <b>${shown.length}</b> of <b>${list.length}</b>${
      list.length ? ` · ${met} met in view` : ''
    }</p>
    ${
      left > 0
        ? `<button class="btn btn-secondary btn-block cl-more" type="button" data-more="sents">
            Load ${Math.min(PAGE, left)} more
            <span class="cl-more-left">${left} left</span>
          </button>`
        : ''
    }`;
}

function sentencesTab() {
  const chips = [
    ['all', 'All'],
    ['met', 'Met'],
    ['strong', 'Strong'],
    ['locked', 'Locked'],
  ]
    .map(
      ([key, label]) =>
        `<button class="chip ${sfilter === key ? 'is-on' : ''}" type="button" data-sfilter="${key}"
          aria-pressed="${sfilter === key}">${label}</button>`
    )
    .join('');

  const sorts = [
    ['recent', 'Recent'],
    ['unit', 'Unit'],
    ['az', 'A–Z'],
  ]
    .map(
      ([key, label]) =>
        `<button role="tab" aria-selected="${ssort === key}" type="button" data-ssort="${key}">${label}</button>`
    )
    .join('');

  return `<div class="cl-tools g-rise" style="--i:3">
      <div class="cl-search-wrap">
        <span class="cl-search-ico" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5 21 21"/></svg>
        </span>
        <input class="cl-search" id="clSentSearch" type="search" placeholder="Search Korean or English" autocomplete="off"
          aria-label="Search sentences" value="${esc(sq)}" />
      </div>
      <div class="cl-chips" role="group" aria-label="Filter sentences">${chips}</div>
      <div class="tabs cl-sort" role="tablist" aria-label="Sort sentences">${sorts}</div>
    </div>
    <div id="clSentBody" class="cl-body g-rise" style="--i:4">${sentenceBodyHtml()}</div>`;
}

// ---------- words ----------
function wordFiltered() {
  const q = wq.trim().toLowerCase();
  return WORDS.filter((w) => {
    if (wunit !== 'all' && w.unitId !== wunit) return false;
    if (!q) return true;
    return `${w.ko} ${w.rom || ''} ${w.en}`.toLowerCase().includes(q);
  }).sort((a, b) => {
    const ua = UNIT_ORDER[a.unitId] || 0;
    const ub = UNIT_ORDER[b.unitId] || 0;
    if (ua !== ub) return ua - ub;
    return a.id.localeCompare(b.id);
  });
}

function wordCounts() {
  const c = { learning: 0, familiar: 0, strong: 0, mastered: 0, fresh: 0 };
  Object.values(state.wordMastery || {}).forEach((w) => {
    const t = w?.tier || 0;
    if (t === 1) c.learning++;
    else if (t === 2) c.familiar++;
    else if (t === 3) c.strong++;
    else if (t > 3) c.mastered++;
  });
  c.fresh = Math.max(0, TOTAL_W - (c.learning + c.familiar + c.strong + c.mastered));
  return c;
}

function wordChip(w) {
  const t = wordTier(w.id);
  return `<button class="word-chip ${t >= 3 ? 'is-strong' : ''} ${t === 0 ? 'is-new' : ''}" type="button"
    data-word="${esc(w.id)}" aria-label="${esc(w.ko)} — ${esc(w.en)}">
    <span class="wc-ko">${esc(w.ko)}</span>
    <span class="wc-en">${esc(w.en)}</span>
    <span class="wc-foot">${ui.pips(t, { mint: t >= 3 })}</span>
  </button>`;
}

function wordBodyHtml() {
  const list = wordFiltered();
  const shown = list.slice(0, wShown);
  const left = list.length - shown.length;
  return `${
    list.length
      ? `<div class="cl-grid cl-grid--words">${shown.map(wordChip).join('')}</div>`
      : `<div class="cl-empty">
          <div class="h3">No words match.</div>
          <p class="small muted mt-2">Try a shorter word, or switch the unit filter to “All units”.</p>
          <button class="btn btn-secondary btn-sm mt-4" type="button" data-clear-w>Clear filters</button>
        </div>`
  }
    <p class="cl-meta">Showing <b>${shown.length}</b> of <b>${list.length}</b> words</p>
    ${
      left > 0
        ? `<button class="btn btn-secondary btn-block cl-more" type="button" data-more="words">
            Load ${Math.min(PAGE, left)} more
            <span class="cl-more-left">${left} left</span>
          </button>`
        : ''
    }`;
}

function wordsTab() {
  const c = wordCounts();
  const due = dueWords().length;
  const pills = [
    ['Learning', c.learning, 'pill--coral'],
    ['Familiar', c.familiar, 'pill--amber'],
    ['Strong', c.strong, 'pill--indigo'],
    ['Mastered', c.mastered, 'pill--mint'],
  ]
    .map(
      ([label, n, cls]) =>
        `<span class="pill pill--sm ${cls} cl-pill"><b class="tabular">${ui.fmt(n)}</b>${label}</span>`
    )
    .join('');

  const options = [
    `<option value="all"${wunit === 'all' ? ' selected' : ''}>All ${UNIT_COUNT} units</option>`,
    ...UNITS.map(
      (u) =>
        `<option value="${esc(u.id)}"${wunit === u.id ? ' selected' : ''}>Unit ${u.order} · ${esc(u.title)}</option>`
    ),
  ].join('');

  return `<div class="cl-tools g-rise" style="--i:3">
      <div class="cl-pills">${pills}</div>
      <p class="cl-pills-note">${ui.fmt(c.fresh)} not started · ${ui.fmt(knownWordCount())} of ${ui.fmt(TOTAL_W)} known (3+ pips)</p>
      <button class="btn btn-primary btn-block cl-train" type="button" data-go="vocab">
        ${ui.icon('book', 18)} ${due ? `Train ${due} due word${due === 1 ? '' : 's'}` : 'Open the word trainer'} →
      </button>
      <div class="cl-search-wrap">
        <span class="cl-search-ico" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5 21 21"/></svg>
        </span>
        <input class="cl-search" id="clWordSearch" type="search" placeholder="Search Korean or English" autocomplete="off"
          aria-label="Search words" value="${esc(wq)}" />
      </div>
      <label class="cl-select-wrap">
        <span class="sr-only">Filter words by unit</span>
        <select class="cl-select" id="clWordUnit">${options}</select>
        <span class="cl-select-chev" aria-hidden="true">${ui.icon('chevron', 16)}</span>
      </label>
    </div>
    <div id="clWordBody" class="cl-body g-rise" style="--i:4">${wordBodyHtml()}</div>`;
}

// ---------- badges ----------
function badgeCard(unit) {
  const earned = (state.badges || []).includes(unit.id);
  const cp = state.checkpoints?.[unit.id];
  const tone = BADGE_TONES[(unit.order - 1) % BADGE_TONES.length];
  if (earned) {
    const date = fmtDate(cp?.at);
    const score = typeof cp?.score === 'number' ? `${cp.score}%` : '';
    return `<button class="cl-badge tone-${tone} is-earned" type="button" data-badge-unit="${esc(unit.id)}"
      aria-label="Unit ${unit.order} ${esc(unit.title)} badge — earned">
      <span class="cl-medal" aria-hidden="true">${String(unit.order).padStart(2, '0')}</span>
      <span class="cl-badge-ko">${esc(unit.ko)}</span>
      <span class="cl-badge-title">${esc(unit.title)}</span>
      <span class="cl-badge-foot">${date || 'Earned'}${score ? ` · ${score}` : ''}</span>
    </button>`;
  }
  return `<div class="cl-badge is-locked" aria-label="Unit ${unit.order} ${esc(unit.title)} badge — locked">
    <span class="cl-medal is-locked" aria-hidden="true">${ui.icon('lock', 15)}</span>
    <span class="cl-badge-ko">${esc(unit.ko)}</span>
    <span class="cl-badge-title">${esc(unit.title)}</span>
    <span class="cl-badge-foot">Pass the Unit ${unit.order} checkpoint</span>
  </div>`;
}

function badgesTab() {
  const c = counts();
  const all = c.badges >= UNIT_COUNT;
  const best = examBest();
  const examPassed = !!state.flags?.a1Exam?.passed;
  const cert = all
    ? `<section class="cl-cert is-open">
        <span class="cl-cert-art" aria-hidden="true">${ui.icon('trophy', 30)}</span>
        <div class="grow">
          <div class="cl-cert-kicker">All 12 badges earned</div>
          <div class="cl-cert-title">A1 Certificate</div>
          <div class="cl-cert-sub">${
            best === null ? 'Your final exam is ready.' : `Best score ${best}%${best >= 80 ? ' — passed' : ' · 80% to pass'}`
          }</div>
        </div>
        <button class="btn btn-primary btn-sm" type="button" data-go="exam">${examPassed ? 'View certificate' : 'Take exam'}</button>
      </section>`
    : `<section class="cl-cert is-locked">
        <span class="cl-cert-art" aria-hidden="true">${ui.icon('lock', 26)}</span>
        <div class="grow">
          <div class="cl-cert-kicker">A1 Certificate</div>
          <div class="cl-cert-title">Locked</div>
          <div class="cl-cert-sub">Earn all ${UNIT_COUNT} unit badges to sit the final exam.</div>
          <div class="bar bar--thin cl-cert-bar"><i style="width:${(c.badges / UNIT_COUNT) * 100}%"></i></div>
          <div class="cl-cert-note">${c.badges} of ${UNIT_COUNT} badges earned</div>
        </div>
      </section>`;

  return `<div class="cl-badges g-rise" style="--i:3">
      ${cert}
      <div class="cl-badge-grid">${UNITS.map(badgeCard).join('')}</div>
      <p class="cl-note">A unit badge is earned by passing that unit’s checkpoint (80%+). Learning is never blocked by a test.</p>
    </div>`;
}

// ---------- detail sheets ----------
// Slow playback is only wired for sentence clips (kind "s" → "s-slow"), so words
// get the normal-speed button only rather than a slow label that would lie.
function audioButtons(clipId, kind, text) {
  return `<div class="cl-audio">
    <button class="say-btn" type="button" data-clip="${esc(clipId)}" data-clip-kind="${kind}"
      data-say="${esc(text)}" aria-label="Play audio">${ui.icon('sound', 24)}</button>
    ${
      kind === 's'
        ? `<button class="cl-slow" type="button" data-clip="${esc(clipId)}" data-clip-kind="s" data-slow="1"
            data-say="${esc(text)}" aria-label="Play slowly">${ui.icon('sound', 14)} Slow · 0.7×</button>`
        : ''
    }
  </div>`;
}

function sentenceSheet(id) {
  const s = SENTENCE_BY_ID[id];
  if (!s) return;
  const m = masteryOf(id);
  const tier = m.tier || 0;
  const meta = tierMeta(tier);
  const unit = UNIT_BY_ID[s.unitId];
  const tags = (s.grammarIds || [])
    .map((gid) => GRAMMAR_BY_ID[gid])
    .filter(Boolean)
    .map((g) => `<span class="chip chip-coral">${esc(g.ko)}</span>`)
    .join('');
  const bm = isBookmarked(id);
  const due =
    tier === 0
      ? 'Not met yet — one lesson run starts it.'
      : m.dueAt
        ? `Next review ${nextDueLabel(m)}`
        : 'Scheduled on your next review';
  const rom = romOn() && s.romanization ? `<div class="dtl-rom">${esc(s.romanization)}</div>` : '';

  const close = ui.sheet({
    dismiss: true,
    body: `<div class="dtl">
      <div class="dtl-hero">
        <div class="grow">
          <div class="dtl-ko">${esc(s.korean)}</div>
          ${rom}
        </div>
      </div>
      <div class="cl-audio-row">${audioButtons(s.id, 's', s.korean)}</div>
      <div class="dtl-en">${esc(s.english)}</div>
      <div class="dtl-tags">
        ${tags}
        ${unit ? `<span class="chip">Unit ${unit.order} · ${esc(unit.title)}</span>` : ''}
      </div>
      <div class="dtl-mastery">
        ${ui.pips(tier, { lg: true, mint: tier >= 3 })}
        <div class="grow">
          <div class="dtl-tier">${esc(meta.label)}</div>
          <div class="small muted">${esc(due)}</div>
        </div>
      </div>
      <div class="dtl-label">Word by word</div>
      <ul class="gloss">
        ${(s.gloss || [])
          .map(
            (g) =>
              `<li><b>${esc(g.ko)}</b>${
                romOn() && g.rom ? `<span class="gloss-rom">${esc(g.rom)}</span>` : ''
              }<em>${esc(g.en || '')}</em></li>`
          )
          .join('')}
      </ul>
      ${s.literal ? `<p class="small muted mt-2">Literally: ${esc(s.literal)}</p>` : ''}
      <div class="stack-2 mt-5">
        <button class="btn btn-primary btn-block" type="button" data-practice-sentence>
          Practice this sentence
        </button>
        <button class="btn btn-ghost btn-block cl-bookmark" type="button" data-bookmark>
          ${bm ? 'Saved ★' : 'Save for later'}
        </button>
      </div>
    </div>`,
  });
  const box = sheetBox();
  box?.querySelector('[data-practice-sentence]')?.addEventListener('click', () => {
    close();
    ui.toast('One-sentence practice isn’t built yet — opening your review queue instead.', { icon: 'refresh' });
    router.go('lesson', { kind: 'review' });
  });
  box?.querySelector('[data-bookmark]')?.addEventListener('click', (e) => {
    const on = toggleBookmark(id);
    e.currentTarget.textContent = on ? 'Saved ★' : 'Save for later';
    ui.toast(on ? 'Saved for later.' : 'Removed from saved.', { icon: 'star', tone: on ? 'mint' : undefined });
  });
}

function wordSheet(id) {
  const w = WORD_BY_ID[id];
  if (!w) return;
  const t = wordTier(id);
  const meta = tierMeta(t);
  const unit = UNIT_BY_ID[w.unitId];
  const examples = (WORD_SENTENCES.get(id) || []).slice(0, 2);
  const bm = isBookmarked(id);

  const close = ui.sheet({
    dismiss: true,
    body: `<div class="dtl">
      <div class="dtl-hero">
        <div class="grow">
          <div class="dtl-ko">${esc(w.ko)}</div>
          ${romOn() && w.rom ? `<div class="dtl-rom">${esc(w.rom)}</div>` : ''}
        </div>
      </div>
      <div class="cl-audio-row">${audioButtons(w.id, 'w', w.ko)}</div>
      <div class="dtl-en">${esc(w.en)}</div>
      <div class="dtl-tags">
        <span class="chip chip-coral">${esc(w.pos || 'word')}</span>
        ${unit ? `<span class="chip">Unit ${unit.order} · ${esc(unit.title)}</span>` : ''}
        ${t >= 3 ? '<span class="chip chip-mint">Known</span>' : ''}
      </div>
      <div class="dtl-mastery">
        ${ui.pips(t, { lg: true, mint: t >= 3 })}
        <div class="grow">
          <div class="dtl-tier">${esc(meta.label)}</div>
          <div class="small muted">${
            t === 0 ? 'Not practised yet' : t >= 3 ? 'You know this word' : 'Getting familiar'
          }</div>
        </div>
      </div>
      <div class="dtl-label">In a sentence</div>
      ${
        examples.length
          ? `<div class="dtl-examples">${examples
              .map(
                (s) => `<button class="dtl-ex" type="button" data-clip="${esc(s.id)}" data-clip-kind="s"
                  data-say="${esc(s.korean)}">
                  <span class="dtl-ex-ko">${markWord(s, w)}</span>
                  <span class="dtl-ex-en">${esc(s.english)}</span>
                  <span class="dtl-ex-play" aria-hidden="true">${ui.icon('sound', 13)}</span>
                </button>`
              )
              .join('')}</div>`
          : '<p class="small muted">No example sentence in this unit yet.</p>'
      }
      <div class="stack-2 mt-5">
        <button class="btn btn-primary btn-block" type="button" data-know-word>I know this</button>
        <button class="btn btn-secondary btn-block" type="button" data-practise-word>Practise</button>
        <button class="btn btn-ghost btn-block cl-bookmark" type="button" data-bookmark>
          ${bm ? 'Saved ★' : 'Save for later'}
        </button>
      </div>
    </div>`,
  });
  const box = sheetBox();
  box?.querySelector('[data-know-word]')?.addEventListener('click', () => {
    const before = wordTier(id);
    recordWord(id, true);
    close();
    ui.toast(
      before >= 5 ? 'Already golden — nice.' : `Marked as known · ${Math.min(5, before + 1)} of 5 pips`,
      { icon: 'check', tone: 'mint' }
    );
    router.refresh();
  });
  box?.querySelector('[data-practise-word]')?.addEventListener('click', () => {
    close();
    ui.toast('Word trainer — due words come first.', { icon: 'book' });
    router.go('vocab');
  });
  box?.querySelector('[data-bookmark]')?.addEventListener('click', (e) => {
    const on = toggleBookmark(id);
    e.currentTarget.textContent = on ? 'Saved ★' : 'Save for later';
    ui.toast(on ? 'Word saved.' : 'Removed from saved.', { icon: 'star', tone: on ? 'mint' : undefined });
  });
}

function markWord(sentence, word) {
  const needle = esc(word.ko);
  return esc(sentence.korean).split(needle).join(`<mark class="pp-mark">${needle}</mark>`);
}

function badgeDetail(unitId) {
  const unit = UNIT_BY_ID[unitId];
  if (!unit) return;
  const earned = (state.badges || []).includes(unit.id);
  const cp = state.checkpoints?.[unit.id];
  const first = lessonsOf(unit.id).find((l) => l.kind !== 'checkpoint');
  const body = `<div class="cl-badge-modal">
    <p class="cl-badge-modal-ko">${esc(unit.ko)} · ${esc(unit.title)}</p>
    <ul class="cl-cando">
      ${(unit.canDo || []).map((c) => `<li>${esc(c)}</li>`).join('')}
    </ul>
    <div class="cl-badge-modal-foot">
      ${
        earned
          ? `<span class="chip chip-mint">Earned${cp?.at ? ` ${esc(fmtDate(cp.at))}` : ''}${
              typeof cp?.score === 'number' ? ` · ${cp.score}%` : ''
            }</span>`
          : `<span class="chip">${cp?.passed === false ? `Best checkpoint ${cp.score}% — 80% to pass` : `Unit ${unit.order} checkpoint not passed yet`}</span>`
      }
    </div>
  </div>`;
  const actions = [];
  if (first) {
    actions.push({
      label: earned ? 'Practise this unit' : 'Go to this unit',
      cls: 'btn-primary',
      onClick: () => router.go('lesson', { node: first.nodeIndex }),
    });
  }
  actions.push({ label: 'Close', cls: 'btn-ghost' });
  ui.modal({ title: `Unit ${unit.order} badge`, body, actions, dismiss: true });
}

// ---------- screen ----------
function tabHtml() {
  if (tab === 'words') return wordsTab();
  if (tab === 'badges') return badgesTab();
  return sentencesTab();
}

function syncTabs(root) {
  root.querySelectorAll('[data-cltab]').forEach((b) => {
    b.setAttribute('aria-selected', b.dataset.cltab === tab ? 'true' : 'false');
  });
}

export default {
  id: 'passport',
  title: 'Collection',
  nav: 'passport',
  hideNav: false,

  render(params) {
    const wanted = params?.tab ? (params.tab === 'stamps' ? 'sentences' : params.tab) : null;
    if (wanted && wanted !== appliedRouteTab && ['sentences', 'words', 'badges'].includes(wanted)) {
      tab = wanted;
    }
    appliedRouteTab = wanted;
    const c = counts();
    const remaining = UNIT_COUNT - c.badges;

    return `<section class="screen passport screen-pad-nav">
      <header class="top g-rise" style="--i:0">
        <h1 class="screen-title">Collection</h1>
        <span class="pp-head">${ui.fmt(c.met)} / ${TOTAL_S} sentences</span>
      </header>

      <div class="pp-hero g-rise" style="--i:1">
        <div class="pp-book" aria-hidden="true">
          <svg viewBox="0 0 62 78" width="52" height="66" fill="none">
            <rect class="pp-book-cover" x="3" y="2" width="56" height="74" rx="8" stroke-width="2.5" />
            <rect class="pp-book-inner" x="9" y="9" width="44" height="60" rx="4" />
            <circle class="pp-book-line" cx="31" cy="27" r="10" stroke-width="1.8" />
            <path class="pp-book-star" d="M31 19.5l2.2 4.5 5 .7-3.6 3.5.8 5-4.4-2.4-4.4 2.4.8-5-3.6-3.5 5-.7z" />
            <path class="pp-book-line" d="M18 44h26M18 50h18" stroke-width="1.8" stroke-linecap="round" />
            <text class="pp-book-text" x="31" y="65" text-anchor="middle" font-size="7.5" font-weight="800">A1</text>
          </svg>
        </div>
        <div class="grow">
          <div class="pp-kicker">A1 · the whole course</div>
          <div class="pp-count">${ui.fmt(c.met)}<span> / ${TOTAL_S} met</span></div>
          <div class="cl-rail">
            <span class="cl-rail-label">Met</span>
            <span class="bar bar--thick pp-bar"><i style="width:${c.pctMet.toFixed(1)}%"></i></span>
            <b class="cl-rail-num">${ui.fmt(c.met)}</b>
          </div>
          <div class="cl-rail">
            <span class="cl-rail-label">Strong</span>
            <span class="bar bar--thick cl-bar-strong"><i style="width:${c.pctStrong.toFixed(1)}%"></i></span>
            <b class="cl-rail-num">${ui.fmt(c.strong)}</b>
          </div>
          <div class="pp-togo">
            ${ui.icon('trophy', 13)}
            <span>${c.badges} / ${UNIT_COUNT} unit badges${
              remaining > 0 ? ` · ${remaining} to go` : ' · A1 certificate unlocked'
            }</span>
          </div>
        </div>
      </div>

      <div class="pp-tabwrap g-rise" style="--i:2">
        <div class="tabs pp-tabs" role="tablist" aria-label="Collection sections">
          <button role="tab" aria-selected="${tab === 'sentences'}" data-cltab="sentences" type="button">Sentences</button>
          <button role="tab" aria-selected="${tab === 'words'}" data-cltab="words" type="button">Words</button>
          <button role="tab" aria-selected="${tab === 'badges'}" data-cltab="badges" type="button">Badges</button>
        </div>
      </div>

      <div id="clBody">${tabHtml()}</div>
    </section>`;
  },

  mount(root) {
    const clearSent = () => {
      sq = '';
      sfilter = 'all';
      sShown = PAGE;
    };
    const clearWords = () => {
      wq = '';
      wunit = 'all';
      wShown = PAGE;
    };
    const paintSent = () => {
      const body = root.querySelector('#clSentBody');
      if (body) body.innerHTML = sentenceBodyHtml();
    };
    const paintWords = () => {
      const body = root.querySelector('#clWordBody');
      if (body) body.innerHTML = wordBodyHtml();
    };

    root.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('[data-cltab]');
      if (tabBtn) {
        const next = tabBtn.dataset.cltab;
        if (next === tab) return;
        tab = next;
        // Keep the "already honoured" marker in sync with the URL we are
        // writing. Otherwise a later deep link can be ignored as stale.
        appliedRouteTab = next === 'sentences' ? null : next;
        audio.sfx('tap');
        const body = root.querySelector('#clBody');
        if (body) body.innerHTML = tabHtml();
        syncTabs(root);
        try {
          history.replaceState(null, '', `#/passport${next === 'sentences' ? '' : `?tab=${next}`}`);
        } catch {
          /* file:// or locked-down history — the tab still works */
        }
        const scroller = document.getElementById('screen');
        if (scroller) scroller.scrollTop = 0;
        return;
      }

      const more = e.target.closest('[data-more]');
      if (more) {
        audio.sfx('tap');
        if (more.dataset.more === 'sents') {
          sShown += PAGE;
          paintSent();
        } else {
          wShown += PAGE;
          paintWords();
        }
        return;
      }

      const filterBtn = e.target.closest('[data-sfilter]');
      if (filterBtn) {
        sfilter = filterBtn.dataset.sfilter;
        sShown = PAGE;
        root.querySelectorAll('[data-sfilter]').forEach((b) => {
          const on = b.dataset.sfilter === sfilter;
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        audio.sfx('tap');
        paintSent();
        return;
      }

      const sortBtn = e.target.closest('[data-ssort]');
      if (sortBtn) {
        ssort = sortBtn.dataset.ssort;
        sShown = PAGE;
        root.querySelectorAll('[data-ssort]').forEach((b) => {
          b.setAttribute('aria-selected', b.dataset.ssort === ssort ? 'true' : 'false');
        });
        audio.sfx('tap');
        paintSent();
        return;
      }

      if (e.target.closest('[data-clear-s]')) {
        clearSent();
        root.querySelectorAll('[data-sfilter]').forEach((b) => {
          const on = b.dataset.sfilter === 'all';
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        root.querySelectorAll('[data-ssort]').forEach((b) => {
          b.setAttribute('aria-selected', b.dataset.ssort === ssort ? 'true' : 'false');
        });
        const input = root.querySelector('#clSentSearch');
        if (input) input.value = '';
        paintSent();
        return;
      }

      if (e.target.closest('[data-clear-w]')) {
        clearWords();
        const input = root.querySelector('#clWordSearch');
        if (input) input.value = '';
        const select = root.querySelector('#clWordUnit');
        if (select) select.value = 'all';
        paintWords();
        return;
      }

      const sCard = e.target.closest('[data-sentence]');
      if (sCard) {
        audio.sfx('tap');
        sentenceSheet(sCard.dataset.sentence);
        return;
      }

      const wCard = e.target.closest('[data-word]');
      if (wCard) {
        audio.sfx('tap');
        wordSheet(wCard.dataset.word);
        return;
      }

      const badge = e.target.closest('[data-badge-unit]');
      if (badge) {
        audio.sfx('tap');
        badgeDetail(badge.dataset.badgeUnit);
      }
    });

    root.addEventListener('input', (e) => {
      if (e.target.id === 'clSentSearch') {
        sq = e.target.value;
        sShown = PAGE;
        paintSent();
      } else if (e.target.id === 'clWordSearch') {
        wq = e.target.value;
        wShown = PAGE;
        paintWords();
      }
    });

    root.addEventListener('change', (e) => {
      if (e.target.id === 'clWordUnit') {
        wunit = e.target.value;
        wShown = PAGE;
        paintWords();
      }
    });
  },

  destroy() {},
};
