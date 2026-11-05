import type { Hex } from '@shared/domain';
import type { DrawPlan } from '../layout/types';
import type { Canvas2D } from './types';

/** Paints the frame-ready margin band. A strategy, so the margin's look can change in one place. */
export interface MarginPainter {
  paint(ctx: Canvas2D, plan: DrawPlan, matTone: Hex): void;
}

/** Fills the four margin bands with the background's mat tone (research R15). */
export const solidMatMarginPainter: MarginPainter = {
  paint(ctx, plan, matTone) {
    const m = plan.marginPx;
    if (m <= 0) return;
    const { width: w, height: h } = plan.canvas;
    ctx.fillStyle = matTone;
    ctx.fillRect(0, 0, w, m);
    ctx.fillRect(0, h - m, w, m);
    ctx.fillRect(0, m, m, h - 2 * m);
    ctx.fillRect(w - m, m, m, h - 2 * m);
  },
};
