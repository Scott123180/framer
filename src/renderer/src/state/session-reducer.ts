import type { DesignSpec, PrintSettings } from '@shared/domain';
import { DEFAULT_PRINT_SETTINGS } from '@shared/domain/print';
import type { QuoteValidationCode } from '@shared/domain/quote';
import { MSG } from '@shared/ipc/messages';
import type { SessionAction, Shortfall } from './actions';

export type DesignOption = { id: string; spec: DesignSpec; selected: boolean };

export type OptionSet = {
  quoteKey: string;
  options: DesignOption[];
  status: 'fresh' | 'stale';
  exhausted: boolean;
  shortfall: Shortfall;
  /** Every combination shown for this quote in this session (FR-009). */
  seenComboKeys: ReadonlySet<string>;
};

export type SessionAlert = { kind: QuoteValidationCode | 'NO_OPTIONS'; message: string };

export type SaveState =
  | { phase: 'idle' }
  | { phase: 'saving' }
  | { phase: 'saved'; count: number; folder: string; lastPath: string }
  | { phase: 'failed'; message: string };

export type SessionState = {
  quote: { text: string; author: string };
  print: PrintSettings;
  phase: 'idle' | 'generating';
  optionSet: OptionSet | null;
  alert: SessionAlert | null;
  save: SaveState;
  /** The library id of the current quote, once it has been recorded. */
  quoteId: string | null;
};

export const initialSessionState: SessionState = {
  quote: { text: '', author: '' },
  print: DEFAULT_PRINT_SETTINGS,
  phase: 'idle',
  optionSet: null,
  alert: null,
  save: { phase: 'idle' },
  quoteId: null,
};

const VALIDATION_MESSAGE: Record<QuoteValidationCode, string> = {
  QUOTE_EMPTY: MSG.quoteEmpty,
  QUOTE_TOO_LONG: MSG.quoteTooLong,
  AUTHOR_TOO_LONG: MSG.authorTooLong,
};

function mapOptions(state: SessionState, fn: (o: DesignOption) => DesignOption): SessionState {
  if (!state.optionSet) return state;
  return { ...state, optionSet: { ...state.optionSet, options: state.optionSet.options.map(fn) } };
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'QUOTE_CHANGED': {
      const quote = { text: action.text ?? state.quote.text, author: action.author ?? state.quote.author };
      const optionSet = state.optionSet ? { ...state.optionSet, status: 'stale' as const } : null;
      return { ...state, quote, optionSet, quoteId: null };
    }
    case 'QUOTE_LOADED':
      return sessionReducer(state, { type: 'QUOTE_CHANGED', text: action.text, author: action.author ?? '' });
    case 'QUOTE_TOUCHED':
      return { ...state, quoteId: action.quoteId };
    case 'GENERATE_REQUESTED':
      return { ...state, phase: 'generating', alert: null, save: { phase: 'idle' } };
    case 'GENERATE_REJECTED':
      return {
        ...state,
        phase: 'idle',
        alert: { kind: action.code, message: VALIDATION_MESSAGE[action.code] },
      };
    case 'OPTIONS_READY': {
      if (action.options.length === 0) {
        return {
          ...state,
          phase: 'idle',
          optionSet: null,
          alert: { kind: 'NO_OPTIONS', message: MSG.noOptions },
        };
      }
      const sameQuote = state.optionSet?.quoteKey === action.quoteKey;
      const seen = new Set(sameQuote ? state.optionSet?.seenComboKeys : []);
      for (const o of action.options) seen.add(o.spec.style.comboKey);
      return {
        ...state,
        phase: 'idle',
        alert: null,
        optionSet: {
          quoteKey: action.quoteKey,
          options: action.options.map((o) => ({ ...o, selected: false })),
          status: 'fresh',
          exhausted: action.exhausted,
          shortfall: action.shortfall,
          seenComboKeys: seen,
        },
      };
    }
    case 'OPTION_TOGGLED':
      return mapOptions(state, (o) => (o.id === action.id ? { ...o, selected: !o.selected } : o));
    case 'PRINT_SETTINGS_CHANGED': {
      const { size, orientation, margin } = action.print;
      const print: PrintSettings = {
        size: size ?? state.print.size,
        orientation: orientation ?? state.print.orientation,
        margin: !margin
          ? state.print.margin
          : margin.enabled
            ? { enabled: true, size: margin.size ?? 'medium' }
            : { enabled: false },
      };
      return mapOptions({ ...state, print }, (o) => ({ ...o, spec: { ...o.spec, print } }));
    }
    case 'OPTIONS_RELAID': {
      if (!state.optionSet) return state;
      const kept = new Set(action.keptIds);
      const options = state.optionSet.options.filter((o) => kept.has(o.id));
      if (options.length === 0) {
        return { ...state, optionSet: null, alert: { kind: 'NO_OPTIONS', message: MSG.noOptions } };
      }
      const dropped = options.length < state.optionSet.options.length;
      const shortfall = dropped && state.optionSet.shortfall !== 'glyphs' ? 'fit' : state.optionSet.shortfall;
      return { ...state, optionSet: { ...state.optionSet, options, shortfall } };
    }
    case 'SAVE_STARTED':
      return { ...state, save: { phase: 'saving' } };
    case 'SAVE_SUCCEEDED':
      return mapOptions(
        {
          ...state,
          save: { phase: 'saved', count: action.count, folder: action.folder, lastPath: action.lastPath },
        },
        (o) => ({ ...o, selected: false }),
      );
    case 'SAVE_FAILED':
      return { ...state, save: { phase: 'failed', message: action.message } };
  }
}

export function selectSelectedOptions(state: SessionState): DesignOption[] {
  return state.optionSet?.options.filter((o) => o.selected) ?? [];
}

export function selectCanSave(state: SessionState): boolean {
  return (
    state.optionSet?.status === 'fresh' &&
    state.save.phase !== 'saving' &&
    selectSelectedOptions(state).length > 0
  );
}

/** The primary action's label: "Regenerate designs" once options exist. */
export function selectGenerateLabel(state: SessionState): 'Generate designs' | 'Regenerate designs' {
  return state.optionSet ? 'Regenerate designs' : 'Generate designs';
}

/** Combinations already shown for `quoteKey`, so a regenerate never repeats them (FR-009). */
export function selectExcludedCombos(state: SessionState, quoteKey: string): ReadonlySet<string> {
  return state.optionSet?.quoteKey === quoteKey ? state.optionSet.seenComboKeys : new Set();
}
