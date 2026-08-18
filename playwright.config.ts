import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

/**
 * Which Chromium to drive.
 *
 * The dev container ships one at a fixed path and forbids downloading more,
 * so it has to be pointed at explicitly there. A CI runner installs its own
 * through `playwright install`, where hard-coding that path would send it
 * looking for a binary that does not exist — so the path is used only when it
 * is actually there, and otherwise Playwright resolves the browser itself.
 */
const preinstalled =
  process.env.PLAYWRIGHT_CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const chromiumExecutable = existsSync(preinstalled) ? preinstalled : undefined;

/**
 * Where the suite points, and why the default changed.
 *
 * This used to default to https://www.myeasypass.net — the live site. Several
 * specs POST to /api/register, so running `npm run test:e2e` with no
 * environment set created real accounts in the production database. That is
 * not a thing a test command should be able to do by accident, so the default
 * is now local and reaching production takes a deliberate opt-in
 * (see tests/helpers/target.ts).
 */
const baseURL = process.env.TEST_BASE_URL || 'http://localhost:5000';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 1,
  // Fail the run rather than silently skip when a spec file matches nothing.
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    launchOptions: {
      ...(chromiumExecutable ? { executablePath: chromiumExecutable } : {}),
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  },
  projects: [
    {
      // End-to-end against a real server and database, with the per-IP caps
      // raised - a limiter is not what these are testing, and the whole suite
      // shares one IP.
      name: 'e2e',
      testDir: './tests',
      testIgnore: ['**/ui/**', '**/rate-limits/**'],
      use: { ...devices['Desktop Chrome'], baseURL },
    },
    {
      // The limiters, against a second server that still has the real ones.
      // Separate because these prove the limits work by exhausting them,
      // which would otherwise 429 every auth spec that ran afterwards.
      name: 'rate-limits',
      testDir: './tests/rate-limits',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.RATE_LIMIT_BASE_URL || 'http://localhost:5001',
      },
    },
    {
      // Interface behaviour under backend states that are awkward to produce
      // for real — a failing endpoint, an empty account, a malformed body.
      // These boot their own stub API, so they do not use the shared baseURL.
      name: 'ui',
      testDir: './tests/ui',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
