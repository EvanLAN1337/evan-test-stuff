// Registers every element file. To add a new file, import it here and add it to FILES.
// Each file's entries get that file's category unless they set `category` themselves.
import { defineElements } from '../../core/registry.js';
import solids from './solids.js';
import powders from './powders.js';
import liquids from './liquids.js';
import gases from './gases.js';
import energy from './energy.js';
import special from './special.js';
import electric from './electric.js';
import chemistry from './chemistry.js';
import nuclear from './nuclear.js';

const FILES = { solids, powders, liquids, gases, energy, electric, chemistry, nuclear, special };

for (const [category, list] of Object.entries(FILES)) {
  defineElements(list.map((el) => ({ category, ...el })));
}
