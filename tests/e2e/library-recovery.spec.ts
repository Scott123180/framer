import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { test, expect } from './fixtures';

test('recovers from a damaged history file and keeps a backup', async ({ app }) => {
  const damaged = '{ "schemaVersion": 1, "quotes": [ oops';
  await app.relaunch(() => writeFile(join(app.userDataDir, 'library.json'), damaged));

  const alert = app.page.getByRole('alert').filter({ hasText: 'Your history file was damaged' });
  await expect(alert).toBeVisible({ timeout: 15_000 });
  const text = (await alert.textContent())!;
  const match =
    /^Your history file was damaged, so we started a fresh one\. A backup was kept at (.+)\.$/.exec(text);
  expect(match).not.toBeNull();
  const backup = match![1]!;
  expect(await readFile(backup, 'utf8')).toBe(damaged);
  expect((await readdir(app.userDataDir)).some((f) => f.startsWith('library.corrupt-'))).toBe(true);

  await expect(app.page.getByText('Quotes you design will appear here.')).toBeVisible();
});
