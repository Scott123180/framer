import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_PRINT_SETTINGS } from '@shared/domain/print';
import { dedupeKey } from '@shared/domain/quote';
import type { Style } from '@shared/domain';
import { ENGINE_VERSION } from '@engine/layout/text-layout-engine';
import type { StyleGenerator } from '@engine/generate/catalog-style-generator';
import type { DrawPlan, TextLayoutEngine, TextMeasurer } from '@engine/layout/types';
import { generateOptionSet } from './generate-option-set';
import { makeStyle } from '../../test/specs';

const measurer: TextMeasurer = { width: () => 1, metrics: () => ({ ascent: 1, descent: 1 }) };
const plan = {} as DrawPlan;

/** A fake generator over `fonts` fonts × 3 backgrounds; one style per font, unseen first. */
function fakeGenerator(
  fonts: number,
  opts: { glyphExcluded?: boolean } = {},
): StyleGenerator & { calls: unknown[] } {
  const calls: unknown[] = [];
  return {
    calls,
    generate(req) {
      calls.push(req);
      const styles: Style[] = [];
      for (let f = 1; f <= fonts && styles.length < req.count; f++) {
        for (let b = 1; b <= 3; b++) {
          const s = makeStyle(f, { fontId: `font-${f}`, backgroundId: `bg-${b}` });
          if (!req.exclude.has(s.comboKey)) {
            styles.push(s);
            break;
          }
        }
      }
      return { styles, exhausted: false, glyphExcluded: opts.glyphExcluded ?? false };
    },
  };
}

const layoutAll: TextLayoutEngine = { layout: () => plan };
const layoutExcept = (bad: string[]): TextLayoutEngine => ({
  layout: (spec) => (bad.includes(spec.style.fontId) ? null : plan),
});

const input = (over = {}) => ({
  quote: '  Be the change  ',
  author: 'Gandhi',
  print: DEFAULT_PRINT_SETTINGS,
  exclude: new Set<string>(),
  seed: 42,
  ...over,
});

describe('generateOptionSet', () => {
  it('returns the validation code without calling the generator', () => {
    const generator = fakeGenerator(20);
    expect(generateOptionSet(input({ quote: '  ' }), { generator, layout: layoutAll, measurer })).toEqual({
      ok: false,
      code: 'QUOTE_EMPTY',
    });
    expect(
      generateOptionSet(input({ author: 'x'.repeat(121) }), { generator, layout: layoutAll, measurer }),
    ).toEqual({
      ok: false,
      code: 'AUTHOR_TOO_LONG',
    });
    expect(generator.calls).toHaveLength(0);
  });

  it('passes required code points, exclusions, and the seed to the generator', () => {
    const generator = fakeGenerator(20);
    const exclude = new Set(['font-1|bg-1']);
    generateOptionSet(input({ exclude }), { generator, layout: layoutAll, measurer });
    const req = generator.calls[0] as {
      count: number;
      seed: number;
      exclude: Set<string>;
      requiredCodePoints: Set<number>;
    };
    expect(req.count).toBe(12);
    expect(req.seed).toBe(42);
    expect(req.exclude.has('font-1|bg-1')).toBe(true);
    expect(req.requiredCodePoints.has('B'.codePointAt(0)!)).toBe(true);
    expect(req.requiredCodePoints.has(' '.codePointAt(0)!)).toBe(false);
  });

  it('builds 12 versioned specs with the normalized quote and print settings', () => {
    const res = generateOptionSet(input(), { generator: fakeGenerator(20), layout: layoutAll, measurer });
    if (!res.ok) throw new Error('expected ok');
    expect(res.options).toHaveLength(12);
    expect(res.shortfall).toBeNull();
    expect(res.exhausted).toBe(false);
    expect(res.quoteKey).toBe(dedupeKey('Be the change', 'Gandhi'));
    for (const o of res.options) {
      expect(o.spec).toMatchObject({
        specVersion: 1,
        engineVersion: ENGINE_VERSION,
        quote: { text: 'Be the change', author: 'Gandhi' },
        print: DEFAULT_PRINT_SETTINGS,
      });
    }
    expect(new Set(res.options.map((o) => o.id)).size).toBe(12);
  });

  it('drops styles that do not fit and refills from new fonts', () => {
    const generator = fakeGenerator(20);
    const res = generateOptionSet(input(), {
      generator,
      layout: layoutExcept(['font-1', 'font-2']),
      measurer,
    });
    if (!res.ok) throw new Error('expected ok');
    expect(res.options).toHaveLength(12);
    expect(res.options.some((o) => ['font-1', 'font-2'].includes(o.spec.style.fontId))).toBe(false);
    expect(new Set(res.options.map((o) => o.spec.style.fontId)).size).toBe(12);
    expect(res.shortfall).toBeNull();
    expect(generator.calls.length).toBeGreaterThan(1);
  });

  it("reports 'fit' when layouts were dropped and too few remain", () => {
    const res = generateOptionSet(input(), {
      generator: fakeGenerator(10),
      layout: layoutExcept(['font-3']),
      measurer,
    });
    if (!res.ok) throw new Error('expected ok');
    expect(res.options).toHaveLength(9);
    expect(res.shortfall).toBe('fit');
  });

  it("reports 'glyphs' when fonts were excluded for coverage, even if some also did not fit", () => {
    const res = generateOptionSet(input(), {
      generator: fakeGenerator(4, { glyphExcluded: true }),
      layout: layoutExcept(['font-1']),
      measurer,
    });
    if (!res.ok) throw new Error('expected ok');
    expect(res.options).toHaveLength(3);
    expect(res.shortfall).toBe('glyphs');
  });

  it('returns no options when no font covers the quote', () => {
    const res = generateOptionSet(input(), {
      generator: fakeGenerator(0, { glyphExcluded: true }),
      layout: layoutAll,
      measurer,
    });
    expect(res).toMatchObject({ ok: true, options: [], shortfall: 'glyphs' });
  });

  it('flags exhaustion when a returned combination was excluded', () => {
    const generator: StyleGenerator = {
      generate: vi.fn(() => ({ styles: [makeStyle(1)], exhausted: true, glyphExcluded: false })),
    };
    const res = generateOptionSet(input({ exclude: new Set([makeStyle(1).comboKey]) }), {
      generator,
      layout: layoutAll,
      measurer,
    });
    expect(res).toMatchObject({ ok: true, exhausted: true });
  });
});
