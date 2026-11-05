import { join } from 'node:path';
import { FontManifest, type Font } from '@shared/domain';
import { STORAGE_FAILED_TEXT } from '@shared/ipc/messages';
import { err, ok, type Result } from '@shared/ipc/result';
import type { FsPort } from '../platform/fs-port';

type FontBytes = { id: string; bytes: ArrayBuffer };

/** Serves vendored font files to the renderer by catalog id. Paths never come from the renderer. */
export class FontAssetService {
  private manifest: Promise<Map<string, Font>> | null = null;

  constructor(private readonly deps: { fs: FsPort; fontsDir: string }) {}

  async load(ids: string[]): Promise<Result<FontBytes[]>> {
    const byId = await this.catalog();
    const fonts: Font[] = [];
    for (const id of ids) {
      const font = byId.get(id);
      if (!font) return err({ code: 'VALIDATION', message: `Unknown font "${id}".`, field: 'ids' });
      fonts.push(font);
    }
    try {
      return ok(
        await Promise.all(
          fonts.map(async (font) => {
            const bytes = await this.deps.fs.readFile(join(this.deps.fontsDir, font.file));
            return { id: font.id, bytes: toArrayBuffer(bytes) };
          }),
        ),
      );
    } catch (e) {
      console.error('[fonts] could not read a font file', e);
      return err({ code: 'STORAGE_FAILED', message: STORAGE_FAILED_TEXT });
    }
  }

  private catalog(): Promise<Map<string, Font>> {
    this.manifest ??= this.deps.fs
      .readFile(join(this.deps.fontsDir, 'fonts.manifest.json'))
      .then((raw) => FontManifest.parse(JSON.parse(new TextDecoder().decode(raw))))
      .then((fonts) => new Map(fonts.map((f) => [f.id, f])));
    return this.manifest;
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
