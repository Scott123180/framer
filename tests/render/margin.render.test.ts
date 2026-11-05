import { describe, expect, it } from 'vitest';
import type { DesignSpec, PrintSettings, Style } from '@shared/domain';
import { marginWidthPx, paddingPx, pixelSize } from '@shared/domain/print';
import { MainThreadRenderService } from '@engine/output/main-thread-render-service';
import { planDesign } from '@engine/output/render-service';
import { ENGINE_VERSION } from '@engine/layout/text-layout-engine';
import { parseHex } from '@engine/color';
import { decode, loadEngine, pixels } from './helpers';

const BG = '#dbe9f4';
const style = (fontId: string, family: string): Style => ({
  fontId,
  fontFamily: family,
  background: { kind: 'solid', color: BG },
  backgroundId: 'solid-sky',
  textColor: '#111111',
  attributionColor: '#1b2a41',
  comboKey: `${fontId}|solid-sky`,
});

const near = (data: Uint8ClampedArray, i: number, hex: string, tol = 8) => {
  const [r, g, b] = parseHex(hex);
  return (
    Math.abs(data[i]! - r) <= tol && Math.abs(data[i + 1]! - g) <= tol && Math.abs(data[i + 2]! - b) <= tol
  );
};

const sizes = ['4x6', '5x7', '8x10'] as const;
const orientations = ['portrait', 'landscape'] as const;

describe('frame-ready margin', () => {
  for (const size of sizes)
    for (const orientation of orientations)
      for (const margin of ['small', 'medium', 'large'] as const) {
        it(`${size} ${orientation} ${margin}: exact size, even mat band on every side, text inside`, async () => {
          const { engine, catalog } = await loadEngine();
          const font = catalog.byId('lora-500')!;
          const print: PrintSettings = { size, orientation, margin: { enabled: true, size: margin } };
          const spec: DesignSpec = {
            specVersion: 1,
            engineVersion: ENGINE_VERSION,
            quote: { text: 'Frame me', author: null },
            print,
            style: style(font.id, font.family),
          };
          const mat = engine.painters.get('solid').matTone(spec.style.background);
          const img = pixels(await decode(await new MainThreadRenderService(engine).renderPrint(spec)));
          const { width, height } = pixelSize(print);
          expect([img.width, img.height]).toEqual([width, height]);

          const m = Math.round(marginWidthPx(print));
          const pad = paddingPx(print);
          const at = (x: number, y: number) => (y * width + x) * 4;
          const midX = Math.floor(width / 2);
          const midY = Math.floor(height / 2);
          const probes: Array<[string, (d: number) => number]> = [
            ['left', (d) => at(d, midY)],
            ['right', (d) => at(width - 1 - d, midY)],
            ['top', (d) => at(midX, d)],
            ['bottom', (d) => at(midX, height - 1 - d)],
          ];
          for (const [side, px] of probes) {
            for (let d = 0; d <= m - 2; d += 3)
              expect(
                near(img.data, px(d), mat),
                `${side} mat at ${d}: ${[...img.data.slice(px(d), px(d) + 3)]} vs ${mat}`,
              ).toBe(true);
            expect(near(img.data, px(m + 2), BG), `${side} background just inside the band`).toBe(true);
            expect(near(img.data, px(Math.floor(m + pad / 2)), BG), `${side} background in the padding`).toBe(
              true,
            );
          }

          const plan = planDesign(spec, engine);
          for (const line of plan.lines) {
            const w = engine.measurer.width(line.text, line.font);
            const { ascent, descent } = engine.measurer.metrics(line.font);
            expect(line.x).toBeGreaterThanOrEqual(plan.safeArea.x - 0.5);
            expect(line.x + w).toBeLessThanOrEqual(plan.safeArea.x + plan.safeArea.width + 0.5);
            expect(line.y - ascent).toBeGreaterThanOrEqual(plan.safeArea.y - 0.5);
            expect(line.y + descent).toBeLessThanOrEqual(plan.safeArea.y + plan.safeArea.height + 0.5);
          }
        });
      }

  it('draws no mat band with the margin off', async () => {
    const { engine, catalog } = await loadEngine();
    const font = catalog.byId('lora-500')!;
    const spec: DesignSpec = {
      specVersion: 1,
      engineVersion: ENGINE_VERSION,
      quote: { text: 'No frame', author: null },
      print: { size: '4x6', orientation: 'portrait', margin: { enabled: false } },
      style: style(font.id, font.family),
    };
    const img = pixels(await decode(await new MainThreadRenderService(engine).renderPrint(spec)));
    const midY = 900;
    for (const x of [0, 5, 20, 1199]) expect(near(img.data, (midY * 1200 + x) * 4, BG)).toBe(true);
  });
});
