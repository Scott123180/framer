/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
import { test, expect } from './fixtures';
import { LONG_500 } from '../fixtures/quotes';

test('shows designs for a 500-character 8x10 landscape quote within 3 s (SC-002)', async ({ app }) => {
  const { page } = app;
  await expect(page.getByRole('button', { name: 'Generate designs' })).toBeEnabled({ timeout: 15_000 });
  await page.getByRole('radio', { name: '8x10' }).check();
  await page.getByRole('radio', { name: 'Landscape' }).check();
  await page.getByRole('textbox', { name: 'Quote' }).fill(LONG_500.text);
  await page.getByRole('textbox', { name: 'Author (optional)' }).fill(LONG_500.author);
  const status = page.getByRole('region', { name: 'Design options' }).getByRole('status').first();

  for (const label of ['Generate designs', 'Regenerate designs']) {
    const started = Date.now();
    await page.getByRole('button', { name: label }).click();
    await expect(status).toHaveText(/designs ready\.|so showing \d+ designs\./, { timeout: 3_000 });
    const atStatus = Date.now() - started;
    // Previews are visible once every card's canvas has received its rendered bitmap.
    await page.waitForFunction(
      () => {
        const canvases = [...document.querySelectorAll('canvas[role="img"]')] as HTMLCanvasElement[];
        return canvases.length > 0 && canvases.every((c) => c.dataset.ready === 'true');
      },
      undefined,
      { timeout: 3_000 },
    );
    const elapsed = Date.now() - started;
    console.log(`${label}: ${atStatus} ms to status, ${elapsed} ms until every preview is drawn`);
    expect(elapsed).toBeLessThan(3_000);
  }
});
