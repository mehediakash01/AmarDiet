import { describe, it, expect, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../apps/api/src/app.js';
import { InMemorySubscriberRepository } from '../../apps/api/src/modules/subscriber/subscriber.repository.js';
import { InMemoryProfileRepository } from '../../apps/api/src/modules/profile/profile.repository.js';
import { InMemoryFoodLogRepository } from '../../apps/api/src/modules/food-log/food-log.repository.js';
import { InMemoryDietPlanRepository } from '../../apps/api/src/modules/diet-plan/diet-plan.repository.js';
import { FoodService } from '../../apps/api/src/modules/food/food.service.js';
import { InMemoryFoodRepository } from '../../apps/api/src/modules/food/food.repository.js';

describe('API Integration: Diet Plan Generation & Meal Customization', () => {
  let app: FastifyInstance;
  let subscriberRepo: InMemorySubscriberRepository;
  let profileRepo: InMemoryProfileRepository;
  let foodLogRepo: InMemoryFoodLogRepository;
  let dietPlanRepo: InMemoryDietPlanRepository;
  let foodService: FoodService;

  const subscriberId = 'sub-test-plan-1';

  beforeEach(async () => {
    subscriberRepo = new InMemorySubscriberRepository();
    profileRepo = new InMemoryProfileRepository();
    foodLogRepo = new InMemoryFoodLogRepository();
    dietPlanRepo = new InMemoryDietPlanRepository();
    foodService = new FoodService(new InMemoryFoodRepository());
    await foodService.init();

    app = await buildApp({
      subscriberRepo,
      profileRepo,
      foodLogRepo,
      dietPlanRepo,
      foodService,
    });

    // Create subscriber & initial profile
    await subscriberRepo.create({ id: subscriberId });
    await profileRepo.upsert({
      subscriberId,
      age: 26,
      sex: 'male',
      height_cm: 175,
      weight_kg: 72,
      activity_level: 'lightly_active',
      goal: 'lose_weight',
      target_weight_kg: 68,
      cuisine_preference: 'bengali',
    });
  });

  describe('Diet Plan Generation', () => {
    it('POST /api/diet-plan/generate generates a 7-day adaptive plan matching target calories', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/diet-plan/generate',
        payload: { subscriberId },
      });

      expect(res.statusCode).toBe(201);
      const plan = JSON.parse(res.body);

      expect(plan.subscriberId).toBe(subscriberId);
      expect(plan.days.length).toBe(7);
      expect(plan.calorieTarget).toBeGreaterThan(1000);

      // Check each day has 4 meal slots and isCustomized is false initially
      plan.days.forEach((day: { day: string; meals: Array<{ mealSlot: string; isCustomized: boolean; items: unknown[] }> }) => {
        expect(day.meals.length).toBe(4);
        day.meals.forEach((meal) => {
          expect(meal.isCustomized).toBe(false);
          expect(meal.items.length).toBeGreaterThan(0);
        });
      });
    });

    it('generates distinct calorie targets across all 4 goals', async () => {
      const goals = ['lose_weight', 'maintain', 'gain_weight', 'build_muscle'] as const;
      const targetCalories: number[] = [];

      for (const goal of goals) {
        const subId = `sub-goal-${goal}`;
        await subscriberRepo.create({ id: subId });
        await profileRepo.upsert({
          subscriberId: subId,
          age: 30,
          sex: 'female',
          height_cm: 165,
          weight_kg: 60,
          activity_level: 'active',
          goal,
          cuisine_preference: 'mixed',
        });

        const res = await app.inject({
          method: 'POST',
          url: '/api/diet-plan/generate',
          payload: { subscriberId: subId },
        });

        expect(res.statusCode).toBe(201);
        const plan = JSON.parse(res.body);
        targetCalories.push(plan.calorieTarget);
      }

      // lose_weight < maintain < build_muscle < gain_weight (or distinct)
      // lose_weight is deficit (-500), maintain is 0, build_muscle is +200, gain_weight is +300
      expect(targetCalories[0]).toBeLessThan(targetCalories[1]); // lose < maintain
      expect(targetCalories[1]).toBeLessThan(targetCalories[2]); // maintain < gain
      expect(targetCalories[3]).toBeLessThan(targetCalories[2]); // build_muscle (+200) < gain_weight (+300)
    });

    it('scales actual food QUANTITIES (not just targets) between a low-calorie and high-calorie goal', async () => {
      // Same age/height/activity/cuisine so the only real difference is goal —
      // isolates whether portions genuinely respond to the target, rather
      // than being a fixed template regardless of goal.
      const baseProfile = {
        age: 28,
        sex: 'male' as const,
        height_cm: 180,
        weight_kg: 80,
        activity_level: 'active' as const,
        cuisine_preference: 'bengali' as const,
      };

      const loseId = 'sub-scale-lose';
      const gainId = 'sub-scale-gain';

      await subscriberRepo.create({ id: loseId });
      await profileRepo.upsert({ ...baseProfile, subscriberId: loseId, goal: 'lose_weight' });

      await subscriberRepo.create({ id: gainId });
      await profileRepo.upsert({ ...baseProfile, subscriberId: gainId, goal: 'build_muscle' });

      const loseRes = await app.inject({
        method: 'POST',
        url: '/api/diet-plan/generate',
        payload: { subscriberId: loseId },
      });
      const gainRes = await app.inject({
        method: 'POST',
        url: '/api/diet-plan/generate',
        payload: { subscriberId: gainId },
      });

      const losePlan = JSON.parse(loseRes.body);
      const gainPlan = JSON.parse(gainRes.body);

      const loseLunch = losePlan.days[0].meals.find(
        (m: { mealSlot: string }) => m.mealSlot === 'lunch',
      );
      const gainLunch = gainPlan.days[0].meals.find(
        (m: { mealSlot: string }) => m.mealSlot === 'lunch',
      );

      // The core fix: build_muscle's lunch should carry meaningfully more
      // total quantity (grams) than lose_weight's lunch, not identical
      // portions with a deviation note bolted on.
      const loseTotalGrams = loseLunch.items.reduce(
        (sum: number, i: { quantity: number }) => sum + i.quantity,
        0,
      );
      const gainTotalGrams = gainLunch.items.reduce(
        (sum: number, i: { quantity: number }) => sum + i.quantity,
        0,
      );
      expect(gainTotalGrams).toBeGreaterThan(loseTotalGrams);

      // And each meal's actual subtotal should land reasonably close to
      // its own target — proving the scaling is actually solving for the
      // target, not just picking fixed food regardless of it.
      const loseSubtotalRatio = loseLunch.subtotal.calories / loseLunch.targetNutrition.calories;
      const gainSubtotalRatio = gainLunch.subtotal.calories / gainLunch.targetNutrition.calories;
      expect(loseSubtotalRatio).toBeGreaterThan(0.85);
      expect(loseSubtotalRatio).toBeLessThan(1.15);
      expect(gainSubtotalRatio).toBeGreaterThan(0.85);
      expect(gainSubtotalRatio).toBeLessThan(1.15);

      // Muscle-building protein target should be meaningfully higher, and
      // the plan should actually deliver closer to it (protein-role boost).
      expect(gainLunch.targetNutrition.protein).toBeGreaterThan(loseLunch.targetNutrition.protein);
      expect(gainLunch.subtotal.protein).toBeGreaterThan(loseLunch.subtotal.protein);
    });

    it('GET /api/diet-plan/:subscriberId retrieves active plan', async () => {
      // First generate
      await app.inject({
        method: 'POST',
        url: '/api/diet-plan/generate',
        payload: { subscriberId },
      });

      // Fetch
      const res = await app.inject({
        method: 'GET',
        url: `/api/diet-plan/${subscriberId}`,
      });

      expect(res.statusCode).toBe(200);
      const plan = JSON.parse(res.body);
      expect(plan.subscriberId).toBe(subscriberId);
      expect(plan.days.length).toBe(7);
    });
  });

  describe('Meal Customization (Add & Remove Item)', () => {
    beforeEach(async () => {
      // Generate base plan
      await app.inject({
        method: 'POST',
        url: '/api/diet-plan/generate',
        payload: { subscriberId },
      });
    });

    it('POST /api/diet-plan/item/add appends item, marks isCustomized: true, and updates subtotals', async () => {
      // Add 100g banana (89 kcal, 22.8g carbs) to Monday Snack
      const res = await app.inject({
        method: 'POST',
        url: '/api/diet-plan/item/add',
        payload: {
          subscriberId,
          day: 'Monday',
          mealSlot: 'snack',
          foodId: 'food_generic_banana',
          quantity: 100,
          unit: 'g',
        },
      });

      expect(res.statusCode).toBe(200);
      const plan = JSON.parse(res.body);

      const monday = plan.days.find((d: { day: string }) => d.day === 'Monday');
      const snackMeal = monday.meals.find((m: { mealSlot: string }) => m.mealSlot === 'snack');

      expect(snackMeal.isCustomized).toBe(true);
      expect(snackMeal.items.some((i: { foodId: string }) => i.foodId === 'food_generic_banana')).toBe(true);
      expect(snackMeal.subtotal.calories).toBeGreaterThan(80);
      expect(monday.totals.calories).toBeGreaterThan(0);
    });

    it('DELETE /api/diet-plan/item/remove removes item, marks isCustomized: true, and updates subtotals', async () => {
      // First get Monday lunch items
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/diet-plan/${subscriberId}`,
      });
      const initialPlan = JSON.parse(getRes.body);
      const monday = initialPlan.days.find((d: { day: string }) => d.day === 'Monday');
      const lunchMeal = monday.meals.find((m: { mealSlot: string }) => m.mealSlot === 'lunch');
      const firstFoodId = lunchMeal.items[0].foodId;
      const initialItemsCount = lunchMeal.items.length;

      // Remove the first item
      const removeRes = await app.inject({
        method: 'DELETE',
        url: '/api/diet-plan/item/remove',
        payload: {
          subscriberId,
          day: 'Monday',
          mealSlot: 'lunch',
          foodId: firstFoodId,
        },
      });

      expect(removeRes.statusCode).toBe(200);
      const updatedPlan = JSON.parse(removeRes.body);

      const updatedMonday = updatedPlan.days.find((d: { day: string }) => d.day === 'Monday');
      const updatedLunch = updatedMonday.meals.find((m: { mealSlot: string }) => m.mealSlot === 'lunch');

      expect(updatedLunch.isCustomized).toBe(true);
      expect(updatedLunch.items.length).toBe(initialItemsCount - 1);
      expect(updatedLunch.subtotal.calories).toBeLessThan(lunchMeal.subtotal.calories);
    });
  });
});
