import * as fontkit from 'fontkit';

/** Whether a font can draw every given code point. */
export interface GlyphCoverage {
  covers(fontId: string, codePoints: ReadonlySet<number>): boolean;
}

const PICTOGRAPHIC = /\p{Extended_Pictographic}/u;
const WHITESPACE = /\s/u;
export const ATTRIBUTION_PREFIX = '— ';

/** Emoji are drawn by the color-emoji fallback font, so they never count against a style's font. */
export function isEmojiCodePoint(cp: number): boolean {
  return (
    cp === 0x200d || // zero-width joiner
    cp === 0xfe0f || // emoji presentation selector
    cp === 0x20e3 || // combining keycap
    (cp >= 0x1f3fb && cp <= 0x1f3ff) || // skin-tone modifiers
    (cp >= 0x1f1e6 && cp <= 0x1f1ff) || // regional indicators (flags)
    (cp >= 0xe0020 && cp <= 0xe007f) || // tag sequences
    PICTOGRAPHIC.test(String.fromCodePoint(cp))
  );
}

/** Code points the style's own font must have: quote, author, and the attribution dash. */
export function requiredCodePoints(text: string, author: string | null): Set<number> {
  const all = author ? `${text}${ATTRIBUTION_PREFIX}${author}` : text;
  const out = new Set<number>();
  for (const ch of all) {
    const cp = ch.codePointAt(0);
    if (cp === undefined || WHITESPACE.test(ch) || isEmojiCodePoint(cp)) continue;
    out.add(cp);
  }
  return out;
}

/** Reads each font's character map once with fontkit and caches it. */
export class FontkitGlyphCoverage implements GlyphCoverage {
  private constructor(private readonly charsets: Map<string, Set<number>>) {}

  static fromFonts(fonts: ReadonlyArray<{ id: string; bytes: ArrayBuffer }>): FontkitGlyphCoverage {
    const charsets = new Map<string, Set<number>>();
    for (const { id, bytes } of fonts) {
      const font = fontkit.create(new Uint8Array(bytes) as unknown as Buffer) as fontkit.Font;
      charsets.set(id, new Set(font.characterSet));
    }
    return new FontkitGlyphCoverage(charsets);
  }

  covers(fontId: string, codePoints: ReadonlySet<number>): boolean {
    const set = this.charsets.get(fontId);
    if (!set) return false;
    for (const cp of codePoints) if (!set.has(cp)) return false;
    return true;
  }
}
