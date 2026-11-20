import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 15000,
    env: {
      NODE_ENV: 'test',
    },
    include: ['src/**/*.test.ts'],
    css: false,
    coverage: {
      reporter: ['text', 'json-summary'],
    },
  },
  server: {
    fs: {
      strict: true,
      allow: ['./'],
    },
  },
});
