export const MAX_QUOTE_GRAPHEMES = 500;
export const MAX_AUTHOR_CHARS = 120;

export type QuoteInput = { text: string; author: string | null };
export type QuoteValidationCode = 'QUOTE_EMPTY' | 'QUOTE_TOO_LONG' | 'AUTHOR_TOO_LONG';
type QuoteValidation =
  { ok: true; value: QuoteInput } | { ok: false; code: QuoteValidationCode; field?: 'text' | 'author' };

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/** Counts characters the way a person sees them (grapheme clusters). */
export function countGraphemes(text: string): number {
  let n = 0;
  for (const _ of segmenter.segment(text)) n++;
  return n;
}

export function normalizeQuoteInput(input: QuoteInput): QuoteInput {
  const text = input.text.normalize('NFC').trim();
  const author = (input.author ?? '').normalize('NFC').trim();
  return { text, author: author === '' ? null : author };
}

export function validateQuoteInput(input: QuoteInput): QuoteValidation {
  const value = normalizeQuoteInput(input);
  if (value.text === '') return { ok: false, code: 'QUOTE_EMPTY' };
  if (countGraphemes(value.text) > MAX_QUOTE_GRAPHEMES) return { ok: false, code: 'QUOTE_TOO_LONG' };
  if (value.author !== null && countGraphemes(value.author) > MAX_AUTHOR_CHARS) {
    return { ok: false, code: 'AUTHOR_TOO_LONG', field: 'author' };
  }
  return { ok: true, value };
}

export function dedupeKey(text: string, author: string | null): string {
  const collapse = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  return `${collapse(text)}\u0000${collapse(author ?? '')}`;
}
