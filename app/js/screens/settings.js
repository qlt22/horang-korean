// S19 · Settings. Every control persists immediately and confirms with a toast.
import {
  state,
  save,
  resetState,
  exportData,
  APP_VERSION,
  DAILY_GOALS,
} from '../core/store.js';
import * as ui from '../core/ui.js';
import * as audio from '../core/audio.js';
import * as clock from '../core/clock.js';
import router from '../core/router.js';

const VOICE_LIST = Object.values(audio.VOICES);
const MIN_BY_GOAL = { 60: 5, 120: 10, 180: 15 };
const GOAL_COPY = {
  60: 'A quick win. One node a day.',
  120: 'The sweet spot. Two short sessions.',
  180: 'Serious pace. Daily goal + a review.',
};
const TIMES = ['07:30', '08:00', '12:30', '18:00', '19:30', '21:00'];

function switchBtn(key, on, label) {
  return `<button class="switch" type="button" role="switch" aria-checked="${on ? 'true' : 'false'}"
    data-toggle="${key}" aria-label="${ui.esc(label)}"></button>`;
}

function romanSeg() {
  const cur = state.settings.romanization || 'auto';
  return ['always', 'auto', 'never']
    .map(
      (v) =>
        `<button type="button" role="tab" data-roman="${v}" aria-selected="${cur === v ? 'true' : 'false'}">${
          v[0].toUpperCase() + v.slice(1)
        }</button>`
    )
    .join('');
}

export default {
  id: 'settings',
  title: 'Settings',
  nav: null,
  hideNav: true,
  render() {
    const goal = state.profile.dailyGoalXp || 120;
    const reminderOff = !state.profile.reminderTime;
    const reminder = state.profile.reminderTime || 'Off';
    const s = state.settings;

    return `
    <section class="screen settings">
      <div class="top">
        <div class="top-left">
          <button class="icon-btn" type="button" data-back="profile" aria-label="Back">${ui.icon('back', 22)}</button>
          <h1 class="screen-title">Settings</h1>
        </div>
      </div>

      <div class="st-stack pf-stagger">

        <!-- Learning -->
        <section class="st-group">
          <h2 class="st-group-title">Learning</h2>
          <div class="card st-card">
            <button class="list-row st-row" type="button" data-sheet="goal">
              <span class="st-row-ico st-row-ico--coral">${ui.icon('target', 20)}</span>
              <span class="st-row-text">
                <span class="st-row-title">Daily goal</span>
                <span class="st-row-sub">${MIN_BY_GOAL[goal] || 10} min a day keeps the streak</span>
              </span>
              <span class="st-row-value" data-goal-value>${goal} XP</span>
              <span class="chev">${ui.icon('chevron', 18)}</span>
            </button>

            <button class="list-row st-row" type="button" data-sheet="time">
              <span class="st-row-ico st-row-ico--indigo">${ui.icon('bell', 20)}</span>
              <span class="st-row-text">
                <span class="st-row-title">Reminder time</span>
                <span class="st-row-sub">${
                  reminderOff ? 'Reminders are off — pick a time to turn them on' : 'One nudge a day, never after 22:00'
                }</span>
              </span>
              <span class="st-row-value" data-time-value>${ui.esc(reminder)}</span>
              <span class="chev">${ui.icon('chevron', 18)}</span>
            </button>

            <button class="list-row st-row" type="button" data-placement>
              <span class="st-row-ico st-row-ico--mint">${ui.icon('quests', 20)}</span>
              <span class="st-row-text">
                <span class="st-row-title">Placement test</span>
                <span class="st-row-sub">${
                  state.flags.placementTaken ? 'Taken — retake to start elsewhere' : 'Find your starting point'
                }</span>
              </span>
              <span class="chev">${ui.icon('chevron', 18)}</span>
            </button>
          </div>
        </section>

        <!-- Feel -->
        <section class="st-group">
          <h2 class="st-group-title">Feel</h2>
          <div class="card st-card">
            <div class="list-row st-row">
              <span class="st-row-ico st-row-ico--coral">${ui.icon('sound', 20)}</span>
              <span class="st-row-text">
                <span class="st-row-title">Sound effects</span>
                <span class="st-row-sub">Taps, chimes and spoken Korean</span>
              </span>
              ${switchBtn('sound', s.sound, 'Sound effects')}
            </div>

            <div class="list-row st-row">
              <span class="st-row-ico st-row-ico--indigo">${ui.icon('bolt', 20)}</span>
              <span class="st-row-text">
                <span class="st-row-title">Haptics</span>
                <span class="st-row-sub">A tiny buzz on answers and chests</span>
              </span>
              ${switchBtn('haptics', s.haptics, 'Haptics')}
            </div>

            <div class="list-row st-row">
              <span class="st-row-ico st-row-ico--mint">${ui.icon('eye', 20)}</span>
              <span class="st-row-text">
                <span class="st-row-title">Reduce motion</span>
                <span class="st-row-sub">Less movement, same feedback</span>
              </span>
              ${switchBtn('reducedMotion', s.reducedMotion, 'Reduce motion')}
            </div>

            <div class="st-field st-field--voice">
              <div class="st-field-head">
                <span class="st-row-title">Korean voice</span>
                <span class="st-field-value" data-voice-label>${ui.esc(
                  (audio.VOICES[audio.getVoice()] || VOICE_LIST[0]).name
                )}</span>
              </div>
              <div class="st-voice-grid">
                ${VOICE_LIST.map(
                  (v) => `<button class="st-voice ${audio.getVoice() === v.id ? 'is-on' : ''}" data-voice="${v.id}" type="button">
                    <b>${ui.esc(v.name)} <em>${ui.esc(v.ko)}</em></b>
                    <span>${ui.esc(v.line)}</span>
                  </button>`
                ).join('')}
              </div>
              <button class="btn btn-secondary btn-sm btn-block mt-2" data-voice-sample type="button">
                ${ui.icon('sound', 16)} Hear a sample
              </button>
              <p class="st-hint">SunHi is bundled and instant. InJoon and Hyunsu use the neural endpoint and are cached after the first play.</p>
            </div>

            <div class="st-field st-field--roman">
              <div class="st-field-head">
                <span class="st-row-title">Romanization</span>
                <span class="st-field-value">${ui.esc(s.romanization || 'auto')}</span>
              </div>
              <div class="tabs st-seg" role="tablist" aria-label="Romanization">
                ${romanSeg()}
              </div>
              <p class="st-hint">Hidden when it would give the answer away — listening exercises and “say it” stay audio-only.</p>
            </div>
          </div>
        </section>

        <!-- Account -->
        <section class="st-group">
          <h2 class="st-group-title">Account</h2>
          <div class="card st-card">
            <div class="st-field">
              <label class="st-row-title" for="st-name">Name</label>
              <div class="st-input-row">
                <input id="st-name" class="st-input" data-name type="text" maxlength="20"
                  value="${ui.esc(state.profile.name || '')}" placeholder="Your name" autocomplete="nickname" />
                <button class="btn btn-secondary btn-sm" type="button" data-save-name>Save</button>
              </div>
              <p class="st-hint" data-name-hint>Used in your first sentence: 저는 ${ui.esc(state.profile.name || '___')}입니다.</p>
            </div>

            <div class="st-field st-field--avatar">
              <span class="st-row-title">Avatar</span>
              <div class="st-avatars" role="group" aria-label="Choose an avatar">
                ${ui.AVATARS.map(
                  (id) => `<button class="st-avatar ${state.profile.avatar === id ? 'is-on' : ''}" type="button"
                    data-avatar="${ui.esc(id)}" aria-label="${ui.esc(id)}" aria-pressed="${state.profile.avatar === id}">
                    ${ui.avatar(id, 44)}
                    ${state.profile.avatar === id ? `<span class="st-avatar-check">${ui.icon('check', 11)}</span>` : ''}
                  </button>`
                ).join('')}
              </div>
            </div>

            <button class="list-row st-row" type="button" data-export>
              <span class="st-row-ico st-row-ico--amber">${ui.icon('chart', 20)}</span>
              <span class="st-row-text">
                <span class="st-row-title">Export data</span>
                <span class="st-row-sub">Download your progress as JSON</span>
              </span>
              <span class="chev">${ui.icon('chevron', 18)}</span>
            </button>

            <button class="list-row st-row st-row--danger" type="button" data-reset>
              <span class="st-row-ico st-row-ico--danger">${ui.icon('trash', 20)}</span>
              <span class="st-row-text">
                <span class="st-row-title">Reset progress</span>
                <span class="st-row-sub">Start over at Day 0 — settings are kept</span>
              </span>
              <span class="chev">${ui.icon('chevron', 18)}</span>
            </button>
          </div>
        </section>

        <!-- About -->
        <section class="st-group">
          <h2 class="st-group-title">About</h2>
          <div class="card st-card">
            <button class="list-row st-row" type="button" data-privacy>
              <span class="st-row-ico st-row-ico--indigo">${ui.icon('heart', 20)}</span>
              <span class="st-row-text">
                <span class="st-row-title">Privacy</span>
                <span class="st-row-sub">Everything stays on this device</span>
              </span>
              <span class="chev">${ui.icon('chevron', 18)}</span>
            </button>
            <div class="list-row st-row st-row--static">
              <span class="st-row-ico">${ui.icon('info', 20)}</span>
              <span class="st-row-text">
                <span class="st-row-title">Version</span>
                <span class="st-row-sub">Made for Korean learners</span>
              </span>
              <span class="st-row-value">v${ui.esc(APP_VERSION)}</span>
            </div>
            <p class="st-note">Horang never sells your data and has no real-money store. No ads, no paywall, no dark patterns — the streak is the product.</p>
          </div>
        </section>

        <footer class="pf-foot">
          <span>Horang v${ui.esc(APP_VERSION)}</span>
          <span class="pf-foot-dot">·</span>
          <span>Korean, one quest at a time</span>
        </footer>
      </div>
    </section>`;
  },

  mount(root) {
    /* ---------- daily goal sheet ---------- */
    root.querySelector('[data-sheet="goal"]')?.addEventListener('click', () => {
      const cur = state.profile.dailyGoalXp || 120;
      const body = `
        <div class="st-goal-grid">
          ${Object.values(DAILY_GOALS)
            .map(Number)
            .map(
              (xp) => `<button class="st-goal ${xp === cur ? 'is-on' : ''}" type="button" data-goal="${xp}">
                <span class="st-goal-xp">${xp} XP</span>
                <span class="st-goal-min">${MIN_BY_GOAL[xp]} min a day</span>
                <span class="st-goal-copy">${GOAL_COPY[xp]}</span>
                ${xp === cur ? `<span class="st-goal-tag">Current</span>` : ''}
              </button>`
            )
            .join('')}
        </div>
        <p class="st-hint center">Changing the goal never removes progress — it only moves the finish line.</p>`;
      const close = ui.sheet({ title: 'Daily goal', body, dismiss: true });
      const box = document.querySelector('.scrim .sheet');
      box?.querySelectorAll('[data-goal]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const xp = Number(btn.dataset.goal);
          state.profile.dailyGoalXp = xp;
          state.profile.minutes = MIN_BY_GOAL[xp] || 10;
          save();
          const val = root.querySelector('[data-goal-value]');
          if (val) val.textContent = `${xp} XP`;
          const sub = root.querySelector('[data-sheet="goal"] .st-row-sub');
          if (sub) sub.textContent = `${MIN_BY_GOAL[xp]} min a day keeps the streak`;
          close();
          audio.sfx('tap');
          ui.toast(`Daily goal: ${xp} XP`, { icon: 'target', tone: 'coral' });
        });
      });
    });

    /* ---------- reminder time sheet ---------- */
    root.querySelector('[data-sheet="time"]')?.addEventListener('click', () => {
      const cur = state.profile.reminderTime || '19:30';
      const off = !state.profile.reminderTime;
      const body = `
        <p class="st-sheet-lead">${
          off
            ? 'Reminders are off. Pick a time to turn one gentle daily nudge back on.'
            : `If it's ${ui.esc(cur)}, then I study. One reminder a day, quiet hours 22:00–08:00.`
        }</p>
        <div class="st-times">
          ${TIMES.map(
            (t) => `<button class="chip st-time" type="button" data-time="${t}" aria-pressed="${!off && t === cur}">${t}</button>`
          ).join('')}
        </div>`;
      const close = ui.sheet({ title: 'Reminder time', body, dismiss: true });
      const box = document.querySelector('.scrim .sheet');
      box?.querySelectorAll('[data-time]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const t = btn.dataset.time;
          state.profile.reminderTime = t;
          save();
          const val = root.querySelector('[data-time-value]');
          if (val) val.textContent = t;
          const sub = root.querySelector('[data-sheet="time"] .st-row-sub');
          if (sub) sub.textContent = 'One nudge a day, never after 22:00';
          close();
          audio.sfx('tap');
          ui.toast(`Reminder set for ${t}`, { icon: 'bell', tone: 'mint' });
        });
      });
    });

    /* ---------- placement test ---------- */
    root.querySelector('[data-placement]')?.addEventListener('click', () => {
      ui.modal({
        title: 'Retake the placement test?',
        body: `<p class="st-modal-copy">Five quick questions re-check where you're starting. Your stamps, XP and streak stay exactly as they are.</p>`,
        actions: [
          {
            label: 'Start the check',
            cls: 'btn-primary',
            onClick: () => {
              save();
              router.go('onboarding', { step: 'quiz' });
            },
          },
          { label: 'Not now', cls: 'btn-secondary' },
        ],
      });
    });

    /* ---------- switches ---------- */
    const setSwitch = (btn, on) => btn.setAttribute('aria-checked', on ? 'true' : 'false');
    root.querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.toggle;
        const next = !state.settings[key];
        state.settings[key] = next;
        setSwitch(btn, next);

        if (key === 'sound') {
          audio.setEnabled(next);
          if (next) audio.sfx('correct');
          ui.toast(next ? 'Sound on' : 'Sound off', { icon: next ? 'sound' : 'mute', tone: next ? 'mint' : undefined });
        } else if (key === 'haptics') {
          if (next && navigator.vibrate) navigator.vibrate(12);
          ui.toast(next ? 'Haptics on' : 'Haptics off', { icon: 'bolt', tone: next ? 'mint' : undefined });
        } else if (key === 'reducedMotion') {
          ui.initReducedMotion(next);
          ui.toast(next ? 'Reduced motion on' : 'Reduced motion off', { icon: 'eye' });
        }
        save();
      });
    });

    /* ---------- voice picker ---------- */
    const playSample = (voice) =>
      audio.neuralSpeak('안녕하세요. 저는 루카스입니다. 오늘 날씨가 정말 좋아요.', { voice, rate: '-6%' });
    root.querySelectorAll('[data-voice]').forEach((b) =>
      b.addEventListener('click', () => {
        const v = b.dataset.voice;
        audio.setVoice(v);
        state.settings.voice = v;
        save();
        audio.sfx('tap');
        root.querySelectorAll('[data-voice]').forEach((x) => x.classList.toggle('is-on', x.dataset.voice === v));
        const label = root.querySelector('[data-voice-label]');
        if (label) label.textContent = audio.VOICES[v].name;
        ui.toast(`Voice: ${audio.VOICES[v].name} ${audio.VOICES[v].ko}`, { icon: 'sound', tone: 'mint' });
        playSample(v);
      })
    );
    root.querySelector('[data-voice-sample]')?.addEventListener('click', () => playSample(audio.getVoice()));

    /* ---------- romanization segmented control ---------- */
    root.querySelectorAll('[data-roman]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const v = btn.dataset.roman;
        state.settings.romanization = v;
        save();
        root.querySelectorAll('[data-roman]').forEach((b) => b.setAttribute('aria-selected', b === btn ? 'true' : 'false'));
        const val = root.querySelector('.st-field--roman .st-field-value');
        if (val) val.textContent = v;
        audio.sfx('tap');
        ui.toast(`Romanization: ${v}`, { icon: 'book', tone: 'mint' });
      });
    });

    /* ---------- name ---------- */
    const nameInput = root.querySelector('[data-name]');
    const saveName = () => {
      const v = (nameInput?.value || '').trim().replace(/\s+/g, ' ').slice(0, 20);
      if (!v) {
        ui.toast('Add a name first', { icon: 'info' });
        nameInput?.focus();
        return;
      }
      state.profile.name = v;
      if (nameInput) nameInput.value = v;
      save();
      const hint = root.querySelector('[data-name-hint]');
      if (hint) hint.textContent = `Used in your first sentence: 저는 ${v}입니다.`;
      ui.toast('Name saved', { icon: 'check', tone: 'mint' });
    };
    root.querySelector('[data-save-name]')?.addEventListener('click', saveName);
    nameInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveName();
      }
    });

    /* ---------- avatar ---------- */
    root.querySelectorAll('[data-avatar]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.avatar;
        state.profile.avatar = id;
        save();
        root.querySelectorAll('[data-avatar]').forEach((b) => {
          const on = b === btn;
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
          const check = b.querySelector('.st-avatar-check');
          if (on && !check) b.insertAdjacentHTML('beforeend', `<span class="st-avatar-check">${ui.icon('check', 11)}</span>`);
          if (!on && check) check.remove();
        });
        audio.sfx('tap');
        ui.toast('Avatar updated', { icon: 'user', tone: 'mint' });
      });
    });

    /* ---------- export ---------- */
    root.querySelector('[data-export]')?.addEventListener('click', () => {
      try {
        const blob = new Blob([exportData()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `horang-${clock.today()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        ui.toast('Data exported', { icon: 'check', tone: 'mint' });
      } catch {
        ui.toast('Export failed — try again', { icon: 'info' });
      }
    });

    /* ---------- reset (2 steps) ---------- */
    const hardReset = () => {
      resetState();
      router.go('welcome');
    };
    const secondStep = () => {
      ui.modal({
        title: 'Last check',
        body: `<p class="st-modal-copy">This wipes your ${ui.fmt(state.xpTotal)} XP, ${state.streak.current}-day streak and all sentence history. Export your data first if you want a copy.</p>`,
        actions: [
          { label: 'Yes, reset everything', cls: 'btn-danger', onClick: hardReset },
          { label: 'Keep my progress', cls: 'btn-secondary' },
        ],
      });
    };
    root.querySelector('[data-reset]')?.addEventListener('click', () => {
      ui.modal({
        title: 'Reset all progress?',
        body: `<p class="st-modal-copy">You'll start over at Day 0. This cannot be undone.</p>`,
        actions: [
          { label: 'Continue', cls: 'btn-secondary', onClick: secondStep },
          { label: 'Cancel', cls: 'btn-ghost' },
        ],
      });
    });

    /* ---------- privacy ---------- */
    root.querySelector('[data-privacy]')?.addEventListener('click', () => {
      ui.modal({
        title: 'Your data',
        body: `<p class="st-modal-copy">Horang keeps everything in this browser: your name, XP, stamps and settings. Nothing is sent to a server, there is no account, and there is no real-money store.</p>
          <p class="st-modal-copy mt-3">Clearing site data or tapping “Reset progress” is the only way it disappears.</p>`,
        actions: [{ label: 'Got it', cls: 'btn-primary' }],
      });
    });
  },

  destroy() {},
};
