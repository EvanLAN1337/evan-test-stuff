// Free neutrons: a light particle layer on top of the grid. Neutrons don't occupy cells; they fly
// in straight lines (fast ones 2 cells per step, slow ones 1) and, each time they enter a new cell,
// ask that cell's element what happens (see `neutron` / `onNeutron` in the README):
//   PASS     keep flying            ABSORB   the neutron is gone
//   REFLECT  bounce back            SCATTER  random new direction, slowed to "thermal" speed
// Slow neutrons are the ones that split uranium best, which is why moderators matter.
import { T, NEUTRON } from './registry.js';
import { rnd, rint } from './rng.js';

const { PASS, ABSORB, REFLECT, SCATTER, HOOK } = NEUTRON;
export const CAP = 20000;

export class Neutrons {
  constructor() {
    this.x = new Float32Array(CAP); this.y = new Float32Array(CAP);
    this.vx = new Float32Array(CAP); this.vy = new Float32Array(CAP);
    this.life = new Int16Array(CAP);
    this.slow = new Uint8Array(CAP);
    this.cell = new Int32Array(CAP); // last cell entered, so each cell is only met once
    this.count = 0;
  }

  clear() { this.count = 0; }

  /** Launch a neutron from (x, y) in a random direction (or `angle`, radians). */
  add(x, y, slow = 0, angle = rnd() * Math.PI * 2) {
    const k = this.count;
    if (k >= CAP) return;
    this.count = k + 1;
    this.x[k] = x; this.y[k] = y;
    this.vx[k] = Math.cos(angle); this.vy[k] = Math.sin(angle);
    this.life[k] = 90 + rint(70);
    this.slow[k] = slow;
    this.cell[k] = -1;
  }

  step(sim) {
    const W = sim.w, H = sim.h, type = sim.type;
    const { x, y, vx, vy, life, slow, cell } = this;
    const mode = T.nMode, chance = T.nChance, absorb = T.nAbsorb, hook = T.nHook;
    for (let k = 0; k < this.count;) {
      let alive = --life[k] > 0;
      for (let s = slow[k] ? 1 : 2; s > 0 && alive; s--) {
        x[k] += vx[k]; y[k] += vy[k];
        const cx = x[k] | 0, cy = y[k] | 0;
        if (x[k] < 0 || y[k] < 0 || cx >= W || cy >= H) { alive = false; break; }
        const i = cy * W + cx;
        if (i === cell[k]) continue;
        cell[k] = i;
        const u = type[i];
        if (u === 0) continue;
        let r = mode[u];
        if (r === HOOK) r = hook[u](sim, i, slow[k] === 1);
        else if (rnd() >= chance[u]) r = PASS;
        else if (r === SCATTER && rnd() < absorb[u]) r = ABSORB;

        if (r === ABSORB) alive = false;
        else if (r === REFLECT) {
          x[k] -= vx[k]; y[k] -= vy[k];
          const a = Math.atan2(-vy[k], -vx[k]) + (rnd() - 0.5) * 1.2;
          vx[k] = Math.cos(a); vy[k] = Math.sin(a);
          cell[k] = -1;
        } else if (r === SCATTER) {
          const a = rnd() * Math.PI * 2;
          vx[k] = Math.cos(a); vy[k] = Math.sin(a);
          slow[k] = 1;
        }
      }
      if (alive) { k++; continue; }
      // Remove by moving the last neutron into this slot.
      const last = --this.count;
      x[k] = x[last]; y[k] = y[last]; vx[k] = vx[last]; vy[k] = vy[last];
      life[k] = life[last]; slow[k] = slow[last]; cell[k] = cell[last];
    }
  }
}
