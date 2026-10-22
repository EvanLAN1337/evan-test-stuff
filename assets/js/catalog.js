// The hub's table of contents.
// To put a new tool, app or game on the landing page, add an entry to `items`.
//   section: which shelf it goes on (an id from `sections`)
//   href:    link to the page (relative to the site root)
//   thumb:   optional image (any size, shown at 16:9); without one, a monogram tile is shown
//   status:  'new' | 'live' | 'beta' | 'soon'   ('soon' cards are not clickable)
//   accent:  optional colour for the monogram tile
// A section's `cta` is the link label on its cards ("Open", "Play", ...).
window.SITE_CATALOG = {
  sections: [
    { id: 'tools', title: 'Tools & apps', blurb: 'Practical utilities you can use right away.', cta: 'Open' },
    { id: 'games', title: 'Games', blurb: 'Sandboxes, toys and other things to play.', cta: 'Play' },
  ],
  items: [
    {
      section: 'tools',
      title: 'First tool',
      blurb: 'The first tool is in progress and will appear here when it\'s ready.',
      tags: ['Utility'],
      status: 'soon',
    },
    {
      section: 'tools',
      title: 'More on the way',
      blurb: 'Converters, calculators and other small apps are planned.',
      status: 'soon',
    },
    {
      section: 'games',
      title: 'Powder Lab',
      href: 'games/powder/',
      thumb: 'games/powder/thumb.svg',
      blurb: 'A falling-sand sandbox with heat, air pressure, fire, electricity and dozens of elements.',
      tags: ['Sandbox', 'Physics'],
      status: 'live',
      accent: '#e8890c',
    },
    {
      section: 'games',
      title: 'Parcels',
      href: 'games/parcels/',
      thumb: 'games/parcels/thumb.svg',
      blurb: 'Split the grid into rectangles that match each number\'s area and shape. Endless puzzles with a timer.',
      tags: ['Puzzle', '3 levels'],
      status: 'new',
      accent: '#ff9f43',
    },
    {
      section: 'games',
      title: 'Trace',
      href: 'games/trace/',
      thumb: 'games/trace/thumb.svg',
      blurb: 'Draw one line through the numbers in order and fill every cell. Endless puzzles with a timer.',
      tags: ['Puzzle', '3 levels'],
      status: 'new',
      accent: '#3ef0ff',
    },
  ],
};
