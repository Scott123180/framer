// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { RenderService } from '@engine/output/render-service';
import { usePreviews, previewKey } from './usePreviews';
import { makeOptions } from '../../test/specs';

const bitmap = () =>
  ({ width: 1, height: 1, close: vi.fn() }) as unknown as ImageBitmap & { close: ReturnType<typeof vi.fn> };

describe('usePreviews', () => {
  it('keeps previews for current options and closes the rest', async () => {
    const made: Array<ReturnType<typeof bitmap>> = [];
    const svc = {
      renderPreview: vi.fn(async () => {
        const b = bitmap();
        made.push(b);
        return b;
      }),
      renderPrint: vi.fn(),
    } as unknown as RenderService;
    const first = makeOptions(2);
    const { result, rerender } = renderHook(({ options }) => usePreviews(options, svc), {
      initialProps: { options: first },
    });
    await waitFor(() => expect(result.current.size).toBe(2));
    const second = first.slice(1);
    rerender({ options: second });
    await waitFor(() => expect(result.current.size).toBe(1));
    expect(result.current.has(previewKey(second[0]!.id, second[0]!.spec))).toBe(true);
    expect(made.filter((b) => b.close.mock.calls.length > 0).length).toBeGreaterThanOrEqual(1);
  });

  it('drops previews that arrive after their option is gone, and survives render errors', async () => {
    let release: (b: ImageBitmap) => void = () => {};
    const late = bitmap();
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const svc = {
      renderPreview: vi
        .fn()
        .mockImplementationOnce(() => new Promise<ImageBitmap>((r) => (release = r)))
        .mockImplementationOnce(async () => {
          throw new Error('boom');
        }),
      renderPrint: vi.fn(),
    } as unknown as RenderService;
    const { result, rerender } = renderHook(({ options }) => usePreviews(options, svc), {
      initialProps: { options: makeOptions(2) },
    });
    rerender({ options: [] });
    release(late);
    await waitFor(() => expect(late.close).toHaveBeenCalled());
    expect(result.current.size).toBe(0);
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });
});
