import { join } from 'node:path';

export type AppPaths = {
  userData: string;
  libraryFile: string;
  designsDir: string;
  exportDir: string;
  fontsDir: string;
};

type PathInputs = {
  getPath(name: 'userData' | 'pictures'): string;
  env: Partial<Record<string, string>>;
  isPackaged: boolean;
  /** process.resourcesPath (packaged builds keep fonts in resources/assets/fonts). */
  resourcesPath: string;
  /** The repository root in development (derived from the main bundle's location, out/main). */
  repoRoot: string;
};

export function resolvePaths({ getPath, env, isPackaged, resourcesPath, repoRoot }: PathInputs): AppPaths {
  const userData = env.FRAMER_USER_DATA_DIR || getPath('userData');
  return {
    userData,
    libraryFile: join(userData, 'library.json'),
    designsDir: join(userData, 'designs'),
    exportDir: env.FRAMER_EXPORT_DIR || join(getPath('pictures'), 'Framer'),
    fontsDir: isPackaged ? join(resourcesPath, 'assets', 'fonts') : join(repoRoot, 'assets', 'fonts'),
  };
}
