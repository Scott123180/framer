import { dedupeKey, normalizeQuoteInput, validateQuoteInput } from '@shared/domain/quote';
import { pixelSize } from '@shared/domain/print';
import type { DesignSpec, Quote, SavedDesign } from '@shared/domain';
import type { FramerApi } from '@shared/ipc/framer-api';
import { err, ok, type AppError, type Result } from '@shared/ipc/result';

type Method = keyof FramerApi;
type Call = { method: Method; args: unknown[] };

/** An in-memory FramerApi for renderer tests: records calls and can fail the next call to a method. */
export class InMemoryFramerApi implements FramerApi {
  readonly exportDir = '/export';
  readonly calls: Call[] = [];
  quotes: Quote[] = [];
  designs: SavedDesign[] = [];
  notices: AppError[] = [];
  private failures = new Map<Method, AppError>();
  private seq = 0;
  private tick = 0;

  failNext(method: Method, error: AppError): void {
    this.failures.set(method, error);
  }

  callsTo(method: Method): unknown[][] {
    return this.calls.filter((c) => c.method === method).map((c) => c.args);
  }

  private record<T>(method: Method, args: unknown[], run: () => Result<T>): Promise<Result<T>> {
    this.calls.push({ method, args });
    const failure = this.failures.get(method);
    if (failure) {
      this.failures.delete(method);
      return Promise.resolve(err(failure));
    }
    return Promise.resolve(run());
  }

  private nextId(): string {
    this.seq += 1;
    return `00000000-0000-4000-8000-${String(this.seq).padStart(12, '0')}`;
  }

  private now(): string {
    this.tick += 1;
    return new Date(Date.UTC(2026, 10, 4, 12, 0, this.tick)).toISOString();
  }

  touchQuote(input: { text: string; author: string | null }) {
    return this.record('touchQuote', [input], () => {
      const v = validateQuoteInput(input);
      if (!v.ok) return err({ code: 'VALIDATION', message: v.code, field: v.field ?? 'text' });
      const { text, author } = normalizeQuoteInput(input);
      const key = dedupeKey(text, author);
      const now = this.now();
      const existing = this.quotes.find((q) => q.dedupeKey === key);
      if (existing) {
        existing.lastUsedAt = now;
        return ok({ ...existing });
      }
      const quote: Quote = {
        id: this.nextId(),
        text,
        author,
        dedupeKey: key,
        createdAt: now,
        lastUsedAt: now,
      };
      this.quotes.push(quote);
      return ok({ ...quote });
    });
  }

  listQuotes() {
    return this.record('listQuotes', [], () =>
      ok([...this.quotes].sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt))),
    );
  }

  deleteQuote(id: string) {
    return this.record<void>('deleteQuote', [id], () => {
      if (!this.quotes.some((q) => q.id === id)) return err({ code: 'NOT_FOUND', message: 'Not found' });
      this.quotes = this.quotes.filter((q) => q.id !== id);
      this.designs = this.designs.map((d) => (d.quoteId === id ? { ...d, quoteId: null } : d));
      return ok(undefined);
    });
  }

  saveDesign(input: { spec: DesignSpec; jpeg: ArrayBuffer; quoteId: string | null }) {
    return this.record('saveDesign', [input], () => {
      const id = this.nextId();
      const { width, height } = pixelSize(input.spec.print);
      const fileName = `framer-${id}.jpg`;
      const design: SavedDesign = {
        id,
        quoteId: input.quoteId,
        spec: input.spec,
        fileName,
        imagePath: `designs/${id}.jpg`,
        thumbPath: `designs/${id}.thumb.jpg`,
        pixelWidth: width,
        pixelHeight: height,
        byteSize: input.jpeg.byteLength,
        sha256: '0'.repeat(64),
        savedAt: this.now(),
      };
      this.designs.push(design);
      return ok({ ...design, exportedPath: `${this.exportDir}/${fileName}` });
    });
  }

  listDesigns() {
    return this.record('listDesigns', [], () =>
      ok([...this.designs].sort((a, b) => b.savedAt.localeCompare(a.savedAt))),
    );
  }

  getThumbnail(id: string) {
    return this.record('getThumbnail', [id], () =>
      this.designs.some((d) => d.id === id)
        ? ok(`data:image/jpeg;base64,${btoa(id)}`)
        : err({ code: 'NOT_FOUND', message: 'Not found' }),
    );
  }

  reexportDesign(id: string) {
    return this.record('reexportDesign', [id], () => {
      const d = this.designs.find((x) => x.id === id);
      if (!d) return err({ code: 'NOT_FOUND', message: 'Not found' });
      return ok({ exportedPath: `${this.exportDir}/${d.fileName.replace('.jpg', '-2.jpg')}` });
    });
  }

  deleteDesign(id: string) {
    return this.record<void>('deleteDesign', [id], () => {
      if (!this.designs.some((d) => d.id === id)) return err({ code: 'NOT_FOUND', message: 'Not found' });
      this.designs = this.designs.filter((d) => d.id !== id);
      return ok(undefined);
    });
  }

  showInFolder(path: string) {
    return this.record<void>('showInFolder', [path], () => ok(undefined));
  }

  loadFontFiles(ids: string[]) {
    return this.record('loadFontFiles', [ids], () =>
      ok(ids.map((id) => ({ id, bytes: new ArrayBuffer(0) }))),
    );
  }

  getStartupInfo() {
    return this.record('getStartupInfo', [], () => {
      const notices = this.notices;
      this.notices = [];
      return ok({ notices, exportDir: this.exportDir });
    });
  }
}
