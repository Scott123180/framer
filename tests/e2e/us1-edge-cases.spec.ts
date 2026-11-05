/// <reference lib="dom" />
import { chmod, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test, expect, type FramerApp } from './fixtures';
import { GREEK, LONG_500, SHORT, TOO_LONG_501, UNICODE } from '../fixtures/quotes';

async function ready(app: FramerApp) {
  await expect(app.page.getByRole('button', { name: 'Generate designs' })).toBeEnabled({ timeout: 15_000 });
}

async function generate(app: FramerApp, quote: { text: string; author: string | null }) {
  const compose = app.page.getByRole('region', { name: 'Quote' });
  await compose.getByRole('textbox', { name: 'Quote' }).fill(quote.text);
  await compose.getByRole('textbox', { name: 'Author (optional)' }).fill(quote.author ?? '');
  await compose.getByRole('button', { name: /^(Generate|Regenerate) designs$/ }).click();
}

const options = (app: FramerApp) => app.page.getByRole('region', { name: 'Design options' });

test('explains empty, too-long quote, and too-long author', async ({ app }) => {
  await ready(app);
  await generate(app, { text: '', author: null });
  await expect(app.page.getByRole('alert')).toHaveText('Enter a quote to generate designs.');
  await generate(app, TOO_LONG_501);
  await expect(app.page.getByRole('alert')).toHaveText(
    'That quote is too long to print clearly. Please shorten it to 500 characters or fewer.',
  );
  await generate(app, { text: 'Hello', author: 'x'.repeat(121) });
  await expect(app.page.getByRole('alert')).toHaveText(
    'That author name is too long. Please shorten it to 120 characters or fewer.',
  );
  await expect(options(app).getByRole('checkbox')).toHaveCount(0);
});

test('refuses to show folders outside the export folder', async ({ app }) => {
  await ready(app);
  const res = await app.page.evaluate(() =>
    (window as unknown as { framer: { showInFolder(p: string): Promise<unknown> } }).framer.showInFolder(
      '/etc/passwd',
    ),
  );
  expect(res).toMatchObject({ ok: false, error: { code: 'VALIDATION' } });
});

test('renders a 500-character quote and unicode without errors', async ({ app }) => {
  await ready(app);
  await generate(app, LONG_500);
  await expect(options(app).getByRole('status')).toHaveText(/designs ready\.|so showing \d+ designs\./, {
    timeout: 5_000,
  });
  await expect(app.page.getByRole('alert')).toHaveCount(0);
  await generate(app, UNICODE);
  await expect(options(app).getByRole('status')).toHaveText('12 designs ready.', { timeout: 5_000 });
  await expect(options(app).getByRole('checkbox')).toHaveCount(12);
});

test('leaves out fonts that cannot display the quote', async ({ app }) => {
  await ready(app);
  await generate(app, GREEK);
  const status = options(app).getByRole('status');
  await expect(status).toHaveText(/^Some fonts couldn't display this quote, so showing (\d+) designs\.$/, {
    timeout: 5_000,
  });
  const n = Number((await status.textContent())!.match(/showing (\d+)/)![1]);
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThan(12);
  await expect(options(app).getByRole('checkbox')).toHaveCount(n);
});

test('marks options stale when the quote changes', async ({ app }) => {
  await ready(app);
  await generate(app, SHORT);
  await expect(options(app).getByRole('checkbox')).toHaveCount(12, { timeout: 5_000 });
  await options(app).getByRole('checkbox').first().check();
  await app.page.getByRole('textbox', { name: 'Quote' }).fill(`${SHORT.text} Today.`);
  await expect(options(app).getByRole('status')).toHaveText(
    'Your quote changed. Regenerate to update the designs.',
  );
  await expect(app.page.getByRole('button', { name: /^Save selected/ })).toBeDisabled();
});

test('shows a plain-language error and records nothing when the export folder is read-only', async ({
  app,
}) => {
  test.skip(process.platform === 'win32', 'chmod does not make folders read-only on Windows');
  await ready(app);
  await chmod(app.exportDir, 0o500);
  try {
    await generate(app, SHORT);
    await expect(options(app).getByRole('checkbox')).toHaveCount(12, { timeout: 5_000 });
    await options(app).getByRole('checkbox').first().check();
    await app.page.getByRole('button', { name: 'Save selected (1)' }).click();
    await expect(app.page.getByRole('alert')).toHaveText(/^Couldn't save: /);
    expect(await readdir(app.exportDir)).toEqual([]);
    const library = await readFile(join(app.userDataDir, 'library.json'), 'utf8').then(
      (t) => JSON.parse(t),
      () => ({ designs: [] }),
    );
    expect(library.designs).toEqual([]);
  } finally {
    await chmod(app.exportDir, 0o700);
  }
});
