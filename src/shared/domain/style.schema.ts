import { z } from 'zod';

export const Hex = z.string().regex(/^#[0-9a-f]{6}$/, 'Expected a lowercase #rrggbb color');
export type Hex = z.infer<typeof Hex>;

const unit = z.number().min(0).max(1);

export const BackgroundSpec = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('solid'), color: Hex }),
  z.object({ kind: z.literal('linear'), stops: z.array(Hex).min(2), angleDeg: z.number() }),
  z.object({ kind: z.literal('radial'), stops: z.array(Hex).min(2), center: z.tuple([unit, unit]) }),
  z.object({
    kind: z.literal('pattern'),
    base: Hex,
    ink: Hex,
    pattern: z.enum(['dots', 'stripes', 'grid', 'chevron']),
    scale: z.number().positive(),
    opacity: unit,
  }),
  z.object({
    kind: z.literal('texture'),
    base: Hex,
    grain: z.enum(['paper', 'linen', 'noise']),
    intensity: unit,
    seed: z.number().int(),
  }),
]);
export type BackgroundSpec = z.infer<typeof BackgroundSpec>;
export type BackgroundKind = BackgroundSpec['kind'];

export const Style = z.object({
  fontId: z.string().min(1),
  fontFamily: z.string().min(1),
  background: BackgroundSpec,
  backgroundId: z.string().min(1),
  textColor: Hex,
  attributionColor: Hex,
  comboKey: z.string().min(1),
});
export type Style = z.infer<typeof Style>;
