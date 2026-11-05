import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test, expect } from './fixtures';
import { SHORT } from '../fixtures/quotes';

test('regenerates without repeats and saves several designs', async ({ app }) => {
  const { page } = app;
  const options = page.getByRole('region', { name: 'Design options' });
  const cards = options.getByRole('checkbox');
  const comboKeys = async () => Promise.all((await cards.all()).map((c) => c.getAttribute('data-combo-key')));

  await expect(page.getByRole('button', { name: 'Generate designs' })).toBeEnabled({ timeout: 15_000 });
  await page.getByRole('textbox', { name: 'Quote' }).fill(SHORT.text);
  await page.getByRole('textbox', { name: 'Author (optional)' }).fill(SHORT.author);
  await page.getByRole('button', { name: 'Generate designs' }).click();
  await expect(cards).toHaveCount(12, { timeout: 5_000 });
  const first = await comboKeys();

  await page.getByRole('button', { name: 'Regenerate designs' }).click();
  await expect(options.getByRole('status').first()).toHaveText('12 designs ready.', { timeout: 5_000 });
  await expect(cards).toHaveCount(12);
  const second = await comboKeys();
  expect(new Set(second).size).toBe(12);
  expect(second.filter((k) => first.includes(k))).toEqual([]);

  await expect(page.getByRole('button', { name: 'Save selected (0)' })).toBeDisabled();
  await expect(page.getByText('Select at least one design to save.')).toBeVisible();

  for (const i of [0, 3, 7]) await cards.nth(i).check();
  await page.getByRole('button', { name: 'Save selected (3)' }).click();
  await expect(page.getByRole('status').filter({ hasText: /^Saved 3 image\(s\) to / })).toBeVisible();

  const files = (await readdir(app.exportDir)).filter((f) => f.endsWith('.jpg'));
  expect(new Set(files).size).toBe(3);
  const library = JSON.parse(await readFile(join(app.userDataDir, 'library.json'), 'utf8'));
  expect(library.designs).toHaveLength(3);
});
