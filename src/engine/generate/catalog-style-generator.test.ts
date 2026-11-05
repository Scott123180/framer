import { describe, expect, it } from 'vitest';
import manifest from '../../../assets/fonts/fonts.manifest.json';
import { loadFontCatalog } from '../catalog/fonts';
import { BACKGROUND_CATALOG } from '../catalog/backgrounds';
import { createPainterRegistry } from '../paint/painter-registry';
import { registerDefaultPainters } from '../paint/default-painters';
import { CatalogStyleGenerator } from './catalog-style-generator';
import { WcagContrastPolicy, contrastRatio, relativeLuminance } from './contrast';
import { mulberry32 } from './prng';
import type { GlyphCoverage } from './glyph-coverage';

const fonts = loadFontCatalog(manifest);
const painters = registerDefaultPainters(createPainterRegistry());
const allCovered: GlyphCoverage = { covers: () => true };
const ascii = new Set([...'hello'].map((c) => c.codePointAt(0)!));

const make = (coverage: GlyphCoverage = allCovered) =>
  new CatalogStyleGenerator(
    fonts,
    BACKGROUND_CATALOG,
    painters,
    coverage,
    new WcagContrastPolicy(),
    mulberry32,
  );

const req = (seed: number) => ({ count: 12, requiredCodePoints: ascii, exclude: new Set<string>(), seed });

describe('CatalogStyleGenerator', () => {
  it('returns 12 styles with distinct combos and distinct fonts (FR-005)', () => {
    const { styles, exhausted, glyphExcluded } = make().generate(req(1));
    expect(styles).toHaveLength(12);
    expect(new Set(styles.map((s) => s.comboKey)).size).toBe(12);
    expect(new Set(styles.map((s) => s.fontId)).size).toBe(12);
    expect(exhausted).toBe(false);
    expect(glyphExcluded).toBe(false);
    for (const s of styles) expect(s.comboKey).toBe(`${s.fontId}|${s.backgroundId}`);
  });

  it('spreads picks across ≥ 3 font categories and ≥ 3 background kinds (FR-006)', () => {
    for (const seed of [1, 2, 3, 99]) {
      const { styles } = make().generate(req(seed));
      expect(new Set(styles.map((s) => fonts.byId(s.fontId)!.category)).size).toBeGreaterThanOrEqual(3);
      expect(new Set(styles.map((s) => s.background.kind)).size).toBeGreaterThanOrEqual(3);
    }
  });

  it('gives every style text and attribution colors with ≥ 4.5:1 against its envelope (FR-008)', () => {
    const { styles } = make().generate(req(5));
    for (const s of styles) {
      const env = painters.get(s.background.kind).luminanceEnvelope(s.background);
      for (const c of [s.textColor, s.attributionColor]) {
        const l = relativeLuminance(c);
        for (const end of [env.min, env.max]) {
          expect((Math.max(l, end) + 0.05) / (Math.min(l, end) + 0.05)).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
    expect(contrastRatio('#000000', '#ffffff')).toBe(21);
  });

  it('snapshots the font family and full background spec', () => {
    const { styles } = make().generate(req(2));
    for (const s of styles) {
      expect(s.fontFamily).toBe(fonts.byId(s.fontId)!.family);
      expect(s.background).toEqual(BACKGROUND_CATALOG.find((b) => b.id === s.backgroundId)!.spec);
    }
  });

  it('never uses a font that does not cover the quote', () => {
    const coverage: GlyphCoverage = { covers: (id) => !id.startsWith('l') };
    const { styles, glyphExcluded } = make(coverage).generate(req(3));
    expect(styles.every((s) => !s.fontId.startsWith('l'))).toBe(true);
    expect(glyphExcluded).toBe(true);
  });

  it('returns fewer styles when only a few fonts can show the quote', () => {
    const coverage: GlyphCoverage = { covers: (id) => id === 'eb-garamond-500' };
    const { styles, glyphExcluded } = make(coverage).generate(req(3));
    expect(styles.map((s) => s.fontId)).toEqual(['eb-garamond-500']);
    expect(glyphExcluded).toBe(true);
  });

  it('is deterministic per seed', () => {
    expect(make().generate(req(11))).toEqual(make().generate(req(11)));
    expect(make().generate(req(11)).styles).not.toEqual(make().generate(req(12)).styles);
  });
});
