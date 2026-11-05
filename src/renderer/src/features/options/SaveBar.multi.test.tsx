// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReducer } from 'react';
import { MSG } from '@shared/ipc/messages';
import type { RenderService } from '@engine/output/render-service';
import { SaveBar } from './SaveBar';
import { OptionGallery } from './OptionGallery';
import { initialSessionState, sessionReducer, type SessionState } from '../../state/session-reducer';
import type { SessionAction } from '../../state/actions';
import { FramerApiProvider } from '../../app/framer-api-context';
import { InMemoryFramerApi } from '../../test/in-memory-framer-api';
import { makeOptions } from '../../test/specs';

HTMLCanvasElement.prototype.getContext = (() => null) as never;

const svc = {
  renderPreview: vi.fn(async () => ({ width: 1, height: 1, close() {} }) as unknown as ImageBitmap),
  renderPrint: vi.fn(async () => new ArrayBuffer(4)),
} as unknown as RenderService;

const start = (exhausted = false): SessionState =>
  sessionReducer(initialSessionState, {
    type: 'OPTIONS_READY',
    quoteKey: 'k',
    options: makeOptions(5),
    shortfall: null,
    exhausted,
  });

function Harness({ from }: { from: SessionState }) {
  const [state, dispatch] = useReducer(sessionReducer, from);
  return (
    <>
      <OptionGallery
        phase={state.phase}
        optionSet={state.optionSet}
        alert={state.alert}
        renderService={svc}
        onToggle={(id) => dispatch({ type: 'OPTION_TOGGLED', id } as SessionAction)}
      />
      <SaveBar state={state} dispatch={dispatch} renderService={svc} />
    </>
  );
}

const setup = (from = start()) => {
  const api = new InMemoryFramerApi();
  render(
    <FramerApiProvider api={api}>
      <Harness from={from} />
    </FramerApiProvider>,
  );
  return api;
};

describe('SaveBar with several designs', () => {
  it('explains why Save is disabled with nothing selected', () => {
    setup();
    const save = screen.getByRole('button', { name: 'Save selected (0)' });
    expect(save).toBeDisabled();
    expect(save).toHaveAccessibleDescription(MSG.selectToSave);
  });

  it('saves one file per selected design', async () => {
    const api = setup();
    const boxes = screen.getAllByRole('checkbox');
    for (const i of [0, 2, 4]) await userEvent.click(boxes[i]!);
    expect(screen.queryByText(MSG.selectToSave)).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Save selected (3)' }));
    expect(
      await screen.findByText(new RegExp(MSG.saved(3, '/export').replace(/[().]/g, '\\$&'))),
    ).toBeInTheDocument();
    expect(api.callsTo('saveDesign')).toHaveLength(3);
  });

  it('says when combinations have run out', () => {
    setup(start(true));
    expect(screen.getAllByRole('status')[0]).toHaveTextContent(MSG.exhausted);
  });
});
