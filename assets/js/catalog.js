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
      status: 'new',
      accent: '#e8890c',
    },
    {
      section: 'games',
      title: 'Next game',
      blurb: 'Something new is in the works.',
      status: 'soon',
    },
  ],
};
