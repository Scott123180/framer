import { describe, expect, it } from 'vitest';
import { WorkerRenderService } from '@engine/output/worker-render-service';
import { MainThreadRenderService } from '@engine/output/main-thread-render-service';
import { requiredCodePoints } from '@engine/generate/glyph-coverage';
import { ENGINE_VERSION } from '@engine/layout/text-layout-engine';
import type { DesignSpec } from '@shared/domain';
import { SHORT } from '../fixtures/quotes';
import { decode, jfifDensity, loadEngine, pixels } from './helpers';

describe('WorkerRenderService', () => {
  it('renders the same pixels as MainThreadRenderService (interchangeable)', async () => {
    const { engine, generator, files } = await loadEngine();
    const manifest = await (await fetch('/assets/fonts/fonts.manifest.json')).json();
    const worker = await WorkerRenderService.create(manifest, files);
    const main = new MainThreadRenderService(engine);
    const [style] = generator.generate({
      count: 1,
      requiredCodePoints: requiredCodePoints(SHORT.text, SHORT.author),
      exclude: new Set(),
      seed: 9,
    }).styles;
    const spec: DesignSpec = {
      specVersion: 1,
      engineVersion: ENGINE_VERSION,
      quote: SHORT,
      print: { size: '4x6', orientation: 'portrait', margin: { enabled: false } },
      style: style!,
    };

    const [wp, mp] = await Promise.all([worker.renderPreview(spec, 200), main.renderPreview(spec, 200)]);
    expect([wp.width, wp.height]).toEqual([200, 300]);
    const a = pixels(wp).data;
    const b = pixels(mp).data;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff += Math.abs(a[i]! - b[i]!);
    expect(diff / a.length).toBeLessThan(1);

    const jpeg = await worker.renderPrint(spec);
    expect(jfifDensity(jpeg)).toEqual({ units: 1, x: 300, y: 300 });
    const print = await decode(jpeg);
    expect([print.width, print.height]).toEqual([1200, 1800]);
  });

  it('rejects when a design no longer fits', async () => {
    const { files, generator } = await loadEngine();
    const manifest = await (await fetch('/assets/fonts/fonts.manifest.json')).json();
    const worker = await WorkerRenderService.create(manifest, files);
    const [style] = generator.generate({
      count: 1,
      requiredCodePoints: new Set(),
      exclude: new Set(),
      seed: 1,
    }).styles;
    const spec = {
      specVersion: 1,
      engineVersion: ENGINE_VERSION,
      quote: { text: 'x'.repeat(5000), author: null },
      print: { size: '4x6', orientation: 'portrait', margin: { enabled: false } },
      style: style!,
    } as DesignSpec;
    await expect(worker.renderPrint(spec)).rejects.toThrow(/no longer fits/);
  });
});
