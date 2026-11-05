import { describe, expect, it } from 'vitest';
import type { SavedDesign } from '@shared/domain';
import { InMemoryQuoteRepository } from '../persistence/quote-repository';
import { InMemoryDesignRepository } from '../persistence/design-repository';
import { QuoteService } from './quote-service';

function setup() {
  let t = 0;
  let n = 0;
  const quotes = new InMemoryQuoteRepository();
  const designs = new InMemoryDesignRepository();
  const service = new QuoteService({
    quotes,
    designs,
    clock: { now: () => new Date(Date.UTC(2026, 10, 4, 12, 0, ++t)) },
    ids: { next: () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}` },
  });
  return { service, quotes, designs };
}

const design = (id: string, quoteId: string | null): SavedDesign =>
  ({ id, quoteId, savedAt: '2026-11-04T12:00:00.000Z' }) as SavedDesign;

describe('QuoteService', () => {
  it('normalizes and creates a quote', async () => {
    const { service } = setup();
    const res = await service.touch({ text: '  Be  the change ', author: ' Gandhi ' });
    expect(res).toEqual({
      ok: true,
      value: {
        id: '00000000-0000-4000-8000-000000000001',
        text: 'Be  the change',
        author: 'Gandhi',
        dedupeKey: 'be the change\u0000gandhi',
        createdAt: '2026-11-04T12:00:01.000Z',
        lastUsedAt: '2026-11-04T12:00:01.000Z',
      },
    });
  });

  it.each([
    ['empty', { text: ' ', author: null }, 'text'],
    ['too long', { text: 'x'.repeat(501), author: null }, 'text'],
    ['long author', { text: 'hi', author: 'x'.repeat(121) }, 'author'],
  ])('rejects a %s quote with VALIDATION on %s', async (_l, input, field) => {
    const { service } = setup();
    expect(await service.touch(input)).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION', field, message: expect.any(String) },
    });
  });

  it('moves a repeated quote to the top instead of duplicating it', async () => {
    const { service } = setup();
    await service.touch({ text: 'Be the change', author: 'Gandhi' });
    await service.touch({ text: 'Other', author: null });
    const again = await service.touch({ text: 'be  THE change', author: 'gandhi' });
    expect(again.ok && again.value.id).toBe('00000000-0000-4000-8000-000000000001');
    const list = await service.list();
    expect(list.ok && list.value.map((q) => q.text)).toEqual(['Be the change', 'Other']);
  });

  it('deletes a quote and unlinks its designs, keeping them', async () => {
    const { service, designs } = setup();
    const q = await service.touch({ text: 'A', author: null });
    const id = q.ok ? q.value.id : '';
    await designs.add(design('d1', id));
    await designs.add(design('d2', null));
    expect(await service.delete(id)).toEqual({ ok: true, value: undefined });
    expect((await designs.list()).map((d) => [d.id, d.quoteId])).toEqual([
      ['d1', null],
      ['d2', null],
    ]);
    expect(await service.delete(id)).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });
});
