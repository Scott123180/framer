import { describe, expect, it } from 'vitest';
import manifest from '../../../assets/fonts/fonts.manifest.json';
import type { Font } from '@shared/domain';
import { loadFontCatalog } from '../catalog/fonts';
import { BACKGROUND_CATALOG, type BackgroundCatalogEntry } from '../catalog/backgrounds';
import { createPainterRegistry } from '../paint/painter-registry';
import { registerDefaultPainters } from '../paint/default-painters';
import { CatalogStyleGenerator } from './catalog-style-generator';
import { WcagContrastPolicy } from './contrast';
import { mulberry32 } from './prng';

const painters = registerDefaultPainters(createPainterRegistry());
const covers = { covers: () => true };
const cps = new Set([0x61]);

const font = (id: string, category: Font['category']): Font => ({
  id,
  family: id,
  category,
  weight: 400,
  style: 'normal',
  file: `${id}.ttf`,
  license: 'OFL-1.1',
  caseTransform: 'none',
});
const tinyFonts = loadFontCatalog([font('f1', 'serif'), font('f2', 'sans')]);
const bg = (id: string, color: string): BackgroundCatalogEntry => ({
  id,
  mood: 'light',
  label: id,
  spec: { kind: 'solid', color },
});
const tinyBgs = [bg('b1', '#ffffff'), bg('b2', '#f7f1e3'), bg('b3', '#dbe9f4')];
const ALL = ['f1|b1', 'f1|b2', 'f1|b3', 'f2|b1', 'f2|b2', 'f2|b3'];

const tiny = () =>
  new CatalogStyleGenerator(tinyFonts, tinyBgs, painters, covers, new WcagContrastPolicy(), mulberry32);
const real = () =>
  new CatalogStyleGenerator(
    loadFontCatalog(manifest),
    BACKGROUND_CATALOG,
    painters,
    covers,
    new WcagContrastPolicy(),
    mulberry32,
  );

describe('CatalogStyleGenerator exclusions (FR-009)', () => {
  it('never repeats a previous set while unseen combinations remain', () => {
    const gen = real();
    const first = gen.generate({ count: 12, requiredCodePoints: cps, exclude: new Set(), seed: 1 });
    const exclude = new Set(first.styles.map((s) => s.comboKey));
    const second = gen.generate({ count: 12, requiredCodePoints: cps, exclude, seed: 2 });
    expect(second.styles).toHaveLength(12);
    expect(second.styles.some((s) => exclude.has(s.comboKey))).toBe(false);
    expect(second.exhausted).toBe(false);
  });

  it('uses only unseen combinations when they are enough', () => {
    const exclude = new Set(ALL.filter((k) => !['f1|b1', 'f2|b2'].includes(k)));
    const res = tiny().generate({ count: 12, requiredCodePoints: cps, exclude, seed: 3 });
    expect(res.styles.map((s) => s.comboKey).sort()).toEqual(['f1|b1', 'f2|b2']);
    expect(res.exhausted).toBe(false);
  });

  it('puts unseen combinations first, then reuses seen ones, and says so', () => {
    const exclude = new Set(ALL.filter((k) => !['f1|b1', 'f1|b2'].includes(k)));
    const res = tiny().generate({ count: 12, requiredCodePoints: cps, exclude, seed: 4 });
    const keys = res.styles.map((s) => s.comboKey);
    expect(keys).toHaveLength(2);
    expect(new Set(keys).size).toBe(2);
    expect(['f1|b1', 'f1|b2']).toContain(keys[0]);
    expect(exclude.has(keys[1]!)).toBe(true);
    expect(res.exhausted).toBe(true);
  });

  it('still returns distinct combinations when every one has been seen', () => {
    const res = tiny().generate({ count: 12, requiredCodePoints: cps, exclude: new Set(ALL), seed: 5 });
    expect(res.styles).toHaveLength(2);
    expect(new Set(res.styles.map((s) => s.comboKey)).size).toBe(2);
    expect(res.exhausted).toBe(true);
  });
});
