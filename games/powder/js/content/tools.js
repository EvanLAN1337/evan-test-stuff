// Tools act on the grid instead of placing an element. They appear in the "Tools" category.
//   cell(sim, i, ctx)        runs for every cell under the brush, every frame the button is held
//   area(sim, x, y, r, ctx)  runs once per brush stamp (ctx.dx / ctx.dy = pointer movement)
//   pick: true               special-cased: selects the element under the cursor
export const TOOLS = [
  {
    id: 'eraser', name: 'Eraser', icon: '⌫', color: '#3a3a55',
    desc: 'Remove anything under the brush. Right-click always erases.',
    cell: (sim, i) => sim.erase(i),
  },
  {
    id: 'heat', name: 'Heat', icon: '♨', color: '#c2412d',
    desc: 'Raise the temperature under the brush.',
    cell: (sim, i) => sim.addHeat(i, 6),
  },
  {
    id: 'cool', name: 'Cool', icon: '❄', color: '#2d7cc2',
    desc: 'Lower the temperature under the brush.',
    cell: (sim, i) => sim.addHeat(i, -6),
  },
  {
    id: 'wind', name: 'Wind', icon: '≋', color: '#2d8f7c',
    desc: 'Drag to push air. Moves gases, fire and light powders. Needs Air enabled.',
    area: (sim, x, y, r, ctx) => sim.air.addVelocity(x, y, r, ctx.dx * 0.4, ctx.dy * 0.4),
  },
  {
    id: 'pick', name: 'Pick', icon: '⊙', color: '#6b4fc2', pick: true,
    desc: 'Click a particle to select its element. Middle-click also picks.',
  },
];
