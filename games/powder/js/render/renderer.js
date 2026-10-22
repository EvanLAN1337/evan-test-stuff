// Draws the simulation into a canvas that is exactly grid-sized (1 pixel per particle);
// CSS scales it up with `image-rendering: pixelated`, so drawing cost is independent of screen size.
import { T, SHADES, pack } from '../core/registry.js';
import { AIR_SHIFT } from '../core/air.js';

const BG = pack(10, 10, 18);
const SPARK = [255, 250, 190];

// Black-body-ish glow colour for hot solids/liquids, 480°C → 2480°C in 256 steps.
const GLOW = new Uint8Array(256 * 3);
for (let k = 0; k < 256; k++) {
  const t = k / 255;
  GLOW[k * 3] = 255;
  GLOW[k * 3 + 1] = 60 + 195 * Math.min(1, t * 1.3);
  GLOW[k * 3 + 2] = 255 * Math.max(0, t - 0.55) / 0.45;
}

// Heat-view palette indexed by a compressed temperature scale.
const HEAT_SIZE = 1024, HEAT_GAMMA = 0.35, HEAT_SPAN = 6273.15;
const heatIndex = (c) => {
  const u = (c + 273.15) / HEAT_SPAN;
  return u <= 0 ? 0 : u >= 1 ? HEAT_SIZE - 1 : (Math.pow(u, HEAT_GAMMA) * (HEAT_SIZE - 1)) | 0;
};
const HEAT_STOPS = [
  [-273, [0, 0, 16]], [-150, [70, 0, 170]], [-40, [0, 70, 255]], [0, [0, 170, 255]],
  [20, [10, 70, 60]], [60, [40, 150, 40]], [150, [200, 210, 30]], [400, [255, 140, 0]],
  [1000, [255, 30, 0]], [2500, [255, 255, 255]], [6000, [255, 255, 255]],
];
const HEAT = new Uint32Array(HEAT_SIZE), HEAT_DIM = new Uint32Array(HEAT_SIZE);
for (let k = 0; k < HEAT_SIZE; k++) {
  const c = Math.pow(k / (HEAT_SIZE - 1), 1 / HEAT_GAMMA) * HEAT_SPAN - 273.15;
  let s = 0;
  while (s < HEAT_STOPS.length - 2 && c > HEAT_STOPS[s + 1][0]) s++;
  const [t0, a] = HEAT_STOPS[s], [t1, b] = HEAT_STOPS[s + 1];
  const f = Math.max(0, Math.min(1, (c - t0) / (t1 - t0)));
  const r = a[0] + (b[0] - a[0]) * f, g = a[1] + (b[1] - a[1]) * f, bl = a[2] + (b[2] - a[2]) * f;
  HEAT[k] = pack(r, g, bl);
  HEAT_DIM[k] = pack(r * 0.3 + 6, g * 0.3 + 6, bl * 0.3 + 10);
}

function mix(c, r2, g2, b2, k) {
  const r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255;
  return pack(r + (r2 - r) * k, g + (g2 - g) * k, b + (b2 - b) * k);
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
    this.img = this.ctx.createImageData(w, h);
    this.px = new Uint32Array(this.img.data.buffer);
  }

  draw(sim, view) {
    if (view === 'heat') this.drawHeat(sim);
    else if (view === 'air') { this.drawNormal(sim, 0.45); this.overlayAir(sim); }
    else this.drawNormal(sim, 1);
    this.ctx.putImageData(this.img, 0, 0);
  }

  drawNormal(sim, dim) {
    const px = this.px, type = sim.type, shade = sim.shade, temp = sim.temp, charge = sim.charge;
    const colors = T.colors, glow = T.glow;
    for (let i = 0, n = sim.n; i < n; i++) {
      const t = type[i];
      let c;
      if (t === 0) {
        const tc = temp[i];
        c = tc > 150 ? mix(BG, 120, 30, 10, Math.min(0.5, (tc - 150) / 1500)) : BG;
      } else {
        c = colors[t * SHADES + shade[i]];
        const tc = temp[i];
        if (glow[t] === 1 && tc > 480) {
          const g = Math.min(255, ((tc - 480) * 0.1275) | 0) * 3;
          c = mix(c, GLOW[g], GLOW[g + 1], GLOW[g + 2], Math.min(0.9, 0.25 + (tc - 480) / 1600));
        }
        if (charge[i] > 0) c = mix(c, SPARK[0], SPARK[1], SPARK[2], 0.8);
      }
      if (dim !== 1) c = mix(c, 0, 0, 0, 1 - dim);
      px[i] = c;
    }
  }

  drawHeat(sim) {
    const px = this.px, type = sim.type, temp = sim.temp;
    for (let i = 0, n = sim.n; i < n; i++) {
      px[i] = (type[i] === 0 ? HEAT_DIM : HEAT)[heatIndex(temp[i])];
    }
  }

  overlayAir(sim) {
    const px = this.px, W = sim.w, H = sim.h, air = sim.air, cw = air.cw, p = air.p, vx = air.vx, vy = air.vy;
    for (let y = 0; y < H; y++) {
      const crow = (y >> AIR_SHIFT) * cw;
      for (let x = 0, i = y * W; x < W; x++, i++) {
        const ci = crow + (x >> AIR_SHIFT);
        const pr = p[ci], v = Math.abs(vx[ci]) + Math.abs(vy[ci]);
        if (pr > -0.05 && pr < 0.05 && v < 0.05) continue;
        const c = px[i];
        const r = (c & 255) + Math.max(0, pr) * 40;
        const g = ((c >> 8) & 255) + v * 60;
        const b = ((c >> 16) & 255) + Math.max(0, -pr) * 40;
        px[i] = pack(r, g, b);
      }
    }
  }
}
