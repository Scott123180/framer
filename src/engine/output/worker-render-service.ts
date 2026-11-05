import type { DesignSpec } from '@shared/domain';
import type { FontFile } from './font-registry';
import type { RenderRequest, RenderResponse } from './protocol';
import type { RenderService } from './render-service';

type Pending = { resolve(r: RenderResponse): void; reject(e: Error): void };

/** Renders in a dedicated worker on OffscreenCanvas so the UI stays responsive (research R4). */
export class WorkerRenderService implements RenderService {
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();

  private constructor(private readonly worker: Worker) {
    worker.onmessage = (e: MessageEvent<RenderResponse>) => {
      const p = this.pending.get(e.data.id);
      if (!p) return;
      this.pending.delete(e.data.id);
      if (e.data.ok) p.resolve(e.data);
      else p.reject(new Error(e.data.error));
    };
    worker.onerror = (e) => {
      const error = new Error(e.message || 'The render worker failed');
      for (const p of this.pending.values()) p.reject(error);
      this.pending.clear();
    };
  }

  static async create(manifest: unknown, fonts: FontFile[]): Promise<WorkerRenderService> {
    const worker = new Worker(new URL('./render.worker.ts', import.meta.url), { type: 'module' });
    const service = new WorkerRenderService(worker);
    await service.send({ type: 'init', manifest, fonts });
    return service;
  }

  private send(req: DistributiveOmit<RenderRequest, 'id'>): Promise<RenderResponse> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ ...req, id });
    });
  }

  async renderPreview(spec: DesignSpec, targetWidthPx: number): Promise<ImageBitmap> {
    const res = await this.send({ type: 'preview', spec, width: targetWidthPx });
    if (res.ok && res.type === 'preview') return res.bitmap;
    throw new Error('Unexpected render worker reply');
  }

  async renderPrint(spec: DesignSpec): Promise<ArrayBuffer> {
    const res = await this.send({ type: 'print', spec });
    if (res.ok && res.type === 'print') return res.jpeg;
    throw new Error('Unexpected render worker reply');
  }
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
