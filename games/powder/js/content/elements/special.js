// Special blocks with custom behaviour. `update(sim, i, x, y)` runs every step;
// return true to skip the default physics for that cell.
import { T, elements } from '../../core/registry.js';

export default [
  {
    id: 'clone', name: 'Clone', state: 'solid', color: '#c9a227', variance: 6, conductivity: 0,
    indestructible: true, acidProof: true, noClone: true, glow: false,
    desc: 'Copies the first thing that touches it, forever.',
    update(sim, i, x, y) {
      const j = sim.randomNeighbor(x, y);
      if (j < 0) return true;
      const src = sim.life[i]; // the cloned element id is stored in `life`
      if (src === 0) {
        const u = sim.type[j];
        if (u !== 0 && !elements[u].noClone) sim.life[i] = u;
      } else if (sim.type[j] === 0) {
        sim.spawn(j, src);
      }
      return true;
    },
  },
  {
    id: 'void', name: 'Void', state: 'solid', color: ['#1a0b22', '#2a0f3a'], conductivity: 0,
    indestructible: true, acidProof: true, noClone: true, glow: false,
    desc: 'Deletes anything that touches it.',
    update(sim, i, x, y) {
      for (let k = 0; k < 4; k++) {
        const j = sim.n4(x, y, k);
        if (j >= 0 && sim.type[j] !== 0 && !T.indestructible[sim.type[j]]) sim.clearCell(j);
      }
      return true;
    },
  },
  {
    id: 'heater', name: 'Heater', state: 'solid', color: '#b33a2a', variance: 6, conductivity: 0.45,
    holdTemp: 800, indestructible: true, glow: false,
    desc: 'Always 800°C.',
  },
  {
    id: 'cooler', name: 'Cooler', state: 'solid', color: '#3a7bd5', variance: 6, conductivity: 0.45,
    holdTemp: -100, indestructible: true, glow: false,
    desc: 'Always -100°C.',
  },
  {
    id: 'battery', name: 'Battery', state: 'solid', color: ['#d4d43a', '#3a3a3a'], conductivity: 0.1,
    glow: false,
    desc: 'Sends a pulse of electricity into touching metal or salt water.',
    update(sim, i, x, y) {
      sim.life[i] = (sim.life[i] + 1) % 16;
      if (sim.life[i] === 0) for (let k = 0; k < 4; k++) { const j = sim.n4(x, y, k); if (j >= 0) sim.energize(j); }
      return true;
    },
  },
];
