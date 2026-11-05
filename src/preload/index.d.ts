import type { FramerApi } from '../shared/ipc/framer-api';

declare global {
  interface Window {
    framer: FramerApi;
  }
}

export {};
