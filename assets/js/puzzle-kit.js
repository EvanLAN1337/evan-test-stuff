// Shared shell for grid puzzle pages: difficulty switch, timer, best times and the win card.
// The page supplies the markup (see games/parcels/index.html) and a `start(level)` callback
// that builds and draws a new puzzle.

export const LEVELS = ['easy', 'medium', 'hard'];

export function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

// localStorage can throw (private windows, blocked storage); the game works without it.
function load(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

export function initShell({ id, start }) {
  const $ = (s) => document.getElementById(s);
  const timeEl = $('time'), bestEl = $('best'), clockEl = timeEl.parentElement;
  const win = $('win'), board = $('board'), help = $('help');
  const levelBtns = [...document.querySelectorAll('#levels [data-level]')];
  const stats = load(`${id}:stats`, {});

  let level = LEVELS.includes(load(`${id}:level`)) ? load(`${id}:level`) : 'easy';
  let elapsed = 0, since = 0, running = false, done = false;

  const now = () => elapsed + (running ? performance.now() - since : 0);
  const pause = () => { if (running) { elapsed += performance.now() - since; running = false; } clockEl.classList.add('paused'); };
  const resume = () => { if (!done && !running) { since = performance.now(); running = true; } clockEl.classList.remove('paused'); };

  function showBest() {
    const s = stats[level];
    bestEl.textContent = s?.best ? `Best ${formatTime(s.best)} · ${s.solved} solved` : '';
  }
  setInterval(() => { timeEl.textContent = formatTime(now()); }, 200);
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : resume()));

  function newPuzzle() {
    win.hidden = true;
    board.classList.remove('locked');
    done = false; elapsed = 0; running = false;
    start(level);
    if (!help.open) resume();
    timeEl.textContent = formatTime(0);
    showBest();
  }

  function setLevel(next) {
    level = next;
    save(`${id}:level`, level);
    levelBtns.forEach((b) => b.classList.toggle('on', b.dataset.level === level));
    newPuzzle();
  }

  function finish(card) {
    pause();
    done = true;
    board.classList.add('locked');
    if (!card) return;
    win.querySelector('.win-card').innerHTML = card;
    win.hidden = false;
    win.querySelector('[data-next]').addEventListener('click', newPuzzle);
    win.querySelector('[data-next]').focus({ preventScroll: true });
  }

  const api = {
    get level() { return level; },
    get done() { return done; },
    newPuzzle,
    // Call when the player solves the puzzle.
    solved() {
      if (done) return;
      const t = now();
      const s = stats[level] ?? { best: 0, solved: 0 };
      const record = !s.best || t < s.best;
      s.solved++;
      if (record) s.best = t;
      stats[level] = s;
      save(`${id}:stats`, stats);
      showBest();
      const name = level[0].toUpperCase() + level.slice(1);
      finish(`<h2>Solved!</h2>
        <p class="big">${formatTime(t)}</p>
        <p>${record ? `<span class="rec">New best for ${name}</span>` : `${name} best ${formatTime(s.best)}`}</p>
        <button type="button" class="tb primary" data-next>Next puzzle</button>`);
    },
    // Call when the player asks for the answer: stops the clock without recording a time.
    gaveUp() {
      if (!done) finish();
    },
  };

  levelBtns.forEach((b) => b.addEventListener('click', () => b.dataset.level !== level && setLevel(b.dataset.level)));
  $('btn-new').addEventListener('click', newPuzzle);
  // The clock stops while the rules are open.
  const openHelp = () => { help.showModal(); pause(); };
  help.addEventListener('close', resume);
  $('btn-help').addEventListener('click', openHelp);
  document.addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, textarea') || e.ctrlKey || e.metaKey || e.altKey || help.open) return;
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); newPuzzle(); }
  });
  if (!load(`${id}:seen-help`, false)) { save(`${id}:seen-help`, true); openHelp(); }

  levelBtns.forEach((b) => b.classList.toggle('on', b.dataset.level === level));
  queueMicrotask(newPuzzle);
  return api;
}
