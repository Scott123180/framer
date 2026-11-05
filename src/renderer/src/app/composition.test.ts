import { describe, expect, it } from 'vitest';
import { DEFAULT_PRINT_SETTINGS } from '@shared/domain/print';
import { createRendererDeps } from './composition';
import { InMemoryFramerApi } from '../test/in-memory-framer-api';
import { fakePlatform, manifest, serveRealFonts } from '../test/fake-platform';
import { GREEK, SHORT } from '../../../../tests/fixtures/quotes';

describe('createRendererDeps', () => {
  it('loads every font once and wires a working generator', async () => {
    const api = new InMemoryFramerApi();
    serveRealFonts(api);
    const platform = fakePlatform();
    const deps = await createRendererDeps(api, platform);

    expect(api.callsTo('loadFontFiles')).toEqual([[manifest.map((f) => f.id)]]);
    expect(platform.registered).toBe(manifest.length);
    expect(deps.api).toBe(api);

    const res = deps.generate({
      quote: SHORT.text,
      author: SHORT.author,
      print: DEFAULT_PRINT_SETTINGS,
      exclude: new Set(),
      seed: 1,
    });
    expect(res).toMatchObject({ ok: true, shortfall: null });
    if (res.ok) expect(res.options).toHaveLength(12);

    const greek = deps.generate({
      quote: GREEK.text,
      author: null,
      print: DEFAULT_PRINT_SETTINGS,
      exclude: new Set(),
      seed: 1,
    });
    expect(greek).toMatchObject({ ok: true, shortfall: 'glyphs' });
    if (greek.ok) expect(greek.options.length).toBeLessThan(12);
  });

  it('fails when the fonts cannot be loaded', async () => {
    const api = new InMemoryFramerApi();
    api.failNext('loadFontFiles', { code: 'STORAGE_FAILED', message: 'nope' });
    await expect(createRendererDeps(api, fakePlatform())).rejects.toThrow('nope');
  });
});
