import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', '../../tests/unit/nutrition-engine/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
    },
  },
  resolve: {
    // Allow importing src/ directly without building to dist/ first.
    alias: {
      '@thali/nutrition-engine': new URL('./src/index.ts', import.meta.url).pathname,
    },
  },
});
