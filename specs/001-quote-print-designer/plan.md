# Implementation Plan: Quote Print Designer

**Branch**: `001-quote-print-designer` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-quote-print-designer/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Framer is a cross-platform **Electron desktop app** for Linux, macOS, and Windows. It turns an
inspirational quote into print-ready JPEGs for retail photo centers. The user enters a quote and
gets **12 rendered style options**, each a distinct font and procedural-background pair with
guaranteed WCAG contrast. The user can regenerate without repeats, pick one or more options,
change print size, orientation, and frame-ready margin, and save exact-size 300 PPI JPEGs to an
export folder. Quotes and saved designs are kept in a local library.

Technical approach:

- **One TypeScript codebase**: a React renderer, an Electron main process that acts as the
  back end, and a narrow typed preload bridge.
- **One rendering path** for previews and final images: the layout is computed once at print
  resolution and drawn on GPU-accelerated Chromium canvas, with the final image drawn in a Web
  Worker on an `OffscreenCanvas`.
- **Interface seams** (style generator, background painters, render service, repositories)
  make it easy to swap components later. For example, a GPU-powered AI background generator in
  a uv-managed Python sidecar can be added without touching the layout or UI.
- **CI and release**: GitHub Actions run tests on every PR. Publishing a GitHub Release builds
  installers for all three OSes and attaches them to it.

## Technical Context

**Language/Version**: TypeScript 5.x+ (strict) on Node 24 LTS for tooling. Electron ≥ 41
supplies its own Chromium and Node. There is no Python in v1, and any future Python will be
managed with uv (research R3, R9).

**Primary Dependencies**:

- App: Electron, React 19, electron-vite (≥ 5), electron-builder (26.x)
- Validation: zod (IPC and persistence)
- Fonts: fontkit (glyph coverage), plus vendored OFL fonts and Noto Color Emoji

**Storage**: Local files under Electron `userData`:

- `library.json` (zod-validated, atomic writes)
- `designs/<id>.jpg` and `designs/<id>.thumb.jpg`
- Exports go to `<Pictures>/Framer`, overridable with `FRAMER_EXPORT_DIR` (research R8, R13).

**Testing**:

- Vitest: unit tests on jsdom or Node, with React Testing Library
- Vitest browser mode on Chromium for render tests
- Playwright `_electron` for E2E, with `@axe-core/playwright`
- ESLint, Prettier, and `tsc --noEmit` (research R12)

**Target Platform**: Desktop apps for Linux x64 (AppImage, deb), Windows x64 (NSIS), and macOS
arm64 + x64 (dmg, zip), built by GitHub Actions on `release: published` (research R11).

**Project Type**: desktop-app (Electron: main + preload + renderer, plus a shared pure-TS
domain and rendering engine)

**Performance Goals**:

- 12 previews visible within **3 s** of Generate or Regenerate (SC-002). The target is under
  1 s on the dev machine.
- UI feedback within 100 ms (Constitution IV).
- An 8x10 final image (7.2 MP) renders and encodes in under 1 s per image off the main thread.

**Constraints**:

- Works fully offline, with no network calls.
- Preview and final image must match pixel for pixel in layout (FR-010, SC-006).
- Final JPEGs are exact pixel sizes at 300 PPI (FR-018).
- Text contrast is at least 4.5:1 (SC-005).
- Text stays at least 0.125 in from every edge (FR-014).
- Electron security baseline: `contextIsolation`, `sandbox`, no `nodeIntegration`, and a CSP.
- GPU use is opportunistic: it is used when available, and the app works without it.

**Scale/Scope**: One user. About 100s of quotes and designs. 1 window and 3 regions. About 20
fonts and 40+ background variants. 3 print sizes × 2 orientations × 4 margin states.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Gate | How this plan complies | Status |
|---|---|---|
| **I. Test-First** | Every module has a fast test path. Pure domain, generator, layout, reducer, and JPEG density code is unit-tested with a seeded PRNG and a fake `TextMeasurer`. Main services are tested with fake fs, clock, and image resizer. `tasks.md` will order test tasks before implementation tasks. | ✅ PASS |
| **II. SOLID** | Single responsibility: UI, state (reducer), domain, rendering engine, and I/O (main) are separate units. Open/closed: background kinds plug in through `PainterRegistry`. Liskov: `WorkerRenderService` and `MainThreadRenderService` are interchangeable, and so are the JSON and in-memory repositories. Interface segregation: small interfaces such as `TextMeasurer`, `GlyphCoverage`, `ContrastPolicy`, and `FramerApi` grouped by use. Dependency inversion: one composition root in each process injects fs, clock, PRNG, and the bridge. | ✅ PASS |
| **III. E2E** | Each of US1–US4 plus the critical edge paths (empty or too-long quote, stale options, save failure, glyph exclusion) maps to Playwright E2E specs. Selectors come from [contracts/ui.md](./contracts/ui.md) (role and name). Each test gets its own user-data and export directories, so tests run in parallel. **Note**: Playwright drives Electron's Chromium through `_electron.launch`. This is the constitution's default framework, so no exception is needed. | ✅ PASS |
| **IV. Clean UX** | One primary action ("Generate designs"). Loading, empty, error, and success states are defined for each flow ([contracts/ui.md](./contracts/ui.md)). WCAG 2.2 AA, keyboard operation, and visible focus. Skeleton cards prevent layout shift. Shared CSS tokens. The layout reflows from a 480 px window to wide screens. Because this is a desktop app, "mobile widths" means narrow windows. | ✅ PASS |
| **V. Simplicity** | No Python or sidecar, no database, no state or UI library, no auto-updater, and no export-folder setting in v1. The AI `ImageGenerator` seam is **documented only**, not implemented. Each dependency is justified in [research.md](./research.md). | ✅ PASS |
| **Quality gates** | CI (`ci.yml`) runs lint, typecheck, unit, render, and E2E tests (with axe) on every PR, plus a package-smoke build on three OSes. PRs that change the UI include screenshots. | ✅ PASS |

**Post-design re-check (after Phase 1)**: ✅ PASS. The design adds two abstractions that need
explaining: the repository interfaces and the background painter registry. Both are required by
Principle II (dependency inversion and open/closed), and both have at least two implementations
in v1 (JSON and in-memory repositories; five painter kinds). So neither is speculative, and no
Complexity Tracking entry is needed. The one possible YAGNI concern, the AI `ImageGenerator`, is
kept as documentation and not code.

## Project Structure

### Documentation (this feature)

```text
specs/001-quote-print-designer/
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R15
├── data-model.md        # Phase 1: entities, value objects, state transitions, on-disk layout
├── quickstart.md        # Phase 1: run and validation guide
├── contracts/
│   ├── ipc-api.md       # window.framer preload bridge (renderer ↔ main)
│   ├── engine.md        # rendering-engine interfaces and future ImageGenerator seam
│   ├── ui.md            # accessible handles, states, messages (E2E contract)
│   └── dev-tooling.md   # npm scripts, VS Code launch configs, CI and release workflows
└── tasks.md             # Phase 2 (/speckit-tasks; not created here)
```

### Source Code (repository root)

```text
src/
├── shared/                      # Pure TS with no DOM or Node imports; used by every process
│   ├── domain/                  # Quote, PrintSettings, Style, DesignSpec, SavedDesign + zod schemas,
│   │                            #   print-size and margin math, quote normalization and dedupe, filename slug
│   └── ipc/                     # FramerApi interface, channel names, payload schemas, Result/AppError
├── engine/                      # Rendering engine (canvas-dependent, React-free)
│   ├── catalog/                 # font manifest loader, background catalog, palettes
│   ├── generate/                # CatalogStyleGenerator, mulberry32 PRNG, ContrastPolicy, GlyphCoverage
│   ├── layout/                  # TextLayoutEngine (fit and wrap), SafeArea, DrawPlan
│   ├── paint/                   # PainterRegistry, solid/linear/radial/pattern/texture painters, MarginPainter, drawDesign
│   └── output/                  # setJpegDensity, RenderService (Worker + main-thread), render.worker.ts
├── main/                        # Electron main process (Node)
│   ├── index.ts                 # app lifecycle, BrowserWindow, security, GPU status log
│   ├── composition.ts           # composition root: wires services to real fs, clock, nativeImage
│   ├── ipc/                     # thin handlers: validate → call service → Result (+ *.contract.test.ts)
│   ├── persistence/             # JsonLibraryStore (atomic writes), Quote/Design repositories (JSON + in-memory)
│   ├── services/                # QuoteService, DesignService (atomic save), FontAssetService, StartupService
│   └── platform/                # paths (userData, export dir, resources), shell, clock, ImageResizer
├── preload/
│   └── index.ts                 # contextBridge → window.framer (FramerApi)
└── renderer/
    ├── index.html
    └── src/
        ├── app/                 # App shell, composition root (injects FramerApi, RenderService, generator)
        ├── state/               # session reducer + actions (pure, unit-tested)
        ├── features/
        │   ├── compose/         # QuoteInput, PrintSettingsPanel, GenerateButton
        │   ├── options/         # OptionGallery, OptionCard, SaveBar
        │   └── history/         # PreviousQuotes, SavedDesigns, ConfirmDialog
        └── ui/                  # tokens.css, shared components (Button, Switch, RadioGroup, Status)

assets/fonts/                    # vendored OFL fonts + OFL.txt + fonts.manifest.json (+ Noto Color Emoji)
tests/
├── render/                      # Vitest browser mode (real Chromium canvas)
├── e2e/                         # Playwright _electron specs, one or more per user story, + axe
└── fixtures/                    # sample quotes (long, emoji, accents), golden DesignSpecs
                                 # (unit tests sit next to their code as *.test.ts / *.test.tsx)

.github/workflows/ci.yml, release.yml
.vscode/launch.json, tasks.json, extensions.json, settings.json   # .gitignore gets exceptions for these
electron.vite.config.ts, electron-builder.yml, vitest.config.ts (unit + render projects),
playwright.config.ts, eslint.config.js, tsconfig.{json,node.json,web.json}, .nvmrc
```

**Structure Decision**: A single npm package using electron-vite's `main` / `preload` /
`renderer` layout, plus two process-independent layers, `src/shared` and `src/engine`, imported
through TS path aliases (`@shared/*`, `@engine/*`). This keeps every SOLID boundary in one
buildable unit without a monorepo or workspaces (Constitution V). The rendering engine sits
outside `renderer/` so a future process could reuse it unchanged, such as the worker that
already does, or a CLI/batch exporter.

## Key Design Decisions (see research.md for rationale and alternatives)

1. **Electron + electron-vite + electron-builder.** Builds for three OSes come from GitHub
   Actions when a release is published. Artifacts are attached with `gh release upload` (R1,
   R2, R11).
2. **No separate back end in v1.** Electron main is the back end. Python and uv are reserved for
   a future AI sidecar (R3, R9).
3. **GPU.** Chromium's GPU canvas plus `OffscreenCanvas` in a worker handle v1. The RTX 3070 Ti
   is the target for future local diffusion models that generate *backgrounds only*. Text is
   always drawn by our deterministic layout so contrast, safe-area, and glyph guarantees still
   hold (R4).
4. **Preview equals final image.** The layout is computed once at 300 PPI and the preview draws
   it scaled. The JFIF header is patched to 300 DPI (R5).
5. **Curated OFL fonts and procedural backgrounds.** Contrast is guaranteed by luminance
   envelopes, and fontkit coverage checks drop options a font can't display (R6, R7).
6. **Local JSON library and stored JPEG bytes.** Re-downloads are byte-identical, and the full
   `DesignSpec` is kept so designs can be edited in a later version (R8).
7. **VS Code**: F5 runs "Debug App (Main + Renderer)", and there are Vitest and Playwright
   launch configs (R10).

## Spec Alignment Notes

- The spec's Assumption "used on a modern desktop or mobile web browser" now reads **desktop
  app (Electron) on Linux, macOS, Windows**, as the user directed. The spec was updated.
- In the edge case "browser blocks downloads", the desktop equivalent is "export folder not
  writable". The behavior is unchanged: show a plain-language error and record nothing.
- "Download" in the spec means **save to the export folder**, with a "Show in folder" button
  (R13).

## Complexity Tracking

No constitution violations. Table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none) | | |
