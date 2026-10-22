// Pointer input for the canvas (mouse, touch and pen via Pointer Events).
// It only records state; the main loop reads it once per frame and paints.
export class Input {
  constructor(canvas, { onWheel, onPick }) {
    this.canvas = canvas;
    this.down = false;
    this.button = 0;      // 0 primary, 2 secondary (erase), 1 middle (pick)
    this.pos = null;      // current grid position {x, y} (float)
    this.last = null;     // position at the last painted frame
    this.hover = null;    // grid cell under the pointer, or null
    this.pointerId = null;
    this.gridW = 1; this.gridH = 1;

    canvas.addEventListener('pointerdown', (e) => {
      if (this.pointerId !== null) return; // ignore extra fingers
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      this.pointerId = e.pointerId;
      this.button = e.pointerType === 'mouse' ? e.button : 0;
      this.pos = this.toGrid(e);
      this.hover = this.cell(this.pos);
      if (this.button === 1) { onPick(this.hover); this.release(); return; }
      this.down = true;
      this.last = null;
    });
    canvas.addEventListener('pointermove', (e) => {
      if (this.pointerId !== null && e.pointerId !== this.pointerId) return;
      this.pos = this.toGrid(e);
      this.hover = this.cell(this.pos);
    });
    const end = (e) => {
      if (e.pointerId !== this.pointerId) return;
      this.release();
      if (e.pointerType !== 'mouse') this.hover = null;
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('pointerleave', (e) => { if (!this.down && e.pointerType === 'mouse') this.hover = null; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); onWheel(e.deltaY < 0 ? 1 : -1); }, { passive: false });
  }

  release() {
    this.down = false;
    this.pointerId = null;
    this.last = null;
  }

  setGrid(w, h) { this.gridW = w; this.gridH = h; }

  toGrid(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * this.gridW, y: ((e.clientY - r.top) / r.height) * this.gridH };
  }

  cell(p) {
    const x = Math.floor(p.x), y = Math.floor(p.y);
    return x >= 0 && y >= 0 && x < this.gridW && y < this.gridH ? { x, y } : null;
  }
}
