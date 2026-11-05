import type { DesignSpec } from '@shared/domain';
import type { FontFile } from './font-registry';

/** Messages from the renderer to the render worker. */
export type RenderRequest =
  | { type: 'init'; id: number; manifest: unknown; fonts: FontFile[] }
  | { type: 'preview'; id: number; spec: DesignSpec; width: number }
  | { type: 'print'; id: number; spec: DesignSpec };

/** Replies from the worker, matched to requests by id. */
export type RenderResponse =
  | { id: number; ok: true; type: 'ready' }
  | { id: number; ok: true; type: 'preview'; bitmap: ImageBitmap }
  | { id: number; ok: true; type: 'print'; jpeg: ArrayBuffer }
  | { id: number; ok: false; error: string };
