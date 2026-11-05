# Contract: Rendering Engine Interfaces (`src/engine/`)

These interfaces are the seams that let parts be swapped (Constitution II). Every consumer depends
on the interface, and the composition root (`src/renderer/src/app/composition.ts`) picks the
implementations. Each interface has a small fake or test implementation.

## Style generation (strategy)

```ts
interface StyleGenerator {
  /**
   * Return up to `count` styles. Rules:
   *  - All comboKeys in the result are distinct (FR-005).
   *  - No result is in `exclude` while unseen combinations remain (FR-009).
   *  - The primary font covers every non-emoji code point in `requiredCodePoints` (glyph edge case).
   *  - textColor and attributionColor have contrast ≥ 4.5:1 against the background's darkest and lightest colors (FR-008).
   *  - Picks rotate across font categories and background kinds (FR-006).
   *  - Same input and same seed give the same output.
   */
  generate(req: {
    count: number;                     // 12 in v1 (FR-004)
    requiredCodePoints: ReadonlySet<number>;
    exclude: ReadonlySet<string>;      // comboKeys
    seed: number;
  }): { styles: Style[]; exhausted: boolean };
}
```

- v1 implementation: `CatalogStyleGenerator(fontCatalog, backgroundCatalog, glyphCoverage, contrast, prng)`.
- Future: `AiAssistedStyleGenerator` would wrap `CatalogStyleGenerator` and add `kind: 'image'`
  backgrounds from `ImageGenerator`.

## Text layout (pure, no drawing)

```ts
interface TextMeasurer { width(text: string, font: FontSpec): number; metrics(font: FontSpec): { ascent: number; descent: number } }

interface TextLayoutEngine {
  /** Fit the quote and attribution inside the safe area. Returns null if it can't fit at ≥ 9 pt, so the option is dropped (FR-007). */
  layout(spec: DesignSpec, safeArea: SafeArea, measurer: TextMeasurer): DrawPlan | null;
}

type DrawPlan = {
  canvas: { width: number; height: number };   // print pixels (FR-018)
  safeArea: SafeArea;
  marginPx: number;
  lines: Array<{ text: string; x: number; y: number; font: FontSpec; color: Hex; role: 'quote' | 'attribution' }>;
};
```

- Requirement: every line's measured bounding box is inside `safeArea` (SC-004). Unit tests check
  this with a fixed-width fake measurer. Render tests check it with the real canvas.

## Painting (open/closed registry)

```ts
interface BackgroundPainter<K extends BackgroundSpec['kind']> {
  kind: K;
  paint(ctx: Canvas2D, spec: Extract<BackgroundSpec, { kind: K }>, rect: Rect): void;
  luminanceEnvelope(spec: Extract<BackgroundSpec, { kind: K }>): { min: number; max: number };
  matTone(spec: Extract<BackgroundSpec, { kind: K }>): Hex;
}

interface PainterRegistry { register(p: BackgroundPainter<any>): void; get(kind: string): BackgroundPainter<any> }

interface MarginPainter { paint(ctx: Canvas2D, plan: DrawPlan, matTone: Hex): void }

/** Draws a DrawPlan. Preview and final output call the same function with different scales (FR-010). */
function drawDesign(ctx: Canvas2D, plan: DrawPlan, style: Style, painters: PainterRegistry, scale: number): void;
```

- A new background kind means a new painter and a `register` call. No existing painter changes.
- Render tests check that each painter's `luminanceEnvelope` holds for the pixels it actually
  draws. The test samples a 32×32 grid.

## Rendering service (thread boundary)

```ts
interface RenderService {
  /** Small bitmap for the gallery. The DrawPlan is computed at print resolution, then scaled. */
  renderPreview(spec: DesignSpec, targetWidthPx: number): Promise<ImageBitmap>;
  /** Full-resolution JPEG at quality 0.95 with a 300 DPI JFIF header (FR-018). */
  renderPrint(spec: DesignSpec): Promise<ArrayBuffer>;
}
```

- v1 implementation: `WorkerRenderService`. It runs on `OffscreenCanvas` in a dedicated Web
  Worker, on the GPU when available (research R4), and uses a typed request/response message
  protocol.
- Test implementation: `MainThreadRenderService`, which uses the same `drawDesign` on a normal
  canvas. Render tests use it.

## Supporting interfaces

```ts
interface GlyphCoverage { covers(fontId: string, codePoints: ReadonlySet<number>): boolean }   // fontkit-backed
interface ContrastPolicy { pickTextColors(envelope: { min: number; max: number }, palette: Hex[]): { text: Hex; attribution: Hex } | null } // WCAG 2.x ratio ≥ 4.5
interface Prng { next(): number }                    // mulberry32(seed)
function setJpegDensity(jpeg: Uint8Array, ppi: number): Uint8Array   // patches the JFIF APP0 header; pure function
```

## Future seam: `ImageGenerator` (documented only; NOT implemented in v1)

```ts
interface ImageGenerator {
  readonly id: string;                         // e.g. 'local-sdxl-turbo'
  available(): Promise<{ ok: boolean; device: 'cuda' | 'cpu' | 'none'; detail?: string }>;
  generate(req: { prompt: string; width: number; height: number; seed: number; count: number }):
    Promise<Array<{ assetId: string; bytes: ArrayBuffer }>>;
}
```

- Plan for later: a uv-managed Python sidecar in `ml/`, bound to `127.0.0.1` with a token, using
  PyTorch CUDA on the RTX 3070 Ti. Main would wrap it as `SidecarImageGenerator`. Its output would
  become a `{ kind: 'image' }` `BackgroundSpec` with its own `BackgroundPainter`, so text layout,
  contrast checks, and safe-area rules stay the same (research R3, R4, R9).
- The interface exists only in this document until a spec requires it (Constitution V).
