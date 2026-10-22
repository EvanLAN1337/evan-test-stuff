// Element registry.
// Turns the friendly element definitions in content/elements/*.js into flat typed-array
// lookup tables (T.*) that the simulation reads in its hot loop. Element numeric ids are
// assigned at build() time; look them up by name with ids.water, ids.fire, ...

export const STATE = Object.freeze({ SOLID: 0, POWDER: 1, LIQUID: 2, GAS: 3 });
export const STATE_NAMES = ['solid', 'powder', 'liquid', 'gas'];
export const AIR_DENSITY = 1.2; // kg/m³. Gases lighter than this rise, heavier ones sink.
export const SHADES = 8;        // colour variants per element

// Defaults applied per physical state when an element doesn't specify a property.
const STATE_DEFAULTS = [
  /* solid  */ { conductivity: 0.15, heatCapacity: 1, airDrag: 0, paintChance: 1, glow: true, density: 2000 },
  /* powder */ { conductivity: 0.12, heatCapacity: 1, airDrag: 0.05, paintChance: 0.6, glow: true, slip: 1, density: 1500 },
  /* liquid */ { conductivity: 0.2, heatCapacity: 1, airDrag: 0.02, paintChance: 0.8, glow: true, dispersion: 4, density: 1000 },
  /* gas    */ { conductivity: 0.04, heatCapacity: 1, airDrag: 0.35, paintChance: 0.5, glow: false, ambientRate: 0.004, density: 1 },
];

export const elements = []; // element definitions indexed by numeric id; [0] is "empty"
export const ids = Object.create(null);
export const T = {};        // compiled tables, filled by build()
const queue = [];

/** Queue element definitions for registration. Call before build(). */
export function defineElements(list) {
  for (const d of list) queue.push(d);
}

function hexToRgb(hex) {
  let h = String(hex).replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
export const pack = (r, g, b) => (0xff000000 | (clamp255(b) << 16) | (clamp255(g) << 8) | clamp255(r)) >>> 0;

export function build() {
  const defs = [
    { id: 'empty', name: 'Empty', state: 'gas', hidden: true, color: '#000000', density: AIR_DENSITY,
      conductivity: 0.015, airDrag: 0, ambientRate: 0 },
    ...queue,
  ];

  // Pass 1: assign numeric ids.
  defs.forEach((d, n) => {
    if (ids[d.id] !== undefined) throw new Error(`[powder] duplicate element id "${d.id}"`);
    ids[d.id] = n;
    elements[n] = d;
  });

  const N = defs.length;
  const ref = (name, from) => {
    if (name === null || name === undefined) return 0;
    const n = ids[name];
    if (n === undefined) { console.warn(`[powder] "${from}" references unknown element "${name}"`); return 0; }
    return n;
  };

  Object.assign(T, {
    N,
    state: new Uint8Array(N),
    density: new Float32Array(N),
    cond: new Float32Array(N),
    invCap: new Float32Array(N),
    dispersion: new Uint8Array(N),
    moveChance: new Float32Array(N),
    slip: new Float32Array(N),
    airDrag: new Float32Array(N),
    hold: new Float32Array(N),
    hasHold: new Uint8Array(N),
    ambRate: new Float32Array(N),
    lifeMin: new Int16Array(N),
    lifeMax: new Int16Array(N),
    decayTo: new Uint16Array(N),
    decayChance: new Float32Array(N),
    flicker: new Uint8Array(N),
    glow: new Uint8Array(N),
    conductive: new Uint8Array(N),
    indestructible: new Uint8Array(N),
    explosive: new Uint8Array(N),
    spawnTemp: new Float32Array(N),
    paintChance: new Float32Array(N),
    colors: new Uint32Array(N * SHADES),
    hooks: new Array(N).fill(null),
    trans: new Array(N).fill(null),
    react: new Array(N * N).fill(null),
    hasReact: new Uint8Array(N),
  });

  // Pass 2: compile each definition.
  defs.forEach((d, n) => {
    const s = STATE_NAMES.indexOf(d.state);
    if (s < 0) throw new Error(`[powder] element "${d.id}" has unknown state "${d.state}"`);
    const def = STATE_DEFAULTS[s];
    const get = (k) => (d[k] !== undefined ? d[k] : def[k]);

    T.state[n] = s;
    T.density[n] = get('density');
    T.cond[n] = Math.min(0.45, Math.max(0, get('conductivity')));
    T.invCap[n] = 1 / Math.max(1, get('heatCapacity'));
    T.dispersion[n] = get('dispersion') ?? 0;
    T.moveChance[n] = d.moveChance ?? 1;
    T.slip[n] = get('slip') ?? 1;
    T.airDrag[n] = get('airDrag');
    T.ambRate[n] = get('ambientRate') ?? 0;
    T.paintChance[n] = get('paintChance');
    T.glow[n] = get('glow') ? 1 : 0;
    T.flicker[n] = d.flicker ? 1 : 0;
    T.conductive[n] = d.conductive ? 1 : 0;
    T.indestructible[n] = d.indestructible ? 1 : 0;
    T.spawnTemp[n] = d.temp ?? NaN;
    if (d.holdTemp !== undefined) { T.hold[n] = d.holdTemp; T.hasHold[n] = 1; }
    if (d.life) { T.lifeMin[n] = d.life[0]; T.lifeMax[n] = d.life[1]; }
    T.decayTo[n] = ref(d.decayTo, d.id);
    T.decayChance[n] = d.decayChance ?? 1;
    T.hooks[n] = typeof d.update === 'function' ? d.update : null;

    // Colours: a single hex (shaded by ±variance) or a list of hexes to cycle through.
    const list = Array.isArray(d.color) ? d.color : [d.color ?? '#ff00ff'];
    const variance = d.variance ?? 10;
    for (let k = 0; k < SHADES; k++) {
      const [r, g, b] = hexToRgb(list[k % list.length]);
      const off = list.length > 1 ? (((k * 37) % 7) - 3) * variance / 6 : ((k / (SHADES - 1)) * 2 - 1) * variance;
      T.colors[n * SHADES + k] = pack(r + off, g + off, b + off);
    }

    // Temperature transitions: [{ above|below, to, chance, temp, explode }]
    if (d.transitions?.length) {
      T.trans[n] = d.transitions.map((tr) => {
        const hi = tr.above !== undefined;
        if (tr.explode) T.explosive[n] = 1;
        return {
          hi,
          at: hi ? tr.above : tr.below,
          to: ref(tr.to, d.id),
          chance: tr.chance ?? 1,
          temp: tr.temp ?? NaN,
          explode: tr.explode ?? 0,
        };
      });
    }

    // Reactions: { otherId: { chance, self, other, selfHeat, otherHeat } }
    //   self/other: undefined = unchanged, null = becomes empty, 'id' = becomes that element.
    if (d.reactions) {
      for (const [otherName, r] of Object.entries(d.reactions)) {
        const o = ids[otherName];
        if (o === undefined) { console.warn(`[powder] "${d.id}" reacts with unknown element "${otherName}"`); continue; }
        T.react[n * N + o] = {
          chance: r.chance ?? 1,
          self: r.self === undefined ? -1 : ref(r.self, d.id),
          other: r.other === undefined ? -1 : ref(r.other, d.id),
          selfHeat: r.selfHeat ?? 0,
          otherHeat: r.otherHeat ?? 0,
        };
        T.hasReact[n] = 1;
      }
    }
  });
}
