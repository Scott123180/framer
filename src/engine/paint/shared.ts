import type { Hex } from '@shared/domain';
import { luminanceOfRgb, mixHex, mixRgb, parseHex } from '../color';
import type { LuminanceEnvelope } from '../generate/contrast';

/** Luminance range across a canvas gradient's stops, sampled the way canvas interpolates (sRGB). */
export function gradientEnvelope(stops: readonly string[]): LuminanceEnvelope {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < stops.length - 1; i++) {
    const a = parseHex(stops[i]!);
    const b = parseHex(stops[i + 1]!);
    for (let s = 0; s <= 32; s++) {
      const l = luminanceOfRgb(mixRgb(a, b, s / 32));
      min = Math.min(min, l);
      max = Math.max(max, l);
    }
  }
  return { min, max };
}

/** Luminance range of `base` blended toward `toward` by any amount from 0 to `amount`. */
export function blendEnvelope(base: string, toward: string, amount: number): LuminanceEnvelope {
  return gradientEnvelope([base, mixHex(base, toward, amount)]);
}

/** A margin tone that reads as a band next to the background: darker on light colors, lighter on dark. */
export function matShade(color: string): Hex {
  return luminanceOfRgb(parseHex(color)) > 0.35
    ? mixHex(color, '#000000', 0.14)
    : mixHex(color, '#ffffff', 0.16);
}
