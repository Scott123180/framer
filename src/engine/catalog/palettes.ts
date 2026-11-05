import type { Hex } from '@shared/domain';

/** Named colors the background catalog is built from, grouped by mood. */
export const PALETTE = {
  light: {
    cream: '#f7f1e3',
    blush: '#f6dfe0',
    sage: '#dfe8d8',
    sky: '#dbe9f4',
    sand: '#ede0c8',
    lavender: '#e9e3f3',
    mint: '#dff3ea',
    peach: '#fbe3d3',
    butter: '#faf0c8',
    pearl: '#f2f2f0',
    rose: '#f3d1d6',
    seafoam: '#cfe9e4',
    kraft: '#d9c3a0',
  },
  dark: {
    midnight: '#14213d',
    forest: '#1d3b2a',
    charcoal: '#2b2b2b',
    wine: '#4a1c2c',
    ink: '#1c2333',
    plum: '#3a2142',
    espresso: '#2e211b',
    slate: '#2f3e46',
    deepTeal: '#0f3d3e',
  },
  vivid: {
    teal: '#0f6466',
    coral: '#f4978e',
    mustard: '#e8b84a',
    cobalt: '#1f4e9c',
    emerald: '#13795b',
    berry: '#8e2c5a',
    tangerine: '#f6a04d',
    sunflower: '#f7d154',
  },
} as const satisfies Record<string, Record<string, Hex>>;

/** Text inks a style may use; the contrast policy keeps only those legible on the background. */
export const TEXT_INKS: readonly Hex[] = [
  '#111111', // near-black
  '#1b2a41', // navy
  '#2b2118', // espresso
  '#1f3b2d', // forest
  '#3d1e2c', // plum
  '#ffffff', // white
  '#fdf6e3', // cream
  '#f3e5c3', // champagne
  '#e6f0f3', // ice
];
