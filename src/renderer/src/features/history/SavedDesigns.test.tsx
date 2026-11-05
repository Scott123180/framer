// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MSG } from '@shared/ipc/messages';
import { SavedDesigns } from './SavedDesigns';
import { FramerApiProvider } from '../../app/framer-api-context';
import { InMemoryFramerApi } from '../../test/in-memory-framer-api';
import { seedDesign } from './fixtures';
import type { SavedDesign } from '@shared/domain';

function setup(api: InMemoryFramerApi, designs: SavedDesign[], onChanged = () => {}) {
  render(
    <FramerApiProvider api={api}>
      <SavedDesigns designs={designs} onChanged={onChanged} />
    </FramerApiProvider>,
  );
}

describe('SavedDesigns', () => {
  it('shows a thumbnail, size, frame-ready setting, and date for each design', async () => {
    const api = new InMemoryFramerApi();
    const a = await seedDesign(api, 'Quote A', {
      size: '5x7',
      orientation: 'landscape',
      margin: { enabled: true, size: 'large' },
    });
    const b = await seedDesign(api, 'Quote B');
    setup(api, [b, a]);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    const img = await within(items[1]!).findByRole('img', { name: 'Saved design: Quote A' });
    await waitFor(() =>
      expect(img).toHaveAttribute('src', expect.stringMatching(/^data:image\/jpeg;base64,/)),
    );
    expect(items[1]).toHaveTextContent('5x7 Landscape');
    expect(items[1]).toHaveTextContent('Frame-ready: Large');
    expect(items[0]).toHaveTextContent('4x6 Portrait');
    expect(items[0]).toHaveTextContent('Frame-ready: Off');
    expect(items[1]).toHaveTextContent(new Date(a.savedAt).toLocaleDateString());
  });

  it('saves a design again and offers Show in folder', async () => {
    const api = new InMemoryFramerApi();
    const a = await seedDesign(api, 'Quote A');
    setup(api, [a]);
    await userEvent.click(screen.getByRole('button', { name: 'Save again: Quote A' }));
    expect(api.callsTo('reexportDesign')).toEqual([[a.id]]);
    expect(await screen.findByRole('status')).toHaveTextContent(MSG.saved(1, '/export'));
    await userEvent.click(screen.getByRole('button', { name: 'Show in folder' }));
    expect(api.callsTo('showInFolder')).toHaveLength(1);
  });

  it('shows an alert when saving again fails', async () => {
    const api = new InMemoryFramerApi();
    const a = await seedDesign(api, 'Quote A');
    setup(api, [a]);
    api.failNext('reexportDesign', { code: 'EXPORT_FAILED', reason: 'PERMISSION', message: 'x' });
    await userEvent.click(screen.getByRole('button', { name: 'Save again: Quote A' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/^Couldn't save: /);
  });

  it('confirms before deleting a design', async () => {
    const api = new InMemoryFramerApi();
    const a = await seedDesign(api, 'Quote A');
    let changed = 0;
    setup(api, [a], () => changed++);
    await userEvent.click(screen.getByRole('button', { name: 'Delete design: Quote A' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete this design?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(api.callsTo('deleteDesign')).toEqual([[a.id]]));
    expect(changed).toBe(1);
  });

  it('shows the empty state', () => {
    setup(new InMemoryFramerApi(), []);
    expect(screen.getByText(MSG.emptyDesigns)).toBeInTheDocument();
  });
});

describe('SavedDesigns cancel', () => {
  it('keeps the design when deletion is cancelled', async () => {
    const api = new InMemoryFramerApi();
    const a = await seedDesign(api, 'Quote A');
    setup(api, [a]);
    await userEvent.click(screen.getByRole('button', { name: 'Delete design: Quote A' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(api.callsTo('deleteDesign')).toEqual([]);
  });
});
