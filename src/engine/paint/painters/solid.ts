import { relativeLuminance } from '../../generate/contrast';
import { matShade } from '../shared';
import type { BackgroundPainter } from '../types';

export const solidPainter: BackgroundPainter<'solid'> = {
  kind: 'solid',
  paint(ctx, spec, rect) {
    ctx.fillStyle = spec.color;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  },
  luminanceEnvelope(spec) {
    const l = relativeLuminance(spec.color);
    return { min: l, max: l };
  },
  matTone: (spec) => matShade(spec.color),
};
