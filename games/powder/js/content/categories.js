// Palette categories, in display order. An element's `category` must match one of these ids
// (each file in content/elements/ sets a default category for its entries).
// Add a new category here and it shows up as a new tab automatically.
export const CATEGORIES = [
// `color` tints the tab and its buttons.
  { id: 'tools', name: 'Tools', icon: '🛠️', color: '#8f93b8' },
  { id: 'solids', name: 'Solids', icon: '🧱', color: '#b39a7c' },
  { id: 'powders', name: 'Powders', icon: '⏳', color: '#e6c172' },
  { id: 'liquids', name: 'Liquids', icon: '💧', color: '#4f9bff' },
  { id: 'gases', name: 'Gases', icon: '☁️', color: '#a9c4dd' },
  { id: 'energy', name: 'Energy', icon: '🔥', color: '#ff7a2f' },
  { id: 'electric', name: 'Electric', icon: '⚡', color: '#ffe14a' },
  { id: 'chemistry', name: 'Chemistry', icon: '🧪', color: '#7dffb0' },
  { id: 'nuclear', name: 'Nuclear', icon: '☢️', color: '#8cff3a' },
  { id: 'special', name: 'Special', icon: '✨', color: '#d68cff' },
];
