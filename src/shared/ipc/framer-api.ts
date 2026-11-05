import type { DesignSpec, Quote, SavedDesign } from '../domain';
import type { AppError, Result } from './result';

/** The preload bridge (window.framer). Verbatim from contracts/ipc-api.md → "Interface". */
export interface FramerApi {
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
  saveDesign(input: {
    spec: DesignSpec;
    jpeg: ArrayBuffer;
    quoteId: string | null;
  }): Promise<Result<SavedDesign & { exportedPath: string }>>;
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
  /** Startup notices, such as LIBRARY_RECOVERED, and the export folder. (GPU status is only logged by main, not exposed.) */
  getStartupInfo(): Promise<Result<{ notices: AppError[]; exportDir: string }>>;
}
