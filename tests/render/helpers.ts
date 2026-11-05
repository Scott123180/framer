import { loadFontCatalog, type FontCatalog } from '@engine/catalog/fonts';
import { BACKGROUND_CATALOG } from '@engine/catalog/backgrounds';
import { registerFonts, type FontFile } from '@engine/output/font-registry';
import { createRenderEngine, type RenderEngine } from '@engine/output/render-service';
import { CatalogStyleGenerator } from '@engine/generate/catalog-style-generator';
import { FontkitGlyphCoverage } from '@engine/generate/glyph-coverage';
import { WcagContrastPolicy, relativeLuminance } from '@engine/generate/contrast';
import { mulberry32 } from '@engine/generate/prng';

export type Loaded = {
  catalog: FontCatalog;
  files: FontFile[];
  engine: RenderEngine;
  generator: CatalogStyleGenerator;
};

let loaded: Promise<Loaded> | null = null;

/** Loads the real fonts once per test file, registers them on document.fonts, and builds the engine. */
export function loadEngine(): Promise<Loaded> {
  loaded ??= (async () => {
    const manifest = await (await fetch('/assets/fonts/fonts.manifest.json')).json();
    const catalog = loadFontCatalog(manifest);
    const files: FontFile[] = await Promise.all(
      catalog.all.map(async (f) => ({
        id: f.id,
        family: f.family,
        weight: f.weight,
        style: f.style,
        bytes: await (await fetch(`/assets/fonts/${f.file}`)).arrayBuffer(),
      })),
    );
    await registerFonts(document.fonts, files);
    const measureCtx = new OffscreenCanvas(1, 1).getContext('2d')!;
    const engine = createRenderEngine(catalog, measureCtx);
    const coverage = FontkitGlyphCoverage.fromFonts(files.filter((f) => f.id !== catalog.emojiFallback?.id));
    const generator = new CatalogStyleGenerator(
      catalog,
      BACKGROUND_CATALOG,
      engine.painters,
      coverage,
      new WcagContrastPolicy(),
      mulberry32,
    );
    return { catalog, files, engine, generator };
  })();
  return loaded;
}

export function pixelLuminance(data: Uint8ClampedArray, i: number): number {
  const hex = `#${[data[i]!, data[i + 1]!, data[i + 2]!].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  return relativeLuminance(hex);
}

export async function decode(jpeg: ArrayBuffer): Promise<ImageBitmap> {
  return createImageBitmap(new Blob([jpeg], { type: 'image/jpeg' }));
}

export function pixels(
  bitmap: ImageBitmap | OffscreenCanvas,
  width = bitmap.width,
  height = bitmap.height,
): ImageData {
  const c = new OffscreenCanvas(width, height);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

export function jfifDensity(jpeg: ArrayBuffer): { units: number; x: number; y: number } {
  const b = new Uint8Array(jpeg);
  return { units: b[13]!, x: (b[14]! << 8) | b[15]!, y: (b[16]! << 8) | b[17]! };
}
