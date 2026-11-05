# Quickstart & Validation Guide: Quote Print Designer

How to run Framer locally and check, end to end, that the feature works. Script names and
VS Code configurations are listed in [contracts/dev-tooling.md](./contracts/dev-tooling.md).
Accessible names used below come from [contracts/ui.md](./contracts/ui.md).

## Prerequisites

- Node **24 LTS** (`nvm use`, which reads `.nvmrc`) and npm.
- Git. No display server is needed for E2E on Linux: the tests run Electron headless.
- Optional: VS Code with the recommended extensions (it prompts when you open the folder).
- Not needed for v1: Python or uv. uv is reserved for a future AI sidecar (research R9).

## Setup & run

```bash
nvm use
npm ci
npx playwright install chromium   # used by render and E2E tests
npm run dev                       # runs the app with hot reload
```

**From VS Code**: press **F5** and choose **"Debug App (Main + Renderer)"**. Breakpoints work in
`src/main/**` and `src/renderer/**`.

**Check that the GPU is used** (optional): `npm run dev` logs `GPU feature status`, and it should
show `2d_canvas: enabled` and `gpu_compositing: enabled`. You can also open `chrome://gpu` in a
DevTools window. If rendering is broken, use `FRAMER_DISABLE_GPU=1 npm run dev`.

## Automated validation

```bash
npm run lint && npm run typecheck
npm test                 # unit tests: domain, generator, layout, reducer, services, IPC contracts
npm run test:render      # real-Chromium canvas: dimensions, safe area, contrast, glyph exclusion
npm run test:coverage    # unit + render with the coverage gate (commit any raised thresholds)
npm run test:e2e         # Playwright drives the built Electron app; includes axe scans
npm run package          # installer for the current OS in dist/
```

Expected result: every suite passes, coverage meets the thresholds in `vitest.config.ts`, and
there are zero axe serious or critical violations.

## Manual validation scenarios

Each scenario maps to a spec story. The matching E2E tests are in `tests/e2e/`.

| # | Story | Steps | Expected |
|---|-------|-------|----------|
| 1 | US1 | Type "Be the change you wish to see in the world.", set Author to "Gandhi", and press **Generate designs** | 12 previews appear in under 3 s. Each uses a different font and background, and each shows the attribution with a different look from the quote |
| 2 | US1 | Select one option, then press **Save selected (1)** | You see "Saved 1 image(s) to …/Pictures/Framer". The file is `framer-be-the-change-…-4x6-portrait.jpg`, 1200×1800 px, 300 DPI (`exiftool` or `identify -verbose`), and looks the same as the preview |
| 3 | US1 | Paste a 500-character quote and generate | No text is clipped in any option. Some options may be left out, and the app says why ("Some designs couldn't fit…" or "Some fonts couldn't display…") |
| 4 | US2 | Press **Regenerate designs** | 12 new previews. None repeats a font-and-background pair from the previous set |
| 5 | US2 | Select 3 options, then Save | 3 files are written, and 3 entries appear in Saved designs. With nothing selected, Save is disabled and the helper text is shown |
| 6 | US3 | Choose 5x7, Landscape, and Frame-ready margin set to Large | The previews re-render with the same styles (any that no longer fit are left out with a "couldn't fit" message). The saved file is 2100×1500 px, with an even margin band on every side |
| 7 | US4 | Save designs from two different quotes, quit, then relaunch | Both quotes appear newest first, and both designs appear with thumbnail, size, frame-ready setting, and date |
| 8 | US4 | Press **Save again** on a history item | The new file's SHA-256 matches the original (`sha256sum`) |
| 9 | US4 | Delete a quote and a design, confirming both | Both are gone after a relaunch. Designs made from the deleted quote stay in history |
| 10 | Edge | Use text with emoji, curly quotes, and accents ("Café — “naïve” 🌻") | Every option draws every character, and none shows a missing-glyph box (tofu) |
| 11 | Edge | Edit the quote after generating | The options are marked as out of date, Save is disabled, and the regenerate prompt appears |
| 12 | Edge | Make the export folder read-only (`FRAMER_EXPORT_DIR=/tmp/ro`) and Save | A plain-language error is shown, and nothing is added to Saved designs |

## Photo-center acceptance (SC-003, SC-006, manual, before each release)

1. **SC-003**: Upload a 4x6 and an 8x10 export to two retail photo centers' web upload pages,
   for example CVS and Walgreens. Confirm each site accepts the file with no crop or
   low-resolution warning.
2. **SC-006**: Order (or print) at least the 4x6, plus one frame-ready export. Compare each print
   side by side with its on-screen preview: layout, font, background, and margin must match, with
   differences only in color reproduction.

Record both results (site names, file names, pass/fail, and a photo of each print next to its
preview) in the PR description for the feature and in the release notes.

## Release

1. Bump `version` in `package.json`, commit, and merge to `main`.
2. Create a GitHub Release with tag `v<version>` and **publish** it.
3. `release.yml` builds Linux, Windows, and macOS and attaches the installers to that release.
   Check that all expected files are listed (see the artifacts table in dev-tooling.md).
