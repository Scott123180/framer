import { randomUUID } from 'node:crypto';

export interface IdSource {
  /** A new UUID v4. */
  next(): string;
}

export const uuidIds: IdSource = { next: () => randomUUID() };
