import type { BackgroundSpec } from '@shared/domain';
import { PALETTE } from './palettes';

export type Mood = 'light' | 'dark' | 'vivid';

export type BackgroundCatalogEntry = {
  id: string;
  spec: BackgroundSpec;
  mood: Mood;
  /** Plain color words for accessible names, e.g. "peach to butter". */
  label: string;
};

const { light: L, dark: D, vivid: V } = PALETTE;

const entry = (id: string, mood: Mood, label: string, spec: BackgroundSpec): BackgroundCatalogEntry => ({
  id,
  mood,
  label,
  spec,
});

const solids: BackgroundCatalogEntry[] = [
  entry('solid-cream', 'light', 'cream', { kind: 'solid', color: L.cream }),
  entry('solid-blush', 'light', 'blush pink', { kind: 'solid', color: L.blush }),
  entry('solid-sage', 'light', 'sage', { kind: 'solid', color: L.sage }),
  entry('solid-sky', 'light', 'pale sky blue', { kind: 'solid', color: L.sky }),
  entry('solid-lavender', 'light', 'lavender', { kind: 'solid', color: L.lavender }),
  entry('solid-midnight', 'dark', 'midnight blue', { kind: 'solid', color: D.midnight }),
  entry('solid-forest', 'dark', 'forest green', { kind: 'solid', color: D.forest }),
  entry('solid-charcoal', 'dark', 'charcoal', { kind: 'solid', color: D.charcoal }),
  entry('solid-wine', 'dark', 'wine red', { kind: 'solid', color: D.wine }),
  entry('solid-teal', 'vivid', 'teal', { kind: 'solid', color: V.teal }),
  entry('solid-coral', 'vivid', 'coral', { kind: 'solid', color: V.coral }),
  entry('solid-mustard', 'vivid', 'mustard', { kind: 'solid', color: V.mustard }),
  entry('solid-cobalt', 'vivid', 'cobalt blue', { kind: 'solid', color: V.cobalt }),
  entry('solid-emerald', 'vivid', 'emerald', { kind: 'solid', color: V.emerald }),
];

const linears: BackgroundCatalogEntry[] = [
  entry('linear-peach-butter', 'light', 'peach to butter', {
    kind: 'linear',
    stops: [L.peach, L.butter],
    angleDeg: 135,
  }),
  entry('linear-sky-lavender', 'light', 'sky to lavender', {
    kind: 'linear',
    stops: [L.sky, L.lavender],
    angleDeg: 90,
  }),
  entry('linear-mint-sky', 'light', 'mint to sky', { kind: 'linear', stops: [L.mint, L.sky], angleDeg: 45 }),
  entry('linear-blush-cream', 'light', 'blush to cream', {
    kind: 'linear',
    stops: [L.blush, L.cream],
    angleDeg: 180,
  }),
  entry('linear-sage-pearl', 'light', 'sage to pearl', {
    kind: 'linear',
    stops: [L.sage, L.pearl, L.seafoam],
    angleDeg: 120,
  }),
  entry('linear-midnight-plum', 'dark', 'midnight to plum', {
    kind: 'linear',
    stops: [D.midnight, D.plum],
    angleDeg: 135,
  }),
  entry('linear-forest-teal', 'dark', 'forest to deep teal', {
    kind: 'linear',
    stops: [D.forest, D.deepTeal],
    angleDeg: 90,
  }),
  entry('linear-ink-slate', 'dark', 'ink to slate', { kind: 'linear', stops: [D.ink, D.slate], angleDeg: 0 }),
  entry('linear-wine-plum', 'dark', 'wine to plum', {
    kind: 'linear',
    stops: [D.wine, D.plum],
    angleDeg: 60,
  }),
  entry('linear-cobalt-midnight', 'vivid', 'cobalt to midnight', {
    kind: 'linear',
    stops: [V.cobalt, D.midnight],
    angleDeg: 160,
  }),
  entry('linear-coral-tangerine', 'vivid', 'coral to tangerine', {
    kind: 'linear',
    stops: [V.coral, V.tangerine],
    angleDeg: 30,
  }),
];

const radials: BackgroundCatalogEntry[] = [
  entry('radial-cream-sand', 'light', 'cream and sand', {
    kind: 'radial',
    stops: [L.cream, L.sand],
    center: [0.5, 0.45],
  }),
  entry('radial-pearl-sky', 'light', 'pearl and sky', {
    kind: 'radial',
    stops: [L.pearl, L.sky],
    center: [0.5, 0.5],
  }),
  entry('radial-butter-peach', 'light', 'butter and peach', {
    kind: 'radial',
    stops: [L.butter, L.peach],
    center: [0.3, 0.3],
  }),
  entry('radial-slate-ink', 'dark', 'slate and ink', {
    kind: 'radial',
    stops: [D.slate, D.ink],
    center: [0.5, 0.4],
  }),
  entry('radial-plum-midnight', 'dark', 'plum and midnight', {
    kind: 'radial',
    stops: [D.plum, D.midnight],
    center: [0.5, 0.5],
  }),
  entry('radial-teal-ink', 'dark', 'deep teal and ink', {
    kind: 'radial',
    stops: [D.deepTeal, D.ink],
    center: [0.7, 0.3],
  }),
  entry('radial-sunflower', 'vivid', 'sunflower', {
    kind: 'radial',
    stops: [V.sunflower, V.mustard],
    center: [0.5, 0.5],
  }),
  entry('radial-berry-wine', 'vivid', 'berry and wine', {
    kind: 'radial',
    stops: [V.berry, D.wine],
    center: [0.4, 0.6],
  }),
];

const patterns: BackgroundCatalogEntry[] = [
  entry('pattern-cream-dots', 'light', 'cream with navy', {
    kind: 'pattern',
    base: L.cream,
    ink: '#1b2a41',
    pattern: 'dots',
    scale: 1,
    opacity: 0.16,
  }),
  entry('pattern-sky-stripes', 'light', 'sky blue with white', {
    kind: 'pattern',
    base: L.sky,
    ink: '#ffffff',
    pattern: 'stripes',
    scale: 1.2,
    opacity: 0.6,
  }),
  entry('pattern-sage-grid', 'light', 'sage with forest', {
    kind: 'pattern',
    base: L.sage,
    ink: D.forest,
    pattern: 'grid',
    scale: 1,
    opacity: 0.14,
  }),
  entry('pattern-blush-chevron', 'light', 'blush with wine', {
    kind: 'pattern',
    base: L.blush,
    ink: D.wine,
    pattern: 'chevron',
    scale: 0.9,
    opacity: 0.12,
  }),
  entry('pattern-butter-dots', 'light', 'butter with mustard', {
    kind: 'pattern',
    base: L.butter,
    ink: V.mustard,
    pattern: 'dots',
    scale: 0.7,
    opacity: 0.5,
  }),
  entry('pattern-midnight-dots', 'dark', 'midnight with white', {
    kind: 'pattern',
    base: D.midnight,
    ink: '#ffffff',
    pattern: 'dots',
    scale: 0.8,
    opacity: 0.1,
  }),
  entry('pattern-charcoal-stripes', 'dark', 'charcoal with gold', {
    kind: 'pattern',
    base: D.charcoal,
    ink: '#c9a227',
    pattern: 'stripes',
    scale: 1,
    opacity: 0.14,
  }),
  entry('pattern-forest-grid', 'dark', 'forest with cream', {
    kind: 'pattern',
    base: D.forest,
    ink: L.cream,
    pattern: 'grid',
    scale: 1.3,
    opacity: 0.1,
  }),
  entry('pattern-teal-chevron', 'vivid', 'teal with white', {
    kind: 'pattern',
    base: V.teal,
    ink: '#ffffff',
    pattern: 'chevron',
    scale: 1.1,
    opacity: 0.1,
  }),
];

const textures: BackgroundCatalogEntry[] = [
  entry('texture-cream-paper', 'light', 'cream', {
    kind: 'texture',
    base: L.cream,
    grain: 'paper',
    intensity: 0.1,
    seed: 11,
  }),
  entry('texture-kraft-paper', 'light', 'kraft', {
    kind: 'texture',
    base: L.kraft,
    grain: 'paper',
    intensity: 0.12,
    seed: 23,
  }),
  entry('texture-pearl-linen', 'light', 'pearl', {
    kind: 'texture',
    base: L.pearl,
    grain: 'linen',
    intensity: 0.1,
    seed: 37,
  }),
  entry('texture-sage-linen', 'light', 'sage', {
    kind: 'texture',
    base: L.sage,
    grain: 'linen',
    intensity: 0.1,
    seed: 41,
  }),
  entry('texture-blush-noise', 'light', 'blush', {
    kind: 'texture',
    base: L.blush,
    grain: 'noise',
    intensity: 0.08,
    seed: 53,
  }),
  entry('texture-slate-noise', 'dark', 'slate', {
    kind: 'texture',
    base: D.slate,
    grain: 'noise',
    intensity: 0.1,
    seed: 67,
  }),
  entry('texture-midnight-paper', 'dark', 'midnight', {
    kind: 'texture',
    base: D.midnight,
    grain: 'paper',
    intensity: 0.1,
    seed: 71,
  }),
  entry('texture-wine-linen', 'dark', 'wine', {
    kind: 'texture',
    base: D.wine,
    grain: 'linen',
    intensity: 0.1,
    seed: 83,
  }),
];

export const BACKGROUND_CATALOG: readonly BackgroundCatalogEntry[] = [
  ...solids,
  ...linears,
  ...radials,
  ...patterns,
  ...textures,
];
