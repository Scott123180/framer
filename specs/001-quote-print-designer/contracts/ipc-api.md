# Contract: Preload Bridge (`window.framer`)

The renderer and the main process communicate **only** through this interface. The preload script
(`src/preload/index.ts`) exposes it with `contextBridge.exposeInMainWorld('framer', api)`. Every
call goes through `ipcRenderer.invoke` on a channel listed below. Main validates every payload with
the zod schemas in `src/shared/ipc/` before it runs a handler.

The renderer depends on the `FramerApi` **interface** (see `src/shared/ipc/framer-api.ts`). It does
not depend on `window.framer` directly. The composition root injects the real bridge. Component
and reducer tests inject `InMemoryFramerApi` instead (Constitution II, Dependency Inversion).

## Result envelope

Calls never throw across the bridge. Each one returns:

```ts
type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };

type AppError =
  | { code: 'VALIDATION';      message: string; field?: string }
  | { code: 'NOT_FOUND';       message: string }
  | { code: 'EXPORT_FAILED';   message: string; reason: 'NO_SPACE' | 'PERMISSION' | 'UNKNOWN' }
  | { code: 'STORAGE_FAILED';  message: string }
  | { code: 'LIBRARY_RECOVERED'; message: string; backupPath: string }; // returned once, at startup
```

`message` is plain language a user can understand (Constitution IV). The UI shows it as written.

## Interface

```ts
interface FramerApi {
  // --- Quotes (FR-020, FR-021, FR-024) ---
  /** Create or update the quote (deduplicated by dedupeKey), set lastUsedAt to now, and return it. */
  touchQuote(input: { text: string; author: string | null }): Promise<Result<Quote>>;
  /** Quotes sorted by lastUsedAt, newest first. */
  listQuotes(): Promise<Result<Quote[]>>;
  /** Delete a quote. Saved designs that used it keep their copy of the text and get quoteId = null. */
  deleteQuote(id: string): Promise<Result<void>>;

  // --- Saved designs (FR-017, FR-022, FR-023, FR-024) ---
  /**
   * Save one design atomically. jpeg must have the exact print pixel size and a 300 DPI header.
   * Main writes the original file, generates a thumbnail, copies the file to the export folder,
   * and then records it in the library. If any step fails, nothing is recorded.
   */
  saveDesign(input: { spec: DesignSpec; jpeg: ArrayBuffer; quoteId: string | null }):
    Promise<Result<SavedDesign & { exportedPath: string }>>;
  /** Saved designs sorted by savedAt, newest first. */
  listDesigns(): Promise<Result<SavedDesign[]>>;
  /** Thumbnail as a data URL for the history grid. */
  getThumbnail(id: string): Promise<Result<string>>;
  /** Copy the stored original bytes to the export folder again. The copy is byte-identical; its sha256 is checked. */
  reexportDesign(id: string): Promise<Result<{ exportedPath: string }>>;
  deleteDesign(id: string): Promise<Result<void>>;

  // --- OS integration ---
  showInFolder(path: string): Promise<Result<void>>;
  /** Font file bytes for the given font ids. Lets the renderer and its worker register fonts with FontFace. */
  loadFontFiles(ids: string[]): Promise<Result<Array<{ id: string; bytes: ArrayBuffer }>>>;
  /** Startup notices, such as LIBRARY_RECOVERED, and environment info. */
  getStartupInfo(): Promise<Result<{ notices: AppError[]; exportDir: string; gpu: Record<string, string> }>>;
}
```

## Channels

| Channel | Payload schema | Handler (main) |
|---------|----------------|----------------|
| `quotes:touch` | `TouchQuoteInput` | `QuoteService.touch` |
| `quotes:list` | none | `QuoteService.list` |
| `quotes:delete` | `{ id: uuid }` | `QuoteService.delete` |
| `designs:save` | `SaveDesignInput` (≤ 40 MB buffer) | `DesignService.save` |
| `designs:list` | none | `DesignService.list` |
| `designs:thumb` | `{ id: uuid }` | `DesignService.thumbnail` |
| `designs:reexport` | `{ id: uuid }` | `DesignService.reexport` |
| `designs:delete` | `{ id: uuid }` | `DesignService.delete` |
| `os:showInFolder` | `{ path: string }` must be inside the export folder | `Shell.showItemInFolder` |
| `fonts:load` | `{ ids: string[] }` must be catalog ids | `FontAssetService.load` |
| `app:startupInfo` | none | `StartupService.info` |

## Security rules

- Handlers check that `event.senderFrame.url` comes from the app's own origin.
- File-system paths never come from the renderer. The only exception is `showInFolder`, and its
  path must resolve inside the export folder.
- No general-purpose `fs` or `shell` access is exposed.

## Contract tests (`src/main/ipc/*.contract.test.ts`)

Each channel has tests for: a valid payload returns `ok: true` with a value matching the schema;
an invalid payload returns `VALIDATION`; and a failure in the underlying storage or file system
returns the documented error code. The underlying services are faked.
