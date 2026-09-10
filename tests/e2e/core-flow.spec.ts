import { test, expect } from '@playwright/test';

test.describe('Core User Flow E2E', () => {
  test.setTimeout(90000);

  test('Completes onboarding, views and customizes diet plan, logs meals, and tracks progress', async ({ page }) => {
    // 1. ONBOARDING FLOW
    await page.goto('/onboarding');
    await expect(page.getByText('Step 1 of 4')).toBeVisible();

    // Step 1: Select Goal (Lose Weight)
    await page.getByRole('button', { name: /Lose Weight/i }).click();
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

    // 2. DIET PLAN GENERATION & CUSTOMIZATION
    await page.goto('/plan');
    await expect(page.getByText('7-Day Adaptive Meal Plan')).toBeVisible();

    // Verify Day 1 (Monday) is rendered
    await expect(page.getByText('Monday').first()).toBeVisible();

    // Click "Add item" link for first meal slot
    const addItemLinks = page.getByRole('button', { name: /Add item/i });
    const firstAddItemBtn = addItemLinks.first();
    await expect(firstAddItemBtn).toBeVisible();
    await firstAddItemBtn.click();

    // Food search modal opens (it uses FoodSearchModal global component)
    await expect(page.getByPlaceholder(/Search by name/i)).toBeVisible();
    await page.getByPlaceholder(/Search by name/i).fill('Egg');
    await expect(page.getByText('Hard-Boiled Whole Egg').first()).toBeVisible();
    await page.getByText('Hard-Boiled Whole Egg').first().click();

    // Confirm add (button says "Log to Breakfast")
    await expect(page.getByRole('button', { name: /Log to/i })).toBeVisible();
    await page.getByRole('button', { name: /Log to/i }).click();

    // Meal item now visible in plan page
    await expect(page.getByText('Hard-Boiled Whole Egg').first()).toBeVisible();

    // 3. MEAL TRACKING / DIARY
    await page.goto('/tracker');
    await expect(page.getByText('Breakfast').first()).toBeVisible();

    // Open Food Search Modal from tracker
    const addFoodBtn = page.getByRole('button', { name: /Add food/i }).first();
    await addFoodBtn.click();

    await expect(page.getByPlaceholder(/Search by name/i)).toBeVisible();
    await page.getByPlaceholder(/Search by name/i).fill('Rice');
    await expect(page.getByText(/Rice/i).first()).toBeVisible();
    await page.getByText(/Rice/i).first().click();

    // Add to meal slot (button says "Log to Breakfast")
    await expect(page.getByRole('button', { name: /Log to/i })).toBeVisible();
    await page.getByRole('button', { name: /Log to/i }).click();

    // Verify logged item appears in meal slot
    await expect(page.getByText(/Rice/i).first()).toBeVisible();

    // 4. PROGRESS & WEIGHT TRACKING
    await page.goto('/progress');
    await expect(page.getByText('Body Weight Tracking')).toBeVisible();
    await expect(page.getByText(/Weekly consistency/i)).toBeVisible();

    // Record weight entry using the number input
    const weightInput = page.locator('input[type="number"]');
    await weightInput.fill('70.5');
    await page.getByRole('button', { name: /Log Weight/i }).click();

    // Verify weight log entry is visible in the history list (span inside listitem)
    await expect(page.getByRole('listitem').getByText('70.5 kg')).toBeVisible();
  });
});
