import { useEffect, useState } from 'react';
import type { RendererDeps } from './composition';

export type DepsState =
  { status: 'loading' } | { status: 'ready'; deps: RendererDeps } | { status: 'failed'; message: string };

/** Starts loading renderer dependencies once and reports progress. */
export function useRendererDeps(load: () => Promise<RendererDeps>): DepsState {
  const [state, setState] = useState<DepsState>({ status: 'loading' });
  useEffect(() => {
    let live = true;
    load().then(
      (deps) => live && setState({ status: 'ready', deps }),
      (e: unknown) => {
        console.error('[startup] could not load fonts', e);
        if (live)
          setState({ status: 'failed', message: "Framer couldn't load its fonts. Please restart the app." });
      },
    );
    return () => {
      live = false;
    };
  }, [load]);
  return state;
}
