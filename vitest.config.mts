import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Scoped to the pure logic, where a threshold is a real signal: the timer
      // engine, stats aggregation, data validation, and date maths. Deliberately
      // excludes browser glue — Web Audio, storage wiring, analytics — which is
      // covered by the Playwright suite in a real browser, and where chasing a
      // unit-coverage number would mean asserting against mocks rather than
      // against behaviour.
      include: [
        'src/lib/timer/**/*.ts',
        'src/lib/stats/**/*.ts',
        'src/lib/storage/schemas.ts',
        'src/lib/storage/memory-adapter.ts',
        'src/lib/storage/local-storage-adapter.ts',
        'src/lib/utils/**/*.ts',
      ],
      exclude: ['src/**/*.test.ts', 'src/**/index.ts'],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
    },
  },
});
