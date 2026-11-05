/// <reference lib="dom" />
import { test as base, _electron, type ElectronApplication, type Page } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export type FramerApp = {
  electronApp: ElectronApplication;
  page: Page;
  userDataDir: string;
  exportDir: string;
  /** Close the app and launch it again with the same folders; `between` runs while it is closed. */
  relaunch(between?: () => Promise<void>): Promise<void>;
  /** Resize the window and wait for the page to see the new size. */
  resizeWindow(width: number, height: number): Promise<void>;
};

/**
 * On Linux, E2E runs headless by default: Chromium's Ozone "headless" platform renders without any
 * display server (no window, no Xvfb). The screen-size override gives the app a desktop-sized screen,
 * so the window opens at its normal 1280×800. Set FRAMER_E2E_HEADED=1 to watch the windows instead.
 * Ozone is Linux-only, so on macOS and Windows the tests always open real windows.
 */
export const HEADLESS = process.platform === 'linux' && process.env.FRAMER_E2E_HEADED !== '1';
const HEADLESS_ARGS = ['--ozone-platform=headless', '--ozone-override-screen-size=1920,1080'];

async function launch(userDataDir: string, exportDir: string) {
  const electronApp = await _electron.launch({
    args: [...(HEADLESS ? HEADLESS_ARGS : []), 'out/main/index.js'],
    env: { ...process.env, FRAMER_USER_DATA_DIR: userDataDir, FRAMER_EXPORT_DIR: exportDir },
  });
  const page = await electronApp.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  return { electronApp, page };
}

export const test = base.extend<{ app: FramerApp }>({
  app: async ({}, use) => {
    const userDataDir = await mkdtemp(join(tmpdir(), 'framer-e2e-data-'));
    const exportDir = await mkdtemp(join(tmpdir(), 'framer-e2e-export-'));
    let current = await launch(userDataDir, exportDir);

    const app: FramerApp = {
      get electronApp() {
        return current.electronApp;
      },
      get page() {
        return current.page;
      },
      userDataDir,
      exportDir,
      async relaunch(between) {
        await current.electronApp.close();
        await between?.();
        current = await launch(userDataDir, exportDir);
      },
      async resizeWindow(width, height) {
        const resized = current.page.evaluate(
          ([w]) =>
            new Promise<void>((resolve) => {
              if (window.innerWidth === w) return resolve();
              const onResize = () => {
                if (window.innerWidth === w) {
                  window.removeEventListener('resize', onResize);
                  resolve();
                }
              };
              window.addEventListener('resize', onResize);
            }),
          [width],
        );
        await current.electronApp.evaluate(
          ({ BrowserWindow }, [w, h]) => {
            const win = BrowserWindow.getAllWindows()[0];
            win?.setContentSize(w!, h!);
          },
          [width, height],
        );
        await resized;
      },
    };

    await use(app);

    await current.electronApp.close().catch(() => {});
    await rm(userDataDir, { recursive: true, force: true });
    await rm(exportDir, { recursive: true, force: true });
  },
});

export { expect } from '@playwright/test';
