import type { Hex } from '@shared/domain';
import { luminanceOfRgb, parseHex } from '../color';

export const MIN_TEXT_CONTRAST = 4.5;

export type LuminanceEnvelope = { min: number; max: number };

/** Chooses text colors that stay legible over every color a background can produce. */
export interface ContrastPolicy {
  pickTextColors(envelope: LuminanceEnvelope, palette: Hex[]): { text: Hex; attribution: Hex } | null;
}

export function relativeLuminance(hex: string): number {
  return luminanceOfRgb(parseHex(hex));
}

export function ratioOfLuminances(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function contrastRatio(a: string, b: string): number {
  return ratioOfLuminances(relativeLuminance(a), relativeLuminance(b));
}

/** WCAG 2.x: a color qualifies if it reaches 4.5:1 against both the darkest and lightest background color. */
export class WcagContrastPolicy implements ContrastPolicy {
  pickTextColors(envelope: LuminanceEnvelope, palette: Hex[]): { text: Hex; attribution: Hex } | null {
    const legible = palette.filter((c) => {
      const l = relativeLuminance(c);
      return (
        ratioOfLuminances(l, envelope.min) >= MIN_TEXT_CONTRAST &&
        ratioOfLuminances(l, envelope.max) >= MIN_TEXT_CONTRAST
      );
    });
    const [text, other] = legible;
    if (!text) return null;
    return { text, attribution: other ?? text };
  }
}
