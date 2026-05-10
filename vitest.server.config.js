import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/tests/**/*.test.js'],
    coverage: {
      include: ['server/**/*.js'],
      exclude: ['server/tests/**/*.test.js']
    }
  }
});
