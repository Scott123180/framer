import { describe, expect, it } from 'vitest';
import { FitTextLayoutEngine, ENGINE_VERSION, MIN_FONT_PX } from './text-layout-engine';
import { computeSafeArea } from './safe-area';
import { marginWidthPx, pixelSize } from '@shared/domain/print';
import type { DesignSpec, PrintSettings } from '@shared/domain';
import type { DrawPlan, FontSpec, TextMeasurer } from './types';
import { LONG_500, SHORT, UNICODE } from '../../../tests/fixtures/quotes';

const fake: TextMeasurer = {
  width: (text: string, font: FontSpec) => [...text].length * 0.5 * font.sizePx,
  metrics: (font: FontSpec) => ({ ascent: 0.8 * font.sizePx, descent: 0.2 * font.sizePx }),
};

const print: PrintSettings = { size: '4x6', orientation: 'portrait', margin: { enabled: false } };

const spec = (
  quote: { text: string; author: string | null },
  p: PrintSettings = print,
  fontId = 'lora-500',
): DesignSpec => ({
  specVersion: 1,
  engineVersion: ENGINE_VERSION,
  quote: { text: quote.text, author: quote.author },
  print: p,
  style: {
    fontId,
    fontFamily: fontId === 'bebas-neue-400' ? 'Bebas Neue' : 'Lora',
    background: { kind: 'solid', color: '#ffffff' },
    backgroundId: 'solid-white',
    textColor: '#111111',
    attributionColor: '#333333',
    comboKey: `${fontId}|solid-white`,
  },
});

const engine = new FitTextLayoutEngine({
  fontFor: (id) =>
    id === 'bebas-neue-400'
      ? { weight: 400, style: 'normal', caseTransform: 'uppercase' }
      : { weight: 500, style: 'normal', caseTransform: 'none' },
});

const layout = (s: DesignSpec, m: TextMeasurer = fake) => engine.layout(s, computeSafeArea(s.print), m);

function expectInside(plan: DrawPlan, m: TextMeasurer = fake) {
  const a = plan.safeArea;
  for (const line of plan.lines) {
    const w = m.width(line.text, line.font);
    const { ascent, descent } = m.metrics(line.font);
    expect(line.x).toBeGreaterThanOrEqual(a.x - 1e-6);
    expect(line.x + w).toBeLessThanOrEqual(a.x + a.width + 1e-6);
    expect(line.y - ascent).toBeGreaterThanOrEqual(a.y - 1e-6);
    expect(line.y + descent).toBeLessThanOrEqual(a.y + a.height + 1e-6);
  }
}

describe('FitTextLayoutEngine', () => {
  it('describes the canvas, safe area and margin', () => {
    const p: PrintSettings = {
      size: '5x7',
      orientation: 'landscape',
      margin: { enabled: true, size: 'large' },
    };
    const plan = layout(spec(SHORT, p))!;
    expect(plan.canvas).toEqual(pixelSize(p));
    expect(plan.safeArea).toEqual(computeSafeArea(p));
    expect(plan.marginPx).toBe(marginWidthPx(p));
  });

  it.each([
    ['SHORT', SHORT],
    ['LONG_500', LONG_500],
    ['UNICODE', UNICODE],
  ])('keeps every line of %s inside the safe area (SC-004)', (_n, q) => {
    expectInside(layout(spec(q))!);
  });

  it('starts a new line at every user line break', () => {
    const plan = layout(spec({ text: 'one\ntwo\nthree', author: null }))!;
    expect(plan.lines.map((l) => l.text)).toEqual(['one', 'two', 'three']);
  });

  it('wraps words greedily without splitting short words', () => {
    const narrow: TextMeasurer = { ...fake, width: (t, f) => [...t].length * 3 * f.sizePx };
    const plan = layout(spec(SHORT), narrow)!;
    const words = SHORT.text.split(' ');
    const quoteLines = plan.lines.filter((l) => l.role === 'quote');
    expect(quoteLines.length).toBeGreaterThan(1);
    expect(quoteLines.map((l) => l.text).join(' ')).toBe(words.join(' '));
    expectInside(plan, narrow);
  });

  it('draws the attribution below the quote at about 0.55× size in its own color', () => {
    const plan = layout(spec(SHORT))!;
    const quoteLines = plan.lines.filter((l) => l.role === 'quote');
    const attr = plan.lines.filter((l) => l.role === 'attribution');
    expect(attr.length).toBeGreaterThanOrEqual(1);
    expect(attr[0]!.text).toBe('— Gandhi');
    expect(attr[0]!.color).toBe('#333333');
    expect(quoteLines[0]!.color).toBe('#111111');
    expect(attr[0]!.font.sizePx / quoteLines[0]!.font.sizePx).toBeCloseTo(0.55, 2);
    expect(attr[0]!.y).toBeGreaterThan(quoteLines.at(-1)!.y);
  });

  it('has no attribution lines without an author', () => {
    const plan = layout(spec({ text: 'Hello', author: null }))!;
    expect(plan.lines.every((l) => l.role === 'quote')).toBe(true);
  });

  it('uppercases text for caseTransform uppercase', () => {
    const plan = layout(spec(SHORT, print, 'bebas-neue-400'))!;
    expect(plan.lines[0]!.text).toBe(plan.lines[0]!.text.toUpperCase());
    expect(plan.lines.at(-1)!.text).toBe('— GANDHI');
    expect(plan.lines[0]!.font.caseTransform).toBe('uppercase');
  });

  it('picks the largest size that fits', () => {
    const plan = layout(spec({ text: 'Hi', author: null }))!;
    const size = plan.lines[0]!.font.sizePx;
    const bigger = { ...plan.lines[0]!.font, sizePx: size * 1.1 };
    const a = plan.safeArea;
    // Either the width or the cap would be exceeded by a 10% larger size.
    expect(
      fake.width('Hi', bigger) > a.width ||
        size >= engine.maxSizeFor(spec({ text: 'Hi', author: null }).print) - 1,
    ).toBe(true);
    // A long quote ends up much smaller than a short one.
    expect(layout(spec(LONG_500))!.lines[0]!.font.sizePx).toBeLessThan(size);
  });

  it('returns null when the quote cannot fit at the 9 pt minimum', () => {
    const huge: TextMeasurer = { ...fake, width: (t, f) => [...t].length * 40 * f.sizePx };
    expect(MIN_FONT_PX).toBe(37.5);
    expect(layout(spec(LONG_500), huge)).toBeNull();
  });

  it('is deterministic', () => {
    expect(layout(spec(LONG_500))).toEqual(layout(spec(LONG_500)));
  });
});

describe('FitTextLayoutEngine word breaking', () => {
  it('breaks an over-long word between characters only as a last resort', () => {
    const url = 'https://example.com/'.repeat(8);
    const plan = layout(spec({ text: url, author: null }))!;
    expect(plan).not.toBeNull();
    expect(plan.lines.length).toBeGreaterThan(1);
    expect(plan.lines.map((l) => l.text).join('')).toBe(url);
    expectInside(plan);
  });
});
