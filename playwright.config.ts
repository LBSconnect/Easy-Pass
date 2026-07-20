import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// Use the pre-installed Chromium binary in the remote execution environment
const chromiumExecutable = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: process.env.TEST_BASE_URL || 'https://www.myeasypass.net',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: {
      executablePath: chromiumExecutable,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  },
});
