import { posix } from 'node:path';
import type { FsPort } from './fs-port';

type Op = keyof FsPort;

/** An in-memory FsPort for service tests, with per-operation failure injection. */
export class MemoryFs implements FsPort {
  readonly files = new Map<string, Uint8Array>();
  readonly dirs = new Set<string>(['/']);
  private failures: Array<{ op: Op; match: (path: string) => boolean; code: string }> = [];

  /** Makes the next matching call fail with the given errno code. */
  failOn(op: Op, match: (path: string) => boolean, code: string): void {
    this.failures.push({ op, match, code });
  }

  private check(op: Op, path: string): void {
    const i = this.failures.findIndex((f) => f.op === op && f.match(path));
    if (i >= 0) {
      const { code } = this.failures[i]!;
      this.failures.splice(i, 1);
      throw Object.assign(new Error(`${code}: ${op} ${path}`), { code });
    }
  }

  private enoent(path: string): never {
    throw Object.assign(new Error(`ENOENT: ${path}`), { code: 'ENOENT' });
  }

  private requireDir(path: string): void {
    if (!this.dirs.has(posix.dirname(path))) this.enoent(posix.dirname(path));
  }

  async readFile(path: string) {
    this.check('readFile', path);
    const f = this.files.get(path);
    if (!f) this.enoent(path);
    return new Uint8Array(f);
  }

  async writeFile(path: string, data: string | Uint8Array) {
    this.check('writeFile', path);
    this.requireDir(path);
    this.files.set(path, typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data));
  }

  async fsync(path: string) {
    this.check('fsync', path);
    if (!this.files.has(path)) this.enoent(path);
  }

  async rename(from: string, to: string) {
    this.check('rename', from);
    const f = this.files.get(from);
    if (!f) this.enoent(from);
    this.files.delete(from);
    this.files.set(to, f);
  }

  async copyFile(from: string, to: string) {
    this.check('copyFile', to);
    const f = this.files.get(from);
    if (!f) this.enoent(from);
    this.requireDir(to);
    if (this.files.has(to)) throw Object.assign(new Error(`EEXIST: ${to}`), { code: 'EEXIST' });
    this.files.set(to, new Uint8Array(f));
  }

  async rm(path: string) {
    this.check('rm', path);
    this.files.delete(path);
  }

  async mkdir(path: string) {
    this.check('mkdir', path);
    let p = path;
    while (p !== '/' && p !== '.') {
      this.dirs.add(p);
      p = posix.dirname(p);
    }
  }

  async stat(path: string) {
    this.check('stat', path);
    const f = this.files.get(path);
    if (!f) this.enoent(path);
    return { size: f.byteLength };
  }

  async access(path: string) {
    this.check('access', path);
    if (!this.files.has(path) && !this.dirs.has(path)) this.enoent(path);
  }
}
