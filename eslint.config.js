// Minimal flat config for the standalone Vite SPA.
// Uses typescript-eslint + @eslint/js + eslint-plugin-react-hooks (all present in node_modules).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  {
    // build-minutes.js is the original docx builder ported verbatim (CJS → ESM); keep it out of lint.
    ignores: ['dist', 'node_modules', '**/*.d.ts', 'client/src/components/ui/**', 'client/src/lib/build-minutes.js'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs['recommended-latest'],
  {
    files: ['client/**/*.{ts,tsx}', 'shared/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
