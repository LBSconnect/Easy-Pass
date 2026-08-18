/**
 * The generation console.
 *
 * Covers the two things that made this feature unusable before it existed:
 * there was no way to run generation at all, and when a flag was off there was
 * no way to tell which one. The flag cases matter most — naming the wrong
 * environment variable costs a deploy to discover.
 */

import { test, expect } from '@playwright/test';
import { startStubServer, type StubServer } from './fixtures/stub-server';
import type { Express } from 'express';

type RunMode = 'ok' | 'allDiscarded' | 'serverError' | 'missingCounts';

interface StubState {
  master: boolean;
  generation: boolean;
  mode: RunMode;
  drafts: unknown[];
}

function buildStub(state: StubState) {
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
    app.get('/api/alexi/config', (_req, res) =>
      res.json({
        displayName: 'Alexi',
        aiAvailable: true,
        flags: {
          enabled: state.master,
          tutorEnabled: state.master,
          // The real resolution: every capability is `enabled && its own flag`.
          quizGenerationEnabled: state.master && state.generation,
          flashcardsEnabled: state.master,
          mockExamEnabled: false,
          retakerEnabled: state.master,
          spanishEnabled: state.master,
        },
      }),
    );

    app.post('/api/admin/generate-questions/:category', (req, res) => {
      if (!state.master || !state.generation) {
        return res.status(503).json({ message: 'Question generation is switched off.' });
      }
      if (state.mode === 'serverError') {
        return res.status(502).json({ message: 'The generator returned nothing usable' });
      }
      if (state.mode === 'missingCounts') return res.json({ ok: true });

      const queued = state.mode === 'allDiscarded' ? 0 : Math.min(Number(req.body?.count) || 5, 8);
      for (let i = 0; i < queued; i++) {
        state.drafts.push({
          id: `d${state.drafts.length + 1}`,
          category: req.params.category,
          topic: req.body?.topic || 'BOP Eligibility',
          questionTextEn: 'Which risk is ineligible for a Businessowners Policy?',
          optionsEn: ['A retail store', 'An oil refinery', 'An office', 'Flats'],
          correctAnswer: 1,
          explanationEn: 'A BOP is rated for small and medium commercial risks.',
          sourceQuestionIds: ['q1', 'q2'],
          validationNotes: [],
          validatorConfidenceBasisPoints: 8600,
          createdAt: new Date().toISOString(),
        });
      }
      res.json({
        generated: state.mode === 'allDiscarded' ? 3 : queued,
        queuedForReview: queued,
        discarded: state.mode === 'allDiscarded' ? 3 : 1,
      });
    });

    app.get('/api/admin/generated-questions', (_req, res) => res.json(state.drafts));
    app.get(/^\/api\/admin\//, (_req, res) =>
      res.json({ users: [], stats: {}, questions: [], events: [], totals: {} }),
    );
  };
}

async function openReviewQueue(page: import('@playwright/test').Page, baseURL: string) {
  await page.goto(`${baseURL}/admin`, { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: /review queue/i }).click();
}

test.describe('generation console', () => {
  let stub: StubServer;
  let state: StubState;

  test.beforeEach(async () => {
    state = { master: true, generation: true, mode: 'ok', drafts: [] };
    stub = await startStubServer(buildStub(state));
  });

  test.afterEach(async () => {
    await stub.close();
  });

  test('names the master switch when it is the blocker', async ({ page }) => {
    state.master = false;
    state.generation = true;

    await openReviewQueue(page, stub.baseURL);
    const notice = page.getByTestId('notice-generation-off');
    await expect(notice).toContainText('ALEXI_ENABLED');
    // Sending someone to set the generation flag here would waste a deploy:
    // it is already on, and it changes nothing while the master switch is off.
    await expect(notice).not.toContainText('ALEXI_QUIZ_GENERATION_ENABLED');
    await expect(page.getByTestId('button-generate')).toBeDisabled();
  });

  test('names the generation switch when that is the blocker', async ({ page }) => {
    state.generation = false;

    await openReviewQueue(page, stub.baseURL);
    await expect(page.getByTestId('notice-generation-off')).toContainText(
      'ALEXI_QUIZ_GENERATION_ENABLED',
    );
  });

  test('reports each flag as the server resolved it', async ({ page }) => {
    await openReviewQueue(page, stub.baseURL);
    await expect(page.getByTestId('flag-quizGenerationEnabled')).toContainText('on');
    await expect(page.getByTestId('flag-mockExamEnabled')).toContainText('off');
  });

  test('generates drafts and refreshes the queue in place', async ({ page }) => {
    await openReviewQueue(page, stub.baseURL);

    await page.getByTestId('generate-category-property_casualty').click();
    await page.getByTestId('input-generate-topic').fill('BOP Eligibility');
    await page.getByTestId('input-generate-count').fill('3');
    await page.getByTestId('button-generate').click();

    await expect(page.getByTestId('text-generate-result')).toContainText('queued 3');
    expect(state.drafts).toHaveLength(3);
    // No reload: the queue below has to pick them up on its own.
    await expect(page.getByTestId('list-generated-drafts')).toBeVisible();
  });

  test('a run where everything is discarded says so', async ({ page }) => {
    state.mode = 'allDiscarded';
    await openReviewQueue(page, stub.baseURL);
    await page.getByTestId('button-generate').click();

    // Information, not a silent no-op.
    await expect(page.getByTestId('text-generate-result')).toContainText('queued 0');
  });

  test('a server error surfaces instead of looking like nothing happened', async ({ page }) => {
    state.mode = 'serverError';
    await openReviewQueue(page, stub.baseURL);
    await page.getByTestId('button-generate').click();

    // The toast renders its title and mirrors it into an aria-live region, so
    // the text genuinely matches twice; take the visible one.
    await expect(page.getByText(/generation failed/i).first()).toBeVisible();
    await expect(page.getByTestId('text-generate-result')).toBeHidden();
  });

  test('a 200 without counts is refused rather than shown as success', async ({ page }) => {
    state.mode = 'missingCounts';
    await openReviewQueue(page, stub.baseURL);
    await page.getByTestId('button-generate').click();

    await expect(page.getByText(/unexpected response/i).first()).toBeVisible();
    await expect(page.getByTestId('text-generate-result')).toBeHidden();
  });
});
