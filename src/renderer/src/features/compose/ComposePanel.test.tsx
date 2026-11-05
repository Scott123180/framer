// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MSG } from '@shared/ipc/messages';
import { ComposePanel, type ComposePanelProps } from './ComposePanel';

function Harness(props: Partial<ComposePanelProps>) {
  const [text, setText] = useState('');
  const [author, setAuthor] = useState('');
  return (
    <ComposePanel
      text={text}
      author={author}
      onTextChange={setText}
      onAuthorChange={setAuthor}
      onGenerate={() => {}}
      generateLabel="Generate designs"
      alert={null}
      {...props}
    />
  );
}

describe('ComposePanel', () => {
  it('has a multiline Quote box and an Author box', () => {
    render(<Harness />);
    const quote = screen.getByRole('textbox', { name: 'Quote' });
    expect(quote.tagName).toBe('TEXTAREA');
    expect(screen.getByRole('textbox', { name: 'Author (optional)' })).toBeInTheDocument();
  });

  it('shows a live grapheme counter', async () => {
    render(<Harness />);
    expect(screen.getByText('0 / 500')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: 'Quote' }), 'Hi 👍🏽');
    expect(screen.getByText('4 / 500')).toBeInTheDocument();
  });

  it('calls onGenerate from the button and from Ctrl/Cmd+Enter', async () => {
    const onGenerate = vi.fn();
    render(<Harness onGenerate={onGenerate} />);
    await userEvent.click(screen.getByRole('button', { name: 'Generate designs' }));
    const quote = screen.getByRole('textbox', { name: 'Quote' });
    await userEvent.type(quote, 'x{Control>}{Enter}{/Control}');
    await userEvent.type(quote, '{Meta>}{Enter}{/Meta}');
    expect(onGenerate).toHaveBeenCalledTimes(3);
    await userEvent.type(quote, '{Enter}');
    expect(onGenerate).toHaveBeenCalledTimes(3);
  });

  it.each([
    ['QUOTE_EMPTY', MSG.quoteEmpty],
    ['QUOTE_TOO_LONG', MSG.quoteTooLong],
    ['AUTHOR_TOO_LONG', MSG.authorTooLong],
  ] as const)('shows the %s alert', (kind, message) => {
    render(<Harness alert={{ kind, message }} />);
    expect(screen.getByRole('alert')).toHaveTextContent(message);
  });

  it('does not show alerts that belong to other regions', () => {
    render(<Harness alert={{ kind: 'NO_OPTIONS', message: MSG.noOptions }} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('uses the given generate label', () => {
    render(<Harness generateLabel="Regenerate designs" />);
    expect(screen.getByRole('button', { name: 'Regenerate designs' })).toBeInTheDocument();
  });
});
