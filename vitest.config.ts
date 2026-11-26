import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['server/__tests__/**/*.test.ts'],
    // With a DATABASE_URL the describeIfDb suites run against ONE shared
    // database, and the outreach engine operates DB-wide (a dispatch enrolls
    // any ready prospect it finds), so files running in parallel workers
    // enroll and email each other's fixtures - nondeterministic failures and
    // orphan rows. Serial execution is the environment those suites assume.
    // Offline runs (CI) keep full parallelism and their speed.
    fileParallelism: !process.env.DATABASE_URL,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
});
