import type { PrintSettings } from '@shared/domain';
import { marginWidthPx, paddingPx, pixelSize } from '@shared/domain/print';
import type { Rect, SafeArea } from './types';

export function inset(rect: Rect, by: number): Rect {
  return { x: rect.x + by, y: rect.y + by, width: rect.width - 2 * by, height: rect.height - 2 * by };
}

/** The area text may occupy: inside the margin band (if any) and the trim padding (FR-013, FR-014). */
export function computeSafeArea(print: PrintSettings): SafeArea {
  const { width, height } = pixelSize(print);
  return inset({ x: 0, y: 0, width, height }, marginWidthPx(print) + paddingPx(print));
}
