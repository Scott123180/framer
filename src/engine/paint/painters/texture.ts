import type { BackgroundSpec } from '@shared/domain';
import { blendEnvelope, matShade } from '../shared';
import { grainField } from '../value-noise';
import type { BackgroundPainter } from '../types';
import type { Rect } from '../../layout/types';

type TextureSpec = Extract<BackgroundSpec, { kind: 'texture' }>;

/** Grain is generated on a grid in print pixels, so a preview is the print drawn smaller. */
const GRAIN_CELLS_ON_SHORT_SIDE = 600;

const cache = new Map<string, OffscreenCanvas>();

function grainCanvas(spec: TextureSpec, rect: Rect): OffscreenCanvas {
  const cell = Math.min(rect.width, rect.height) / GRAIN_CELLS_ON_SHORT_SIDE;
  const w = Math.max(1, Math.round(rect.width / cell));
  const h = Math.max(1, Math.round(rect.height / cell));
  const key = `${spec.grain}|${spec.seed}|${spec.intensity}|${w}|${h}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const field = grainField(spec.grain, w, h, spec.seed);
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  const img = ctx.createImageData(w, h);
  for (let i = 0; i < field.length; i++) {
    const v = Math.max(-1, Math.min(1, field[i]!));
    const shade = v >= 0 ? 255 : 0;
    img.data[i * 4] = shade;
    img.data[i * 4 + 1] = shade;
    img.data[i * 4 + 2] = shade;
    img.data[i * 4 + 3] = Math.floor(Math.abs(v) * spec.intensity * 255);
  }
  ctx.putImageData(img, 0, 0);
  if (cache.size > 8) cache.delete(cache.keys().next().value as string);
  cache.set(key, canvas);
  return canvas;
}

/**
 * Base color with light and dark grain blended over it at no more than `intensity`, so every pixel
 * stays between the base mixed toward black and toward white by `intensity`.
 */
export const texturePainter: BackgroundPainter<'texture'> = {
  kind: 'texture',
  paint(ctx, spec, rect) {
    ctx.save();
    ctx.fillStyle = spec.base;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(grainCanvas(spec, rect), rect.x, rect.y, rect.width, rect.height);
    ctx.restore();
  },
  luminanceEnvelope(spec) {
    const down = blendEnvelope(spec.base, '#000000', spec.intensity);
    const up = blendEnvelope(spec.base, '#ffffff', spec.intensity);
    return { min: Math.min(down.min, up.min), max: Math.max(down.max, up.max) };
  },
  matTone: (spec) => matShade(spec.base),
};
