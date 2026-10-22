// The particle simulation. All per-cell state lives in flat typed arrays indexed by i = y * w + x.
//   type   element id (0 = empty air)        temp   temperature in °C (air cells have one too)
//   life   lifetime counter / per-element scratch (e.g. what a Clone copies)
//   shade  colour variant 0..7               charge electricity (>0 charged, <0 recovering)
//   stamp  tick on which the cell last moved (prevents moving twice per step)
import { T, ids, STATE, AIR_DENSITY } from './registry.js';
import { rnd, rint } from './rng.js';
import { Air, AIR_SHIFT } from './air.js';

const { SOLID, POWDER, LIQUID, GAS } = STATE;
const NX = [-1, 0, 1, -1, 1, -1, 0, 1];
const NY = [-1, -1, -1, 0, 0, 1, 1, 1];
const N4X = [-1, 1, 0, 0];
const N4Y = [0, 0, -1, 1];
export const MIN_TEMP = -273.15;
export const MAX_TEMP = 9999;

export class Sim {
  /** @param settings live settings object (reads .ambient, .heat, .air, .airCooling, .edges) */
  constructor(w, h, settings) {
    this.settings = settings;
    this.resize(w, h);
  }

  resize(w, h) {
    this.w = w; this.h = h;
    const n = this.n = w * h;
    this.type = new Uint16Array(n);
    this.temp = new Float32Array(n);
    this.life = new Int16Array(n);
    this.shade = new Uint8Array(n);
    this.charge = new Int8Array(n);
    this.stamp = new Uint8Array(n);
    this.air = new Air(w, h);
    this.tick = 0;
    this.clear();
  }

  clear() {
    this.type.fill(0); this.life.fill(0); this.charge.fill(0); this.stamp.fill(0);
    this.temp.fill(this.settings.ambient);
    this.air.clear();
  }

  // ---------- helpers (also used by element hooks and tools) ----------

  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }

  /** Change a cell's element, keeping its temperature. */
  morph(i, t) {
    this.type[i] = t;
    this.charge[i] = 0;
    if (t === 0) { this.life[i] = 0; return; }
    const hi = T.lifeMax[t];
    this.life[i] = hi > 0 ? T.lifeMin[t] + rint(hi - T.lifeMin[t] + 1) : 0;
    this.shade[i] = rint(8);
  }

  /** Place a fresh particle (uses the element's spawn temperature, or ambient). */
  spawn(i, t) {
    this.morph(i, t);
    const st = T.spawnTemp[t];
    this.temp[i] = st === st ? st : this.settings.ambient;
  }

  clearCell(i) { this.morph(i, 0); }

  /** Remove a particle and reset the spot to ambient temperature. */
  erase(i) { this.morph(i, 0); this.temp[i] = this.settings.ambient; }

  addHeat(i, d) {
    const v = this.temp[i] + d;
    this.temp[i] = v < MIN_TEMP ? MIN_TEMP : v > MAX_TEMP ? MAX_TEMP : v;
  }

  /** Charge a conductor if it is ready. */
  energize(i) {
    if (T.conductive[this.type[i]] === 1 && this.charge[i] === 0) this.charge[i] = 4;
  }

  /** Index of a random one of the 8 neighbours, or -1 if off-grid. */
  randomNeighbor(x, y) {
    const d = rint(8), nx = x + NX[d], ny = y + NY[d];
    return nx >= 0 && ny >= 0 && nx < this.w && ny < this.h ? ny * this.w + nx : -1;
  }

  /** Index of 4-neighbour k (0 left, 1 right, 2 up, 3 down), or -1 if off-grid. */
  n4(x, y, k) {
    const nx = x + N4X[k], ny = y + N4Y[k];
    return nx >= 0 && ny >= 0 && nx < this.w && ny < this.h ? ny * this.w + nx : -1;
  }

  /** Blast: destroys/ignites nearby cells, heats explosives so they chain, and adds air pressure. */
  explode(x, y, r) {
    const W = this.w, H = this.h, type = this.type, temp = this.temp, fire = ids.fire;
    const center = y * W + x, r2 = r * r;
    this.morph(center, fire);
    temp[center] = 1500;
    for (let dy = -r; dy <= r; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= H) continue;
      for (let dx = -r; dx <= r; dx++) {
        const nx = x + dx, d2 = dx * dx + dy * dy;
        if (nx < 0 || nx >= W || d2 > r2) continue;
        const j = ny * W + nx, u = type[j];
        if (j === center || T.indestructible[u]) continue;
        const f = 1 - Math.sqrt(d2) / (r + 1);
        if (T.explosive[u]) { temp[j] += 1200; continue; }
        temp[j] = Math.min(MAX_TEMP, temp[j] + 700 * f + 150);
        const p = u === 0 ? f : T.state[u] === SOLID ? f * 0.25 : f * 0.4;
        if (rnd() < p) { this.morph(j, fire); temp[j] = Math.max(temp[j], 1200); }
      }
    }
    this.air.addPressure(x, y, r * 4);
  }

  /** Electricity: a charged conductor passes charge to neighbouring conductors, then recovers. */
  conduct(i, x, y) {
    const charge = this.charge;
    let c = charge[i];
    if (c > 0) {
      if (c === 4) {
        const type = this.type, temp = this.temp, cd = T.conductive;
        for (let k = 0; k < 4; k++) {
          const j = this.n4(x, y, k);
          if (j < 0) continue;
          const u = type[j];
          if (cd[u] === 1) {
            // Stamping the neighbour delays it to next step, so current travels exactly 1 cell per step.
            if (charge[j] === 0) { charge[j] = 4; this.stamp[j] = this.tick; }
          } else if (u !== 0) temp[j] += 200 * T.invCap[u]; // sparks are hot: ignites gunpowder, wood, ...
        }
        temp[i] += 3;
      }
      c = c === 1 ? -6 : c - 1;
    } else {
      c++;
    }
    charge[i] = c;
  }

  conductHeat() {
    const W = this.w, H = this.h, type = this.type, temp = this.temp, cond = T.cond, invCap = T.invCap;
    // Horizontal pairs.
    for (let y = 0; y < H; y++) {
      let i = y * W;
      for (let x = 0; x < W - 1; x++, i++) {
        const a = type[i], b = type[i + 1];
        const ka = cond[a], kb = cond[b], k = ka < kb ? ka : kb;
        if (k === 0) continue;
        const q = (temp[i] - temp[i + 1]) * k;
        temp[i] -= q * invCap[a]; temp[i + 1] += q * invCap[b];
      }
    }
    // Vertical pairs.
    for (let i = 0, n = W * (H - 1); i < n; i++) {
      const a = type[i], b = type[i + W];
      const ka = cond[a], kb = cond[b], k = ka < kb ? ka : kb;
      if (k === 0) continue;
      const q = (temp[i] - temp[i + W]) * k;
      temp[i] -= q * invCap[a]; temp[i + W] += q * invCap[b];
    }
    // Empty air drifts back toward ambient.
    const rate = this.settings.airCooling * 0.02;
    if (rate > 0) {
      const amb = this.settings.ambient;
      for (let i = 0, n = this.n; i < n; i++) if (type[i] === 0) temp[i] += (amb - temp[i]) * rate;
    }
  }

  // ---------- main update ----------

  step() {
    const W = this.w, H = this.h, s = this.settings;
    const type = this.type, temp = this.temp, life = this.life, shade = this.shade, charge = this.charge, stamp = this.stamp;
    const st = T.state, dens = T.density, disp = T.dispersion, moveChance = T.moveChance, slip = T.slip, drag = T.airDrag,
      hold = T.hold, hasHold = T.hasHold, ambRate = T.ambRate, lifeMax = T.lifeMax, decayTo = T.decayTo,
      decayChance = T.decayChance, flicker = T.flicker, conductive = T.conductive, hooks = T.hooks, trans = T.trans,
      hasReact = T.hasReact, react = T.react, N = T.N;
    const amb = s.ambient;
    const tick = this.tick = this.tick >= 255 ? 1 : this.tick + 1;

    if (s.heat) this.conductHeat();
    const airOn = s.air;
    const air = this.air;
    if (airOn) air.step(this);
    const CW = air.cw, avx = air.vx, avy = air.vy;

    const move = (i, j) => {
      const t = type[i]; type[i] = type[j]; type[j] = t;
      const tt = temp[i]; temp[i] = temp[j]; temp[j] = tt;
      const l = life[i]; life[i] = life[j]; life[j] = l;
      const sh = shade[i]; shade[i] = shade[j]; shade[j] = sh;
      const c = charge[i]; charge[i] = charge[j]; charge[j] = c;
      stamp[i] = tick; stamp[j] = tick;
    };
    // Sink into empty space or a lighter fluid.
    const tryDown = (i, j, t) => {
      const u = type[j];
      if (u === 0) { move(i, j); return true; }
      const su = st[u];
      if ((su === LIQUID || su === GAS) && dens[u] < dens[t] && (su === GAS || rnd() < 0.5)) { move(i, j); return true; }
      return false;
    };
    // Rise into empty space or through a heavier fluid.
    const tryUp = (i, j, t) => {
      const u = type[j];
      if (u === 0) { move(i, j); return true; }
      const su = st[u];
      if ((su === GAS || su === LIQUID) && u !== t && dens[u] > dens[t] && rnd() < 0.5) { move(i, j); return true; }
      return false;
    };

    for (let y = H - 1; y >= 0; y--) {
      const row = y * W;
      const ltr = ((y + tick) & 1) === 0;
      for (let k = 0; k < W; k++) {
        const x = ltr ? k : W - 1 - k;
        const i = row + x;
        let t = type[i];
        if (t === 0 || stamp[i] === tick) continue;

        // 1. Custom behaviour hook. Returning true skips the default physics.
        const hook = hooks[t];
        if (hook !== null) {
          if (hook(this, i, x, y) === true) continue;
          t = type[i];
          if (t === 0) continue;
        }

        // 2. Lifetime.
        if (lifeMax[t] > 0 && --life[i] <= 0) {
          const d = decayTo[t];
          this.morph(i, d !== 0 && rnd() < decayChance[t] ? d : 0);
          continue;
        }

        // 3. Heat sources and ambient relaxation.
        if (hasHold[t] === 1) temp[i] += (hold[t] - temp[i]) * 0.3;
        else if (ambRate[t] > 0) temp[i] += (amb - temp[i]) * ambRate[t];

        // 4. Temperature transitions (melt, boil, freeze, ignite, explode...).
        const tl = trans[t];
        if (tl !== null) {
          const tc = temp[i];
          let changed = false;
          for (let q = 0; q < tl.length; q++) {
            const tr = tl[q];
            if ((tr.hi ? tc > tr.at : tc < tr.at) && (tr.chance >= 1 || rnd() < tr.chance)) {
              if (tr.explode > 0) this.explode(x, y, tr.explode);
              else { this.morph(i, tr.to); if (tr.temp === tr.temp) temp[i] = tr.temp; }
              changed = true;
              break;
            }
          }
          if (changed) continue;
        }

        // 5. Reactions with one random neighbour.
        if (hasReact[t] === 1) {
          const d = rint(8), nx = x + NX[d], ny = y + NY[d];
          if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
            const j = ny * W + nx, r = react[t * N + type[j]];
            if (r !== null && rnd() < r.chance) {
              if (r.other >= 0) this.morph(j, r.other);
              if (r.otherHeat !== 0) temp[j] += r.otherHeat;
              if (r.selfHeat !== 0) temp[i] += r.selfHeat;
              if (r.self >= 0) { this.morph(i, r.self); continue; }
            }
          }
        }

        // 6. Electricity and visuals.
        if (conductive[t] === 1 && charge[i] !== 0) this.conduct(i, x, y);
        if (flicker[t] === 1) shade[i] = rint(8);

        // 7. Movement.
        const s0 = st[t];
        if (s0 === SOLID) continue;
        if (moveChance[t] < 1 && rnd() >= moveChance[t]) continue;

        if (airOn) {
          const dg = drag[t];
          if (dg > 0) {
            const ci = (y >> AIR_SHIFT) * CW + (x >> AIR_SHIFT);
            const ax = avx[ci], ay = avy[ci], ma = (ax < 0 ? -ax : ax) + (ay < 0 ? -ay : ay);
            if (ma > 0.05 && rnd() < ma * dg) {
              const dx = rnd() * ma < (ax < 0 ? -ax : ax) ? (ax > 0 ? 1 : -1) : 0;
              const dy = rnd() * ma < (ay < 0 ? -ay : ay) ? (ay > 0 ? 1 : -1) : 0;
              const nx = x + dx, ny = y + dy;
              if ((dx !== 0 || dy !== 0) && nx >= 0 && nx < W && ny >= 0 && ny < H) {
                const j = ny * W + nx, u = type[j];
                if (u === 0 || (st[u] === GAS && u !== t)) { move(i, j); continue; }
              }
            }
          }
        }

        if (s0 === POWDER) {
          if (y + 1 < H) {
            const b = i + W;
            if (tryDown(i, b, t)) continue;
            if (slip[t] >= 1 || rnd() < slip[t]) {
              const d = rnd() < 0.5 ? -1 : 1;
              if (x + d >= 0 && x + d < W && tryDown(i, b + d, t)) continue;
              if (x - d >= 0 && x - d < W && tryDown(i, b - d, t)) continue;
            }
          }
        } else if (s0 === LIQUID) {
          if (y + 1 < H) {
            const b = i + W;
            if (tryDown(i, b, t)) continue;
            const d = rnd() < 0.5 ? -1 : 1;
            if (x + d >= 0 && x + d < W && tryDown(i, b + d, t)) continue;
            if (x - d >= 0 && x - d < W && tryDown(i, b - d, t)) continue;
          }
          // Spread sideways up to `dispersion` cells, stopping early above a drop.
          const dir = rnd() < 0.5 ? -1 : 1, n = disp[t];
          let best = -1;
          for (let q = 1; q <= n; q++) {
            const nx = x + dir * q;
            if (nx < 0 || nx >= W) break;
            const j = i + dir * q, u = type[j];
            if (u !== 0 && st[u] !== GAS) break;
            best = j;
            if (y + 1 < H && type[j + W] === 0) break;
          }
          if (best >= 0) move(i, best);
        } else {
          // Gas: drift up (or down if heavier than air) with lots of jitter.
          const up = dens[t] < AIR_DENSITY ? -1 : 1, r = rnd();
          let dx, dy;
          if (r < 0.55) { dy = up; dx = rint(3) - 1; }
          else if (r < 0.9) { dy = 0; dx = rnd() < 0.5 ? -1 : 1; }
          else if (r < 0.95) { dy = -up; dx = 0; }
          else continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
          const j = ny * W + nx;
          if (dy < 0) tryUp(i, j, t);
          else if (dy > 0) tryDown(i, j, t);
          else {
            const u = type[j];
            if (u === 0 || (st[u] === GAS && u !== t && rnd() < 0.3)) move(i, j);
          }
        }
      }
    }

    if (s.edges === 'void') {
      for (let x = 0; x < W; x++) { this.clearCell(x); this.clearCell((H - 1) * W + x); }
      for (let y = 1; y < H - 1; y++) { this.clearCell(y * W); this.clearCell(y * W + W - 1); }
    }
  }
}
