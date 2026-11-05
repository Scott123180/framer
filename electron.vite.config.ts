import { resolve } from 'node:path';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

const alias = {
  '@shared': resolve(import.meta.dirname, 'src/shared'),
  '@engine': resolve(import.meta.dirname, 'src/engine'),
};

export default defineConfig({
  main: {
    resolve: { alias },
    build: { lib: { entry: resolve(import.meta.dirname, 'src/main/index.ts') } },
  },
  preload: {
    resolve: { alias },
    build: {
      lib: { entry: resolve(import.meta.dirname, 'src/preload/index.ts') },
      // Sandboxed preload scripts must be CommonJS.
      rolldownOptions: { output: { format: 'cjs', entryFileNames: '[name].cjs' } },
    },
  },
  renderer: {
    root: resolve(import.meta.dirname, 'src/renderer'),
    resolve: { alias },
    plugins: [react()],
    worker: { format: 'es' },
    build: { rolldownOptions: { input: resolve(import.meta.dirname, 'src/renderer/index.html') } },
  },
});
