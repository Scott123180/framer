# Phase 0 Research: Quote Print Designer

**Feature**: `001-quote-print-designer` | **Date**: 2026-11-04 | **Plan**: [plan.md](./plan.md)

Each section records a decision, why we made it, and what else we looked at. Version numbers are
lower bounds checked on 2026-11-04. Exact versions are pinned in `package-lock.json` when the
project is scaffolded.

---

## R1. Application shell: Electron desktop app

- **Decision**: Build a desktop app with Electron for Linux, macOS, and Windows. The project
  starts on the latest stable Electron (≥ 41). Security settings follow Electron's checklist:
  `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, a strict CSP, and a
  narrow typed preload bridge.
- **Rationale**: The user asked for it. One Chromium runtime on all three OSes means a preview
  draws the same way everywhere, which supports FR-010 and SC-006. Chromium's GPU-accelerated
  canvas also gives GPU rendering for free (see R4).
- **Alternatives considered**:
  - *Tauri*: smaller binaries, but it uses each OS's own webview (WebKitGTK, WKWebView, WebView2).
    Canvas text rendering and font fallback differ between those engines, which makes it harder
    to guarantee that a preview matches the saved image. Its backend is Rust.
  - *Browser app (PWA)*: the spec originally assumed a browser. The user chose a desktop app, so
    the spec's Assumptions were updated to match.

## R2. Toolchain: electron-vite + electron-builder

- **Decision**: Use **electron-vite** (≥ 5) for dev, HMR, and building the main, preload, and
  renderer bundles. Use **electron-builder** (26.x) to package. The project uses npm and
  Node 24 LTS, recorded in `.nvmrc` and `engines`.
- **Rationale**: electron-vite gives one config for the three Electron targets, fast HMR in the
  React renderer, and a documented VS Code debug setup (R10). electron-builder makes NSIS, DMG,
  AppImage, and deb installers from one YAML file. It is the most widely used packager and
  works with GitHub Actions.
- **Alternatives considered**:
  - *Electron Forge + Vite plugin*: Forge is the official tool, but its Vite plugin has been
    marked experimental for a long time and its maker setup is more verbose.
  - *pnpm*: electron-builder needs `node-linker=hoisted` to work with pnpm. npm avoids that.
  - electron-builder v27 is still in alpha. It moves to ESM-only and requires Node ≥ 22.12. We
    stay on 26.x until 27 is stable. Node 24 already meets 27's floor.

## R3. Back end: no Python process in v1; TypeScript end to end

- **Decision**: v1 has **no separate back-end service**. The Electron **main process**
  (TypeScript/Node) is the back end. It handles persistence, writing image files, and OS
  integration. The **renderer** (React) draws designs on canvas. No Python ships in v1.
- **Rationale**:
  - v1 only needs to draw text on procedural backgrounds and encode JPEGs. Chromium canvas does
    both well. Drawing previews and final images with **the same code in the same engine** is
    the simplest way to meet FR-010 and SC-006.
  - A Python sidecar would need PyInstaller (or similar) builds on every OS, process lifecycle
    management, an IPC protocol, and a second test toolchain. Constitution V (YAGNI) rules that
    out while nothing in the spec needs it.
- **Future path (documented, not built)**: When AI-generated backgrounds are added, a Python
  sidecar is the right tool (PyTorch/CUDA ecosystem). It will be a **uv** project (R9) and will
  plug into the `ImageGenerator` seam defined in [contracts/engine.md](./contracts/engine.md).
- **Alternatives considered**: FastAPI + Pillow/skia-python back end that renders previews as
  PNGs. Rejected: it adds a second renderer and a second language, and every preview would need
  a round trip to the back end. No v1 requirement benefits.

## R4. GPU acceleration

- **Decision**:
  1. **v1**: rely on Chromium's GPU-rasterized Canvas 2D, which Electron enables by default.
     Final full-resolution images are drawn in a **Web Worker on an `OffscreenCanvas`**, which is
     also GPU-backed, so the UI stays responsive. At startup the main process logs
     `app.getGPUFeatureStatus()` so developers can confirm `gpu_compositing` and
     `2d_canvas: enabled`. A `--disable-gpu` escape hatch exists for broken drivers. The software
     fallback is fast enough for v1, so the GPU is an optimization, not a requirement.
  2. **Future (AI backgrounds)**: the developer's **RTX 3070 Ti (8 GB VRAM, driver 580,
     detected on the dev machine)** can run SD-Turbo, SDXL-Turbo, or SD 1.5–class diffusion
     models in fp16 within 8 GB. FLUX-class models would need 4-bit quantization. The model would
     run in the uv-managed Python sidecar using the PyTorch CUDA wheels.
- **Rationale**: The v1 workload is small. The largest image is 8x10 at 300 PPI, which is 7.2 MP.
  Twelve previews are each about 0.1–0.3 MP. The GPU canvas easily meets SC-002 (3 s), so a
  custom WebGL or WebGPU pipeline would add complexity for no benefit.
- **Key design insight for AI**: diffusion models draw text poorly. AI should generate **only the
  background image**. Our deterministic text layout then draws the quote on top. This keeps the
  contrast (FR-008), safe-area (FR-014), and glyph-fidelity guarantees, and lets AI backgrounds
  plug in as one more background source.
- **Alternatives considered**: WebGL shaders for procedural textures, which aren't needed for v1
  pattern quality; ONNX Runtime Web with WebGPU in the renderer, which is possible later but
  less mature and slower for diffusion than CUDA PyTorch.

## R5. Rendering pipeline and preview/print fidelity

- **Decision**:
  - The **layout is computed once, in print-resolution pixel units** (300 PPI), producing a
    `DrawPlan`: wrapped lines, font sizes, and positions. The preview draws the *same* plan with
    `ctx.scale(previewWidth / printWidth)`. The final image draws it at scale 1.
  - Text fitting uses a binary search on font size. Words wrap greedily, and the user's line
    breaks are kept. Text is measured with `ctx.measureText` behind a `TextMeasurer` interface.
    The attribution is drawn at about 0.55× the quote size in the style's secondary color.
  - If a font can't fit a quote inside the safe area above a minimum legible size (9 pt at
    print), that font is left out of the set.
  - Final images are encoded as **JPEG, quality 0.95, sRGB**, with
    `OffscreenCanvas.convertToBlob`. The JFIF APP0 header is then patched to say **300 DPI**,
    because Chromium writes an aspect-only density. This is a small, unit-tested pure function.
- **Rationale**: Line breaks depend on measurement precision. If the preview did its own layout
  at preview size, it could wrap differently from the final image. Sharing one plan guarantees
  identical layout (FR-010). Pixel dimensions are what photo centers check (SC-003). The DPI tag
  makes the file show the intended print size in other tools.
- **Alternatives considered**: SVG with server rasterization, which has font-loading
  inconsistencies; html2canvas or DOM snapshots, which are not pixel-exact; separate preview and
  final renderers, which break FR-010.

## R6. Style catalog: fonts, backgrounds, contrast, glyph coverage

- **Decision**:
  - **Fonts**: about 18–24 curated **SIL OFL** families, vendored as full `.ttf` files in
    `assets/fonts/<family>/` with their `OFL.txt` and listed in `fonts.manifest.json`. The set
    covers serif (EB Garamond, Lora, Playfair Display, Libre Baskerville), sans-serif
    (Montserrat, Raleway, Work Sans, Josefin Sans), script (Great Vibes, Dancing Script,
    Satisfy), and display (Abril Fatface, Bebas Neue, Amatic SC). OFL allows embedding in
    output images. Fonts load from disk, so the app needs no network.
  - **Emoji**: **Noto Color Emoji** (OFL) is added as the last fallback in every font stack, so
    emoji look the same in every option and on every OS.
  - **Glyph coverage**: `fontkit` reads each font's character map once at startup and caches
    it. An option is left out of the set if its primary font lacks any non-emoji code point in
    the quote or attribution. This covers the spec's "missing glyphs" edge case.
  - **Backgrounds** are procedural and deterministic, built from parameters plus a seed: solid,
    linear gradient, radial gradient, pattern (dots, stripes, grid, chevrons), and grain/paper
    texture from seeded value noise. Each comes from a curated palette. No image assets means no
    licensing questions and small installers.
  - **Contrast (FR-008, SC-005)**: each background reports a *luminance envelope*, the darkest and
    lightest color it can produce. Text and attribution colors are chosen from the style palette
    so the **worst-case** WCAG contrast against that envelope is at least 4.5:1. Combinations
    that can't reach it are dropped. A render test samples real pixels under the text to check
    the envelope claim.
- **Rationale**: These choices meet FR-006 variety and SC-004/SC-005 with checks we can prove,
  and add no runtime network dependency.
- **Alternatives considered**: `@fontsource` packages, which split each font into
  unicode-range subset files and complicate coverage checks; system fonts, which vary by OS and
  have unknown licenses; checking contrast only by pixel sampling at generation time, which is
  slower and harder to test than an envelope declared up front.

## R7. Option generation strategy

- **Decision**: A `StyleGenerator` takes a seed, the font catalog, the background catalog, the
  quote's required code points, and an exclusion set. It returns **12** distinct
  (font × background-variant) combinations (FR-004). It spreads picks across font categories
  and background kinds round-robin so every set is varied. On regenerate it excludes every
  combination shown earlier in this session for this quote (FR-009). If too few unseen
  combinations remain, it reuses older ones and sets an `exhausted` flag so the UI can tell the
  user (spec edge case). Randomness comes from an injected seeded PRNG (mulberry32), which keeps
  tests deterministic.
- **Rationale**: This is pure, deterministic, and fully unit-testable (Constitution I). The
  strategy sits behind an interface so a future "AI-assisted" generator can replace it.
- **Alternatives considered**: purely random picks, which can return several similar options in
  one set.

## R8. Persistence: JSON library + image files in `userData`

- **Decision**: The main process stores data under `app.getPath('userData')`:
  - `library.json` holds the schema version, quotes, and saved designs. It is validated with
    **zod** when read. Writes are **atomic**: write a temp file, `fsync`, then rename, with a
    retry for Windows `EPERM`. Writes are queued one at a time.
  - `designs/<id>.jpg` is the canonical saved image. `designs/<id>.thumb.jpg` is a 400 px
    thumbnail made with Electron's `nativeImage.resize`.
  - If `library.json` is corrupt, it is moved to `library.corrupt-<timestamp>.json`, the app
    starts with an empty library, and the user sees a plain-language notice.
  - **Re-download copies the stored JPEG bytes**, which guarantees an identical image (FR-023).
    The full `DesignSpec` is kept so designs can be edited in a later version (FR-026).
- **Rationale**: One user and small data (hundreds of records at most). No native modules means
  no Electron ABI rebuilds in the three-OS CI matrix. The `QuoteRepository` and
  `DesignRepository` interfaces let SQLite replace JSON later without callers changing.
- **Alternatives considered**: `better-sqlite3`, a native module that must be rebuilt for each
  Electron ABI on each OS; `node:sqlite`, which is still experimental in Electron's Node;
  IndexedDB in the renderer, which can't easily write to the user's export folder and is harder
  to inspect or back up.

## R9. Python & uv (future sidecar convention)

- **Decision**: v1 ships no Python. Any later Python component (first expected: the AI
  background generator) MUST be a **uv** project in `ml/`. It will have a `pyproject.toml`
  and a committed `uv.lock`. `uv sync` sets it up, and `uv run` runs it. PyTorch comes from the
  CUDA wheel index set in `[tool.uv.sources]`, with a CPU fallback. Electron main would start it
  as a child process bound to `127.0.0.1` with a random port and a one-time token, and talk to
  it through the `ImageGenerator` contract.
- **Rationale**: This follows the user's preference. uv makes setup a single command that
  developers and CI can repeat. uv is already installed on the dev machine
  (`~/.local/bin/uv`).
- **Alternatives considered**: pip/venv and conda, which are slower, less reproducible, and
  heavier.

## R10. VS Code developer experience

- **Decision**: Commit `.vscode/launch.json`, `tasks.json`, `extensions.json`, and
  `settings.json`. The `.gitignore` gets `!` exceptions so they aren't ignored. Launch
  configurations:
  1. **Debug Main Process**: a `node` launch of `electron-vite dev --sourcemap` with
     `REMOTE_DEBUGGING_PORT=9222`. It uses the Windows `.cmd` override.
  2. **Debug Renderer Process**: a `chrome` attach on port 9222 with webRoot `src/renderer`.
  3. **Debug App (Main + Renderer)**: a compound of 1 and 2. This is the default F5.
  4. **Vitest: current file** and **Vitest: all unit tests**.
  5. **Playwright: E2E** (runs the Electron E2E suite with `PWDEBUG` off or on).
  Recommended extensions: ESLint, Prettier, Vitest Explorer, Playwright Test for VS Code.
- **Rationale**: This is the documented electron-vite pattern and the user asked for it. Note
  that the current `.gitignore` excludes `.vscode/*` except `extensions.json`, so it must be
  changed.

## R11. CI and release on GitHub Actions

- **Decision**: Two workflows:
  - **`ci.yml`** runs on `pull_request` and on `push` to `main`. An Ubuntu job runs lint,
    typecheck, unit tests, render tests, and E2E tests (Playwright Electron under `xvfb-run`)
    and uploads Playwright traces when a test fails. A **package-smoke matrix** (ubuntu,
    windows, macos) runs `electron-builder --dir` so platform-specific build problems show up
    before a release.
  - **`release.yml`** runs `on: release: types: [published]`. A matrix (ubuntu-latest,
    windows-latest, macos-latest) first checks that the release tag equals `v${package.version}`
    and runs the test suites. It then builds with `electron-builder --publish never` and
    attaches the outputs with `gh release upload "$TAG" … --clobber`. It needs
    `permissions: contents: write`. Outputs: Linux `.AppImage` + `.deb` (x64), Windows NSIS
    `.exe` (x64), and macOS `.dmg` + `.zip` (arm64 and x64).
- **Rationale**: Building on the "release published" event matches how the user wants to work.
  Uploading with `gh` targets the release that already exists. electron-builder's own GitHub
  publisher defaults to creating *draft* releases, and its `releaseType: release` path has a
  history of bugs.
- **Code signing**: out of scope for v1. Unsigned builds show Gatekeeper and SmartScreen
  warnings, which is acceptable for personal use. The workflow reads optional `CSC_LINK`,
  `CSC_KEY_PASSWORD`, `APPLE_ID`, and `APPLE_APP_SPECIFIC_PASSWORD` secrets, so signing and
  notarization can be turned on later without editing the workflow.
- **Auto-update**: out of scope for v1 (YAGNI). electron-updater can be added later.

## R12. Testing stack

- **Decision**:
  - **Vitest** (≥ 4) runs **unit tests** of domain, engine logic, reducers, main-process
    services with fakes, and the JPEG DPI patch. React components are tested with **React
    Testing Library** on **jsdom**.
  - **Render tests** use **Vitest browser mode with the Playwright provider in Chromium**, so
    they draw on a real canvas: image size, safe-area containment, sampled contrast, glyph
    exclusion, and preview/final layout equality.
  - **E2E tests** use **Playwright `_electron.launch`** against the built app. Each test gets its
    own temporary `--user-data-dir` and `FRAMER_EXPORT_DIR`, so tests can run in parallel. Each
    primary screen is scanned with **@axe-core/playwright** (zero serious or critical
    violations).
  - Linting uses ESLint flat config with typescript-eslint, react-hooks, and jsx-a11y.
    Formatting uses Prettier. Type checking runs `tsc --noEmit` per project.
  - **Coverage** uses **@vitest/coverage-v8** (Vitest's own maintained provider, no
    instrumentation build step) across the unit and render projects. Per-layer line thresholds
    for `src/shared/**`, `src/engine/**`, and `src/renderer/src/**` start at 85% and use
    `thresholds.autoUpdate`, so a run that beats a threshold raises it in `vitest.config.ts`
    and the new value is committed. CI fails when coverage drops below the committed value,
    which enforces quality gate 2 ("coverage MUST NOT decrease") without a separate service.
- **Rationale**: This meets the Constitution's Testing Standards. Playwright is the
  constitution's default E2E framework, and it drives Electron's Chromium directly.
- **Alternatives considered**: WebdriverIO with wdio-electron-service, which works but differs
  from the constitution default; node-canvas or skia-canvas for render tests, which would test a
  different rasterizer than the one we ship.

## R13. Saving & export UX (desktop translation of "download")

- **Decision**: **Save** writes each selected design to an **export folder**, by default
  `<Pictures>/Framer` (`app.getPath('pictures')`). The success message shows **Show in folder**
  (`shell.showItemInFolder`). If the folder can't be written, the user gets a plain-language
  error and nothing is recorded (spec edge case). File names follow
  `framer-<quote-slug>-<size>-<orientation>[-<n>].jpg`. They are made safe for Windows, macOS,
  and Linux (reserved names and characters, and a 120-character limit), and a counter suffix
  prevents overwriting existing files (FR-019). Saved designs are always written to `userData`
  first and then copied to the export folder. A history record is written only after both
  writes succeed.
- **Rationale**: One click and no dialog for each file. This meets SC-001 (under 2 min) and the
  constitution's "one clear primary action". Changing the export folder is not a spec
  requirement, so v1 does not include it. `FRAMER_EXPORT_DIR` overrides the folder for tests.
- **Alternatives considered**: a Save dialog for every file, which adds friction when saving
  several; a folder-picker dialog every time, which is one extra step on every save.

## R14. Renderer state & UI building blocks

- **Decision**: Session state (current quote, print settings, option set, selection, stale
  flag, exclusion history) lives in a **pure `useReducer` reducer**. History data comes from
  small hooks over the injected `FramerApi`. UI uses native accessible elements (`<dialog>`,
  `<fieldset>`/radio groups, `<button aria-pressed>`) styled with **CSS Modules** and CSS
  custom-property design tokens.
- **Rationale**: This adds no state or UI library. A pure reducer is easy to test first. Native
  elements cover our accessibility needs (Constitution IV).
- **Alternatives considered**: Zustand/Redux Toolkit, Radix/MUI — not needed for this small
  set of screens.

## R15. Margin rendering ("frame-ready")

- **Decision**: Margin widths are fractions of the print's short side: small 1/16, medium 1/8,
  large 3/16. On a 4x6 that is 0.25", 0.5", and 0.75", and it scales up for 5x7 and 8x10, as the
  spec assumes. The margin band is filled with the background's own **mat tone**, a solid color
  from that background's palette, and the full background fills the inner area. The text safe
  area is the inner area minus padding. Without a margin, padding is
  `max(0.25", 6% of the short side)`, which is at least the 0.125" FR-014 requires and leaves
  room for photo-center trimming.
- **Rationale**: The margin is visible (acceptance 3.3) and uses the design's own colors, not
  white (spec assumption). A `MarginPainter` strategy keeps this visual choice easy to change.
