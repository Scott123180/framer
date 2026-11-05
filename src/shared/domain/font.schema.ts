import { z } from 'zod';

export const FontCategory = z.enum(['serif', 'sans', 'script', 'display']);
export type FontCategory = z.infer<typeof FontCategory>;

export const Font = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  family: z.string().min(1),
  category: FontCategory,
  weight: z.number().int().min(100).max(900),
  style: z.enum(['normal', 'italic']),
  file: z.string().min(1),
  license: z.literal('OFL-1.1'),
  caseTransform: z.enum(['none', 'uppercase']),
  /** Marks a face that is only used as a fallback (e.g. color emoji), never picked as a style's font. */
  role: z.literal('emoji-fallback').optional(),
});
export type Font = z.infer<typeof Font>;

export const FontManifest = z.array(Font);
export type FontManifest = z.infer<typeof FontManifest>;
