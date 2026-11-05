import type { BackgroundSpec } from '@shared/domain';
import { blendEnvelope, matShade } from '../shared';
import type { BackgroundPainter, Canvas2D } from '../types';
import type { Rect } from '../../layout/types';

type PatternSpec = Extract<BackgroundSpec, { kind: 'pattern' }>;

/**
 * Each pattern is drawn as ONE path with ONE fill or stroke at `opacity`, so overlapping shapes never
 * stack alpha. That keeps every pixel between `base` and `base` blended `opacity` toward `ink`.
 */
export const patternPainter: BackgroundPainter<'pattern'> = {
  kind: 'pattern',
  paint(ctx, spec, rect) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.width, rect.height);
    ctx.clip();
    ctx.fillStyle = spec.base;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.globalAlpha = spec.opacity;
    ctx.fillStyle = spec.ink;
    ctx.strokeStyle = spec.ink;
    const cell = (Math.min(rect.width, rect.height) / 14) * spec.scale;
    DRAW[spec.pattern](ctx, rect, cell);
    ctx.restore();
  },
  luminanceEnvelope: (spec) => blendEnvelope(spec.base, spec.ink, spec.opacity),
  matTone: (spec) => matShade(spec.base),
};

const DRAW: Record<PatternSpec['pattern'], (ctx: Canvas2D, rect: Rect, cell: number) => void> = {
  dots(ctx, rect, cell) {
    ctx.beginPath();
    const r = cell * 0.16;
    for (let y = rect.y + cell / 2; y < rect.y + rect.height + cell; y += cell) {
      for (let x = rect.x + cell / 2; x < rect.x + rect.width + cell; x += cell) {
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
    }
    ctx.fill();
  },
  stripes(ctx, rect, cell) {
    ctx.beginPath();
    const band = cell * 0.35;
    const span = rect.width + rect.height;
    for (let o = -rect.height; o < span; o += cell) {
      const x0 = rect.x + o;
      ctx.moveTo(x0, rect.y + rect.height);
      ctx.lineTo(x0 + rect.height, rect.y);
      ctx.lineTo(x0 + rect.height + band, rect.y);
      ctx.lineTo(x0 + band, rect.y + rect.height);
      ctx.closePath();
    }
    ctx.fill();
  },
  grid(ctx, rect, cell) {
    ctx.beginPath();
    for (let x = rect.x + cell / 2; x < rect.x + rect.width; x += cell) {
      ctx.moveTo(x, rect.y);
      ctx.lineTo(x, rect.y + rect.height);
    }
    for (let y = rect.y + cell / 2; y < rect.y + rect.height; y += cell) {
      ctx.moveTo(rect.x, y);
      ctx.lineTo(rect.x + rect.width, y);
    }
    ctx.lineWidth = cell * 0.06;
    ctx.stroke();
  },
  chevron(ctx, rect, cell) {
    ctx.beginPath();
    const half = cell / 2;
    for (let y = rect.y; y < rect.y + rect.height + cell; y += cell) {
      ctx.moveTo(rect.x - cell, y);
      for (let x = rect.x - cell; x < rect.x + rect.width + cell; x += cell) {
        ctx.lineTo(x + half, y - half * 0.8);
        ctx.lineTo(x + cell, y);
      }
    }
    ctx.lineWidth = cell * 0.12;
    ctx.lineJoin = 'miter';
    ctx.stroke();
  },
};
