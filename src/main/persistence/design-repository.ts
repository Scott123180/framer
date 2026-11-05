import type { SavedDesign } from '@shared/domain';
import type { JsonLibraryStore } from './json-library-store';

export interface DesignRepository {
  add(design: SavedDesign): Promise<void>;
  list(): Promise<SavedDesign[]>;
  get(id: string): Promise<SavedDesign | undefined>;
  /** Removes the record; returns false if there was none. */
  delete(id: string): Promise<boolean>;
  /** Unlinks designs from a deleted quote; the designs keep their own copy of the text. */
  clearQuoteId(quoteId: string): Promise<void>;
}

const newestFirst = (a: SavedDesign, b: SavedDesign) => b.savedAt.localeCompare(a.savedAt);

export class JsonDesignRepository implements DesignRepository {
  constructor(private readonly store: JsonLibraryStore) {}

  async add(design: SavedDesign): Promise<void> {
    await this.store.update((lib) => ({ ...lib, designs: [...lib.designs, design] }));
  }

  async list(): Promise<SavedDesign[]> {
    return [...this.store.read().designs].sort(newestFirst);
  }

  async get(id: string): Promise<SavedDesign | undefined> {
    return this.store.read().designs.find((d) => d.id === id);
  }

  async delete(id: string): Promise<boolean> {
    if (!this.store.read().designs.some((d) => d.id === id)) return false;
    await this.store.update((lib) => ({ ...lib, designs: lib.designs.filter((d) => d.id !== id) }));
    return true;
  }

  async clearQuoteId(quoteId: string): Promise<void> {
    if (!this.store.read().designs.some((d) => d.quoteId === quoteId)) return;
    await this.store.update((lib) => ({
      ...lib,
      designs: lib.designs.map((d) => (d.quoteId === quoteId ? { ...d, quoteId: null } : d)),
    }));
  }
}

export class InMemoryDesignRepository implements DesignRepository {
  private designs: SavedDesign[] = [];
  private nextAddError: Error | null = null;

  /** Test hook: the next add() rejects with this error. */
  failNextAdd(error: Error): void {
    this.nextAddError = error;
  }

  async add(design: SavedDesign): Promise<void> {
    if (this.nextAddError) {
      const e = this.nextAddError;
      this.nextAddError = null;
      throw e;
    }
    this.designs.push(design);
  }

  async list(): Promise<SavedDesign[]> {
    return [...this.designs].sort(newestFirst);
  }

  async get(id: string): Promise<SavedDesign | undefined> {
    return this.designs.find((d) => d.id === id);
  }

  async delete(id: string): Promise<boolean> {
    const before = this.designs.length;
    this.designs = this.designs.filter((d) => d.id !== id);
    return this.designs.length < before;
  }

  async clearQuoteId(quoteId: string): Promise<void> {
    this.designs = this.designs.map((d) => (d.quoteId === quoteId ? { ...d, quoteId: null } : d));
  }
}
