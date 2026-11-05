# Contract: Developer Tooling, VS Code, CI & Release

Developers and CI rely on these scripts and files. Anything that changes them must update this
document.

## npm scripts (`package.json`)

| Script | Does |
|--------|------|
| `dev` | `electron-vite dev`: runs the app with HMR |
| `build` | `electron-vite build`: outputs to `out/` |
| `lint` | `eslint .` |
| `format` / `format:check` | Prettier |
| `typecheck` | `tsc --noEmit -p tsconfig.node.json && tsc --noEmit -p tsconfig.web.json` |
| `test` | `vitest run --project unit`: jsdom and Node unit tests |
| `test:render` | `vitest run --project render`: browser mode in Chromium |
| `test:coverage` | `vitest run --project unit --project render --coverage`: both projects with merged V8 coverage; fails if a per-layer line threshold (`src/shared/**`, `src/engine/**`, `src/renderer/src/**`) is not met, and raises thresholds that were beaten (`thresholds.autoUpdate`) so the new values get committed |
| `test:e2e` | `npm run build && playwright test`: Playwright against the built Electron app |
| `test:all` | lint + typecheck + test:coverage + test:e2e |
| `package` | `npm run build && electron-builder --publish never` for the current OS |
| `package:dir` | Unpacked build (`--dir`), used by CI's package-smoke job |
| `fonts:verify` | Checks that every manifest entry has a font file and an OFL license next to it. `scripts/verify-fonts.mjs` exports `verifyFonts(rootDir)` (returns a list of problems) and runs it as a CLI; `scripts/verify-fonts.test.ts` tests it in the `unit` project |

Runtime environment overrides (for tests and debugging): `FRAMER_USER_DATA_DIR`,
`FRAMER_EXPORT_DIR`, and `FRAMER_DISABLE_GPU=1`, which appends `--disable-gpu`.

## VS Code (`.vscode/`, committed)

`.gitignore` gets these lines added below `.vscode/*`:
`!.vscode/launch.json`, `!.vscode/tasks.json`, `!.vscode/settings.json`.

`launch.json` configurations:

| Name | Type | Purpose |
|------|------|---------|
| Debug Main Process | `node` launch | Runs `node_modules/.bin/electron-vite` (`.cmd` on Windows) with `--sourcemap` and `env.REMOTE_DEBUGGING_PORT=9222`. Breakpoints work in `src/main` and `src/preload` |
| Debug Renderer Process | `chrome` attach | Port 9222, `webRoot: ${workspaceFolder}/src/renderer`, timeout 60 s. Hidden from the picker; used by the compound |
| **Debug App (Main + Renderer)** | compound | Runs both of the above. This is the default F5 configuration |
| Vitest: Current File | `node` launch | Runs `vitest run ${relativeFile}` |
| Vitest: All Unit | `node` launch | Runs `vitest run --project unit` |
| Playwright: E2E | `node` launch | Runs `playwright test` after the `build` preLaunchTask |

`tasks.json` defines `build`, `dev`, `test`, and `test:e2e`. `extensions.json` recommends
`dbaeumer.vscode-eslint`, `esbenp.prettier-vscode`, `vitest.explorer`, and
`ms-playwright.playwright`.

## GitHub Actions

### `.github/workflows/ci.yml`

- Runs on `pull_request` and on `push` to `main`. Duplicate runs for the same ref are cancelled
  (`concurrency`).
- Job `verify` (ubuntu-latest): Node 24 with npm cache, `npm ci`, lint, typecheck,
  `fonts:verify`, install Playwright Chromium, `test:coverage` (unit + render with the coverage
  gate), then `xvfb-run -a npm run test:e2e`. It fails if `test:coverage` changed
  `vitest.config.ts` (`git diff --exit-code vitest.config.ts`), meaning raised thresholds were
  not committed. It uploads `coverage/` always, and the Playwright report and traces if
  anything fails.
- Job `package-smoke`, a matrix over ubuntu-latest, windows-latest, and macos-latest:
  `npm ci && npm run package:dir`. Runs after `verify` succeeds.

### `.github/workflows/release.yml`

- Runs on `release: types: [published]`. Uses `permissions: contents: write`.
- Matrix: ubuntu-latest, windows-latest, macos-latest.
- Steps: check out the release tag. Fail if the tag is not `v${package.json version}`. Then
  `npm ci`, `npm test`, `npm run build`, `electron-builder --publish never` (macOS builds
  `--arm64 --x64`), and `gh release upload "$TAG" dist/*.{AppImage,deb,exe,dmg,zip} --clobber`
  with `GH_TOKEN: ${{ github.token }}`.
- Optional signing secrets are passed through when they exist: `CSC_LINK`, `CSC_KEY_PASSWORD`,
  `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`. Without them, the builds are
  unsigned.

### Release artifacts

| OS | Files |
|----|-------|
| Linux x64 | `Framer-<v>.AppImage`, `framer_<v>_amd64.deb` |
| Windows x64 | `Framer-Setup-<v>.exe` (NSIS) |
| macOS arm64 + x64 | `Framer-<v>-arm64.dmg`, `Framer-<v>.dmg`, plus `.zip` for each |

## electron-builder (`electron-builder.yml`)

`appId: com.framer.quoteprint`, `productName: Framer`, `directories.output: dist`,
`files: out/**`, `extraResources: assets/fonts/**`. Targets: `linux: [AppImage, deb]`,
`win: [nsis]`, `mac: [dmg, zip]`. `publish: null`, because uploading is done by `gh` (research
R11).
