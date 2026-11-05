import { z } from 'zod';
import { PrintSettings } from './print.schema';
import { Style } from './style.schema';

export const DesignSpec = z.object({
  specVersion: z.literal(1),
  engineVersion: z.string().min(1),
  quote: z.object({ text: z.string().min(1), author: z.string().nullable() }),
  print: PrintSettings,
  style: Style,
});
export type DesignSpec = z.infer<typeof DesignSpec>;

export const SavedDesign = z.object({
  id: z.string().uuid(),
  quoteId: z.string().uuid().nullable(),
  spec: DesignSpec,
  fileName: z.string().min(1),
  imagePath: z.string().regex(/^designs\/[0-9a-f-]+\.jpg$/),
  thumbPath: z.string().regex(/^designs\/[0-9a-f-]+\.thumb\.jpg$/),
  pixelWidth: z.number().int().positive(),
  pixelHeight: z.number().int().positive(),
  byteSize: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  savedAt: z.string().datetime({ offset: true }),
});
export type SavedDesign = z.infer<typeof SavedDesign>;
