# EVAN'S STUFF

A static website: a landing page (hub) that links to small browser games and features.
No build step, no dependencies, no database. Plain HTML, CSS and JavaScript (ES modules).

```
index.html                 the hub / landing page
assets/css/tokens.css      shared colours + fonts (used by the hub AND every game)
assets/css/site.css        hub styles
assets/js/catalog.js       ← list of games/features shown on the hub (edit this to add cards)
assets/js/site.js          renders the hub from catalog.js
games/powder/              Powder Lab (falling-sand sandbox)
404.html                   "page not found"
start-local.bat            double-click to run the site locally
```

## Run it locally

Games use JavaScript modules, which browsers won't load from `file://`, so serve the folder:

- Double-click **`start-local.bat`** (needs Python), or
- run `python -m http.server 8080` in this folder and open http://localhost:8080

## Put it online (GitHub Pages, free)

1. Create a new **public** repository on GitHub (e.g. `evans-stuff`). For the shortest URL, name it
   `<your-username>.github.io`.
2. In this folder:
   ```
   git add -A
   git commit -m "EVAN'S STUFF: hub + Powder Lab"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo>.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   branch `main`, folder `/ (root)`. Save.
4. After a minute the site is live at `https://<your-username>.github.io/<repo>/`
   (or `https://<your-username>.github.io/` if you used that repo name). Every push redeploys it.

All links are relative, so the site works at either URL. A custom domain can be added later under
Settings → Pages.

## Add a new game or feature to the hub

1. Make a folder, e.g. `games/snake/`, with its own `index.html`. Link the shared styles with
   `<link rel="stylesheet" href="../../assets/css/tokens.css">` and add a back link `href="../../"`.
2. Add an entry to `assets/js/catalog.js`:
   ```js
   { section: 'games', title: 'Snake', href: 'games/snake/', thumb: 'games/snake/thumb.png',
     blurb: 'Eat, grow, don\'t bite yourself.', tags: ['Arcade'], status: 'new' },
   ```
   New shelves (sections) are added in the same file.

---

# Powder Lab

Falling-sand sandbox with temperature, heat conduction, phase changes, reactions, air pressure/wind,
electricity, explosions, save/load and touch support.

```
games/powder/js/
  main.js                    wiring: UI, input, main loop
  core/registry.js           compiles element definitions into fast lookup tables
  core/sim.js                the simulation (movement, heat, reactions, electricity, explosions)
  core/air.js                coarse air pressure / velocity field
  render/renderer.js         normal / heat / air views
  ui/settings.js             settings schema (the settings panel is generated from it)
  ui/palette.js, ui/input.js palette + mouse/touch input
  io/save.js                 .powder save files
  content/categories.js      ← palette categories (tabs)
  content/tools.js           ← tools (eraser, heat, cool, wind, pick)
  content/elements/*.js      ← all elements, one file per category
```

## Adding an element

Add an object to the right file in `content/elements/`. Every property except `id`, `name`, `state`
is optional:

```js
{
  id: 'slime',               // unique, used in saves and references
  name: 'Slime',
  state: 'liquid',           // physics: 'solid' | 'powder' | 'liquid' | 'gas'
  category: 'liquids',       // palette tab (defaults to the file's category)
  color: '#5fd35f',          // or a list: ['#ff3d00', '#ffb300']
  variance: 10,              // random brightness spread per particle
  desc: 'Shown in the palette.',

  density: 1100,             // kg/m³. Heavier sinks through lighter liquids/gases. Air = 1.2
  dispersion: 2,             // liquids: how far it spreads sideways per step
  moveChance: 0.5,           // 0..1: lower = more sluggish (honey, lava)
  slip: 0.6,                 // powders: 0..1 how readily it slides down slopes
  airDrag: 0.1,              // how strongly wind pushes it

  temp: 20,                  // spawn temperature °C (default: ambient)
  conductivity: 0.2,         // 0..0.45 heat conduction
  heatCapacity: 2,           // ≥1, higher = slower to heat up / cool down
  holdTemp: 900,             // stays at this temperature (heat source)
  ambientRate: 0.004,        // drifts toward ambient temperature
  glow: true,                // glows red/white when very hot

  life: [20, 40],            // lifespan in steps
  decayTo: 'smoke',          // what it becomes when life runs out (default: nothing)
  decayChance: 0.3,          // chance of decayTo vs vanishing
  flicker: true,             // re-randomise colour every step (fire-like)

  conductive: true,          // carries electricity
  indestructible: true,      // explosions, void and acid can't touch it
  acidProof: true,
  paintChance: 0.6,          // fraction of brush cells filled

  transitions: [             // temperature-driven changes, checked in order
    { above: 100, to: 'steam', chance: 0.05 },
    { below: 0, to: 'ice', chance: 0.01 },
    { above: 300, explode: 4 },              // blast radius
    { above: 500, to: 'fire', temp: 1000 },  // optional new temperature
  ],
  reactions: {               // when touching another element (checked vs a random neighbour)
    water: { chance: 0.05, self: 'mud', other: null },  // undefined = unchanged, null = removed
    fire:  { chance: 0.1, otherHeat: -50 },
  },

  update(sim, i, x, y) {     // custom behaviour, runs every step. Return true to skip default physics.
    return false;
  },
  onPaint(sim, i) {          // custom brush behaviour. Return true if handled.
    return false;
  },
}
```

Typos in element references are reported in the browser console. The palette's info line
(state, density, melting points...) is generated automatically from the definition.

In `update`, useful helpers are `sim.type / temp / life / charge` (typed arrays indexed by `i`),
`sim.spawn(i, ids.water)`, `sim.morph(i, id)`, `sim.erase(i)`, `sim.randomNeighbor(x, y)`,
`sim.n4(x, y, k)`, `sim.addHeat(i, d)`, `sim.energize(i)`, `sim.explode(x, y, r)`.
Import `ids` from `core/registry.js` to refer to elements by name.

## Adding a category, tool or setting

- **Category:** add `{ id, name, icon }` to `content/categories.js`. For a new element file, also
  import it in `content/elements/index.js`.
- **Tool:** add to `content/tools.js` with a `cell(sim, i)` and/or `area(sim, x, y, r, ctx)` function.
- **Setting:** add an entry to `SCHEMA` in `ui/settings.js`; it appears in the settings panel
  automatically and is readable as `settings.values.<key>` (the sim gets the same object).

## Debugging

`window.powder` in the browser console exposes `sim`, `settings`, `ids`, `elements` and the
compiled tables `T`.
