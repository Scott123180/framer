import type { BackgroundKind } from '@shared/domain';
import type { BackgroundPainter, PainterRegistry } from './types';

export function createPainterRegistry(): PainterRegistry {
  const painters = new Map<string, BackgroundPainter<BackgroundKind>>();
  return {
    register(painter) {
      painters.set(painter.kind, painter);
    },
    get(kind) {
      const painter = painters.get(kind);
      if (!painter) throw new Error(`No painter registered for background kind "${kind}"`);
      return painter as unknown as ReturnType<PainterRegistry['get']>;
    },
  };
}
