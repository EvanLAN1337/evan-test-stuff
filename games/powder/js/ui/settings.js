// Settings schema + persistent store. The settings panel is generated from SCHEMA,
// so adding a setting is one entry here; read it anywhere via settings.values.<key>.
//   type: 'range' | 'select' | 'toggle'      hidden: true = stored but not shown in the panel
//   restart: true = changing it rebuilds the world (e.g. grid size)

export const GRID_SIZES = {
  s: [200, 125],
  m: [320, 200],
  l: [480, 300],
  xl: [640, 400],
};

export const SCHEMA = [
  { key: 'gridSize', group: 'World', label: 'Grid size', type: 'select', default: 'm', restart: true,
    options: [['s', 'Small (200 × 125)'], ['m', 'Medium (320 × 200)'], ['l', 'Large (480 × 300)'], ['xl', 'Huge (640 × 400, fast PC)']] },
  { key: 'edges', group: 'World', label: 'Edges', type: 'select', default: 'wall',
    options: [['wall', 'Solid (things pile up)'], ['void', 'Void (things fall out)']] },
  { key: 'ambient', group: 'World', label: 'Ambient temperature', type: 'range', min: -60, max: 120, step: 1, default: 20, unit: '°C' },

  { key: 'speed', group: 'Simulation', label: 'Speed', type: 'range', min: 0.25, max: 3, step: 0.25, default: 1, unit: '×' },
  { key: 'heat', group: 'Simulation', label: 'Heat conduction', type: 'toggle', default: true },
  { key: 'airCooling', group: 'Simulation', label: 'Air cooling', type: 'range', min: 0, max: 1, step: 0.05, default: 0.25 },
  { key: 'air', group: 'Simulation', label: 'Air & pressure', type: 'toggle', default: true },

  { key: 'brushShape', group: 'Brush', label: 'Shape', type: 'select', default: 'circle',
    options: [['circle', 'Circle'], ['square', 'Square']] },
  { key: 'replace', group: 'Brush', label: 'Draw over existing particles', type: 'toggle', default: false },

  { key: 'brushSize', type: 'range', min: 0, max: 30, default: 3, hidden: true },
];

const STORAGE_KEY = 'powder-lab:settings:v1';

export class Settings {
  constructor(schema = SCHEMA) {
    this.schema = schema;
    this.values = {};
    this.listeners = new Set();
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { /* storage blocked */ }
    for (const s of schema) this.values[s.key] = saved[s.key] !== undefined ? saved[s.key] : s.default;
  }

  get(key) { return this.values[key]; }

  set(key, value) {
    if (this.values[key] === value) return;
    this.values[key] = value;
    this.save();
    for (const fn of this.listeners) fn(key, value);
  }

  reset() {
    for (const s of this.schema) if (!s.hidden) this.set(s.key, s.default);
  }

  save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.values)); } catch { /* storage blocked */ }
  }

  onChange(fn) { this.listeners.add(fn); }
}

/** Builds the settings form inside `root` from the schema. */
export function buildSettingsPanel(root, settings) {
  root.textContent = '';
  const groups = new Map();
  for (const s of settings.schema) {
    if (s.hidden) continue;
    if (!groups.has(s.group)) {
      const fs = document.createElement('fieldset');
      fs.innerHTML = `<legend>${s.group}</legend>`;
      root.append(fs);
      groups.set(s.group, fs);
    }
    const row = document.createElement('label');
    row.className = 'set-row';
    const name = document.createElement('span');
    name.textContent = s.label;
    row.append(name);
    let input;
    if (s.type === 'toggle') {
      input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = !!settings.get(s.key);
      input.addEventListener('change', () => settings.set(s.key, input.checked));
    } else if (s.type === 'select') {
      input = document.createElement('select');
      for (const [v, l] of s.options) input.add(new Option(l, v));
      input.value = settings.get(s.key);
      input.addEventListener('change', () => settings.set(s.key, input.value));
    } else {
      input = document.createElement('input');
      input.type = 'range';
      Object.assign(input, { min: s.min, max: s.max, step: s.step ?? 1 });
      input.value = settings.get(s.key);
      const out = document.createElement('output');
      const show = () => { out.textContent = `${input.value}${s.unit ?? ''}`; };
      show();
      input.addEventListener('input', () => { show(); settings.set(s.key, Number(input.value)); });
      row.append(input, out);
      input.dataset.key = s.key;
      groups.get(s.group).append(row);
      continue;
    }
    input.dataset.key = s.key;
    row.append(input);
    groups.get(s.group).append(row);
  }
}
