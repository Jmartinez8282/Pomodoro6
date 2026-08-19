import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',
      'public/sw.js',
      'public/workbox-*.js',
    ],
  },

  ...nextCoreWebVitals,
  ...nextTypeScript,
  prettier,

  {
    rules: {
      // User-authored task text is rendered everywhere in this app. React escapes
      // by default; the only way to reintroduce XSS is raw HTML injection. Ban it
      // outright rather than relying on review to catch it.
      'react/no-danger': 'error',

      // Unused vars are an error, but allow the `_` prefix convention for
      // intentionally-ignored destructured values and catch bindings.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],

      // Enforce `import type` so type-only imports are erased at build time.
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },

  // ── The architectural boundary ────────────────────────────────────────────
  // src/components/ui/** is the design system: generic, app-agnostic primitives.
  // If a primitive reaches into the store or a feature folder it stops being
  // reusable and the "component library" claim becomes fiction. This rule is
  // what keeps that honest, and it is why the kit can later be extracted into
  // its own package without untangling anything.
  {
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/store/*', '@/store'],
              message:
                'UI primitives must not read application state. Take props and emit callbacks; let feature components do the store wiring.',
            },
            {
              group: [
                '@/components/timer/*',
                '@/components/tasks/*',
                '@/components/stats/*',
                '@/components/settings/*',
                '@/components/layout/*',
                '@/components/analytics/*',
              ],
              message:
                'UI primitives must not depend on feature components. Dependencies flow feature -> ui, never the reverse.',
            },
            {
              group: ['@/hooks/use-timer*', '@/lib/audio/*', '@/lib/analytics/*'],
              message: 'UI primitives must not depend on app-specific hooks or services.',
            },
          ],
        },
      ],
    },
  },

  // The pure timer engine is the correctness core. It must stay free of React
  // and browser globals so it can be tested as plain functions with explicit
  // timestamps — no fake timers, no jsdom.
  {
    files: ['src/lib/timer/engine.ts', 'src/lib/stats/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'next/*', '@/store/*'],
              message: 'Keep this module pure.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'Pure module: take `now` as a parameter instead.' },
        { name: 'document', message: 'Pure module: no DOM access.' },
        { name: 'localStorage', message: 'Pure module: no storage access.' },
      ],
    },
  },

  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}', 'e2e/**/*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      // Playwright names its fixture callback `use`, which the React hooks rule
      // reads as a hook called outside a component. There are no React hooks in
      // these files at all.
      'react-hooks/rules-of-hooks': 'off',
    },
  },
];

export default config;
