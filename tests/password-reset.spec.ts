import { test, expect } from '@playwright/test';

test.describe('Password Reset - API Tests', () => {
  
  test.describe('Forgot Password Endpoint', () => {
    
    test('accepts valid email and returns success message', async ({ request }) => {
      const response = await request.post('/api/forgot-password', {
        data: { email: 'valid-email@example.com' }
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.message).toContain('If an account exists');
    });

    test('returns same message for non-existent email (prevents enumeration)', async ({ request }) => {
      const response = await request.post('/api/forgot-password', {
        data: { email: 'nonexistent-user-12345@example.com' }
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.message).toContain('If an account exists');
    });

    test('rejects invalid email format', async ({ request }) => {
      const response = await request.post('/api/forgot-password', {
        data: { email: 'not-an-email' }
      });
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.message).toContain('Invalid email');
    });

    test('rejects empty email', async ({ request }) => {
      const response = await request.post('/api/forgot-password', {
        data: { email: '' }
      });
      expect(response.status()).toBe(400);
    });

    test('rejects missing email field', async ({ request }) => {
      const response = await request.post('/api/forgot-password', {
        data: {}
      });
      expect(response.status()).toBe(400);
    });
  });

  test.describe('Reset Password Endpoint', () => {

    test('rejects invalid token', async ({ request }) => {
      const response = await request.post('/api/reset-password', {
        data: { 
          token: 'invalid-token-12345',
          password: 'NewPassword123!'
        }
      });
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.message).toContain('Invalid or expired');
    });

    test('rejects empty token', async ({ request }) => {
      const response = await request.post('/api/reset-password', {
        data: { 
          token: '',
          password: 'NewPassword123!'
        }
      });
      expect(response.status()).toBe(400);
    });

    test('rejects short password (less than 8 chars)', async ({ request }) => {
      const response = await request.post('/api/reset-password', {
        data: { 
          token: 'some-token',
          password: 'short'
        }
      });
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.message).toContain('Invalid data');
    });

    test('rejects missing password', async ({ request }) => {
      const response = await request.post('/api/reset-password', {
        data: { 
          token: 'some-token'
        }
      });
      expect(response.status()).toBe(400);
    });

    test('rejects missing token', async ({ request }) => {
      const response = await request.post('/api/reset-password', {
        data: { 
          password: 'NewPassword123!'
        }
      });
      expect(response.status()).toBe(400);
    });
  });

  test.describe('Verify Reset Token Endpoint', () => {

    test('returns invalid for non-existent token', async ({ request }) => {
      const response = await request.get('/api/reset-password/verify?token=nonexistent-token');
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.valid).toBe(false);
      expect(body.message).toContain('Invalid reset token');
    });

    test('returns error for missing token parameter', async ({ request }) => {
      const response = await request.get('/api/reset-password/verify');
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.valid).toBe(false);
      expect(body.message).toContain('No token provided');
    });

    test('returns error for empty token', async ({ request }) => {
      const response = await request.get('/api/reset-password/verify?token=');
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.valid).toBe(false);
    });
  });

});

test.describe('Password Reset - Browser Tests', () => {

  test('forgot password page loads', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.locator('[data-testid="input-forgot-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="button-send-reset"]')).toBeVisible();
  });

  test('forgot password link visible on login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('[data-testid="link-forgot-password"]')).toBeVisible();
  });

  test('clicking forgot password link navigates to forgot password page', async ({ page }) => {
    await page.goto('/login');
    await page.click('[data-testid="link-forgot-password"]');
    await expect(page).toHaveURL(/forgot-password/);
  });

  test('forgot password form shows success or error after submission', async ({ page }) => {
    await page.goto('/forgot-password');
    const uniqueEmail = `browser-test-${Date.now()}@example.com`;
    await page.fill('[data-testid="input-forgot-email"]', uniqueEmail);
    await page.click('[data-testid="button-send-reset"]');
    
    await page.waitForTimeout(3000);
    
    const successVisible = await page.locator('text=/Check Your Email|Revisa tu Correo/i').isVisible();
    const toastVisible = await page.locator('[role="status"], [data-state="open"]').isVisible();
    const buttonDisabled = await page.locator('[data-testid="button-send-reset"]').isDisabled();
    
    expect(successVisible || toastVisible || buttonDisabled).toBe(true);
  });

  test('forgot password form validates email format', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.fill('[data-testid="input-forgot-email"]', 'invalid-email');
    await page.click('[data-testid="button-send-reset"]');
    
    await page.waitForTimeout(1000);
    const formHasError = await page.locator('form').locator('text=/email|correo/i').count();
    expect(formHasError).toBeGreaterThan(0);
  });

  test('reset password page shows error for invalid token', async ({ page }) => {
    await page.goto('/reset-password?token=invalid-token-12345');
    
    await page.waitForTimeout(2000);
    // The page shows both a heading and a detail line, so this matches twice.
    const errorVisible = await page
      .locator('text=/invalid|expired|inv\u00e1lido|expirado/i')
      .first()
      .isVisible();
    expect(errorVisible).toBe(true);
  });

  test('back to login link works on forgot password page', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.click('[data-testid="link-back-to-login"]');
    await expect(page).toHaveURL(/login/);
  });
});
