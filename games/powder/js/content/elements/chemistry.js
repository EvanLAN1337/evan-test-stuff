// Chemistry: reactive metals, acids and bases, household "don't mix these", fizz and foam.
// Most reactions are plain `reactions` tables; the showier ones use an `update` hook.
import { ids, T, STATE, NEUTRON } from '../../core/registry.js';
import { rnd } from '../../core/rng.js';

const WET = ['water', 'saltwater', 'heavy_water'];

// Alkali metals: rip hydrogen out of water, get hot, and sometimes light the hydrogen with a bang.
const alkali = ({ heat, bang, rate }) => function update(sim, i, x, y) {
  const j = sim.randomNeighbor(x, y);
  if (j < 0 || rnd() > rate) return false;
  const u = sim.type[j];
  if (!WET.some((w) => ids[w] === u)) return false;
  sim.morph(j, ids.hydrogen);
  sim.temp[j] = rnd() < bang ? 700 : sim.temp[j] + 150;
  sim.addHeat(i, heat);
  if (rnd() < 0.3) sim.morph(i, ids.lye);
  return true;
};

// Foam keeps puffing up new bubbles while it is fresh; each bubble it makes ages it a little.
function foamUp(sim, i, x, y) {
  if (sim.life[i] < 160 || rnd() > 0.12) return false;
  const k = rnd() < 0.6 ? 2 : (rnd() * 4) | 0; // mostly upward
  const j = sim.n4(x, y, k);
  if (j < 0 || sim.type[j] !== 0) return false;
  sim.life[i] -= 50;
  sim.spawn(j, sim.type[i]);
  sim.life[j] = sim.life[i];
  sim.temp[j] = sim.temp[i];
  return false;
}

// Crystals grow by pulling salt out of neighbouring salt water.
function grow(sim, i, x, y) {
  const j = sim.randomNeighbor(x, y);
  if (j >= 0 && sim.type[j] === ids.saltwater && rnd() < 0.02) sim.morph(j, ids.crystal);
  return false;
}

export default [
  // ---- reactive metals ----
  {
    id: 'sodium', name: 'Sodium', state: 'powder', color: ['#d9dde3', '#c4c9d1', '#eef0f3'], density: 970,
    slip: 0.4, conductivity: 0.3, conductive: true,
    transitions: [{ above: 880, to: 'fire', chance: 0.05 }],
    update: alkali({ heat: 60, bang: 0.12, rate: 0.08 }),
    desc: 'Soft metal that floats on water and fizzes violently, giving off hydrogen that likes to explode.',
  },
  {
    id: 'potassium', name: 'Potassium', state: 'powder', color: ['#cfc6dd', '#bfb3d3', '#e2dcec'], density: 860,
    slip: 0.4, conductivity: 0.3, conductive: true,
    transitions: [{ above: 700, to: 'fire', chance: 0.08 }],
    update: alkali({ heat: 120, bang: 0.35, rate: 0.14 }),
    desc: 'Like sodium, only angrier. Do not add water. (Add water.)',
  },
  {
    id: 'magnesium', name: 'Magnesium', state: 'powder', color: ['#c9ccd1', '#b7bbc2', '#dcdfe3'], density: 1740,
    slip: 0.5, conductivity: 0.35, conductive: true,
    transitions: [{ above: 650, to: 'burning_magnesium', chance: 0.1 }],
    desc: 'Burns blinding white at 3000°C. Water only makes it worse.',
  },
  {
    id: 'burning_magnesium', name: 'Burning Magnesium', state: 'powder', hidden: true,
    color: ['#ffffff', '#f2f7ff', '#fff8dc', '#e6f0ff'], density: 1740, slip: 0.5, temp: 3000, holdTemp: 3000,
    life: [80, 160], decayTo: 'ash', decayChance: 0.8, flicker: true, conductivity: 0.35,
    reactions: { water: { chance: 0.25, other: 'hydrogen' }, saltwater: { chance: 0.25, other: 'hydrogen' } },
  },
  {
    id: 'gallium', name: 'Gallium', state: 'solid', color: '#aab6c6', variance: 6, density: 5900,
    conductivity: 0.35, conductive: true,
    transitions: [{ above: 29.8, to: 'molten_gallium', chance: 0.05 }],
    desc: 'A metal that melts at 30°C, the warmth of a hand. Try the Heat tool.',
  },
  {
    id: 'molten_gallium', name: 'Liquid Gallium', state: 'liquid', hidden: true, color: ['#c3ccd9', '#d6dde7'],
    density: 6100, dispersion: 3, conductivity: 0.35, conductive: true,
    transitions: [{ below: 29, to: 'gallium', chance: 0.02 }],
  },
  {
    id: 'mercury', name: 'Mercury', state: 'liquid', color: ['#c8ccd4', '#e6e9ee', '#a3a9b3'], density: 13534,
    dispersion: 3, conductivity: 0.3, conductive: true, acidProof: true,
    transitions: [{ above: 357, to: 'toxic', chance: 0.05 }],
    onNeutron(sim, i) {
      // Real alchemy: Hg-198 + neutron → gold.
      if (rnd() < 0.1) { sim.morph(i, ids.gold); return NEUTRON.ABSORB; }
      return NEUTRON.PASS;
    },
    desc: 'Heavy liquid metal. Conducts, boils into toxic vapour, and turns to gold under neutron fire.',
  },
  {
    id: 'gold', name: 'Gold', state: 'solid', category: 'solids', color: ['#f2c94c', '#d9a91c', '#ffe08a'],
    density: 19300, conductivity: 0.45, conductive: true, acidProof: true,
    transitions: [{ above: 1064, to: 'molten_gold', chance: 0.05 }],
    desc: 'Shiny, conductive, and acid can\'t touch it.',
  },
  {
    id: 'molten_gold', name: 'Molten Gold', state: 'liquid', hidden: true, color: ['#ffb43a', '#ffd36a'],
    density: 17300, dispersion: 2, temp: 1200, conductivity: 0.4, conductive: true, flicker: true,
    transitions: [{ below: 1064, to: 'gold', chance: 0.05 }],
  },
  {
    id: 'rust', name: 'Rust', state: 'powder', color: ['#8b4a24', '#a0582a', '#6e3a1c'], density: 5240, slip: 0.5,
    desc: 'What metal becomes after too long near water. Salt water is much faster.',
  },

  // ---- acids, bases and things you shouldn't mix ----
  {
    id: 'lye', name: 'Lye', state: 'liquid', color: '#cdd6ee', variance: 6, density: 1100, dispersion: 4,
    acidProof: true,
    reactions: {
      acid: { chance: 0.25, self: 'saltwater', other: 'water', selfHeat: 60 },
      plant: { chance: 0.02, other: null },
    },
    desc: 'Strong base. Neutralises acid into salt water (and heat). Made when sodium meets water.',
  },
  {
    id: 'bleach', name: 'Bleach', state: 'liquid', color: '#e6f2c8', variance: 6, density: 1100, dispersion: 4,
    acidProof: true,
    reactions: {
      acid: { chance: 0.2, self: 'chlorine', other: 'water' },
      vinegar: { chance: 0.1, self: 'chlorine' },
      ammonia: { chance: 0.3, self: 'toxic', other: 'toxic' },
      plant: { chance: 0.03, other: null },
      mutant: { chance: 0.03, other: null },
    },
    desc: 'Kills plants. Mixed with acid or vinegar it releases chlorine; with ammonia, toxic gas.',
  },
  {
    id: 'vinegar', name: 'Vinegar', state: 'liquid', color: '#efe3c0', variance: 6, density: 1010, dispersion: 4,
    acidProof: true,
    reactions: { baking_soda: { chance: 0.3, self: 'foam', other: 'co2' } },
    desc: 'Weak acid. Fizzes up into foam with baking soda.',
  },
  {
    id: 'baking_soda', name: 'Baking Soda', state: 'powder', color: '#f4f4ec', variance: 5, density: 1100,
    slip: 0.6, acidProof: true,
    reactions: {
      acid: { chance: 0.3, self: 'co2', other: 'foam' },
      fire: { chance: 0.3, other: 'co2' },
    },
    desc: 'Fizzes with vinegar or acid and smothers small fires.',
  },
  {
    id: 'chlorine', name: 'Chlorine', state: 'gas', color: '#c4dc48', variance: 8, density: 3.2,
    reactions: {
      sodium: { chance: 0.3, self: null, other: 'salt', otherHeat: 400 },
      potassium: { chance: 0.3, self: null, other: 'salt', otherHeat: 500 },
      plant: { chance: 0.05, other: 'ash' },
      water: { chance: 0.003, self: null, other: 'acid' },
    },
    desc: 'Heavy, choking green gas. Burns sodium into table salt and makes acid with water.',
  },
  {
    id: 'ammonia', name: 'Ammonia', state: 'gas', color: '#dfe8f5', variance: 5, density: 0.73,
    reactions: {
      chlorine: { chance: 0.2, self: 'toxic', other: 'toxic' },
      acid: { chance: 0.2, self: 'salt', other: 'water' },
    },
    desc: 'Pungent, light gas. Never mix with bleach.',
  },

  // ---- fizz and foam ----
  {
    id: 'foam', name: 'Foam', state: 'liquid', color: ['#f4f8ff', '#e3ebf6', '#ffffff', '#eaf2fb'], density: 250,
    dispersion: 1, moveChance: 0.6, life: [260, 420], conductivity: 0.04, airDrag: 0.15,
    update: foamUp,
    desc: 'Bubbles that pile up, then pop.',
  },
  {
    id: 'peroxide', name: 'Peroxide', state: 'liquid', color: '#d8f0ff', variance: 5, density: 1450, dispersion: 4,
    transitions: [{ above: 150, to: 'oxygen', chance: 0.05 }],
    reactions: {
      yeast: { chance: 0.4, self: 'foam', selfHeat: 40 },
      foam: { chance: 0.06, self: 'foam', selfHeat: 30 }, // the foam carries the yeast along with it
    },
    desc: 'Hydrogen peroxide. Add yeast for elephant toothpaste.',
  },
  {
    id: 'yeast', name: 'Yeast', state: 'powder', color: ['#d6bb83', '#c9a96b', '#e2cc9a'], density: 1500, slip: 0.6,
    transitions: [{ above: 60, to: 'ash', chance: 0.01 }],
    desc: 'Catalyst. Turns peroxide into a mountain of warm foam.',
  },
  {
    id: 'cola', name: 'Cola', state: 'liquid', color: ['#3b1d0e', '#4a2512', '#331809'], density: 1040, dispersion: 4,
    desc: 'Fizzy. Drop in some Mentos and stand back.',
    update(sim, i, x, y) {
      const j = sim.randomNeighbor(x, y);
      if (j < 0) return false;
      // Mentos start it; once it's foaming, the foam sets off the cola around it.
      const u = sim.type[j];
      if (!(u === ids.mentos && rnd() < 0.35) && !(u === ids.foam && rnd() < 0.1)) return false;
      sim.morph(i, ids.foam);
      sim.life[i] = 420;
      if (u === ids.mentos && rnd() < 0.03) sim.clearCell(j);
      sim.air.addVelocity(x, y, 2, 0, -2.5);
      return true;
    },
  },
  {
    id: 'mentos', name: 'Mentos', state: 'powder', color: ['#fbfbf4', '#f1f0e6'], density: 1300, slip: 0.7,
    desc: 'Minty. Rough surface. Very exciting in cola.',
  },
  {
    id: 'crystal_seed', name: 'Crystal Seed', state: 'solid', color: ['#ff7ad9', '#a07bff', '#7ad9ff'],
    conductivity: 0.1, update: grow,
    desc: 'Drop it in salt water and watch crystals grow.',
  },
  {
    id: 'crystal', name: 'Crystal', state: 'solid', color: ['#c9f4ff', '#e6d3ff', '#ffffff', '#a8e8ff'], variance: 8,
    conductivity: 0.1, update: grow,
    transitions: [{ above: 801, to: 'salt', chance: 0.05 }],
    desc: 'Salt crystals grown from salt water.',
  },

  // ---- oxidisers, fuels, explosives ----
  {
    id: 'oxygen', name: 'Oxygen', state: 'gas', category: 'gases', color: '#bfe1ff', variance: 4, density: 1.43,
    reactions: { fire: { chance: 0.4, self: 'fire', selfHeat: 300 } },
    desc: 'Makes fire burn hotter and faster.',
  },
  {
    id: 'lox', name: 'Liquid Oxygen', state: 'liquid', category: 'liquids', color: '#97d2ff', variance: 6,
    density: 1141, dispersion: 5, temp: -183, conductivity: 0.25,
    transitions: [{ above: -180, to: 'oxygen', chance: 0.05 }],
    reactions: { fire: { chance: 0.5, self: 'fire', selfHeat: 1500 } },
    desc: 'Pale blue and bitterly cold. Turns any flame into an inferno.',
  },
  {
    id: 'phosphorus', name: 'White Phosphorus', state: 'powder', color: ['#f3efc2', '#e6f5bf', '#d6ffb0'],
    density: 1820, slip: 0.5, flicker: true,
    transitions: [{ above: 34, to: 'fire', chance: 0.05 }],
    desc: 'Glows faintly and slowly warms up in air until it bursts into flame at 34°C. Keep it under water.',
    update(sim, i, x, y) {
      // Oxidising in open air warms it up; under water it stays cool.
      const j = sim.randomNeighbor(x, y);
      if (j >= 0 && sim.type[j] === 0 && rnd() < 0.1) sim.addHeat(i, 3);
      return false;
    },
  },
  {
    id: 'touch_powder', name: 'Contact Explosive', state: 'powder', color: ['#3b1e45', '#4a2757', '#2d1636'],
    density: 3500, slip: 0.15,
    transitions: [{ above: 60, explode: 3 }],
    desc: 'Nitrogen triiodide. Explodes the moment anything moving brushes against it.',
    update(sim, i, x, y) {
      const tick = sim.tick, prev = tick === 1 ? 255 : tick - 1, self = sim.type[i];
      for (let k = 0; k < 4; k++) {
        const j = sim.n4(x, y, k);
        if (j < 0) continue;
        const u = sim.type[j];
        if (u === 0 || u === self || T.state[u] === STATE.GAS) continue;
        if (sim.stamp[j] === tick || sim.stamp[j] === prev) { sim.explode(x, y, 3); return true; }
      }
      return false;
    },
    onNeutron(sim, i) {
      sim.addHeat(i, 200);
      return NEUTRON.ABSORB;
    },
  },
  {
    id: 'napalm', name: 'Napalm', state: 'liquid', category: 'liquids', color: ['#b4621c', '#c97326', '#9c5418'],
    density: 900, dispersion: 1, moveChance: 0.15, conductivity: 0.1,
    transitions: [{ above: 200, to: 'burning_napalm', chance: 0.1 }],
    desc: 'Sticky gel that clings to things and burns for a long, long time.',
  },
  {
    id: 'burning_napalm', name: 'Burning Napalm', state: 'liquid', hidden: true,
    color: ['#ff5a14', '#ff8a1e', '#ffb43a', '#d63a0a'], density: 900, dispersion: 1, moveChance: 0.15,
    temp: 1100, holdTemp: 1100, life: [300, 600], decayTo: 'smoke', decayChance: 0.5, flicker: true, conductivity: 0.3,
    reactions: { water: { chance: 0.05, other: 'steam' } },
    update(sim, i, x, y) {
      const j = sim.n4(x, y, 2);
      if (j >= 0 && sim.type[j] === 0 && rnd() < 0.15) sim.spawn(j, ids.fire);
      return false;
    },
  },

  // ---- cold stuff ----
  {
    id: 'dry_ice', name: 'Dry Ice', state: 'solid', color: ['#eef6ff', '#dbe9f7', '#f8fbff'], temp: -78,
    conductivity: 0.2, heatCapacity: 3,
    transitions: [{ above: -60, to: 'co2', chance: 0.02 }],
    reactions: { water: { chance: 0.06, other: 'fog' }, saltwater: { chance: 0.06, other: 'fog' } },
    desc: 'Frozen CO₂ at -78°C. Turns straight into gas, and makes spooky fog in water.',
  },
  {
    id: 'fog', name: 'Fog', state: 'gas', category: 'gases', color: '#dde6ec', variance: 4, density: 1.35,
    life: [150, 320], temp: 5,
    desc: 'Cold, low-lying mist.',
  },
];
