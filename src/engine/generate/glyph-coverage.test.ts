import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FontkitGlyphCoverage, isEmojiCodePoint, requiredCodePoints } from './glyph-coverage';
import { GREEK, UNICODE } from '../../../tests/fixtures/quotes';

const fontBytes = (file: string) => {
  const b = readFileSync(resolve(import.meta.dirname, '../../../assets/fonts', file));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};

const cps = (s: string) => new Set([...s].map((c) => c.codePointAt(0)!));

describe('requiredCodePoints', () => {
  it('collects text and author code points, dropping emoji and whitespace', () => {
    const set = requiredCodePoints('Hi 👍🏽\n❤️ ok', 'Zoë');
    expect(set).toEqual(cps('Hiok—Zoë'));
  });
  it('adds the attribution dash only when there is an author', () => {
    expect(requiredCodePoints('a', null)).toEqual(cps('a'));
  });
  it('drops ZWJ sequences and variation selectors', () => {
    expect(requiredCodePoints('👩‍👩‍👧 ☺️', null)).toEqual(new Set());
  });
});

describe('isEmojiCodePoint', () => {
  it('recognizes pictographs, modifiers, ZWJ, and VS16', () => {
    for (const cp of [0x1f33b, 0x1f3fd, 0x200d, 0xfe0f, 0x2764]) expect(isEmojiCodePoint(cp)).toBe(true);
    for (const cp of [0x41, 0xe9, 0x2014, 0x201c]) expect(isEmojiCodePoint(cp)).toBe(false);
  });
});

describe('FontkitGlyphCoverage', () => {
  const coverage = FontkitGlyphCoverage.fromFonts([
    { id: 'lora-500', bytes: fontBytes('lora/Lora-Variable.ttf') },
    { id: 'eb-garamond-500', bytes: fontBytes('eb-garamond/EBGaramond-Variable.ttf') },
  ]);

  it('reports coverage of ASCII and the accented sample', () => {
    expect(coverage.covers('lora-500', cps('The quick brown fox, 123!'))).toBe(true);
    expect(coverage.covers('lora-500', requiredCodePoints(UNICODE.text, UNICODE.author))).toBe(true);
  });

  it('reports a missing code point as not covered', () => {
    const greek = requiredCodePoints(GREEK.text, GREEK.author);
    expect(coverage.covers('lora-500', greek)).toBe(false);
    expect(coverage.covers('eb-garamond-500', greek)).toBe(true);
  });

  it('reports unknown fonts as not covered', () => {
    expect(coverage.covers('nope', cps('a'))).toBe(false);
  });
});
