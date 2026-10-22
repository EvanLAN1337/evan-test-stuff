// Trace: board drawing and input. Puzzle logic lives in gen.js; the shell in puzzle-kit.js.
import { generate, edgeKey } from './gen.js';
import { initShell } from '../../../assets/js/puzzle-kit.js';

const SVG = 'http://www.w3.org/2000/svg';
const U = 100; // board units per cell
const LINE = '#3ef0ff';
const DONE = '#b6ff3e';

const board = document.getElementById('board');
const undoBtn = document.getElementById('btn-undo');

let puzzle = null;
let walls = new Set();
let last = 0;      // highest number on the board
let path = [];     // cells in order
let history = [];  // path before each stroke
let dragId = null;
let revealed = false;

// The line on screen trails `path` a little so it glides into each new cell.
let shown = [];   // the path as currently drawn
let headAt = 0;   // how far along `shown` the line's head is, in cells (fractional mid-glide)
let raf = 0, lastT = 0;
const calm = matchMedia('(prefers-reduced-motion: reduce)');

const el = (tag, attrs = {}, text) => {
  const node = document.createElementNS(SVG, tag);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  if (text != null) node.textContent = text;
  return node;
};
const centre = (x) => [(x % puzzle.n) * U + U / 2, Math.floor(x / puzzle.n) * U + U / 2];

// Ask for a redraw; the line then eases toward `path` over the next few frames.
function render() {
  if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(tick); }
}

function tick(t) {
  raf = 0;
  const dt = Math.min(50, t - lastT);
  lastT = t;
  let p = 0;
  while (p < shown.length && p < path.length && shown[p] === path[p]) p++;
  let target = path.length - 1;
  if (!path.length) { shown = []; headAt = 0; target = 0; }
  else if (p === 0) { shown = path.slice(); headAt = 0; }
  else if (p < shown.length && headAt > p - 1) target = p - 1; // back up along the old line first
  else shown = path.slice();

  const d = target - headAt;
  const eased = calm.matches ? d : d * (1 - Math.exp(-dt / 45));
  const minStep = (dt / 1000) * 3; // never slower than 3 cells a second
  headAt = Math.abs(d) <= minStep || Math.abs(eased) >= Math.abs(d) ? target : headAt + (Math.abs(eased) < minStep ? Math.sign(d) * minStep : eased);
  draw();
  if (headAt !== target || shown.length !== path.length) render();
}

function draw() {
  const { n, numAt } = puzzle;
  const solved = shell.done && !revealed;
  const colour = solved ? DONE : LINE;
  board.replaceChildren();
  board.setAttribute('viewBox', `0 0 ${n * U} ${n * U}`);

  const i0 = Math.floor(headAt), f = headAt - i0;
  const filled = el('g', { fill: colour });
  shown.forEach((x, i) => {
    if (i > i0 + 1 || (i === i0 + 1 && !f)) return;
    filled.append(el('rect', { x: (x % n) * U, y: Math.floor(x / n) * U, width: U, height: U, 'fill-opacity': i > i0 ? 0.09 * f : 0.09 }));
  });
  board.append(filled);

  const grid = el('g', { stroke: 'var(--line)', 'stroke-width': 2 });
  for (let i = 1; i < n; i++) {
    grid.append(el('line', { x1: i * U, y1: 0, x2: i * U, y2: n * U }));
    grid.append(el('line', { x1: 0, y1: i * U, x2: n * U, y2: i * U }));
  }
  board.append(grid);

  const pts = shown.slice(0, i0 + 1).map(centre);
  if (f && i0 + 1 < shown.length) {
    const [ax, ay] = centre(shown[i0]), [bx, by] = centre(shown[i0 + 1]);
    pts.push([ax + (bx - ax) * f, ay + (by - ay) * f]);
  }
  if (pts.length > 1) {
    board.append(el('polyline', {
      points: pts.map((q) => q.join(',')).join(' '),
      fill: 'none', stroke: colour, 'stroke-width': 34, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.9,
    }));
  }

  const wallG = el('g', { stroke: 'var(--text)', 'stroke-width': 10, 'stroke-linecap': 'round' });
  for (const key of walls) {
    const [a, b] = key.split('-').map(Number);
    const [ar, ac] = [Math.floor(a / n), a % n];
    if (b === a + 1) wallG.append(el('line', { x1: (ac + 1) * U, y1: ar * U, x2: (ac + 1) * U, y2: (ar + 1) * U }));
    else wallG.append(el('line', { x1: ac * U, y1: (ar + 1) * U, x2: (ac + 1) * U, y2: (ar + 1) * U }));
  }
  board.append(wallG);

  const onPath = new Set(shown.slice(0, i0 + 1));
  numAt.forEach((m, x) => {
    if (!m) return;
    const [cx, cy] = centre(x);
    const hit = onPath.has(x);
    board.append(el('circle', { cx, cy, r: 27, fill: hit ? colour : 'var(--text)' }));
    board.append(el('text', {
      x: cx, y: cy + 1, fill: 'var(--bg)', 'font-size': m >= 10 ? 26 : 30, 'font-weight': 700,
      'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-family': 'var(--font-body)',
    }, m));
  });

  if (pts.length && !shell.done) {
    const [cx, cy] = pts[pts.length - 1];
    board.append(el('circle', { cx, cy, r: 12, fill: 'var(--bg)', stroke: colour, 'stroke-width': 5 }));
  }
  undoBtn.disabled = !history.length || shell.done;
}

// Highest number already on the line, so the next one needed is this + 1.
const reached = () => path.reduce((m, x) => Math.max(m, puzzle.numAt[x]), 0);
const adjacent = (a, b) => {
  const n = puzzle.n;
  return (Math.abs(a - b) === n) || (Math.abs(a - b) === 1 && Math.floor(a / n) === Math.floor(b / n));
};

function step(x) {
  const end = path[path.length - 1];
  if (path.includes(x) || !adjacent(end, x) || walls.has(edgeKey(end, x))) return false;
  const top = reached();
  if (top === last) return false; // the line already ends on the last number
  const m = puzzle.numAt[x];
  if (m && m !== top + 1) return false;
  path.push(x);
  return true;
}

// Move the line toward cell x: back up if x is on it, otherwise extend one cell at a time.
function reach(x) {
  if (!path.length) return;
  const i = path.indexOf(x);
  if (i >= 0) { path.length = i + 1; return; }
  const n = puzzle.n;
  const [tr, tc] = [Math.floor(x / n), x % n];
  for (let guard = 0; guard < 2 * n; guard++) {
    const end = path[path.length - 1];
    if (end === x) return;
    const [r, c] = [Math.floor(end / n), end % n];
    const dr = Math.sign(tr - r), dc = Math.sign(tc - c);
    const byRow = dr ? end + dr * n : -1, byCol = dc ? end + dc : -1;
    const tries = Math.abs(tr - r) >= Math.abs(tc - c) ? [byRow, byCol] : [byCol, byRow];
    if (!tries.some((y) => y >= 0 && step(y))) return;
  }
}

function changed() {
  render();
  if (path.length === puzzle.n ** 2 && puzzle.numAt[path[path.length - 1]] === last) {
    shell.solved();
    render();
  }
}

function cellAt(e, margin = 0.12) {
  const box = board.getBoundingClientRect();
  const n = puzzle.n;
  const fx = ((e.clientX - box.left) / box.width) * n, fy = ((e.clientY - box.top) / box.height) * n;
  const c = Math.floor(fx), r = Math.floor(fy);
  if (r < 0 || c < 0 || r >= n || c >= n) return -1;
  // Ignore the outer edge of a cell so diagonal swipes don't clip a corner.
  const ex = fx - c, ey = fy - r;
  if (Math.min(ex, 1 - ex, ey, 1 - ey) < margin) return null;
  return r * n + c;
}

board.addEventListener('pointerdown', (e) => {
  if (!puzzle || shell.done || e.button > 0) return;
  const x = cellAt(e, 0);
  if (x == null || x < 0) return;
  const before = path.slice();
  if (puzzle.numAt[x] === 1) path = [x];
  else if (path.includes(x)) path.length = path.indexOf(x) + 1;
  else if (path.length && adjacent(path[path.length - 1], x)) step(x);
  else return;
  history.push(before);
  dragId = e.pointerId;
  board.setPointerCapture(e.pointerId);
  changed();
});
board.addEventListener('pointermove', (e) => {
  if (e.pointerId !== dragId || shell.done) return;
  const x = cellAt(e);
  if (x == null || x < 0 || x === path[path.length - 1]) return;
  reach(x);
  changed();
});
const endDrag = (e) => {
  if (e.pointerId !== dragId) return;
  dragId = null;
  const prev = history[history.length - 1];
  if (prev && prev.length === path.length && prev.every((x, i) => x === path[i])) history.pop();
  render();
};
board.addEventListener('pointerup', endDrag);
board.addEventListener('pointercancel', endDrag);

function undo() {
  if (!history.length || shell.done) return;
  path = history.pop();
  render();
}
undoBtn.addEventListener('click', undo);
document.getElementById('btn-reset').addEventListener('click', () => {
  if (!path.length || shell.done) return;
  history.push(path);
  path = [];
  render();
});
document.getElementById('btn-reveal').addEventListener('click', () => {
  if (shell.done) return;
  path = puzzle.solution.slice();
  revealed = true;
  shell.gaveUp();
  render();
});

const DIRS = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
document.addEventListener('keydown', (e) => {
  if (!puzzle || shell.done || document.getElementById('help').open) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
  if (e.key === 'Backspace') { e.preventDefault(); if (path.length) { history.push(path.slice()); path.pop(); render(); } return; }
  const d = DIRS[e.key];
  if (!d) return;
  e.preventDefault();
  const n = puzzle.n;
  const before = path.slice();
  if (!path.length) path = [puzzle.numAt.indexOf(1)];
  const end = path[path.length - 1];
  const [r, c] = [Math.floor(end / n) + d[0], (end % n) + d[1]];
  if (r >= 0 && c >= 0 && r < n && c < n) {
    const x = r * n + c;
    if (x === path[path.length - 2]) path.pop();
    else step(x);
  }
  if (path.length !== before.length) history.push(before);
  changed();
});

const shell = initShell({
  id: 'trace',
  start(level) {
    puzzle = generate(level);
    walls = new Set(puzzle.walls);
    last = Math.max(...puzzle.numAt);
    path = [];
    history = [];
    dragId = null;
    revealed = false;
    shown = [];
    headAt = 0;
    render();
  },
});
