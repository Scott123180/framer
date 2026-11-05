import type { DesignSpec, PrintSettings, Style } from '@shared/domain';
import { DEFAULT_PRINT_SETTINGS } from '@shared/domain/print';

/** Builds a Style for tests. */
export function makeStyle(n: number, over: Partial<Style> = {}): Style {
  const fontId = over.fontId ?? `font-${n}`;
  const backgroundId = over.backgroundId ?? `bg-${n}`;
  return {
    fontId,
    fontFamily: `Family ${n}`,
    background: { kind: 'solid', color: '#ffffff' },
    backgroundId,
    textColor: '#111111',
    attributionColor: '#333333',
    comboKey: `${fontId}|${backgroundId}`,
    ...over,
  };
}

export function makeSpec(
  n: number,
  print: PrintSettings = DEFAULT_PRINT_SETTINGS,
  quote = { text: 'Hello', author: null as string | null },
): DesignSpec {
  return { specVersion: 1, engineVersion: '1.0.0', quote, print, style: makeStyle(n) };
}

export function makeOptions(count: number, print: PrintSettings = DEFAULT_PRINT_SETTINGS) {
  return Array.from({ length: count }, (_, i) => ({ id: `opt-${i + 1}`, spec: makeSpec(i + 1, print) }));
}
