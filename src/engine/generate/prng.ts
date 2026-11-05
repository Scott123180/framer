/** A seeded source of numbers in [0, 1). Injected everywhere randomness is needed, so tests are deterministic. */
export interface Prng {
  next(): number;
}

export function mulberry32(seed: number): Prng {
  let a = seed >>> 0;
  return {
    next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/** Fisher–Yates shuffle into a new array. */
export function shuffle<T>(items: readonly T[], prng: Prng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(prng.next() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/** A fresh seed for production use; tests always pass explicit seeds. */
export function randomSeed(): number {
  return (Math.random() * 2 ** 32) >>> 0;
}
