import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { RenderService } from '@engine/output/render-service';
import type { RendererPlatform } from '../app/composition';
import type { InMemoryFramerApi } from './in-memory-framer-api';

const ROOT = resolve(import.meta.dirname, '../../../..');
export const manifest = JSON.parse(
  readFileSync(resolve(ROOT, 'assets/fonts/fonts.manifest.json'), 'utf8'),
) as Array<{
  id: string;
  file: string;
}>;

/** Makes the in-memory API serve real font bytes from assets/fonts. */
export function serveRealFonts(api: InMemoryFramerApi): void {
  const files = new Map(manifest.map((f) => [f.id, f.file]));
  api.loadFontFiles = async (ids: string[]) => {
    api.calls.push({ method: 'loadFontFiles', args: [ids] });
    return {
      ok: true,
      value: ids.map((id) => {
        const b = readFileSync(resolve(ROOT, 'assets/fonts', files.get(id)!));
        return { id, bytes: b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer };
      }),
    };
  };
}

/** A measuring context with fixed-width glyphs, for running layout in Node. */
export function fakeMeasureContext() {
  let size = 10;
  return {
    set font(css: string) {
      size = Number(/(\d+(?:\.\d+)?)px/.exec(css)?.[1] ?? 10);
    },
    get font() {
      return `${size}px x`;
    },
    measureText: (text: string) => ({
      width: [...text].length * 0.5 * size,
      fontBoundingBoxAscent: 0.8 * size,
      fontBoundingBoxDescent: 0.2 * size,
    }),
  };
}

export function fakeRenderService(): RenderService & { prints: number } {
  const svc = {
    prints: 0,
    renderPreview: async () => ({ width: 1, height: 1, close() {} }) as unknown as ImageBitmap,
    renderPrint: async () => {
      svc.prints++;
      return new Uint8Array([0xff, 0xd8, 0xff, 0xd9]).buffer;
    },
  };
  return svc;
}

export function fakePlatform(
  renderService: RenderService = fakeRenderService(),
): RendererPlatform & { registered: number } {
  const platform = {
    registered: 0,
    manifest,
    registerFonts: async (files: unknown[]) => {
      platform.registered = files.length;
    },
    createRenderService: async () => renderService,
    measureContext: () => fakeMeasureContext() as never,
  };
  return platform;
}
