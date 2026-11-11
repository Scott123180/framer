// Captures the README screenshots from the built app: `npm run build && npm run screenshots`.
// Drives the real app the way the E2E tests do (headless on Linux), with throwaway data folders,
// and writes the images to docs/screenshots.
// Callbacks passed to page.waitForFunction run in the app page, where these globals exist.
/* global window, document */
import { _electron } from '@playwright/test';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const outDir = join(root, 'docs/screenshots');
const headless = process.platform === 'linux' && process.env.FRAMER_E2E_HEADED !== '1';

const QUOTES = [
  { text: 'The best way out is always through.', author: 'Robert Frost', size: '5x7', pick: 2 },
  { text: 'Simplicity is the ultimate sophistication.', author: 'Leonardo da Vinci', size: '4x6', pick: 5 },
  {
    text: 'Go confidently in the direction of your dreams. Live the life you have imagined.',
    author: 'Henry David Thoreau',
    size: '4x6',
    pick: 7,
  },
];

const userDataDir = await mkdtemp(join(tmpdir(), 'framer-shots-data-'));
const exportDir = await mkdtemp(join(tmpdir(), 'framer-shots-export-'));
await mkdir(outDir, { recursive: true });

const app = await _electron.launch({
  cwd: root,
  args: [
    ...(headless ? ['--ozone-platform=headless', '--ozone-override-screen-size=1920,1080'] : []),
    'out/main/index.js',
  ],
  env: { ...process.env, FRAMER_USER_DATA_DIR: userDataDir, FRAMER_EXPORT_DIR: exportDir },
});

try {
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setContentSize(1440, 960));
  await page.waitForFunction(() => window.innerWidth === 1440);

  const generate = page.getByRole('button', { name: /^(Generate|Regenerate) designs$/ });
  const cards = page.getByRole('region', { name: 'Design options' }).getByRole('checkbox');
  await generate.waitFor({ state: 'visible', timeout: 15_000 });

  const prints = [];
  for (const [i, q] of QUOTES.entries()) {
    await page.getByRole('textbox', { name: 'Quote' }).fill(q.text);
    await page.getByRole('textbox', { name: 'Author (optional)' }).fill(q.author);
    await page.getByRole('radio', { name: q.size }).check();
    await generate.click();
    await page.waitForFunction(() => document.body.innerText.includes('12 designs ready.'), null, {
      timeout: 15_000,
    });
    // Previews arrive one by one from the render worker; each canvas drops its loading class when drawn.
    await page.waitForFunction(
      () =>
        document.querySelectorAll('canvas[role="img"]').length === 12 &&
        !document.querySelector('canvas[role="img"][class*="loading"]'),
      null,
      { timeout: 30_000 },
    );

    if (i === 0) await page.screenshot({ path: join(outDir, 'designs.png') });

    const before = new Set(await readdir(exportDir));
    await cards.nth(q.pick).check();
    await page.getByRole('button', { name: 'Save selected (1)' }).click();
    await page
      .getByRole('status')
      .filter({ hasText: /^Saved 1 image\(s\) to / })
      .waitFor();
    const added = (await readdir(exportDir)).filter((f) => !before.has(f));
    prints.push(join(exportDir, added[0]));
    await cards.nth(q.pick).uncheck();
  }

  await page.getByRole('tab', { name: 'Saved designs' }).click();
  // Thumbnails arrive over IPC as data URLs; until then the <img> has no src.
  await page.waitForFunction(() => {
    const imgs = [...document.querySelectorAll('[role="tabpanel"] img')];
    return (
      imgs.length === 3 &&
      imgs.every((img) => img.getAttribute('src') && img.complete && img.naturalWidth > 0)
    );
  });
  await page
    .getByRole('complementary', { name: 'History' })
    .screenshot({ path: join(outDir, 'history.png') });

  // The exported JPEGs are full 300 PPI prints; keep README copies small.
  const smalls = await app.evaluate(({ nativeImage }, files) => {
    return files.map((file) => {
      const img = nativeImage.createFromPath(file);
      const { width, height } = img.getSize();
      const small = img.resize({ height: 600, width: Math.round((width * 600) / height), quality: 'best' });
      return small.toJPEG(88).toString('base64');
    });
  }, prints);
  for (const [i, b64] of smalls.entries()) {
    await writeFile(join(outDir, `print-${i + 1}.jpg`), Buffer.from(b64, 'base64'));
  }
  console.log(`Wrote screenshots to ${outDir}`);
} finally {
  await app.close().catch(() => {});
  await rm(userDataDir, { recursive: true, force: true });
  await rm(exportDir, { recursive: true, force: true });
}
