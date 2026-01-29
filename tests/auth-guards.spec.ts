import { test, expect } from '@playwright/test';

test.describe('Authentication Guards - Unauthenticated Access', () => {
  // All authenticated endpoints should return 401 without a session

  test('GET /api/profile returns 401 unauthenticated', async ({ request }) => {
    const response = await request.get('/api/profile');
    expect(response.status()).toBe(401);
  });

  test('PATCH /api/profile returns 401 unauthenticated', async ({ request }) => {
    const response = await request.patch('/api/profile', {
      data: { preferredLanguage: 'es' },
    });
    expect(response.status()).toBe(401);
  });

  test('POST /api/exams/start returns 401 unauthenticated', async ({ request }) => {
    const response = await request.post('/api/exams/start', {
      data: { category: 'real_estate', mode: 'practice' },
    });
    expect(response.status()).toBe(401);
  });

  test('POST /api/exams/fake-id/submit returns 401 unauthenticated', async ({ request }) => {
    const response = await request.post('/api/exams/fake-id/submit', {
      data: { answers: {} },
    });
    expect(response.status()).toBe(401);
  });

  test('DELETE /api/exams/fake-id/cancel returns 401 unauthenticated', async ({ request }) => {
    const response = await request.delete('/api/exams/fake-id/cancel');
    expect(response.status()).toBe(401);
  });

  test('GET /api/results returns 401 unauthenticated', async ({ request }) => {
    const response = await request.get('/api/results');
    expect(response.status()).toBe(401);
  });

  test('POST /api/results/fake-id/certificate returns 401 unauthenticated', async ({ request }) => {
    const response = await request.post('/api/results/fake-id/certificate');
    expect(response.status()).toBe(401);
  });

  test('GET /api/certificates returns 401 unauthenticated', async ({ request }) => {
    const response = await request.get('/api/certificates');
    expect(response.status()).toBe(401);
  });

  test('POST /api/question-feedback returns 401 unauthenticated', async ({ request }) => {
    const response = await request.post('/api/question-feedback', {
      data: { questionId: 'q1', feedbackType: 'error', message: 'test' },
    });
    expect(response.status()).toBe(401);
  });

  test('GET /api/study-guide/progress returns 401 unauthenticated', async ({ request }) => {
    const response = await request.get('/api/study-guide/progress');
    expect(response.status()).toBe(401);
  });

  test('GET /api/study-guide/quiz/re_contracts returns 401 unauthenticated', async ({ request }) => {
    const response = await request.get('/api/study-guide/quiz/re_contracts');
    expect(response.status()).toBe(401);
  });

  test('POST /api/study-guide/answer returns 401 unauthenticated', async ({ request }) => {
    const response = await request.post('/api/study-guide/answer', {
      data: { questionId: 'q1', selectedAnswer: 0, topicId: 're_contracts' },
    });
    expect(response.status()).toBe(401);
  });

  test('POST /api/stripe/checkout returns 401 unauthenticated', async ({ request }) => {
    const response = await request.post('/api/stripe/checkout', {
      data: { priceId: 'price_fake' },
    });
    expect(response.status()).toBe(401);
  });

  test('POST /api/stripe/portal returns 401 unauthenticated', async ({ request }) => {
    const response = await request.post('/api/stripe/portal');
    expect(response.status()).toBe(401);
  });

  test('POST /api/stripe/cancel-subscription returns 401 unauthenticated', async ({ request }) => {
    const response = await request.post('/api/stripe/cancel-subscription');
    expect(response.status()).toBe(401);
  });

  test('POST /api/stripe/sync-subscription returns 401 unauthenticated', async ({ request }) => {
    const response = await request.post('/api/stripe/sync-subscription');
    expect(response.status()).toBe(401);
  });
});

test.describe('Admin Guards - Unauthenticated Access', () => {
  // Admin endpoints should also return 401 when not authenticated

  test('GET /api/admin/stats returns 401 unauthenticated', async ({ request }) => {
    const response = await request.get('/api/admin/stats');
    expect(response.status()).toBe(401);
  });

  test('GET /api/admin/users returns 401 unauthenticated', async ({ request }) => {
    const response = await request.get('/api/admin/users');
    expect(response.status()).toBe(401);
  });

  test('GET /api/admin/questions returns 401 unauthenticated', async ({ request }) => {
    const response = await request.get('/api/admin/questions');
    expect(response.status()).toBe(401);
  });

  test('POST /api/admin/questions returns 401 unauthenticated', async ({ request }) => {
    const response = await request.post('/api/admin/questions', {
      data: { category: 'real_estate', questionTextEn: 'Test?' },
    });
    expect(response.status()).toBe(401);
  });

  test('PATCH /api/admin/questions/fake-id returns 401 unauthenticated', async ({ request }) => {
    const response = await request.patch('/api/admin/questions/fake-id', {
      data: { questionTextEn: 'Updated?' },
    });
    expect(response.status()).toBe(401);
  });

  test('DELETE /api/admin/questions/fake-id returns 401 unauthenticated', async ({ request }) => {
    const response = await request.delete('/api/admin/questions/fake-id');
    expect(response.status()).toBe(401);
  });

  test('GET /api/admin/question-feedback returns 401 unauthenticated', async ({ request }) => {
    const response = await request.get('/api/admin/question-feedback');
    expect(response.status()).toBe(401);
  });

  test('PATCH /api/admin/question-feedback/fake-id returns 401 unauthenticated', async ({ request }) => {
    const response = await request.patch('/api/admin/question-feedback/fake-id', {
      data: { status: 'reviewed' },
    });
    expect(response.status()).toBe(401);
  });

  test('GET /api/admin/guest-articles returns 401 unauthenticated', async ({ request }) => {
    const response = await request.get('/api/admin/guest-articles');
    expect(response.status()).toBe(401);
  });

  test('PATCH /api/admin/guest-articles/fake-id returns 401 unauthenticated', async ({ request }) => {
    const response = await request.patch('/api/admin/guest-articles/fake-id', {
      data: { status: 'approved' },
    });
    expect(response.status()).toBe(401);
  });

  test('GET /api/admin/callback-requests returns 401 unauthenticated', async ({ request }) => {
    const response = await request.get('/api/admin/callback-requests');
    expect(response.status()).toBe(401);
  });

  test('POST /api/admin/stripe-force-create returns 401 unauthenticated', async ({ request }) => {
    const response = await request.post('/api/admin/stripe-force-create');
    expect(response.status()).toBe(401);
  });

  test('GET /api/admin/stripe-diagnostic returns 401 unauthenticated', async ({ request }) => {
    const response = await request.get('/api/admin/stripe-diagnostic');
    expect(response.status()).toBe(401);
  });

  test('POST /api/admin/init-stripe-prices returns 401 unauthenticated', async ({ request }) => {
    const response = await request.post('/api/admin/init-stripe-prices');
    expect(response.status()).toBe(401);
  });

  test('POST /api/admin/send-password-reset/fake-id returns 401 unauthenticated', async ({ request }) => {
    const response = await request.post('/api/admin/send-password-reset/fake-id');
    expect(response.status()).toBe(401);
  });
});
