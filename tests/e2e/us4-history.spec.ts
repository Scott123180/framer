/// <reference lib="dom" />
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { test, expect, type FramerApp } from './fixtures';
import { expectNoSeriousA11yViolations } from './a11y';
import { sha256File } from './jpeg';

const A = 'Quote A: the best way out is always through.';
const B = 'Quote B: keep your face always toward the sunshine.';

async function ready(app: FramerApp) {
  await expect(app.page.getByRole('button', { name: /^(Generate|Regenerate) designs$/ })).toBeEnabled({
    timeout: 15_000,
  });
}

async function generateAndSave(app: FramerApp, text: string): Promise<string> {
  const { page } = app;
  const before = new Set(await readdir(app.exportDir));
  await page.getByRole('textbox', { name: 'Quote' }).fill(text);
  await page.getByRole('button', { name: /^(Generate|Regenerate) designs$/ }).click();
  const cards = page.getByRole('region', { name: 'Design options' }).getByRole('checkbox');
  await expect(cards).toHaveCount(12, { timeout: 5_000 });
  await cards.first().check();
  await page.getByRole('button', { name: 'Save selected (1)' }).click();
  await expect(page.getByRole('status').filter({ hasText: /^Saved 1 image\(s\) to / })).toBeVisible();
  const added = (await readdir(app.exportDir)).filter((f) => !before.has(f));
  return join(app.exportDir, added[0]!);
}

test('keeps previous quotes and saved designs across launches', async ({ app }) => {
  await ready(app);
  const fileA = await generateAndSave(app, A);
  await generateAndSave(app, B);

  await app.relaunch();
  await ready(app);
  const { page } = app;
  const history = page.getByRole('complementary', { name: 'History' });
  await expect(history).toBeVisible();
  await expect(page.getByRole('button', { name: 'History' })).toHaveCount(0);
  await expect(history.getByRole('tab', { name: 'Previous quotes' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  const quoteButtons = history.getByRole('tabpanel').getByRole('button', { name: /^Quote [AB]/ });
  await expect(quoteButtons).toHaveText([B, A]);

  // Generating A again moves it to the top with no duplicate.
  await page.getByRole('textbox', { name: 'Quote' }).fill(A);
  await page.getByRole('button', { name: 'Generate designs' }).click();
  await expect(quoteButtons).toHaveText([A, B]);

  await history.getByRole('tab', { name: 'Saved designs' }).click();
  const items = history.getByRole('tabpanel').getByRole('listitem');
  await expect(items).toHaveCount(2);
  for (const item of await items.all()) {
    await expect(item.getByRole('img', { name: /^Saved design: / })).toHaveAttribute(
      'src',
      /^data:image\/jpeg/,
    );
    await expect(item).toContainText('4x6 Portrait');
    await expect(item).toContainText('Frame-ready: Off');
  }
  await expectNoSeriousA11yViolations(page, 'history shown');

  await history.getByRole('button', { name: `Save again: ${A}` }).click();
  await expect(history.getByRole('status')).toContainText('Saved 1 image(s) to');
  const copies = (await readdir(app.exportDir)).filter((f) => f.includes('quote-a'));
  expect(copies).toHaveLength(2);
  const shas = await Promise.all(copies.map((f) => sha256File(join(app.exportDir, f))));
  expect(shas[0]).toBe(shas[1]);
  expect(shas[0]).toBe(await sha256File(fileA));

  await history.getByRole('tab', { name: 'Previous quotes' }).click();
  await history.getByRole('button', { name: `Delete quote: ${A}` }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete this quote?' });
  await expect(dialog).toBeVisible();
  await expectNoSeriousA11yViolations(page, 'confirm dialog');
  await dialog.getByRole('button', { name: 'Delete' }).click();
  await expect(quoteButtons).toHaveText([B]);

  await history.getByRole('tab', { name: 'Saved designs' }).click();
  await history.getByRole('button', { name: `Delete design: ${B}` }).click();
  await page
    .getByRole('dialog', { name: 'Delete this design?' })
    .getByRole('button', { name: 'Delete' })
    .click();
  await expect(items).toHaveCount(1);

  await app.relaunch();
  await ready(app);
  const h = app.page.getByRole('complementary', { name: 'History' });
  await expect(h.getByRole('tabpanel').getByRole('button', { name: /^Quote [AB]/ })).toHaveText([B]);
  await h.getByRole('tab', { name: 'Saved designs' }).click();
  await expect(h.getByRole('tabpanel').getByRole('listitem')).toHaveCount(1);
  await expect(h.getByRole('img', { name: `Saved design: ${A}` })).toBeVisible();

  await h.getByRole('tab', { name: 'Previous quotes' }).click();
  await h.getByRole('button', { name: B, exact: true }).click();
  await expect(app.page.getByRole('textbox', { name: 'Quote' })).toHaveValue(B);

  await app.resizeWindow(360, 600);
  const toggle = app.page.getByRole('button', { name: 'History' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(app.page.getByRole('tablist', { name: 'History' })).toHaveCount(0);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(app.page.getByRole('tablist', { name: 'History' })).toBeVisible();
  await expectNoSeriousA11yViolations(app.page, 'history drawer 360px');
  const overflow = await app.page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await app.page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
});
