import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/.+/);
});

test('user can sign up', async ({ page }) => {
  await page.goto('/signup');

  await page.fill('input[name="email"]', `test${Date.now()}@example.com`);
  await page.fill('input[name="password"]', 'Password123!');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/dashboard|home/);
});

test('login fails with wrong password', async ({ page }) => {
  await page.goto('/login');

  await page.fill('input[name="email"]', 'wrong@example.com');
  await page.fill('input[name="password"]', 'wrongpassword');
  await page.click('button[type="submit"]');

  await expect(page.locator('.error')).toBeVisible();
});

test('create, edit, delete item', async ({ page }) => {
  await page.goto('/login');

  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'Password123!');
  await page.click('button[type="submit"]');

  await page.goto('/items');

  await page.click('text=Add Item');
  await page.fill('input[name="title"]', 'Test Item');
  await page.click('text=Save');

  await expect(page.locator('text=Test Item')).toBeVisible();

  await page.click('text=Edit');
  await page.fill('input[name="title"]', 'Updated Item');
  await page.click('text=Save');

  await expect(page.locator('text=Updated Item')).toBeVisible();

  await page.click('text=Delete');
  await page.click('text=Confirm');

  await expect(page.locator('text=Updated Item')).not.toBeVisible();
});
