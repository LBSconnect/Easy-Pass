/**
 * The Total Revenue card.
 *
 * This card has already been wrong once, and wrong in the way that is hardest
 * to notice: it read $0.60 against $60.00 of real payments, because the server
 * converted cents to dollars and the card converted again. Nothing threw. The
 * number simply sat there looking like a plausible small number.
 *
 * So the specs here are about the figure being READ correctly, not about the
 * arithmetic - that is unit-tested in money.test.ts. What a browser can check
 * that a unit test cannot is that the amount on screen is the amount the
 * server sent, and that the card says which period it covers, so nobody reads
 * a month's income as an all-time total.
 */

import { test, expect } from '@playwright/test';
import { startStubServer, type StubServer } from './fixtures/stub-server';
import type { Express } from 'express';

/** $60.00 of subscription income in August, as the server would report it. */
const AUGUST_STATS = {
  totalUsers: 42,
  activeSubscriptions: 7,
  monthRevenue: 60,
  revenuePeriodStart: '2026-08-01T05:00:00.000Z',
  passRate: 71,
  onlineNow: 3,
  onlineWindowMinutes: 5,
};

function buildStub(state: { stats: Record<string, unknown> }) {
  return (app: Express) => {
    app.get('/api/auth/user', (_req, res) =>
      res.json({ id: 'a1', email: 'admin@example.com', firstName: 'Ada', claims: { sub: 'a1' } }),
    );
    app.get('/api/profile', (_req, res) =>
      res.json({
        userId: 'a1',
        preferredLanguage: 'en',
        allowedCategories: ['real_estate'],
        subscriptionStatus: 'active',
        preferredCategory: 'real_estate',
        role: 'admin',
      }),
    );
    app.get('/api/admin/stats', (_req, res) => res.json(state.stats));
    app.get(/^\/api\/admin\//, (_req, res) =>
      res.json({ users: [], stats: {}, questions: [], events: [], totals: {} }),
    );
  };
}

test.describe('admin revenue card', () => {
  let stub: StubServer;
  let state: { stats: Record<string, unknown> };

  test.beforeEach(async () => {
    state = { stats: { ...AUGUST_STATS } };
    stub = await startStubServer(buildStub(state));
  });

  test.afterEach(async () => {
    await stub.close();
  });

  test('shows the amount the server sent, not a hundredth of it', async ({ page }) => {
    // The regression in one assertion: $60.00, never $0.60.
    await page.goto(`${stub.baseURL}/admin`, { waitUntil: 'networkidle' });

    await expect(page.getByTestId('stat-month-revenue')).toHaveText('$60.00');
  });

  test('says which month the figure covers', async ({ page }) => {
    // A figure whose period is not stated gets read as the widest one, and
    // this card sits beside Total Users, which really is all-time.
    await page.goto(`${stub.baseURL}/admin`, { waitUntil: 'networkidle' });

    const card = page.getByTestId('card-month-revenue');
    await expect(card).toContainText('August 2026 subscriptions');
    await expect(card).toContainText(/revenue this month/i);
  });

  test('reads zero as $0.00 rather than an empty card', async ({ page }) => {
    state.stats = { ...AUGUST_STATS, monthRevenue: 0 };
    await page.goto(`${stub.baseURL}/admin`, { waitUntil: 'networkidle' });

    await expect(page.getByTestId('stat-month-revenue')).toHaveText('$0.00');
  });

  test('survives a stats body missing the revenue fields', async ({ page }) => {
    // The first deploy after this change answers from a server that has it,
    // but a cached or partial body must not blank the dashboard - an object
    // is truthy even when every field in it is undefined.
    state.stats = { totalUsers: 42, activeSubscriptions: 7, passRate: 71 };
    await page.goto(`${stub.baseURL}/admin`, { waitUntil: 'networkidle' });

    await expect(page.getByTestId('stat-month-revenue')).toHaveText('$0.00');
    // Degrades to the vaguer wording, not to silence.
    await expect(page.getByTestId('card-month-revenue')).toContainText(
      "This month's subscriptions",
    );
    // The neighbours are still there, which is the part a unit test misses.
    await expect(page.getByTestId('stat-online-now')).toBeVisible();
  });
});
