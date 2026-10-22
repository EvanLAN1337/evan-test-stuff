// Electric: wires, lights and sensors. A charged conductor passes current to touching conductors one
// cell per step (see Sim.conduct). `chargeColor` sets the colour a cell glows while current is in it.
import { ids } from '../../core/registry.js';
import { rnd } from '../../core/rng.js';

// Lights stay lit for a moment after each pulse: a powered cell swaps to a hidden "lit" twin
// (keeping its charge so the current carries on), which fades back after `life` steps.
const lightUp = (lit, heat = 0) => function update(sim, i) {
  if (sim.charge[i] > 0) {
    const c = sim.charge[i];
    sim.morph(i, ids[lit]);
    sim.charge[i] = c;
    sim.addHeat(i, heat);
  }
  return false;
};
const stayLit = (steps, heat = 0) => function update(sim, i) {
  if (sim.charge[i] > 0) { sim.life[i] = steps; sim.addHeat(i, heat); }
  return false;
};

export default [
  {
    id: 'copper', name: 'Copper', state: 'solid', color: ['#b8653a', '#c97a48', '#a65a32'], density: 8960,
    conductivity: 0.45, conductive: true, chargeColor: '#ffe6a0',
    transitions: [{ above: 1085, to: 'molten_metal', chance: 0.05 }],
    reactions: { saltwater: { chance: 0.0005, self: 'rust' } },
    desc: 'The classic wire. Carries current and heat.',
  },
  {
    id: 'bulb', name: 'Light Bulb', state: 'solid', color: ['#3d3a2e', '#46423a'], variance: 4, density: 2500,
    conductivity: 0.1, conductive: true, chargeColor: '#fff0a0', update: lightUp('bulb_lit', 1.5),
    desc: 'Lights up warm yellow when current flows through it (and gets a little hot).',
  },
  {
    id: 'bulb_lit', name: 'Light Bulb (on)', state: 'solid', hidden: true, color: ['#fff3b0', '#ffe27a', '#fffbe0'],
    density: 2500, conductivity: 0.1, conductive: true, chargeColor: '#ffffff', glow: false,
    life: [20, 20], decayTo: 'bulb', update: stayLit(20, 1.5),
  },
  {
    id: 'neon', name: 'Neon', state: 'gas', color: '#4a3a44', variance: 4, density: 0.9, conductive: true,
    chargeColor: '#ff3f9a', ambientRate: 0.01, update: lightUp('neon_lit'),
    desc: 'Glows hot pink when electrified. Seal it in glass and wire it to a battery.',
  },
  {
    id: 'neon_lit', name: 'Neon (lit)', state: 'gas', hidden: true, color: ['#ff3f9a', '#ff6ab4', '#ff2f86', '#ff8ac4'],
    density: 0.9, conductive: true, chargeColor: '#ffc2e0', ambientRate: 0.01, flicker: true,
    life: [24, 24], decayTo: 'neon', update: stayLit(24),
  },
  {
    id: 'argon', name: 'Argon', state: 'gas', color: '#3d3a4f', variance: 4, density: 1.78, conductive: true,
    chargeColor: '#9b7bff', ambientRate: 0.01, update: lightUp('argon_lit'),
    desc: 'Heavier than air. Glows violet when electrified.',
  },
  {
    id: 'argon_lit', name: 'Argon (lit)', state: 'gas', hidden: true, color: ['#8f6bff', '#a98aff', '#7a55ff', '#c0a8ff'],
    density: 1.78, conductive: true, chargeColor: '#e0d4ff', ambientRate: 0.01, flicker: true,
    life: [24, 24], decayTo: 'argon', update: stayLit(24),
  },
  {
    id: 'thermostat', name: 'Thermostat', state: 'solid', color: ['#3c4658', '#4a5468'], variance: 4,
    conductivity: 0.35, glow: false,
    desc: 'Sends a pulse into touching wires whenever it is hotter than 100°C. Great for automatic shut-offs.',
    update(sim, i, x, y) {
      if (sim.life[i] > 0) { sim.life[i]--; return true; }
      if (sim.temp[i] > 100) {
        for (let k = 0; k < 4; k++) { const j = sim.n4(x, y, k); if (j >= 0) sim.energize(j); }
        sim.life[i] = 6;
      }
      return true;
    },
  },
  {
    id: 'cryostat', name: 'Cold Sensor', state: 'solid', color: ['#38506a', '#3f5b78'], variance: 4,
    conductivity: 0.35, glow: false,
    desc: 'Sends a pulse into touching wires whenever it is colder than 0°C.',
    update(sim, i, x, y) {
      if (sim.life[i] > 0) { sim.life[i]--; return true; }
      if (sim.temp[i] < 0) {
        for (let k = 0; k < 4; k++) { const j = sim.n4(x, y, k); if (j >= 0) sim.energize(j); }
        sim.life[i] = 6 + ((rnd() * 3) | 0);
      }
      return true;
    },
  },
];
