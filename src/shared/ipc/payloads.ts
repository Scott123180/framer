import { z } from 'zod';
import { DesignSpec } from '../domain/design.schema';

export const MAX_JPEG_BYTES = 40 * 1024 * 1024;

export const TouchQuoteInput = z.object({ text: z.string(), author: z.string().nullable() });
export type TouchQuoteInput = z.infer<typeof TouchQuoteInput>;

export const SaveDesignInput = z.object({
  spec: DesignSpec,
  /** Arrives as an ArrayBuffer (or a typed array, depending on how IPC cloned it); handed to main as bytes. */
  jpeg: z
    .union([z.instanceof(ArrayBuffer), z.instanceof(Uint8Array)])
    .transform((b) => (b instanceof Uint8Array ? b : new Uint8Array(b)))
    .refine((b) => b.byteLength > 0, 'The image is empty')
    .refine((b) => b.byteLength <= MAX_JPEG_BYTES, 'The image is larger than 40 MB'),
  quoteId: z.string().uuid().nullable(),
});
export type SaveDesignInput = z.output<typeof SaveDesignInput>;

export const IdPayload = z.object({ id: z.string().uuid() });
export type IdPayload = z.infer<typeof IdPayload>;

export const ShowInFolderInput = z.object({ path: z.string().min(1) });
export type ShowInFolderInput = z.infer<typeof ShowInFolderInput>;

export const LoadFontsInput = z.object({ ids: z.array(z.string().min(1)).min(1) });
export type LoadFontsInput = z.infer<typeof LoadFontsInput>;
