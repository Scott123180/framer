import { extname, join, normalize, sep } from 'node:path';

export const APP_SCHEME = 'app';
export const APP_ORIGIN = 'app://framer';

export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "connect-src 'self'",
].join('; ');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

export function mimeType(path: string): string {
  return MIME[extname(path).toLowerCase()] ?? 'application/octet-stream';
}

/** Maps an app:// URL to a file inside `rootDir`, or null if it would escape it. */
export function resolveAppFile(rootDir: string, requestUrl: string): string | null {
  const url = new URL(requestUrl);
  const pathname = decodeURIComponent(url.pathname);
  const file = normalize(join(rootDir, pathname === '/' ? 'index.html' : pathname));
  return file === rootDir || file.startsWith(rootDir.endsWith(sep) ? rootDir : rootDir + sep) ? file : null;
}

export function isAppUrl(raw: string, devServerUrl: string | undefined): boolean {
  try {
    const url = new URL(raw);
    if (devServerUrl && url.origin === new URL(devServerUrl).origin) return true;
    return url.protocol === `${APP_SCHEME}:` && url.host === 'framer';
  } catch {
    return false;
  }
}
