/// <reference lib="dom" />
import { test, expect } from './fixtures';
import { expectNoSeriousA11yViolations } from './a11y';
import { SHORT } from '../fixtures/quotes';

test('reflows from 1280 px down to 360 px with every region populated', async ({ app }) => {
  const { page } = app;
  await expect(page.getByRole('button', { name: 'Generate designs' })).toBeEnabled({ timeout: 15_000 });
  await page.getByRole('switch', { name: 'Frame-ready margin' }).click();
  await page.getByRole('textbox', { name: 'Quote' }).fill(SHORT.text);
  await page.getByRole('button', { name: 'Generate designs' }).click();
  const cards = page.getByRole('region', { name: 'Design options' }).getByRole('checkbox');
  await expect(cards).toHaveCount(12, { timeout: 5_000 });
  await cards.first().check();
  await page.getByRole('button', { name: 'Save selected (1)' }).click();
  await expect(page.getByRole('status').filter({ hasText: /^Saved 1 image/ })).toBeVisible();

  const overflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  // Wide: History sits beside the gallery.
  const gallery = await page.getByRole('region', { name: 'Design options' }).boundingBox();
  const history = await page.getByRole('complementary', { name: 'History' }).boundingBox();
  expect(history!.x).toBeGreaterThanOrEqual(gallery!.x + gallery!.width - 1);
  expect(await overflow()).toBeLessThanOrEqual(0);
  await expectNoSeriousA11yViolations(page, '1280px populated');

  // Narrow: one or two columns, History behind a toggle, no horizontal scroll.
  await app.resizeWindow(360, 600);
  expect(await overflow()).toBeLessThanOrEqual(0);
  const xs = new Set<number>();
  for (const c of await cards.all()) {
    const box = await c.boundingBox();
    if (box) xs.add(Math.round(box.x));
  }
  expect(xs.size).toBeGreaterThanOrEqual(1);
  expect(xs.size).toBeLessThanOrEqual(2);
  const toggle = page.getByRole('button', { name: 'History' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(page.getByRole('tablist', { name: 'History' })).toBeVisible();
  expect(await overflow()).toBeLessThanOrEqual(0);
  await expectNoSeriousA11yViolations(page, '360px populated');
});
