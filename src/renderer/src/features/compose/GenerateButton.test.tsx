// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GenerateButton } from './GenerateButton';
import { initialSessionState, selectGenerateLabel, sessionReducer } from '../../state/session-reducer';
import { makeOptions } from '../../test/specs';

describe('GenerateButton', () => {
  it('reads Generate designs before any options exist', () => {
    render(<GenerateButton label={selectGenerateLabel(initialSessionState)} onClick={() => {}} />);
    expect(screen.getByRole('button', { name: 'Generate designs' })).toBeInTheDocument();
  });

  it('reads Regenerate designs once options exist, and runs the action', async () => {
    const state = sessionReducer(initialSessionState, {
      type: 'OPTIONS_READY',
      quoteKey: 'k',
      options: makeOptions(2),
      shortfall: null,
      exhausted: false,
    });
    const onClick = vi.fn();
    render(<GenerateButton label={selectGenerateLabel(state)} onClick={onClick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Regenerate designs' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
