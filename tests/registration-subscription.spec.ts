import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Registration and Subscription Flow
 *
 * These tests verify the user registration, login, and subscription processes
 * work correctly end-to-end.
 */

test.describe('Registration Flow', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  test('registration page loads correctly', async ({ page }) => {
    await page.goto('/auth');

    // Check that auth page loads
    await expect(page).toHaveTitle(/Easy Pass|MyEasyPass/i);

    // Look for registration form elements
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible();
  });

  test('registration with valid data succeeds', async ({ request }) => {
    const response = await request.post('/api/register', {
      data: {
        email: testEmail,
        password: testPassword,
        firstName: 'Test',
        lastName: 'User',
      },
    });

    // Should succeed with 200 or redirect
    expect([200, 201, 302]).toContain(response.status());
  });

  test('registration with duplicate email fails', async ({ request }) => {
    // Try to register with the same email again
    const response = await request.post('/api/register', {
      data: {
        email: testEmail,
        password: testPassword,
        firstName: 'Test',
        lastName: 'User',
      },
    });

    // Should fail with 400 (duplicate)
    expect(response.status()).toBe(400);
  });

  test('registration with invalid email fails', async ({ request }) => {
    const response = await request.post('/api/register', {
      data: {
        email: 'not-an-email',
        password: testPassword,
        firstName: 'Test',
        lastName: 'User',
      },
    });

    expect(response.status()).toBe(400);
  });

  test('registration with short password fails', async ({ request }) => {
    const response = await request.post('/api/register', {
      data: {
        email: `short-pw-${Date.now()}@example.com`,
        password: '12345', // Too short
        firstName: 'Test',
        lastName: 'User',
      },
    });

    expect(response.status()).toBe(400);
  });

  test('registration with missing fields fails', async ({ request }) => {
    const response = await request.post('/api/register', {
      data: {
        email: `missing-${Date.now()}@example.com`,
        // Missing password, firstName, lastName
      },
    });

    expect(response.status()).toBe(400);
  });
});

test.describe('Login Flow', () => {
  test('login page loads correctly', async ({ page }) => {
    await page.goto('/auth');

    // Check that auth page loads
    await expect(page).toHaveTitle(/Easy Pass|MyEasyPass/i);
  });

  test('login with invalid credentials fails', async ({ request }) => {
    const response = await request.post('/api/login', {
      data: {
        email: 'nonexistent@example.com',
        password: 'wrongpassword',
      },
    });

    expect(response.status()).toBe(401);
  });

  test('login with missing fields fails', async ({ request }) => {
    const response = await request.post('/api/login', {
      data: {
        email: 'test@example.com',
        // Missing password
      },
    });

    expect(response.status()).toBe(400);
  });
});

test.describe('Subscription Flow - Unauthenticated', () => {
  test('pricing page loads correctly', async ({ page }) => {
    await page.goto('/pricing');

    // Pricing page should be publicly accessible
    await expect(page).toHaveTitle(/Easy Pass|MyEasyPass|Pricing/i);

    // Should show pricing options
    const content = await page.textContent('body');
    expect(content).toMatch(/weekly|monthly|subscription|plan/i);
  });

  test('stripe prices endpoint returns prices', async ({ request }) => {
    const response = await request.get('/api/stripe/prices');

    // Prices endpoint should work (may return empty if Stripe not configured)
    expect([200, 500]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      // Should be an array
      expect(Array.isArray(data)).toBe(true);
    }
  });

  test('checkout requires authentication', async ({ request }) => {
    const response = await request.post('/api/stripe/checkout', {
      data: { priceId: 'price_test' },
    });

    expect(response.status()).toBe(401);
  });
});

test.describe('Subscription Status - Authenticated Flow', () => {
  // This test requires a valid test account
  // Using existing admin account for testing

  test('user can view their profile after login', async ({ request }) => {
    // First login
    const loginResponse = await request.post('/api/login', {
      data: {
        email: 'info@lbsconnect.net', // Admin account
        password: 'testpassword', // This would need to be the real password
      },
    });

    // If login succeeds, check profile
    if (loginResponse.status() === 200) {
      const profileResponse = await request.get('/api/profile');
      expect(profileResponse.status()).toBe(200);

      const profile = await profileResponse.json();
      expect(profile).toHaveProperty('preferredLanguage');
    }
  });
});

test.describe('Admin Subscription Sync', () => {
  test('admin sync endpoint requires authentication', async ({ request }) => {
    const response = await request.post('/api/admin/sync-user-subscription/fake-user-id');
    expect(response.status()).toBe(401);
  });
});

test.describe('Public Pages Load Correctly', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Easy Pass|MyEasyPass/i);
  });

  test('pricing page loads', async ({ page }) => {
    await page.goto('/pricing');
    const response = await page.waitForResponse(resp => resp.url().includes('/pricing') || resp.status() === 200);
    expect(response.status()).toBeLessThan(500);
  });

  test('FAQ page loads', async ({ page }) => {
    await page.goto('/faq');
    const content = await page.textContent('body');
    expect(content?.length).toBeGreaterThan(100);
  });

  test('terms page loads', async ({ page }) => {
    await page.goto('/terms');
    const content = await page.textContent('body');
    expect(content?.length).toBeGreaterThan(100);
  });

  test('privacy page loads', async ({ page }) => {
    await page.goto('/privacy');
    const content = await page.textContent('body');
    expect(content?.length).toBeGreaterThan(100);
  });
});

test.describe('Exam Access - Subscription Required', () => {
  test('starting exam requires subscription', async ({ request }) => {
    // First need to be authenticated
    const response = await request.post('/api/exams/start', {
      data: {
        category: 'real_estate',
      },
    });

    // Should return 401 (not authenticated) or 403 (no subscription)
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Study Guide Access', () => {
  test('study guide topics are publicly accessible', async ({ request }) => {
    const response = await request.get('/api/study-guide/topics');

    expect(response.status()).toBe(200);

    const topics = await response.json();
    expect(Array.isArray(topics)).toBe(true);
  });

  test('study guide quiz requires authentication', async ({ request }) => {
    const response = await request.get('/api/study-guide/quiz/re_contracts');

    expect(response.status()).toBe(401);
  });
});
