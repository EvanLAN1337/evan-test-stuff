// Builds the categorised element/tool palette from the registry, categories and tools.
import { elements, ids } from '../core/registry.js';
import { CATEGORIES } from '../content/categories.js';
import { TOOLS } from '../content/tools.js';

const nameOf = (id) => (id === null || id === undefined ? 'nothing' : elements[ids[id]]?.name ?? id);

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

export function buildPalette(root, { onSelect }) {
  const tabs = root.querySelector('.cat-tabs');
  const list = root.querySelector('.items');
  const info = root.querySelector('.item-desc');
  const search = root.querySelector('input[type=search]');

  const items = [];
  for (const t of TOOLS) {
    items.push({ key: `tool:${t.id}`, kind: 'tool', id: t.id, name: t.name, category: 'tools',
      color: t.color, icon: t.icon, desc: t.desc, facts: [] });
  }
  for (let n = 1; n < elements.length; n++) {
    const d = elements[n];
    if (d.hidden) continue;
    items.push({ key: `element:${d.id}`, kind: 'element', id: d.id, name: d.name, category: d.category,
      color: Array.isArray(d.color) ? d.color[0] : d.color, desc: d.desc ?? '', facts: facts(d) });
  }

  const cats = CATEGORIES.filter((c) => items.some((it) => it.category === c.id));
  for (const it of items) {
    if (!cats.some((c) => c.id === it.category)) {
      console.warn(`[powder] unknown category "${it.category}" (add it to content/categories.js)`);
      cats.push({ id: it.category, name: it.category, icon: '•' });
    }
  }

  const byKey = new Map(items.map((it) => [it.key, it]));
  let current = cats.find((c) => c.id === 'powders')?.id ?? cats[0].id;
  let primaryKey = null, secondaryKey = null;

  tabs.innerHTML = cats.map((c) =>
    `<button type="button" role="tab" data-cat="${c.id}" title="${c.name}"><span aria-hidden="true">${c.icon}</span> ${c.name}</button>`
  ).join('');

  function showInfo(it) {
    if (!it) { info.innerHTML = ''; return; }
    info.innerHTML = `<b></b> <span class="desc"></span><span class="facts"></span>`;
    info.querySelector('b').textContent = it.name;
    info.querySelector('.desc').textContent = it.desc;
    info.querySelector('.facts').textContent = it.facts.join(' · ');
  }

  function render() {
    const q = search.value.trim().toLowerCase();
    const shown = q
      ? items.filter((it) => it.name.toLowerCase().includes(q) || it.id.includes(q))
      : items.filter((it) => it.category === current);
    for (const b of tabs.children) b.setAttribute('aria-selected', String(!q && b.dataset.cat === current));
    list.innerHTML = shown.map((it) =>
      `<button type="button" class="item${it.key === primaryKey ? ' sel' : ''}${it.key === secondaryKey ? ' sec' : ''}"
        data-key="${it.key}" style="--c:${it.color}"><span class="sw">${it.icon ?? ''}</span><span class="nm">${it.name}</span></button>`
    ).join('') || '<p class="empty">Nothing found.</p>';
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
    },
    get(kind, id) { return byKey.get(`${kind}:${id}`); },
  };
}
