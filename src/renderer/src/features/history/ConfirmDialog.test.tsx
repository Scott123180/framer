// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';

function Harness({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Delete quote: Hi
      </button>
      <ConfirmDialog
        open={open}
        title="Delete this quote?"
        onConfirm={() => {
          onConfirm();
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

const open = async () => {
  const onConfirm = vi.fn();
  render(<Harness onConfirm={onConfirm} />);
  const opener = screen.getByRole('button', { name: 'Delete quote: Hi' });
  await userEvent.click(opener);
  return { onConfirm, opener };
};

describe('ConfirmDialog', () => {
  it('is a dialog named by its title with Delete and Cancel', async () => {
    await open();
    const dialog = screen.getByRole('dialog', { name: 'Delete this quote?' });
    expect(dialog).toBeVisible();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('closes without deleting on Cancel or Escape, returning focus to the opener', async () => {
    const { onConfirm, opener } = await open();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(opener).toHaveFocus();
    await userEvent.click(opener);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(opener).toHaveFocus();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('keeps Tab focus inside the dialog', async () => {
    await open();
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    const del = screen.getByRole('button', { name: 'Delete' });
    await userEvent.tab();
    expect(del).toHaveFocus();
    await userEvent.tab();
    expect(cancel).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(del).toHaveFocus();
  });

  it('confirms', async () => {
    const { onConfirm } = await open();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});

describe('ConfirmDialog native cancel', () => {
  it('treats the dialog cancel event (Escape in the browser) as Cancel', async () => {
    const { onConfirm, opener } = await open();
    const dialog = screen.getByRole('dialog');
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(opener).toHaveFocus();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
