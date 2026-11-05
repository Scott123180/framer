import { describe, expect, it } from 'vitest';
import { Quote } from '@shared/domain';
import { err, ok } from '@shared/ipc/result';
import { FakeIpcMain } from './test-helpers';
import { createRegistrar } from './register';
import { registerQuoteHandlers } from './quotes';
import type { QuoteService } from '../services/quote-service';

const ID = '00000000-0000-4000-8000-000000000001';
const q: Quote = {
  id: ID,
  text: 'Hi',
  author: null,
  dedupeKey: 'hi\u0000',
  createdAt: '2026-11-04T12:00:00.000Z',
  lastUsedAt: '2026-11-04T12:00:00.000Z',
};

function setup(over: Partial<Pick<QuoteService, 'touch' | 'list' | 'delete'>> = {}) {
  const ipc = new FakeIpcMain();
  registerQuoteHandlers(createRegistrar(ipc, { isTrustedSender: () => true }), {
    quotes: {
      touch: async () => ok(q),
      list: async () => ok([q]),
      delete: async () => ok(undefined),
      ...over,
    },
  });
  return ipc;
}

describe('quotes channels', () => {
  it('quotes:touch returns a Quote', async () => {
    const res = (await setup().invoke('quotes:touch', { text: 'Hi', author: null })) as {
      ok: true;
      value: unknown;
    };
    expect(Quote.safeParse(res.value).success).toBe(true);
  });
  it('quotes:touch validates its payload', async () => {
    expect(await setup().invoke('quotes:touch', { text: 3 })).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION' },
    });
  });
  it('quotes:list returns quotes', async () => {
    expect(await setup().invoke('quotes:list')).toEqual({ ok: true, value: [q] });
  });
  it('quotes:delete needs a uuid', async () => {
    expect(await setup().invoke('quotes:delete', { id: ID })).toEqual({ ok: true, value: undefined });
    expect(await setup().invoke('quotes:delete', { id: 'x' })).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION' },
    });
  });
  it('passes NOT_FOUND and STORAGE_FAILED through', async () => {
    const ipc = setup({
      delete: async () => err({ code: 'NOT_FOUND', message: 'gone' }),
      list: async () => err({ code: 'STORAGE_FAILED', message: 'x' }),
    });
    expect(await ipc.invoke('quotes:delete', { id: ID })).toMatchObject({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
    expect(await ipc.invoke('quotes:list')).toMatchObject({ ok: false, error: { code: 'STORAGE_FAILED' } });
  });
});
