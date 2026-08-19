/**
 * The question bank audit panel.
 *
 * The case that matters most here is the third one. The audit shares a tab
 * with the generation console, and a component that throws while rendering
 * takes its whole subtree with it - so a malformed audit response did not
 * just break the audit, it blanked the generation console next to it. That is
 * a much worse failure than the one it came from, and it is invisible unless
 * a test asserts the neighbour still works.
 */

import { test, expect } from '@playwright/test';
import { startStubServer, type StubServer } from './fixtures/stub-server';
import type { Express } from 'express';

type AuditMode = 'findings' | 'clean' | 'partial' | 'error';

const FULL_REPORT = {
  total: 240,
  criticalCount: 2,
  warningCount: 31,
  cleanCount: 207,
  findings: [
    {
      questionId: 'q-1',
      code: 'answer_out_of_range',
      severity: 'critical',
      detail: 'Correct answer index 9 with 4 options',
    },
    {
      questionId: 'q-2',
      code: 'missing_explanation_es',
      severity: 'warning',
      detail: 'Spanish explanation is 0 chars',
    },
  ],
  findingsTruncated: false,
  byCode: [
    { code: 'missing_explanation_es', severity: 'warning', questions: 31 },
    { code: 'answer_out_of_range', severity: 'critical', questions: 2 },
  ],
  thinTopics: [{ category: 'life_insurance', topic: 'li_annuities', questions: 6 }],
};

function buildStub(state: { mode: AuditMode; lastQuery: string | null }) {
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
        targetedPracticeAvailable: true,
        flags: {
          enabled: true,
          tutorEnabled: true,
          quizGenerationEnabled: true,
          flashcardsEnabled: true,
          mockExamEnabled: false,
          retakerEnabled: true,
          spanishEnabled: true,
        },
      }),
    );

    app.get('/api/admin/content-audit', (req, res) => {
      state.lastQuery = String(req.query.category ?? '');
      if (state.mode === 'error') return res.status(500).json({ message: 'Failed to audit content' });
      // A 200 whose body is missing every field the panel reads. An object is
      // truthy even when it is empty, so this is the shape that used to throw.
      if (state.mode === 'partial') return res.json({ ok: true });
      if (state.mode === 'clean') {
        return res.json({
          total: 240,
          criticalCount: 0,
          warningCount: 0,
          cleanCount: 240,
          findings: [],
          findingsTruncated: false,
          byCode: [],
          thinTopics: [],
        });
      }
      res.json(FULL_REPORT);
    });

    app.get('/api/admin/generated-questions', (_req, res) => res.json([]));
    app.get(/^\/api\/admin\//, (_req, res) =>
      res.json({ users: [], stats: {}, questions: [], events: [], totals: {} }),
    );
  };
}

async function openReviewQueue(page: import('@playwright/test').Page, baseURL: string) {
  await page.goto(`${baseURL}/admin`, { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: /review queue/i }).click();
}

test.describe('question bank audit', () => {
  let stub: StubServer;
  let state: { mode: AuditMode; lastQuery: string | null };

  test.beforeEach(async () => {
    state = { mode: 'findings', lastQuery: null };
    stub = await startStubServer(buildStub(state));
  });

  test.afterEach(async () => {
    await stub.close();
  });

  test('reports the counts the server sent', async ({ page }) => {
    await openReviewQueue(page, stub.baseURL);

    await expect(page.getByTestId('stat-audit-total')).toHaveText('240');
    await expect(page.getByTestId('stat-audit-critical')).toHaveText('2');
    await expect(page.getByTestId('stat-audit-warning')).toHaveText('31');
    await expect(page.getByTestId('stat-audit-clean')).toHaveText('207');
  });

  test('says what was found in words, not codes', async ({ page }) => {
    // A finding an operator cannot act on without reading the source is not
    // a finding.
    await openReviewQueue(page, stub.baseURL);

    const codes = page.getByTestId('list-audit-codes');
    await expect(codes).toContainText('No Spanish explanation');
    await expect(codes).toContainText('Answer index points past the options');
    await expect(codes).not.toContainText('missing_explanation_es');
  });

  test('separates a blocking problem from a weakness', async ({ page }) => {
    await openReviewQueue(page, stub.baseURL);

    const codes = page.getByTestId('list-audit-codes');
    await expect(codes).toContainText('Blocking');
    await expect(codes).toContainText('Weakness');
  });

  test('names topics too thin to fill a paper', async ({ page }) => {
    await openReviewQueue(page, stub.baseURL);
    await expect(page.getByTestId('list-thin-topics')).toContainText('li_annuities');
  });

  test('a malformed response does not take the console down with it', async ({ page }) => {
    // The regression this file exists for. The audit and the generation
    // console share a tab, so a component that throws while rendering blanks
    // its neighbour too.
    state.mode = 'partial';
    await openReviewQueue(page, stub.baseURL);

    // The audit itself degrades to an empty report rather than a blank page.
    await expect(page.getByTestId('card-content-audit')).toBeVisible();
    await expect(page.getByTestId('stat-audit-total')).toHaveText('0');

    // And the console beside it is still usable.
    await expect(page.getByTestId('flag-quizGenerationEnabled')).toBeVisible();
    await expect(page.getByTestId('button-generate')).toBeEnabled();
  });

  test('a failing audit says so rather than showing a clean bank', async ({ page }) => {
    // Reporting zero problems because the check did not run is the one
    // outcome worse than reporting problems.
    state.mode = 'error';
    await openReviewQueue(page, stub.baseURL);

    await expect(page.getByTestId('text-audit-error')).toBeVisible();
    await expect(page.getByTestId('stat-audit-total')).toBeHidden();
  });

  test('a genuinely clean selection says nothing to report', async ({ page }) => {
    state.mode = 'clean';
    await openReviewQueue(page, stub.baseURL);

    await expect(page.getByTestId('text-audit-clean')).toBeVisible();
    await expect(page.getByTestId('stat-audit-clean')).toHaveText('240');
  });

  test('filtering asks the server for that exam', async ({ page }) => {
    await openReviewQueue(page, stub.baseURL);
    await expect(page.getByTestId('stat-audit-total')).toBeVisible();

    await page.getByTestId('button-audit-life_insurance').click();
    await expect.poll(() => state.lastQuery).toBe('life_insurance');
  });
});
