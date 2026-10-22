// Special blocks with custom behaviour. `update(sim, i, x, y)` runs every step;
// return true to skip the default physics for that cell.
import { T, elements, ids, STATE } from '../../core/registry.js';
import { rnd, rint } from '../../core/rng.js';

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
    id: 'battery', name: 'Battery', state: 'solid', category: 'electric', color: ['#d4d43a', '#3a3a3a'], conductivity: 0.1,
    glow: false,
    desc: 'Sends a pulse of electricity into touching metal or salt water.',
    update(sim, i, x, y) {
      sim.life[i] = (sim.life[i] + 1) % 16;
      if (sim.life[i] === 0) for (let k = 0; k < 4; k++) { const j = sim.n4(x, y, k); if (j >= 0) sim.energize(j); }
      return true;
    },
  },
  {
    id: 'antimatter', name: 'Antimatter', state: 'gas', color: ['#ff4fd8', '#ffffff', '#7a5cff', '#ff9cf0'],
    density: 1.6, flicker: true, noClone: true, conductivity: 0, airDrag: 0.5,
    desc: 'Annihilates whatever it touches in a flash of plasma. Even a pinch is a lot.',
    update(sim, i, x, y) {
      const j = sim.randomNeighbor(x, y);
      if (j < 0) return false;
      const u = sim.type[j];
      if (u === 0 || u === sim.type[i]) return false;
      sim.explode(x, y, 2);
      if (!T.indestructible[u]) { sim.morph(j, ids.plasma); sim.temp[j] = 6000; }
      sim.morph(i, ids.plasma);
      sim.temp[i] = 6000;
      return true;
    },
  },
  {
    id: 'black_hole', name: 'Black Hole', state: 'solid', color: ['#000000', '#0c0014', '#05000a'], variance: 0,
    conductivity: 0, indestructible: true, acidProof: true, noClone: true, glow: false, neutron: 'absorb',
    desc: 'Drags in everything that can move and swallows it whole.',
    update(sim, i, x, y) {
      const W = sim.w, type = sim.type;
      for (let k = 0; k < 4; k++) {
        const j = sim.n4(x, y, k);
        if (j >= 0 && type[j] !== 0 && !T.indestructible[type[j]]) sim.clearCell(j);
      }
      // Pull a few random loose particles nearby one cell closer.
      for (let s = 0; s < 6; s++) {
        const dx = rint(41) - 20, dy = rint(41) - 20;
        const px = x + dx, py = y + dy;
        if ((dx === 0 && dy === 0) || !sim.inBounds(px, py)) continue;
        const j = py * W + px, u = type[j];
        if (u === 0 || T.state[u] === STATE.SOLID) continue;
        const tx = px - Math.sign(dx), ty = py - Math.sign(dy), t = ty * W + tx;
        if (type[t] === 0 || T.state[type[t]] === STATE.GAS) sim.swap(j, t);
      }
      if (rnd() < 0.05) sim.air.addPressure(x, y, -2);
      return true;
    },
  },
  {
    id: 'mutant', name: 'Mutant Plant', state: 'solid', color: ['#7a3cff', '#3cff9a', '#b46cff', '#2bd47a'],
    density: 900, conductivity: 0.05, flicker: true,
    transitions: [{ above: 180, to: 'fire', chance: 0.06 }],
    reactions: {
      water: { chance: 0.06, other: 'mutant' },
      plant: { chance: 0.02, other: 'mutant' },
      dirt: { chance: 0.004, other: 'mutant' },
    },
    desc: 'What neutrons do to plants. Glows, grows fast, and converts normal plants.',
  },
];
