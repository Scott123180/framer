import { describe, expect, it } from 'vitest';
import { MAX_FILE_NAME, exportFileName, slugifyQuote, withCounter } from './filename';
import type { DesignSpec } from './design.schema';

const spec = (
  text: string,
  size: '4x6' | '5x7' | '8x10' = '4x6',
  orientation: 'portrait' | 'landscape' = 'portrait',
) =>
  ({
    specVersion: 1,
    engineVersion: '1.0.0',
    quote: { text, author: null },
    print: { size, orientation, margin: { enabled: false } },
    style: {} as DesignSpec['style'],
  }) as DesignSpec;

describe('exportFileName', () => {
  it('builds framer-<slug>-<size>-<orientation>.jpg from a short excerpt', () => {
    expect(exportFileName(spec('Be the change you wish to see in the world.'))).toBe(
      'framer-be-the-change-you-wish-to-see-4x6-portrait.jpg',
    );
    expect(exportFileName(spec('Hello', '8x10', 'landscape'))).toBe('framer-hello-8x10-landscape.jpg');
  });

  it('transliterates accents and drops emoji and symbols', () => {
    expect(slugifyQuote('Café — “naïve” 🌻')).toBe('cafe-naive');
    expect(slugifyQuote('  Ünïcödé!!  ')).toBe('unicode');
  });

  it('cuts at a word boundary', () => {
    const slug = slugifyQuote('Supercalifragilistic expialidocious extraordinarily');
    expect(slug).toBe('supercalifragilistic');
    expect(slugifyQuote('a'.repeat(80))).toHaveLength(30);
  });

  it('falls back to "quote" when nothing is left', () => {
    expect(exportFileName(spec('🌻🌻 ❤️'))).toBe('framer-quote-4x6-portrait.jpg');
    expect(exportFileName(spec('Γνῶθι σεαυτόν'))).toBe('framer-quote-4x6-portrait.jpg');
  });

  it('never produces reserved names, reserved characters, or names over the limit', () => {
    const samples = [
      'CON',
      'nul',
      'COM1',
      'LPT9',
      'a<b>c:d"e/f\\g|h?i*j',
      'tab\there\u0001',
      'x'.repeat(500),
    ];
    for (const s of samples) {
      const name = exportFileName(spec(s));
      expect(name.length).toBeLessThanOrEqual(MAX_FILE_NAME);
      // eslint-disable-next-line no-control-regex -- checking that control characters are absent
      expect(name).not.toMatch(/[<>:"/\\|?*\u0000-\u001f]/);
      const stem = name.replace(/\.jpg$/, '');
      expect(stem).not.toMatch(/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i);
      expect(name).toMatch(/^framer-[a-z0-9-]+-4x6-portrait\.jpg$/);
    }
  });
});

describe('withCounter', () => {
  it('adds a counter before the extension', () => {
    expect(withCounter('framer-hi-4x6-portrait.jpg', 2)).toBe('framer-hi-4x6-portrait-2.jpg');
  });
});
