// Gases drift randomly. Lighter than air (1.2 kg/m³) rises, heavier sinks.
// `ambientRate` controls how fast a gas cools/warms toward the ambient temperature.
export default [
  {
    id: 'steam', name: 'Steam', state: 'gas', color: '#c9d6e3', variance: 8, density: 0.6, temp: 110,
    conductivity: 0.08, ambientRate: 0.002,
    transitions: [{ below: 95, to: 'water', chance: 0.01 }],
    desc: 'Hot water vapour. Condenses back into water.',
  },
  {
    id: 'smoke', name: 'Smoke', state: 'gas', color: '#4a4a4a', variance: 12, density: 0.9,
    life: [80, 200],
    desc: 'Rises and fades away.',
  },
  {
    id: 'methane', name: 'Methane', state: 'gas', color: '#9fbf8f', variance: 6, density: 0.66,
    transitions: [{ above: 400, to: 'fire', chance: 0.6, temp: 1000 }],
    desc: 'Flammable gas that burns fast.',
  },
  {
    id: 'hydrogen', name: 'Hydrogen', state: 'gas', color: '#d8e8ff', variance: 4, density: 0.09,
    transitions: [{ above: 500, explode: 3 }],
    desc: 'Lightest gas. Explosive.',
  },
  {
    id: 'co2', name: 'CO₂', state: 'gas', color: '#8a8f99', variance: 6, density: 1.98,
    reactions: { fire: { chance: 0.3, other: 'smoke' } },
    desc: 'Heavy gas that sinks and smothers fire.',
  },
  {
    id: 'nitrogen', name: 'Nitrogen', state: 'gas', color: '#aab8d6', variance: 6, density: 1.16, temp: -150,
    transitions: [{ below: -196, to: 'ln2', chance: 0.05 }],
    desc: 'Cold gas from boiling liquid nitrogen.',
  },
  {
    id: 'toxic', name: 'Toxic Gas', state: 'gas', color: '#7fdc3a', variance: 10, density: 3.2,
    reactions: { plant: { chance: 0.05, other: 'ash' } },
    desc: 'Heavy, poisonous gas. Kills plants.',
  },
];
