import { join } from 'node:path';
import { EMPTY_LIBRARY, Library } from '@shared/domain';
import { MSG } from '@shared/ipc/messages';
import type { AppError } from '@shared/ipc/result';
import { errorCode, type FsPort } from '../platform/fs-port';
import type { Clock } from '../platform/clock';

const MAX_EPERM_RETRIES = 5;

type Deps = { fs: FsPort; clock: Clock; dir: string; sleep?: (ms: number) => Promise<void> };

/**
 * Owns library.json: validated reads, atomic writes (temp → fsync → rename), one write at a time,
 * and recovery from a damaged file.
 */
export class JsonLibraryStore {
  private library: Library = EMPTY_LIBRARY;
  private queue: Promise<unknown> = Promise.resolve();
  private readonly file: string;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(private readonly deps: Deps) {
    this.file = join(deps.dir, 'library.json');
    this.sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  async load(): Promise<{ library: Library; notices: AppError[] }> {
    let raw: Uint8Array;
    try {
      raw = await this.deps.fs.readFile(this.file);
    } catch (e) {
      if (errorCode(e) !== 'ENOENT') throw e;
      this.library = EMPTY_LIBRARY;
      return { library: this.library, notices: [] };
    }
    const parsed = parseLibrary(new TextDecoder().decode(raw));
    if (parsed) {
      this.library = parsed;
      return { library: parsed, notices: [] };
    }
    const backupPath = join(this.deps.dir, `library.corrupt-${fileStamp(this.deps.clock.now())}.json`);
    await this.deps.fs.rename(this.file, backupPath);
    this.library = EMPTY_LIBRARY;
    return {
      library: this.library,
      notices: [{ code: 'LIBRARY_RECOVERED', message: MSG.libraryRecovered(backupPath), backupPath }],
    };
  }

  read(): Library {
    return this.library;
  }

  /** Applies `fn` to the latest library and persists the result. Calls run one at a time, in order. */
  update(fn: (library: Library) => Library): Promise<Library> {
    const run = this.queue.then(async () => {
      const next = fn(this.library);
      await this.write(next);
      this.library = next;
      return next;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async write(library: Library): Promise<void> {
    const { fs } = this.deps;
    const tmp = `${this.file}.tmp`;
    await fs.mkdir(this.deps.dir);
    await fs.writeFile(tmp, JSON.stringify(library, null, 2));
    await fs.fsync(tmp);
    for (let attempt = 0; ; attempt++) {
      try {
        await fs.rename(tmp, this.file);
        return;
      } catch (e) {
        if (errorCode(e) !== 'EPERM' || attempt >= MAX_EPERM_RETRIES) throw e;
        await this.sleep(20 * (attempt + 1));
      }
    }
  }
}

function parseLibrary(text: string): Library | null {
  try {
    const result = Library.safeParse(JSON.parse(text));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/** ISO timestamp that is safe in file names on every OS. */
function fileStamp(d: Date): string {
  return d.toISOString().replace(/[:.]/g, '-');
}
