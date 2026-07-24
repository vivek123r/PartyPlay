/**
 * Mulberry32 PRNG — simple, fast, 32-bit seeded random number generator.
 * Produces deterministic pseudo-random floats between 0 and 1.
 */
export function createPRNG(seed: number) {
  let s = seed >>> 0;
  return function next(): number {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type PRNG = ReturnType<typeof createPRNG>;
