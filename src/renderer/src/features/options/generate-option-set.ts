import type { DesignSpec, PrintSettings, Style } from '@shared/domain';
import { dedupeKey, validateQuoteInput, type QuoteValidationCode } from '@shared/domain/quote';
import { requiredCodePoints } from '@engine/generate/glyph-coverage';
import type { StyleGenerator } from '@engine/generate/catalog-style-generator';
import { computeSafeArea } from '@engine/layout/safe-area';
import { ENGINE_VERSION } from '@engine/layout/text-layout-engine';
import type { TextLayoutEngine, TextMeasurer } from '@engine/layout/types';
import type { Shortfall } from '../../state/actions';

export const OPTIONS_PER_SET = 12;
const MAX_ROUNDS = 6;

export type GenerateInput = {
  quote: string;
  author: string | null;
  print: PrintSettings;
  exclude: ReadonlySet<string>;
  seed: number;
};

type GenerateDeps = { generator: StyleGenerator; layout: TextLayoutEngine; measurer: TextMeasurer };

export type GeneratedOptionSet =
  | { ok: false; code: QuoteValidationCode }
  | {
      ok: true;
      quoteKey: string;
      quote: { text: string; author: string | null };
      options: Array<{ id: string; spec: DesignSpec }>;
      shortfall: Shortfall;
      exhausted: boolean;
    };

/**
 * Validates the quote, asks the generator for styles, and keeps only those whose layout fits (FR-007),
 * asking again for other fonts until 12 fit or no candidates remain.
 */
export function generateOptionSet(input: GenerateInput, deps: GenerateDeps): GeneratedOptionSet {
  const valid = validateQuoteInput({ text: input.quote, author: input.author });
  if (!valid.ok) return { ok: false, code: valid.code };
  const quote = valid.value;
  const codePoints = requiredCodePoints(quote.text, quote.author);
  const safeArea = computeSafeArea(input.print);
  const specFor = (style: Style): DesignSpec => ({
    specVersion: 1,
    engineVersion: ENGINE_VERSION,
    quote,
    print: input.print,
    style,
  });

  const kept: Style[] = [];
  const tried = new Set(input.exclude);
  const usedFonts = new Set<string>();
  const failedFonts = new Set<string>();
  let glyphExcluded = false;

  for (let round = 0; round < MAX_ROUNDS && kept.length < OPTIONS_PER_SET; round++) {
    // Each set uses distinct fonts, so asking for 12 + the fonts that failed guarantees fresh fonts
    // come back whenever any remain.
    const res = deps.generator.generate({
      count: OPTIONS_PER_SET + failedFonts.size,
      requiredCodePoints: codePoints,
      exclude: round === 0 ? input.exclude : tried,
      seed: input.seed + round,
    });
    glyphExcluded ||= res.glyphExcluded;
    let progressed = false;
    for (const style of res.styles) {
      if (kept.length >= OPTIONS_PER_SET) break;
      if (usedFonts.has(style.fontId) || failedFonts.has(style.fontId)) continue;
      tried.add(style.comboKey);
      progressed = true;
      if (deps.layout.layout(specFor(style), safeArea, deps.measurer)) {
        kept.push(style);
        usedFonts.add(style.fontId);
      } else {
        failedFonts.add(style.fontId);
      }
    }
    if (!progressed) break;
  }

  const shortfall: Shortfall =
    kept.length >= OPTIONS_PER_SET ? null : glyphExcluded ? 'glyphs' : failedFonts.size > 0 ? 'fit' : null;
  return {
    ok: true,
    quoteKey: dedupeKey(quote.text, quote.author),
    quote,
    options: kept.map((style) => ({ id: `${input.seed}:${style.comboKey}`, spec: specFor(style) })),
    shortfall,
    exhausted: kept.some((s) => input.exclude.has(s.comboKey)),
  };
}
