#!/usr/bin/env node
// Generate bundled neural Korean audio with edge-tts (Microsoft Edge voices).
// Requires: python3 + `pip install edge-tts` (see tools/README-audio.md).
// Usage: node tools/generate-audio.mjs [--force] [--limit=20] [--only=s]
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'app/audio');
const EDGE = process.env.EDGE_TTS || '/tmp/ttsenv/bin/edge-tts';
const VOICE_MAIN = 'ko-KR-SunHiNeural';
const VOICE_SECOND = 'ko-KR-InJoonNeural';

const args = process.argv.slice(2);
const force = args.includes('--force');
const limitArg = args.find((a) => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;
const onlyArg = args.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.split('=')[1].split(',') : null;

const data = (await import(path.join(ROOT, 'app/data/a1.js'))).default;

if (!fs.existsSync(EDGE)) {
  console.error(`edge-tts not found at ${EDGE}. Install it:
  python3 -m venv /tmp/ttsenv && /tmp/ttsenv/bin/pip install edge-tts`);
  process.exit(1);
}

const jobs = [];
const add = (kind, id, text, { voice = VOICE_MAIN, rate = '+0%', dir = kind } = {}) => {
  if (!text) return;
  jobs.push({ kind, id, text, voice, rate, file: path.join(OUT, dir, `${id}.mp3`) });
};

for (const s of data.sentences) {
  add('s', s.id, s.korean);
  add('s', `${s.id}-slow`, s.audio?.text || s.korean, { rate: '-18%' });
}
for (const w of data.words) add('w', w.id, w.ko, { rate: '-8%' });
for (const d of data.dialogues) {
  d.lines.forEach((l) =>
    add('d', l.id, l.ko, { voice: l.speaker === 'B' ? VOICE_SECOND : VOICE_MAIN })
  );
}
for (const g of data.grammar) {
  (g.examples || []).forEach((ex, i) => add('g', `${g.id}_${i + 1}`, ex.ko));
}

const filtered = only ? jobs.filter((j) => only.includes(j.kind)) : jobs;
const todo = filtered.filter((j) => force || !fs.existsSync(j.file)).slice(0, limit);
for (const j of todo) fs.mkdirSync(path.dirname(j.file), { recursive: true });

console.log(
  `${filtered.length} clips total · ${todo.length} to generate · voices ${VOICE_MAIN} / ${VOICE_SECOND}`
);

function run(job) {
  return new Promise((resolve) => {
    const p = spawn(EDGE, [
      '--voice',
      job.voice,
      '--rate',
      job.rate,
      '--text',
      job.text,
      '--write-media',
      job.file,
    ]);
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('exit', (code) => resolve({ ok: code === 0, err: err.trim() }));
    p.on('error', (e) => resolve({ ok: false, err: e.message }));
  });
}

let done = 0;
let failed = 0;
const started = Date.now();
const CONCURRENCY = 2;

async function worker(queue) {
  while (queue.length) {
    const job = queue.shift();
    await new Promise((r) => setTimeout(r, 120));
    let res = { ok: false };
    for (let attempt = 0; attempt < 5 && !res.ok; attempt++) {
      res = await run(job);
      if (!res.ok) await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
    }
    if (res.ok) {
      done++;
    } else {
      failed++;
      console.log(`  ✗ ${job.kind}/${job.id}: ${res.err.slice(0, 160)}`);
    }
    if ((done + failed) % 25 === 0) {
      const rate = (done + failed) / ((Date.now() - started) / 1000);
      console.log(`  ${done + failed}/${todo.length} · ${rate.toFixed(1)}/s`);
    }
  }
}

const queue = todo.slice();
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));

// Manifest: a single place the app can check which clips exist.
const manifest = { voices: { main: VOICE_MAIN, second: VOICE_SECOND }, generatedAt: new Date().toISOString(), clips: {} };
for (const j of jobs) {
  if (fs.existsSync(j.file)) manifest.clips[`${j.kind}/${j.id}`] = fs.statSync(j.file).size;
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));

const bytes = Object.values(manifest.clips).reduce((a, b) => a + b, 0);
console.log(
  `\n✓ ${done} generated, ${failed} failed · ${(bytes / 1024 / 1024).toFixed(1)} MB bundled · ${((Date.now() - started) / 1000).toFixed(0)}s`
);
if (failed) process.exit(1);
