import type { PainterRegistry } from './types';
import { solidPainter } from './painters/solid';
import { linearPainter } from './painters/linear';
import { radialPainter } from './painters/radial';
import { patternPainter } from './painters/pattern';
import { texturePainter } from './painters/texture';

/** Registers the v1 background kinds. A new kind is a new painter file plus one line here. */
export function registerDefaultPainters(registry: PainterRegistry): PainterRegistry {
  for (const painter of [solidPainter, linearPainter, radialPainter, patternPainter, texturePainter]) {
    registry.register(painter as never);
  }
  return registry;
}
