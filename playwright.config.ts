import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: 'https://13056cf3-fac4-45ef-aa80-e3539af34ce4-00-qvmnm6vgt7kn.worf.replit.dev',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
