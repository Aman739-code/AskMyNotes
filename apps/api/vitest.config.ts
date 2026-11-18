import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
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
