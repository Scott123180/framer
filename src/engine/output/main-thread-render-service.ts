import type { DesignSpec } from '@shared/domain';
import {
  drawPreview,
  encodePrint,
  type PlanObserver,
  type RenderEngine,
  type RenderService,
} from './render-service';

/** Renders on the current thread. Interchangeable with WorkerRenderService; used by render tests. */
export class MainThreadRenderService implements RenderService {
  constructor(
    private readonly engine: RenderEngine,
    private readonly opts: { onPlan?: PlanObserver } = {},
  ) {}

  async renderPreview(spec: DesignSpec, targetWidthPx: number): Promise<ImageBitmap> {
    return drawPreview(spec, targetWidthPx, this.engine, this.opts.onPlan).transferToImageBitmap();
  }

  renderPrint(spec: DesignSpec): Promise<ArrayBuffer> {
    return encodePrint(spec, this.engine, this.opts.onPlan);
  }
}
