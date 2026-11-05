import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isAppUrl, mimeType, resolveAppFile } from './security';

describe('resolveAppFile', () => {
  const root = '/app/out/renderer';
  it('maps app URLs into the renderer folder', () => {
    expect(resolveAppFile(root, 'app://framer/index.html')).toBe(join(root, 'index.html'));
    expect(resolveAppFile(root, 'app://framer/')).toBe(join(root, 'index.html'));
    expect(resolveAppFile(root, 'app://framer/assets/a%20b.js')).toBe(join(root, 'assets', 'a b.js'));
  });
  it('refuses paths that escape the folder', () => {
    expect(resolveAppFile(root, 'app://framer/..%2F..%2Fetc%2Fpasswd')).toBeNull();
    expect(resolveAppFile(root, 'app://framer/assets/..%2F..%2F..%2Fsecret')).toBeNull();
  });
});

describe('isAppUrl', () => {
  it('accepts the app origin and the dev server', () => {
    expect(isAppUrl('app://framer/index.html', undefined)).toBe(true);
    expect(isAppUrl('http://localhost:5173/x', 'http://localhost:5173')).toBe(true);
  });
  it('rejects everything else', () => {
    expect(isAppUrl('https://example.com', undefined)).toBe(false);
    expect(isAppUrl('http://localhost:5173/x', undefined)).toBe(false);
    expect(isAppUrl('garbage', undefined)).toBe(false);
  });
});

describe('mimeType', () => {
  it('knows the renderer asset types', () => {
    expect(mimeType('a/index.html')).toMatch(/^text\/html/);
    expect(mimeType('a/x.JS')).toMatch(/^text\/javascript/);
    expect(mimeType('a/x.bin')).toBe('application/octet-stream');
  });
});
