import { gradientEnvelope, matShade } from '../shared';
import type { BackgroundPainter } from '../types';

export const radialPainter: BackgroundPainter<'radial'> = {
  kind: 'radial',
  paint(ctx, spec, rect) {
    const cx = rect.x + spec.center[0] * rect.width;
    const cy = rect.y + spec.center[1] * rect.height;
    const r = Math.max(
      ...[
        [rect.x, rect.y],
        [rect.x + rect.width, rect.y],
        [rect.x, rect.y + rect.height],
        [rect.x + rect.width, rect.y + rect.height],
      ].map(([x, y]) => Math.hypot(x! - cx, y! - cy)),
    );
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    spec.stops.forEach((c, i) => g.addColorStop(i / (spec.stops.length - 1), c));
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  },
  luminanceEnvelope: (spec) => gradientEnvelope(spec.stops),
  matTone: (spec) => matShade(spec.stops.at(-1)!),
};
