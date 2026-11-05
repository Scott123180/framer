import { describe, expect, it } from 'vitest';
import type { DrawPlan, TextLayoutEngine } from '@engine/layout/types';
import { relayoutOptions } from './relayout-options';
import { makeOptions } from '../../test/specs';

describe('relayoutOptions', () => {
  it('keeps the options whose layout still fits, in order', () => {
    const layout: TextLayoutEngine = {
      layout: (spec) => (spec.style.fontId === 'font-2' ? null : ({} as DrawPlan)),
    };
    const measurer = { width: () => 0, metrics: () => ({ ascent: 0, descent: 0 }) };
    expect(relayoutOptions(makeOptions(3), { layout, measurer })).toEqual(['opt-1', 'opt-3']);
  });
});
