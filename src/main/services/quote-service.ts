import type { Quote } from '@shared/domain';
import { dedupeKey, validateQuoteInput } from '@shared/domain/quote';
import { MSG } from '@shared/ipc/messages';
import { err, ok, type Result } from '@shared/ipc/result';
import type { Clock } from '../platform/clock';
import type { IdSource } from '../platform/ids';
import type { DesignRepository } from '../persistence/design-repository';
import type { QuoteRepository } from '../persistence/quote-repository';

const MESSAGE = {
  QUOTE_EMPTY: MSG.quoteEmpty,
  QUOTE_TOO_LONG: MSG.quoteTooLong,
  AUTHOR_TOO_LONG: MSG.authorTooLong,
};

/** Previous quotes: recorded each time designs are generated, deduplicated, newest first (FR-020). */
export class QuoteService {
  constructor(
    private readonly deps: {
      quotes: QuoteRepository;
      designs: Pick<DesignRepository, 'clearQuoteId'>;
      clock: Clock;
      ids: IdSource;
    },
  ) {}

  async touch(input: { text: string; author: string | null }): Promise<Result<Quote>> {
    const valid = validateQuoteInput(input);
    if (!valid.ok) {
      return err({ code: 'VALIDATION', field: valid.field ?? 'text', message: MESSAGE[valid.code] });
    }
    const { text, author } = valid.value;
    const now = this.deps.clock.now().toISOString();
    return ok(
      await this.deps.quotes.upsert({
        id: this.deps.ids.next(),
        text,
        author,
        dedupeKey: dedupeKey(text, author),
        createdAt: now,
        lastUsedAt: now,
      }),
    );
  }

  async list(): Promise<Result<Quote[]>> {
    return ok(await this.deps.quotes.list());
  }

  async delete(id: string): Promise<Result<void>> {
    const res = await this.deps.quotes.delete(id);
    if (res.ok) await this.deps.designs.clearQuoteId(id);
    return res;
  }
}
