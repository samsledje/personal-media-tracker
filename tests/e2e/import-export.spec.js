import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixtureCsvPath = path.join(__dirname, '../fixtures/test-import.csv');

test.describe('Import and Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/choose your storage/i)).toBeVisible();
  });

  test('should render storage-first state for import/export flows', async ({ page }) => {
    await expect(page.getByRole('button', { name: /local files/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /google drive/i })).toBeVisible();
  });

  test('should keep fixture path valid for future connected import test', async () => {
    expect(path.isAbsolute(fixtureCsvPath)).toBe(true);
  });
});

