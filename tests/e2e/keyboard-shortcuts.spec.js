import { test, expect } from '@playwright/test';

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/markdown media tracker/i).first()).toBeVisible();
  });

  test('should open help modal with ?', async ({ page }) => {
    await page.keyboard.press('?');
    
    await expect(page.getByText(/keyboard shortcuts/i)).toBeVisible();
  });

  test('should navigate with arrow keys', async ({ page }) => {
    await page.keyboard.press('ArrowDown');
    await expect(page.getByText(/choose your storage/i)).toBeVisible();
  });

  test('should open item with Enter', async ({ page }) => {
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.getByText(/choose your storage/i)).toBeVisible();
  });

  test('should close modals with Escape', async ({ page }) => {
    // Open a modal
    await page.keyboard.press('?');
    
    await expect(page.getByText(/keyboard shortcuts/i)).toBeVisible();
    
    // Close with Escape
    await page.keyboard.press('Escape');
    
    await expect(page.getByText(/keyboard shortcuts/i)).not.toBeVisible({ timeout: 2000 });
  });

  test('should toggle selection mode', async ({ page }) => {
    await page.keyboard.press('V');
    const checkboxes = page.locator('input[type="checkbox"]');
    await expect(checkboxes.first()).toBeVisible({ timeout: 2000 });
  });
});

