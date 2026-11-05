import { mulberry32, type Prng } from '../generate/prng';

/** Smooth value noise in [-1, 1] on a width×height grid, with lattice points every `spacing` cells. */
export function valueNoise(width: number, height: number, spacing: number, prng: Prng): Float32Array {
  const gw = Math.ceil(width / spacing) + 2;
  const gh = Math.ceil(height / spacing) + 2;
  const lattice = new Float32Array(gw * gh);
  for (let i = 0; i < lattice.length; i++) lattice[i] = prng.next() * 2 - 1;
  const out = new Float32Array(width * height);
  const smooth = (t: number) => t * t * (3 - 2 * t);
  for (let y = 0; y < height; y++) {
    const fy = y / spacing;
    const y0 = Math.floor(fy);
    const ty = smooth(fy - y0);
    for (let x = 0; x < width; x++) {
      const fx = x / spacing;
      const x0 = Math.floor(fx);
      const tx = smooth(fx - x0);
      const a = lattice[y0 * gw + x0]!;
      const b = lattice[y0 * gw + x0 + 1]!;
      const c = lattice[(y0 + 1) * gw + x0]!;
      const d = lattice[(y0 + 1) * gw + x0 + 1]!;
      out[y * width + x] = a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
    }
  }
  return out;
}

/** Grain fields used by the texture painter. Values are in [-1, 1]; same seed, same field. */
export function grainField(
  grain: 'paper' | 'linen' | 'noise',
  width: number,
  height: number,
  seed: number,
): Float32Array {
  const prng = mulberry32(seed);
  const out = new Float32Array(width * height);
  if (grain === 'noise') {
    for (let i = 0; i < out.length; i++) out[i] = prng.next() * 2 - 1;
    return out;
  }
  if (grain === 'linen') {
    const rows = Float32Array.from({ length: height }, () => prng.next() * 2 - 1);
    const cols = Float32Array.from({ length: width }, () => prng.next() * 2 - 1);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++)
        out[y * width + x] = 0.45 * rows[y]! + 0.45 * cols[x]! + 0.1 * (prng.next() * 2 - 1);
    return out;
  }
  const coarse = valueNoise(width, height, 24, prng);
  const fine = valueNoise(width, height, 5, prng);
  for (let i = 0; i < out.length; i++)
    out[i] = 0.55 * coarse[i]! + 0.3 * fine[i]! + 0.15 * (prng.next() * 2 - 1);
  return out;
}
