// Energy: fire, plasma, electricity. Physically these are mostly short-lived gases.
// `holdTemp` keeps a particle at that temperature (it is a heat source).
import { T } from '../../core/registry.js';

export default [
  {
    id: 'fire', name: 'Fire', state: 'gas', color: ['#ff3d00', '#ff7a00', '#ffb300', '#ffd54a'], density: 0.3,
    temp: 900, holdTemp: 900, life: [18, 45], decayTo: 'smoke', decayChance: 0.25, flicker: true,
    conductivity: 0.35, airDrag: 0.4, paintChance: 0.6,
    reactions: {
      water: { chance: 0.5, self: null, other: 'steam' },
      saltwater: { chance: 0.5, self: null, other: 'steam' },
      ice: { chance: 0.2, self: null, other: 'water' },
      snow: { chance: 0.3, self: null, other: 'water' },
    },
    desc: 'Burns flammable things. Water puts it out.',
    // Flames lick whatever they touch, heating it much faster than plain conduction.
    update(sim, i, x, y) {
      for (let k = 0; k < 4; k++) {
        const j = sim.n4(x, y, k);
        if (j >= 0 && sim.type[j] !== 0 && sim.temp[j] < 900) sim.addHeat(j, 50);
      }
      return false;
    },
  },
  {
    id: 'cryo', name: 'Cryo Flame', state: 'gas', color: ['#7fe3ff', '#3aa8ff', '#c8f4ff'], density: 0.5,
    temp: -180, holdTemp: -180, life: [20, 50], flicker: true, conductivity: 0.35, airDrag: 0.4,
    reactions: { water: { chance: 0.3, other: 'ice' } },
    desc: 'Freezing cold flame.',
  },
  {
    id: 'plasma', name: 'Plasma', state: 'gas', color: ['#d18cff', '#f4d8ff', '#ffffff', '#b45cff'], density: 0.2,
    temp: 4000, holdTemp: 4000, life: [6, 18], flicker: true, conductivity: 0.45,
    desc: 'Super-heated gas. Melts nearly everything.',
  },
  {
    id: 'spark', name: 'Spark', state: 'gas', color: ['#fff6a0', '#ffffff'], density: 1.2,
    temp: 800, holdTemp: 800, life: [3, 6], flicker: true, conductivity: 0.3, paintChance: 1,
    desc: 'Electricity. Draw it on metal or salt water to send a current.',
    update(sim, i, x, y) {
      for (let k = 0; k < 4; k++) { const j = sim.n4(x, y, k); if (j >= 0) sim.energize(j); }
      return false;
    },
    // Painting on a conductor charges it instead of placing a spark particle.
    onPaint(sim, i) {
      if (T.conductive[sim.type[i]] !== 1) return false;
      sim.energize(i);
      return true;
    },
  },
  {
    id: 'ember', name: 'Ember', state: 'powder', color: ['#ff6a1a', '#ff9c3a', '#c43a0a'], density: 1000,
    temp: 700, holdTemp: 700, life: [150, 400], decayTo: 'ash', flicker: true, conductivity: 0.25, slip: 0.5,
    desc: 'Glowing coal. Smoulders into ash.',
  },
];
