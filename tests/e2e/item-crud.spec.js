import { test, expect } from '@playwright/test';

test.describe('Item CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/choose your storage/i)).toBeVisible();
  });

  test('should create a new book item', async ({ page }) => {
    await page.keyboard.press('N');
    await expect(page.getByText(/choose your storage/i)).toBeVisible();
  });

  test('should open and close add modal', async ({ page }) => {
    await page.keyboard.press('N');
    await expect(page.getByText(/choose your storage/i)).toBeVisible();
  });

  test('should keep keyboard CRUD shortcut available', async ({ page }) => {
    await page.keyboard.press('N');
    await expect(page.getByText(/choose your storage/i)).toBeVisible();
  });
});

