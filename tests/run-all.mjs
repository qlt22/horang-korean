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

line('1/13 · Content validation (12 units)');
const content = await run('tools/validate-content.mjs');

line('2/13 · Core logic');
const core = await run('tests/core.test.mjs');

line('3/13 · Core edge cases');
const edge = await run('tests/core-edge.test.mjs');
const persist = await run('tests/persistence.test.mjs');

line('4/13 · Audio bundle');
const audio = await run('tests/audio.test.mjs');

line('5/13 · Seoul Works city economy');
const cityTests = await run('tests/city.test.mjs');
const citySim = await run('tests/city-sim.test.mjs');

line('6/13 · Engagement alternatives (branch)');
const engage = await run('tests/engagement.test.mjs');

line('7/13 · Engagement Lab UI');
const lab = await run('tests/lab.mjs', { BASE });

line('8/13 · Lesson CTA + advance flow');
const cta = await run('tests/cta-flow.mjs', { BASE });

line('9/13 · Core browser edge cases');
const edgeBrowser = await run('tests/core-edge-browser.mjs', { BASE });

line('10/13 · Seoul Works browser UI');
const cityUi = await run('tests/city-ui.mjs', { BASE });

line('11/13 · Full browser journey (390×844 + 1440×900)');
const e2e = await run('tests/e2e.mjs', { BASE });

line('12/13 · Metropolis QA suite');
const metropolis = await run('tests/metropolis.spec.mjs', { BASE });

line('13/13 · Retention Lab (60-day A1 simulation)');
const demo = await run('tests/demo.mjs', { BASE });

server.kill();
const failed = [content, core, edge, persist, audio, cityTests, citySim, engage, lab, cta, edgeBrowser, cityUi, metropolis, e2e, demo].filter((c) => c !== 0).length;
console.log(
  `\n${failed ? `✗ ${failed} suite(s) failed` : '✓ All suites passed'}  (content=${content} core=${core} edge=${edge} persist=${persist} audio=${audio} city=${cityTests}+${citySim} engage=${engage} lab=${lab} cta=${cta} edgeBrowser=${edgeBrowser} cityUi=${cityUi} metropolis=${metropolis} e2e=${e2e} demo=${demo})`
);
process.exit(failed ? 1 : 0);
