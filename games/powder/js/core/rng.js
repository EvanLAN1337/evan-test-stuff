// Fast xorshift32 RNG for the simulation hot loop (quicker than Math.random and good enough for particles).
let s = (Math.random() * 0xffffffff) >>> 0 || 0x9e3779b9;

/** Float in [0, 1). */
export function rnd() {
  s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
  return (s >>> 0) / 4294967296;
}

/** Integer in [0, n). */
export function rint(n) {
  return (rnd() * n) | 0;
}
