import type { BackgroundKind, BackgroundSpec, Hex } from '@shared/domain';
import type { LuminanceEnvelope } from '../generate/contrast';
import type { Rect } from '../layout/types';

export type Canvas2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface BackgroundPainter<K extends BackgroundKind = BackgroundKind> {
  kind: K;
  paint(ctx: Canvas2D, spec: Extract<BackgroundSpec, { kind: K }>, rect: Rect): void;
  /** The darkest and lightest relative luminance this background can produce. */
  luminanceEnvelope(spec: Extract<BackgroundSpec, { kind: K }>): LuminanceEnvelope;
  /** A solid color from the background's palette, used for the frame-ready margin. */
  matTone(spec: Extract<BackgroundSpec, { kind: K }>): Hex;
}

/** Looks painters up by kind. `get` is typed loosely so callers can pass any BackgroundSpec. */
export interface PainterRegistry {
  register(painter: BackgroundPainter<BackgroundKind>): void;
  get(kind: string): {
    paint(ctx: Canvas2D, spec: BackgroundSpec, rect: Rect): void;
    luminanceEnvelope(spec: BackgroundSpec): LuminanceEnvelope;
    matTone(spec: BackgroundSpec): Hex;
  };
}
