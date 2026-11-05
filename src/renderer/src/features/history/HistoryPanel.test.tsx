// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistoryPanel } from './HistoryPanel';
import { FramerApiProvider } from '../../app/framer-api-context';
import { InMemoryFramerApi } from '../../test/in-memory-framer-api';
import { seedQuotes } from './fixtures';

function stubMatchMedia(wide: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: wide,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as never;
}

afterEach(() => {
  delete (window as { matchMedia?: unknown }).matchMedia;
});

async function setup(wide: boolean) {
  stubMatchMedia(wide);
  const api = new InMemoryFramerApi();
  await seedQuotes(api, ['First', 'Second']);
  const onSelectQuote = vi.fn();
  render(
    <FramerApiProvider api={api}>
      <HistoryPanel
        quotes={await unwrap(api.listQuotes())}
        designs={[]}
        onSelectQuote={onSelectQuote}
        onChanged={() => {}}
      />
    </FramerApiProvider>,
  );
  return { api, onSelectQuote };
}

async function unwrap<T>(p: Promise<{ ok: true; value: T } | { ok: false }>): Promise<T> {
  const r = await p;
  if (!r.ok) throw new Error('failed');
  return r.value;
}

describe('HistoryPanel', () => {
  it('has a History tablist with Previous quotes selected', async () => {
    await setup(true);
    expect(screen.getByRole('tablist', { name: 'History' })).toBeInTheDocument();
    const quotesTab = screen.getByRole('tab', { name: 'Previous quotes' });
    const designsTab = screen.getByRole('tab', { name: 'Saved designs' });
    expect(quotesTab).toHaveAttribute('aria-selected', 'true');
    expect(designsTab).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tabpanel', { name: 'Previous quotes' })).toBeVisible();
    expect(quotesTab).toHaveAttribute('aria-controls', screen.getByRole('tabpanel').id);
    expect(screen.getAllByRole('button', { name: /^(First|Second)$/ }).map((b) => b.textContent)).toEqual([
      'Second',
      'First',
    ]);
  });

  it('moves between tabs with the arrow keys', async () => {
    await setup(true);
    screen.getByRole('tab', { name: 'Previous quotes' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    const designsTab = screen.getByRole('tab', { name: 'Saved designs' });
    expect(designsTab).toHaveFocus();
    expect(designsTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Saved designs' })).toBeInTheDocument();
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Previous quotes' })).toHaveAttribute('aria-selected', 'true');
  });

  it('has no toggle on wide windows', async () => {
    await setup(true);
    expect(screen.queryByRole('button', { name: 'History' })).toBeNull();
  });

  it('becomes a drawer on narrow windows', async () => {
    await setup(false);
    const toggle = screen.getByRole('button', { name: 'History' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('tablist')).toBeNull();
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('tablist', { name: 'History' })).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('tablist')).toBeNull());
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
  });

  it('selects a previous quote', async () => {
    const { onSelectQuote } = await setup(true);
    await userEvent.click(screen.getByRole('button', { name: 'First' }));
    expect(onSelectQuote).toHaveBeenCalledWith(expect.objectContaining({ text: 'First' }));
  });
});

describe('HistoryPanel drawer actions', () => {
  it('closes with its Close button and after choosing a quote', async () => {
    const { onSelectQuote } = await setup(false);
    const toggle = screen.getByRole('button', { name: 'History' });
    await userEvent.click(toggle);
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    await userEvent.click(toggle);
    await userEvent.click(screen.getByRole('button', { name: 'First' }));
    expect(onSelectQuote).toHaveBeenCalled();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('deletes a quote after confirming and reports the change', async () => {
    stubMatchMedia(true);
    const api = new InMemoryFramerApi();
    await seedQuotes(api, ['Only']);
    const onChanged = vi.fn();
    render(
      <FramerApiProvider api={api}>
        <HistoryPanel quotes={api.quotes} designs={[]} onSelectQuote={() => {}} onChanged={onChanged} />
      </FramerApiProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Delete quote: Only' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(api.callsTo('deleteQuote')).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: 'Delete quote: Only' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(api.callsTo('deleteQuote')).toHaveLength(1);
  });
});

describe('HistoryPanel tabs by pointer', () => {
  it('switches tabs on click', async () => {
    await setup(true);
    await userEvent.click(screen.getByRole('tab', { name: 'Saved designs' }));
    expect(screen.getByRole('tab', { name: 'Saved designs' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Designs you save will appear here.')).toBeInTheDocument();
  });
});
