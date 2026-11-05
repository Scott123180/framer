import { describe, expect, it } from 'vitest';
import { MSG } from '@shared/ipc/messages';
import { initialSessionState, selectSelectedOptions, sessionReducer } from './session-reducer';
import type { SessionAction } from './actions';
import type { SessionState } from './session-reducer';
import { makeOptions } from '../test/specs';

const run = (actions: SessionAction[], from: SessionState = initialSessionState) =>
  actions.reduce(sessionReducer, from);
const ready = (shortfall: 'glyphs' | 'fit' | null = null): SessionAction => ({
  type: 'OPTIONS_READY',
  quoteKey: 'k',
  options: makeOptions(4),
  shortfall,
  exhausted: false,
});
const combos = (s: SessionState) => s.optionSet?.options.map((o) => o.spec.style.comboKey);

describe('print settings', () => {
  it('updates the session print settings', () => {
    const s = run([{ type: 'PRINT_SETTINGS_CHANGED', print: { size: '8x10', orientation: 'landscape' } }]);
    expect(s.print).toEqual({ size: '8x10', orientation: 'landscape', margin: { enabled: false } });
  });

  it('keeps every style, in order, and updates each spec (FR-015)', () => {
    const before = run([ready(), { type: 'OPTION_TOGGLED', id: 'opt-2' }]);
    const after = run([{ type: 'PRINT_SETTINGS_CHANGED', print: { size: '5x7' } }], before);
    expect(combos(after)).toEqual(combos(before));
    expect(after.optionSet?.options.every((o) => o.spec.print.size === '5x7')).toBe(true);
    expect(after.optionSet?.status).toBe('fresh');
    expect(selectSelectedOptions(after).map((o) => o.id)).toEqual(['opt-2']);
  });

  it('defaults the margin size to medium when it is turned on', () => {
    const s = run([{ type: 'PRINT_SETTINGS_CHANGED', print: { margin: { enabled: true } } }]);
    expect(s.print.margin).toEqual({ enabled: true, size: 'medium' });
    const large = run([
      { type: 'PRINT_SETTINGS_CHANGED', print: { margin: { enabled: true, size: 'large' } } },
    ]);
    expect(large.print.margin).toEqual({ enabled: true, size: 'large' });
  });

  it('drops options that no longer fit and explains why', () => {
    const s = run([ready(), { type: 'OPTIONS_RELAID', keptIds: ['opt-1', 'opt-3'] }]);
    expect(s.optionSet?.options.map((o) => o.id)).toEqual(['opt-1', 'opt-3']);
    expect(s.optionSet?.shortfall).toBe('fit');
    expect(MSG.shortfallFit(2)).toBe(
      "Some designs couldn't fit this quote at this size, so showing 2 designs.",
    );
  });

  it('keeps a glyph shortfall and does nothing when everything fits', () => {
    expect(run([ready('glyphs'), { type: 'OPTIONS_RELAID', keptIds: ['opt-1'] }]).optionSet?.shortfall).toBe(
      'glyphs',
    );
    expect(
      run([ready(), { type: 'OPTIONS_RELAID', keptIds: ['opt-1', 'opt-2', 'opt-3', 'opt-4'] }]).optionSet
        ?.shortfall,
    ).toBeNull();
  });

  it('clears the set and alerts when nothing fits', () => {
    const s = run([ready(), { type: 'OPTIONS_RELAID', keptIds: [] }]);
    expect(s.optionSet).toBeNull();
    expect(s.alert).toEqual({ kind: 'NO_OPTIONS', message: MSG.noOptions });
  });
});
