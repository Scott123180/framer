import type { Font, Style } from '@shared/domain';
import type { FontCatalog } from '../catalog/fonts';
import type { BackgroundCatalogEntry } from '../catalog/backgrounds';
import { TEXT_INKS } from '../catalog/palettes';
import type { PainterRegistry } from '../paint/types';
import type { ContrastPolicy } from './contrast';
import type { GlyphCoverage } from './glyph-coverage';
import { shuffle, type Prng } from './prng';

export type StyleRequest = {
  count: number;
  requiredCodePoints: ReadonlySet<number>;
  /** comboKeys already shown for this quote. */
  exclude: ReadonlySet<string>;
  seed: number;
};

export type StyleResult = {
  styles: Style[];
  /** True when some combinations had to be reused because unseen ones ran out. */
  exhausted: boolean;
  /** True when at least one pickable font was skipped because it can't display the quote. */
  glyphExcluded: boolean;
};

export interface StyleGenerator {
  generate(req: StyleRequest): StyleResult;
}

/** Interleaves groups so consecutive items come from different groups (round-robin). */
function roundRobin<T>(items: readonly T[], groupOf: (t: T) => string): T[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const g = groups.get(groupOf(item)) ?? [];
    g.push(item);
    groups.set(groupOf(item), g);
  }
  const queues = [...groups.values()];
  const out: T[] = [];
  while (out.length < items.length) {
    for (const q of queues) {
      const next = q.shift();
      if (next !== undefined) out.push(next);
    }
  }
  return out;
}

/**
 * Picks font × background combinations from the curated catalogs. Each set uses every font and
 * every background at most once, rotates through font categories and background kinds (FR-006),
 * prefers combinations not in `exclude` (FR-009), and only uses fonts that cover the quote.
 */
export class CatalogStyleGenerator implements StyleGenerator {
  constructor(
    private readonly fonts: FontCatalog,
    private readonly backgrounds: readonly BackgroundCatalogEntry[],
    private readonly painters: PainterRegistry,
    private readonly coverage: GlyphCoverage,
    private readonly contrast: ContrastPolicy,
    private readonly prngFactory: (seed: number) => Prng,
  ) {}

  generate({ count, requiredCodePoints, exclude, seed }: StyleRequest): StyleResult {
    const prng = this.prngFactory(seed);
    const usable = this.fonts.pickable.filter((f) => this.coverage.covers(f.id, requiredCodePoints));
    const glyphExcluded = usable.length < this.fonts.pickable.length;
    const fonts = roundRobin(shuffle(usable, prng), (f) => f.category);
    const legible = this.backgrounds.filter((b) => this.colorsFor(b, [...TEXT_INKS]) !== null);
    const backgrounds = roundRobin(shuffle(legible, prng), (b) => b.spec.kind);
    const target = Math.min(count, fonts.length, backgrounds.length);

    const picks: Array<{ font: Font; bg: BackgroundCatalogEntry }> = [];
    const usedBgs = new Set<string>();
    const usedFonts = new Set<string>();
    let cursor = 0;

    const place = (allowSeen: boolean) => {
      for (const font of fonts) {
        if (picks.length >= target) return;
        if (usedFonts.has(font.id)) continue;
        for (let k = 0; k < backgrounds.length; k++) {
          const i = (cursor + k) % backgrounds.length;
          const bg = backgrounds[i]!;
          if (usedBgs.has(bg.id)) continue;
          if (!allowSeen && exclude.has(comboKey(font, bg))) continue;
          picks.push({ font, bg });
          usedFonts.add(font.id);
          usedBgs.add(bg.id);
          cursor = (i + 1) % backgrounds.length;
          break;
        }
      }
    };

    place(false);
    const unseen = picks.length;
    if (picks.length < target) place(true);

    return {
      styles: picks.map(({ font, bg }) => this.style(font, bg, prng)),
      exhausted: picks.length > unseen,
      glyphExcluded,
    };
  }

  private colorsFor(bg: BackgroundCatalogEntry, palette: string[]) {
    const envelope = this.painters.get(bg.spec.kind).luminanceEnvelope(bg.spec);
    return this.contrast.pickTextColors(envelope, palette);
  }

  private style(font: Font, bg: BackgroundCatalogEntry, prng: Prng): Style {
    const colors = this.colorsFor(bg, shuffle(TEXT_INKS, prng));
    if (!colors) throw new Error(`No legible text color for ${bg.id}`);
    return {
      fontId: font.id,
      fontFamily: font.family,
      background: bg.spec,
      backgroundId: bg.id,
      textColor: colors.text,
      attributionColor: colors.attribution,
      comboKey: comboKey(font, bg),
    };
  }
}

function comboKey(font: Font, bg: BackgroundCatalogEntry): string {
  return `${font.id}|${bg.id}`;
}
