import type { DesignSpec, PrintSettings } from '@shared/domain';
import { marginWidthPx, pixelSize, shortSidePx } from '@shared/domain/print';
import { ATTRIBUTION_PREFIX } from '../generate/glyph-coverage';
import type { DrawPlan, FontSpec, SafeArea, TextLayoutEngine, TextMeasurer } from './types';

/** Bumped whenever layout rules change, so saved designs record which rules drew them. */
export const ENGINE_VERSION = '1.0.0';
/** 9 pt at 300 PPI: the smallest text we consider legible in print. */
export const MIN_FONT_PX = 37.5;
export const ATTRIBUTION_SCALE = 0.55;
const LINE_HEIGHT = 1.3;
const ATTRIBUTION_GAP = 0.5;
const MAX_SIZE_FRACTION = 0.16;
const SEARCH_STEPS = 14;

export type FaceInfo = { weight: number; style: 'normal' | 'italic'; caseTransform: 'none' | 'uppercase' };

type Fit = {
  quote: { font: FontSpec; lines: string[]; ascent: number; descent: number };
  attribution: { font: FontSpec; lines: string[]; ascent: number; descent: number } | null;
  height: number;
};

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/**
 * Fits the quote by binary search on font size: keeps the user's line breaks, wraps words greedily,
 * centers the block in the safe area, and puts the attribution below at 0.55× size (research R5).
 */
export class FitTextLayoutEngine implements TextLayoutEngine {
  constructor(private readonly deps: { fontFor(fontId: string): FaceInfo }) {}

  maxSizeFor(print: PrintSettings): number {
    return shortSidePx(print) * MAX_SIZE_FRACTION;
  }

  layout(spec: DesignSpec, safeArea: SafeArea, measurer: TextMeasurer): DrawPlan | null {
    const face = this.deps.fontFor(spec.style.fontId);
    const transform = (s: string) => (face.caseTransform === 'uppercase' ? s.toUpperCase() : s);
    const quote = transform(spec.quote.text);
    const attribution = spec.quote.author ? transform(`${ATTRIBUTION_PREFIX}${spec.quote.author}`) : null;
    const font = (sizePx: number): FontSpec => ({
      family: spec.style.fontFamily,
      weight: face.weight,
      style: face.style,
      sizePx,
      caseTransform: face.caseTransform,
    });
    // Breaking inside a word is a last resort (e.g. a long URL), so first look for a size without it.
    let breakWords = false;
    const tryAt = (size: number) => this.fit(quote, attribution, font, size, safeArea, measurer, breakWords);

    let best = tryAt(MIN_FONT_PX);
    if (!best) {
      breakWords = true;
      best = tryAt(MIN_FONT_PX);
    }
    if (!best) return null;
    let lo = MIN_FONT_PX;
    let hi = Math.max(MIN_FONT_PX, this.maxSizeFor(spec.print));
    for (let i = 0; i < SEARCH_STEPS; i++) {
      const mid = (lo + hi) / 2;
      const fit = tryAt(mid);
      if (fit) {
        best = fit;
        lo = mid;
      } else {
        hi = mid;
      }
    }
    return this.place(best, spec, safeArea, measurer);
  }

  private fit(
    quote: string,
    attribution: string | null,
    font: (size: number) => FontSpec,
    size: number,
    area: SafeArea,
    m: TextMeasurer,
    breakWords: boolean,
  ): Fit | null {
    const qFont = font(size);
    const qLines = wrapParagraphs(quote, qFont, area.width, m, breakWords);
    if (!qLines) return null;
    const q = { font: qFont, lines: qLines, ...m.metrics(qFont) };
    let height = blockHeight(q.lines.length, q.ascent, q.descent, size);

    let a: Fit['attribution'] = null;
    if (attribution) {
      const aFont = font(size * ATTRIBUTION_SCALE);
      const aLines = wrapParagraphs(attribution, aFont, area.width, m, breakWords);
      if (!aLines) return null;
      a = { font: aFont, lines: aLines, ...m.metrics(aFont) };
      height += size * ATTRIBUTION_GAP + blockHeight(a.lines.length, a.ascent, a.descent, aFont.sizePx);
    }
    return height <= area.height ? { quote: q, attribution: a, height } : null;
  }

  private place(fit: Fit, spec: DesignSpec, area: SafeArea, m: TextMeasurer): DrawPlan {
    const lines: DrawPlan['lines'] = [];
    const center = (text: string, f: FontSpec) => area.x + (area.width - m.width(text, f)) / 2;
    let baseline = area.y + (area.height - fit.height) / 2 + fit.quote.ascent;
    fit.quote.lines.forEach((text, i) => {
      if (i > 0) baseline += fit.quote.font.sizePx * LINE_HEIGHT;
      lines.push({
        text,
        x: center(text, fit.quote.font),
        y: baseline,
        font: fit.quote.font,
        color: spec.style.textColor,
        role: 'quote',
      });
    });
    if (fit.attribution) {
      const a = fit.attribution;
      baseline += fit.quote.descent + fit.quote.font.sizePx * ATTRIBUTION_GAP + a.ascent;
      a.lines.forEach((text, i) => {
        if (i > 0) baseline += a.font.sizePx * LINE_HEIGHT;
        lines.push({
          text,
          x: center(text, a.font),
          y: baseline,
          font: a.font,
          color: spec.style.attributionColor,
          role: 'attribution',
        });
      });
    }
    return { canvas: pixelSize(spec.print), safeArea: area, marginPx: marginWidthPx(spec.print), lines };
  }
}

function blockHeight(lines: number, ascent: number, descent: number, size: number): number {
  return ascent + (lines - 1) * size * LINE_HEIGHT + descent;
}

/** Wraps each user paragraph; returns null if something can't fit on a line. */
function wrapParagraphs(
  text: string,
  font: FontSpec,
  maxWidth: number,
  m: TextMeasurer,
  breakWords: boolean,
): string[] | null {
  const out: string[] = [];
  for (const paragraph of text.split('\n')) {
    const lines = wrapWords(paragraph.split(' ').filter(Boolean), font, maxWidth, m, breakWords);
    if (!lines) return null;
    out.push(...(lines.length ? lines : ['']));
  }
  return out;
}

function wrapWords(
  words: string[],
  font: FontSpec,
  maxWidth: number,
  m: TextMeasurer,
  breakWords: boolean,
): string[] | null {
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (m.width(candidate, font) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    if (m.width(word, font) <= maxWidth) {
      current = word;
      continue;
    }
    if (!breakWords) return null;
    // A word longer than the line (e.g. a URL) is broken between characters.
    const pieces = breakWord(word, font, maxWidth, m);
    if (!pieces) return null;
    current = pieces.pop() ?? '';
    lines.push(...pieces);
  }
  if (current) lines.push(current);
  return lines;
}

function breakWord(word: string, font: FontSpec, maxWidth: number, m: TextMeasurer): string[] | null {
  const pieces: string[] = [];
  let current = '';
  for (const { segment } of graphemes.segment(word)) {
    if (m.width(current + segment, font) <= maxWidth) {
      current += segment;
    } else {
      if (!current) return null;
      pieces.push(current);
      current = segment;
      if (m.width(current, font) > maxWidth) return null;
    }
  }
  pieces.push(current);
  return pieces;
}
