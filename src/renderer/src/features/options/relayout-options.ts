import type { DesignSpec } from '@shared/domain';
import { computeSafeArea } from '@engine/layout/safe-area';
import type { TextLayoutEngine, TextMeasurer } from '@engine/layout/types';

/** Re-runs layout for each option at its (new) print settings and returns the ids that still fit (FR-015). */
export function relayoutOptions(
  options: ReadonlyArray<{ id: string; spec: DesignSpec }>,
  deps: { layout: TextLayoutEngine; measurer: TextMeasurer },
): string[] {
  return options
    .filter((o) => deps.layout.layout(o.spec, computeSafeArea(o.spec.print), deps.measurer) !== null)
    .map((o) => o.id);
}
