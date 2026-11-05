import { EMOJI_FALLBACK_FAMILY } from '../catalog/fonts';
import type { Canvas2D } from '../paint/types';
import type { FontSpec, TextMeasurer } from './types';

/** The CSS font shorthand used for both measuring and drawing, with color emoji as the last fallback. */
export function cssFont(font: FontSpec): string {
  return `${font.style} ${font.weight} ${font.sizePx}px "${font.family}", "${EMOJI_FALLBACK_FAMILY}"`;
}

/** Measures with the real canvas text engine, so layout matches what gets drawn. */
export class CanvasTextMeasurer implements TextMeasurer {
  private current = '';

  constructor(private readonly ctx: Canvas2D) {}

  private use(font: FontSpec): void {
    const css = cssFont(font);
    if (css !== this.current) {
      this.ctx.font = css;
      this.current = css;
    }
  }

  width(text: string, font: FontSpec): number {
    this.use(font);
    return this.ctx.measureText(text).width;
  }

  metrics(font: FontSpec): { ascent: number; descent: number } {
    this.use(font);
    const m = this.ctx.measureText('Hg');
    return { ascent: m.fontBoundingBoxAscent, descent: m.fontBoundingBoxDescent };
  }
}
