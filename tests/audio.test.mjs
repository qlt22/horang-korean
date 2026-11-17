// Verifies every Korean string has a bundled neural clip. No network needed.
import fs from 'node:fs';
import path from 'node:path';

const data = (await import('../app/data/a1.js')).default;
const ROOT = 'app/audio';
let pass = 0;
let fail = 0;
const out = [];
const ok = (n, c, extra = '') => {
  if (c) pass++;
  else fail++;
  out.push(`  ${c ? '✓' : '✗'} ${n}${extra ? ' — ' + extra : ''}`);
};

function size(file) {
  try {
    return fs.statSync(file).size;
  } catch {
    return 0;
  }
}

const expected = [];
for (const s of data.sentences) {
  expected.push({ file: `${ROOT}/s/${s.id}.mp3`, label: `sentence ${s.id}` });
  expected.push({ file: `${ROOT}/s/${s.id}-slow.mp3`, label: `sentence ${s.id} slow` });
}
for (const w of data.words) expected.push({ file: `${ROOT}/w/${w.id}.mp3`, label: `word ${w.id}` });
for (const d of data.dialogues) for (const l of d.lines) expected.push({ file: `${ROOT}/d/${l.id}.mp3`, label: `dialogue ${l.id}` });
for (const g of data.grammar)
  (g.examples || []).forEach((e, i) => expected.push({ file: `${ROOT}/g/${g.id}_${i + 1}.mp3`, label: `grammar ${g.id}_${i + 1}` }));

const missing = expected.filter((e) => !fs.existsSync(e.file));
const tiny = expected.filter((e) => fs.existsSync(e.file) && size(e.file) < 3000);
ok('expected clip count', expected.length > 1300, String(expected.length));
ok('every clip exists', missing.length === 0, missing.slice(0, 5).map((m) => m.label).join(', '));
ok('no truncated clips (<3 KB)', tiny.length === 0, tiny.slice(0, 5).map((m) => m.label).join(', '));

const manifestPath = path.join(ROOT, 'manifest.json');
ok('manifest exists', fs.existsSync(manifestPath));
if (fs.existsSync(manifestPath)) {
  const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  ok('manifest has both voices', m.voices?.main === 'ko-KR-SunHiNeural' && m.voices?.second === 'ko-KR-InJoonNeural');
  ok('manifest covers sentence clips', Object.keys(m.clips).filter((k) => k.startsWith('s/')).length >= 576);
}

const bytes = expected.reduce((a, e) => a + size(e.file), 0);
ok('bundle size is sane (10–60 MB)', bytes > 10e6 && bytes < 60e6, `${(bytes / 1024 / 1024).toFixed(1)} MB`);

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
