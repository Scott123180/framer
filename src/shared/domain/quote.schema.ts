import { z } from 'zod';

const IsoDate = z.string().datetime({ offset: true });

export const Quote = z.object({
  id: z.string().uuid(),
  text: z.string().min(1),
  author: z.string().nullable(),
  dedupeKey: z.string().min(1),
  createdAt: IsoDate,
  lastUsedAt: IsoDate,
});
export type Quote = z.infer<typeof Quote>;
