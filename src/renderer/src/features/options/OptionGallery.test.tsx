// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MSG } from '@shared/ipc/messages';
import type { RenderService } from '@engine/output/render-service';
import { OptionGallery } from './OptionGallery';
import type { OptionSet } from '../../state/session-reducer';
import { makeOptions } from '../../test/specs';

beforeEach(() => {
  // jsdom has no canvas; previews simply aren't drawn.
  HTMLCanvasElement.prototype.getContext = (() => null) as never;
});

const renderService = (): RenderService & { previews: number } => {
  const svc = {
    previews: 0,
    renderPreview: vi.fn(async () => {
      svc.previews++;
      return { width: 10, height: 15, close() {} } as unknown as ImageBitmap;
    }),
    renderPrint: vi.fn(async () => new ArrayBuffer(0)),
  };
  return svc;
};

const set = (n: number, over: Partial<OptionSet> = {}): OptionSet => ({
  quoteKey: 'k',
  options: makeOptions(n).map((o) => ({ ...o, selected: false })),
  status: 'fresh',
  exhausted: false,
  shortfall: null,
  seenComboKeys: new Set(),
  ...over,
});

const gallery = (props: Partial<Parameters<typeof OptionGallery>[0]> = {}) =>
  render(
    <OptionGallery
      phase="idle"
      optionSet={null}
      alert={null}
      renderService={renderService()}
      onToggle={() => {}}
      {...props}
    />,
  );

describe('OptionGallery', () => {
  it('shows 12 skeleton cards and a status while generating', () => {
    const { container } = gallery({ phase: 'generating' });
    expect(screen.getByRole('status')).toHaveTextContent(MSG.generating);
    expect(container.querySelectorAll('[data-skeleton]')).toHaveLength(12);
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('renders one named checkbox and image per option and requests previews', async () => {
    const svc = renderService();
    gallery({ optionSet: set(12), renderService: svc });
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(12);
    expect(boxes[0]).toHaveAccessibleName(/^Design 1: Family 1 on .+/);
    expect(boxes[0]).toHaveAttribute('data-combo-key', 'font-1|bg-1');
    const name = boxes[0]!.getAttribute('aria-label')!;
    expect(screen.getByRole('img', { name })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(MSG.ready(12));
    await waitFor(() => expect(svc.previews).toBe(12));
  });

  it('explains a glyph shortfall', () => {
    gallery({ optionSet: set(4, { shortfall: 'glyphs' }) });
    expect(screen.getByRole('status')).toHaveTextContent(MSG.shortfallGlyphs(4));
  });

  it('explains a fit shortfall', () => {
    gallery({ optionSet: set(9, { shortfall: 'fit' }) });
    expect(screen.getByRole('status')).toHaveTextContent(MSG.shortfallFit(9));
  });

  it('shows the no-options alert with no cards', () => {
    gallery({ alert: { kind: 'NO_OPTIONS', message: MSG.noOptions } });
    expect(screen.getByRole('alert')).toHaveTextContent(MSG.noOptions);
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('shows the stale status', () => {
    gallery({ optionSet: set(12, { status: 'stale' }) });
    expect(screen.getByRole('status')).toHaveTextContent(MSG.stale);
  });

  it('toggles a card with Space', async () => {
    const onToggle = vi.fn();
    gallery({ optionSet: set(3), onToggle });
    screen.getAllByRole('checkbox')[1]!.focus();
    await userEvent.keyboard(' ');
    expect(onToggle).toHaveBeenCalledWith('opt-2');
  });

  it('reflects selection', () => {
    const s = set(3);
    s.options[0] = { ...s.options[0]!, selected: true };
    gallery({ optionSet: s });
    expect(screen.getAllByRole('checkbox')[0]).toBeChecked();
    expect(screen.getAllByRole('checkbox')[1]).not.toBeChecked();
  });

  it('moves focus between cards with arrow keys, keeping one card in the tab order', async () => {
    gallery({ optionSet: set(4) });
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes.map((b) => b.tabIndex)).toEqual([0, -1, -1, -1]);
    boxes[0]!.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(boxes[1]).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
    expect(boxes[3]).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(boxes[2]).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(boxes[0]).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(boxes[3]).toHaveFocus();
    expect(boxes.map((b) => b.tabIndex)).toEqual([-1, -1, -1, 0]);
  });
});
