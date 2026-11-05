import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import react from '@vitejs/plugin-react';

const alias = {
  '@shared': resolve(import.meta.dirname, 'src/shared'),
  '@engine': resolve(import.meta.dirname, 'src/engine'),
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: 'unit',
          include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
          environment: 'node',
          setupFiles: ['src/renderer/src/test/setup.ts'],
        },
      },
      {
        resolve: { alias },
        server: { fs: { allow: [resolve(import.meta.dirname)] } },
        test: {
          name: 'render',
          include: ['tests/render/**/*.test.ts'],
          testTimeout: 30_000,
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/shared/**', 'src/engine/**', 'src/renderer/src/**'],
      exclude: [
        '**/*.test.{ts,tsx}',
        'src/renderer/src/test/**',
        // Entry point only: mounts <App> with the real bridge; covered by E2E.
        'src/renderer/src/main.tsx',
        '**/*.d.ts',
        '**/.gitkeep',
      ],
      reporter: ['text', 'html', 'json-summary'],
      thresholds: {
        autoUpdate: true,
        'src/shared/**': { lines: 100 },
        'src/engine/**': { lines: 95.08 },
        'src/renderer/src/**': { lines: 100 },
      },
    },
  },
});
