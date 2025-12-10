import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    deps: {
      external: ['@testcontainers/*'],
    },
    coverage: {
      provider: 'v8',
    },
  },
});
