import { z } from 'zod';

export const PrintSize = z.enum(['4x6', '5x7', '8x10']);
export type PrintSize = z.infer<typeof PrintSize>;

export const Orientation = z.enum(['portrait', 'landscape']);
export type Orientation = z.infer<typeof Orientation>;

export const MarginSize = z.enum(['small', 'medium', 'large']);
export type MarginSize = z.infer<typeof MarginSize>;

export const MarginSetting = z.discriminatedUnion('enabled', [
  z.object({ enabled: z.literal(false) }),
  z.object({ enabled: z.literal(true), size: MarginSize }),
]);
export type MarginSetting = z.infer<typeof MarginSetting>;

export const PrintSettings = z.object({ size: PrintSize, orientation: Orientation, margin: MarginSetting });
export type PrintSettings = z.infer<typeof PrintSettings>;
