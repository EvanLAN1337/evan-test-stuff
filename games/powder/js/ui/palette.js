// Builds the categorised element/tool palette from the registry, categories and tools.
import { elements, ids, T, SHADES, STATE } from '../core/registry.js';
import { CATEGORIES } from '../content/categories.js';
import { TOOLS } from '../content/tools.js';

const nameOf = (id) => (id === null || id === undefined ? 'nothing' : elements[ids[id]]?.name ?? id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const BURNS = new Set(['fire', 'ember', 'burning_magnesium', 'burning_napalm']);

/** Small hazard/trait badges shown on an element's button. */
export function traits(d) {
  const out = [];
  if (d.radioactive) out.push(['☢', 'Radioactive']);
  if (d.transitions?.some((tr) => tr.explode)) out.push(['💥', 'Explosive']);
  else if (d.transitions?.some((tr) => BURNS.has(tr.to))) out.push(['🔥', 'Flammable']);
  if (d.conductive) out.push(['⚡', 'Conducts electricity']);
  if (d.temp !== undefined && d.temp < -50) out.push(['❄', 'Cryogenic']);
  return out;
}

/** Auto-generated quick facts for an element, from its definition. */
export function facts(d) {
  const out = [d.state[0].toUpperCase() + d.state.slice(1)];
  if (d.state !== 'solid' && d.density !== undefined) out.push(`${d.density} kg/m³`);
  if (d.temp !== undefined) out.push(`starts at ${d.temp}°C`);
  const seen = new Set();
  for (const tr of d.transitions ?? []) {
    const cmp = tr.above !== undefined ? `above ${tr.above}°C` : `below ${tr.below}°C`;
    const txt = tr.explode ? `explodes ${cmp}` : `${cmp} → ${nameOf(tr.to)}`;
    if (!seen.has(txt)) { seen.add(txt); out.push(txt); }
  }
  if (d.conductive) out.push('conducts electricity');
  if (d.indestructible) out.push('indestructible');
  return out;
}

/** Names of the elements this one has a reaction entry for. */
function reactsWith(d) {
  return Object.keys(d.reactions ?? {}).map(nameOf);
}

// A tiny pixel texture for each element, painted with its real particle colours, so the
// buttons look like the material: dense for solids, grainy for powders, banded for liquids,
// wispy for gases.
const TEX = 8;
let texCanvas = null;
function texture(n) {
  texCanvas ??= Object.assign(document.createElement('canvas'), { width: TEX, height: TEX });
  const ctx = texCanvas.getContext('2d');
  const img = ctx.createImageData(TEX, TEX);
  const px = new Uint32Array(img.data.buffer);
  const s = T.state[n];
  let seed = n * 2654435761 >>> 0;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      const fill = s === STATE.GAS ? 0.45 : s === STATE.POWDER ? 0.88 : 1;
      if (rand() > fill) continue;
      let c = T.colors[n * SHADES + ((s === STATE.LIQUID ? y + (x >> 2) : rand() * SHADES) | 0) % SHADES];
      if (s === STATE.LIQUID && y === 0) c = (c & 0xff000000) | (Math.min(255, (c & 255) + 40)) | (Math.min(255, ((c >> 8) & 255) + 40) << 8) | (Math.min(255, ((c >> 16) & 255) + 40) << 16);
      px[y * TEX + x] = c;
    }
  }
  ctx.putImageData(img, 0, 0);
  return texCanvas.toDataURL();
}

export function buildPalette(root, { onSelect }) {
  const tabs = root.querySelector('.cat-tabs');
  const list = root.querySelector('.items');
  const info = root.querySelector('.item-desc');
  const search = root.querySelector('input[type=search]');

  const items = [];
  for (const t of TOOLS) {
    items.push({ key: `tool:${t.id}`, kind: 'tool', id: t.id, name: t.name, category: 'tools',
      color: t.color, icon: t.icon, desc: t.desc, facts: [], traits: [], reacts: [], tex: '' });
  }
  for (let n = 1; n < elements.length; n++) {
    const d = elements[n];
    if (d.hidden) continue;
    items.push({ key: `element:${d.id}`, kind: 'element', id: d.id, name: d.name, category: d.category,
      color: Array.isArray(d.color) ? d.color[0] : d.color, desc: d.desc ?? '', facts: facts(d),
      traits: traits(d), reacts: reactsWith(d), tex: texture(n) });
  }

  const cats = CATEGORIES.filter((c) => items.some((it) => it.category === c.id));
  for (const it of items) {
    if (!cats.some((c) => c.id === it.category)) {
      console.warn(`[powder] unknown category "${it.category}" (add it to content/categories.js)`);
      cats.push({ id: it.category, name: it.category, icon: '•' });
    }
  }
  const catOf = Object.fromEntries(cats.map((c) => [c.id, c]));

  const byKey = new Map(items.map((it) => [it.key, it]));
  let current = cats.find((c) => c.id === 'powders')?.id ?? cats[0].id;
  let primaryKey = null, secondaryKey = null;

  tabs.innerHTML = cats.map((c) => {
    const count = items.filter((it) => it.category === c.id).length;
    return `<button type="button" role="tab" data-cat="${c.id}" title="${esc(c.name)} (${count})" style="--cc:${c.color ?? '#8f93b8'}">`
      + `<span class="ic" aria-hidden="true">${c.icon}</span><span class="cn">${esc(c.name)}</span></button>`;
  }).join('');

  function showInfo(it) {
    if (!it) { info.innerHTML = ''; return; }
    const chips = it.traits.map(([g, label]) => `<span class="chip">${g} ${label}</span>`).join('');
    const reacts = it.reacts.length ? `<span class="reacts">Reacts with ${esc(it.reacts.join(', '))}</span>` : '';
    info.style.setProperty('--c', it.color);
    info.innerHTML = `<span class="big-sw" style="${it.tex ? `background-image:url(${it.tex})` : ''}">${it.icon ?? ''}</span>`
      + `<span class="txt"><b>${esc(it.name)}</b>${chips}<span class="desc">${esc(it.desc)}</span>`
      + `<span class="facts">${esc(it.facts.join(' · '))}</span>${reacts}</span>`;
  }

  function render() {
    const q = search.value.trim().toLowerCase();
    const shown = q
      ? items.filter((it) => it.name.toLowerCase().includes(q) || it.id.includes(q))
      : items.filter((it) => it.category === current);
    for (const b of tabs.children) b.setAttribute('aria-selected', String(!q && b.dataset.cat === current));
    root.style.setProperty('--cat', catOf[current]?.color ?? '#8f93b8');
    list.innerHTML = shown.map((it) => {
      const slot = it.key === primaryKey ? '<span class="slot l">L</span>' : it.key === secondaryKey ? '<span class="slot r">R</span>' : '';
      const badges = it.traits.slice(0, 2).map(([g, label]) => `<i title="${label}">${g}</i>`).join('');
      return `<button type="button" class="item${it.key === primaryKey ? ' sel' : ''}${it.key === secondaryKey ? ' sec' : ''}"
        data-key="${it.key}" style="--c:${it.color}"><span class="sw"${it.tex ? ` style="background-image:url(${it.tex})"` : ''}>${it.icon ?? ''}</span>`
        + `<span class="nm">${esc(it.name)}</span><span class="tr">${badges}</span>${slot}</button>`;
    }).join('') || '<p class="empty">Nothing found.</p>';
  }

  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-cat]');
    if (!b) return;
    current = b.dataset.cat;
    search.value = '';
    render();
  });
  list.addEventListener('click', (e) => {
    const b = e.target.closest('.item');
    if (b) onSelect(byKey.get(b.dataset.key), 'primary');
  });
  list.addEventListener('contextmenu', (e) => {
    const b = e.target.closest('.item');
    if (!b) return;
    e.preventDefault();
    onSelect(byKey.get(b.dataset.key), 'secondary');
  });
  list.addEventListener('pointerover', (e) => {
    const b = e.target.closest('.item');
    if (b) showInfo(byKey.get(b.dataset.key));
  });
  list.addEventListener('pointerleave', () => showInfo(byKey.get(primaryKey)));
  search.addEventListener('input', render);

  render();

  return {
    /** Mark which items are selected for the left/right buttons. */
    setSelected(primary, secondary) {
      primaryKey = `${primary.kind}:${primary.id}`;
      secondaryKey = `${secondary.kind}:${secondary.id}`;
      const it = byKey.get(primaryKey);
      if (it && !search.value) current = it.category;
      render();
      showInfo(it);
      list.querySelector('.item.sel')?.classList.add('pop');
    },
    get(kind, id) { return byKey.get(`${kind}:${id}`); },
  };
}
