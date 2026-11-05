import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolvePaths } from './paths';

const getPath = (name: 'userData' | 'pictures') =>
  name === 'userData' ? '/home/u/.config/Framer' : '/home/u/Pictures';
const base = {
  getPath,
  env: {},
  isPackaged: false,
  resourcesPath: '/opt/Framer/resources',
  repoRoot: '/repo',
};

describe('resolvePaths', () => {
  it('uses Electron paths by default', () => {
    const p = resolvePaths(base);
    expect(p.userData).toBe('/home/u/.config/Framer');
    expect(p.exportDir).toBe(join('/home/u/Pictures', 'Framer'));
    expect(p.designsDir).toBe(join('/home/u/.config/Framer', 'designs'));
    expect(p.libraryFile).toBe(join('/home/u/.config/Framer', 'library.json'));
  });

  it('honours FRAMER_USER_DATA_DIR and FRAMER_EXPORT_DIR', () => {
    const p = resolvePaths({
      ...base,
      env: { FRAMER_USER_DATA_DIR: '/tmp/ud', FRAMER_EXPORT_DIR: '/tmp/ex' },
    });
    expect(p.userData).toBe('/tmp/ud');
    expect(p.designsDir).toBe(join('/tmp/ud', 'designs'));
    expect(p.exportDir).toBe('/tmp/ex');
  });

  it('finds fonts in resources when packaged and in the repo in dev', () => {
    expect(resolvePaths({ ...base, isPackaged: true }).fontsDir).toBe(
      join('/opt/Framer/resources', 'assets', 'fonts'),
    );
    expect(resolvePaths(base).fontsDir).toBe(join('/repo', 'assets', 'fonts'));
  });
});
