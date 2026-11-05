import { describe, expect, it } from 'vitest';
import type { DesignSpec, PrintSettings, Style } from '@shared/domain';
import { pixelSize } from '@shared/domain/print';
import { MainThreadRenderService } from '@engine/output/main-thread-render-service';
import { planDesign } from '@engine/output/render-service';
import { drawDesign } from '@engine/paint/draw-design';
import { requiredCodePoints } from '@engine/generate/glyph-coverage';
import { contrastRatio } from '@engine/generate/contrast';
import { ENGINE_VERSION } from '@engine/layout/text-layout-engine';
import type { DrawPlan } from '@engine/layout/types';
import { LONG_500, SHORT, UNICODE } from '../fixtures/quotes';
import { decode, jfifDensity, loadEngine, pixels } from './helpers';

const PORTRAIT_4X6: PrintSettings = { size: '4x6', orientation: 'portrait', margin: { enabled: false } };

const specFor = (
  style: Style,
  quote: { text: string; author: string | null },
  print = PORTRAIT_4X6,
): DesignSpec => ({
  specVersion: 1,
  engineVersion: ENGINE_VERSION,
  quote: { text: quote.text, author: quote.author },
  print,
  style,
});

async function stylesFor(quote: { text: string; author: string | null }, seed = 1) {
  const { generator } = await loadEngine();
  return generator.generate({
    count: 12,
    requiredCodePoints: requiredCodePoints(quote.text, quote.author),
    exclude: new Set(),
    seed,
  }).styles;
}

describe('MainThreadRenderService', () => {
  it('renders a 4x6 portrait print at exactly 1200×1800 with a 300 DPI header', async () => {
    const { engine } = await loadEngine();
    const [style] = await stylesFor(SHORT);
    const jpeg = await new MainThreadRenderService(engine).renderPrint(specFor(style!, SHORT));
    const bitmap = await decode(jpeg);
    expect([bitmap.width, bitmap.height]).toEqual([1200, 1800]);
    expect(jfifDensity(jpeg)).toEqual({ units: 1, x: 300, y: 300 });
  });

  for (const [name, quote] of [
    ['SHORT', SHORT],
    ['LONG_500', LONG_500],
    ['UNICODE', UNICODE],
  ] as const) {
    it(`keeps every measured line inside the safe area for ${name} (SC-004)`, async () => {
      const { engine } = await loadEngine();
      const styles = await stylesFor(quote);
      expect(styles.length).toBe(12);
      for (const style of styles) {
        const plan = planDesign(specFor(style, quote), engine);
        const a = plan.safeArea;
        for (const line of plan.lines) {
          const w = engine.measurer.width(line.text, line.font);
          const { ascent, descent } = engine.measurer.metrics(line.font);
          const where = `${style.fontId} "${line.text}"`;
          expect(line.x, where).toBeGreaterThanOrEqual(a.x - 0.5);
          expect(line.x + w, where).toBeLessThanOrEqual(a.x + a.width + 0.5);
          expect(line.y - ascent, where).toBeGreaterThanOrEqual(a.y - 0.5);
          expect(line.y + descent, where).toBeLessThanOrEqual(a.y + a.height + 0.5);
        }
      }
    });
  }

  it('keeps ≥ 4.5:1 contrast between text color and the background under every quote line (SC-005)', async () => {
    const { engine } = await loadEngine();
    for (const style of await stylesFor(SHORT, 7)) {
      const spec = specFor(style, SHORT);
      const plan = planDesign(spec, engine);
      const { width, height } = plan.canvas;
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d')!;
      // The background exactly as drawn under the text: same pipeline, no lines.
      drawDesign(ctx, { ...plan, lines: [] }, style, engine.painters, 1);
      const data = ctx.getImageData(0, 0, width, height).data;
      for (const line of plan.lines) {
        const w = engine.measurer.width(line.text, line.font);
        const { ascent, descent } = engine.measurer.metrics(line.font);
        const inset = 2; // skip anti-aliased edges
        for (let y = Math.ceil(line.y - ascent) + inset; y < line.y + descent - inset; y += 7) {
          for (let x = Math.ceil(line.x) + inset; x < line.x + w - inset; x += 7) {
            const i = (y * width + x) * 4;
            const hex = `#${[data[i]!, data[i + 1]!, data[i + 2]!].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
            expect(contrastRatio(hex, line.color), `${style.comboKey} at ${x},${y}`).toBeGreaterThanOrEqual(
              4.5,
            );
          }
        }
      }
    }
  });

  it('uses the same plan for preview and print, and the print downscaled matches the preview (FR-010)', async () => {
    const { engine } = await loadEngine();
    for (const style of (await stylesFor(SHORT, 3)).slice(0, 6)) {
      const plans: DrawPlan[] = [];
      const service = new MainThreadRenderService(engine, { onPlan: (p) => plans.push(p) });
      const spec = specFor(style, SHORT);
      const previewWidth = 300;
      const preview = await service.renderPreview(spec, previewWidth);
      const print = await decode(await service.renderPrint(spec));
      expect(plans).toHaveLength(2);
      expect(plans[0]).toEqual(plans[1]);

      const { width, height } = pixelSize(spec.print);
      const previewHeight = Math.round((previewWidth * height) / width);
      expect([preview.width, preview.height]).toEqual([previewWidth, previewHeight]);
      const a = pixels(preview).data;
      const b = pixels(print, previewWidth, previewHeight).data;
      let sum = 0;
      let big = 0;
      for (let i = 0; i < a.length; i += 4) {
        let worst = 0;
        for (let c = 0; c < 3; c++) {
          const d = Math.abs(a[i + c]! - b[i + c]!);
          sum += d;
          worst = Math.max(worst, d);
        }
        if (worst > 16) big++;
      }
      const pixelsCount = a.length / 4;
      expect(sum / (pixelsCount * 3), style.comboKey).toBeLessThanOrEqual(2);
      expect(big / pixelsCount, style.comboKey).toBeLessThanOrEqual(0.005);
    }
  });

  it('draws the 🌻 emoji in color, not as a missing-glyph box', async () => {
    const { engine, catalog } = await loadEngine();
    const font = catalog.byId('lora-500')!;
    const style: Style = {
      fontId: font.id,
      fontFamily: font.family,
      background: { kind: 'solid', color: '#ffffff' },
      backgroundId: 'test-white',
      textColor: '#111111',
      attributionColor: '#333333',
      comboKey: `${font.id}|test-white`,
    };
    const spec = specFor(style, { text: 'Sun 🌻', author: null });
    const plan = planDesign(spec, engine);
    const line = plan.lines.find((l) => l.text.includes('🌻'))!;
    const before = engine.measurer.width(line.text.slice(0, line.text.indexOf('🌻')), line.font);
    const emojiW = engine.measurer.width('🌻', line.font);
    const { ascent, descent } = engine.measurer.metrics(line.font);
    const img = pixels(await decode(await new MainThreadRenderService(engine).renderPrint(spec)));
    let colorful = 0;
    for (let y = Math.floor(line.y - ascent); y < line.y + descent; y += 3) {
      for (let x = Math.floor(line.x + before); x < line.x + before + emojiW; x += 3) {
        const i = (y * img.width + x) * 4;
        const [r, g, b] = [img.data[i]!, img.data[i + 1]!, img.data[i + 2]!];
        if (Math.max(r, g, b) - Math.min(r, g, b) > 60) colorful++;
      }
    }
    expect(colorful).toBeGreaterThan(50);
  });
});
