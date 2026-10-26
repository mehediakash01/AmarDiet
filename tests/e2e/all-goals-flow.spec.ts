import { test, expect } from '@playwright/test';

test.describe('E2E Onboarding & Plan Generation for All Goals', () => {
  test.setTimeout(90000);

  const additionalGoals = [
    {
      name: 'Maintain Weight',
      buttonRegex: /Maintain/i,
      expectedText: /Maintain/i,
    },
    {
      name: 'Gain Muscle',
      buttonRegex: /Build Muscle|Gain Muscle/i,
      expectedText: /Muscle/i,
    },
    {
      name: 'Gain Weight',
      buttonRegex: /Gain Weight/i,
      expectedText: /Gain/i,
    },
  ];

  for (const g of additionalGoals) {
    test(`Completes onboarding and generates plan for goal: ${g.name}`, async ({ page }) => {
      await page.goto('/onboarding');
      await expect(page.getByText('Step 1 of 4')).toBeVisible();

      // Step 1: Select Goal
      await page.getByRole('button', { name: g.buttonRegex }).click();
      await page.getByRole('button', { name: /Continue/i }).click();

      // Step 2: Body & Activity
      await expect(page.getByText('Step 2 of 4')).toBeVisible();
      await page.getByRole('button', { name: /Continue/i }).click();

      // Step 3: Food Preferences
      await expect(page.getByText('Step 3 of 4')).toBeVisible();
      await page.getByRole('button', { name: /Continue/i }).click();

      // Step 4: Calculated Targets & Confirmation
      await expect(page.getByText('Step 4 of 4')).toBeVisible();
      await expect(page.getByText('Your Calculated Nutrition Plan')).toBeVisible();

      // Finish onboarding
      await page.getByRole('button', { name: /Save & Go to Dashboard/i }).click();
      await page.waitForURL('**/dashboard');
      await expect(page.getByText("Today's Log")).toBeVisible();

      // Go to Plan
      await page.goto('/plan');
      await expect(page.getByText('7-Day Adaptive Meal Plan')).toBeVisible();
      await expect(page.getByText('Monday').first()).toBeVisible();
    });
  }
});
