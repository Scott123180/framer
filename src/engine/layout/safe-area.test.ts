import { describe, expect, it } from 'vitest';
import { computeSafeArea } from './safe-area';
import type { PrintSettings } from '@shared/domain';

describe('computeSafeArea', () => {
  it('insets 4x6 portrait by 75 px with margin off', () => {
    expect(computeSafeArea({ size: '4x6', orientation: 'portrait', margin: { enabled: false } })).toEqual({
      x: 75,
      y: 75,
      width: 1050,
      height: 1650,
    });
  });

  it('adds the margin band to the padding', () => {
    const area = computeSafeArea({
      size: '4x6',
      orientation: 'portrait',
      margin: { enabled: true, size: 'medium' },
    });
    expect(area).toEqual({ x: 225, y: 225, width: 1200 - 450, height: 1800 - 450 });
  });

  it('insets 8x10 landscape by 144 px with margin off', () => {
    const area = computeSafeArea({ size: '8x10', orientation: 'landscape', margin: { enabled: false } });
    expect(area.x).toBeCloseTo(144);
    expect(area.y).toBeCloseTo(144);
    expect(area.width).toBeCloseTo(3000 - 288);
    expect(area.height).toBeCloseTo(2400 - 288);
  });

  it('keeps every inset at least 37.5 px (FR-014)', () => {
    for (const size of ['4x6', '5x7', '8x10'] as const)
      for (const orientation of ['portrait', 'landscape'] as const)
        for (const margin of [
          { enabled: false },
          { enabled: true, size: 'small' },
          { enabled: true, size: 'medium' },
          { enabled: true, size: 'large' },
        ] as const) {
          const print: PrintSettings = { size, orientation, margin };
          const a = computeSafeArea(print);
          expect(a.x).toBeGreaterThanOrEqual(37.5);
          expect(a.y).toBeGreaterThanOrEqual(37.5);
        }
  });
});
