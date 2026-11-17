// S0 · Welcome — reference implementation for the screen module pattern.
import { state } from '../core/store.js';
import { META } from '../core/course.js';
import * as ui from '../core/ui.js';
import { router } from '../core/router.js';
import * as audio from '../core/audio.js';

export default {
  id: 'welcome',
  title: 'Welcome',
  nav: null,
  hideNav: true,
  render() {
    const returning = state.flags.onboardingDone;
    return `
    <section class="screen welcome">
      <div class="welcome-blobs" aria-hidden="true">
        <span class="blob blob--coral"></span>
        <span class="blob blob--mint"></span>
        <span class="glyph glyph--1">가</span>
        <span class="glyph glyph--2">한</span>
        <span class="glyph glyph--3">글</span>
      </div>

      <div class="welcome-top">
        <div class="logo-mark" aria-hidden="true">ㅎ</div>
        <h1 class="wordmark">Horang</h1>
        <p class="tagline">Korean, one quest at a time.</p>
      </div>

      <div class="welcome-mascot">${ui.mascot(148, returning ? 'happy' : 'cheer')}</div>

      <div class="welcome-mid">
        <div class="welcome-proof">
          <span class="pill pill--sm">${ui.icon('flame', 14)} ${META.lessonCount} sessions</span>
          <span class="pill pill--sm">${ui.icon('passport', 14)} ${META.sentenceCount} real sentences</span>
          <span class="pill pill--sm">${ui.icon('heart', 14)} A1 · never blocked</span>
        </div>
        <h2 class="welcome-h">From Hangul to A1, one sentence at a time.</h2>
        <p class="welcome-sub">${META.sentenceCount} real sentences · ${META.wordCount} words · ${META.grammarCount} grammar patterns. No signup, no grammar tables.</p>
      </div>

      <div class="welcome-actions">
        <button class="btn btn-primary btn-block btn-lg" data-start type="button">
          ${returning ? 'Continue learning' : "Start — it's free"} ${ui.icon('arrow', 20)}
        </button>
        <p class="welcome-micro">No ads. No paywall. No homework energy.</p>
        <button class="btn btn-ghost btn-block" data-demo type="button" style="height:44px;font-size:14px">
          ${ui.icon('chart', 18)} See the 30-day retention lab
        </button>
      </div>
    </section>`;
  },
  mount(root) {
    ui.initReducedMotion(state.settings.reducedMotion);
    const start = root.querySelector('[data-start]');
    start?.addEventListener('click', () => {
      audio.unlock();
      audio.sfx('tap');
      router.go(state.flags.onboardingDone ? 'home' : 'onboarding');
    });
    root.querySelector('[data-demo]')?.addEventListener('click', () => router.go('demo'));
    // First-10-seconds choreography: stagger the hero in.
    const parts = root.querySelectorAll('.welcome-top, .welcome-mascot, .welcome-mid, .welcome-actions');
    parts.forEach((p, i) => {
      p.style.opacity = '0';
      p.style.transform = 'translateY(12px)';
      setTimeout(() => {
        p.style.transition = 'opacity 420ms cubic-bezier(.22,1,.36,1), transform 420ms cubic-bezier(.22,1,.36,1)';
        p.style.opacity = '1';
        p.style.transform = 'none';
      }, 90 + i * 110);
    });
  },
};
