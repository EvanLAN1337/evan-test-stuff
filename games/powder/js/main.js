// Powder Lab bootstrap: wires the simulation, renderer, palette, input and settings together.
import './content/elements/index.js'; // registers all elements
import { build, ids, elements, T } from './core/registry.js';
import { Sim } from './core/sim.js';
import { rnd } from './core/rng.js';
import { Renderer } from './render/renderer.js';
import { Settings, GRID_SIZES, buildSettingsPanel } from './ui/settings.js';
import { buildPalette } from './ui/palette.js';
import { Input } from './ui/input.js';
import { TOOLS } from './content/tools.js';
import { serialize, deserialize, applySave } from './io/save.js';

build();

const $ = (id) => document.getElementById(id);
const canvas = $('canvas'), stage = $('stage'), cursor = $('cursor');

const settings = new Settings();
const S = settings.values;
const [gw, gh] = GRID_SIZES[S.gridSize] ?? GRID_SIZES.m;
const sim = new Sim(gw, gh, S);
const renderer = new Renderer(canvas);
const toolById = Object.fromEntries(TOOLS.map((t) => [t.id, t]));

const app = {
  primary: { kind: 'element', id: 'sand' },
  secondary: { kind: 'tool', id: 'eraser' },
  view: 'normal',
  paused: false,
  scale: 1,
};

// ---------- toast ----------
let toastTimer = 0;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

// ---------- layout ----------
function fitCanvas() {
  const r = stage.getBoundingClientRect();
  const scale = Math.max(0.1, Math.min((r.width - 16) / sim.w, (r.height - 16) / sim.h));
  app.scale = scale;
  canvas.style.width = `${Math.floor(sim.w * scale)}px`;
  canvas.style.height = `${Math.floor(sim.h * scale)}px`;
}
function onResizeWorld() {
  renderer.resize(sim.w, sim.h);
  input.setGrid(sim.w, sim.h);
  fitCanvas();
}
new ResizeObserver(fitCanvas).observe(stage);

// ---------- selection ----------
const palette = buildPalette($('palette'), {
  onSelect(item, slot) {
    if (!item) return;
    if (item.kind === 'tool' && toolById[item.id].pick && slot === 'secondary') return;
    app[slot] = { kind: item.kind, id: item.id };
    updateSelection();
  },
});
function labelOf(sel) {
  return sel.kind === 'tool' ? toolById[sel.id].name : elements[ids[sel.id]].name;
}
function updateSelection() {
  palette.setSelected(app.primary, app.secondary);
  $('selected').textContent = `L: ${labelOf(app.primary)} · R: ${labelOf(app.secondary)}`;
}
function pickAt(cell) {
  if (!cell) return;
  const t = sim.type[cell.y * sim.w + cell.x];
  if (t === 0 || elements[t].hidden) return;
  app.primary = { kind: 'element', id: elements[t].id };
  updateSelection();
  toast(`Picked ${elements[t].name}`);
}

// ---------- brush ----------
let brushCache = { r: -1, shape: '', offs: null };
function brushOffsets(r, shape) {
  if (brushCache.r === r && brushCache.shape === shape) return brushCache.offs;
  const offs = [];
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (shape === 'circle' && dx * dx + dy * dy > r * r + r * 0.6) continue;
      offs.push(dx, dy);
    }
  }
  brushCache = { r, shape, offs: Int16Array.from(offs) };
  return brushCache.offs;
}

function forBrush(cx, cy, fn) {
  const offs = brushOffsets(S.brushSize, S.brushShape), W = sim.w, H = sim.h;
  for (let k = 0; k < offs.length; k += 2) {
    const x = cx + offs[k], y = cy + offs[k + 1];
    if (x >= 0 && y >= 0 && x < W && y < H) fn(y * W + x, x, y);
  }
}

function stamp(sel, cx, cy, ctx) {
  if (sel.kind === 'tool') {
    const tool = toolById[sel.id];
    if (tool.area) tool.area(sim, cx, cy, S.brushSize, ctx);
    if (tool.cell) forBrush(cx, cy, (i) => tool.cell(sim, i, ctx));
    return;
  }
  const t = ids[sel.id], def = elements[t], type = sim.type;
  const chance = S.brushSize === 0 ? 1 : T.paintChance[t];
  forBrush(cx, cy, (i) => {
    if (def.onPaint && def.onPaint(sim, i)) return;
    const u = type[i];
    if (u !== 0 && (!S.replace || u === t || T.indestructible[u])) return;
    if (chance < 1 && rnd() > chance) return;
    sim.spawn(i, t);
  });
}

function paintFrame() {
  if (!input.down || !input.pos) return;
  const sel = input.button === 2 ? app.secondary : app.primary;
  if (sel.kind === 'tool' && toolById[sel.id].pick) { pickAt(input.hover); input.release(); return; }
  const to = input.pos, from = input.last ?? to;
  const ctx = { dx: to.x - from.x, dy: to.y - from.y };
  const dist = Math.hypot(ctx.dx, ctx.dy);
  if (dist === 0) {
    stamp(sel, Math.floor(to.x), Math.floor(to.y), ctx);
  } else {
    // Interpolate along the stroke so fast drags leave no gaps (`from` was stamped last frame).
    const steps = Math.ceil(dist / Math.max(1, S.brushSize * 0.5));
    for (let s = 1; s <= steps; s++) {
      const f = s / steps;
      stamp(sel, Math.floor(from.x + ctx.dx * f), Math.floor(from.y + ctx.dy * f), ctx);
    }
  }
  input.last = { x: to.x, y: to.y };
}

function setBrush(v) {
  v = Math.max(0, Math.min(30, v));
  settings.set('brushSize', v);
  $('brush').value = v;
  $('brush-val').textContent = v;
}

// ---------- input ----------
const input = new Input(canvas, {
  onWheel: (d) => setBrush(S.brushSize + d),
  onPick: pickAt,
});

function updateCursor() {
  const h = input.hover;
  if (!h) { cursor.hidden = true; return; }
  cursor.hidden = false;
  const size = (S.brushSize * 2 + 1) * app.scale;
  const left = canvas.offsetLeft + (h.x + 0.5) * app.scale - size / 2;
  const top = canvas.offsetTop + (h.y + 0.5) * app.scale - size / 2;
  cursor.style.width = cursor.style.height = `${size}px`;
  cursor.style.transform = `translate(${left}px, ${top}px)`;
  cursor.classList.toggle('square', S.brushShape === 'square');
}

let lastHoverText = '';
function updateHover() {
  const h = input.hover;
  let text = '—';
  if (h) {
    const i = h.y * sim.w + h.x, t = sim.type[i];
    const name = t === 0 ? 'Air' : elements[t].name;
    text = `${name} · ${sim.temp[i].toFixed(1)}°C · (${h.x}, ${h.y})`;
    if (sim.charge[i] > 0) text += ' · ⚡';
  }
  if (text !== lastHoverText) { $('hover').textContent = text; lastHoverText = text; }
}

// ---------- toolbar ----------
function setPaused(p) {
  app.paused = p;
  const b = $('btn-play');
  b.textContent = p ? '▶' : '❚❚';
  b.title = p ? 'Play (Space)' : 'Pause (Space)';
  b.classList.toggle('on', p);
}
function setView(v) {
  app.view = v;
  for (const b of document.querySelectorAll('[data-view]')) b.classList.toggle('on', b.dataset.view === v);
}

$('btn-play').addEventListener('click', () => setPaused(!app.paused));
$('btn-step').addEventListener('click', () => { setPaused(true); sim.step(); });
$('btn-clear').addEventListener('click', () => { sim.clear(); toast('Cleared'); });
for (const b of document.querySelectorAll('[data-view]')) b.addEventListener('click', () => setView(b.dataset.view));
$('brush').addEventListener('input', (e) => setBrush(Number(e.target.value)));
setBrush(S.brushSize);

async function save() {
  try {
    const blob = await serialize(sim);
    const d = new Date(), pad = (n) => String(n).padStart(2, '0');
    const name = `powder-lab-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.powder`;
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Saved');
  } catch (err) {
    console.error(err);
    toast('Could not save');
  }
}
async function load(file) {
  try {
    const data = await deserialize(file);
    const prev = sim.w * 100000 + sim.h;
    const missing = applySave(sim, data);
    if (prev !== sim.w * 100000 + sim.h) onResizeWorld();
    toast(missing.length ? `Loaded (unknown: ${missing.join(', ')})` : `Loaded ${file.name}`);
  } catch (err) {
    console.error(err);
    toast(err.message || 'Could not load file');
  }
}
$('btn-save').addEventListener('click', save);
$('btn-load').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) load(f); e.target.value = ''; });
stage.addEventListener('dragover', (e) => e.preventDefault());
stage.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) load(f); });

// ---------- settings ----------
const dlg = $('settings');
buildSettingsPanel($('settings-body'), settings);
$('btn-settings').addEventListener('click', () => dlg.showModal());
$('settings-reset').addEventListener('click', () => { settings.reset(); buildSettingsPanel($('settings-body'), settings); });
dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
settings.onChange((key, value) => {
  if (key === 'gridSize') {
    const [w, h] = GRID_SIZES[value];
    sim.resize(w, h);
    onResizeWorld();
    toast(`World resized to ${w} × ${h}`);
  }
});

// ---------- keyboard ----------
window.addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, select, textarea') || dlg.open) return;
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 's') { e.preventDefault(); save(); }
    if (e.key === 'o') { e.preventDefault(); $('file').click(); }
    return;
  }
  switch (e.key) {
    case ' ': e.preventDefault(); setPaused(!app.paused); break;
    case 'f': case 'F': setPaused(true); sim.step(); break;
    case '1': setView('normal'); break;
    case '2': setView('heat'); break;
    case '3': setView('air'); break;
    case '[': setBrush(S.brushSize - 1); break;
    case ']': setBrush(S.brushSize + 1); break;
    case 'e': case 'E': app.primary = { kind: 'tool', id: 'eraser' }; updateSelection(); break;
    default: return;
  }
});

// ---------- main loop ----------
let last = performance.now(), acc = 0, frames = 0, fpsTime = last;
function frame(now) {
  const dt = Math.min(100, now - last);
  last = now;
  paintFrame();
  if (!app.paused) {
    acc += (dt * 60 / 1000) * S.speed;
    // Fixed 60 steps/s, but never spend more than ~12 ms per frame stepping: on slow machines or
    // huge grids the simulation runs slower instead of the frame rate collapsing.
    const t0 = performance.now();
    let n = 0;
    while (acc >= 1 && n < 4 && (n === 0 || performance.now() - t0 < 12)) { sim.step(); acc -= 1; n++; }
    if (acc >= 1) acc = 0; // couldn't keep up: drop the backlog rather than spiral
  }
  renderer.draw(sim, app.view);
  updateCursor();
  updateHover();
  frames++;
  if (now - fpsTime >= 500) {
    $('fps').textContent = `${Math.round((frames * 1000) / (now - fpsTime))} fps · ${sim.w}×${sim.h}`;
    frames = 0;
    fpsTime = now;
  }
  requestAnimationFrame(frame);
}

onResizeWorld();
updateSelection();
setPaused(false);
setView('normal');
requestAnimationFrame(frame);

// Handy for debugging / experimenting in the console.
window.powder = { sim, settings, ids, elements, T };
