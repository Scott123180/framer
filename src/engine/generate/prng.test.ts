import { describe, expect, it } from 'vitest';
import { mulberry32, shuffle } from './prng';

const take = (seed: number, n: number) => {
  const p = mulberry32(seed);
  return Array.from({ length: n }, () => p.next());
};

describe('mulberry32', () => {
  it('returns values in [0, 1)', () => {
    for (const v of take(42, 1000)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('is deterministic per seed', () => expect(take(7, 1000)).toEqual(take(7, 1000)));
  it('differs between seeds', () => expect(take(7, 10)).not.toEqual(take(8, 10)));
});

describe('shuffle', () => {
  it('is deterministic and does not mutate its input', () => {
    const input = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const a = shuffle(input, mulberry32(3));
    const b = shuffle(input, mulberry32(3));
    expect(a).toEqual(b);
    expect([...a].sort((x, y) => x - y)).toEqual([...input]);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(shuffle(input, mulberry32(4))).not.toEqual(a);
  });
});
