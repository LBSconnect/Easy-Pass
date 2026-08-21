/**
 * Pricing, under the backend states that are awkward to produce for real.
 *
 * The page is built entirely from what Stripe returns: which billing periods
 * exist, which categories have an active price, whether the call succeeded at
 * all. Every one of those is a branch, and the interesting ones — a failing
 * endpoint, a category with nothing sellable, a malformed body — cannot be
 * arranged against a real Stripe account without breaking it.
 *
 * Also covers the sign-in hand-off, including the open-redirect attempt,
 * because a query parameter decides where the app navigates after
 * authentication.
 */

import { test, expect } from '@playwright/test';
import { startStubServer, signedInUser, type StubServer } from './fixtures/stub-server';
import type { Express } from 'express';

const CATEGORIES = ['real_estate', 'property_casualty', 'life_insurance', 'general_lines'];

type PriceMode = 'both' | 'monthlyOnly' | 'missingOne' | 'error' | 'junk';

interface StubState {
  mode: PriceMode;
  signedIn: boolean;
}

const price = (cat: string, period: 'weekly' | 'monthly', amount: number) => ({
  id: `price_${cat}_${period}`,
  unit_amount: amount,
  currency: 'usd',
  recurring_interval: period === 'weekly' ? 'week' : 'month',
  subscription_type: 'single',
  allowed_categories: [cat],
  billing_period: period,
  product_name: `${cat} ${period}`,
});

function buildStub(state: StubState) {
  return (app: Express) => {
    // Registered BEFORE signedInUser, because express answers with the first
    // matching route - so this has to come first to win.
    //
    // Auth answers 401 while signed out, which is how the client learns there
    // is no session; that is the whole premise of the hand-off tests below.
    app.get('/api/auth/user', (_req, res) =>
      state.signedIn
        ? res.json({ id: 'u1', email: 'student@example.com', firstName: 'Sam', claims: { sub: 'u1' } })
        : res.status(401).json({ message: 'Unauthorized' }),
    );
    signedInUser(app);

    app.get('/api/stripe/prices', (_req, res) => {
      if (state.mode === 'error') return res.status(500).json({ message: 'Simulated failure' });
      if (state.mode === 'junk') return res.json({ not: 'an array' });

      const monthly = CATEGORIES.map((c) => price(c, 'monthly', 2999));
      const weekly = CATEGORIES.map((c) => price(c, 'weekly', 999));
      if (state.mode === 'monthlyOnly') return res.json(monthly);
      if (state.mode === 'missingOne') {
        return res.json(
          [...monthly, ...weekly].filter((p) => !p.allowed_categories.includes('life_insurance')),
        );
      }
      return res.json([...monthly, ...weekly]);
    });

    app.post('/api/stripe/checkout', (req, res) =>
      res.json({ url: `/__checkout?price=${encodeURIComponent(req.body?.priceId ?? '')}` }),
    );
    app.get('/__checkout', (req, res) => res.send(`<h1>checkout for ${req.query.price}</h1>`));

    app.post('/api/login', (_req, res) => {
      state.signedIn = true;
      res.json({ id: 'u1', email: 'student@example.com', firstName: 'Sam', claims: { sub: 'u1' } });
    });
  };
}

test.describe('pricing', () => {
  let stub: StubServer;
  let state: StubState;

  test.beforeEach(async () => {
    state = { mode: 'both', signedIn: false };
    stub = await startStubServer(buildStub(state));
  });

  test.afterEach(async () => {
    await stub.close();
  });

  for (const lang of ['en', 'es'] as const) {
    test(`shows a price for every exam before anything is chosen (${lang})`, async ({ page }) => {
      const q = lang === 'es' ? '?lang=es' : '';
      await page.goto(`${stub.baseURL}/pricing${q}`, { waitUntil: 'networkidle' });

      // The whole point of the rebuild: a pricing page that shows prices.
      for (const c of CATEGORIES) {
        await expect(page.getByTestId(`text-price-${c}`)).toHaveText('$29.99');
      }
      await expect(page.getByTestId('button-subscribe')).toBeDisabled();
      await expect(page.locator('h1')).toHaveCount(1);

      // Spanish is where overflow shows up, so check it in both.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test('the billing toggle follows what Stripe actually sells', async ({ page }) => {
    await page.goto(`${stub.baseURL}/pricing`, { waitUntil: 'networkidle' });
    await expect(page.getByTestId('toggle-billing-period')).toBeVisible();

    await page.getByTestId('button-period-weekly').click();
    await expect(page.getByTestId('text-price-real_estate')).toHaveText('$9.99');
  });

  test('no toggle when only one period exists', async ({ page }) => {
    state.mode = 'monthlyOnly';
    await page.goto(`${stub.baseURL}/pricing`, { waitUntil: 'networkidle' });
    // Offering a choice that cannot be sold is worse than offering none.
    await expect(page.getByTestId('toggle-billing-period')).toBeHidden();
    await expect(page.getByTestId('text-price-real_estate')).toHaveText('$29.99');
  });

  test('a category with no active price cannot be chosen', async ({ page }) => {
    state.mode = 'missingOne';
    await page.goto(`${stub.baseURL}/pricing`, { waitUntil: 'networkidle' });
    await expect(page.getByTestId('button-category-life_insurance')).toBeDisabled();
    await expect(page.getByTestId('text-price-life_insurance')).toBeHidden();
  });

  test('choosing one exam replaces the last, rather than adding to it', async ({ page }) => {
    await page.goto(`${stub.baseURL}/pricing`, { waitUntil: 'networkidle' });
    await page.getByTestId('button-category-real_estate').click();
    await page.getByTestId('button-category-life_insurance').click();

    // One billing period plus one category. A second selected exam would mean
    // the checkboxes were back.
    await expect(page.locator('[role="radio"][aria-checked="true"]')).toHaveCount(2);
    await expect(page.getByTestId('text-total-price')).toContainText('$29.99');
  });

  test('a failing prices endpoint says so and cannot be transacted against', async ({ page }) => {
    state.mode = 'error';
    await page.goto(`${stub.baseURL}/pricing`, { waitUntil: 'networkidle' });
    await expect(page.getByTestId('card-prices-error')).toBeVisible();
    await expect(page.getByTestId('button-subscribe')).toBeDisabled();
  });

  test('a malformed body does not take the page down', async ({ page }) => {
    state.mode = 'junk';
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto(`${stub.baseURL}/pricing`, { waitUntil: 'networkidle' });
    await expect(page.getByTestId('list-categories')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('a signed-out buyer lands on sign-up, and their exam survives', async ({ page }) => {
    // Almost everyone reaching Subscribe without a session is new, so the
    // wall is the sign-up form - with the login switch for everyone else.
    await page.goto(`${stub.baseURL}/pricing`, { waitUntil: 'networkidle' });
    await page.getByTestId('button-category-life_insurance').click();
    await page.getByTestId('button-subscribe').click();

    await page.waitForURL(/\/signup/);
    expect(decodeURIComponent(page.url())).toContain('category=life_insurance');
    await expect(page.getByTestId('input-signup-email')).toBeVisible();
  });

  test('a returning student can still switch to login and resume their exam', async ({ page }) => {
    await page.goto(`${stub.baseURL}/pricing`, { waitUntil: 'networkidle' });
    await page.getByTestId('button-category-life_insurance').click();
    await page.getByTestId('button-subscribe').click();

    await page.waitForURL(/\/signup/);
    // The switch lives on the sign-up card; the next parameter must survive it.
    await page.getByTestId('button-switch-auth-mode').click();

    await page.fill('input[type="email"]', 'student@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.getByRole('button', { name: /sign in/i }).first().click();

    await page.waitForURL(/\/pricing/);
    expect(decodeURIComponent(page.url())).toContain('category=life_insurance');
    await expect(page.getByTestId('text-total-price')).toBeVisible();
  });

  test('signing in cannot be redirected off the site', async ({ page }) => {
    // A query parameter decides where the app navigates after authentication,
    // which is the shape of an open redirect if taken at face value.
    await page.goto(
      `${stub.baseURL}/login?next=${encodeURIComponent('https://evil.example/steal')}`,
      { waitUntil: 'networkidle' },
    );
    await page.fill('input[type="email"]', 'student@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.getByRole('button', { name: /sign in/i }).first().click();

    await page.waitForURL(/\/dashboard/);
    expect(page.url()).toContain(stub.baseURL);
  });
});
