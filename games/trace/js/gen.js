// Trace puzzle generator and solver.
// A puzzle is an n×n grid with numbered cells 1..K and optional walls between cells.
// The goal is one path that starts at 1, passes the numbers in order, ends at K and
// visits every cell exactly once, moving up/down/left/right and never through a wall.
// Generation: make a random path through every cell, number some of its cells, then use
// the solver to make sure the answer is unique (adding numbers or walls where needed).

export const DIFFICULTIES = {
  easy:   { n: 5, clues: 7, maxClues: 11, wallRate: 0 },
  medium: { n: 6, clues: 7, maxClues: 11, wallRate: 0.3 },
  hard:   { n: 7, clues: 5, maxClues: 10, wallRate: 0.6 },
};

// Edge key for the wall between two neighbouring cells.
export const edgeKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);

function neighbours(n, x) {
  const r = (x / n) | 0, c = x % n, out = [];
  if (r > 0) out.push(x - n);
  if (r < n - 1) out.push(x + n);
  if (c > 0) out.push(x - 1);
  if (c < n - 1) out.push(x + 1);
  return out;
}

// Random path through every cell, using "backbite" moves on a snake-shaped start.
function randomPath(n, rng) {
  const N = n * n;
  const path = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) path.push(r * n + (r % 2 ? n - 1 - c : c));
  for (let it = 0; it < N * 60; it++) {
    if (rng() < 0.5) path.reverse();
    const end = path[N - 1];
    const opts = neighbours(n, end).filter((x) => x !== path[N - 2]);
    const k = path.indexOf(opts[(rng() * opts.length) | 0]);
    // Join the end to that neighbour and flip the loop that forms.
    for (let i = k + 1, j = N - 1; i < j; i++, j--) [path[i], path[j]] = [path[j], path[i]];
  }
  return path;
}

// Finds up to `limit` solutions. `numAt[cell]` is the cell's number (0 if none).
// Returns { sols, aborted }; aborted means the search hit its node budget.
export function solve(n, numAt, walls, limit = 2, maxNodes = 250000) {
  const N = n * n;
  const adj = [];
  for (let x = 0; x < N; x++) adj.push(neighbours(n, x).filter((y) => !walls.has(edgeKey(x, y))));
  let K = 0, start = -1, end = -1;
  for (let x = 0; x < N; x++) if (numAt[x] > K) K = numAt[x];
  for (let x = 0; x < N; x++) { if (numAt[x] === 1) start = x; if (numAt[x] === K) end = x; }

  const vis = new Uint8Array(N);
  const seen = new Uint8Array(N);
  const stack = new Int16Array(N);
  const path = [start];
  const sols = [];
  let nodes = 0, aborted = false;
  vis[start] = 1;

  // The cells left must stay connected to the head, and every cell left (except the
  // final number) needs two ways in or out, otherwise it would be a dead end.
  function viable(head) {
    const left = N - path.length;
    seen.fill(0);
    let top = 0, count = 0;
    stack[top++] = head; seen[head] = 1;
    while (top) {
      const x = stack[--top];
      for (const y of adj[x]) {
        if (vis[y] || seen[y]) continue;
        seen[y] = 1; count++; stack[top++] = y;
      }
    }
    if (count !== left) return false;
    for (let x = 0; x < N; x++) {
      if (vis[x]) continue;
      let d = 0;
      for (const y of adj[x]) if (!vis[y] || y === head) d++;
      if (d < (x === end ? 1 : 2)) return false;
    }
    return true;
  }

  (function rec(cur, next) {
    if (path.length === N) { if (cur === end) sols.push(path.slice()); return; }
    if (++nodes > maxNodes) { aborted = true; return; }
    for (const y of adj[cur]) {
      if (vis[y]) continue;
      const m = numAt[y];
      if (m && m !== next) continue;
      if (y === end && path.length !== N - 1) continue;
      vis[y] = 1; path.push(y);
      if (viable(y)) rec(y, m ? next + 1 : next);
      vis[y] = 0; path.pop();
      if (sols.length >= limit || aborted) return;
    }
  })(start, 2);
  return { sols, aborted };
}

export function generate(level = 'medium', rng = Math.random) {
  const cfg = DIFFICULTIES[level];
  const { n } = cfg;
  const N = n * n;
  for (let attempt = 0; attempt < 60; attempt++) {
    const path = randomPath(n, rng);
    const onPath = new Set();
    for (let i = 1; i < N; i++) onPath.add(edgeKey(path[i - 1], path[i]));

    // Numbered positions along the path: both ends plus one random spot per stretch.
    const idx = new Set([0, N - 1]);
    const gap = (N - 1) / (cfg.clues - 1);
    for (let k = 1; k < cfg.clues - 1; k++) idx.add(Math.round(gap * (k - 0.5 + rng())));
    const walls = new Set();

    for (let guard = 0; guard < 40 && idx.size <= cfg.maxClues; guard++) {
      const numAt = new Int16Array(N);
      [...idx].sort((a, b) => a - b).forEach((i, k) => { numAt[path[i]] = k + 1; });
      const { sols, aborted } = solve(n, numAt, walls);
      const alt = sols.find((s) => s.some((x, i) => x !== path[i]));
      if (!alt && !aborted) return { level, n, numAt: Array.from(numAt), walls: [...walls], solution: path };

      if (!alt) {
        // Search too big to finish: number the middle of the longest unnumbered stretch.
        const sorted = [...idx].sort((a, b) => a - b);
        let bi = 0;
        for (let k = 1; k < sorted.length; k++) if (sorted[k] - sorted[k - 1] > sorted[bi + 1] - sorted[bi]) bi = k - 1;
        idx.add((sorted[bi] + sorted[bi + 1]) >> 1);
        continue;
      }
      // Rule out the other answer, either with a wall on an edge only it uses,
      // or by numbering the first cell where it leaves the real path.
      const extra = [];
      for (let i = 1; i < N; i++) {
        const e = edgeKey(alt[i - 1], alt[i]);
        if (!onPath.has(e) && !walls.has(e)) extra.push(e);
      }
      if (extra.length && rng() < cfg.wallRate) {
        walls.add(extra[(rng() * extra.length) | 0]);
      } else {
        idx.add(alt.findIndex((x, i) => x !== path[i]));
      }
    }
  }
  throw new Error('Could not generate a puzzle');
}
