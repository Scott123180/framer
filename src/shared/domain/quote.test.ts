import { describe, expect, it } from 'vitest';
import { countGraphemes, dedupeKey, normalizeQuoteInput, validateQuoteInput } from './quote';

describe('normalizeQuoteInput', () => {
  it('NFC-normalizes and trims, keeping internal line breaks', () => {
    const out = normalizeQuoteInput({ text: '  Café\nline two  ', author: '  Me  ' });
    expect(out.text).toBe('Café\nline two');
    expect(out.author).toBe('Me');
  });
  it('turns an empty author into null', () => {
    expect(normalizeQuoteInput({ text: 'x', author: '   ' }).author).toBeNull();
    expect(normalizeQuoteInput({ text: 'x', author: null }).author).toBeNull();
  });
});

describe('countGraphemes', () => {
  it('counts what the user sees', () => {
    expect(countGraphemes('👍🏽')).toBe(1);
    expect(countGraphemes('é')).toBe(1);
    expect(countGraphemes('abc')).toBe(3);
  });
});

describe('validateQuoteInput', () => {
  it('accepts exactly 500 graphemes', () => {
    const r = validateQuoteInput({ text: '👍🏽'.repeat(500), author: null });
    expect(r.ok).toBe(true);
  });
  it('rejects 501 graphemes', () => {
    const r = validateQuoteInput({ text: 'a'.repeat(501), author: null });
    expect(r).toEqual({ ok: false, code: 'QUOTE_TOO_LONG' });
  });
  it.each(['', '   ', '\n\n', ' \n \t '])('rejects empty or whitespace %j', (text) => {
    expect(validateQuoteInput({ text, author: null })).toEqual({ ok: false, code: 'QUOTE_EMPTY' });
  });
  it('rejects an author over 120 characters with field author', () => {
    const r = validateQuoteInput({ text: 'hi', author: 'x'.repeat(121) });
    expect(r).toMatchObject({ ok: false, code: 'AUTHOR_TOO_LONG', field: 'author' });
    expect(validateQuoteInput({ text: 'hi', author: 'x'.repeat(120) }).ok).toBe(true);
  });
  it('returns the normalized value on success', () => {
    const r = validateQuoteInput({ text: '  hi  ', author: '' });
    expect(r).toEqual({ ok: true, value: { text: 'hi', author: null } });
  });
});

describe('dedupeKey', () => {
  it('ignores case and repeated spaces', () => {
    expect(dedupeKey('Be  The change', 'Gandhi')).toBe(dedupeKey('be the change', 'gandhi'));
    expect(dedupeKey('Be the change', 'Gandhi')).toBe('be the change\u0000gandhi');
  });
  it('treats a null author as empty', () => {
    expect(dedupeKey('Hi', null)).toBe('hi\u0000');
  });
});
