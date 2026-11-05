import { createHash } from 'node:crypto';
import { join } from 'node:path';
import type { DesignSpec, SavedDesign } from '@shared/domain';
import { exportFileName, withCounter } from '@shared/domain/filename';
import { pixelSize } from '@shared/domain/print';
import { EXPORT_REASON_TEXT, MSG } from '@shared/ipc/messages';
import { err, ok, type AppError, type Result } from '@shared/ipc/result';
import { errorCode, type FsPort } from '../platform/fs-port';
import type { Clock } from '../platform/clock';
import type { IdSource } from '../platform/ids';
import type { ImageResizer } from '../platform/image-resizer';
import type { DesignRepository } from '../persistence/design-repository';

export const THUMB_LONG_SIDE = 400;
export const THUMB_QUALITY = 85;
const MAX_NAME_ATTEMPTS = 1000;
const NOT_FOUND = { code: 'NOT_FOUND', message: 'That design is no longer in your history.' } as const;

type Deps = {
  fs: FsPort;
  repo: DesignRepository;
  resizer: ImageResizer;
  clock: Clock;
  ids: IdSource;
  paths: { userData: string; designsDir: string; exportDir: string };
};

export type SaveInput = { spec: DesignSpec; jpeg: Uint8Array; quoteId: string | null };

/** Saves designs all-or-nothing: original → thumbnail → export copy → library record (data-model.md). */
export class DesignService {
  constructor(private readonly deps: Deps) {}

  async save({ spec, jpeg, quoteId }: SaveInput): Promise<Result<SavedDesign & { exportedPath: string }>> {
    const expected = pixelSize(spec.print);
    const actual = this.deps.resizer.size(jpeg);
    if (actual.width !== expected.width || actual.height !== expected.height) {
      return err({
        code: 'VALIDATION',
        field: 'jpeg',
        message: `The image is ${actual.width}×${actual.height} pixels, but a ${spec.print.size} print needs ${expected.width}×${expected.height}.`,
      });
    }

    const { fs, paths } = this.deps;
    const id = this.deps.ids.next();
    const written: string[] = [];
    const imagePath = `designs/${id}.jpg`;
    const thumbPath = `designs/${id}.thumb.jpg`;
    try {
      await fs.mkdir(paths.designsDir);
      const image = join(paths.userData, imagePath);
      await fs.writeFile(image, jpeg);
      written.push(image);

      const thumb = join(paths.userData, thumbPath);
      await fs.writeFile(thumb, this.deps.resizer.resizeJpeg(jpeg, THUMB_LONG_SIDE, THUMB_QUALITY));
      written.push(thumb);

      const exported = await this.exportCopy(image, exportFileName(spec));
      written.push(exported.path);

      const design: SavedDesign = {
        id,
        quoteId,
        spec,
        fileName: exported.fileName,
        imagePath,
        thumbPath,
        pixelWidth: actual.width,
        pixelHeight: actual.height,
        byteSize: jpeg.byteLength,
        sha256: sha256(jpeg),
        savedAt: this.deps.clock.now().toISOString(),
      };
      await this.deps.repo.add(design);
      return ok({ ...design, exportedPath: exported.path });
    } catch (e) {
      console.error('[designs] save failed', e);
      await Promise.all(written.map((p) => fs.rm(p).catch(() => undefined)));
      return err(exportError(e));
    }
  }

  async list(): Promise<Result<SavedDesign[]>> {
    return ok(await this.deps.repo.list());
  }

  async thumbnail(id: string): Promise<Result<string>> {
    const design = await this.deps.repo.get(id);
    if (!design) return err(NOT_FOUND);
    const bytes = await this.deps.fs.readFile(join(this.deps.paths.userData, design.thumbPath));
    return ok(`data:image/jpeg;base64,${Buffer.from(bytes).toString('base64')}`);
  }

  /** Copies the stored original to the export folder again, checking it is byte-identical (FR-023). */
  async reexport(id: string): Promise<Result<{ exportedPath: string }>> {
    const design = await this.deps.repo.get(id);
    if (!design) return err(NOT_FOUND);
    const source = join(this.deps.paths.userData, design.imagePath);
    if (sha256(await this.deps.fs.readFile(source)) !== design.sha256) {
      return err({
        code: 'STORAGE_FAILED',
        message: "This design's saved image was changed or damaged, so it can't be saved again.",
      });
    }
    try {
      const exported = await this.exportCopy(source, design.fileName.replace(/-\d+\.jpg$/, '.jpg'));
      if (sha256(await this.deps.fs.readFile(exported.path)) !== design.sha256) {
        await this.deps.fs.rm(exported.path);
        return err({
          code: 'STORAGE_FAILED',
          message: "The copy didn't match the original, so it was removed. Please try again.",
        });
      }
      return ok({ exportedPath: exported.path });
    } catch (e) {
      console.error('[designs] re-export failed', e);
      return err(exportError(e));
    }
  }

  async delete(id: string): Promise<Result<void>> {
    const design = await this.deps.repo.get(id);
    if (!design) return err(NOT_FOUND);
    await this.deps.repo.delete(id);
    for (const p of [design.imagePath, design.thumbPath]) {
      await this.deps.fs.rm(join(this.deps.paths.userData, p)).catch(() => undefined);
    }
    return ok(undefined);
  }

  /** Copies a stored image into the export folder under a free name; never overwrites. */
  private async exportCopy(source: string, fileName: string): Promise<{ path: string; fileName: string }> {
    await this.deps.fs.mkdir(this.deps.paths.exportDir);
    for (let n = 1; n <= MAX_NAME_ATTEMPTS; n++) {
      const candidate = n === 1 ? fileName : withCounter(fileName, n);
      const path = join(this.deps.paths.exportDir, candidate);
      try {
        await this.deps.fs.copyFile(source, path);
        return { path, fileName: candidate };
      } catch (e) {
        if (errorCode(e) !== 'EEXIST') throw e;
      }
    }
    throw new Error('No free export file name');
  }
}

export function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function exportError(e: unknown): AppError {
  const code = errorCode(e);
  const reason =
    code === 'ENOSPC'
      ? 'NO_SPACE'
      : code && ['EACCES', 'EPERM', 'EROFS'].includes(code)
        ? 'PERMISSION'
        : 'UNKNOWN';
  return { code: 'EXPORT_FAILED', reason, message: MSG.saveFailed(EXPORT_REASON_TEXT[reason]) };
}
