import { CHANNELS } from '@shared/ipc/channels';
import { IdPayload, TouchQuoteInput } from '@shared/ipc/payloads';
import type { QuoteService } from '../services/quote-service';
import type { Registrar } from './register';

export function registerQuoteHandlers(
  register: Registrar,
  deps: { quotes: Pick<QuoteService, 'touch' | 'list' | 'delete'> },
): void {
  const { quotes } = deps;
  register(CHANNELS.quotesTouch, TouchQuoteInput, (input) => quotes.touch(input));
  register(CHANNELS.quotesList, null, () => quotes.list());
  register(CHANNELS.quotesDelete, IdPayload, ({ id }) => quotes.delete(id));
}
