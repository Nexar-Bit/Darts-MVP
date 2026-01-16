import { test, expect } from '@playwright/test';

test.describe('Example E2E Test', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page loaded
    await expect(page).toHaveTitle(/Darts/);
  });

  test('user can navigate to login', async ({ page }) => {
    await page.goto('/');
    
    // Click login link (adjust selector based on your actual UI)
    await page.click('text=Login');
    
    // Check that we're on the login page
    await expect(page).toHaveURL(/\/login/);
  });
});
