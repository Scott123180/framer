// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MSG } from '@shared/ipc/messages';
import { PreviousQuotes } from './PreviousQuotes';
import { excerpt } from './excerpt';

const q = (n: number, text: string) => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  text,
  author: null,
  dedupeKey: text,
  createdAt: '2026-11-04T12:00:00.000Z',
  lastUsedAt: `2026-11-04T12:00:0${n}.000Z`,
});

describe('PreviousQuotes', () => {
  it('lists quotes as buttons named by their first 60 characters', async () => {
    const long = 'L'.repeat(80);
    const onSelect = vi.fn();
    render(<PreviousQuotes quotes={[q(2, 'Newest'), q(1, long)]} onSelect={onSelect} onDelete={() => {}} />);
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]!).getByRole('button', { name: 'Newest' })).toBeInTheDocument();
    expect(excerpt(long)).toBe(`${'L'.repeat(60)}…`);
    await userEvent.click(screen.getByRole('button', { name: excerpt(long) }));
    expect(onSelect).toHaveBeenCalledWith(q(1, long));
  });

  it('shows the empty state', () => {
    render(<PreviousQuotes quotes={[]} onSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getByText(MSG.emptyQuotes)).toBeInTheDocument();
  });

  it('confirms before deleting a quote', async () => {
    const onDelete = vi.fn();
    render(<PreviousQuotes quotes={[q(1, 'Bye')]} onSelect={() => {}} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete quote: Bye' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete this quote?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith(q(1, 'Bye'));
  });
});
