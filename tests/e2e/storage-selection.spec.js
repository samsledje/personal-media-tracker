import { test, expect } from '@playwright/test';

test.describe('Storage Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display storage selection options', async ({ page }) => {
    // Wait for storage selector to appear
    await expect(page.getByText(/local files|google drive/i)).toBeVisible();
  });

  test('should expose filesystem storage action', async ({ page }) => {
    const filesystemButton = page.getByRole('button', { name: /local files/i });
    await expect(filesystemButton).toBeVisible();
  });

  test('should show storage info after selection', async ({ page }) => {
    await expect(page.getByText(/choose your storage/i)).toBeVisible();
  });
});

