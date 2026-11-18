// Seoul Works — the city-factory built from study materials.
import { state, levelInfo } from '../core/store.js';
import * as city from '../core/city.js';
import * as C from '../core/city-data.js';
import * as ui from '../core/ui.js';
import * as audio from '../core/audio.js';
import { router } from '../core/router.js';

const fmt = (n) => {
  const v = Number(n) || 0;
  if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e4) return (v / 1e3).toFixed(1) + 'k';
  return Math.floor(v).toLocaleString('en-US');
};
const rate = (n) => (Number(n) || 0).toFixed(1);
const mat = (k) => C.MATERIALS[k] || { emoji: '•', label: k };

function costChips(cost) {
  const out = [];
  if (cost.coins) out.push(`<span class="cc cc--coin">${ui.coin(13)} ${fmt(cost.coins)}</span>`);
  if (cost.gems) out.push(`<span class="cc cc--gem">${ui.gem(12)} ${cost.gems}</span>`);
  for (const k of C.MATERIAL_KEYS) if (cost[k]) out.push(`<span class="cc">${mat(k).emoji} ${fmt(cost[k])}</span>`);
  return out.join('');
}

function duration(seconds) {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

function hudHTML() {
  const info = city.info();
  const chips = [
    `<span class="city-res" data-coins-pill>${ui.coin(15)} <b data-coins>${fmt(state.coins)}</b></span>`,
    ...C.MATERIAL_KEYS.filter((k) => k !== 'blueprint' || info.resources.blueprint)
      .map(
        (k) =>
          `<span class="city-res" data-res-chip="${k}"><em>${mat(k).emoji}</em><b data-res="${k}">${fmt(
            info.resources[k]
          )}</b></span>`
      ),
  ];
  return `<div class="city-hud">${chips.join('')}</div>`;
}

function gridHTML() {
  const info = city.info();
  const c = info.city;
  const byPos = new Map(c.buildings.map((b) => [`${b.x},${b.y}`, b]));
  let tiles = '';
  for (let y = 0; y < c.grid; y++) {
    for (let x = 0; x < c.grid; x++) {
      const b = byPos.get(`${x},${y}`);
      const d = b ? C.def(b.type) : null;
      tiles += `<button class="city-tile ${b ? `is-built tier-${d.tier}` : ''}" data-tile="${x},${y}" type="button"
        ${b ? `aria-label="${ui.esc(d.name)} level ${b.level} at ${x + 1},${y + 1}"` : `aria-label="Empty tile ${x + 1},${y + 1}"`}>
        ${b ? `<span class="ct-art">${d.emoji}</span><span class="ct-lv">${b.level}</span>` : '<span class="ct-plus">+</span>'}
      </button>`;
    }
  }
  return `<div class="city-grid" style="--n:${c.grid}">${tiles}</div>`;
}

function statsHTML() {
  const info = city.info();
  const level = C.cityLevel(info.city);
  const next = city.catalog().find((d) => !d.unlocked && d.lockReason);
  return `<div class="city-stats">
    <div><span class="lab-k">Buildings</span><b>${info.buildings.length}<small>/${info.grid * info.grid}</small></b></div>
    <div><span class="lab-k">Income</span><b>₩${rate(info.income)}<small>/s</small></b></div>
    <div><span class="lab-k">City level</span><b>${level}</b></div>
    <div><span class="lab-k">Total earned</span><b>₩${fmt(info.lifetimeWon)}</b></div>
  </div>
  ${
    next
      ? `<button class="city-next" data-next="${next.id}" type="button">
          <span class="cn-ico">🔒</span>
          <span class="cn-body"><b>Next unlock · ${ui.esc(next.name)}</b><span>${ui.esc(next.lockReason)} →</span></span>
          ${ui.icon('chevron', 18)}
        </button>`
      : `<div class="city-next city-next--all"><span class="cn-ico">🏙️</span><span class="cn-body"><b>Every building unlocked</b><span>Scale the skyline, then start a new era.</span></span></div>`
  }`;
}

function prestigeHTML() {
  const info = city.info();
  const pct = Math.min(100, (info.lifetimeWon / info.prestigeTarget) * 100);
  return `<div class="city-prestige ${info.prestigeReady ? 'is-ready' : ''}">
    <div class="cp-head">
      <span class="overline">Era ${info.era} · ${ui.esc(info.eraInfo.name)}</span>
      <span class="cp-pct">${Math.round(pct)}%</span>
    </div>
    <p>${
      info.prestigeReady
        ? 'A new era is ready. Reset the city for a permanent +50% income and a new skyline.'
        : `Generate ₩${fmt(info.prestigeTarget)} in this era to rebuild with a permanent bonus.`
    }</p>
    <div class="bar bar--thin bar--amber"><i style="width:${ui.pct(pct)}%"></i></div>
    ${
      info.prestigeReady
        ? `<button class="btn btn-secondary btn-sm mt-3" data-prestige type="button">Begin Era ${info.era + 1}</button>`
        : ''
    }
  </div>`;
}

export default {
  id: 'city',
  title: 'Seoul Works',
  nav: 'city',
  hideNav: false,
  render() {
    city.ensureCity();
    const info = city.info();
    const earned = city.achievements().filter((a) => a.earned).length;
    return `<section class="screen city">
      <header class="city-top">
        <div>
          <span class="overline">Seoul Works · Era ${info.era}</span>
          <h1 class="city-h1">Build your Seoul</h1>
        </div>
        <div class="city-income-pill" title="Won per second">
          ${ui.coin(15)} <b data-income>${rate(info.income)}</b><small>/s</small>
        </div>
      </header>

      ${hudHTML()}

      <div class="city-sky era-${info.era}">
        <div class="cs-sun"></div>
        <div class="cs-silhouette" aria-hidden="true">
          ${Array.from({ length: 36 }, (_, i) => {
            const b = info.buildings[i];
            if (!b) return '<i class="cs-empty" style="--h:4px"></i>';
            const d = C.def(b.type);
            return `<i style="--h:${18 + d.tier * 8 + b.level * 2}px;opacity:${Math.min(0.75, 0.3 + d.tier * 0.09)}"></i>`;
          }).join('')}
        </div>
        <div class="cs-copy">
          <b>${ui.esc(info.eraInfo.ko)}</b>
          <span>Every brick is a sentence you met.</span>
        </div>
      </div>

      <div class="city-map-wrap">${gridHTML()}</div>

      ${statsHTML()}

      <div class="city-actions">
        <button class="btn btn-secondary btn-sm" data-ach type="button">🏆 Achievements ${earned}/${city.achievements().length}</button>
        <button class="btn btn-secondary btn-sm" data-expand type="button" ${
          info.canExpand ? '' : 'disabled'
        }>Expand · ₩${fmt(info.expandCost.coins)}</button>
        <button class="btn btn-ghost btn-sm" data-go="shop" type="button">Market →</button>
      </div>

      ${prestigeHTML()}

      <div class="city-note">
        <b>Study feeds the city.</b> Lessons give bricks, reviews give timber, words give glass, checkpoints give steel and a blueprint. Buildings produce Won even while you are away (8 h cap).
      </div>
    </section>`;
  },
  mount(root) {
    city.ensureCity();
    const refresh = () => router.refresh();
    const paint = () => {
      const info = city.info();
      root.querySelectorAll('[data-coins]').forEach((el) => (el.textContent = fmt(state.coins)));
      root.querySelectorAll('[data-income]').forEach((el) => (el.textContent = rate(info.income)));
      for (const k of C.MATERIAL_KEYS) {
        root.querySelectorAll(`[data-res="${k}"]`).forEach((el) => (el.textContent = fmt(info.resources[k])));
      }
    };
    this._timer = setInterval(() => {
      city.tick();
      paint();
    }, 5000);

    const report = city.consumeReport();
    if (report && report.seconds >= 60) {
      setTimeout(() => {
        ui.sheet({
          title: 'While you were away',
          body: `<div class="city-report">
            <p class="center muted">${duration(report.seconds)} of production</p>
            <div class="cr-coins">${ui.coin(20)} <b>+${fmt(report.coins)}</b></div>
            <div class="cr-mats">${C.MATERIAL_KEYS.filter((k) => report.resources[k] > 0.5)
              .map((k) => `<span>${mat(k).emoji} +${fmt(report.resources[k])}</span>`)
              .join('')}</div>
          </div>`,
          actions: [{ label: 'Collect', cls: 'btn-primary' }],
        });
      }, 350);
    }

    const openBuild = (x, y) => {
      const list = city.catalog();
      const available = list.filter((d) => d.unlocked);
      const locked = list.filter((d) => !d.unlocked);
      const row = (d) => `<button class="build-row ${d.affordable ? '' : 'is-poor'}" data-build="${d.id}" type="button" ${
        d.affordable ? '' : 'disabled'
      }>
        <span class="br-art tier-${d.tier}">${d.emoji}</span>
        <span class="br-body">
          <b>${ui.esc(d.name)} <em>${ui.esc(d.ko)}</em></b>
          <span>${d.income ? `₩${rate(d.income)}/s per level 1` : d.produce ? Object.entries(d.produce).map(([k, v]) => `${mat(k).emoji} ${v}/min`).join(' · ') : `+${Math.round((d.boost || d.global || 0) * 100)}% ${d.boost ? 'to neighbours' : 'global'}`}</span>
          <span class="br-cost">${costChips(d.cost)}</span>
        </span>
        <span class="br-state">${d.affordable ? 'Build' : 'Need'}</span>
      </button>`;
      const close = ui.sheet({
        title: `Build · tile ${x + 1}, ${y + 1}`,
        body: `<div class="build-list">${available.map(row).join('')}</div>
          ${locked.length ? `<p class="build-locked-title">Locked</p><div class="build-list build-list--locked">${locked
            .map(
              (d) => `<div class="build-row is-locked"><span class="br-art">${d.emoji}</span><span class="br-body"><b>${ui.esc(
                d.name
              )} <em>${ui.esc(d.ko)}</em></b><span>${ui.esc(d.lockReason || 'Locked')}</span></span></div>`
            )
            .join('')}</div>` : ''}`,
        actions: [{ label: 'Cancel', cls: 'btn-ghost' }],
      });
      document.querySelectorAll('[data-build]').forEach((b) =>
        b.addEventListener('click', () => {
          const res = city.place(b.dataset.build, x, y);
          if (!res.ok) {
            ui.toast(res.reason || 'Cannot build there', { tone: 'amber' });
            return;
          }
          close();
          audio.sfx('stamp');
          ui.confetti({ count: 22 });
          (res.achievements || []).forEach((a) =>
            ui.toast(`Achievement: ${a.name}`, { icon: 'trophy', tone: 'amber' })
          );
          router.refresh();
        })
      );
    };

    const openBuilding = (b) => {
      const d = C.def(b.type);
      const inc = city.incomeOf(b);
      const cost = C.upgradeCost(b);
      const sell = C.sellValue(b);
      const close = ui.sheet({
        title: `${d.name} · ${d.ko}`,
        body: `<div class="inspector">
          <div class="ins-art tier-${d.tier}">${d.emoji}</div>
          <div class="ins-grid">
            <div><span class="lab-k">Level</span><b>${b.level} / ${C.MAX_LEVEL}</b></div>
            <div><span class="lab-k">Income</span><b>₩${rate(inc)}/s</b></div>
            <div><span class="lab-k">Adjacency</span><b>+${Math.round(C.adjacencyBonus(city.info().city, b) * 100)}%</b></div>
            <div><span class="lab-k">Sell value</span><b>₩${fmt(sell.coins)}</b></div>
          </div>
          ${
            b.level < C.MAX_LEVEL
              ? `<div class="ins-up"><span class="lab-k">Upgrade to level ${b.level + 1}</span><span class="br-cost">${costChips(
                  cost
                )}</span></div>
                <button class="btn btn-primary btn-block" data-up type="button">Upgrade · +₩${rate(
                  inc * 0.45
                )}/s</button>`
              : `<p class="center muted">Maximum level. This one is finished.</p>`
          }
          <button class="btn btn-ghost btn-block" data-sell type="button">Sell for ₩${fmt(sell.coins)}</button>
          <p class="ins-note">${ui.esc(d.desc)}</p>
        </div>`,
        actions: [{ label: 'Close', cls: 'btn-ghost' }],
      });
      close && null;
      document.querySelector('[data-up]')?.addEventListener('click', () => {
        const res = city.upgrade(b.id);
        if (!res.ok) {
          ui.toast(res.reason || 'Cannot upgrade', { tone: 'amber' });
          return;
        }
        document.querySelector('.scrim')?.remove();
        audio.sfx('levelup');
        ui.toast(`${d.name} → level ${res.building.level}`, { icon: 'sparkle', tone: 'mint' });
        (res.achievements || []).forEach((a) => ui.toast(`Achievement: ${a.name}`, { icon: 'trophy', tone: 'amber' }));
        router.refresh();
      });
      document.querySelector('[data-sell]')?.addEventListener('click', () => {
        ui.modal({
          title: `Sell ${d.name}?`,
          body: `<p class="small muted">You get ${fmt(sell.coins)} Won and 30% of the materials back.</p>`,
          actions: [
            {
              label: 'Sell',
              cls: 'btn-danger',
              onClick: () => {
                city.sell(b.id);
                audio.sfx('coin');
                router.refresh();
              },
            },
            { label: 'Keep it', cls: 'btn-ghost' },
          ],
        });
      });
    };

    root.querySelectorAll('[data-tile]').forEach((tile) =>
      tile.addEventListener('click', () => {
        const [x, y] = tile.dataset.tile.split(',').map(Number);
        const b = city.buildingAt(x, y);
        audio.sfx('tap');
        if (b) openBuilding(b);
        else openBuild(x, y);
      })
    );

    root.querySelector('[data-ach]')?.addEventListener('click', () => {
      const list = city.achievements();
      ui.sheet({
        title: 'City achievements',
        body: `<div class="ach-list">${list
          .map(
            (a) => `<div class="ach ${a.earned ? 'is-earned' : ''}">
              <span class="ach-ico">${a.earned ? '🏆' : '🔒'}</span>
              <span class="ach-body"><b>${ui.esc(a.name)}</b><span>${ui.esc(a.desc)}</span></span>
              <span class="ach-reward">${a.earned ? 'Earned' : costChips(a.reward)}</span>
            </div>`
          )
          .join('')}</div>`,
        actions: [{ label: 'Close', cls: 'btn-ghost' }],
      });
    });

    root.querySelector('[data-expand]')?.addEventListener('click', () => {
      const info = city.info();
      const res = city.expand();
      if (!res.ok) {
        ui.toast(res.reason || 'Cannot expand', { tone: 'amber' });
        return;
      }
      audio.sfx('stamp');
      ui.confetti({ count: 30 });
      ui.toast(`Grid expanded to ${res.grid}×${res.grid}`, { icon: 'sparkle', tone: 'mint' });
      (res.achievements || []).forEach((a) => ui.toast(`Achievement: ${a.name}`, { icon: 'trophy', tone: 'amber' }));
      router.refresh();
    });

    root.querySelector('[data-prestige]')?.addEventListener('click', () => {
      const info = city.info();
      ui.modal({
        title: `Begin Era ${info.era + 1}?`,
        body: `<p class="small muted">This resets your buildings, materials and Won, but keeps every A1 badge, achievement and cosmetic — and gives a permanent +50% income for every era.</p>
          <p class="center mt-3"><b>Era ${info.era} → Era ${info.era + 1}</b></p>`,
        actions: [
          {
            label: 'Rebuild',
            cls: 'btn-primary',
            onClick: () => {
              city.prestigeNow();
              audio.sfx('streak');
              ui.confetti({ count: 40 });
              ui.toast(`Era ${info.era + 1}: ${C.eraInfo(info.era + 1).name}`, { icon: 'crown', tone: 'amber' });
              router.refresh();
            },
          },
          { label: 'Not yet', cls: 'btn-ghost' },
        ],
      });
    });

    root.querySelector('[data-next]')?.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.next;
      const d = city.catalog().find((x) => x.id === id);
      if (!d) return;
      ui.sheet({
        title: `${d.name} · ${d.ko}`,
        body: `<div class="inspector"><div class="ins-art tier-${d.tier}">${d.emoji}</div>
          <p>${ui.esc(d.desc)}</p>
          <p class="center muted mt-2">Unlock: ${ui.esc(d.lockReason || '')}</p>
          <div class="ins-up"><span class="lab-k">Cost</span><span class="br-cost">${costChips(d.cost)}</span></div></div>`,
        actions: [{ label: 'Close', cls: 'btn-ghost' }],
      });
    });
  },
  destroy() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  },
};
