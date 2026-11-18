// Virtual clock. The Retention Lab can fast-forward days through this module.
const OFFSET_KEY = 'horang.clockOffset.v1';
const INSTALL_KEY = 'horang.installedAt.v1';

function read(n, fallback) {
  try {
    const v = localStorage.getItem(n);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}
function write(n, v) {
  try {
    localStorage.setItem(n, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

let offsetMs = read(OFFSET_KEY, 0);
if (!Number.isFinite(Number(offsetMs))) offsetMs = 0;
offsetMs = Number(offsetMs) || 0;
let installedAt = read(INSTALL_KEY, null);
if (!installedAt || Number.isNaN(new Date(installedAt).getTime())) {
  installedAt = new Date().toISOString();
  write(INSTALL_KEY, installedAt);
}

export const DAY = 86400000;
export const HOUR = 3600000;
export const MIN = 60000;

export function now() {
  return new Date(Date.now() + offsetMs);
}
export function nowMs() {
  return now().getTime();
}
export function getOffset() {
  return offsetMs;
}

export function pad(n) {
  return String(n).padStart(2, '0');
}
export function dateKey(d = now()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function today() {
  return dateKey(now());
}
export function yesterdayKey() {
  return dateKey(new Date(nowMs() - DAY));
}
export function startOfDay(d = now()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}
export function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return dateKey(d);
}
export function daysBetween(aKey, bKey) {
  if (!aKey || !bKey) return 0;
  const a = new Date(aKey + 'T12:00:00').getTime();
  const b = new Date(bKey + 'T12:00:00').getTime();
  return Math.round((b - a) / DAY);
}
export function dayIndex() {
  const n = daysBetween(dateKey(new Date(installedAt)), today());
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}
export function shiftDays(n) {
  const d = Number(n);
  if (!Number.isFinite(d)) return;
  offsetMs += d * DAY;
  write(OFFSET_KEY, offsetMs);
}
export function shiftMs(ms) {
  const d = Number(ms);
  if (!Number.isFinite(d)) return;
  offsetMs += d;
  write(OFFSET_KEY, offsetMs);
}
export function resetClock() {
  offsetMs = 0;
  write(OFFSET_KEY, 0);
}
export function installDate() {
  return dateKey(new Date(installedAt));
}
export function fmtCountdown(ms) {
  if (ms <= 0) return 'now';
  const h = Math.floor(ms / HOUR);
  const m = Math.floor((ms % HOUR) / MIN);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${Math.max(1, m)}m`;
}
export function isEvening() {
  const h = now().getHours();
  return h >= 19 && h < 21;
}
export function weekId() {
  // ISO-ish week anchored to Monday, stable for the virtual date.
  const d = now();
  const monday = new Date(d);
  const dow = (d.getDay() + 6) % 7;
  monday.setDate(d.getDate() - dow);
  return dateKey(monday);
}
export function weekdayIndex() {
  return (now().getDay() + 6) % 7; // Mon = 0
}
export function timeGreeting() {
  const h = now().getHours();
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
export default {
  now,
  nowMs,
  today,
  dateKey,
  addDays,
  daysBetween,
  dayIndex,
  shiftDays,
  shiftMs,
  resetClock,
  fmtCountdown,
  isEvening,
  weekId,
  weekdayIndex,
  timeGreeting,
  DAY,
  HOUR,
  MIN,
};
