import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: import.meta.dirname,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    globalSetup: ['./helpers/setup.ts'],
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './test-results/integration.xml',
    },
    include: ['**/*.test.ts'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
