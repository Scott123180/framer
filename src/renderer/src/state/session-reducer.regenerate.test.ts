import { describe, expect, it } from 'vitest';
import {
  initialSessionState,
  selectGenerateLabel,
  selectSelectedOptions,
  sessionReducer,
} from './session-reducer';
import type { SessionAction } from './actions';
import type { SessionState } from './session-reducer';
import { makeOptions, makeSpec } from '../test/specs';

const run = (actions: SessionAction[], from: SessionState = initialSessionState) =>
  actions.reduce(sessionReducer, from);

const ready = (quoteKey: string, from: number, exhausted = false): SessionAction => ({
  type: 'OPTIONS_READY',
  quoteKey,
  options: Array.from({ length: 3 }, (_, i) => ({ id: `${quoteKey}-${from + i}`, spec: makeSpec(from + i) })),
  shortfall: null,
  exhausted,
});

const keys = (s: SessionState) => [...(s.optionSet?.seenComboKeys ?? [])].sort();

describe('regenerate', () => {
  it('accumulates seen combinations for the same quote', () => {
    const s = run([ready('a', 1), ready('a', 4)]);
    expect(keys(s)).toEqual([
      'font-1|bg-1',
      'font-2|bg-2',
      'font-3|bg-3',
      'font-4|bg-4',
      'font-5|bg-5',
      'font-6|bg-6',
    ]);
  });

  it('starts over for a different quote', () => {
    const s = run([ready('a', 1), ready('b', 7)]);
    expect(keys(s)).toEqual(['font-7|bg-7', 'font-8|bg-8', 'font-9|bg-9']);
  });

  it('stores exhaustion', () => {
    expect(run([ready('a', 1, true)]).optionSet?.exhausted).toBe(true);
  });

  it('clears the selection and freshens a stale set', () => {
    const selected = run([
      ready('a', 1),
      { type: 'OPTION_TOGGLED', id: 'a-1' },
      { type: 'QUOTE_CHANGED', text: 'x' },
    ]);
    expect(selected.optionSet?.status).toBe('stale');
    const again = run([{ type: 'GENERATE_REQUESTED' }, ready('a', 4)], selected);
    expect(again.optionSet?.status).toBe('fresh');
    expect(selectSelectedOptions(again)).toEqual([]);
  });

  it('labels the primary action Generate, then Regenerate', () => {
    expect(selectGenerateLabel(initialSessionState)).toBe('Generate designs');
    expect(selectGenerateLabel(run([ready('a', 1)]))).toBe('Regenerate designs');
    expect(
      selectGenerateLabel(
        run([
          {
            type: 'OPTIONS_READY',
            quoteKey: 'a',
            options: makeOptions(0),
            shortfall: null,
            exhausted: false,
          },
        ]),
      ),
    ).toBe('Generate designs');
  });
});
