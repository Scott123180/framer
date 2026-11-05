// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReducer } from 'react';
import { MSG, EXPORT_REASON_TEXT } from '@shared/ipc/messages';
import type { RenderService } from '@engine/output/render-service';
import { SaveBar } from './SaveBar';
import { initialSessionState, sessionReducer, type SessionState } from '../../state/session-reducer';
import type { SessionAction } from '../../state/actions';
import { FramerApiProvider } from '../../app/framer-api-context';
import { InMemoryFramerApi } from '../../test/in-memory-framer-api';
import { makeOptions } from '../../test/specs';

const withOptions = (actions: SessionAction[] = []): SessionState =>
  [
    { type: 'QUOTE_CHANGED', text: 'Hello' } as SessionAction,
    {
      type: 'OPTIONS_READY',
      quoteKey: 'hello\u0000',
      options: makeOptions(4),
      shortfall: null,
      exhausted: false,
    } as SessionAction,
    ...actions,
  ].reduce(sessionReducer, initialSessionState);

function Harness({ start, svc }: { start: SessionState; svc: RenderService }) {
  const [state, dispatch] = useReducer(sessionReducer, start);
  return (
    <>
      <SaveBar state={state} dispatch={dispatch} renderService={svc} />
      <button type="button" onClick={() => dispatch({ type: 'QUOTE_CHANGED', text: 'changed' })}>
        edit
      </button>
    </>
  );
}

const svc = () => {
  const order: string[] = [];
  return {
    order,
    renderPreview: vi.fn(),
    renderPrint: vi.fn(async (spec) => {
      order.push(spec.style.fontId);
      return new Uint8Array([0xff, 0xd8, 0xff, 0xd9]).buffer;
    }),
  } as unknown as RenderService & { order: string[] };
};

const setup = (start: SessionState) => {
  const api = new InMemoryFramerApi();
  const service = svc();
  render(
    <FramerApiProvider api={api}>
      <Harness start={start} svc={service} />
    </FramerApiProvider>,
  );
  return { api, service };
};

const toggled = (...ids: string[]) =>
  withOptions(ids.map((id) => ({ type: 'OPTION_TOGGLED', id }) as SessionAction));

describe('SaveBar', () => {
  it('is disabled with nothing selected', () => {
    setup(withOptions());
    expect(screen.getByRole('button', { name: 'Save selected (0)' })).toBeDisabled();
  });

  it('is disabled when the options are stale', async () => {
    setup(toggled('opt-1'));
    expect(screen.getByRole('button', { name: 'Save selected (1)' })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'edit' }));
    expect(screen.getByRole('button', { name: 'Save selected (1)' })).toBeDisabled();
  });

  it('renders and saves each selected option in order, then offers Show in folder', async () => {
    const { api, service } = setup(toggled('opt-3', 'opt-1'));
    await userEvent.click(screen.getByRole('button', { name: 'Save selected (2)' }));
    expect(service.order).toEqual(['font-1', 'font-3']);
    const saves = api.callsTo('saveDesign') as Array<
      [{ spec: { style: { fontId: string } }; quoteId: null }]
    >;
    expect(saves.map(([i]) => i.spec.style.fontId)).toEqual(['font-1', 'font-3']);
    expect(saves[0]![0].quoteId).toBeNull();

    expect(await screen.findByRole('status')).toHaveTextContent(MSG.saved(2, '/export'));
    expect(screen.getByRole('button', { name: 'Save selected (0)' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Show in folder' }));
    const lastPath = api.designs.at(-1)!.fileName;
    expect(api.callsTo('showInFolder')).toEqual([[`/export/${lastPath}`]]);
  });

  it('shows a plain-language alert and stops on an export failure', async () => {
    const { api } = setup(toggled('opt-1', 'opt-2'));
    api.failNext('saveDesign', { code: 'EXPORT_FAILED', message: 'x', reason: 'NO_SPACE' });
    await userEvent.click(screen.getByRole('button', { name: 'Save selected (2)' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(MSG.saveFailed(EXPORT_REASON_TEXT.NO_SPACE));
    expect(screen.getByRole('alert').textContent).toMatch(/^Couldn't save: .*Nothing was saved\./);
    expect(api.callsTo('saveDesign')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Save selected (2)' })).toBeEnabled();
  });
});

describe('SaveBar render failures', () => {
  it('shows the save-failed alert when rendering the print fails', async () => {
    const api = new InMemoryFramerApi();
    const broken = {
      renderPreview: vi.fn(),
      renderPrint: vi.fn(async () => {
        throw new Error('GPU lost');
      }),
    } as unknown as RenderService;
    render(
      <FramerApiProvider api={api}>
        <Harness start={toggled('opt-1')} svc={broken} />
      </FramerApiProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save selected (1)' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(MSG.saveFailed(EXPORT_REASON_TEXT.UNKNOWN));
    expect(api.callsTo('saveDesign')).toHaveLength(0);
  });

  it('uses the generic reason for non-export failures', async () => {
    const { api } = setup(toggled('opt-1'));
    api.failNext('saveDesign', { code: 'STORAGE_FAILED', message: 'x' });
    await userEvent.click(screen.getByRole('button', { name: 'Save selected (1)' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(MSG.saveFailed(EXPORT_REASON_TEXT.UNKNOWN));
  });
});
