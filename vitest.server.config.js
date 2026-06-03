import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/tests/**/*.test.js'],
    // Run test files sequentially to avoid DB conflicts
    fileParallelism: false,
    coverage: {
      include: ['server/**/*.js'],
      exclude: ['server/tests/**/*.test.js'],
    },
  },
});
