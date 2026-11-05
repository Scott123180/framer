/// <reference lib="dom" />
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test, expect } from './fixtures';
import { expectNoSeriousA11yViolations } from './a11y';
import { readJfifDensity, readJpegSize } from './jpeg';
import { SHORT } from '../fixtures/quotes';

test('turns a quote into a print-ready 4x6 JPEG', async ({ app }) => {
  const { page } = app;
  const compose = page.getByRole('region', { name: 'Quote' });
  const options = page.getByRole('region', { name: 'Design options' });

  await expect(compose.getByRole('button', { name: 'Generate designs' })).toBeEnabled({ timeout: 15_000 });
  await compose.getByRole('textbox', { name: 'Quote' }).fill(SHORT.text);
  await compose.getByRole('textbox', { name: 'Author (optional)' }).fill(SHORT.author);

  const started = Date.now();
  await compose.getByRole('button', { name: 'Generate designs' }).click();
  await expect(options.getByRole('status').filter({ hasText: '12 designs ready.' })).toBeVisible({
    timeout: 3_000,
  });
  await expect(options.getByRole('checkbox')).toHaveCount(12);
  expect(Date.now() - started).toBeLessThan(3_000);

  await expectNoSeriousA11yViolations(page, 'options shown');

  await options.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Save selected (1)' }).click();
  await expect(page.getByRole('status').filter({ hasText: /^Saved 1 image\(s\) to / })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show in folder' })).toBeVisible();

  const files = await readdir(app.exportDir);
  expect(files).toHaveLength(1);
  expect(files[0]).toMatch(/^framer-be-the-change-.*-4x6-portrait\.jpg$/);
  const exported = join(app.exportDir, files[0]!);
  expect(await readJpegSize(exported)).toEqual({ width: 1200, height: 1800 });
  expect(await readJfifDensity(exported)).toEqual({ units: 1, x: 300, y: 300 });

  const library = JSON.parse(await readFile(join(app.userDataDir, 'library.json'), 'utf8'));
  expect(library.designs).toHaveLength(1);
  const thumb = join(app.userDataDir, library.designs[0].thumbPath);
  const t = await readJpegSize(thumb);
  expect(Math.max(t.width, t.height)).toBe(400);

  await app.resizeWindow(360, 600);
  const xs = new Set<number>();
  for (const box of await options.getByRole('checkbox').all()) {
    const card = await box.locator('xpath=..').boundingBox();
    if (card) xs.add(Math.round(card.x));
  }
  expect(xs.size).toBeGreaterThanOrEqual(1);
  expect(xs.size).toBeLessThanOrEqual(2);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
