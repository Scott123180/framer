import { describe, expect, it } from 'vitest';
import { DEFAULT_PRINT_SETTINGS, PRINT_PPI, marginWidthPx, paddingPx, pixelSize } from './print';
import type { PrintSettings } from './print.schema';

const sizes = ['4x6', '5x7', '8x10'] as const;
const orientations = ['portrait', 'landscape'] as const;
const margins = [
  { enabled: false },
  { enabled: true, size: 'small' },
  { enabled: true, size: 'medium' },
  { enabled: true, size: 'large' },
] as const;

describe('print math', () => {
  it('uses 300 PPI', () => expect(PRINT_PPI).toBe(300));

  it.each([
    ['4x6', 'portrait', 1200, 1800],
    ['4x6', 'landscape', 1800, 1200],
    ['5x7', 'portrait', 1500, 2100],
    ['5x7', 'landscape', 2100, 1500],
    ['8x10', 'portrait', 2400, 3000],
    ['8x10', 'landscape', 3000, 2400],
  ] as const)('pixelSize(%s, %s) = %i×%i', (size, orientation, width, height) => {
    const px = pixelSize({ size, orientation, margin: { enabled: false } });
    expect(px).toEqual({ width, height });
    expect(Number.isInteger(px.width) && Number.isInteger(px.height)).toBe(true);
  });

  it('has the expected defaults', () => {
    expect(DEFAULT_PRINT_SETTINGS).toEqual({
      size: '4x6',
      orientation: 'portrait',
      margin: { enabled: false },
    });
  });

  it('computes margin width from the short side', () => {
    const base = { size: '4x6', orientation: 'portrait' } as const;
    expect(marginWidthPx({ ...base, margin: { enabled: false } })).toBe(0);
    expect(marginWidthPx({ ...base, margin: { enabled: true, size: 'small' } })).toBe(75);
    expect(marginWidthPx({ ...base, margin: { enabled: true, size: 'medium' } })).toBe(150);
    expect(marginWidthPx({ ...base, margin: { enabled: true, size: 'large' } })).toBe(225);
  });

  it('computes padding as max(0.25 in, 6% of the short side)', () => {
    expect(paddingPx({ size: '4x6', orientation: 'portrait', margin: { enabled: false } })).toBe(75);
    expect(paddingPx({ size: '8x10', orientation: 'landscape', margin: { enabled: false } })).toBeCloseTo(
      144,
    );
  });

  it('keeps every inset at least 0.125 in (FR-014)', () => {
    for (const size of sizes)
      for (const orientation of orientations)
        for (const margin of margins) {
          const p: PrintSettings = { size, orientation, margin };
          expect(marginWidthPx(p) + paddingPx(p)).toBeGreaterThanOrEqual(37.5);
        }
  });
});
