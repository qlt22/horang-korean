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

line('1/15 · Content validation (12 units)');
const content = await run('tools/validate-content.mjs');

line('2/15 · Core logic');
const core = await run('tests/core.test.mjs');

line('3/15 · Core edge cases');
const edge = await run('tests/core-edge.test.mjs');
const persist = await run('tests/persistence.test.mjs');

line('4/15 · Audio bundle');
const audio = await run('tests/audio.test.mjs');

line('5/15 · Seoul Works city economy');
const cityTests = await run('tests/city.test.mjs');
const citySim = await run('tests/city-sim.test.mjs');

line('6/15 · Engagement alternatives (branch)');
const engage = await run('tests/engagement.test.mjs');

line('7/15 · Engagement Lab UI');
const lab = await run('tests/lab.mjs', { BASE });

line('8/15 · Lesson CTA + advance flow');
const cta = await run('tests/cta-flow.mjs', { BASE });

line('9/15 · Core browser edge cases');
const edgeBrowser = await run('tests/core-edge-browser.mjs', { BASE });

line('10/15 · Seoul Works browser UI');
const cityUi = await run('tests/city-ui.mjs', { BASE });

line('11/15 · 3D game mode');
const game = await run('tests/game.spec.mjs', { BASE });

line('12/15 · Full browser journey (390×844 + 1440×900)');
const e2e = await run('tests/e2e.mjs', { BASE });

line('13/15 · Metropolis QA suite');
const metropolis = await run('tests/metropolis.spec.mjs', { BASE });

line('14/15 · Showcase city');
const showcase = await run('tests/showcase.spec.mjs', { BASE });

line('15/15 · Retention Lab (60-day A1 simulation)');
const demo = await run('tests/demo.mjs', { BASE });

server.kill();
const failed = [content, core, edge, persist, audio, cityTests, citySim, engage, lab, cta, edgeBrowser, cityUi, game, e2e, metropolis, showcase, demo].filter((c) => c !== 0).length;
console.log(
  `\n${failed ? `✗ ${failed} suite(s) failed` : '✓ All suites passed'}  (content=${content} core=${core} edge=${edge} persist=${persist} audio=${audio} city=${cityTests}+${citySim} engage=${engage} lab=${lab} cta=${cta} edgeBrowser=${edgeBrowser} cityUi=${cityUi} game=${game} e2e=${e2e} metropolis=${metropolis} showcase=${showcase} demo=${demo})`
);
process.exit(failed ? 1 : 0);
