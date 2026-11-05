import { FontManifest, type Font, type FontCategory } from '@shared/domain';

export const EMOJI_FALLBACK_FAMILY = 'Noto Color Emoji';

export type FontCatalog = {
  all: readonly Font[];
  /** Fonts a style may use (everything except fallbacks). */
  pickable: readonly Font[];
  emojiFallback: Font | undefined;
  byId(id: string): Font | undefined;
  byCategory(category: FontCategory): readonly Font[];
};

export function loadFontCatalog(manifestJson: unknown): FontCatalog {
  const all = FontManifest.parse(manifestJson);
  const pickable = all.filter((f) => f.role !== 'emoji-fallback');
  const byId = new Map(all.map((f) => [f.id, f]));
  return {
    all,
    pickable,
    emojiFallback: all.find((f) => f.role === 'emoji-fallback'),
    byId: (id) => byId.get(id),
    byCategory: (category) => pickable.filter((f) => f.category === category),
  };
}
