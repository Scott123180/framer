import { describe, expect, it } from 'vitest';
import manifest from '../../../assets/fonts/fonts.manifest.json';
import { BackgroundSpec } from '@shared/domain';
import { loadFontCatalog } from './fonts';
import { BACKGROUND_CATALOG } from './backgrounds';
import { describeBackground } from './describe';
import { TEXT_INKS } from './palettes';
import { createPainterRegistry } from '../paint/painter-registry';
import { registerDefaultPainters } from '../paint/default-painters';
import { WcagContrastPolicy } from '../generate/contrast';

describe('loadFontCatalog', () => {
  const catalog = loadFontCatalog(manifest);

  it('excludes the emoji fallback from pickable fonts', () => {
    expect(catalog.emojiFallback?.family).toBe('Noto Color Emoji');
    expect(catalog.pickable.some((f) => f.role === 'emoji-fallback')).toBe(false);
    expect(catalog.pickable.length).toBeGreaterThanOrEqual(18);
  });

  it('covers all four categories', () => {
    for (const c of ['serif', 'sans', 'script', 'display'] as const)
      expect(catalog.byCategory(c).length).toBeGreaterThan(0);
  });

  it('looks fonts up by id', () => {
    expect(catalog.byId('bebas-neue-400')?.caseTransform).toBe('uppercase');
    expect(catalog.byId('missing')).toBeUndefined();
  });

  it('rejects an invalid manifest', () => {
    expect(() => loadFontCatalog([{ id: 'x' }])).toThrow();
  });
});

describe('BACKGROUND_CATALOG', () => {
  it('has at least 40 entries with unique ids', () => {
    expect(BACKGROUND_CATALOG.length).toBeGreaterThanOrEqual(40);
    expect(new Set(BACKGROUND_CATALOG.map((b) => b.id)).size).toBe(BACKGROUND_CATALOG.length);
  });

  it('covers all five kinds and three moods with valid specs', () => {
    expect(new Set(BACKGROUND_CATALOG.map((b) => b.spec.kind))).toEqual(
      new Set(['solid', 'linear', 'radial', 'pattern', 'texture']),
    );
    expect(new Set(BACKGROUND_CATALOG.map((b) => b.mood))).toEqual(new Set(['light', 'dark', 'vivid']));
    for (const b of BACKGROUND_CATALOG) expect(BackgroundSpec.safeParse(b.spec).success, b.id).toBe(true);
  });

  it('gives every entry at least one legible text color', () => {
    const painters = registerDefaultPainters(createPainterRegistry());
    const policy = new WcagContrastPolicy();
    for (const b of BACKGROUND_CATALOG) {
      const env = painters.get(b.spec.kind).luminanceEnvelope(b.spec);
      expect(policy.pickTextColors(env, [...TEXT_INKS]), b.id).not.toBeNull();
    }
  });
});

describe('describeBackground', () => {
  it('returns short human descriptions, never ids', () => {
    for (const b of BACKGROUND_CATALOG) {
      const d = describeBackground(b);
      expect(d).not.toContain(b.id);
      expect(d).toMatch(/^[a-z][a-z ]+$/);
      expect(d.split(' ').length).toBeLessThanOrEqual(5);
    }
  });

  it('names the kind in the description', () => {
    const byKind = (k: string) => BACKGROUND_CATALOG.find((b) => b.spec.kind === k)!;
    expect(describeBackground(byKind('linear'))).toMatch(/gradient$/);
    expect(describeBackground(byKind('radial'))).toMatch(/glow$/);
    expect(describeBackground(byKind('texture'))).toMatch(/texture$/);
  });
});
