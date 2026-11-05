import type { DesignSpec } from './design.schema';

export const MAX_FILE_NAME = 120;
/** FR-019 asks for a short excerpt, so the slug is cut (at a word boundary) to this length. */
const MAX_SLUG = 30;
const FALLBACK_SLUG = 'quote';

/** Lowercase ASCII words from the quote: accents transliterated, everything else dropped. */
export function slugifyQuote(text: string): string {
  const words = text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  let slug = '';
  for (const word of words) {
    const next = slug ? `${slug}-${word}` : word;
    if (next.length > MAX_SLUG) {
      if (!slug) slug = word.slice(0, MAX_SLUG);
      break;
    }
    slug = next;
  }
  return slug;
}

/** framer-<quote-slug>-<size>-<orientation>.jpg — safe on Windows, macOS, and Linux. */
export function exportFileName(spec: DesignSpec): string {
  const slug = slugifyQuote(spec.quote.text) || FALLBACK_SLUG;
  return `framer-${slug}-${spec.print.size}-${spec.print.orientation}.jpg`.slice(0, MAX_FILE_NAME);
}

/** Adds a counter before the extension so an existing file is never overwritten: name-2.jpg, name-3.jpg… */
export function withCounter(fileName: string, n: number): string {
  return fileName.replace(/\.jpg$/, `-${n}.jpg`);
}
