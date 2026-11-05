import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { test, expect, type FramerApp } from './fixtures';
import { readJpegSize } from './jpeg';
import { SHORT } from '../fixtures/quotes';

/** Accessible name of the focused element: its group label for radios. */
async function focusedName(app: FramerApp): Promise<string> {
  return app.page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return '';
    if (el instanceof HTMLInputElement && el.type === 'radio') {
      const group = el.closest('[role="radiogroup"]');
      const id = group?.getAttribute('aria-labelledby');
      return (id && document.getElementById(id)?.textContent) || '';
    }
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label')!;
    if (el.id) {
      const label = document.querySelector(`label[for="${el.id}"]`);
      if (label) return label.textContent ?? '';
    }
    return (el.textContent ?? '').trim();
  });
}

async function saveFirst(app: FramerApp): Promise<string> {
  const before = new Set(await readdir(app.exportDir));
  const cards = app.page.getByRole('region', { name: 'Design options' }).getByRole('checkbox');
  await cards.first().check();
  await app.page.getByRole('button', { name: 'Save selected (1)' }).click();
  await expect(app.page.getByRole('status').filter({ hasText: /^Saved 1 image\(s\) to / })).toBeVisible();
  const added = (await readdir(app.exportDir)).filter((f) => !before.has(f));
  expect(added).toHaveLength(1);
  return join(app.exportDir, added[0]!);
}

test('chooses print size, orientation, and frame-ready margin', async ({ app }) => {
  const { page } = app;
  await expect(page.getByRole('button', { name: 'Generate designs' })).toBeEnabled({ timeout: 15_000 });

  // Acceptance 3.1: defaults on launch.
  await expect(page.getByRole('radio', { name: '4x6' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Portrait' })).toBeChecked();
  await expect(page.getByRole('switch', { name: 'Frame-ready margin' })).toHaveAttribute(
    'aria-checked',
    'false',
  );

  // Tab order from the Quote box.
  await page.getByRole('textbox', { name: 'Quote' }).focus();
  const order: string[] = [];
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
    order.push(await focusedName(app));
  }
  expect(order).toEqual([
    'Author (optional)',
    'Print size',
    'Orientation',
    'Frame-ready margin',
    'Generate designs',
  ]);

  await page.getByRole('textbox', { name: 'Quote' }).fill(SHORT.text);
  await page.getByRole('textbox', { name: 'Author (optional)' }).fill(SHORT.author);
  await page.getByRole('button', { name: 'Generate designs' }).click();
  const cards = page.getByRole('region', { name: 'Design options' }).getByRole('checkbox');
  await expect(cards).toHaveCount(12, { timeout: 5_000 });
  const keys = async () => Promise.all((await cards.all()).map((c) => c.getAttribute('data-combo-key')));
  const before = await keys();

  await page.getByRole('radio', { name: '5x7' }).check();
  await page.getByRole('radio', { name: 'Landscape' }).check();
  await page.getByRole('switch', { name: 'Frame-ready margin' }).click();
  await expect(page.getByRole('radiogroup', { name: 'Margin size' })).toBeVisible();

  // With the switch on, Margin size comes right after it in tab order.
  await page.getByRole('switch', { name: 'Frame-ready margin' }).focus();
  await page.keyboard.press('Tab');
  expect(await focusedName(app)).toBe('Margin size');

  await page.getByRole('radio', { name: 'Large' }).check();
  const after = await keys();
  expect(after).toEqual(before.filter((k) => after.includes(k)));
  expect(after.length).toBeGreaterThan(0);

  const landscape = await saveFirst(app);
  expect(landscape).toMatch(/-5x7-landscape\.jpg$/);
  expect(await readJpegSize(landscape)).toEqual({ width: 2100, height: 1500 });

  await page.getByRole('radio', { name: '8x10' }).check();
  await page.getByRole('radio', { name: 'Portrait' }).check();
  const big = await saveFirst(app);
  expect(big).toMatch(/-8x10-portrait\.jpg$/);
  expect(await readJpegSize(big)).toEqual({ width: 2400, height: 3000 });
});
