import { describe, expect, it } from 'vitest';
import { Hex } from '@shared/domain';
import { BACKGROUND_CATALOG } from '@engine/catalog/backgrounds';
import { createPainterRegistry } from '@engine/paint/painter-registry';
import { registerDefaultPainters } from '@engine/paint/default-painters';
import { pixelLuminance } from './helpers';

const painters = registerDefaultPainters(createPainterRegistry());
const kinds = ['solid', 'linear', 'radial', 'pattern', 'texture'] as const;
const W = 600;
const H = 900;

function paint(entry: (typeof BACKGROUND_CATALOG)[number]) {
  const canvas = new OffscreenCanvas(W, H);
  const ctx = canvas.getContext('2d')!;
  painters.get(entry.spec.kind).paint(ctx, entry.spec, { x: 0, y: 0, width: W, height: H });
  return ctx.getImageData(0, 0, W, H);
}

describe('background painters', () => {
  for (const kind of kinds) {
    const entries = BACKGROUND_CATALOG.filter((b) => b.spec.kind === kind);
    it(`has at least two ${kind} entries`, () => expect(entries.length).toBeGreaterThanOrEqual(2));

    for (const entry of entries) {
      it(`${entry.id}: every sampled pixel is inside the luminance envelope`, () => {
        const env = painters.get(kind).luminanceEnvelope(entry.spec);
        const data = paint(entry).data;
        for (let gy = 0; gy < 32; gy++) {
          for (let gx = 0; gx < 32; gx++) {
            const x = Math.floor(((gx + 0.5) / 32) * W);
            const y = Math.floor(((gy + 0.5) / 32) * H);
            const l = pixelLuminance(data, (y * W + x) * 4);
            expect(l, `${entry.id} at ${x},${y}`).toBeGreaterThanOrEqual(env.min - 0.01);
            expect(l, `${entry.id} at ${x},${y}`).toBeLessThanOrEqual(env.max + 0.01);
          }
        }
      });

      it(`${entry.id}: has a valid mat tone`, () => {
        expect(Hex.safeParse(painters.get(kind).matTone(entry.spec)).success).toBe(true);
      });
    }
  }

  it('paints the same texture identically for the same seed', () => {
    const entry = BACKGROUND_CATALOG.find((b) => b.spec.kind === 'texture')!;
    expect(paint(entry).data).toEqual(paint(entry).data);
  });

  it('throws for an unknown kind', () => {
    expect(() => painters.get('image')).toThrow();
  });
});
