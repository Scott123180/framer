import { useEffect, useRef, useState } from 'react';
import type { DesignSpec } from '@shared/domain';
import type { RenderService } from '@engine/output/render-service';

/** Pixel width previews are rendered at: sharp on HiDPI screens at the gallery's card sizes. */
export const PREVIEW_WIDTH_PX = 600;

export const previewKey = (id: string, spec: DesignSpec) =>
  `${id}|${spec.print.size}|${spec.print.orientation}|${spec.print.margin.enabled ? spec.print.margin.size : 'off'}`;

/**
 * Requests a preview bitmap for each option and returns them by previewKey. Results for options
 * that are no longer shown are dropped and their bitmaps closed.
 */
export function usePreviews(
  options: ReadonlyArray<{ id: string; spec: DesignSpec }>,
  renderService: RenderService,
): ReadonlyMap<string, ImageBitmap> {
  const [bitmaps, setBitmaps] = useState<ReadonlyMap<string, ImageBitmap>>(new Map());
  const wanted = useRef(new Set<string>());

  useEffect(() => {
    const keys = new Set(options.map((o) => previewKey(o.id, o.spec)));
    wanted.current = keys;
    setBitmaps((prev) => {
      const next = new Map<string, ImageBitmap>();
      for (const [k, b] of prev) {
        if (keys.has(k)) next.set(k, b);
        else b.close();
      }
      return next;
    });
    for (const o of options) {
      const key = previewKey(o.id, o.spec);
      renderService.renderPreview(o.spec, PREVIEW_WIDTH_PX).then(
        (bitmap) => {
          if (!wanted.current.has(key)) {
            bitmap.close();
            return;
          }
          setBitmaps((prev) => new Map(prev).set(key, bitmap));
        },
        (e: unknown) => console.error('[previews] render failed', e),
      );
    }
  }, [options, renderService]);

  return bitmaps;
}
