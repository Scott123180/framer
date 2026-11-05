import { describe, expect, it } from 'vitest';
import { WcagContrastPolicy, contrastRatio, relativeLuminance } from './contrast';

const lumRatio = (hex: string, l: number) => {
  const t = relativeLuminance(hex);
  return (Math.max(t, l) + 0.05) / (Math.min(t, l) + 0.05);
};

describe('relativeLuminance', () => {
  it('matches WCAG reference values', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#ffffff')).toBe(1);
    expect(relativeLuminance('#777777')).toBeCloseTo(0.184, 3);
  });
});

describe('contrastRatio', () => {
  it('is 21 for black on white, symmetric', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBe(21);
    expect(contrastRatio('#ffffff', '#000000')).toBe(21);
  });
});

describe('WcagContrastPolicy.pickTextColors', () => {
  const policy = new WcagContrastPolicy();
  const palette = ['#111111', '#333333', '#ffffff', '#fdf6e3'];

  it('picks colors that clear 4.5:1 against both ends of a light envelope', () => {
    const env = { min: 0.6, max: 0.9 };
    const picked = policy.pickTextColors(env, palette);
    expect(picked).not.toBeNull();
    for (const c of [picked!.text, picked!.attribution]) {
      expect(lumRatio(c, env.min)).toBeGreaterThanOrEqual(4.5);
      expect(lumRatio(c, env.max)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('picks light colors on a dark envelope', () => {
    const env = { min: 0.01, max: 0.05 };
    const picked = policy.pickTextColors(env, palette)!;
    expect(['#ffffff', '#fdf6e3']).toContain(picked.text);
    expect(lumRatio(picked.attribution, env.max)).toBeGreaterThanOrEqual(4.5);
  });

  it('prefers a different attribution color when one qualifies', () => {
    const picked = policy.pickTextColors({ min: 0.6, max: 0.9 }, palette)!;
    expect(picked.attribution).not.toBe(picked.text);
  });

  it('returns null when nothing reaches 4.5:1 against both ends', () => {
    expect(policy.pickTextColors({ min: 0.05, max: 0.9 }, palette)).toBeNull();
  });
});
