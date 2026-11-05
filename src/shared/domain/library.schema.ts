import { z } from 'zod';
import { Quote } from './quote.schema';
import { SavedDesign } from './design.schema';

export const Library = z.object({
  schemaVersion: z.literal(1),
  quotes: z.array(Quote),
  designs: z.array(SavedDesign),
});
export type Library = z.infer<typeof Library>;

export const EMPTY_LIBRARY: Library = { schemaVersion: 1, quotes: [], designs: [] };
