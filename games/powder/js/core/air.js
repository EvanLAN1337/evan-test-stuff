// Coarse air simulation: velocity + pressure on a grid 4x smaller than the particle grid.
// It's a cheap wave-equation style solver: pressure follows velocity divergence, velocity
// follows the pressure gradient, and solids block flow. Particles read the velocity to drift.
import { T, STATE } from './registry.js';

export const AIR_SHIFT = 2;           // coarse cell = 4x4 particles
const CS = 1 << AIR_SHIFT;
const MAX_P = 200, MAX_V = 12;

export class Air {
  constructor(w, h) {
    this.cw = (w + CS - 1) >> AIR_SHIFT;
    this.ch = (h + CS - 1) >> AIR_SHIFT;
    const n = this.cw * this.ch;
    this.vx = new Float32Array(n); this.vy = new Float32Array(n); this.p = new Float32Array(n);
    this.nvx = new Float32Array(n); this.nvy = new Float32Array(n); this.np = new Float32Array(n);
    this.blocked = new Uint8Array(n);
  }

  clear() {
    for (const a of [this.vx, this.vy, this.p, this.nvx, this.nvy, this.np]) a.fill(0);
  }

  step(sim) {
    const { cw, ch, blocked } = this;
    const W = sim.w, H = sim.h, type = sim.type, st = T.state;

    // A coarse cell is blocked when the particle at its centre is a solid.
    for (let cy = 0, ci = 0; cy < ch; cy++) {
      const fy = Math.min(H - 1, (cy << AIR_SHIFT) + 2) * W;
      for (let cx = 0; cx < cw; cx++, ci++) {
        const t = type[fy + Math.min(W - 1, (cx << AIR_SHIFT) + 2)];
        blocked[ci] = t !== 0 && st[t] === STATE.SOLID ? 1 : 0;
      }
    }

    let { vx, vy, p, nvx, nvy, np } = this;

    // Pressure from divergence (+ a little smoothing).
    for (let y = 1; y < ch - 1; y++) {
      for (let x = 1, i = y * cw + 1; x < cw - 1; x++, i++) {
        if (blocked[i]) { np[i] = 0; continue; }
        const pi = p[i];
        const pl = blocked[i - 1] ? pi : p[i - 1], pr = blocked[i + 1] ? pi : p[i + 1];
        const pu = blocked[i - cw] ? pi : p[i - cw], pd = blocked[i + cw] ? pi : p[i + cw];
        const div = (vx[i + 1] - vx[i - 1] + vy[i + cw] - vy[i - cw]) * 0.5;
        let v = (pi * 0.6 + (pl + pr + pu + pd) * 0.1 - div * 0.6) * 0.997;
        np[i] = v > MAX_P ? MAX_P : v < -MAX_P ? -MAX_P : v;
      }
    }
    [p, np] = [np, p];

    // Velocity from the pressure gradient (+ smoothing and damping).
    for (let y = 1; y < ch - 1; y++) {
      for (let x = 1, i = y * cw + 1; x < cw - 1; x++, i++) {
        if (blocked[i]) { nvx[i] = 0; nvy[i] = 0; continue; }
        const pi = p[i];
        const pl = blocked[i - 1] ? pi : p[i - 1], pr = blocked[i + 1] ? pi : p[i + 1];
        const pu = blocked[i - cw] ? pi : p[i - cw], pd = blocked[i + cw] ? pi : p[i + cw];
        let ax = (vx[i] * 0.8 + (vx[i - 1] + vx[i + 1] + vx[i - cw] + vx[i + cw]) * 0.05 - (pr - pl) * 0.3) * 0.985;
        let ay = (vy[i] * 0.8 + (vy[i - 1] + vy[i + 1] + vy[i - cw] + vy[i + cw]) * 0.05 - (pd - pu) * 0.3) * 0.985;
        nvx[i] = ax > MAX_V ? MAX_V : ax < -MAX_V ? -MAX_V : ax;
        nvy[i] = ay > MAX_V ? MAX_V : ay < -MAX_V ? -MAX_V : ay;
      }
    }
    [vx, nvx] = [nvx, vx];
    [vy, nvy] = [nvy, vy];

    Object.assign(this, { vx, vy, p, nvx, nvy, np });
  }

  /** Add pressure around a particle-grid position. */
  addPressure(x, y, amount) {
    const cx = x >> AIR_SHIFT, cy = y >> AIR_SHIFT;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 1 || ny < 1 || nx >= this.cw - 1 || ny >= this.ch - 1) continue;
        const i = ny * this.cw + nx;
        this.p[i] = Math.max(-MAX_P, Math.min(MAX_P, this.p[i] + amount * (dx || dy ? 0.5 : 1)));
      }
    }
  }

  /** Add velocity in a radius (particle units) around a particle-grid position. */
  addVelocity(x, y, r, dvx, dvy) {
    const cx = x >> AIR_SHIFT, cy = y >> AIR_SHIFT, cr = Math.max(1, (r >> AIR_SHIFT) + 1);
    for (let dy = -cr; dy <= cr; dy++) {
      for (let dx = -cr; dx <= cr; dx++) {
        if (dx * dx + dy * dy > cr * cr) continue;
        const nx = cx + dx, ny = cy + dy;
        if (nx < 1 || ny < 1 || nx >= this.cw - 1 || ny >= this.ch - 1) continue;
        const i = ny * this.cw + nx;
        this.vx[i] = Math.max(-MAX_V, Math.min(MAX_V, this.vx[i] + dvx));
        this.vy[i] = Math.max(-MAX_V, Math.min(MAX_V, this.vy[i] + dvy));
      }
    }
  }
}
