// Nuclear: fissile fuel, neutrons and the materials that steer them.
// Neutrons live in their own layer (core/neutrons.js). Each element decides what a neutron does when
// it flies through: `neutron: 'absorb' | 'reflect' | 'moderate' | 'pass'` (+ `chance`), or a custom
// `onNeutron(sim, i, slow)` hook returning a NEUTRON code. Slow (moderated) neutrons split fuel best.
import { ids, NEUTRON } from '../../core/registry.js';
import { rnd } from '../../core/rng.js';

const { PASS, ABSORB } = NEUTRON;

/**
 * Fission hook. `fast` / `slow` are the chances that a fast / moderated neutron splits the atom;
 * a split releases 2-3 neutrons and `heat` °C, and occasionally leaves the cell spent.
 * Very hot fuel splits less readily, which keeps a lightly supercritical core from running away.
 */
export const fissile = ({ fast, slow, heat, spent = 'spent_fuel', spentChance = 0.02 }) =>
  function onNeutron(sim, i, isSlow) {
    const t = sim.temp[i], damp = t < 300 ? 1 : t > 2300 ? 0.35 : 1 - (t - 300) * 0.000325;
    if (rnd() >= (isSlow ? slow : fast) * damp) return PASS;
    sim.addHeat(i, heat);
    sim.emitNeutrons(i, rnd() < 0.5 ? 2 : 3);
    if (spent && rnd() < spentChance) sim.morph(i, ids[spent]);
    return ABSORB;
  };

// Radioactive material spits out the odd neutron on its own, which is what starts a chain reaction.
const decays = (rate) => function update(sim, i) {
  if (rnd() < rate) sim.emitNeutrons(i, 1);
  return false;
};

export default [
  {
    id: 'uranium', name: 'Uranium', state: 'powder', color: ['#56743c', '#4a6534', '#628447', '#3f5a2c'],
    density: 19050, slip: 0.35, conductivity: 0.2, heatCapacity: 2, radioactive: true,
    transitions: [{ above: 1130, to: 'corium', chance: 0.05 }],
    update: decays(0.0004),
    onNeutron: fissile({ fast: 0.022, slow: 0.15, heat: 90 }),
    desc: 'Fissile fuel. Slow neutrons split it, releasing heat and more neutrons. Pile enough together (or add a moderator) and it goes critical.',
  },
  {
    id: 'fuel_rod', name: 'Fuel Rod', state: 'solid', color: ['#3f5f3a', '#4b6e44', '#36502f'], variance: 6,
    density: 10500, conductivity: 0.25, heatCapacity: 2, radioactive: true,
    transitions: [{ above: 1400, to: 'corium', chance: 0.03 }],
    update: decays(0.0003),
    onNeutron: fissile({ fast: 0.022, slow: 0.15, heat: 70, spentChance: 0.01 }),
    desc: 'Solid uranium fuel for building reactors. Melts down into corium if it overheats.',
  },
  {
    id: 'plutonium', name: 'Plutonium', state: 'powder', color: ['#8a8f99', '#a1a7b2', '#c9a0ff'], variance: 8,
    density: 19800, slip: 0.3, conductivity: 0.15, heatCapacity: 2, temp: 45, radioactive: true,
    transitions: [{ above: 900, to: 'corium', chance: 0.05 }],
    update(sim, i) {
      sim.addHeat(i, 0.05); // warm to the touch from its own decay
      if (rnd() < 0.002) sim.emitNeutrons(i, 1);
      return false;
    },
    onNeutron: fissile({ fast: 0.045, slow: 0.25, heat: 140, spentChance: 0.01 }),
    desc: 'Hotter, twitchier fuel. A small lump goes critical without help.',
  },
  {
    id: 'neutron', name: 'Neutrons', state: 'gas', color: '#bff3ff', variance: 0, noClone: true,
    desc: 'Spray free neutrons. They fly straight through most things and split uranium.',
    onPaint(sim, i) {
      if (rnd() < 0.2) sim.emitNeutrons(i, 1);
      return true;
    },
  },
  {
    id: 'neutron_source', name: 'Neutron Source', state: 'solid', color: ['#3b2363', '#6a42a8', '#53348a'],
    conductivity: 0.1, indestructible: true, noClone: true, glow: false, neutron: 'pass', radioactive: true,
    update(sim, i) {
      if (rnd() < 0.08) sim.emitNeutrons(i, 1);
      return true;
    },
    desc: 'Steady stream of neutrons in every direction. Good for kick-starting a reactor.',
  },
  {
    id: 'corium', name: 'Corium', state: 'liquid', color: ['#ff7a1a', '#ffc04a', '#d8ff5a', '#ff9a2a'],
    density: 9000, dispersion: 1, moveChance: 0.35, temp: 2400, conductivity: 0.3, heatCapacity: 2,
    flicker: true, radioactive: true,
    transitions: [{ below: 1000, to: 'spent_fuel', chance: 0.02 }],
    update: decays(0.002),
    onNeutron: fissile({ fast: 0.012, slow: 0.1, heat: 80, spentChance: 0.03 }),
    desc: 'Molten reactor core. Burns through almost anything and keeps on reacting.',
  },
  {
    id: 'spent_fuel', name: 'Nuclear Waste', state: 'powder', color: ['#6dff3f', '#3fc42a', '#a8ff7a', '#2f9a22'],
    density: 11000, slip: 0.4, conductivity: 0.15, flicker: true, radioactive: true,
    update(sim, i) {
      sim.addHeat(i, 0.08);
      if (rnd() < 0.0008) sim.emitNeutrons(i, 1);
      if (rnd() < 0.00015) sim.morph(i, ids.lead);
      return false;
    },
    onNeutron: fissile({ fast: 0.005, slow: 0.05, heat: 60, spent: null }),
    desc: 'Glowing leftovers. Warm and mildly radioactive, it slowly decays into lead.',
  },
  {
    id: 'beryllium', name: 'Beryllium', state: 'solid', color: '#a9bdb8', variance: 6, density: 1850,
    conductivity: 0.3, neutron: { mode: 'reflect', chance: 0.7 },
    transitions: [{ above: 1287, to: 'molten_metal', chance: 0.05 }],
    desc: 'Neutron mirror. Wrap a core in it to bounce escaping neutrons back in.',
  },
  {
    id: 'graphite', name: 'Graphite', state: 'solid', color: ['#2a2c31', '#34373d', '#24262a'], variance: 4,
    density: 2200, conductivity: 0.3, conductive: true, neutron: { mode: 'moderate', chance: 0.4, absorb: 0.005 },
    transitions: [
      { above: 750, to: 'ember', chance: 0.004 },
      { above: 750, to: 'fire', chance: 0.01 },
    ],
    desc: 'Moderator: slows neutrons so they split uranium far more often. Also conducts electricity, and burns if it gets too hot.',
  },
  {
    id: 'heavy_water', name: 'Heavy Water', state: 'liquid', color: '#3557b0', variance: 8, density: 1110,
    dispersion: 5, conductivity: 0.25, heatCapacity: 3, neutron: { mode: 'moderate', chance: 0.35, absorb: 0.002 },
    transitions: [
      { below: 3.8, to: 'ice', chance: 0.01 },
      { above: 101.4, to: 'steam', chance: 0.05 },
    ],
    desc: 'Water made with deuterium. A near-perfect moderator that hardly absorbs neutrons.',
  },
  {
    id: 'boron', name: 'Boron', state: 'powder', color: ['#5a4a3a', '#6b5844', '#4a3c2f'], density: 2340,
    slip: 0.6, neutron: { mode: 'absorb', chance: 0.85 },
    desc: 'Neutron sponge. Pour it on a runaway reactor to shut it down.',
  },
  {
    id: 'control_rod', name: 'Control Rod', state: 'solid', color: ['#3a3f4b', '#454b59'], variance: 4,
    density: 2520, conductivity: 0.2, neutron: { mode: 'absorb', chance: 0.9 },
    transitions: [{ above: 2400, to: 'molten_metal', chance: 0.05 }],
    desc: 'Boron carbide rod that soaks up neutrons. Put it between fuel to keep a reactor tame.',
  },
  {
    id: 'auto_rod', name: 'Auto Rod', state: 'solid', color: ['#5d6576', '#6a7385'], variance: 4,
    density: 2520, conductivity: 0.2, conductive: true, neutron: 'pass', chargeColor: '#ffcf5a',
    desc: 'Electric control rod. Lets neutrons through until it gets a current, then absorbs them for a few seconds. Wire it to a Geiger counter or thermostat for an automatic reactor.',
    update(sim, i) {
      if (sim.charge[i] > 0) {
        const c = sim.charge[i];
        sim.morph(i, ids.auto_rod_on);
        sim.charge[i] = c; // keep the current flowing along the rod
      }
      return false;
    },
  },
  {
    id: 'auto_rod_on', name: 'Auto Rod (engaged)', state: 'solid', hidden: true, color: ['#b0472f', '#c9583a'],
    variance: 4, density: 2520, conductivity: 0.2, conductive: true, life: [100, 100], decayTo: 'auto_rod',
    neutron: { mode: 'absorb', chance: 0.9 }, chargeColor: '#ffcf5a',
    update(sim, i) {
      if (sim.charge[i] > 0) sim.life[i] = 100;
      return false;
    },
  },
  {
    id: 'geiger', name: 'Geiger Counter', state: 'solid', color: ['#26302a', '#2f3b32'], variance: 4,
    conductivity: 0.1, conductive: true, chargeColor: '#7dff6a',
    onNeutron(sim, i) {
      sim.energize(i);
      return ABSORB;
    },
    desc: 'Flashes when a neutron hits it, sending a pulse into touching metal, graphite or auto rods.',
  },
  {
    id: 'lead', name: 'Lead', state: 'solid', color: ['#555a66', '#5f6573', '#4b505b'], variance: 5,
    density: 11340, conductivity: 0.3, conductive: true, neutron: { mode: 'absorb', chance: 0.4 },
    transitions: [{ above: 327, to: 'molten_lead', chance: 0.05 }],
    desc: 'Dense shielding. Stops plenty of neutrons and melts at only 327°C.',
  },
  {
    id: 'molten_lead', name: 'Molten Lead', state: 'liquid', category: 'liquids', color: ['#9aa0ad', '#b5bbc7'],
    density: 10660, dispersion: 3, temp: 400, conductivity: 0.3, conductive: true, neutron: { mode: 'absorb', chance: 0.4 },
    transitions: [{ below: 320, to: 'lead', chance: 0.05 }],
    desc: 'Liquid lead. Freezes at 327°C.',
  },
  {
    id: 'deuterium', name: 'Deuterium', state: 'gas', color: '#ffd6ea', variance: 5, density: 0.18,
    conductivity: 0.1, neutron: 'pass',
    desc: 'Heavy hydrogen. Above 2500°C it fuses into helium, releasing enormous heat and neutrons. Light it with plasma.',
    update(sim, i, x, y) {
      const j = sim.randomNeighbor(x, y);
      if (j < 0) return false;
      if (sim.type[j] === ids.plasma && sim.temp[i] < 3000) sim.temp[i] = 3000; // plasma lights it
      if (sim.temp[i] < 2500 || sim.type[j] !== ids.deuterium || rnd() > 0.3) return false;
      sim.morph(i, ids.helium);
      sim.morph(j, ids.plasma);
      sim.temp[i] = 3000;
      sim.temp[j] = 6000;
      sim.emitNeutrons(i, 1);
      if (rnd() < 0.2) sim.air.addPressure(x, y, 3);
      return true;
    },
  },
  {
    id: 'helium', name: 'Helium', state: 'gas', category: 'gases', color: '#f4e6ff', variance: 4, density: 0.17,
    neutron: 'pass',
    desc: 'Inert and very light. Floats straight up. What fusion leaves behind.',
  },
];
