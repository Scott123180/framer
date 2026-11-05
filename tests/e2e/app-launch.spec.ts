/// <reference lib="dom" />
import { test, expect } from './fixtures';
import { expectNoSeriousA11yViolations } from './a11y';

test('opens a secure, accessible three-region window that reflows to 360 px', async ({ app }) => {
  const { page, electronApp } = app;

  const size = await electronApp.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.getSize());
  expect(size).toEqual([1280, 800]);

  await expect(page.getByRole('region', { name: 'Quote' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Design options' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'History' })).toBeVisible();

  const globals = await page.evaluate(() => ({
    framer: typeof (window as unknown as { framer?: unknown }).framer,
    require: typeof (window as unknown as { require?: unknown }).require,
    process: typeof (window as unknown as { process?: unknown }).process,
  }));
  expect(globals).toEqual({ framer: 'object', require: 'undefined', process: 'undefined' });

  const response = await page.reload();
  expect(response?.headers()['content-security-policy']).toContain("default-src 'self'");
  // "Empty" means loaded and waiting for a quote, not still loading fonts.
  await expect(page.getByRole('button', { name: 'Generate designs' })).toBeEnabled({ timeout: 15_000 });

  await expectNoSeriousA11yViolations(page, 'empty');

  await app.resizeWindow(360, 600);
  expect(await page.evaluate(() => window.innerWidth)).toBe(360);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
