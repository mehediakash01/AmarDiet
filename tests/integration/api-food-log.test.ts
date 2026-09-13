import { describe, it, expect, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../apps/api/src/app.js';
import { InMemorySubscriberRepository } from '../../apps/api/src/modules/subscriber/subscriber.repository.js';
import { InMemoryProfileRepository } from '../../apps/api/src/modules/profile/profile.repository.js';
import { InMemoryFoodLogRepository } from '../../apps/api/src/modules/food-log/food-log.repository.js';
import { FoodService } from '../../apps/api/src/modules/food/food.service.js';
import { InMemoryFoodRepository } from '../../apps/api/src/modules/food/food.repository.js';

describe('API Integration: Food Search & Food Logging Modules', () => {
  let app: FastifyInstance;
  let subscriberRepo: InMemorySubscriberRepository;
  let profileRepo: InMemoryProfileRepository;
  let foodLogRepo: InMemoryFoodLogRepository;
  let foodService: FoodService;

  beforeEach(async () => {
    subscriberRepo = new InMemorySubscriberRepository();
    profileRepo = new InMemoryProfileRepository();
    foodLogRepo = new InMemoryFoodLogRepository();
    foodService = new FoodService(new InMemoryFoodRepository());
    await foodService.init();

    app = await buildApp({
      subscriberRepo,
      profileRepo,
      foodLogRepo,
      foodService,
    });
  });

  describe('Food Search API (Cuisine-Agnostic)', () => {
    it('returns both Bengali and Western dishes in a single query (e.g. "chicken")', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/foods/search?q=chicken',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.total).toBeGreaterThanOrEqual(2);

      const foodIds = body.foods.map((f: { id: string }) => f.id);
      // Contains both Bengali chicken curry and Western grilled chicken breast
      expect(foodIds).toContain('food_bengali_murgir_jhol');
      expect(foodIds).toContain('food_western_grilled_chicken_breast');
    });

    it('returns Bengali, Western, and branded packaged items when searching "milk"', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/foods/search?q=milk',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      const foodIds = body.foods.map((f: { id: string }) => f.id);

      // Western whole milk, Pran UHT milk, Nestle milk powder
      expect(foodIds).toContain('food_western_whole_milk');
      expect(foodIds).toContain('food_brand_pran_uht_milk');
      expect(foodIds).toContain('food_brand_nestle_everyday_powder');
    });

    it('searches by Bengali script / local name (e.g. "ভাত" for Rice)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/foods/search?q=${encodeURIComponent('ভাত')}`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.foods.length).toBeGreaterThan(0);
      expect(body.foods[0].id).toBe('food_bengali_sada_bhat');
    });

    it('cuisinePreference biases ranking without filtering out other cuisines', async () => {
      const resBengaliPref = await app.inject({
        method: 'GET',
        url: '/api/foods/search?q=chicken&cuisinePreference=bengali',
      });
      const bengaliBody = JSON.parse(resBengaliPref.body);
      expect(bengaliBody.foods[0].id).toBe('food_bengali_murgir_jhol');
      // Western chicken breast is STILL present in results, not excluded!
      expect(bengaliBody.foods.some((f: { id: string }) => f.id === 'food_western_grilled_chicken_breast')).toBe(true);

      const resWesternPref = await app.inject({
        method: 'GET',
        url: '/api/foods/search?q=chicken&cuisinePreference=western',
      });
      const westernBody = JSON.parse(resWesternPref.body);
      expect(westernBody.foods[0].id).toBe('food_western_grilled_chicken_breast');
      // Bengali chicken is STILL present in results, not excluded!
      expect(westernBody.foods.some((f: { id: string }) => f.id === 'food_bengali_murgir_jhol')).toBe(true);
    });

    it('GET /api/foods/:id retrieves a single food item by ID', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/foods/food_bengali_sada_bhat',
      });

      expect(res.statusCode).toBe(200);
      const food = JSON.parse(res.body);
      expect(food.canonicalName).toBe('Steamed White Rice');
      expect(food.caloriesPer100g).toBe(130);
      expect(food.commonServings.length).toBeGreaterThan(0);
    });

    it('GET /api/foods/:id returns 404 for unknown food', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/foods/unknown-food-id-xyz',
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('Food Logging API', () => {
    const subscriberId = 'sub-test-food-log-1';
    const logDate = '2026-09-10';

    beforeEach(async () => {
      await subscriberRepo.create({ id: subscriberId });
    });

    it('POST /api/food-logs calculates nutrition dynamically and stores entry', async () => {
      // 200g of Steamed White Rice (130 kcal/100g -> 260 kcal)
      const res = await app.inject({
        method: 'POST',
        url: '/api/food-logs',
        payload: {
          subscriberId,
          loggedOn: logDate,
          mealSlot: 'lunch',
          foodId: 'food_bengali_sada_bhat',
          quantity: 200,
          unit: 'g',
        },
      });

      expect(res.statusCode).toBe(201);
      const entry = JSON.parse(res.body);
      expect(entry.id).toBeDefined();
      expect(entry.foodName).toBe('Steamed White Rice');
      expect(entry.calculatedNutrition.calories).toBe(260); // 130 * 2
      expect(entry.calculatedNutrition.protein).toBe(5.4); // 2.7 * 2
      expect(entry.calculatedNutrition.carbs).toBe(56.4); // 28.2 * 2
      expect(entry.calculatedNutrition.fat).toBe(0.6); // 0.3 * 2
    });

    it('logs foods across all 4 meal slots and validates daily totals against deterministic math', async () => {
      // 1. Breakfast: Rolled oats 50g (389 kcal/100g -> 194.5 kcal) + Boiled Egg 50g (155 kcal/100g -> 77.5 kcal)
      await app.inject({
        method: 'POST',
        url: '/api/food-logs',
        payload: {
          subscriberId,
          loggedOn: logDate,
          mealSlot: 'breakfast',
          foodId: 'food_western_rolled_oats',
          quantity: 50,
          unit: 'g',
        },
      });
      await app.inject({
        method: 'POST',
        url: '/api/food-logs',
        payload: {
          subscriberId,
          loggedOn: logDate,
          mealSlot: 'breakfast',
          foodId: 'food_western_boiled_egg',
          quantity: 50,
          unit: 'g',
        },
      });

      // 2. Lunch: Rice 200g (260 kcal) + Red Lentil Dal 150g (85 * 1.5 = 127.5 kcal)
      await app.inject({
        method: 'POST',
        url: '/api/food-logs',
        payload: {
          subscriberId,
          loggedOn: logDate,
          mealSlot: 'lunch',
          foodId: 'food_bengali_sada_bhat',
          quantity: 200,
          unit: 'g',
        },
      });
      await app.inject({
        method: 'POST',
        url: '/api/food-logs',
        payload: {
          subscriberId,
          loggedOn: logDate,
          mealSlot: 'lunch',
          foodId: 'food_bengali_moshur_dal',
          quantity: 150,
          unit: 'g',
        },
      });

      // 3. Snack: Banana 100g (89 kcal)
      await app.inject({
        method: 'POST',
        url: '/api/food-logs',
        payload: {
          subscriberId,
          loggedOn: logDate,
          mealSlot: 'snack',
          foodId: 'food_generic_banana',
          quantity: 100,
          unit: 'g',
        },
      });

      // 4. Dinner: Grilled Chicken Breast 150g (165 * 1.5 = 247.5 kcal)
      await app.inject({
        method: 'POST',
        url: '/api/food-logs',
        payload: {
          subscriberId,
          loggedOn: logDate,
          mealSlot: 'dinner',
          foodId: 'food_western_grilled_chicken_breast',
          quantity: 150,
          unit: 'g',
        },
      });

      // Retrieve full day diary
      const diaryRes = await app.inject({
        method: 'GET',
        url: `/api/food-logs?subscriberId=${subscriberId}&date=${logDate}`,
      });

      expect(diaryRes.statusCode).toBe(200);
      const diary = JSON.parse(diaryRes.body);

      expect(diary.subscriberId).toBe(subscriberId);
      expect(diary.date).toBe(logDate);

      // Verify all 4 slots have expected items
      expect(diary.meals.breakfast.items.length).toBe(2);
      expect(diary.meals.lunch.items.length).toBe(2);
      expect(diary.meals.snack.items.length).toBe(1);
      expect(diary.meals.dinner.items.length).toBe(1);

      // Expected math:
      // Breakfast: 194.5 + 77.5 = 272 kcal
      expect(diary.meals.breakfast.subtotal.calories).toBe(272);
      // Lunch: 260 + 127.5 = 387.5 kcal
      expect(diary.meals.lunch.subtotal.calories).toBe(387.5);
      // Snack: 89 kcal
      expect(diary.meals.snack.subtotal.calories).toBe(89);
      // Dinner: 247.5 kcal
      expect(diary.meals.dinner.subtotal.calories).toBe(247.5);

      // Total daily calories = 272 + 387.5 + 89 + 247.5 = 996 kcal
      expect(diary.totals.calories).toBe(996);
      expect(diary.totals.protein).toBeGreaterThan(0);
      expect(diary.totals.carbs).toBeGreaterThan(0);
      expect(diary.totals.fat).toBeGreaterThan(0);
    });

    it('PATCH /api/food-logs/:id updates quantity and recalculates nutrition', async () => {
      // Create initial entry: 100g banana = 89 kcal
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/food-logs',
        payload: {
          subscriberId,
          loggedOn: logDate,
          mealSlot: 'snack',
          foodId: 'food_generic_banana',
          quantity: 100,
          unit: 'g',
        },
      });
      const created = JSON.parse(createRes.body);
      expect(created.calculatedNutrition.calories).toBe(89);

      // Patch quantity to 200g -> 178 kcal
      const patchRes = await app.inject({
        method: 'PATCH',
        url: `/api/food-logs/${created.id}`,
        payload: {
          quantity: 200,
        },
      });

      expect(patchRes.statusCode).toBe(200);
      const patched = JSON.parse(patchRes.body);
      expect(patched.quantity).toBe(200);
      expect(patched.calculatedNutrition.calories).toBe(178);
      expect(patched.calculatedNutrition.carbs).toBe(45.6);
    });

    it('DELETE /api/food-logs/:id removes entry and updates daily totals', async () => {
      // Create entry
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/food-logs',
        payload: {
          subscriberId,
          loggedOn: logDate,
          mealSlot: 'dinner',
          foodId: 'food_bengali_alu_bharta',
          quantity: 100,
          unit: 'g',
        },
      });
      const created = JSON.parse(createRes.body);

      // Delete entry
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/food-logs/${created.id}`,
      });
      expect(deleteRes.statusCode).toBe(200);
      const deleteBody = JSON.parse(deleteRes.body);
      expect(deleteBody.success).toBe(true);

      // Check diary is now empty for dinner
      const diaryRes = await app.inject({
        method: 'GET',
        url: `/api/food-logs?subscriberId=${subscriberId}&date=${logDate}`,
      });
      const diary = JSON.parse(diaryRes.body);
      expect(diary.meals.dinner.items.length).toBe(0);
      expect(diary.meals.dinner.subtotal.calories).toBe(0);
    });

    it('returns 404 when updating or deleting non-existent food log entry', async () => {
      const patchRes = await app.inject({
        method: 'PATCH',
        url: '/api/food-logs/non-existent-id-123',
        payload: { quantity: 150 },
      });
      expect(patchRes.statusCode).toBe(404);

      const deleteRes = await app.inject({
        method: 'DELETE',
        url: '/api/food-logs/non-existent-id-123',
      });
      expect(deleteRes.statusCode).toBe(404);
    });
  });
});
