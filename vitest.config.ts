import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/tests/**/*.test.ts'],
    // Integration tests spin up an in-memory MongoDB; give them room and run serially.
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
