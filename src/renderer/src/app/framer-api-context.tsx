import { createContext, useContext, type ReactNode } from 'react';
import type { FramerApi } from '@shared/ipc/framer-api';

const FramerApiContext = createContext<FramerApi | null>(null);

export function FramerApiProvider({ api, children }: { api: FramerApi; children: ReactNode }) {
  return <FramerApiContext.Provider value={api}>{children}</FramerApiContext.Provider>;
}

export function useFramerApi(): FramerApi {
  const api = useContext(FramerApiContext);
  if (!api) throw new Error('useFramerApi must be used inside <FramerApiProvider>');
  return api;
}
