// Parcels: board drawing and input. Puzzle logic lives in gen.js; the shell in puzzle-kit.js.
import { generate, shapeOf } from './gen.js';
import { initShell } from '../../../assets/js/puzzle-kit.js';

const SVG = 'http://www.w3.org/2000/svg';
const U = 100; // board units per cell
const COLORS = ['#5b8cff', '#ff9f43', '#3ecf8e', '#f7c948', '#c77dff', '#ff5d8f', '#2ec4d6', '#a3d65c'];

const board = document.getElementById('board');
const undoBtn = document.getElementById('btn-undo');

let puzzle = null;
let rects = [];   // placed plots: { r, c, h, w }
let history = [];
let drag = null;  // { a: [r, c], b: [r, c], id }

const el = (tag, attrs = {}, text) => {
  const node = document.createElementNS(SVG, tag);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  if (text != null) node.textContent = text;
  return node;
};

// Give neighbouring plots in the answer different colours.
function colourClues(p) {
  const { n, solution } = p;
  const owner = new Int16Array(n * n);
  solution.forEach((x, i) => {
    for (let r = x.r; r < x.r + x.h; r++) for (let c = x.c; c < x.c + x.w; c++) owner[r * n + c] = i;
  });
  const near = solution.map(() => new Set());
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const a = owner[r * n + c];
    if (c + 1 < n && owner[r * n + c + 1] !== a) { near[a].add(owner[r * n + c + 1]); near[owner[r * n + c + 1]].add(a); }
    if (r + 1 < n && owner[(r + 1) * n + c] !== a) { near[a].add(owner[(r + 1) * n + c]); near[owner[(r + 1) * n + c]].add(a); }
  }
  const colour = [];
  solution.forEach((_, i) => {
    const taken = new Set([...near[i]].map((j) => colour[j]));
    const free = COLORS.filter((_, k) => !taken.has(k));
    colour[i] = COLORS.indexOf(free.length ? free[(Math.random() * free.length) | 0] : COLORS[i % COLORS.length]);
  });
  return colour.map((k) => COLORS[k]);
}

const inside = (x, r, c) => r >= x.r && r < x.r + x.h && c >= x.c && c < x.c + x.w;
const overlaps = (a, b) => a.r < b.r + b.h && b.r < a.r + a.h && a.c < b.c + b.w && b.c < a.c + a.w;
const span = ([r1, c1], [r2, c2]) => ({
  r: Math.min(r1, r2), c: Math.min(c1, c2), h: Math.abs(r1 - r2) + 1, w: Math.abs(c1 - c2) + 1,
});

// The clue a plot belongs to, or -1 if it holds no clue / several clues / doesn't match.
function matchOf(x) {
  const held = puzzle.clues.map((k, i) => (inside(x, k.r, k.c) ? i : -1)).filter((i) => i >= 0);
  if (held.length !== 1) return { clue: held.length ? held[0] : -1, ok: false };
  const k = puzzle.clues[held[0]];
  const ok = k.area === x.h * x.w && (k.shape === 'any' || k.shape === shapeOf(x.h, x.w));
  return { clue: held[0], ok };
}

function shapeBox(shape) {
  if (shape === 'square') return [58, 58];
  if (shape === 'wide') return [76, 46];
  if (shape === 'tall') return [46, 76];
  return null;
}

function render() {
  const { n, clues } = puzzle;
  board.replaceChildren();
  board.setAttribute('viewBox', `0 0 ${n * U} ${n * U}`);

  const grid = el('g', { stroke: 'var(--line)', 'stroke-width': 2 });
  for (let i = 1; i < n; i++) {
    grid.append(el('line', { x1: i * U, y1: 0, x2: i * U, y2: n * U }));
    grid.append(el('line', { x1: 0, y1: i * U, x2: n * U, y2: i * U }));
  }
  board.append(grid);

  const plot = (x, cls, colour) => {
    const g = el('g', { class: cls });
    g.append(el('rect', {
      x: x.c * U + 6, y: x.r * U + 6, width: x.w * U - 12, height: x.h * U - 12, rx: 14,
      fill: colour ?? '#ffffff', 'fill-opacity': colour ? 0.26 : 0.05,
      stroke: colour ?? 'var(--muted)', 'stroke-width': 4, 'stroke-dasharray': colour ? 'none' : '10 8',
    }));
    return g;
  };
  for (const x of rects) {
    const m = matchOf(x);
    board.append(plot(x, 'plot', m.ok ? puzzle.colours[m.clue] : null));
  }

  for (const [i, k] of clues.entries()) {
    const cx = k.c * U + U / 2, cy = k.r * U + U / 2;
    const placed = rects.find((x) => inside(x, k.r, k.c));
    const colour = placed && matchOf(placed).ok ? puzzle.colours[i] : 'var(--text)';
    const box = shapeBox(k.shape);
    if (box) {
      board.append(el('rect', {
        x: cx - box[0] / 2, y: cy - box[1] / 2, width: box[0], height: box[1], rx: 8,
        fill: 'none', stroke: colour, 'stroke-width': 3.5, opacity: 0.85,
      }));
    }
    board.append(el('text', {
      x: cx, y: cy + 1, fill: colour, 'font-size': k.area >= 10 ? 34 : 40, 'font-weight': 650,
      'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-family': 'var(--font-body)',
    }, k.area));
  }

  if (drag) {
    const x = span(drag.a, drag.b);
    const m = matchOf(x);
    const g = plot(x, 'preview', m.ok ? puzzle.colours[m.clue] : '#9b9bbb');
    g.append(el('text', {
      x: (x.c + x.w) * U - 12, y: (x.r + x.h) * U - 12, fill: 'var(--text)', 'font-size': 24, 'font-weight': 600,
      'text-anchor': 'end', 'font-family': 'var(--font-mono)', opacity: 0.8,
    }, x.w * x.h));
    board.append(g);
  }
  undoBtn.disabled = !history.length || shell.done;
}

function commit(next) {
  history.push(rects);
  rects = next;
  render();
  const covered = rects.reduce((s, x) => s + x.h * x.w, 0) === puzzle.n ** 2;
  if (covered && rects.every((x) => matchOf(x).ok)) {
    shell.solved();
    render();
  }
}

function cellAt(e) {
  const box = board.getBoundingClientRect();
  const n = puzzle.n;
  const clamp = (v) => Math.max(0, Math.min(n - 1, v));
  return [clamp(Math.floor(((e.clientY - box.top) / box.height) * n)), clamp(Math.floor(((e.clientX - box.left) / box.width) * n))];
}

board.addEventListener('pointerdown', (e) => {
  if (!puzzle || shell.done || e.button > 0) return;
  board.setPointerCapture(e.pointerId);
  const at = cellAt(e);
  drag = { a: at, b: at, id: e.pointerId };
  render();
});
board.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const at = cellAt(e);
  if (at[0] === drag.b[0] && at[1] === drag.b[1]) return;
  drag.b = at;
  render();
});
const endDrag = (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const { a, b } = drag;
  drag = null;
  if (e.type === 'pointercancel') return render();
  const hit = rects.find((x) => inside(x, a[0], a[1]));
  if (a[0] === b[0] && a[1] === b[1] && hit) return commit(rects.filter((x) => x !== hit));
  const x = span(a, b);
  commit([...rects.filter((y) => !overlaps(x, y)), x]);
};
board.addEventListener('pointerup', endDrag);
board.addEventListener('pointercancel', endDrag);

function undo() {
  if (!history.length || shell.done) return;
  rects = history.pop();
  render();
}
undoBtn.addEventListener('click', undo);
document.getElementById('btn-reset').addEventListener('click', () => { if (rects.length && !shell.done) commit([]); });
document.getElementById('btn-reveal').addEventListener('click', () => {
  if (shell.done) return;
  rects = puzzle.solution.map((x) => ({ ...x }));
  shell.gaveUp();
  render();
});
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
});

const shell = initShell({
  id: 'parcels',
  start(level) {
    puzzle = generate(level);
    puzzle.colours = colourClues(puzzle);
    rects = [];
    history = [];
    drag = null;
    render();
  },
});
