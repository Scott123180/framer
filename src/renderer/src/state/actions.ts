import type { DesignSpec, MarginSize, Orientation, PrintSize } from '@shared/domain';
import type { QuoteValidationCode } from '@shared/domain/quote';

export type Shortfall = 'glyphs' | 'fit' | null;

export type SessionAction =
  | { type: 'QUOTE_CHANGED'; text?: string; author?: string }
  | { type: 'GENERATE_REQUESTED' }
  | { type: 'GENERATE_REJECTED'; code: QuoteValidationCode }
  | {
      type: 'OPTIONS_READY';
      quoteKey: string;
      options: Array<{ id: string; spec: DesignSpec }>;
      shortfall: Shortfall;
      exhausted: boolean;
    }
  | { type: 'OPTION_TOGGLED'; id: string }
  | {
      type: 'PRINT_SETTINGS_CHANGED';
      print: {
        size?: PrintSize;
        orientation?: Orientation;
        margin?: { enabled: boolean; size?: MarginSize };
      };
    }
  | { type: 'OPTIONS_RELAID'; keptIds: string[] }
  | { type: 'QUOTE_LOADED'; text: string; author: string | null }
  | { type: 'QUOTE_TOUCHED'; quoteId: string }
  | { type: 'SAVE_STARTED' }
  | { type: 'SAVE_SUCCEEDED'; count: number; folder: string; lastPath: string }
  | { type: 'SAVE_FAILED'; message: string };
