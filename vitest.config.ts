import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Unit-test config for the pure helpers in `src/lib/**`. We run jsdom so
// browser-leaning code (e.g. anything that touches `document`) doesn't blow
// up, even though our current tests only need plain JS semantics. The `@`
// alias mirrors `tsconfig.json` so test imports look identical to source.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts'],
    // E2E specs live under `./e2e` and are run by Playwright, not Vitest.
    exclude: ['node_modules', '.next', 'e2e/**'],
  },
});
