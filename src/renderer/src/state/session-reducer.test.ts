import { describe, expect, it } from 'vitest';
import { DEFAULT_PRINT_SETTINGS } from '@shared/domain/print';
import { MSG } from '@shared/ipc/messages';
import { initialSessionState, selectCanSave, selectSelectedOptions, sessionReducer } from './session-reducer';
import type { SessionAction } from './actions';
import type { SessionState } from './session-reducer';
import { makeOptions } from '../test/specs';

const run = (actions: SessionAction[], from: SessionState = initialSessionState) =>
  actions.reduce(sessionReducer, from);

const ready = (
  count = 12,
  extra: Partial<Extract<SessionAction, { type: 'OPTIONS_READY' }>> = {},
): SessionAction => ({
  type: 'OPTIONS_READY',
  quoteKey: 'hello\u0000',
  options: makeOptions(count),
  shortfall: null,
  exhausted: false,
  ...extra,
});

const generated = () =>
  run([{ type: 'QUOTE_CHANGED', text: 'Hello' }, { type: 'GENERATE_REQUESTED' }, ready()]);

describe('sessionReducer', () => {
  it('starts empty with default print settings', () => {
    expect(initialSessionState).toMatchObject({
      quote: { text: '', author: '' },
      print: DEFAULT_PRINT_SETTINGS,
      optionSet: null,
      phase: 'idle',
      alert: null,
    });
  });

  it('updates the quote text and author', () => {
    const s = run([
      { type: 'QUOTE_CHANGED', text: 'Hi' },
      { type: 'QUOTE_CHANGED', author: 'Me' },
    ]);
    expect(s.quote).toEqual({ text: 'Hi', author: 'Me' });
  });

  it('enters the generating phase and clears old alerts', () => {
    const s = run([{ type: 'GENERATE_REJECTED', code: 'QUOTE_EMPTY' }, { type: 'GENERATE_REQUESTED' }]);
    expect(s.phase).toBe('generating');
    expect(s.alert).toBeNull();
  });

  it('stores a fresh option set with nothing selected', () => {
    const s = generated();
    expect(s.phase).toBe('idle');
    expect(s.optionSet?.status).toBe('fresh');
    expect(s.optionSet?.quoteKey).toBe('hello\u0000');
    expect(s.optionSet?.options).toHaveLength(12);
    expect(s.optionSet?.options.every((o) => !o.selected)).toBe(true);
    expect(s.optionSet?.shortfall).toBeNull();
  });

  it('toggles one option', () => {
    const s = run([{ type: 'OPTION_TOGGLED', id: 'opt-2' }], generated());
    expect(selectSelectedOptions(s).map((o) => o.id)).toEqual(['opt-2']);
    expect(run([{ type: 'OPTION_TOGGLED', id: 'opt-2' }], s).optionSet?.options.some((o) => o.selected)).toBe(
      false,
    );
  });

  it('marks options stale when the quote changes', () => {
    const s = run([{ type: 'QUOTE_CHANGED', text: 'Hello!' }], generated());
    expect(s.optionSet?.status).toBe('stale');
    expect(run([{ type: 'QUOTE_CHANGED', author: 'X' }], generated()).optionSet?.status).toBe('stale');
  });

  it('can save only with a fresh selection', () => {
    const g = generated();
    expect(selectCanSave(g)).toBe(false);
    const selected = run([{ type: 'OPTION_TOGGLED', id: 'opt-1' }], g);
    expect(selectCanSave(selected)).toBe(true);
    expect(selectCanSave(run([{ type: 'QUOTE_CHANGED', text: 'x' }], selected))).toBe(false);
    expect(selectCanSave(run([{ type: 'SAVE_STARTED' }], selected))).toBe(false);
    expect(selectCanSave(initialSessionState)).toBe(false);
  });

  it('tracks saving, success (clearing the selection), and failure (keeping it)', () => {
    const selected = run(
      [
        { type: 'OPTION_TOGGLED', id: 'opt-1' },
        { type: 'OPTION_TOGGLED', id: 'opt-3' },
      ],
      generated(),
    );
    const saving = run([{ type: 'SAVE_STARTED' }], selected);
    expect(saving.save.phase).toBe('saving');

    const ok = run(
      [{ type: 'SAVE_SUCCEEDED', count: 2, folder: '/export', lastPath: '/export/b.jpg' }],
      saving,
    );
    expect(ok.save).toEqual({ phase: 'saved', count: 2, folder: '/export', lastPath: '/export/b.jpg' });
    expect(selectSelectedOptions(ok)).toEqual([]);

    const failed = run([{ type: 'SAVE_FAILED', message: MSG.saveFailed('the disk is full') }], saving);
    expect(failed.save).toEqual({ phase: 'failed', message: MSG.saveFailed('the disk is full') });
    expect(selectSelectedOptions(failed).map((o) => o.id)).toEqual(['opt-1', 'opt-3']);
  });

  it.each([
    ['QUOTE_EMPTY', MSG.quoteEmpty],
    ['QUOTE_TOO_LONG', MSG.quoteTooLong],
    ['AUTHOR_TOO_LONG', MSG.authorTooLong],
  ] as const)('stores the %s alert', (code, message) => {
    const s = run([{ type: 'GENERATE_REQUESTED' }, { type: 'GENERATE_REJECTED', code }]);
    expect(s.alert).toEqual({ kind: code, message });
    expect(s.phase).toBe('idle');
  });

  it('stores the shortfall reason', () => {
    expect(run([ready(5, { shortfall: 'glyphs' })]).optionSet?.shortfall).toBe('glyphs');
    expect(run([ready(7, { shortfall: 'fit' })]).optionSet?.shortfall).toBe('fit');
  });

  it('shows the no-options alert and no option set when nothing can show the quote', () => {
    const s = run([{ type: 'GENERATE_REQUESTED' }, ready(0, { shortfall: 'glyphs' })], generated());
    expect(s.optionSet).toBeNull();
    expect(s.alert).toEqual({ kind: 'NO_OPTIONS', message: MSG.noOptions });
  });
});
