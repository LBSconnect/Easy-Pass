import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: process.env.TEST_BASE_URL || 'https://www.myeasypass.net',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
