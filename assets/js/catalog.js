// The hub's table of contents.
// To put a new game or feature on the landing page, add an entry to `items`.
//   section: which shelf it goes on (an id from `sections`)
//   href:    link to the page (relative to the site root)
//   thumb:   optional image (any size, shown at 16:10)
//   status:  'new' | 'live' | 'beta' | 'soon'   ('soon' cards are not clickable)
//   accent:  optional colour for the card glow
window.SITE_CATALOG = {
  sections: [
    { id: 'games', title: 'Games', blurb: 'Things to play.' },
    { id: 'features', title: 'Toys & Features', blurb: 'Tools, experiments and other odds and ends.' },
  ],
  items: [
    {
      section: 'games',
      title: 'Powder Lab',
      href: 'games/powder/',
      thumb: 'games/powder/thumb.svg',
      blurb: 'Falling-sand sandbox with heat, air pressure, fire, electricity and dozens of elements.',
      tags: ['Sandbox', 'Physics'],
      status: 'new',
      accent: '#ffb13e',
    },
    {
      section: 'games',
      title: 'Next game',
      blurb: 'Something new is loading...',
      status: 'soon',
    },
    {
      section: 'features',
      title: 'Coming soon',
      blurb: 'Little web toys and tools will show up here.',
      status: 'soon',
    },
  ],
};
