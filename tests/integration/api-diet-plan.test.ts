import { describe, it, expect, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../apps/api/src/app.js';
import { InMemorySubscriberRepository } from '../../apps/api/src/modules/subscriber/subscriber.repository.js';
import { InMemoryProfileRepository } from '../../apps/api/src/modules/profile/profile.repository.js';
import { InMemoryFoodLogRepository } from '../../apps/api/src/modules/food-log/food-log.repository.js';
import { InMemoryDietPlanRepository } from '../../apps/api/src/modules/diet-plan/diet-plan.repository.js';
import { FoodService } from '../../apps/api/src/modules/food/food.service.js';

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
    foodService = new FoodService();

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
