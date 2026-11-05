import type { FramerApi } from '@shared/ipc/framer-api';
import { loadFontCatalog } from '@engine/catalog/fonts';
import { BACKGROUND_CATALOG } from '@engine/catalog/backgrounds';
import { CatalogStyleGenerator } from '@engine/generate/catalog-style-generator';
import { WcagContrastPolicy } from '@engine/generate/contrast';
import { FontkitGlyphCoverage } from '@engine/generate/glyph-coverage';
import { mulberry32 } from '@engine/generate/prng';
import type { FontFile } from '@engine/output/font-registry';
import { createRenderEngine, type RenderService } from '@engine/output/render-service';
import type { Canvas2D } from '@engine/paint/types';
import type { DesignSpec } from '@shared/domain';
import { relayoutOptions } from '../features/options/relayout-options';
import {
  generateOptionSet,
  type GenerateInput,
  type GeneratedOptionSet,
} from '../features/options/generate-option-set';

export type RendererDeps = {
  api: FramerApi;
  renderService: RenderService;
  generate(input: GenerateInput): GeneratedOptionSet;
  /** Ids of the options that still fit at their print settings. */
  relayout(options: ReadonlyArray<{ id: string; spec: DesignSpec }>): string[];
};

/** Platform pieces the composition root needs; the defaults are wired in main.tsx. */
export type RendererPlatform = {
  manifest: unknown;
  registerFonts(files: FontFile[]): Promise<void>;
  createRenderService(manifest: unknown, files: FontFile[]): Promise<RenderService>;
  measureContext(): Canvas2D;
};

/**
 * Renderer composition root: the only place that chooses real implementations. Loads every font
 * once, then builds the generator, layout engine, and render service around them.
 */
export async function createRendererDeps(api: FramerApi, platform: RendererPlatform): Promise<RendererDeps> {
  const catalog = loadFontCatalog(platform.manifest);
  const res = await api.loadFontFiles(catalog.all.map((f) => f.id));
  if (!res.ok) throw new Error(res.error.message);
  const bytes = new Map(res.value.map((f) => [f.id, f.bytes]));
  const files: FontFile[] = catalog.all.map((f) => {
    const b = bytes.get(f.id);
    if (!b) throw new Error(`Font ${f.id} was not loaded`);
    return { id: f.id, family: f.family, weight: f.weight, style: f.style, bytes: b };
  });

  // Read glyph coverage before handing the bytes to FontFace and the worker.
  const coverage = FontkitGlyphCoverage.fromFonts(files.filter((f) => f.id !== catalog.emojiFallback?.id));
  const [renderService] = await Promise.all([
    platform.createRenderService(platform.manifest, files),
    platform.registerFonts(files),
  ]);

  const engine = createRenderEngine(catalog, platform.measureContext());
  const generator = new CatalogStyleGenerator(
    catalog,
    BACKGROUND_CATALOG,
    engine.painters,
    coverage,
    new WcagContrastPolicy(),
    mulberry32,
  );
  return {
    api,
    renderService,
    generate: (input) =>
      generateOptionSet(input, { generator, layout: engine.layout, measurer: engine.measurer }),
    relayout: (options) => relayoutOptions(options, engine),
  };
}
