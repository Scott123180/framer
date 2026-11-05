import type { Quote } from '@shared/domain';
import { err, ok, type Result } from '@shared/ipc/result';
import type { JsonLibraryStore } from './json-library-store';

export interface QuoteRepository {
  /** Adds the quote, or — if one with the same dedupeKey exists — bumps that one's lastUsedAt. */
  upsert(candidate: Quote): Promise<Quote>;
  list(): Promise<Quote[]>;
  get(id: string): Promise<Quote | undefined>;
  delete(id: string): Promise<Result<void>>;
}

const newestFirst = (a: Quote, b: Quote) => b.lastUsedAt.localeCompare(a.lastUsedAt);
const NOT_FOUND = { code: 'NOT_FOUND', message: 'That quote is no longer in your history.' } as const;

function upsertInto(quotes: readonly Quote[], candidate: Quote): { quotes: Quote[]; saved: Quote } {
  const existing = quotes.find((q) => q.dedupeKey === candidate.dedupeKey);
  if (!existing) return { quotes: [...quotes, candidate], saved: candidate };
  const saved = { ...existing, lastUsedAt: candidate.lastUsedAt };
  return { quotes: quotes.map((q) => (q.id === existing.id ? saved : q)), saved };
}

export class JsonQuoteRepository implements QuoteRepository {
  constructor(private readonly store: JsonLibraryStore) {}

  async upsert(candidate: Quote): Promise<Quote> {
    let saved = candidate;
    await this.store.update((lib) => {
      const next = upsertInto(lib.quotes, candidate);
      saved = next.saved;
      return { ...lib, quotes: next.quotes };
    });
    return saved;
  }

  async list(): Promise<Quote[]> {
    return [...this.store.read().quotes].sort(newestFirst);
  }

  async get(id: string): Promise<Quote | undefined> {
    return this.store.read().quotes.find((q) => q.id === id);
  }

  async delete(id: string): Promise<Result<void>> {
    if (!this.store.read().quotes.some((q) => q.id === id)) return err(NOT_FOUND);
    await this.store.update((lib) => ({ ...lib, quotes: lib.quotes.filter((q) => q.id !== id) }));
    return ok(undefined);
  }
}

export class InMemoryQuoteRepository implements QuoteRepository {
  private quotes: Quote[] = [];

  async upsert(candidate: Quote): Promise<Quote> {
    const next = upsertInto(this.quotes, candidate);
    this.quotes = next.quotes;
    return next.saved;
  }

  async list(): Promise<Quote[]> {
    return [...this.quotes].sort(newestFirst);
  }

  async get(id: string): Promise<Quote | undefined> {
    return this.quotes.find((q) => q.id === id);
  }

  async delete(id: string): Promise<Result<void>> {
    if (!this.quotes.some((q) => q.id === id)) return err(NOT_FOUND);
    this.quotes = this.quotes.filter((q) => q.id !== id);
    return ok(undefined);
  }
}
