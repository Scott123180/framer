import type { Style } from '@shared/domain';
import { cssFont } from '../layout/canvas-text-measurer';
import { inset } from '../layout/safe-area';
import type { DrawPlan } from '../layout/types';
import { solidMatMarginPainter, type MarginPainter } from './margin-painter';
import type { Canvas2D, PainterRegistry } from './types';

/**
 * Draws a DrawPlan: the margin band (if any), the background inside it, then the text. Preview and
 * print call this with the same plan (FR-010).
 */
export function drawDesign(
  ctx: Canvas2D,
  plan: DrawPlan,
  style: Style,
  painters: PainterRegistry,
  scale: number,
  margin: MarginPainter = solidMatMarginPainter,
): void {
  ctx.save();
  ctx.scale(scale, scale);
  const painter = painters.get(style.background.kind);
  const full = { x: 0, y: 0, width: plan.canvas.width, height: plan.canvas.height };
  margin.paint(ctx, plan, painter.matTone(style.background));
  painter.paint(ctx, style.background, inset(full, plan.marginPx));
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  for (const line of plan.lines) {
    ctx.font = cssFont(line.font);
    ctx.fillStyle = line.color;
    ctx.fillText(line.text, line.x, line.y);
  }
  ctx.restore();
}
