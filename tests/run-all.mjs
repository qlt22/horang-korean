// Runs the whole suite against a throwaway server: core → browser journey → retention lab.
import { spawn } from 'node:child_process';
import process from 'node:process';

const PORT = process.env.TEST_PORT || '4199';
const BASE = `http://localhost:${PORT}`;

const server = spawn(process.execPath, ['server.js'], {
  env: { ...process.env, PORT },
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
server.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));

async function waitForServer(tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(BASE + '/');
      if (r.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  return false;
}

function run(script, extraEnv = {}) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [script], {
      env: { ...process.env, ...extraEnv },
      stdio: 'inherit',
    });
    p.on('exit', (code) => resolve(code ?? 1));
  });
}

function line(t) {
  console.log(`\n${'─'.repeat(64)}\n${t}\n${'─'.repeat(64)}`);
}

const up = await waitForServer();
if (!up) {
  console.error('Server did not start');
  server.kill();
  process.exit(1);
}

line('1/5 · Content validation (12 units)');
const content = await run('tools/validate-content.mjs');

line('2/5 · Core logic');
const core = await run('tests/core.test.mjs');

line('3/5 · Audio bundle');
const audio = await run('tests/audio.test.mjs');

line('4/5 · Full browser journey (390×844 + 1440×900)');
const e2e = await run('tests/e2e.mjs', { BASE });

line('5/5 · Retention Lab (60-day A1 simulation)');
const demo = await run('tests/demo.mjs', { BASE });

server.kill();
const failed = [content, core, audio, e2e, demo].filter((c) => c !== 0).length;
console.log(
  `\n${failed ? `✗ ${failed} suite(s) failed` : '✓ All suites passed'}  (content=${content} core=${core} audio=${audio} e2e=${e2e} demo=${demo})`
);
process.exit(failed ? 1 : 0);
