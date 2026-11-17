// Mastery tiers, scheduling and decay — from research 01 §1 and 02 §7.
import { DAY, HOUR, MIN, nowMs } from './clock.js';

export const TIERS = [
  { tier: 0, label: 'New', ko: '새것', pips: 0, interval: 0, color: 'var(--ink-300)' },
  { tier: 1, label: 'Learning', ko: '배우는 중', pips: 1, interval: 4 * HOUR, color: 'var(--coral-500)' },
  { tier: 2, label: 'Familiar', ko: '익숙함', pips: 2, interval: 1 * DAY, color: 'var(--coral-500)' },
  { tier: 3, label: 'Strong', ko: '든든함', pips: 3, interval: 3 * DAY, color: 'var(--mint-600)' },
  { tier: 4, label: 'Mastered', ko: '완성', pips: 4, interval: 7 * DAY, color: 'var(--mint-600)' },
  { tier: 5, label: 'Golden', ko: '황금', pips: 5, interval: 21 * DAY, color: 'var(--amber-700)' },
];
const INTERVALS = TIERS.map((t) => t.interval);

export function tierMeta(tier) {
  return TIERS[Math.max(0, Math.min(5, tier | 0))];
}

export function blankMastery(sentenceId, firstDay) {
  return {
    tier: 0,
    dueAt: 0,
    lastSeenAt: 0,
    correct: 0,
    wrong: 0,
    exposures: 0,
    isStamp: false,
    firstDay: firstDay ?? 0,
  };
}

/**
 * Apply one graded answer.
 * Three correct exposures in one session carry a new sentence to tier 3 (the "three-touch rule").
 */
export function grade(m, correct, opts = {}) {
  const t = nowMs();
  const out = { tierBefore: m.tier, tier: m.tier, stampMinted: false, status: 'ok' };
  m.lastSeenAt = t;
  // A sentence can gain at most one tier per 4 hours. The three-touch rule
  // already lands a new sentence at tier 3; extra same-session taps must not
  // inflate it to Golden by lunchtime.
  const canAdvance = !m.advancedAt || t - m.advancedAt > 4 * HOUR;

  if (correct) {
    m.correct += 1;
    m.exposures += 1;
    if (m.tier === 0) {
      if (m.exposures >= 3) {
        m.tier = 3;
        m.dueAt = t + INTERVALS[3];
        m.advancedAt = t;
        if (!m.isStamp) {
          m.isStamp = true;
          out.stampMinted = true;
        }
      } else {
        m.tier = 1;
        m.dueAt = t + INTERVALS[1];
        m.advancedAt = t;
        out.status = 'exposure';
      }
    } else if (m.tier < 3 || canAdvance) {
      m.tier = Math.min(5, m.tier + 1);
      m.dueAt = t + INTERVALS[m.tier];
      m.advancedAt = t;
      if (m.tier >= 3 && !m.isStamp) {
        m.isStamp = true;
        out.stampMinted = true;
      }
    } else {
      out.status = 'consolidate';
    }
  } else {
    m.wrong += 1;
    m.tier = Math.max(1, m.tier - 1);
    m.dueAt = t + 10 * MIN;
    out.status = 'relearn';
  }
  out.tier = m.tier;
  return out;
}

export function dueStatus(m, t = nowMs()) {
  if (!m || m.tier === 0) return 'new';
  if (!m.dueAt) return 'due';
  const over = t - m.dueAt;
  if (over < 0) return 'scheduled';
  if (over < DAY) return 'due';
  if (over < 3 * DAY) return 'fading';
  if (over < 7 * DAY) return 'wilting';
  return 'dropped';
}

export const STATUS_META = {
  new: { label: 'New', color: 'var(--ink-300)', tone: 'neutral' },
  scheduled: { label: 'Scheduled', color: 'var(--mint-600)', tone: 'mint' },
  due: { label: 'Due now', color: 'var(--mint-700)', tone: 'mint' },
  fading: { label: 'Fading', color: 'var(--amber-700)', tone: 'amber' },
  wilting: { label: 'Wilting', color: 'var(--coral-800)', tone: 'coral' },
  dropped: { label: 'Dropped', color: 'var(--berry-600)', tone: 'berry' },
};

/** Decay never drops more than one tier per lapse (research 01 §1). */
export function decayCheck(mastery, t = nowMs()) {
  const dropped = [];
  for (const [id, m] of Object.entries(mastery || {})) {
    if (!m.dueAt || m.tier === 0) continue;
    if (t - m.dueAt > 7 * DAY) {
      const before = m.tier;
      m.tier = Math.max(1, m.tier - 1);
      m.dueAt = t + INTERVALS[m.tier];
      dropped.push({ id, before, after: m.tier });
    }
  }
  return dropped;
}

export function nextDueLabel(m, t = nowMs()) {
  if (!m || !m.dueAt) return 'not started';
  const d = m.dueAt - t;
  if (d <= 0) return 'due now';
  if (d < HOUR) return `in ${Math.max(1, Math.round(d / MIN))} min`;
  if (d < DAY) return `in ${Math.round(d / HOUR)} h`;
  return `in ${Math.round(d / DAY)} days`;
}

export default { TIERS, tierMeta, grade, dueStatus, decayCheck, blankMastery, nextDueLabel, STATUS_META };
