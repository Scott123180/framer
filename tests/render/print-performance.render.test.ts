import { describe, expect, it } from 'vitest';
import { MainThreadRenderService } from '@engine/output/main-thread-render-service';
import { requiredCodePoints } from '@engine/generate/glyph-coverage';
import { ENGINE_VERSION } from '@engine/layout/text-layout-engine';
import { LONG_500 } from '../fixtures/quotes';
import { loadEngine } from './helpers';

describe('print performance', () => {
  it('renders and encodes an 8x10 print quickly (target < 1 s; asserts < 3 s)', async () => {
    const { engine, generator } = await loadEngine();
    const [style] = generator.generate({
      count: 1,
      requiredCodePoints: requiredCodePoints(LONG_500.text, LONG_500.author),
      exclude: new Set(),
      seed: 1,
    }).styles;
    const service = new MainThreadRenderService(engine);
    const spec = {
      specVersion: 1 as const,
      engineVersion: ENGINE_VERSION,
      quote: LONG_500,
      print: {
        size: '8x10' as const,
        orientation: 'landscape' as const,
        margin: { enabled: true as const, size: 'medium' as const },
      },
      style: style!,
    };
    const started = performance.now();
    const jpeg = await service.renderPrint(spec);
    const elapsed = performance.now() - started;
    console.log(`8x10 renderPrint: ${elapsed.toFixed(0)} ms, ${(jpeg.byteLength / 1024).toFixed(0)} KB`);
    expect(elapsed).toBeLessThan(3_000);
  });
});
