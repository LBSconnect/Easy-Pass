/**
 * Signing up, through the form a student actually uses.
 *
 * The existing registration specs POST to /api/register directly. That proves
 * the endpoint works and proves nothing about whether anyone can reach it: the
 * three defects this file was written after were all in front of the endpoint,
 * and all invisible to an API-level test.
 *
 * A student who reused an email address was told
 * `400: {"message":"Email already registered"}` - the raw status and JSON.
 *
 * A Spanish student got a form entirely in English, inside a Spanish page.
 * Spanish is half the product's audience and the sign-up form is the first
 * thing they touch.
 *
 * (The third - a rate limiter that locked a whole network out of registering
 * after five typos - is covered in tests/rate-limits, where the real limits
 * are in force.)
 */

import { test, expect, type Page } from '@playwright/test';
import { requireWritableTarget } from './helpers/target';

// This file creates accounts. Never point it at production by accident.
test.beforeAll(({}, testInfo) => {
  requireWritableTarget(testInfo.project.use.baseURL);
});

const PASSWORD = 'TestPassword123!';

/** Open the sign-up form, optionally after switching the site to Spanish. */
async function openSignup(page: Page, language: 'en' | 'es' = 'en') {
  await page.goto('/signup', { waitUntil: 'networkidle' });

  if (language === 'es') {
    await page.getByTestId('button-language-toggle').first().click();
    await page.getByTestId('menu-item-spanish').click();
    // The dropdown closes and the tree re-renders in the new language.
    await expect(page.getByTestId('menu-item-spanish')).toBeHidden();
  }

  // The card can open on the sign-in side depending on entry point.
  if (!(await page.getByTestId('input-signup-email').isVisible().catch(() => false))) {
    await page.getByTestId('button-switch-auth-mode').first().click();
  }
  await expect(page.getByTestId('input-signup-email')).toBeVisible();
}

async function fillSignup(page: Page, email: string, password = PASSWORD) {
  await page.getByTestId('input-first-name').fill('Test');
  await page.getByTestId('input-last-name').fill('Student');
  await page.getByTestId('input-signup-email').fill(email);
  await page.getByTestId('input-signup-password').fill(password);
  await page.getByTestId('input-confirm-password').fill(password);
}

const uniqueEmail = (tag: string) =>
  `${tag}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;

test.describe('signing up through the form', () => {
  test('a student ends up signed in on their dashboard', async ({ page }) => {
    await openSignup(page);
    await fillSignup(page, uniqueEmail('signup'));
    await page.getByTestId('button-signup').click();

    await page.waitForURL('**/dashboard', { timeout: 15_000 });

    // Landing on the page is not the same as having a session.
    const me = await page.request.get('/api/auth/user');
    expect(me.status()).toBe(200);
  });

  test('works on a phone', async ({ page }) => {
    // Most students arrive on a phone, and the form is tall.
    await page.setViewportSize({ width: 390, height: 844 });
    await openSignup(page);
    await fillSignup(page, uniqueEmail('phone'));
    await page.getByTestId('button-signup').click();

    await page.waitForURL('**/dashboard', { timeout: 15_000 });
  });

  test('an address already in use is explained in words', async ({ page, request }) => {
    // The regression: this said `400: {"message":"Email already registered"}`.
    // It is the most common way sign-up fails, so it is the one that has to
    // read like a sentence.
    const email = uniqueEmail('duplicate');
    await request.post('/api/register', {
      data: { email, password: PASSWORD, firstName: 'First', lastName: 'Signup' },
    });

    await openSignup(page);
    await fillSignup(page, email);
    await page.getByTestId('button-signup').click();

    // `.first()` because the toast is announced twice - the visible one and a
    // screen-reader live region carrying the same text.
    const toast = page
      .locator('[role="status"]')
      .filter({ hasText: /already registered/i })
      .first();
    await expect(toast).toBeVisible({ timeout: 10_000 });

    const text = (await toast.textContent()) ?? '';
    expect(text).not.toContain('400');
    expect(text).not.toContain('{');
  });

  test('the form checks the password before the server does', async ({ page }) => {
    await openSignup(page);
    await fillSignup(page, uniqueEmail('short'), '123');
    await page.getByTestId('button-signup').click();

    await expect(page.getByText(/at least 8 characters/i).first()).toBeVisible();
  });

  test('a mistyped confirmation is caught', async ({ page }) => {
    await openSignup(page);
    await fillSignup(page, uniqueEmail('mismatch'));
    await page.getByTestId('input-confirm-password').fill('SomethingElse123!');
    await page.getByTestId('button-signup').click();

    await expect(page.getByText(/passwords don't match/i).first()).toBeVisible();
  });
});

test.describe('signing up in Spanish', () => {
  test('the form is in Spanish, not just the page around it', async ({ page }) => {
    // It used to be an island of English inside a fully translated page:
    // Spanish header, Spanish footer, and "Create Account / First Name /
    // Confirm Password" in between.
    await openSignup(page, 'es');

    await expect(page.getByText('Crear Cuenta').first()).toBeVisible();
    await expect(page.getByText('Nombre', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Apellido').first()).toBeVisible();
    await expect(page.getByText('Correo Electrónico').first()).toBeVisible();
    await expect(page.getByText('Confirmar Contraseña').first()).toBeVisible();

    const form = page.locator('form').first();
    await expect(form).not.toContainText('First Name');
    await expect(form).not.toContainText('Confirm Password');
  });

  test('the validation messages are in Spanish too', async ({ page }) => {
    // These are the strings a student reads at the exact moment they are
    // stuck, so they are the ones worth translating most.
    await openSignup(page, 'es');
    await fillSignup(page, uniqueEmail('es-invalid'), '123');
    await page.getByTestId('input-confirm-password').fill('456');
    await page.getByTestId('button-signup').click();

    await expect(page.getByText(/al menos 8 caracteres/i).first()).toBeVisible();
    await expect(page.getByText(/no coinciden/i).first()).toBeVisible();
  });

  test('a Spanish student gets all the way to the dashboard', async ({ page }) => {
    await openSignup(page, 'es');
    await fillSignup(page, uniqueEmail('es-signup'));
    await page.getByTestId('button-signup').click();

    await page.waitForURL('**/dashboard', { timeout: 15_000 });
    const me = await page.request.get('/api/auth/user');
    expect(me.status()).toBe(200);
  });
});

test.describe('getting to the form at all', () => {
  test('the header call to action leads to sign-up', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.getByTestId('cta-header-start').click();

    await expect(page.getByTestId('input-signup-email')).toBeVisible();
  });

  test('a new account can sign back in afterwards', async ({ page, request }) => {
    // Registration that produces an account you cannot return to is not
    // registration.
    const email = uniqueEmail('returning');
    const created = await request.post('/api/register', {
      data: { email, password: PASSWORD, firstName: 'Return', lastName: 'Visitor' },
    });
    expect(created.status()).toBe(200);

    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.getByTestId('input-email').fill(email);
    await page.getByTestId('input-password').fill(PASSWORD);
    await page.getByTestId('button-login').click();

    await page.waitForURL('**/dashboard', { timeout: 15_000 });
  });
});
