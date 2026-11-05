/// <reference lib="dom" />
import { test, expect } from './fixtures';

const FRAMER_API_METHODS = [
  'touchQuote',
  'listQuotes',
  'deleteQuote',
  'saveDesign',
  'listDesigns',
  'getThumbnail',
  'reexportDesign',
  'deleteDesign',
  'showInFolder',
  'loadFontFiles',
  'getStartupInfo',
].sort();

test('blocks new windows and navigation away from the app', async ({ app }) => {
  const { page, electronApp } = app;
  const origin = new URL(page.url()).origin;
  const originalUrl = page.url();

  await page.evaluate(() => window.open('https://example.com'));
  await page.waitForTimeout(300);
  expect(electronApp.windows()).toHaveLength(1);

  await page.evaluate(() => {
    location.href = 'https://example.com';
  });
  await page.waitForTimeout(500);
  expect(page.url()).toBe(originalUrl);
  expect(new URL(page.url()).origin).toBe(origin);
});

test('exposes exactly the FramerApi methods on window.framer', async ({ app }) => {
  const keys = await app.page.evaluate(() =>
    Object.keys((window as unknown as { framer: object }).framer).sort(),
  );
  expect(keys).toEqual(FRAMER_API_METHODS);
});
