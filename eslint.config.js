import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

const ignores = [
  'out/**',
  'dist/**',
  'coverage/**',
  'playwright-report/**',
  'test-results/**',
  '.specify/**',
];

export default tseslint.config(
  { ignores },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}', 'src/engine/**/*.ts', 'tests/render/**/*.ts'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['src/renderer/**/*.tsx'],
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: { ...reactHooks.configs.recommended.rules, ...jsxA11y.flatConfigs.recommended.rules },
  },
  {
    files: ['src/shared/**/*.ts'],
    ignores: ['src/shared/**/*.test.ts'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['electron', 'electron/*', 'node:*', 'react', 'react-dom', 'react/*', '@engine/*'] },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'navigator', 'process', 'Buffer'],
    },
  },
  {
    files: ['src/engine/**/*.ts'],
    ignores: ['src/engine/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['electron', 'electron/*', 'react', 'react-dom', 'react/*', 'node:*'] },
      ],
    },
  },
  {
    files: [
      'tests/**/*.ts',
      '**/*.test.{ts,tsx}',
      'src/renderer/src/test/**',
      'src/main/ipc/test-helpers.ts',
      'src/main/platform/memory-fs.ts',
    ],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-empty-pattern': 'off',
    },
  },
  {
    // Engine code indexes arrays inside loops bounded by their length; with noUncheckedIndexedAccess
    // every such access is optional, so `!` is the clear way to say "in bounds".
    files: ['src/engine/**/*.ts'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
  {
    rules: {
      // The bridge contract returns Result<void> (contracts/ipc-api.md).
      '@typescript-eslint/no-invalid-void-type': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
);
