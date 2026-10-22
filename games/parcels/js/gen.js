// Parcels puzzle generator and solver.
// A puzzle is an n×n grid with clues. Each clue is a cell holding an area and a shape hint.
// The goal is to split the grid into rectangles, one per clue, each with that clue's area and shape.
// Generation: randomly tile the grid with rectangles, drop one clue in each, then use the solver
// to make sure the answer is unique (revealing shape hints where needed).

export const DIFFICULTIES = {
  easy:   { n: 5, maxArea: 6,  minArea: 2, anyRate: 0,    maxSingles: 1 },
  medium: { n: 6, maxArea: 8,  minArea: 2, anyRate: 0.35, maxSingles: 1 },
  hard:   { n: 8, maxArea: 12, minArea: 3, anyRate: 0.6,  maxSingles: 2 },
};

export const shapeOf = (h, w) => (h === w ? 'square' : w > h ? 'wide' : 'tall');
const fits = (hint, h, w) => hint === 'any' || shapeOf(h, w) === hint;
const sameRect = (a, b) => a.r === b.r && a.c === b.c && a.h === b.h && a.w === b.w;

// Randomly tile the grid. Scanning row-major, the first free cell is always the top-left
// corner of the next rectangle, so only rectangles growing right and down need checking.
function partition(n, cfg, rng) {
  const owner = new Int16Array(n * n).fill(-1);
  const rects = [];
  for (let i = 0; i < n * n; i++) {
    if (owner[i] >= 0) continue;
    const r = (i / n) | 0, c = i % n;
    let maxW = 0;
    while (c + maxW < n && owner[r * n + c + maxW] < 0) maxW++;
    const cands = [];
    let total = 0;
    for (let w = 1; w <= maxW; w++) {
      for (let h = 1; r + h <= n && w * h <= cfg.maxArea; h++) {
        let free = true;
        for (let k = 0; k < w; k++) if (owner[(r + h - 1) * n + c + k] >= 0) { free = false; break; }
        if (!free) break;
        const a = w * h;
        const weight = a < cfg.minArea ? 0.03 : Math.sqrt(a) * (h === w ? 1.3 : 1);
        cands.push({ h, w, weight });
        total += weight;
      }
    }
    let x = rng() * total, pick = cands[cands.length - 1];
    for (const cand of cands) { x -= cand.weight; if (x <= 0) { pick = cand; break; } }
    const id = rects.length;
    rects.push({ r, c, h: pick.h, w: pick.w });
    for (let dr = 0; dr < pick.h; dr++) for (let dc = 0; dc < pick.w; dc++) owner[(r + dr) * n + c + dc] = id;
  }
  return rects;
}

// Finds up to `limit` solutions. Returns an array of solutions; each lists one rect per clue.
export function solve(n, clues, limit = 2) {
  const clueAt = new Int16Array(n * n).fill(-1);
  clues.forEach((k, i) => { clueAt[k.r * n + k.c] = i; });
  const cands = clues.map((k, i) => {
    const list = [];
    for (let h = 1; h <= k.area; h++) {
      if (k.area % h) continue;
      const w = k.area / h;
      if (h > n || w > n || !fits(k.shape, h, w)) continue;
      for (let r0 = k.r - h + 1; r0 <= k.r; r0++) {
        for (let c0 = k.c - w + 1; c0 <= k.c; c0++) {
          if (r0 < 0 || c0 < 0 || r0 + h > n || c0 + w > n) continue;
          const cells = [];
          let ok = true;
          for (let r = r0; r < r0 + h && ok; r++) {
            for (let c = c0; c < c0 + w; c++) {
              const j = clueAt[r * n + c];
              if (j >= 0 && j !== i) { ok = false; break; }
              cells.push(r * n + c);
            }
          }
          if (ok) list.push({ r: r0, c: c0, h, w, cells });
        }
      }
    }
    return list;
  });

  const used = new Uint8Array(n * n);
  const cover = new Uint8Array(n * n);
  const pick = new Array(clues.length).fill(null);
  const sols = [];
  const free = (x) => x.cells.every((q) => !used[q]);

  (function rec(placed) {
    if (placed === clues.length) {
      sols.push(pick.map(({ r, c, h, w }) => ({ r, c, h, w })));
      return;
    }
    // Pick the clue with the fewest options left, and bail out early if any free cell
    // can no longer be covered by anything.
    let best = -1, bestList = null;
    cover.set(used);
    for (let i = 0; i < clues.length; i++) {
      if (pick[i]) continue;
      const l = cands[i].filter(free);
      if (!l.length) return;
      for (const x of l) for (const q of x.cells) cover[q] = 1;
      if (!bestList || l.length < bestList.length) { best = i; bestList = l; }
    }
    if (cover.includes(0)) return;
    for (const x of bestList) {
      for (const q of x.cells) used[q] = 1;
      pick[best] = x;
      rec(placed + 1);
      pick[best] = null;
      for (const q of x.cells) used[q] = 0;
      if (sols.length >= limit) return;
    }
  })(0);
  return sols;
}

export function generate(level = 'medium', rng = Math.random) {
  const cfg = DIFFICULTIES[level];
  const { n } = cfg;
  for (let attempt = 0; attempt < 400; attempt++) {
    const rects = partition(n, cfg, rng);
    if (rects.filter((x) => x.h * x.w === 1).length > cfg.maxSingles) continue;
    const clues = rects.map((x) => ({
      r: x.r + ((rng() * x.h) | 0),
      c: x.c + ((rng() * x.w) | 0),
      area: x.h * x.w,
      shape: rng() < cfg.anyRate ? 'any' : shapeOf(x.h, x.w),
    }));
    // If another answer exists, reveal the shape of a clue it gets wrong and try again.
    for (let guard = 0; guard <= clues.length; guard++) {
      const sols = solve(n, clues, 2);
      const alt = sols.find((s) => s.some((x, i) => !sameRect(x, rects[i])));
      if (!alt) return { level, n, clues, solution: rects };
      const i = clues.findIndex((k, j) => k.shape === 'any' && !sameRect(alt[j], rects[j]));
      if (i < 0) break;
      clues[i].shape = shapeOf(rects[i].h, rects[i].w);
    }
  }
  throw new Error('Could not generate a puzzle');
}
