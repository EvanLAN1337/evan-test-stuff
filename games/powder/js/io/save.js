// Save files (.powder): gzip( magic | header length | JSON header | types u16 | temps f32 | life i16 ).
// Element ids are stored by *name* in the header, so saves keep working when elements are added or reordered.
import { T, elements, ids } from '../core/registry.js';
import { rint } from '../core/rng.js';

const MAGIC = 0x31445750; // "PWD1"
const MAX_CELLS = 4_000_000;

async function gzip(blob, decompress = false) {
  const Stream = decompress ? window.DecompressionStream : window.CompressionStream;
  if (!Stream) return blob;
  return new Response(blob.stream().pipeThrough(new Stream('gzip'))).blob();
}

export async function serialize(sim) {
  const local = new Int32Array(T.N).fill(-1);
  const names = [];
  const types = new Uint16Array(sim.n);
  for (let i = 0; i < sim.n; i++) {
    const t = sim.type[i];
    if (local[t] < 0) { local[t] = names.length; names.push(elements[t].id); }
    types[i] = local[t];
  }
  // Clones store an element id in `life`; save it as a local index too.
  const life = new Int16Array(sim.life);
  for (let i = 0; i < sim.n; i++) {
    if (elements[sim.type[i]].id === 'clone' && life[i] > 0) {
      const t = life[i];
      if (local[t] < 0) { local[t] = names.length; names.push(elements[t].id); }
      life[i] = local[t] + 1; // +1 so 0 still means "nothing cloned yet"
    }
  }
  const header = new TextEncoder().encode(JSON.stringify({
    app: 'powder-lab', version: 1, w: sim.w, h: sim.h, names, ambient: sim.settings.ambient,
  }));
  const prefix = new DataView(new ArrayBuffer(8));
  prefix.setUint32(0, MAGIC, true);
  prefix.setUint32(4, header.length, true);
  return gzip(new Blob([prefix, header, types, sim.temp, life]));
}

export async function deserialize(file) {
  let buf = await file.arrayBuffer();
  const head = new Uint8Array(buf, 0, 2);
  if (head[0] === 0x1f && head[1] === 0x8b) buf = await (await gzip(new Blob([buf]), true)).arrayBuffer();
  const dv = new DataView(buf);
  if (buf.byteLength < 8 || dv.getUint32(0, true) !== MAGIC) throw new Error('Not a Powder Lab save file.');
  const hl = dv.getUint32(4, true);
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, hl)));
  const n = header.w * header.h;
  if (!(n > 0 && n <= MAX_CELLS)) throw new Error('Save file has an invalid size.');
  let off = 8 + hl;
  if (buf.byteLength < off + n * 8) throw new Error('Save file is truncated.');
  const types = new Uint16Array(buf.slice(off, off + 2 * n)); off += 2 * n;
  const temps = new Float32Array(buf.slice(off, off + 4 * n)); off += 4 * n;
  const life = new Int16Array(buf.slice(off, off + 2 * n));
  return { header, types, temps, life };
}

/** Load decoded data into the sim (resizing it if needed). Returns names of unknown elements. */
export function applySave(sim, { header, types, temps, life }) {
  if (sim.w !== header.w || sim.h !== header.h) sim.resize(header.w, header.h);
  else sim.clear();
  const missing = [];
  const map = header.names.map((name) => {
    if (ids[name] === undefined) { missing.push(name); return 0; }
    return ids[name];
  });
  const cloneId = ids.clone;
  for (let i = 0; i < sim.n; i++) {
    const t = map[types[i]] ?? 0;
    sim.type[i] = t;
    sim.temp[i] = temps[i];
    sim.life[i] = t === cloneId && life[i] > 0 ? (map[life[i] - 1] ?? 0) : life[i];
    sim.shade[i] = rint(8);
  }
  return missing;
}
