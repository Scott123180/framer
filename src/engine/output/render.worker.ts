import { loadFontCatalog } from '../catalog/fonts';
import { registerFonts } from './font-registry';
import { createRenderEngine, drawPreview, encodePrint, type RenderEngine } from './render-service';
import type { RenderRequest, RenderResponse } from './protocol';

type WorkerScope = {
  fonts: FontFaceSet;
  onmessage: ((e: MessageEvent<RenderRequest>) => void) | null;
  postMessage(message: RenderResponse, transfer?: Transferable[]): void;
};

const scope = self as unknown as WorkerScope;
let engine: Promise<RenderEngine> | null = null;

async function handle(req: RenderRequest): Promise<void> {
  try {
    if (req.type === 'init') {
      engine = (async () => {
        const catalog = loadFontCatalog(req.manifest);
        await registerFonts(scope.fonts, req.fonts);
        const measureCtx = new OffscreenCanvas(1, 1).getContext('2d');
        if (!measureCtx) throw new Error('2D canvas is not available in the worker');
        return createRenderEngine(catalog, measureCtx);
      })();
      await engine;
      scope.postMessage({ id: req.id, ok: true, type: 'ready' });
      return;
    }
    if (!engine) throw new Error('Render worker used before init');
    const e = await engine;
    if (req.type === 'preview') {
      const bitmap = drawPreview(req.spec, req.width, e).transferToImageBitmap();
      scope.postMessage({ id: req.id, ok: true, type: 'preview', bitmap }, [bitmap]);
    } else {
      const jpeg = await encodePrint(req.spec, e);
      scope.postMessage({ id: req.id, ok: true, type: 'print', jpeg }, [jpeg]);
    }
  } catch (error) {
    scope.postMessage({
      id: req.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

scope.onmessage = (e) => void handle(e.data);
