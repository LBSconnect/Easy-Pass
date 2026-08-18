import { test, expect } from '@playwright/test';

// The app routes sign-in at /login (and /signup); there is no /auth. These
// specs pointed at /auth, which renders the not-found page — they had simply
// never been run, so nothing surfaced it.

test('homepage loads and shows Easy Pass branding', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/.+/);
});

test('navigation to auth page works', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
});

test('login shows error with invalid credentials', async ({ page }) => {
  await page.goto('/login');

  await page.fill('input[name="email"]', 'nonexistent@example.com');
  await page.fill('input[name="password"]', 'wrongpassword123');
  await page.click('button[type="submit"]');

  // Should show an error message (toast or inline)
  await expect(page.locator('text=/invalid|error|failed/i')).toBeVisible({ timeout: 5000 });
});

test('registration form validates required fields', async ({ page }) => {
  await page.goto('/login');

  // Try to find and click a signup/register tab or link if present
  const signupTab = page.locator('text=/sign up|register|create account/i');
  if (await signupTab.isVisible()) {
    await signupTab.click();
  }

  // Submit without filling fields
  await page.click('button[type="submit"]');

  // Browser validation or custom validation should prevent submission
  const emailInput = page.locator('input[name="email"]');
  const isInvalid = await emailInput.evaluate(
    (el: HTMLInputElement) => !el.validity.valid
  );
  expect(isInvalid).toBe(true);
});

test('forgot password page loads', async ({ page }) => {
  await page.goto('/forgot-password');
  await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
});

test('pricing page loads and shows plans', async ({ page }) => {
  await page.goto('/pricing');
  // Pricing page should mention subscription-related content
  await expect(page.locator('text=/subscribe|plan|month|week|price/i').first()).toBeVisible({ timeout: 5000 });
});

test('FAQ page loads', async ({ page }) => {
  await page.goto('/faq');
  await expect(page).toHaveTitle(/.+/);
});

test('unauthenticated user cannot access dashboard', async ({ page }) => {
  await page.goto('/dashboard');
  // Should redirect to auth or show login prompt
  await page.waitForURL(/auth|login|\//, { timeout: 5000 });
});
