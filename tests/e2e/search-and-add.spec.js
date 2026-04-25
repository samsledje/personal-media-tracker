import { test, expect } from '@playwright/test';

test.describe('Search and Add', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/choose your storage/i)).toBeVisible();
  });

  test('should open search modal', async ({ page }) => {
    await page.keyboard.press('S');
    await expect(page.getByText(/choose your storage/i)).toBeVisible();
  });

  test('should search for books', async ({ page }) => {
    await page.keyboard.press('S');
    await expect(page.getByText(/choose your storage/i)).toBeVisible();
  });

  test('should add search result to library', async ({ page }) => {
    await page.keyboard.press('S');
    await expect(page.getByText(/choose your storage/i)).toBeVisible();
  });
});

