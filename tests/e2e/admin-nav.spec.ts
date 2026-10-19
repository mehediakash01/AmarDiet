import { test, expect } from '@playwright/test';

test.describe('Admin Isolation & Navigation Security', () => {
  test('Admin link is hidden for normal users and direct /admin navigation is denied', async ({ page }) => {
    // 1. Visit dashboard as a normal user
    await page.goto('/dashboard');

    // 2. Assert Admin navigation link is NOT visible anywhere in navigation
    await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0);

    // 3. Attempt direct navigation to /admin
    await page.goto('/admin');

    // 4. Assert access denial message is shown
    await expect(page.getByText(/Admin Access Required|Access Denied/i)).toBeVisible();

    // 5. Assert user is redirected to dashboard
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    await expect(page.getByText(/Today's Log/i)).toBeVisible();
  });
});
