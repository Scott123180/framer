import { app, BrowserWindow, ipcMain, net, protocol, session } from 'electron';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { composeMain } from './composition';
import { resolvePaths } from './platform/paths';
import { APP_ORIGIN, APP_SCHEME, CSP, isAppUrl, mimeType, resolveAppFile } from './security';

// --- Must happen before `ready` ---
if (process.env.FRAMER_USER_DATA_DIR) app.setPath('userData', process.env.FRAMER_USER_DATA_DIR);
if (process.env.FRAMER_DISABLE_GPU === '1') {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu');
}
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, codeCache: true },
  },
]);

const devServerUrl = process.env.ELECTRON_RENDERER_URL;
const rendererDir = join(import.meta.dirname, '../renderer');
const preload = join(import.meta.dirname, '../preload/index.cjs');

function serveRenderer(): void {
  protocol.handle(APP_SCHEME, async (request) => {
    const file = resolveAppFile(rendererDir, request.url);
    if (!file) return new Response('Not found', { status: 404 });
    const res = await net.fetch(pathToFileURL(file).toString());
    if (!res.ok) return new Response('Not found', { status: 404 });
    return new Response(res.body, {
      status: 200,
      headers: { 'content-type': mimeType(file), 'content-security-policy': CSP },
    });
  });
}

function applyCspToDevServer(): void {
  if (!devServerUrl) return;
  // Vite's dev client needs inline scripts and a websocket, so dev gets a relaxed policy.
  const devCsp = CSP.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'").replace(
    "connect-src 'self'",
    "connect-src 'self' ws: http://localhost:*",
  );
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [devCsp] } });
  });
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 360,
    minHeight: 600,
    show: false,
    title: 'Framer',
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, preload },
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    if (!isAppUrl(url, devServerUrl)) event.preventDefault();
  });
  win.webContents.on('will-redirect', (event, url) => {
    if (!isAppUrl(url, devServerUrl)) event.preventDefault();
  });
  void win.loadURL(devServerUrl ?? `${APP_ORIGIN}/index.html`);
  return win;
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
    // A dead renderer leaves its last frame on screen with nothing behind it, so say why it died.
    contents.on('render-process-gone', (_e, details) => {
      console.error('Renderer process gone', { url: contents.getURL(), ...details });
    });
  });
  app.on('child-process-gone', (_event, details) => {
    console.error('Child process gone', details);
  });

  void app.whenReady().then(async () => {
    console.log('GPU feature status', app.getGPUFeatureStatus());
    serveRenderer();
    applyCspToDevServer();
    const paths = resolvePaths({
      getPath: (name) => app.getPath(name),
      env: process.env,
      isPackaged: app.isPackaged,
      resourcesPath: process.resourcesPath,
      repoRoot: join(import.meta.dirname, '../..'),
    });
    await composeMain({ ipcMain, paths, devServerUrl });
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
