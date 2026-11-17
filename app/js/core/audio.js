// Audio: ko-KR speech synthesis + tiny synthesized SFX (no asset files).
let enabled = true;
let ctx = null;
let voices = [];
let voiceReady = false;
let currentUtter = null;
let currentAudio = null;
const CLIP_BASE = 'app/audio';
const VOICE_KEY = 'horang.voice';

export const VOICES = {
  sunhi: { id: 'sunhi', name: 'SunHi', ko: '선희', line: 'Female · clear and bright (bundled, instant)' },
  injoon: { id: 'injoon', name: 'InJoon', ko: '인준', line: 'Male · calm and low (streams once, then cached)' },
  hyunsu: { id: 'hyunsu', name: 'Hyunsu', ko: '현수', line: 'Male · warm and conversational (streams once)' },
};

export function getVoice() {
  try {
    const v = localStorage.getItem(VOICE_KEY);
    return VOICES[v] ? v : 'sunhi';
  } catch {
    return 'sunhi';
  }
}
export function setVoice(id) {
  if (!VOICES[id]) return false;
  try {
    localStorage.setItem(VOICE_KEY, id);
  } catch {
    /* ignore */
  }
  return true;
}

function ttsUrl(text, voice, rate) {
  return `/api/tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(
    voice || getVoice()
  )}&rate=${encodeURIComponent(rate || '-6%')}`;
}

/**
 * Stream a neural clip for arbitrary text (names, new content) from the local
 * /api/tts endpoint. Falls back to the OS voice only if the server has no TTS.
 */
export function neuralSpeak(text, opts = {}) {
  if (!enabled || !text) {
    opts.onend?.();
    return false;
  }
  stopSpeaking();
  try {
    const a = new Audio(ttsUrl(text, opts.voice, opts.rate));
    currentAudio = a;
    a.onended = () => {
      if (currentAudio === a) currentAudio = null;
      opts.onend?.();
    };
    a.onerror = () => {
      if (currentAudio === a) currentAudio = null;
      speak(text, { onend: opts.onend });
    };
    const p = a.play();
    if (p && p.catch) p.catch(() => speak(text, { onend: opts.onend }));
    return true;
  } catch {
    speak(text, { onend: opts.onend });
    return false;
  }
}

function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  voices = window.speechSynthesis.getVoices() || [];
  voiceReady = voices.length > 0;
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
  setTimeout(loadVoices, 600);
  setTimeout(loadVoices, 1500);
}

export const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

function pickVoice() {
  if (!voiceReady) loadVoices();
  const ko = voices.filter((v) => /^ko(-|_)?/i.test(v.lang) || /korean/i.test(v.name));
  if (!ko.length) return null;
  // Prefer a local, female-sounding Korean voice when present.
  return ko.find((v) => v.localService && /female|yuna|sora|heami/i.test(v.name)) || ko[0];
}

export function speak(text, opts = {}) {
  if (!enabled || !supported || !text) {
    opts.onend?.();
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text).replace(/[.,!?]/g, ''));
    u.lang = 'ko-KR';
    u.rate = opts.rate ?? 0.86;
    u.pitch = opts.pitch ?? 1.02;
    const v = pickVoice();
    if (v) u.voice = v;
    u.onend = () => {
      currentUtter = null;
      opts.onend?.();
    };
    u.onerror = () => {
      currentUtter = null;
      opts.onend?.();
    };
    currentUtter = u;
    window.speechSynthesis.speak(u);
  } catch {
    opts.onend?.();
  }
}

export function stopSpeaking() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {
      /* ignore */
    }
    currentAudio = null;
  }
  if (!supported) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}

// ---------- bundled neural audio ----------
/**
 * Play a pre-generated clip. kind: 's' sentence, 's-slow', 'w' word, 'd' dialogue, 'g' grammar example.
 * Falls back to speechSynthesis with the same text if the file is missing.
 */
export function playClip(kind, id, opts = {}) {
  const text = opts.fallbackText || '';
  const voice = opts.voice || getVoice();
  const rate = kind === 's-slow' ? '-24%' : kind === 'w' ? '-10%' : '-6%';
  // Bundled clips are SunHi. Any other chosen voice streams the same text through
  // the neural endpoint, so the voice setting is real everywhere, not just on words.
  if (voice !== 'sunhi' && text) return neuralSpeak(text, { voice, rate, onend: opts.onend });
  if (!id) {
    if (text) return neuralSpeak(text, { voice, rate, onend: opts.onend });
    opts.onend?.();
    return false;
  }
  const dir = kind.startsWith('s') ? 's' : kind;
  const suffix = kind === 's-slow' ? '-slow' : '';
  const url = `${CLIP_BASE}/${dir}/${id}${suffix}.mp3`;
  stopSpeaking();
  try {
    const a = new Audio(url);
    currentAudio = a;
    a.playbackRate = opts.rate || (kind === 's-slow' ? 0.9 : 1);
    a.onended = () => {
      if (currentAudio === a) currentAudio = null;
      opts.onend?.();
    };
    a.onerror = () => {
      if (currentAudio === a) currentAudio = null;
      if (text) neuralSpeak(text, { voice, rate, onend: opts.onend });
      else opts.onend?.();
    };
    const p = a.play();
    if (p && p.catch) p.catch(() => {});
    return true;
  } catch {
    if (opts.fallbackText) speak(opts.fallbackText, { onend: opts.onend });
    else opts.onend?.();
    return false;
  }
}

/** Play the clip that belongs to a task object. */
export function playTask(ex, opts = {}) {
  if (!ex) return false;
  if (ex.clipId && ex.clipKind) {
    const kind = opts.slow && ex.clipKind === 's' ? 's-slow' : ex.clipKind;
    const text = ex.korean || ex.audioText || '';
    return playClip(kind, ex.clipId, { ...opts, fallbackText: text });
  }
  if (ex.korean) return neuralSpeak(ex.korean, opts);
  return false;
}

export function hasKoreanVoice() {
  return !!pickVoice();
}

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, dur, type = 'sine', gain = 0.09, slideTo) {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime + start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, a.currentTime + start + dur);
  g.gain.setValueAtTime(0, a.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, a.currentTime + start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + start);
  o.stop(a.currentTime + start + dur + 0.02);
}

function noise(dur = 0.2, gain = 0.05) {
  const a = ac();
  if (!a) return;
  const buffer = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = a.createBufferSource();
  src.buffer = buffer;
  const g = a.createGain();
  g.gain.value = gain;
  const f = a.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 900;
  src.connect(f).connect(g).connect(a.destination);
  src.start();
}

const SFX = {
  tap: () => tone(520, 0, 0.05, 'sine', 0.035),
  correct: () => {
    tone(660, 0, 0.1, 'sine', 0.08);
    tone(990, 0.07, 0.16, 'sine', 0.07);
  },
  wrong: () => {
    tone(180, 0, 0.18, 'sawtooth', 0.05, 120);
  },
  coin: () => {
    tone(1180, 0, 0.06, 'square', 0.03);
    tone(1560, 0.05, 0.1, 'square', 0.025);
  },
  crit: () => {
    tone(880, 0, 0.08, 'triangle', 0.07);
    tone(1320, 0.06, 0.1, 'triangle', 0.06);
    tone(1760, 0.12, 0.16, 'triangle', 0.05);
  },
  levelup: () => {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.085, 0.22, 'triangle', 0.07));
  },
  chest: () => {
    noise(0.25, 0.03);
    tone(300, 0, 0.22, 'square', 0.03, 620);
  },
  streak: () => {
    [392, 523, 659, 784].forEach((f, i) => tone(f, i * 0.1, 0.3, 'sine', 0.06));
  },
  stamp: () => {
    tone(220, 0, 0.07, 'square', 0.05);
    tone(440, 0.02, 0.12, 'sine', 0.04);
  },
  complete: () => {
    [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.07, 0.25, 'triangle', 0.055));
  },
};

export function sfx(name) {
  if (!enabled) return;
  try {
    (SFX[name] || SFX.tap)();
  } catch {
    /* audio is garnish — never break the app */
  }
}

export function setEnabled(v) {
  enabled = !!v;
  if (!enabled) stopSpeaking();
}
export function isEnabled() {
  return enabled;
}
export function unlock() {
  ac();
}

export default { speak, stopSpeaking, sfx, setEnabled, isEnabled, supported, unlock, hasKoreanVoice, playClip, playTask, neuralSpeak, getVoice, setVoice, VOICES };
