import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@thali/nutrition-engine': resolve(__dirname, '../../packages/nutrition-engine/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/**/*.test.ts',
      '../../tests/integration/**/*.test.ts',
      '../../tests/unit/ai-gateway/**/*.test.ts',
      '../../tests/unit/web/**/*.test.ts',
    ],
  },
});
