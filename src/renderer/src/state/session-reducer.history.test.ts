import { describe, expect, it } from 'vitest';
import { initialSessionState, sessionReducer } from './session-reducer';
import type { SessionAction } from './actions';
import type { SessionState } from './session-reducer';
import { makeOptions } from '../test/specs';

const run = (actions: SessionAction[], from: SessionState = initialSessionState) =>
  actions.reduce(sessionReducer, from);
const ready: SessionAction = {
  type: 'OPTIONS_READY',
  quoteKey: 'k',
  options: makeOptions(2),
  shortfall: null,
  exhausted: false,
};

describe('history in the session', () => {
  it('loads a previous quote and marks existing options stale', () => {
    const s = run([ready, { type: 'QUOTE_LOADED', text: 'Old quote', author: null }]);
    expect(s.quote).toEqual({ text: 'Old quote', author: '' });
    expect(s.optionSet?.status).toBe('stale');
    expect(run([{ type: 'QUOTE_LOADED', text: 'A', author: 'B' }]).quote).toEqual({ text: 'A', author: 'B' });
  });

  it('remembers the recorded quote id for saving', () => {
    const s = run([{ type: 'QUOTE_TOUCHED', quoteId: 'q1' }]);
    expect(s.quoteId).toBe('q1');
  });

  it('forgets the quote id when the text is edited or another quote is loaded', () => {
    expect(
      run([
        { type: 'QUOTE_TOUCHED', quoteId: 'q1' },
        { type: 'QUOTE_CHANGED', text: 'new' },
      ]).quoteId,
    ).toBeNull();
    expect(
      run([
        { type: 'QUOTE_TOUCHED', quoteId: 'q1' },
        { type: 'QUOTE_CHANGED', author: 'x' },
      ]).quoteId,
    ).toBeNull();
    expect(
      run([
        { type: 'QUOTE_TOUCHED', quoteId: 'q1' },
        { type: 'QUOTE_LOADED', text: 'a', author: null },
      ]).quoteId,
    ).toBeNull();
  });
});
