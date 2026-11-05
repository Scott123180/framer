// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MSG } from '@shared/ipc/messages';
import { App } from './App';
import { FramerApiProvider, useFramerApi } from './framer-api-context';
import { createRendererDeps, type RendererDeps } from './composition';
import { InMemoryFramerApi } from '../test/in-memory-framer-api';
import { fakePlatform, fakeRenderService, serveRealFonts } from '../test/fake-platform';
import { SHORT } from '../../../../tests/fixtures/quotes';

beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = (() => null) as never;
});

async function setup() {
  const api = new InMemoryFramerApi();
  serveRealFonts(api);
  const renderService = fakeRenderService();
  const deps = createRendererDeps(api, fakePlatform(renderService));
  const loadDeps = () => deps;
  render(
    <FramerApiProvider api={api}>
      <App loadDeps={loadDeps} />
    </FramerApiProvider>,
  );
  return { api, renderService };
}

describe('App', () => {
  it('renders the three landmark regions and loads fonts', async () => {
    await setup();
    expect(screen.getByRole('region', { name: 'Quote' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Design options' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'History' })).toBeInTheDocument();
    expect(screen.getByText(MSG.loadingFonts)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Generate designs' })).toBeEnabled());
  });

  it('rejects an empty quote', async () => {
    await setup();
    const generate = screen.getByRole('button', { name: 'Generate designs' });
    await waitFor(() => expect(generate).toBeEnabled());
    await userEvent.click(generate);
    expect(screen.getByRole('alert')).toHaveTextContent(MSG.quoteEmpty);
  });

  it('generates, selects, and saves a design', async () => {
    const { api, renderService } = await setup();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Generate designs' })).toBeEnabled());
    await userEvent.type(screen.getByRole('textbox', { name: 'Quote' }), SHORT.text);
    await userEvent.type(screen.getByRole('textbox', { name: 'Author (optional)' }), SHORT.author);
    await userEvent.click(screen.getByRole('button', { name: 'Generate designs' }));
    expect(await screen.findByText(MSG.ready(12))).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('checkbox')[0]!);
    await userEvent.click(screen.getByRole('button', { name: 'Save selected (1)' }));
    expect(await screen.findByText(/^Saved 1 image\(s\) to \/export\./)).toBeInTheDocument();
    expect(renderService.prints).toBe(1);
    expect(api.callsTo('saveDesign')).toHaveLength(1);
  });

  it('shows a failure when fonts cannot load', async () => {
    const api = new InMemoryFramerApi();
    const loadDeps = () => Promise.reject(new Error('x')) as Promise<RendererDeps>;
    render(
      <FramerApiProvider api={api}>
        <App loadDeps={loadDeps} />
      </FramerApiProvider>,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't load its fonts/);
  });
});

describe('useFramerApi', () => {
  it('returns the injected api', () => {
    const api = new InMemoryFramerApi();
    const { result } = renderHook(() => useFramerApi(), {
      wrapper: ({ children }) => <FramerApiProvider api={api}>{children}</FramerApiProvider>,
    });
    expect(result.current).toBe(api);
  });

  it('throws outside a provider', () => {
    expect(() => renderHook(() => useFramerApi())).toThrow(/FramerApiProvider/);
  });
});

describe('App with history and print settings', () => {
  it('shows the recovery notice from startup', async () => {
    const api = new InMemoryFramerApi();
    serveRealFonts(api);
    api.notices = [{ code: 'LIBRARY_RECOVERED', message: 'x', backupPath: '/ud/library.corrupt-1.json' }];
    const deps = createRendererDeps(api, fakePlatform());
    render(
      <FramerApiProvider api={api}>
        <App loadDeps={() => deps} />
      </FramerApiProvider>,
    );
    expect(await screen.findByText(MSG.libraryRecovered('/ud/library.corrupt-1.json'))).toBeInTheDocument();
  });

  it('records the quote, lists it, and loads it back', async () => {
    const { api } = await setup();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Generate designs' })).toBeEnabled());
    await userEvent.type(screen.getByRole('textbox', { name: 'Quote' }), 'Remember me');
    await userEvent.click(screen.getByRole('button', { name: 'Generate designs' }));
    expect(await screen.findByRole('button', { name: 'Remember me' })).toBeInTheDocument();
    expect(api.callsTo('touchQuote')).toEqual([[{ text: 'Remember me', author: null }]]);

    await userEvent.clear(screen.getByRole('textbox', { name: 'Quote' }));
    await userEvent.click(screen.getByRole('button', { name: 'Remember me' }));
    expect(screen.getByRole('textbox', { name: 'Quote' })).toHaveValue('Remember me');
  });

  it('keeps styles when the print size changes and saves with the quote id', async () => {
    const { api } = await setup();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Generate designs' })).toBeEnabled());
    await userEvent.type(screen.getByRole('textbox', { name: 'Quote' }), SHORT.text);
    await userEvent.click(screen.getByRole('button', { name: 'Generate designs' }));
    await screen.findByText(MSG.ready(12));
    const before = screen.getAllByRole('checkbox').map((c) => c.getAttribute('data-combo-key'));
    await userEvent.click(screen.getByRole('radio', { name: '8x10' }));
    expect(screen.getAllByRole('checkbox').map((c) => c.getAttribute('data-combo-key'))).toEqual(before);
    await userEvent.click(screen.getAllByRole('checkbox')[0]!);
    await userEvent.click(screen.getByRole('button', { name: 'Save selected (1)' }));
    await screen.findByText(/^Saved 1 image/);
    const [[input]] = api.callsTo('saveDesign') as [[{ spec: { print: { size: string } }; quoteId: string }]];
    expect(input.spec.print.size).toBe('8x10');
    expect(input.quoteId).toBe(api.quotes[0]!.id);
  });
});

describe('App history changes', () => {
  it('refreshes history after a quote is deleted', async () => {
    const { api } = await setup();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Generate designs' })).toBeEnabled());
    await userEvent.type(screen.getByRole('textbox', { name: 'Quote' }), 'Gone soon');
    await userEvent.click(screen.getByRole('button', { name: 'Generate designs' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Delete quote: Gone soon' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Gone soon' })).toBeNull());
    expect(api.quotes).toEqual([]);
  });
});
