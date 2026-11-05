import { gradientEnvelope, matShade } from '../shared';
import type { BackgroundPainter } from '../types';

export const linearPainter: BackgroundPainter<'linear'> = {
  kind: 'linear',
  paint(ctx, spec, rect) {
    const rad = (spec.angleDeg * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    const half = Math.abs((rect.width / 2) * dx) + Math.abs((rect.height / 2) * dy);
    const g = ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
    spec.stops.forEach((c, i) => g.addColorStop(i / (spec.stops.length - 1), c));
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  },
  luminanceEnvelope: (spec) => gradientEnvelope(spec.stops),
  matTone: (spec) => matShade(spec.stops[0]!),
};
