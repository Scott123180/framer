import type { MarginSize, PrintSettings, PrintSize } from './print.schema';

export const PRINT_PPI = 300;

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  size: '4x6',
  orientation: 'portrait',
  margin: { enabled: false },
};

/** Short × long side of each print, in inches. */
const INCHES: Record<PrintSize, { short: number; long: number }> = {
  '4x6': { short: 4, long: 6 },
  '5x7': { short: 5, long: 7 },
  '8x10': { short: 8, long: 10 },
};

/** Margin width as a fraction of the print's short side (research R15). */
export const MARGIN_FRACTIONS: Record<MarginSize, number> = { small: 1 / 16, medium: 1 / 8, large: 3 / 16 };

const MIN_PADDING_IN = 0.25;
const PADDING_FRACTION = 0.06;

export function pixelSize(print: PrintSettings): { width: number; height: number } {
  const { short, long } = INCHES[print.size];
  const s = short * PRINT_PPI;
  const l = long * PRINT_PPI;
  return print.orientation === 'portrait' ? { width: s, height: l } : { width: l, height: s };
}

export function shortSidePx(print: PrintSettings): number {
  return INCHES[print.size].short * PRINT_PPI;
}

export function marginWidthPx(print: PrintSettings): number {
  if (!print.margin.enabled) return 0;
  return shortSidePx(print) * MARGIN_FRACTIONS[print.margin.size];
}

export function paddingPx(print: PrintSettings): number {
  const shortIn = INCHES[print.size].short;
  return Math.max(MIN_PADDING_IN, PADDING_FRACTION * shortIn) * PRINT_PPI;
}
