// Solids never move. See README.md → "Adding an element" for every available property.
import { ids, NEUTRON } from '../../core/registry.js';
import { rnd } from '../../core/rng.js';

export default [
  {
    id: 'wall', name: 'Wall', state: 'solid', color: '#5b5e70', variance: 5,
    conductivity: 0, indestructible: true, acidProof: true, glow: false,
    desc: 'Indestructible barrier. Blocks heat and air.',
  },
  {
    id: 'stone', name: 'Stone', state: 'solid', color: '#7d7a78', variance: 14, density: 2600,
    conductivity: 0.15, heatCapacity: 2,
    transitions: [{ above: 1100, to: 'lava', chance: 0.05 }],
    desc: 'Solid rock. Melts into lava.',
  },
  {
    id: 'metal', name: 'Metal', state: 'solid', color: '#9aa3b0', variance: 8, density: 7800,
    conductivity: 0.45, conductive: true,
    transitions: [{ above: 1450, to: 'molten_metal', chance: 0.1 }],
    reactions: { water: { chance: 0.0004, self: 'rust' }, saltwater: { chance: 0.003, self: 'rust' } },
    desc: 'Conducts heat and electricity very well.',
  },
  {
    id: 'wood', name: 'Wood', state: 'solid', color: '#8a5a2b', variance: 16, density: 700,
    conductivity: 0.04,
    transitions: [
      { above: 250, to: 'ember', chance: 0.01 },
      { above: 250, to: 'fire', chance: 0.06 },
    ],
    desc: 'Burns, leaving glowing embers.',
  },
  {
    id: 'glass', name: 'Glass', state: 'solid', color: '#9fd3df', variance: 6, density: 2500,
    conductivity: 0.08, acidProof: true,
    transitions: [{ above: 1500, to: 'molten_glass', chance: 0.05 }],
    desc: 'Acid-proof. Made by melting sand.',
  },
  {
    id: 'ice', name: 'Ice', state: 'solid', color: '#b8e2f8', variance: 8, density: 917, temp: -15,
    conductivity: 0.25, heatCapacity: 2,
    transitions: [{ above: 0, to: 'water', chance: 0.03 }],
    desc: 'Frozen water. Salt melts it.',
  },
  {
    id: 'plant', name: 'Plant', state: 'solid', color: '#3fa34d', variance: 18, density: 900,
    conductivity: 0.05,
    transitions: [{ above: 180, to: 'fire', chance: 0.06 }],
    reactions: { water: { chance: 0.03, other: 'plant' } },
    onNeutron(sim, i) {
      if (rnd() < 0.3) sim.morph(i, ids.mutant);
      return NEUTRON.ABSORB;
    },
    desc: 'Grows by drinking water. Flammable. Radiation does strange things to it.',
  },
  {
    id: 'concrete', name: 'Concrete', state: 'solid', color: ['#9a9a93', '#a4a49d', '#8e8e88'], density: 2400,
    conductivity: 0.08, heatCapacity: 3, neutron: { mode: 'absorb', chance: 0.25 },
    transitions: [{ above: 1500, to: 'lava', chance: 0.02 }],
    desc: 'Tough, heat-soaking and good at stopping neutrons. Reactor walls are made of it.',
  },
  {
    id: 'wax', name: 'Wax', state: 'solid', color: '#efe3c2', variance: 6, density: 900,
    conductivity: 0.06,
    transitions: [{ above: 60, to: 'molten_wax', chance: 0.05 }],
    desc: 'Melts at low temperatures.',
  },
  {
    id: 'rubber', name: 'Rubber', state: 'solid', color: '#2c2c33', variance: 4, density: 1100,
    conductivity: 0.005,
    transitions: [{ above: 350, to: 'smoke', chance: 0.02 }],
    desc: 'Insulator: barely conducts heat and not electricity.',
  },
];
