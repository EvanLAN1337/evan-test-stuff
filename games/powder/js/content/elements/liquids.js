// Liquids fall, then spread sideways up to `dispersion` cells per step.
// Denser liquids sink below lighter ones (density in kg/m³).
import { ids, elements } from '../../core/registry.js';
import { rnd } from '../../core/rng.js';

export default [
  {
    id: 'water', name: 'Water', state: 'liquid', color: '#2f6fe4', variance: 10, density: 1000,
    dispersion: 5, conductivity: 0.25, heatCapacity: 3, neutron: { mode: 'moderate', chance: 0.25, absorb: 0.05 },
    transitions: [
      { below: 0, to: 'ice', chance: 0.01 },
      { above: 100, to: 'steam', chance: 0.05 },
    ],
    desc: 'Freezes at 0°C, boils at 100°C.',
  },
  {
    id: 'saltwater', name: 'Salt Water', state: 'liquid', color: '#3e83c9', variance: 10, density: 1030,
    dispersion: 5, conductivity: 0.3, heatCapacity: 3, conductive: true,
    neutron: { mode: 'moderate', chance: 0.25, absorb: 0.08 },
    transitions: [
      { below: -21, to: 'ice', chance: 0.01 },
      { above: 102, to: 'salt', chance: 0.01 },
      { above: 102, to: 'steam', chance: 0.05 },
    ],
    desc: 'Conducts electricity. Boils off leaving salt.',
  },
  {
    id: 'oil', name: 'Oil', state: 'liquid', color: '#4a3a1a', variance: 8, density: 850,
    dispersion: 3, conductivity: 0.1,
    transitions: [{ above: 250, to: 'fire', chance: 0.08 }],
    desc: 'Floats on water. Very flammable.',
  },
  {
    id: 'honey', name: 'Honey', state: 'liquid', color: '#e0a020', variance: 8, density: 1400,
    dispersion: 1, moveChance: 0.25, conductivity: 0.1,
    desc: 'Thick and slow.',
  },
  {
    id: 'acid', name: 'Acid', state: 'liquid', color: '#7dff3a', variance: 12, density: 1200,
    dispersion: 4, acidProof: true,
    desc: 'Eats through almost anything except glass and wall.',
    update(sim, i, x, y) {
      const j = sim.randomNeighbor(x, y);
      if (j < 0) return false;
      const u = sim.type[j];
      if (u === 0 || elements[u].acidProof) return false;
      if (rnd() < 0.06) {
        sim.clearCell(j);
        sim.temp[j] += 30;
        if (rnd() < 0.35) { sim.morph(i, rnd() < 0.4 ? ids.toxic : 0); return true; }
      }
      return false;
    },
  },
  {
    id: 'lava', name: 'Lava', state: 'liquid', color: ['#ff4a12', '#ff7a22', '#ffaa33', '#e8350c'], density: 3100,
    dispersion: 1, moveChance: 0.5, temp: 1200, conductivity: 0.2, heatCapacity: 2, flicker: true,
    transitions: [{ below: 800, to: 'stone', chance: 0.05 }],
    desc: 'Molten rock. Cools into stone, ignites what it touches.',
  },
  {
    id: 'molten_metal', name: 'Molten Metal', state: 'liquid', color: ['#ffb347', '#ffd27a', '#ff9b2f'], density: 7000,
    dispersion: 2, temp: 1600, conductivity: 0.4, conductive: true, flicker: true,
    transitions: [{ below: 1350, to: 'metal', chance: 0.05 }],
    desc: 'Liquid metal. Solidifies below 1350°C.',
  },
  {
    id: 'molten_glass', name: 'Molten Glass', state: 'liquid', color: ['#ff9b4a', '#ffb871'], density: 2500,
    dispersion: 1, moveChance: 0.4, temp: 1700, conductivity: 0.1,
    transitions: [{ below: 1400, to: 'glass', chance: 0.05 }],
    desc: 'Cools into glass.',
  },
  {
    id: 'molten_wax', name: 'Molten Wax', state: 'liquid', color: '#f7eab0', variance: 6, density: 900,
    dispersion: 2, temp: 80, conductivity: 0.08,
    transitions: [
      { below: 55, to: 'wax', chance: 0.05 },
      { above: 250, to: 'fire', chance: 0.05 },
    ],
    desc: 'Hardens back into wax as it cools.',
  },
  {
    id: 'wet_concrete', name: 'Wet Concrete', state: 'liquid', color: ['#7c7c76', '#86867f'], density: 2400,
    dispersion: 1, moveChance: 0.2, heatCapacity: 2, life: [300, 600], decayTo: 'concrete',
    desc: 'Pour it, shape it, and it sets into concrete after a while.',
  },
  {
    id: 'nitro', name: 'Nitro', state: 'liquid', color: '#e6e08a', variance: 8, density: 1600,
    dispersion: 3,
    transitions: [{ above: 120, explode: 5 }],
    desc: 'Liquid explosive. Very touchy.',
  },
  {
    id: 'ln2', name: 'Liquid Nitrogen', state: 'liquid', color: '#c8f0ff', variance: 6, density: 800,
    dispersion: 6, temp: -196, conductivity: 0.3,
    transitions: [{ above: -190, to: 'nitrogen', chance: 0.05 }],
    desc: 'Extremely cold. Freezes things instantly.',
  },
];
