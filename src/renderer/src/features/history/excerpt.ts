const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
export const EXCERPT_LENGTH = 60;

/** The first 60 characters of a quote on one line, with "…" if it was cut. */
export function excerpt(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  const parts = [...segmenter.segment(flat)].map((s) => s.segment);
  return parts.length > EXCERPT_LENGTH ? `${parts.slice(0, EXCERPT_LENGTH).join('').trimEnd()}…` : flat;
}
