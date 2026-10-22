// Ready-made experiments for the Experiments menu. Each `build(p)` paints into a freshly cleared world.
// `p` has the world size (p.W, p.H) and painting helpers in whole cells, clipped to the world:
//   p.rect(x0, y0, x1, y1, id)        filled rectangle (inclusive)
//   p.box(x0, y0, x1, y1, id, t = 1)  rectangle outline t cells thick, open at the top
//   p.disc(cx, cy, r, id)             filled circle
// Work from p.W / p.H so a scene fits every grid size.

const mid = (p) => Math.round(p.W / 2);

export const SCENES = [
  {
    id: 'reactor', name: 'Self-regulating reactor', icon: '☢️',
    desc: 'Fuel rods in a water pool. Geiger counters switch on the auto rods whenever the neutron count climbs.',
    build(p) {
      const x0 = Math.round(p.W * 0.18), x1 = Math.round(p.W * 0.82), y0 = Math.round(p.H * 0.32), y1 = p.H - 5;
      p.box(x0 - 3, y0, x1 + 3, y1 + 3, 'concrete', 3);
      p.rect(x0, y0 + 4, x1, y1, 'water');
      for (let x = x0 + 6; x + 8 < x1; x += 12) {
        p.rect(x, y0 + 14, x + 2, y1 - 4, 'fuel_rod');
        p.rect(x + 6, y0 + 10, x + 6, y1 - 4, 'auto_rod');
        p.rect(x + 5, y1 - 3, x + 7, y1 - 2, 'geiger');
      }
    },
  },
  {
    id: 'meltdown', name: 'Meltdown', icon: '🔥',
    desc: 'A graphite-moderated core with no control rods. Pour Boron on it if you want to save it.',
    build(p) {
      const c = mid(p), w = Math.round(p.W * 0.22), top = Math.round(p.H * 0.45), bot = p.H - 6;
      p.rect(0, bot + 1, p.W - 1, p.H - 1, 'concrete');
      p.rect(c - w, top, c + w, bot, 'graphite');
      for (let x = c - w + 4; x <= c + w - 4; x += 7) p.rect(x, top + 4, x + 2, bot - 4, 'fuel_rod');
      p.rect(c - w - 30, bot - 8, c - w - 6, bot, 'water');
    },
  },
  {
    id: 'fusion', name: 'Fusion bottle', icon: '☀️',
    desc: 'A sealed box of deuterium with a spark of plasma in the middle.',
    build(p) {
      const c = mid(p), cy = Math.round(p.H * 0.5), w = Math.round(p.W * 0.25), h = Math.round(p.H * 0.3);
      p.rect(c - w, cy - h, c + w, cy + h, 'deuterium');
      p.box(c - w - 2, cy - h - 2, c + w + 2, cy + h + 2, 'wall', 2);
      p.rect(c - w - 2, cy - h - 2, c + w + 2, cy - h - 1, 'wall');
      p.disc(c, cy, 3, 'plasma');
    },
  },
  {
    id: 'sodium', name: 'Sodium vs. water', icon: '💥',
    desc: 'Chunks of sodium and potassium about to drop into a tank of water.',
    build(p) {
      const c = mid(p), w = Math.round(p.W * 0.3), top = Math.round(p.H * 0.55), bot = p.H - 3;
      p.box(c - w - 2, top, c + w + 2, bot + 2, 'glass', 2);
      p.rect(c - w, top + 6, c + w, bot, 'water');
      p.rect(c - w + 10, top - 22, c - w + 18, top - 16, 'sodium');
      p.rect(c + w - 18, top - 22, c + w - 10, top - 16, 'potassium');
    },
  },
  {
    id: 'geyser', name: 'Mentos geyser', icon: '🥤',
    desc: 'A tall glass bottle of cola, with Mentos dropping in.',
    build(p) {
      const c = mid(p), top = Math.round(p.H * 0.35), bot = p.H - 3;
      p.box(c - 8, top, c + 8, bot + 2, 'glass', 2);
      p.rect(c - 6, top + 4, c + 6, bot, 'cola');
      p.rect(c - 2, top - 12, c + 2, top - 9, 'mentos');
    },
  },
  {
    id: 'toothpaste', name: 'Elephant toothpaste', icon: '🐘',
    desc: 'A flask of peroxide and a spoonful of yeast.',
    build(p) {
      const c = mid(p), top = Math.round(p.H * 0.62), bot = p.H - 3;
      p.box(c - 16, top, c + 16, bot + 2, 'glass', 2);
      p.rect(c - 14, top + 3, c + 14, bot, 'peroxide');
      p.rect(c - 3, top - 10, c + 3, top - 7, 'yeast');
    },
  },
  {
    id: 'crystals', name: 'Crystal garden', icon: '💎',
    desc: 'Crystal seeds at the bottom of a tank of salt water.',
    build(p) {
      const c = mid(p), w = Math.round(p.W * 0.32), top = Math.round(p.H * 0.4), bot = p.H - 3;
      p.box(c - w - 2, top, c + w + 2, bot + 2, 'glass', 2);
      p.rect(c - w, top + 2, c + w, bot, 'saltwater');
      for (let x = c - w + 8; x < c + w - 4; x += 14) p.rect(x, bot - 1, x + 1, bot, 'crystal_seed');
    },
  },
  {
    id: 'neon', name: 'Neon sign', icon: '⚡',
    desc: 'Glass tubes of neon and argon wired to a battery with copper, plus a light bulb.',
    build(p) {
      const c = mid(p), cy = Math.round(p.H * 0.45), w = Math.round(p.W * 0.28);
      const tube = (y, gas) => {
        p.rect(c - w, y - 3, c + w, y + 3, 'glass');
        p.rect(c - w + 1, y - 2, c + w - 1, y + 2, gas);
      };
      tube(cy - 12, 'neon');
      tube(cy + 4, 'argon');
      // Copper electrodes through the glass at both ends of each tube, joined by a bus to the battery.
      for (const y of [cy - 12, cy + 4]) {
        p.rect(c - w - 6, y, c - w + 1, y, 'copper');
        p.rect(c + w - 1, y, c + w + 6, y, 'copper');
      }
      p.rect(c - w - 6, cy - 12, c - w - 6, cy + 20, 'copper');
      p.rect(c + w + 6, cy - 12, c + w + 6, cy + 20, 'copper');
      p.rect(c - w - 6, cy + 20, c + w + 6, cy + 20, 'copper');
      p.rect(c - 2, cy + 21, c + 2, cy + 23, 'battery');
      p.rect(c - 12, cy + 16, c - 8, cy + 19, 'bulb');
    },
  },
  {
    id: 'antimatter', name: 'Antimatter rain', icon: '✴️',
    desc: 'A stone hill under a drifting cloud of antimatter.',
    build(p) {
      const c = mid(p), base = p.H - 1;
      for (let x = 0; x < p.W; x++) {
        const h = Math.round(p.H * 0.35 * Math.max(0, 1 - Math.abs(x - c) / (p.W * 0.45)));
        if (h > 0) p.rect(x, base - h, x, base, 'stone');
      }
      p.rect(c - 25, 8, c + 25, 14, 'antimatter');
    },
  },
];
