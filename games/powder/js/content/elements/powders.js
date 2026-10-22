// Powders fall and pile up. `slip` (0..1) controls how readily they slide sideways.
export default [
  {
    id: 'sand', name: 'Sand', state: 'powder', color: '#dcc283', variance: 16, density: 1600,
    conductivity: 0.1,
    transitions: [{ above: 1700, to: 'molten_glass', chance: 0.05 }],
    desc: 'Classic falling sand. Melts into glass.',
  },
  {
    id: 'dirt', name: 'Dirt', state: 'powder', color: '#6b4a2e', variance: 12, density: 1300, slip: 0.6,
    reactions: { water: { chance: 0.03, self: 'mud', other: null } },
    desc: 'Soaks up water and turns to mud.',
  },
  {
    id: 'mud', name: 'Mud', state: 'powder', color: '#4a3320', variance: 8, density: 1800, slip: 0.25,
    heatCapacity: 2,
    transitions: [{ above: 80, to: 'dirt', chance: 0.02 }],
    desc: 'Wet dirt. Dries out when heated.',
  },
  {
    id: 'salt', name: 'Salt', state: 'powder', color: '#f2f2f2', variance: 6, density: 2160,
    reactions: {
      water: { chance: 0.03, self: 'saltwater', other: null },
      ice: { chance: 0.05, other: 'water' },
      snow: { chance: 0.05, other: 'water' },
    },
    desc: 'Dissolves in water and melts ice.',
  },
  {
    id: 'snow', name: 'Snow', state: 'powder', color: '#f4f8ff', variance: 5, density: 500, temp: -5,
    slip: 0.35, airDrag: 0.1,
    transitions: [{ above: 1, to: 'water', chance: 0.03 }],
    desc: 'Light and fluffy. Melts into water.',
  },
  {
    id: 'ash', name: 'Ash', state: 'powder', color: '#8e8b88', variance: 12, density: 600, slip: 0.7, airDrag: 0.12,
    desc: 'What is left after burning.',
  },
  {
    id: 'coal', name: 'Coal', state: 'powder', color: '#22201f', variance: 8, density: 1400, slip: 0.5,
    conductivity: 0.1,
    transitions: [{ above: 350, to: 'ember', chance: 0.02 }],
    desc: 'Burns slowly and very hot.',
  },
  {
    id: 'gunpowder', name: 'Gunpowder', state: 'powder', color: '#3c3c3c', variance: 14, density: 1700,
    transitions: [{ above: 180, explode: 4 }],
    desc: 'Explodes when heated or sparked.',
  },
  {
    id: 'thermite', name: 'Thermite', state: 'powder', color: '#9c5b45', variance: 16, density: 2000,
    transitions: [{ above: 350, to: 'molten_metal', temp: 2800, chance: 0.3 }],
    desc: 'Burns into white-hot molten metal. Melts through metal.',
  },
];
