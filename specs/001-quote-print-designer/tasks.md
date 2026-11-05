---

description: "Task list for implementing the Quote Print Designer (Framer) feature"
---

# Tasks: Quote Print Designer

**Input**: Design documents from `/specs/001-quote-print-designer/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (ipc-api.md, engine.md, ui.md, dev-tooling.md), quickstart.md

**Tests**: REQUIRED. Constitution Principle I (Test-First, NON-NEGOTIABLE) and the Development Workflow
("test tasks MUST precede their corresponding implementation tasks") apply. Every test task must be
written first and **seen failing for the expected reason** before its implementation task starts.
Unit tests sit next to their code (`*.test.ts` / `*.test.tsx`); render tests are in `tests/render/`;
E2E tests are in `tests/e2e/`.

**Organization**: Tasks are grouped by user story so each story can be built, tested, and demoed on
its own. Story order follows spec priority: US1 (P1) → US2 (P2) → US3 (P2) → US4 (P3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: Which user story the task belongs to (US1–US4)
- Every task names the exact file(s) it creates or changes

## Path Conventions

Single electron-vite package at the repo root (plan.md → Project Structure):
`src/shared/` (pure TS), `src/engine/` (canvas, no React), `src/main/`, `src/preload/`,
`src/renderer/src/`, `assets/fonts/`, `tests/{render,e2e,fixtures}/`. Path aliases: `@shared/*` →
`src/shared/*`, `@engine/*` → `src/engine/*`.

## Conventions used by every task

- **Accessible names, roles, and user-facing messages** come verbatim from
  [contracts/ui.md](./contracts/ui.md). Do not paraphrase them.
- **IPC channels, payloads, and error codes** come verbatim from
  [contracts/ipc-api.md](./contracts/ipc-api.md). Bridge calls never throw; they return
  `Result<T>`.
- **Engine interfaces** (`StyleGenerator`, `TextMeasurer`, `TextLayoutEngine`, `DrawPlan`,
  `BackgroundPainter`, `PainterRegistry`, `MarginPainter`, `drawDesign`, `RenderService`,
  `GlyphCoverage`, `ContrastPolicy`, `Prng`, `setJpegDensity`) use the exact signatures in
  [contracts/engine.md](./contracts/engine.md).
- **Dependency inversion**: fs, clock, PRNG, image resizer, shell, and the `FramerApi` bridge are
  always injected. Only the composition roots (`src/main/composition.ts`,
  `src/renderer/src/app/composition.ts`) construct real implementations.
- **E2E tests** select by role and accessible name only (a `data-*` test handle is allowed only
  where a task says so), use the shared fixture from `tests/e2e/fixtures.ts`, and never use retries.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the electron-vite project, tooling, and CI so every later task has a working
build, lint, typecheck, and test loop.

- [ ] T001 Create the source tree from plan.md → Project Structure: `src/shared/domain/`, `src/shared/ipc/`, `src/engine/{catalog,generate,layout,paint,output}/`, `src/main/{ipc,persistence,services,platform}/`, `src/preload/`, `src/renderer/src/{app,state,features/compose,features/options,features/history,ui,test}/`, `assets/fonts/`, `tests/{render,e2e,fixtures}/`, `scripts/` (add a `.gitkeep` to each empty directory)
- [ ] T002 Create `package.json` (name `framer`, version `0.1.0`, `private: true`, `main: "out/main/index.js"`, `engines.node: ">=24"`) with every script from contracts/dev-tooling.md → "npm scripts" exactly as listed (`dev`, `build`, `lint`, `format`, `format:check`, `typecheck`, `test`, `test:render`, `test:e2e`, `test:all`, `package`, `package:dir`, `fonts:verify` → `node scripts/verify-fonts.mjs`); install runtime deps `electron@>=41`, `react@19`, `react-dom@19`, `zod`, `fontkit`, and dev deps `electron-vite@>=5`, `electron-builder@26`, `typescript@5`, `vite`, `@vitejs/plugin-react`, `vitest@>=4`, `@vitest/browser-playwright`, `playwright`, `@playwright/test`, `@axe-core/playwright`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`, `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, `prettier`, `@types/node`, `@types/react`, `@types/react-dom`; commit `package-lock.json`; add `.nvmrc` containing `24`
- [ ] T003 [P] Create `tsconfig.json` (solution file with references), `tsconfig.node.json` (strict; includes `src/main`, `src/preload`, `src/shared`, `src/engine`, `electron.vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `tests/e2e`), and `tsconfig.web.json` (strict; includes `src/renderer/src`, `src/shared`, `src/engine`, `tests/render`; `lib: ["ES2023","DOM","DOM.Iterable","WebWorker"]`, `jsx: "react-jsx"`); both define paths `@shared/*` → `src/shared/*` and `@engine/*` → `src/engine/*`
- [ ] T004 Create `electron.vite.config.ts` with `main` (entry `src/main/index.ts`), `preload` (entry `src/preload/index.ts`), and `renderer` (root `src/renderer`, `@vitejs/plugin-react`, `worker.format: 'es'`) sections, all sharing the `@shared` / `@engine` aliases
- [ ] T005 [P] Create `eslint.config.js` (flat config: typescript-eslint strict, react-hooks, jsx-a11y; `no-restricted-imports` forbidding `electron`, `node:*`, `react`, and DOM-only globals inside `src/shared/**`, and forbidding `react` / `electron` inside `src/engine/**`; ignore `out/`, `dist/`, `playwright-report/`, `test-results/`), plus `.prettierrc.json` and `.prettierignore`
- [ ] T006 [P] Create `vitest.config.ts` with two projects: `unit` (include `src/**/*.test.{ts,tsx}`, `environment: 'node'`, setup file `src/renderer/src/test/setup.ts`; React tests opt in with a `// @vitest-environment jsdom` docblock) and `render` (include `tests/render/**/*.test.ts`, browser mode with the Playwright provider, `chromium`, headless, aliases shared with electron-vite); create `src/renderer/src/test/setup.ts` that imports `@testing-library/jest-dom/vitest`
- [ ] T007 [P] Create `playwright.config.ts` (`testDir: 'tests/e2e'`, `fullyParallel: true`, `retries: 0` per Constitution III, `trace: 'retain-on-failure'`, reporters `list` + `html`, timeout 30 s)
- [ ] T008 [P] Create `electron-builder.yml` exactly as in contracts/dev-tooling.md → "electron-builder" (`appId: com.framer.quoteprint`, `productName: Framer`, `directories.output: dist`, `files: out/**`, `extraResources: assets/fonts/**`, linux `[AppImage, deb]`, win `[nsis]`, mac `[dmg, zip]`, `publish: null`, artifact names matching the "Release artifacts" table)
- [ ] T009 [P] Update `.gitignore`: below `.vscode/*` add `!.vscode/launch.json`, `!.vscode/tasks.json`, `!.vscode/settings.json`; add `playwright-report/` and `test-results/`
- [ ] T010 [P] Create `.vscode/launch.json` (configs "Debug Main Process", "Debug Renderer Process" [hidden, chrome attach on 9222, `webRoot: ${workspaceFolder}/src/renderer`, timeout 60 s], compound "Debug App (Main + Renderer)" as the default, "Vitest: Current File", "Vitest: All Unit", "Playwright: E2E" with `preLaunchTask: build`; main config uses `node_modules/.bin/electron-vite` with a `windows` override to `.cmd`, `--sourcemap`, `env.REMOTE_DEBUGGING_PORT=9222`), `.vscode/tasks.json` (`build`, `dev`, `test`, `test:e2e`), `.vscode/extensions.json` (`dbaeumer.vscode-eslint`, `esbenp.prettier-vscode`, `vitest.explorer`, `ms-playwright.playwright`), and `.vscode/settings.json` (format on save with Prettier, ESLint flat config)
- [ ] T011 [P] Create `.github/workflows/ci.yml` per contracts/dev-tooling.md → `ci.yml`: triggers `pull_request` and `push` to `main`, `concurrency` cancel-in-progress per ref; job `verify` (ubuntu-latest, Node 24 with npm cache, `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npx playwright install --with-deps chromium`, `npm run test:render`, `xvfb-run -a npm run test:e2e`, upload `playwright-report/` and `test-results/` on failure); job `package-smoke` (`needs: verify`, matrix ubuntu-latest / windows-latest / macos-latest, `npm ci && npm run package:dir`)

**Checkpoint**: `npm run lint`, `npm run typecheck`, and `npm test` run (with zero tests) without errors.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared domain types and schemas, the IPC bridge and its security, persistence, fonts,
the app shell, shared UI components, and E2E fixtures. Every user story depends on these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests for Foundational (write first, confirm they fail) ⚠️

- [ ] T012 [P] Write schema tests in `src/shared/domain/schemas.test.ts`: each zod schema from T023 accepts a valid sample and rejects invalid ones — `Hex` must match `^#[0-9a-f]{6}$`; `PrintSize` only `'4x6' | '5x7' | '8x10'`; `Orientation` only `'portrait' | 'landscape'`; `MarginSetting` is `{ enabled: false } | { enabled: true; size: 'small' | 'medium' | 'large' }`; `Font.category` only `'serif' | 'sans' | 'script' | 'display'`, `weight` 100–900, `style` `'normal' | 'italic'`, `license` exactly `'OFL-1.1'`, `caseTransform` `'none' | 'uppercase'`; `BackgroundSpec` discriminated on `kind` (`solid`, `linear`, `radial`, `pattern` with `pattern: 'dots'|'stripes'|'grid'|'chevron'`, `texture` with `grain: 'paper'|'linen'|'noise'`) and rejects unknown kinds; `DesignSpec.specVersion` is literal `1`; `SavedDesign.quoteId` is `string | null`; `Quote.author` is `string | null`; `Library` is `{ schemaVersion: 1, quotes: Quote[], designs: SavedDesign[] }`
- [ ] T013 [P] Write print-math tests in `src/shared/domain/print.test.ts`: `PRINT_PPI === 300`; `pixelSize` returns exactly 4x6 → portrait 1200×1800 / landscape 1800×1200, 5x7 → 1500×2100 / 2100×1500, 8x10 → 2400×3000 / 3000×2400 (integers); `DEFAULT_PRINT_SETTINGS` equals `{ size: '4x6', orientation: 'portrait', margin: { enabled: false } }`; `marginWidthPx` = short side × {small: 1/16, medium: 1/8, large: 3/16} × 300 (4x6 → 75 / 150 / 225 px) and 0 when disabled; `paddingPx` = `max(0.25 in, 0.06 × short side)` × 300; for every size × orientation × margin state, total inset (`marginWidthPx + paddingPx`) ≥ 37.5 px (FR-014)
- [ ] T014 [P] Write quote-domain tests in `src/shared/domain/quote.test.ts`: `normalizeQuoteInput` NFC-normalizes and trims text and author and keeps internal line breaks; text length is counted in grapheme clusters (`"👍🏽"` and `"é"` as decomposed `é` each count 1); exactly 500 graphemes is valid, 501 → `QUOTE_TOO_LONG`; empty or whitespace-only (including only `\n`) → `QUOTE_EMPTY`; author trimmed, empty author → `null`, author over 120 characters → validation error with `field: 'author'`; `dedupeKey` = lowercase(collapse-spaces(text)) + `\u0000` + lowercase(author ?? ''), so `"Be  The change"` and `"be the change"` with the same author share a key
- [ ] T015 [P] Write IPC handler-wrapper tests in `src/main/ipc/register.test.ts` using a fake `ipcMain`: a payload failing its zod schema returns `{ ok: false, error: { code: 'VALIDATION', message, field } }` without calling the handler; a sender whose `senderFrame.url` is not the app origin (dev server URL or `file://…/out/renderer/index.html`) is rejected; a handler that throws is converted to `{ ok: false, error: { code: 'STORAGE_FAILED', message } }` with a plain-language message, so nothing throws across the bridge
- [ ] T016 [P] Write `JsonLibraryStore` tests in `src/main/persistence/json-library-store.test.ts` against a real temp dir plus a fake fs for failures: missing `library.json` → empty library `{ schemaVersion: 1, quotes: [], designs: [] }`; writes go to a temp file, are `fsync`ed, then renamed (a simulated crash before rename leaves the old file intact); concurrent `update()` calls are serialized in order; rename `EPERM` is retried (Windows) and succeeds on a later attempt; invalid JSON or schema-invalid content is moved to `library.corrupt-<timestamp>.json` (timestamp from the injected clock), the store starts empty, and `load()` reports a `LIBRARY_RECOVERED` notice whose `backupPath` is that file
- [ ] T017 [P] Write platform path tests in `src/main/platform/paths.test.ts` with an injected `app.getPath` and env: `FRAMER_USER_DATA_DIR` overrides userData; `FRAMER_EXPORT_DIR` overrides the export folder; default export folder is `<pictures>/Framer`; `designsDir` is `<userData>/designs`; `fontsDir` resolves to `process.resourcesPath/assets/fonts` when packaged and `<repo>/assets/fonts` in dev
- [ ] T018 [P] Write `FontAssetService` and startup contract tests in `src/main/ipc/app.contract.test.ts` (fake fs, fake GPU status): `fonts:load` with catalog ids returns `{ id, bytes }` for each; an unknown id → `VALIDATION`; an unreadable file → `STORAGE_FAILED`; `app:startupInfo` returns `{ notices, exportDir, gpu }` and includes the `LIBRARY_RECOVERED` notice exactly once after a recovery (second call has no notices)
- [ ] T019 [P] Write shared UI component tests in `src/renderer/src/ui/ui.test.tsx` (`// @vitest-environment jsdom`): `RadioGroup` renders `role="radiogroup"` with its accessible name, one `radio` per option, the checked one reflects `value`, Arrow keys move and select; `Switch` renders `role="switch"` with `aria-checked` and toggles on Space and click; `Status` renders `role="status"` (polite) or `role="alert"` by `tone` prop; `Button` with `disabled` is not clickable and keeps visible focus styles via the `:focus-visible` token class
- [ ] T020 [P] Create E2E fixtures in `tests/e2e/fixtures.ts`: a Playwright `test` extension whose `app` fixture creates fresh temp dirs, launches `_electron.launch({ args: ['out/main/index.js'], env: { ...process.env, FRAMER_USER_DATA_DIR, FRAMER_EXPORT_DIR } })`, and exposes `page` (first window), `userDataDir`, `exportDir`, `relaunch()` (close and relaunch with the same dirs), and cleans up dirs after the test; plus `tests/e2e/a11y.ts` exporting `expectNoSeriousA11yViolations(page, stateLabel)` built on `@axe-core/playwright` (fails on any `serious` or `critical` violation); plus `tests/e2e/jpeg.ts` helpers `readJpegSize(path)` (parses SOF0/SOF2) and `readJfifDensity(path)` (parses APP0) and `sha256File(path)`
- [ ] T021 [P] Create test fixtures in `tests/fixtures/quotes.ts`: `SHORT` ("Be the change you wish to see in the world." / author "Gandhi"), `LONG_500` (exactly 500 graphemes with two line breaks), `TOO_LONG_501`, `UNICODE` ("Café — “naïve” 🌻" with curly quotes, accents, emoji), `GREEK` (polytonic Greek text, e.g. "Γνῶθι σεαυτόν", that at least one but not every catalog font covers — confirm against fontkit coverage of the T032 fonts and adjust), and `WHITESPACE_ONLY`
- [ ] T022 Write the launch smoke E2E test in `tests/e2e/app-launch.spec.ts` (fails until T036–T039 land; must pass at the phase checkpoint): the window opens with regions "Quote" and "Design options" and complementary "History"; `window.framer` is defined while `window.require` and `window.process` are undefined; the CSP header is present on the document response; `expectNoSeriousA11yViolations(page, 'empty')` passes

### Implementation for Foundational

- [ ] T023 Implement zod schemas with `z.infer` types (so schemas and types can't drift; data-model.md): `src/shared/domain/style.schema.ts` (`Hex`, `BackgroundSpec` union, `Style` with `fontId`, `fontFamily`, `background` full snapshot, `backgroundId`, `textColor`, `attributionColor`, `comboKey`), `src/shared/domain/print.schema.ts` (`PrintSize`, `Orientation`, `MarginSetting`, `PrintSettings`), `src/shared/domain/font.schema.ts` (`Font` manifest entry and `FontManifest` array), `src/shared/domain/quote.schema.ts` (`Quote` with `id` UUID v4, `text`, `author: string | null`, `dedupeKey`, `createdAt`, `lastUsedAt` ISO-8601), `src/shared/domain/design.schema.ts` (`DesignSpec` with `specVersion: 1`, `engineVersion`, `quote { text, author }`, `print`, `style`; `SavedDesign` with `id`, `quoteId: string | null`, `spec`, `fileName`, `imagePath` `designs/<id>.jpg`, `thumbPath` `designs/<id>.thumb.jpg`, `pixelWidth`, `pixelHeight`, `byteSize`, `sha256`, `savedAt`), `src/shared/domain/library.schema.ts` (`Library`), and a barrel `src/shared/domain/index.ts` — makes T012 pass
- [ ] T024 [P] Implement `src/shared/domain/print.ts` (`PRINT_PPI`, `DEFAULT_PRINT_SETTINGS`, `pixelSize`, `shortSidePx`, `marginWidthPx`, `paddingPx`, `MARGIN_FRACTIONS`) — makes T013 pass
- [ ] T025 [P] Implement `src/shared/domain/quote.ts` (`MAX_QUOTE_GRAPHEMES = 500`, `MAX_AUTHOR_CHARS = 120`, `countGraphemes` via `Intl.Segmenter`, `normalizeQuoteInput`, `validateQuoteInput` returning `Result`-style `{ ok, value } | { ok: false, code: 'QUOTE_EMPTY' | 'QUOTE_TOO_LONG' | 'AUTHOR_TOO_LONG' }`, `dedupeKey`) — makes T014 pass
- [ ] T026 [P] Implement `src/shared/ipc/result.ts` (`Result<T>`, the `AppError` union exactly as in contracts/ipc-api.md → "Result envelope", helpers `ok()` / `err()`) and `src/shared/ipc/messages.ts` holding every user-facing message string from contracts/ui.md → "States & messages" as named constants/functions (e.g. `MSG.quoteEmpty`, `MSG.saved(k, folder)`)
- [ ] T027 Implement `src/shared/ipc/channels.ts` (the 11 channel names from contracts/ipc-api.md → "Channels"), `src/shared/ipc/payloads.ts` (zod: `TouchQuoteInput`, `SaveDesignInput` with `jpeg` ArrayBuffer ≤ 40 MB, `IdPayload` `{ id: uuid }`, `ShowInFolderInput` `{ path: string }`, `LoadFontsInput` `{ ids: string[] }`), and `src/shared/ipc/framer-api.ts` (the `FramerApi` interface verbatim from contracts/ipc-api.md → "Interface")
- [ ] T028 [P] Implement `InMemoryFramerApi` in `src/renderer/src/test/in-memory-framer-api.ts`: implements every `FramerApi` method in memory (quotes deduped by `dedupeKey`, designs list newest first, `exportDir` `/export`), records calls, and supports per-method failure injection (`failNext('saveDesign', error)`) for renderer tests
- [ ] T029 [P] Implement main-process ports and adapters: `src/main/platform/fs-port.ts` (interface over `writeFile`, `rename`, `fsync`, `copyFile`, `rm`, `readFile`, `mkdir`, `stat`, `access` + `nodeFs` implementation), `src/main/platform/clock.ts` (`Clock { now(): Date }` + `systemClock`), `src/main/platform/ids.ts` (`IdSource` + `crypto.randomUUID` implementation), and `src/main/platform/paths.ts` — makes T017 pass
- [ ] T030 Implement `src/main/persistence/json-library-store.ts` (`load(): { library, notices }`, `read()`, `update(fn)` serialized through a promise queue, atomic write temp → fsync → rename with up to 5 `EPERM` retries, corrupt-file move-aside) — makes T016 pass
- [ ] T031 Implement `src/main/ipc/register.ts` (`registerHandler(ipcMain, channel, schema | null, handler, { isTrustedSender })`: checks `event.senderFrame.url` origin, validates payload, awaits handler, maps thrown errors to `STORAGE_FAILED`) — makes T015 pass
- [ ] T032 Vendor fonts into `assets/fonts/<family>/` with each family's `OFL.txt`: at least 18 SIL OFL families covering all four categories, including serif EB Garamond, Lora, Playfair Display, Libre Baskerville; sans Montserrat, Raleway, Work Sans, Josefin Sans; script Great Vibes, Dancing Script, Satisfy; display Abril Fatface, Bebas Neue, Amatic SC (plus 4+ more of your choice, OFL only), and `assets/fonts/noto-color-emoji/NotoColorEmoji.ttf` + `OFL.txt`; write `assets/fonts/fonts.manifest.json` with one entry per font face matching `Font` (`id` slug like `playfair-display-700`, `family`, `category`, `weight`, `style`, `file` relative to `assets/fonts/`, `license: "OFL-1.1"`, `caseTransform` — `"uppercase"` for Bebas Neue); mark the emoji entry with `"role": "emoji-fallback"` (extend `FontManifest` schema in `src/shared/domain/font.schema.ts` with optional `role`)
- [ ] T033 [P] Implement `scripts/verify-fonts.mjs` (`npm run fonts:verify`): parses `assets/fonts/fonts.manifest.json`, fails with a clear message if any `file` is missing, any family folder lacks `OFL.txt`, any `license` is not `OFL-1.1`, or any `id` is duplicated; add `npm run fonts:verify` as a step in the `verify` job of `.github/workflows/ci.yml`
- [ ] T034 Implement `src/main/services/font-asset-service.ts` (loads the manifest once, `load(ids)` returns bytes, rejects ids not in the manifest) and `src/main/services/startup-service.ts` (holds startup notices and returns them once, plus `exportDir` and `app.getGPUFeatureStatus()`), and handlers `fonts:load` / `app:startupInfo` in `src/main/ipc/app.ts` — makes T018 pass
- [ ] T035 Implement `src/main/composition.ts` (composition root: builds paths, `nodeFs`, `systemClock`, ids, `JsonLibraryStore`, services, and calls each `src/main/ipc/*.ts` `register…Handlers(ipcMain, deps)` function; later stories add their services here)
- [ ] T036 Implement `src/main/index.ts`: apply `FRAMER_USER_DATA_DIR` via `app.setPath('userData', …)` and `FRAMER_DISABLE_GPU=1` via `app.disableHardwareAcceleration()` + `--disable-gpu` **before** `ready`; create one `BrowserWindow` (`minWidth: 480`, `minHeight: 600`, `webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, preload }`); set a CSP response header (`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data: blob:; worker-src 'self' blob:; connect-src 'self'`); deny `window.open` and any navigation away from the app origin; log `GPU feature status` from `app.getGPUFeatureStatus()` after `ready`; single-instance lock; quit on all windows closed (except macOS)
- [ ] T037 Implement `src/preload/index.ts` (`contextBridge.exposeInMainWorld('framer', api)` where every `FramerApi` method calls `ipcRenderer.invoke(<channel>, payload)`; nothing else exposed) and `src/preload/index.d.ts` (declares `window.framer: FramerApi`)
- [ ] T038 [P] Implement design tokens in `src/renderer/src/ui/tokens.css` (color, spacing, radius, typography, focus-ring tokens; all UI text/background pairs meet WCAG 2.2 AA; `prefers-reduced-motion` respected) and shared components `src/renderer/src/ui/Button.tsx`, `src/renderer/src/ui/RadioGroup.tsx`, `src/renderer/src/ui/Switch.tsx`, `src/renderer/src/ui/Status.tsx` with CSS Modules `src/renderer/src/ui/*.module.css` — makes T019 pass
- [ ] T039 Implement the renderer shell: `src/renderer/index.html` (CSP `<meta>` matching T036, root div), `src/renderer/src/main.tsx` (imports `tokens.css`, renders `<App>`), `src/renderer/src/app/framer-api-context.tsx` (React context + `useFramerApi()` hook), `src/renderer/src/app/composition.ts` (`createRendererDeps({ api })` returning injected deps; later stories add generator and render service), and `src/renderer/src/app/App.tsx` + `App.module.css` with three landmark regions — `<section aria-label="Quote">` (region "Quote"), `<section aria-label="Design options">` (region "Design options"), `<aside aria-label="History">` (complementary "History") — laid out in a responsive CSS grid from 480 px upward

**Checkpoint**: `npm run dev` opens a secure, empty, accessible three-region window; all unit tests and
`app-launch.spec.ts` pass. User story work can now begin.

---

## Phase 3: User Story 1 — Turn a quote into a print-ready 4x6 image (Priority: P1) 🎯 MVP

**Goal**: Type a quote (and optional author), press "Generate designs", see 12 distinct rendered
previews with guaranteed fit, contrast, and glyph coverage, select one or more, and save
exact-size 300 PPI JPEGs (1200×1800 for 4x6 portrait) to the export folder with descriptive names.

**Independent Test**: Run quickstart.md scenarios 1, 2, 3, 10, 11, 12 — or `tests/e2e/us1-*.spec.ts`:
enter a quote, get 12 previews within 3 s, save one, and confirm the exported file is
`framer-<slug>-4x6-portrait.jpg`, 1200×1800 px, 300 DPI, and matches the preview.

### Tests for User Story 1 (write first, confirm they fail) ⚠️

- [ ] T040 [P] [US1] Write PRNG tests in `src/engine/generate/prng.test.ts`: `mulberry32(seed).next()` returns values in [0, 1); the same seed gives the same first 1,000 values; different seeds differ; a `shuffle(array, prng)` helper is deterministic and does not mutate its input
- [ ] T041 [P] [US1] Write contrast tests in `src/engine/generate/contrast.test.ts`: `relativeLuminance('#000000') === 0`, `('#ffffff') === 1`, `('#777777') ≈ 0.184`; `contrastRatio('#000000', '#ffffff') === 21`; `WcagContrastPolicy.pickTextColors({ min, max }, palette)` returns `text` and `attribution` that each have ratio ≥ 4.5 against **both** the luminance `min` and `max` of the envelope; returns `null` when no palette color reaches 4.5 against both ends (e.g. envelope `{ min: 0.05, max: 0.9 }`)
- [ ] T042 [P] [US1] Write glyph-coverage tests in `src/engine/generate/glyph-coverage.test.ts` (reads real font bytes from `assets/fonts/` with `node:fs` in the test only): `requiredCodePoints(text, author)` collects code points and drops emoji (`\p{Extended_Pictographic}`, U+FE0F, U+200D, skin-tone modifiers) and whitespace/line breaks; `FontkitGlyphCoverage.fromFonts([{ id, bytes }])` reports `covers(fontId, ASCII set) === true`; a code point the font lacks (from `GREEK` fixture for a font without Greek) → `false`; the cmap is parsed only once per font (spy)
- [ ] T043 [P] [US1] Write catalog tests in `src/engine/catalog/catalog.test.ts`: `loadFontCatalog(manifestJson)` validates with `FontManifest` and excludes the `emoji-fallback` entry from pickable fonts; all four categories `serif`, `sans`, `script`, `display` present; `BACKGROUND_CATALOG` has ≥ 40 entries (`{ id, spec, mood: 'light' | 'dark' | 'vivid' }`) with unique ids, covering all five kinds `solid`, `linear`, `radial`, `pattern`, `texture`, and every `spec` passes the `BackgroundSpec` schema; `describeBackground(entry)` returns a short human description (e.g. "soft blue gradient", "cream paper texture") used in card names, never an id
- [ ] T044 [P] [US1] Write style-generator tests in `src/engine/generate/catalog-style-generator.test.ts` with fake `GlyphCoverage` and the real catalogs: `generate({ count: 12, requiredCodePoints, exclude: new Set(), seed })` returns 12 styles with 12 distinct `comboKey` values `${fontId}|${backgroundId}` (FR-005); the set includes ≥ 3 font categories and ≥ 3 background kinds (FR-006, round-robin); every style's `textColor` and `attributionColor` reach ≥ 4.5:1 against its background's `luminanceEnvelope` (FR-008); no style uses a font for which `covers()` is false; `fontFamily` and the full `background` spec are snapshotted on each `Style`; same seed → identical output, different seed → different output; `exhausted === false`
- [ ] T045 [P] [US1] Write safe-area tests in `src/engine/layout/safe-area.test.ts`: `computeSafeArea(print)` for 4x6 portrait with margin off is inset 75 px on every side (`max(0.25 in, 0.06 × 4 in) × 300 = 75`) → `{ x: 75, y: 75, width: 1050, height: 1650 }`; with margin medium the inset is 150 + 75 = 225 px; 8x10 landscape margin off inset is `0.06 × 8 × 300 = 144` px; for every size × orientation × margin state every inset ≥ 37.5 px (FR-014)
- [ ] T046 [P] [US1] Write layout tests in `src/engine/layout/text-layout-engine.test.ts` with a fake `TextMeasurer` (width = chars × 0.5 × fontSize; ascent 0.8, descent 0.2): returns a `DrawPlan` whose `canvas` equals `pixelSize(print)`, `safeArea` equals `computeSafeArea(print)`, and `marginPx` equals `marginWidthPx(print)`; every line's measured box is inside `safeArea` (SC-004) for `SHORT`, `LONG_500`, and `UNICODE`; user line breaks always start a new line; words wrap greedily; the attribution is one or more lines with `role: 'attribution'`, size ≈ 0.55 × the quote size, colored `attributionColor`, placed below the quote; `caseTransform: 'uppercase'` uppercases drawn text; binary search picks the largest size that fits; returns `null` when the quote cannot fit at ≥ 9 pt (37.5 px at 300 PPI); same input → identical plan
- [ ] T047 [P] [US1] Write JPEG density tests in `src/engine/output/jpeg-density.test.ts`: `setJpegDensity(jpeg, 300)` on a JFIF JPEG sets APP0 units = 1 (dots per inch), Xdensity = Ydensity = 300; on a JPEG with no APP0 it inserts a valid JFIF APP0 right after SOI; the input array is not mutated; non-JPEG input (no `FFD8`) throws
- [ ] T048 [P] [US1] Write file-name tests in `src/shared/domain/filename.test.ts`: `exportFileName(spec)` = `framer-<quote-slug>-<size>-<orientation>.jpg` (e.g. `framer-be-the-change-you-wish-to-see-4x6-portrait.jpg`); slug is lowercase ASCII (accents transliterated by NFKD + strip marks, emoji and symbols removed, runs of separators collapsed to `-`), cut at a word boundary to keep the whole name ≤ 120 characters; an empty slug falls back to `quote`; Windows reserved stems (`CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9`) and characters `<>:"/\|?*` and control chars never appear; `withCounter(name, n)` yields `…-4x6-portrait-2.jpg`
- [ ] T049 [P] [US1] Write design-save service tests in `src/main/services/design-service.test.ts` with fake fs, clock, ids, and `ImageResizer` (`size(bytes)` + `resizeJpeg(bytes, longSide, quality)`): `save({ spec, jpeg, quoteId })` writes `designs/<id>.jpg` (unchanged bytes), writes `designs/<id>.thumb.jpg` at 400 px on the long side, quality 85, copies to `<exportDir>/<exportFileName>` (creating the folder), then appends a `SavedDesign` with `sha256` of the bytes, `byteSize`, `pixelWidth`/`pixelHeight`, and `savedAt` from the clock, and returns it with `exportedPath`; if a file with that name exists the name gets `-2`, `-3`, …; JPEG dimensions ≠ `pixelSize(spec.print)` → `VALIDATION`; a failure at each step (image write, thumbnail, export copy, library append) removes every file written so far and records nothing; `ENOSPC` → `EXPORT_FAILED` with `reason: 'NO_SPACE'`, `EACCES`/`EPERM`/`EROFS` → `reason: 'PERMISSION'`, anything else → `'UNKNOWN'`, each with a plain-language `message`
- [ ] T050 [P] [US1] Write contract tests in `src/main/ipc/designs.contract.test.ts` (`designs:save`: valid payload → `ok: true` with a value that parses as `SavedDesign` + `exportedPath`; missing `spec` or a `jpeg` over 40 MB → `VALIDATION`; fake service failure → `EXPORT_FAILED` passthrough) and `src/main/ipc/os.contract.test.ts` (`os:showInFolder`: path inside the export folder → calls fake `shell.showItemInFolder` and returns `ok: true`; path outside it, including `..` traversal → `VALIDATION`, shell not called)
- [ ] T051 [P] [US1] Write session-reducer tests in `src/renderer/src/state/session-reducer.test.ts`: initial state has empty quote, `DEFAULT_PRINT_SETTINGS`, no option set, `phase: 'idle'`; `QUOTE_CHANGED` updates text/author; `GENERATE_REQUESTED` → `phase: 'generating'`; `OPTIONS_READY` → option set `status: 'fresh'`, all options unselected, `quoteKey` set; `OPTION_TOGGLED` flips `selected` for one id; `QUOTE_CHANGED` while an option set exists → `status: 'stale'`; `selectCanSave(state)` is false when 0 selected or stale; `SAVE_STARTED`/`SAVE_SUCCEEDED` (clears selection, stores `{ count, folder, lastPath }`) / `SAVE_FAILED` (keeps selection, stores message); `GENERATE_REJECTED` stores `QUOTE_EMPTY` / `QUOTE_TOO_LONG` alerts
- [ ] T052 [P] [US1] Write option-set orchestration tests in `src/renderer/src/features/options/generate-option-set.test.ts` with fake generator, layout engine, and measurer: invalid quote returns the validation code without calling the generator; valid quote passes `requiredCodePoints` and the seed to the generator; styles whose layout returns `null` are dropped and the generator is asked again (excluding seen keys) until 12 valid options exist or no candidates remain; result is `{ options, droppedForFit: boolean, exhausted }`; every option's `spec` has `specVersion: 1`, `engineVersion: ENGINE_VERSION`, the normalized quote, and the current print settings
- [ ] T053 [P] [US1] Write compose component tests in `src/renderer/src/features/compose/ComposePanel.test.tsx` (`// @vitest-environment jsdom`): textbox "Quote" (multiline) and textbox "Author (optional)"; live counter "0 / 500" updating as graphemes are typed; button "Generate designs" calls `onGenerate`; Ctrl+Enter and Cmd+Enter in the Quote box call `onGenerate`; alert "Enter a quote to generate designs." and the too-long alert text render when the state carries those errors
- [ ] T054 [P] [US1] Write gallery component tests in `src/renderer/src/features/options/OptionGallery.test.tsx` (`// @vitest-environment jsdom`, fake `RenderService` returning stub bitmaps): 12 skeleton cards with status "Generating designs…" while generating (no layout shift: same grid tracks); then 12 `checkbox`es named `Design {n}: {font family} on {background description}` each containing an `img` with the same name; status "12 designs ready."; status "Some fonts couldn't display this quote, so showing {n} designs." when fewer; Space toggles a card; Arrow keys move focus between cards in grid order; status "Your quote changed. Regenerate to update the designs." when stale
- [ ] T055 [P] [US1] Write save-bar tests in `src/renderer/src/features/options/SaveBar.test.tsx` (`// @vitest-environment jsdom`, `InMemoryFramerApi`): button "Save selected ({k})" reflects the count and is disabled when k = 0 or stale; pressing it renders each selected option with `renderPrint` and calls `saveDesign` once per option in order; success shows status "Saved {k} image(s) to {folder}." with a "Show in folder" button that calls `showInFolder(lastExportedPath)`; an injected `EXPORT_FAILED` shows alert "Couldn't save: {reason in plain language}. Nothing was saved. Check that the folder exists and has free space, then try again." and stops further saves
- [ ] T056 [P] [US1] Write painter render tests in `tests/render/painters.render.test.ts` (Vitest browser mode, real Chromium canvas): for at least two catalog entries of each kind (`solid`, `linear`, `radial`, `pattern`, `texture`), paint into a 600×900 canvas, sample a 32×32 grid, and assert every sample's relative luminance is within that painter's `luminanceEnvelope(spec)` (± 0.01); `texture` with the same seed paints identical pixels twice; `matTone(spec)` returns a valid `Hex`
- [ ] T057 [P] [US1] Write design render tests in `tests/render/draw-design.render.test.ts` using `MainThreadRenderService` with fonts registered from `assets/fonts/`: `renderPrint` of a 4x6 portrait spec decodes to exactly 1200×1800 and its JFIF density is 300 DPI; using the real `CanvasTextMeasurer`, every `DrawPlan` line box is inside `safeArea` for `SHORT`, `LONG_500`, and `UNICODE` across 12 generated styles; sampling pixels inside each quote line box (excluding anti-aliased edges) gives WCAG contrast ≥ 4.5:1 against the text color for every style (SC-005); the plan used by `renderPreview` equals the plan used by `renderPrint` and a downscaled print matches the preview within a small per-pixel tolerance (FR-010); the 🌻 emoji is drawn in color (non-gray pixels in its box), not as tofu
- [ ] T058 [P] [US1] Write the US1 happy-path E2E test in `tests/e2e/us1-generate-and-save.spec.ts`: fill "Quote" with `SHORT` and "Author (optional)" with "Gandhi", press "Generate designs"; within 3 s (SC-002) there are 12 checkboxes in region "Design options" and status "12 designs ready."; `expectNoSeriousA11yViolations(page, 'options shown')`; check the first card, press "Save selected (1)"; status "Saved 1 image(s) to …" appears with "Show in folder"; exactly one file `framer-be-the-change-…-4x6-portrait.jpg` exists in `exportDir`, `readJpegSize` = 1200×1800 and `readJfifDensity` = 300; `library.json` in `userDataDir` lists one design
- [ ] T059 [P] [US1] Write the US1 edge-case E2E tests in `tests/e2e/us1-edge-cases.spec.ts`: Generate with an empty quote → alert "Enter a quote to generate designs."; `TOO_LONG_501` → the too-long alert; `LONG_500` → designs render with no error; `GREEK` → status "Some fonts couldn't display this quote, so showing {n} designs." with n < 12; `UNICODE` → 12 designs; edit the quote after generating → status "Your quote changed. Regenerate to update the designs." and "Save selected" disabled; with `exportDir` made read-only (`chmod 0o500`; skip on Windows), select one and save → alert starting "Couldn't save:", no file in `exportDir`, and `library.json` has no designs

### Implementation for User Story 1

- [ ] T060 [P] [US1] Implement `src/engine/generate/prng.ts` (`Prng` interface, `mulberry32(seed)`, `shuffle`, `randomSeed()` for production use only) — makes T040 pass
- [ ] T061 [P] [US1] Implement `src/engine/generate/contrast.ts` (`relativeLuminance`, `contrastRatio`, `WcagContrastPolicy` implementing `ContrastPolicy`, `MIN_TEXT_CONTRAST = 4.5`) — makes T041 pass
- [ ] T062 [P] [US1] Implement `src/engine/generate/glyph-coverage.ts` (`requiredCodePoints`, `isEmojiCodePoint`, `FontkitGlyphCoverage` implementing `GlyphCoverage`, built from `{ id, bytes }` with `fontkit.create`, caching each cmap as a `Set<number>`) — makes T042 pass
- [ ] T063 [P] [US1] Implement the catalog: `src/engine/catalog/fonts.ts` (`loadFontCatalog`, `FontCatalog` with `pickable`, `byId`, `byCategory`, `emojiFallback`), `src/engine/catalog/palettes.ts` (curated palettes of `Hex` values grouped by mood), `src/engine/catalog/backgrounds.ts` (`BACKGROUND_CATALOG` with ≥ 40 entries across `solid`, `linear`, `radial`, `pattern`, `texture`), and `src/engine/catalog/describe.ts` (`describeBackground`) — makes T043 pass
- [ ] T064 [US1] Implement the painters and registry: `src/engine/paint/painter-registry.ts` (`createPainterRegistry()` implementing `PainterRegistry`; `get` throws for unknown kinds), `src/engine/paint/value-noise.ts` (seeded value noise using `mulberry32`), and one painter per kind in `src/engine/paint/painters/solid.ts`, `linear.ts`, `radial.ts`, `pattern.ts`, `texture.ts`, each with `paint`, `luminanceEnvelope`, and `matTone`, and `src/engine/paint/default-painters.ts` registering all five (open/closed: adding a kind is a new file plus one `register` call) — makes T056 pass
- [ ] T065 [US1] Implement `src/engine/generate/catalog-style-generator.ts` (`CatalogStyleGenerator(fontCatalog, backgroundCatalog, painters, glyphCoverage, contrast, prngFactory)` implementing `StyleGenerator`: filter fonts by coverage, shuffle with the seeded PRNG, round-robin over font categories and background kinds, pick colors with `ContrastPolicy` against `painters.get(kind).luminanceEnvelope(spec)`, skip combos with no valid colors, never repeat a `comboKey` in a result) — makes T044 pass (exclusion and `exhausted` behavior are completed in US2)
- [ ] T066 [P] [US1] Implement `src/engine/layout/types.ts` (`FontSpec { family, weight, style, sizePx, caseTransform }`, `Rect`, `SafeArea`, `DrawPlan` exactly as contracts/engine.md) and `src/engine/layout/safe-area.ts` (`computeSafeArea(print)` using `marginWidthPx` + `paddingPx` from `@shared/domain/print`) — makes T045 pass
- [ ] T067 [US1] Implement `src/engine/layout/text-layout-engine.ts` (`FitTextLayoutEngine` implementing `TextLayoutEngine`: preserve `\n`, greedy word wrap, binary search on font size between 37.5 px and the safe-area height, attribution at 0.55× in `attributionColor` prefixed with "— ", vertical centering inside the safe area, `null` below 9 pt; export `ENGINE_VERSION = '1.0.0'`) and `src/engine/layout/canvas-text-measurer.ts` (`CanvasTextMeasurer` using `ctx.measureText` on a given `OffscreenCanvasRenderingContext2D` or `CanvasRenderingContext2D`, with the emoji fallback family appended to every font stack) — makes T046 pass
- [ ] T068 [US1] Implement `src/engine/paint/draw-design.ts` (`drawDesign(ctx, plan, style, painters, scale)`: `ctx.scale(scale)`, paint the background over the whole canvas, draw each `plan.lines` entry with its `font` and `color`; margin painting is added in US3)
- [ ] T069 [P] [US1] Implement `src/engine/output/jpeg-density.ts` (`setJpegDensity`) — makes T047 pass
- [ ] T070 [US1] Implement the render service: `src/engine/output/render-service.ts` (`RenderService` interface and a shared `renderSpec(spec, canvasFactory, measurer)` that lays out at print size then draws), `src/engine/output/font-registry.ts` (`registerFonts(fontFaceSet, fonts: {id, family, weight, style, bytes}[])` via `new FontFace(family, bytes, …)` and `await face.load()`, usable on `document.fonts` and worker `self.fonts`), `src/engine/output/main-thread-render-service.ts` (`MainThreadRenderService` on `OffscreenCanvas` in the current thread), `src/engine/output/protocol.ts` (typed `RenderRequest` / `RenderResponse` messages with request ids), `src/engine/output/render.worker.ts` (registers fonts once, handles `preview` → transferable `ImageBitmap` and `print` → `convertToBlob({ type: 'image/jpeg', quality: 0.95 })` → `setJpegDensity(…, 300)` → transferable `ArrayBuffer`), and `src/engine/output/worker-render-service.ts` (`WorkerRenderService` over `new Worker(new URL('./render.worker.ts', import.meta.url), { type: 'module' })`, rejecting on worker error) — makes T057 pass
- [ ] T071 [P] [US1] Implement `src/shared/domain/filename.ts` (`slugifyQuote`, `exportFileName(spec)`, `withCounter`, `MAX_FILE_NAME = 120`) — makes T048 pass
- [ ] T072 [P] [US1] Implement main adapters `src/main/platform/image-resizer.ts` (`ImageResizer` interface + `NativeImageResizer` using `nativeImage.createFromBuffer`, `getSize()`, `resize({ width|height, quality: 'best' })`, `toJPEG(85)`) and `src/main/platform/shell.ts` (`Shell` interface + Electron `shell.showItemInFolder` implementation)
- [ ] T073 [US1] Implement `src/main/persistence/design-repository.ts` (`DesignRepository` interface with `add`, `list`, `get`; `JsonDesignRepository` over `JsonLibraryStore`; `InMemoryDesignRepository`) and `src/main/services/design-service.ts` (`DesignService.save` with the all-or-nothing flow from data-model.md → "SavedDesign persistence", error mapping to `EXPORT_FAILED` / `STORAGE_FAILED`, `sha256` via `node:crypto`) — makes T049 pass
- [ ] T074 [US1] Implement handlers `designs:save` in `src/main/ipc/designs.ts` and `os:showInFolder` in `src/main/ipc/os.ts` (resolves the path and rejects anything outside `paths.exportDir`), and wire `DesignService`, `NativeImageResizer`, and `Shell` in `src/main/composition.ts` — makes T050 pass
- [ ] T075 [US1] Implement the session state in `src/renderer/src/state/actions.ts` (action union) and `src/renderer/src/state/session-reducer.ts` (`initialSessionState`, `sessionReducer`, selectors `selectCanSave`, `selectSelectedOptions`) per the state diagram in data-model.md → "OptionSet / session" — makes T051 pass
- [ ] T076 [US1] Implement `src/renderer/src/features/options/generate-option-set.ts` (`generateOptionSet({ quote, author, print, exclude, seed }, deps)` using `validateQuoteInput`, `requiredCodePoints`, the `StyleGenerator`, `TextLayoutEngine` with the measurer, refill loop up to 12) — makes T052 pass
- [ ] T077 [US1] Implement the compose UI: `src/renderer/src/features/compose/QuoteInput.tsx` (multiline textbox "Quote" with grapheme counter "{n} / 500", Ctrl/Cmd+Enter → generate), `src/renderer/src/features/compose/GenerateButton.tsx` (primary button "Generate designs"), and `src/renderer/src/features/compose/ComposePanel.tsx` (+ `ComposePanel.module.css`) including the author textbox "Author (optional)" and the validation `alert` via `Status` — makes T053 pass
- [ ] T078 [US1] Implement the gallery UI: `src/renderer/src/features/options/OptionCard.tsx` (`<label>` + visually hidden `checkbox` named `Design {n}: {font family} on {background description}`, a `<canvas role="img">` with the same accessible name that draws the preview `ImageBitmap`, visible selected state not conveyed by color alone), `src/renderer/src/features/options/OptionGallery.tsx` (+ `.module.css`: fixed-aspect grid, 12 skeleton cards while generating, roving focus with Arrow keys, status messages from `messages.ts`), and `src/renderer/src/features/options/usePreviews.ts` (requests `renderPreview` for each option at the card's device-pixel width, cancels stale requests) — makes T054 pass
- [ ] T079 [US1] Implement `src/renderer/src/features/options/SaveBar.tsx` (+ `.module.css`) and `src/renderer/src/features/options/useSaveSelected.ts` (for each selected option in order: `renderPrint` → `api.saveDesign({ spec, jpeg, quoteId: state.quoteId ?? null })`; stop on first failure; dispatch `SAVE_SUCCEEDED` with count, `exportDir`, and last `exportedPath`; "Show in folder" calls `api.showInFolder`) — makes T055 pass
- [ ] T080 [US1] Wire US1 in the renderer composition root and shell: in `src/renderer/src/app/composition.ts`, at startup call `api.loadFontFiles` for every manifest id (manifest imported from `assets/fonts/fonts.manifest.json`), build `FontkitGlyphCoverage`, `createPainterRegistry` with default painters, `CatalogStyleGenerator`, `FitTextLayoutEngine`, and `WorkerRenderService` (register fonts on `document.fonts` for the measurer and send them to the worker); in `src/renderer/src/app/App.tsx` hold `useReducer(sessionReducer)`, show status "Loading fonts…" until ready, and render `ComposePanel`, `OptionGallery`, and `SaveBar` in their regions — makes T058 and T059 pass

**Checkpoint**: US1 is fully functional — the MVP. Run quickstart.md scenarios 1–3 and 10–12 manually
and `npx playwright test tests/e2e/us1-*` before moving on.

---

## Phase 4: User Story 2 — Regenerate and pick multiple favorites (Priority: P2)

**Goal**: "Regenerate designs" gives a fresh set of 12 that never repeats a font-and-background
combination already shown for this quote, tells the user when combinations run out, and saving
several selected designs produces one file and one history record per design.

**Independent Test**: Run quickstart.md scenarios 4 and 5 — or `tests/e2e/us2-*.spec.ts`: generate,
regenerate, confirm no repeated combinations; select 3, save, confirm 3 files; with nothing
selected, Save is disabled and the helper text shows.

### Tests for User Story 2 (write first, confirm they fail) ⚠️

- [ ] T081 [P] [US2] Write generator exclusion tests in `src/engine/generate/catalog-style-generator.exclusion.test.ts`: with `exclude` holding the 12 comboKeys of a previous result, the next result has 12 keys none of which are in `exclude` (FR-009) and `exhausted === false`; with a tiny fake catalog (2 fonts × 3 backgrounds = 6 combos) and `exclude` holding 4 of them, the result contains the 2 unseen combos first, then reuses excluded ones to reach the available count, never duplicates within the set, and sets `exhausted === true`; when every combo is excluded the result still has distinct keys and `exhausted === true`
- [ ] T082 [P] [US2] Write regenerate reducer tests in `src/renderer/src/state/session-reducer.regenerate.test.ts`: `OPTIONS_READY` for the same `quoteKey` adds every new comboKey to `seenComboKeys` (union, never shrinks); options for a different `quoteKey` reset `seenComboKeys` to just the new keys; `OPTIONS_READY` with `exhausted: true` is stored on the option set; regenerating clears the selection; a stale set becomes `fresh` after regenerate; `selectGenerateLabel(state)` is "Generate designs" with no option set and "Regenerate designs" once options exist
- [ ] T083 [P] [US2] Write UI tests in `src/renderer/src/features/options/SaveBar.multi.test.tsx` and `src/renderer/src/features/compose/GenerateButton.test.tsx` (`// @vitest-environment jsdom`): with 0 selected the Save button is disabled and helper text "Select at least one design to save." is shown and linked via `aria-describedby`; with 3 selected it reads "Save selected (3)" and saving calls `saveDesign` 3 times and shows "Saved 3 image(s) to {folder}."; the generate button label switches to "Regenerate designs"; when the option set is `exhausted`, status "You've seen every combination for this quote, so some designs repeat." is shown
- [ ] T084 [P] [US2] Write the US2 E2E test in `tests/e2e/us2-regenerate-and-multi-save.spec.ts`: generate for `SHORT`, collect each card checkbox's `data-combo-key` attribute (the one allowed test handle, since the accessible name may not be unique per background id), press "Regenerate designs", and assert 12 new keys with no overlap; with nothing selected "Save selected (0)" is disabled and "Select at least one design to save." is visible; check 3 cards, press "Save selected (3)", and assert 3 distinct `.jpg` files in `exportDir`, status "Saved 3 image(s) to …", and 3 designs in `library.json`

### Implementation for User Story 2

- [ ] T085 [US2] Extend `src/engine/generate/catalog-style-generator.ts`: prefer combos not in `exclude`; if fewer than `count` unseen valid combos remain, fill from excluded combos (still distinct within the set) and return `exhausted: true` — makes T081 pass without breaking T044
- [ ] T086 [US2] Extend `src/renderer/src/state/session-reducer.ts` and `src/renderer/src/state/actions.ts` with `seenComboKeys` tracking per `quoteKey`, `exhausted` storage, selection reset on regenerate, and `selectGenerateLabel`; pass `exclude: state.seenComboKeys` from `src/renderer/src/features/options/generate-option-set.ts` callers in `src/renderer/src/app/App.tsx` — makes T082 pass
- [ ] T087 [US2] Update `src/renderer/src/features/compose/GenerateButton.tsx` (label from `selectGenerateLabel`), `src/renderer/src/features/options/SaveBar.tsx` (helper text "Select at least one design to save." with `aria-describedby` when k = 0), `src/renderer/src/features/options/OptionGallery.tsx` (exhausted status message), and `src/renderer/src/features/options/OptionCard.tsx` (`data-combo-key={style.comboKey}` on the checkbox) — makes T083 and T084 pass

**Checkpoint**: US1 and US2 both work on their own. Run quickstart.md scenarios 4–5.

---

## Phase 5: User Story 3 — Choose print size and frame-ready margin (Priority: P2)

**Goal**: Pick 4x6 / 5x7 / 8x10, portrait / landscape, and a frame-ready margin (Small / Medium /
Large) before or after generating; previews re-render with the same style combinations, and saved
files have the exact pixel size with a uniform mat-tone margin band.

**Independent Test**: Run quickstart.md scenario 6 — or `tests/e2e/us3-*.spec.ts`: choose 5x7,
Landscape, Frame-ready margin Large, generate and save one, and confirm a 2100×1500 file with the
quote inside an even margin on all four sides.

### Tests for User Story 3 (write first, confirm they fail) ⚠️

- [ ] T088 [P] [US3] Write margin render tests in `tests/render/margin.render.test.ts`: for every size × orientation with margin `small`, `medium`, `large`, `renderPrint` output has exactly `pixelSize(print)`; sampling a row and column through each edge shows a band exactly `marginWidthPx(print)` wide (± 1 px) filled with `painters.get(kind).matTone(spec)` on all four sides, and the background starts inside it; every text line box is inside the inner safe area; with margin off there is no mat band
- [ ] T089 [P] [US3] Write print-settings reducer tests in `src/renderer/src/state/session-reducer.print-settings.test.ts`: `PRINT_SETTINGS_CHANGED` updates `state.print`; with an option set present, every option keeps its `style` (same `comboKey` list in the same order) while `spec.print` updates (FR-015); the set stays `fresh` (not stale) and selection is preserved; turning margin on with no size chosen uses `size: 'medium'`; `OPTIONS_RELAID` drops options whose layout returned `null` at the new size and sets the "showing {n} designs" status
- [ ] T090 [P] [US3] Write settings panel tests in `src/renderer/src/features/compose/PrintSettingsPanel.test.tsx` (`// @vitest-environment jsdom`): radiogroup "Print size" with radios "4x6" (checked by default), "5x7", "8x10"; radiogroup "Orientation" with "Portrait" (default) and "Landscape"; switch "Frame-ready margin" off by default; radiogroup "Margin size" ("Small", "Medium" default, "Large") is absent while the switch is off and appears when it is on; every change calls `onChange` with a valid `PrintSettings`
- [ ] T091 [P] [US3] Write the US3 E2E test in `tests/e2e/us3-size-and-margin.spec.ts`: on launch "4x6", "Portrait" are checked and "Frame-ready margin" is off (acceptance 3.1); generate for `SHORT` and record the 12 card names; choose "5x7", "Landscape", turn on "Frame-ready margin", choose "Large"; the 12 card names are unchanged (same styles) and previews re-render; save the first card → file named `…-5x7-landscape.jpg` with `readJpegSize` 2100×1500; then choose "8x10" + "Portrait", save → 2400×3000

### Implementation for User Story 3

- [ ] T092 [US3] Implement `src/engine/paint/margin-painter.ts` (`SolidMatMarginPainter` implementing `MarginPainter`: fills the four margin bands with `matTone`) and update `src/engine/paint/draw-design.ts` so that when `plan.marginPx > 0` it fills the canvas with the mat tone, then paints the background into the inner rect `inset(plan.canvas, plan.marginPx)`, then draws text; inject the `MarginPainter` through `src/engine/output/render-service.ts` so `MainThreadRenderService` and `WorkerRenderService` stay interchangeable — makes T088 pass
- [ ] T093 [US3] Extend `src/renderer/src/state/actions.ts` and `src/renderer/src/state/session-reducer.ts` with `PRINT_SETTINGS_CHANGED` and `OPTIONS_RELAID`; add `src/renderer/src/features/options/relayout-options.ts` (re-run `TextLayoutEngine` for each existing style at the new print settings, drop `null`s) — makes T089 pass
- [ ] T094 [US3] Implement `src/renderer/src/features/compose/PrintSettingsPanel.tsx` (+ `.module.css`) using the shared `RadioGroup` and `Switch` with the exact names from contracts/ui.md, and place it in `src/renderer/src/features/compose/ComposePanel.tsx` between Author and Generate (tab order Quote → Author → settings → Generate) — makes T090 pass
- [ ] T095 [US3] Wire settings changes in `src/renderer/src/app/App.tsx`: on `PRINT_SETTINGS_CHANGED` with options present, call `relayoutOptions` and re-request previews via `usePreviews` (show skeleton overlay within 100 ms, keep card sizes stable to avoid layout shift); option cards use the new aspect ratio — makes T091 pass

**Checkpoint**: US1, US2, and US3 all work on their own. Run quickstart.md scenario 6.

---

## Phase 6: User Story 4 — See previous quotes and saved designs (Priority: P3)

**Goal**: A History panel with "Previous quotes" (newest first, no duplicates, click to reuse) and
"Saved designs" (thumbnail, quote, size, frame-ready setting, date; "Save again" produces a
byte-identical file; delete with confirmation). Everything persists across relaunches, and a
damaged history file is recovered with a notice.

**Independent Test**: Run quickstart.md scenarios 7, 8, 9 — or `tests/e2e/us4-*.spec.ts`: save
designs from two quotes, relaunch, confirm both quotes (newest first) and both designs appear;
"Save again" yields a file with the same SHA-256; deletions survive a relaunch.

### Tests for User Story 4 (write first, confirm they fail) ⚠️

- [ ] T096 [P] [US4] Write quote-repository tests in `src/main/persistence/quote-repository.test.ts` as one shared suite run against both `JsonQuoteRepository` (temp dir) and `InMemoryQuoteRepository` (Liskov): `upsert` inserts a new quote; `upsert` with an existing `dedupeKey` updates `lastUsedAt` (and keeps `id`, `createdAt`) instead of adding a duplicate; `list` returns quotes sorted by `lastUsedAt` descending; `delete(id)` removes it; `delete` of an unknown id → `NOT_FOUND`; data survives a new repository instance over the same file (JSON only)
- [ ] T097 [P] [US4] Write quote-service tests in `src/main/services/quote-service.test.ts` (in-memory repos, fake clock and ids): `touch({ text, author })` normalizes with `normalizeQuoteInput`, returns `VALIDATION` with `field: 'text'` for `QUOTE_EMPTY` / `QUOTE_TOO_LONG` and `field: 'author'` for long authors, creates the quote with UUID v4 `id` and ISO `createdAt`/`lastUsedAt`, and on a repeat touch (same `dedupeKey`, different spacing/case) bumps `lastUsedAt` so it lists first; `delete(id)` removes the quote and sets `quoteId = null` on every saved design that referenced it while keeping the designs
- [ ] T098 [P] [US4] Write design-history service tests in `src/main/services/design-service.history.test.ts` (fake fs, clock, resizer): `list()` returns designs by `savedAt` descending; `thumbnail(id)` returns `data:image/jpeg;base64,…` of `designs/<id>.thumb.jpg`; `reexport(id)` copies the stored `designs/<id>.jpg` bytes to the export folder under the original `fileName` (with `-2`… counter if taken), verifies the copy's `sha256` equals the record's (mismatch → `STORAGE_FAILED`), and returns `exportedPath`; export failures map to `EXPORT_FAILED` reasons as in T049; `delete(id)` removes both files and the record; unknown ids → `NOT_FOUND`
- [ ] T099 [P] [US4] Write contract tests in `src/main/ipc/quotes.contract.test.ts` (`quotes:touch`, `quotes:list`, `quotes:delete`) and `src/main/ipc/designs-history.contract.test.ts` (`designs:list`, `designs:thumb`, `designs:reexport`, `designs:delete`): valid payload → `ok: true` with a value matching its schema; non-UUID `id` or malformed input → `VALIDATION`; fake service failures → the documented error code (`NOT_FOUND`, `STORAGE_FAILED`, `EXPORT_FAILED`)
- [ ] T100 [P] [US4] Write history reducer tests in `src/renderer/src/state/session-reducer.history.test.ts`: `QUOTE_LOADED` from a previous quote sets text and author and marks an existing option set `stale`; `QUOTE_TOUCHED` stores the returned `quoteId` so later saves pass it; editing the text after that clears `quoteId` until the next generate
- [ ] T101 [P] [US4] Write history UI tests (`// @vitest-environment jsdom`, `InMemoryFramerApi`) in `src/renderer/src/features/history/PreviousQuotes.test.tsx` (list newest first; each item is a button named with the first 60 characters of the quote; clicking it calls `onSelect`; empty text "Quotes you design will appear here."; button "Delete quote: {excerpt}" opens dialog "Delete this quote?"), `src/renderer/src/features/history/SavedDesigns.test.tsx` (each `listitem` contains `img` "Saved design: {excerpt}" from `getThumbnail`, the size + orientation, "Frame-ready: Off/Small/Medium/Large", and the localized save date; "Save again: {excerpt}" calls `reexportDesign` and shows the saved status with "Show in folder"; "Delete design: {excerpt}" opens "Delete this design?"; empty text "Designs you save will appear here."), and `src/renderer/src/features/history/ConfirmDialog.test.tsx` (native `<dialog>` named "Delete this {quote|design}?" with "Delete" and "Cancel"; Escape and Cancel close without deleting; focus is trapped inside and returns to the opener on close)
- [ ] T102 [P] [US4] Write the US4 E2E test in `tests/e2e/us4-history.spec.ts`: generate and save one design for quote A, then for quote B; `relaunch()`; open complementary "History" (use its drawer toggle if the window is narrow) → "Previous quotes" lists B then A; generating for A again moves it to the top with no duplicate; "Saved designs" shows both items with thumbnail, size, frame-ready setting, and date; `expectNoSeriousA11yViolations(page, 'history shown')`; press "Save again: {excerpt of A}" → a new file whose `sha256File` equals the first export's; press "Delete quote: {A}" → dialog "Delete this quote?" → `expectNoSeriousA11yViolations(page, 'confirm dialog')` → "Delete"; delete design B the same way; `relaunch()` → quote A and design B are gone, and design A is still listed; clicking a previous quote fills the "Quote" textbox
- [ ] T103 [P] [US4] Write the library-recovery E2E test in `tests/e2e/library-recovery.spec.ts`: before launch write invalid JSON to `<userDataDir>/library.json`; on launch an alert "Your history file was damaged, so we started a fresh one. A backup was kept at {path}." is shown, the path exists and holds the original bytes, and history is empty

### Implementation for User Story 4

- [ ] T104 [P] [US4] Implement `src/main/persistence/quote-repository.ts` (`QuoteRepository` interface with `upsert`, `list`, `get`, `delete`; `JsonQuoteRepository` over `JsonLibraryStore`; `InMemoryQuoteRepository`) — makes T096 pass
- [ ] T105 [US4] Extend `src/main/persistence/design-repository.ts` with `delete(id)` and `clearQuoteId(quoteId)`, and implement `src/main/services/quote-service.ts` (`touch`, `list`, `delete` which also calls `designRepository.clearQuoteId`) — makes T097 pass
- [ ] T106 [US4] Extend `src/main/services/design-service.ts` with `list`, `thumbnail`, `reexport` (copy stored bytes + sha256 check), and `delete` — makes T098 pass
- [ ] T107 [US4] Implement handlers in `src/main/ipc/quotes.ts` (`quotes:touch`, `quotes:list`, `quotes:delete`) and add `designs:list`, `designs:thumb`, `designs:reexport`, `designs:delete` to `src/main/ipc/designs.ts`; wire `QuoteService` and repositories in `src/main/composition.ts` — makes T099 pass
- [ ] T108 [US4] Extend `src/renderer/src/state/actions.ts` and `src/renderer/src/state/session-reducer.ts` with `QUOTE_LOADED`, `QUOTE_TOUCHED`, and `quoteId` handling — makes T100 pass
- [ ] T109 [US4] Implement `src/renderer/src/features/history/useHistory.ts` (loads `listQuotes` / `listDesigns`, exposes `refresh`, `deleteQuote`, `deleteDesign`, `reexport`), `src/renderer/src/features/history/ConfirmDialog.tsx`, `src/renderer/src/features/history/PreviousQuotes.tsx`, `src/renderer/src/features/history/SavedDesigns.tsx`, and `src/renderer/src/features/history/HistoryPanel.tsx` (+ `.module.css`: tabs "Previous quotes" / "Saved designs" with `role="tablist"`; below 900 px the complementary region becomes a drawer opened by a "History" toggle button with `aria-expanded`) — makes T101 pass
- [ ] T110 [US4] Wire history in `src/renderer/src/app/App.tsx`: before generating call `api.touchQuote` and dispatch `QUOTE_TOUCHED` (a `VALIDATION` result shows the matching alert); pass `quoteId` into `useSaveSelected`; `refresh()` history after generate, save, re-export, and delete; selecting a previous quote dispatches `QUOTE_LOADED`; on startup call `api.getStartupInfo()` and show any `LIBRARY_RECOVERED` notice as an `alert` with the text from `messages.ts` — makes T102 and T103 pass

**Checkpoint**: All four user stories work independently. Run quickstart.md scenarios 7–9.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Release automation, cross-story keyboard / responsive / security checks, performance
validation, and documentation.

- [ ] T111 [P] Create `.github/workflows/release.yml` per contracts/dev-tooling.md → `release.yml`: `on: release: types: [published]`, `permissions: contents: write`, matrix ubuntu-latest / windows-latest / macos-latest; check out the release tag; fail unless `GITHUB_REF_NAME == "v$(node -p "require('./package.json').version")"`; `npm ci`, `npm test`, `npm run build`, `npx electron-builder --publish never` (macOS adds `--arm64 --x64`); `gh release upload "$TAG" dist/*.{AppImage,deb,exe,dmg,zip} --clobber` with `GH_TOKEN: ${{ github.token }}` (skip globs that match nothing on each OS); pass `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` through only when set
- [ ] T112 [P] Write the keyboard-only E2E journey in `tests/e2e/keyboard.spec.ts`: using only `keyboard.press`/`type`, Tab order is Quote → Author → "Print size" → "Orientation" → "Frame-ready margin" → "Generate designs" → option cards → "Save selected (k)"; Ctrl+Enter (Meta+Enter on macOS) in Quote generates; Arrow keys move between cards and Space toggles; Save works; in the confirm dialog Tab stays inside and Escape returns focus to the delete button; every focused element has a visible focus indicator (non-zero outline or box-shadow)
- [ ] T113 [P] Write the responsive E2E test in `tests/e2e/responsive.spec.ts`: at 480×600 there is no horizontal scroll (`scrollWidth <= clientWidth`), the gallery reflows to one or two columns, and History is a drawer toggled by the "History" button; at 1280×800 History is visible next to the gallery; `expectNoSeriousA11yViolations` passes at both widths
- [ ] T114 [P] Write the security E2E test in `tests/e2e/security.spec.ts`: `window.open('https://example.com')` opens no new window; navigating the page to an external URL is blocked; `window.framer` exposes only the `FramerApi` method names; calling `window.framer.showInFolder('/etc/passwd')` returns `{ ok: false, error: { code: 'VALIDATION' } }`
- [ ] T115 [P] Write the performance check in `tests/e2e/performance.spec.ts`: for `LONG_500` and an 8x10 landscape setting, time from pressing "Generate designs" (and then "Regenerate designs") to status "… designs ready." is under 3 s (SC-002), logging the measured times; and in `tests/render/print-performance.render.test.ts` log `renderPrint` time for an 8x10 spec (target under 1 s; assert only under 3 s so CI stays deterministic)
- [ ] T116 [P] Write `README.md`: what Framer does, prerequisites (Node 24 via `.nvmrc`), `npm ci` / `npm run dev` / test commands, F5 debugging, release process (link to quickstart.md → Release), font licensing note (all fonts SIL OFL 1.1, licenses in `assets/fonts/*/OFL.txt`), and the future AI `ImageGenerator` seam pointer to contracts/engine.md
- [ ] T117 Review the code for Constitution II/V: no `src/shared` file imports DOM/Node/React, no `src/engine` file imports React/Electron (ESLint rule from T005 passes), no unused exports or speculative abstractions (the `ImageGenerator` interface exists only in docs), duplication removed; run `npm run format` and fix lint across `src/` and `tests/`
- [ ] T118 Run `npm run test:all` and `npm run package:dir`, launch the unpacked app from `dist/`, and confirm GPU status is logged and fonts load from `resources/assets/fonts`; fix any packaging path issues in `src/main/platform/paths.ts` or `electron-builder.yml`
- [ ] T119 Run every manual scenario (1–12) in `specs/001-quote-print-designer/quickstart.md`, confirm 300 DPI with `exiftool` or `identify -verbose`, record results and screenshots for the PR (Constitution quality gate 5), and update quickstart.md if any step changed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies. T001 → T002 first; T003–T011 then run in parallel (T004 after T003 for aliases).
- **Foundational (Phase 2)**: depends on Setup. Blocks every user story.
  - Tests and test infrastructure T012–T022 come first. T012–T021 run in parallel; T022 (launch smoke E2E) needs the T020 fixtures. Every test must fail before its implementation starts.
  - T023 (schemas) blocks T024, T025, T027, T032. T026 → T027 → T028, T037.
  - T029 → T030 → T034 → T035 → T036. T031 → T034.
  - T032 → T033, T034. T038 → T039.
  - T022 must pass at the phase checkpoint, after T036–T039.
- **US1 (Phase 3)**: depends on Foundational only.
- **US2 (Phase 4)**: depends on Foundational and on US1's generator, reducer, gallery, and save bar (T065, T075–T080), which it extends.
- **US3 (Phase 5)**: depends on Foundational and on US1's engine and renderer (T064–T070, T075–T080). Independent of US2 — US2 and US3 can be built in parallel.
- **US4 (Phase 6)**: main-process work (T096–T099, T104–T107) depends only on Foundational and T073 (design repository/service). Renderer wiring (T110) depends on US1's App (T080). Independent of US2 and US3.
- **Polish (Phase 7)**: depends on every story that is in scope. T112–T114 need US3 and US4 UI.

### User Story Dependencies

```text
Setup ─► Foundational ─► US1 (MVP) ─┬─► US2 (regenerate, multi-save)
                                    ├─► US3 (size, margin)
                                    └─► US4 (history)          ─► Polish
```

US2, US3, and US4 each build on US1's pipeline but not on each other, so after US1 they can be
done in any order or in parallel.

### Within Each User Story

- Test tasks first; each must fail for the expected reason before its implementation task starts (Constitution I).
- Pure engine/domain code → main services → IPC handlers → reducer → components → composition wiring.
- Each implementation task names the test(s) it makes pass; the story is done when its E2E spec passes.

### Key Sequential Chains

- US1 engine: T060/T061/T062/T063 → T064 → T065; T066 → T067 → T068 → T070 (needs T064, T069).
- US1 main: T071, T072 → T073 → T074.
- US1 renderer: T075 → T076 → T077/T078/T079 → T080.
- US4 main: T104 → T105 → T106 → T107. US4 renderer: T108 → T109 → T110.

---

## Parallel Opportunities

- **Setup**: T003, T005–T011 together.
- **Foundational tests**: T012–T021 together, then T022. Implementation: T024, T025, T026 together; then T028, T029, T033, T038 together.
- **US1 tests**: T040–T059 are all different files — write them all in parallel.
- **US1 implementation**: T060, T061, T062, T063, T066, T069, T071, T072 together; main chain (T073 → T074) runs alongside the engine chain.
- **After US1**: US2 (T081–T087), US3 (T088–T095), and US4 (T096–T110) can be staffed in parallel.
- **US4**: T096–T103 together; T104 alongside renderer reducer work T108.
- **Polish**: T111–T116 together.

## Parallel Example: User Story 1

```bash
# Write all US1 failing tests together:
Task: "PRNG tests in src/engine/generate/prng.test.ts"                       # T040
Task: "Contrast tests in src/engine/generate/contrast.test.ts"               # T041
Task: "Glyph-coverage tests in src/engine/generate/glyph-coverage.test.ts"   # T042
Task: "Layout tests in src/engine/layout/text-layout-engine.test.ts"         # T046
Task: "Design-save tests in src/main/services/design-service.test.ts"        # T049
Task: "Session reducer tests in src/renderer/src/state/session-reducer.test.ts"  # T051
Task: "E2E happy path in tests/e2e/us1-generate-and-save.spec.ts"            # T058

# Then the independent leaf implementations together:
Task: "mulberry32 in src/engine/generate/prng.ts"                            # T060
Task: "WCAG contrast in src/engine/generate/contrast.ts"                     # T061
Task: "Fontkit coverage in src/engine/generate/glyph-coverage.ts"            # T062
Task: "Catalog in src/engine/catalog/*.ts"                                   # T063
Task: "setJpegDensity in src/engine/output/jpeg-density.ts"                  # T069
Task: "Export file names in src/shared/domain/filename.ts"                   # T071
```

## Parallel Example: User Story 4

```bash
Task: "Quote repository suite in src/main/persistence/quote-repository.test.ts"      # T096
Task: "Quote service tests in src/main/services/quote-service.test.ts"               # T097
Task: "Design history tests in src/main/services/design-service.history.test.ts"     # T098
Task: "History UI tests in src/renderer/src/features/history/*.test.tsx"             # T101
Task: "E2E in tests/e2e/us4-history.spec.ts"                                         # T102
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup.
2. Phase 2: Foundational (CRITICAL — blocks every story).
3. Phase 3: User Story 1.
4. **STOP and VALIDATE**: `npm run test:all`, quickstart.md scenarios 1–3 and 10–12, and upload a
   4x6 export to a photo center (SC-003).
5. Demo: the user can already go from a quote to a printed 4x6 photo.

### Incremental Delivery

1. Setup + Foundational → secure, accessible empty shell with CI.
2. + US1 → MVP: generate, select, save 4x6 JPEGs.
3. + US2 → regenerate without repeats, multi-save with clear guidance.
4. + US3 → 5x7 / 8x10, orientation, frame-ready margin.
5. + US4 → persistent history, re-export, delete, recovery.
6. Polish → release workflow, keyboard/responsive/security/performance checks, docs.

Each increment keeps every earlier E2E spec green.

### Parallel Team Strategy

1. Everyone: Setup + Foundational.
2. One or two developers: US1 (engine chain and main/renderer chain in parallel).
3. After US1: Developer A → US2, Developer B → US3, Developer C → US4.
4. Together: Polish.

---

## Notes

- [P] = different files and no dependency on an unfinished task.
- [Story] labels map tasks to spec user stories for traceability.
- Commit after each green test/implementation pair (Red-Green-Refactor).
- Accessible names and messages are a contract (contracts/ui.md): renaming one means updating that file and the E2E tests in the same PR.
- `data-combo-key` (T084, T087) is the only non-accessible test handle; it is allowed because no accessible handle carries the combination id.
