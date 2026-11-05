import type { Style } from '@shared/domain';
import { BACKGROUND_CATALOG, type BackgroundCatalogEntry } from './backgrounds';

const PATTERN_NOUN = { dots: 'dots', stripes: 'stripes', grid: 'grid', chevron: 'chevrons' } as const;

/** A short, human description of a background for accessible names, e.g. "peach to butter gradient". */
export function describeBackground(entry: Pick<BackgroundCatalogEntry, 'spec' | 'label'>): string {
  const { spec, label } = entry;
  switch (spec.kind) {
    case 'solid':
      return `plain ${label}`;
    case 'linear':
      return `${label} gradient`;
    case 'radial':
      return `${label} glow`;
    case 'pattern':
      return `${label} ${PATTERN_NOUN[spec.pattern]}`;
    case 'texture':
      return `${label} ${spec.grain} texture`;
  }
}

const byId = new Map(BACKGROUND_CATALOG.map((b) => [b.id, b]));

/** Describes a style's background, falling back to its kind if the catalog no longer has it. */
export function describeStyleBackground(style: Style): string {
  const entry = byId.get(style.backgroundId);
  return entry ? describeBackground(entry) : `${style.background.kind} background`;
}
