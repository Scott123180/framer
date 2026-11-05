import * as fs from 'node:fs/promises';

/** The file-system operations main-process services need. Injected so tests can simulate failures. */
export interface FsPort {
  readFile(path: string): Promise<Uint8Array>;
  writeFile(path: string, data: string | Uint8Array): Promise<void>;
  /** Flushes a file's contents to disk. */
  fsync(path: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  /** Copies a file; fails with EEXIST if the target exists, so nothing is ever overwritten. */
  copyFile(from: string, to: string): Promise<void>;
  rm(path: string): Promise<void>;
  mkdir(path: string): Promise<void>;
  stat(path: string): Promise<{ size: number }>;
  /** Resolves if the path exists, rejects with ENOENT otherwise. */
  access(path: string): Promise<void>;
}

export const nodeFs: FsPort = {
  readFile: (p) => fs.readFile(p),
  writeFile: (p, d) => fs.writeFile(p, d),
  async fsync(p) {
    const handle = await fs.open(p, 'r+');
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
  },
  rename: (a, b) => fs.rename(a, b),
  copyFile: (a, b) => fs.copyFile(a, b, fs.constants.COPYFILE_EXCL),
  rm: (p) => fs.rm(p, { force: true }),
  mkdir: async (p) => {
    await fs.mkdir(p, { recursive: true });
  },
  stat: async (p) => ({ size: (await fs.stat(p)).size }),
  access: (p) => fs.access(p),
};

export function errorCode(e: unknown): string | undefined {
  return typeof e === 'object' && e !== null && 'code' in e
    ? String((e as { code: unknown }).code)
    : undefined;
}
