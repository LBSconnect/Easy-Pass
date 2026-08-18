/**
 * The readiness check must not repeat.
 *
 * The reported bug: a student took the readiness check, was shown the
 * subscribe prompt, declined, went back to the dashboard — and was asked to
 * take the readiness check again. Every visit, forever, because the
 * dashboard's only evidence of activity was questions answered inside a paid
 * exam session, which is zero until they subscribe.
 *
 * This walks that exact loop, plus the states either side of it. The stub
 * stores the attempt the way the real route does, so what is being tested is
 * the client reading its own result back — not a canned response.
 */

import { test, expect } from '@playwright/test';
import { startStubServer, signedInUser, type StubServer } from './fixtures/stub-server';
import type { Express } from 'express';

const CATEGORY = 'property_casualty';

interface StubState {
  subscribed: boolean;
  latest: Record<string, unknown> | null;
  /** What the profile route has been told about the exam date. */
  examDateSkipped: boolean;
}

function buildStub(state: StubState) {
  return (app: Express) => {
    // Registered first so it wins over signedInUser's fixed profile: express
    // answers with the first matching route.
    app.get('/api/profile', (_req, res) =>
      res.json({
        userId: 'u1',
        preferredLanguage: 'en',
        allowedCategories: state.subscribed ? [CATEGORY] : [],
        subscriptionStatus: state.subscribed ? 'active' : null,
        preferredCategory: CATEGORY,
        role: 'user',
        examDate: null,
        examDateSkipped: state.examDateSkipped,
        hasPreviousAttempt: false,
      }),
    );
    app.patch('/api/profile', (req, res) => {
      // Persisted, the way the real route persists it.
      if (typeof req.body?.examDateSkipped === 'boolean') {
        state.examDateSkipped = req.body.examDateSkipped;
      }
      res.json({ ok: true });
    });
    signedInUser(app);

    // The endpoint the whole fix rests on.
    app.get('/api/diagnostic/latest', (_req, res) => res.json(state.latest));

    app.post('/api/diagnostic/start', (_req, res) =>
      res.json({
        attemptId: 'att-1',
        questions: [
          {
            id: 'dq1',
            questionTextEn: 'Which risk is ineligible for a Businessowners Policy?',
            questionTextEs: '¿Cuál riesgo no es elegible?',
            optionsEn: ['A store', 'A refinery', 'An office', 'Flats'],
            optionsEs: ['a', 'b', 'c', 'd'],
          },
        ],
      }),
    );

    app.post('/api/diagnostic/:id/submit', (_req, res) => {
      // Persisted, exactly as the real route does.
      state.latest = {
        id: 'att-1',
        category: CATEGORY,
        score: 60,
        correctAnswers: 6,
        totalQuestions: 10,
        completedAt: new Date().toISOString(),
      };
      res.json({ score: 60, correctAnswers: 6, totalQuestions: 10, category: CATEGORY });
    });

    app.get('/api/results', (_req, res) => res.json([]));
    app.get(/^\/api\/readiness/, (_req, res) =>
      res.json({ score: 0, band: 'building', provisional: true, questionsAttempted: 0, components: [] }),
    );
    app.get('/api/stripe/prices', (_req, res) =>
      res.json([
        {
          id: 'price_pc_m',
          unit_amount: 2999,
          currency: 'usd',
          recurring_interval: 'month',
          subscription_type: 'single',
          allowed_categories: [CATEGORY],
          billing_period: 'monthly',
          product_name: 'P&C monthly',
        },
      ]),
    );
  };
}

test.describe('readiness check retention', () => {
  let stub: StubServer;
  let state: StubState;

  test.beforeEach(async () => {
    state = { subscribed: false, latest: null, examDateSkipped: false };
    stub = await startStubServer(buildStub(state));
  });

  test.afterEach(async () => {
    await stub.close();
  });

  for (const lang of ['en', 'es'] as const) {
    test(`survives declining to subscribe (${lang})`, async ({ page }) => {
      const q = lang === 'es' ? '?lang=es' : '';

      // 1. Brand new: the checklist asks for the readiness check, and the
      //    subscribe step is not offered yet.
      await page.goto(`${stub.baseURL}/dashboard${q}`, { waitUntil: 'networkidle' });
      await page.getByTestId('button-onboarding-no-date').click();
      await expect(page.getByTestId('button-onboarding-diagnostic')).toBeVisible();
      await expect(page.getByTestId('card-onboarding-subscribe')).toBeHidden();

      // 2. Take it.
      await page.getByTestId('button-onboarding-diagnostic').click();
      await page.waitForURL(/readiness-check/);
      await page.getByTestId(`button-diagnostic-category-${CATEGORY}`).click();
      await page.locator('[role="radio"]').first().click();
      await page.getByTestId('button-diagnostic-next').click();
      await expect.poll(() => state.latest).not.toBeNull();

      // 3. Decline to subscribe and go back. This is where the loop was.
      await page.goto(`${stub.baseURL}/dashboard${q}`, { waitUntil: 'networkidle' });
      await expect(page.getByTestId('button-onboarding-diagnostic')).toBeHidden();
      await expect(page.getByTestId('text-diagnostic-retained')).toContainText('60');

      // 4. And the step that actually remains is offered.
      await expect(page.getByTestId('card-onboarding-subscribe')).toBeVisible();
      await page.getByTestId('button-onboarding-subscribe').click();
      await page.waitForURL(/pricing/);
      expect(page.url()).toContain(`category=${CATEGORY}`);
    });
  }

  test('the readiness page shows the saved result rather than restarting', async ({ page }) => {
    state.latest = {
      id: 'att-1',
      category: CATEGORY,
      score: 60,
      correctAnswers: 6,
      totalQuestions: 10,
      completedAt: new Date().toISOString(),
    };

    await page.goto(`${stub.baseURL}/readiness-check`, { waitUntil: 'networkidle' });
    await expect(page.getByTestId('card-diagnostic-saved')).toBeVisible();
    await expect(page.getByTestId('text-saved-score')).toContainText('60');

    // Retaking is still possible - retention must not become a trap.
    await page.getByTestId('button-saved-retake').click();
    await expect(page.getByTestId('button-diagnostic-category-real_estate')).toBeVisible();
  });

  test('a subscriber with a result leaves onboarding entirely', async ({ page }) => {
    state.subscribed = true;
    state.latest = {
      id: 'att-1',
      category: CATEGORY,
      score: 60,
      correctAnswers: 6,
      totalQuestions: 10,
      completedAt: new Date().toISOString(),
    };

    await page.goto(`${stub.baseURL}/dashboard`, { waitUntil: 'networkidle' });
    // Nothing left to onboard: keeping them here is the dead end the state
    // machine exists to avoid.
    await expect(page.getByTestId('card-onboarding-exam')).toBeHidden();
    await expect(page.getByTestId('card-onboarding-subscribe')).toBeHidden();
  });

  test('"not scheduled yet" is remembered across visits', async ({ page }) => {
    await page.goto(`${stub.baseURL}/dashboard`, { waitUntil: 'networkidle' });
    await page.getByTestId('button-onboarding-no-date').click();
    await expect.poll(() => state.examDateSkipped).toBe(true);

    // Come back. The question must not be asked again, and the steps below it
    // must not be hidden behind it - which is what stranded a returning
    // student one step short of subscribing.
    await page.goto(`${stub.baseURL}/dashboard`, { waitUntil: 'networkidle' });
    await expect(page.getByTestId('button-onboarding-diagnostic')).toBeVisible();
  });

  test('a guest who has done nothing is still asked', async ({ page }) => {
    await page.goto(`${stub.baseURL}/dashboard`, { waitUntil: 'networkidle' });
    await page.getByTestId('button-onboarding-no-date').click();
    await expect(page.getByTestId('button-onboarding-diagnostic')).toBeVisible();
  });
});
