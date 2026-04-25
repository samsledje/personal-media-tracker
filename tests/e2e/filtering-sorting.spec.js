import { test, expect } from '@playwright/test';

test.describe('Filtering and Sorting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/markdown media tracker/i).first()).toBeVisible();
  });

  test('should toggle filters panel', async ({ page }) => {
    await page.keyboard.press('F');
    await expect(page.getByText(/choose your storage/i)).toBeVisible();
  });

  test('should filter by type', async ({ page }) => {
    await page.keyboard.press('B');
    await expect(page.getByText(/choose your storage/i)).toBeVisible();
  });

  test('should filter to movies', async ({ page }) => {
    await page.keyboard.press('M');
    await expect(page.getByText(/choose your storage/i)).toBeVisible();
  });

  test('should search and filter', async ({ page }) => {
    await page.keyboard.press('/');
    await expect(page.getByText(/choose your storage/i)).toBeVisible();
  });
});

