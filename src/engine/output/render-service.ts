import type { DesignSpec } from '@shared/domain';
import { PRINT_PPI, pixelSize } from '@shared/domain/print';
import type { FontCatalog } from '../catalog/fonts';
import { CanvasTextMeasurer } from '../layout/canvas-text-measurer';
import { computeSafeArea } from '../layout/safe-area';
import { FitTextLayoutEngine } from '../layout/text-layout-engine';
import type { DrawPlan, TextLayoutEngine, TextMeasurer } from '../layout/types';
import { drawDesign } from '../paint/draw-design';
import { createPainterRegistry } from '../paint/painter-registry';
import { registerDefaultPainters } from '../paint/default-painters';
import type { Canvas2D, PainterRegistry } from '../paint/types';
import { solidMatMarginPainter, type MarginPainter } from '../paint/margin-painter';
import { setJpegDensity } from './jpeg-density';

export interface RenderService {
  /** Small bitmap for the gallery. The DrawPlan is computed at print resolution, then scaled. */
  renderPreview(spec: DesignSpec, targetWidthPx: number): Promise<ImageBitmap>;
  /** Full-resolution JPEG at quality 0.95 with a 300 DPI JFIF header (FR-018). */
  renderPrint(spec: DesignSpec): Promise<ArrayBuffer>;
}

export type RenderEngine = {
  layout: TextLayoutEngine;
  painters: PainterRegistry;
  marginPainter: MarginPainter;
  measurer: TextMeasurer;
};
export type PlanObserver = (plan: DrawPlan) => void;

export const JPEG_QUALITY = 0.95;

export function createRenderEngine(catalog: FontCatalog, measureCtx: Canvas2D): RenderEngine {
  return {
    layout: new FitTextLayoutEngine({
      fontFor: (id) => catalog.byId(id) ?? { weight: 400, style: 'normal', caseTransform: 'none' },
    }),
    painters: registerDefaultPainters(createPainterRegistry()),
    marginPainter: solidMatMarginPainter,
    measurer: new CanvasTextMeasurer(measureCtx),
  };
}

/** The one layout for a spec, always at print resolution. Throws if the quote no longer fits. */
export function planDesign(spec: DesignSpec, engine: RenderEngine): DrawPlan {
  const plan = engine.layout.layout(spec, computeSafeArea(spec.print), engine.measurer);
  if (!plan) throw new Error('This design no longer fits its print size.');
  return plan;
}

function context(canvas: OffscreenCanvas): OffscreenCanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  return ctx;
}

/**
 * Draws the preview by rendering the print at full resolution (scale 1) and reducing it. Canvas text
 * drawn under a scale transform rasterizes differently, so this is what keeps the preview faithful
 * to the saved image (FR-010); it costs ~30 ms per preview.
 */
export function drawPreview(
  spec: DesignSpec,
  targetWidthPx: number,
  engine: RenderEngine,
  onPlan?: PlanObserver,
): OffscreenCanvas {
  const plan = planDesign(spec, engine);
  onPlan?.(plan);
  const { width, height } = pixelSize(spec.print);
  const w = Math.max(1, Math.min(width, Math.round(targetWidthPx)));
  const h = Math.max(1, Math.round((w * height) / width));
  const big = new OffscreenCanvas(width, height);
  drawDesign(context(big), plan, spec.style, engine.painters, 1, engine.marginPainter);
  const canvas = new OffscreenCanvas(w, h);
  const ctx = context(canvas);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(big, 0, 0, w, h);
  return canvas;
}

export async function encodePrint(
  spec: DesignSpec,
  engine: RenderEngine,
  onPlan?: PlanObserver,
): Promise<ArrayBuffer> {
  const plan = planDesign(spec, engine);
  onPlan?.(plan);
  const canvas = new OffscreenCanvas(plan.canvas.width, plan.canvas.height);
  drawDesign(context(canvas), plan, spec.style, engine.painters, 1, engine.marginPainter);
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY });
  const bytes = setJpegDensity(new Uint8Array(await blob.arrayBuffer()), PRINT_PPI);
  return bytes.buffer as ArrayBuffer;
}
