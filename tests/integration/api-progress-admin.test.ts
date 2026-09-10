import { describe, it, expect, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../apps/api/src/app.js';
import { InMemorySubscriberRepository } from '../../apps/api/src/modules/subscriber/subscriber.repository.js';
import { InMemoryProfileRepository } from '../../apps/api/src/modules/profile/profile.repository.js';
import { InMemoryFoodLogRepository } from '../../apps/api/src/modules/food-log/food-log.repository.js';
import { InMemoryWeightLogRepository } from '../../apps/api/src/modules/progress/progress.repository.js';
import { FoodService } from '../../apps/api/src/modules/food/food.service.js';

describe('API Integration: Progress Tracking & Admin Food Management', () => {
  let app: FastifyInstance;
  let subscriberRepo: InMemorySubscriberRepository;
  let profileRepo: InMemoryProfileRepository;
  let foodLogRepo: InMemoryFoodLogRepository;
  let weightLogRepo: InMemoryWeightLogRepository;
  let foodService: FoodService;

  const subscriberId = 'sub-test-progress-1';

  beforeEach(async () => {
    subscriberRepo = new InMemorySubscriberRepository();
    profileRepo = new InMemoryProfileRepository();
    foodLogRepo = new InMemoryFoodLogRepository();
    weightLogRepo = new InMemoryWeightLogRepository();
    foodService = new FoodService();

    app = await buildApp({
      subscriberRepo,
      profileRepo,
      foodLogRepo,
      weightLogRepo,
      foodService,
    });

    // Create subscriber & initial profile
    await subscriberRepo.create({ id: subscriberId });
    await profileRepo.upsert({
      subscriberId,
      age: 28,
      sex: 'male',
      height_cm: 178,
      weight_kg: 80,
      activity_level: 'active',
      goal: 'lose_weight',
      target_weight_kg: 74,
      cuisine_preference: 'bengali',
    });
  });

  describe('Progress & Weight Tracking API', () => {
    it('POST /api/progress/weight logs body weight entries', async () => {
      const res1 = await app.inject({
        method: 'POST',
        url: '/api/progress/weight',
        payload: {
          subscriberId,
          weight_kg: 80.0,
          loggedOn: '2026-09-01',
        },
      });
      expect(res1.statusCode).toBe(201);
      const log1 = JSON.parse(res1.body);
      expect(log1.weight_kg).toBe(80.0);

      const res2 = await app.inject({
        method: 'POST',
        url: '/api/progress/weight',
        payload: {
          subscriberId,
          weight_kg: 78.5,
          loggedOn: '2026-09-08',
        },
      });
      expect(res2.statusCode).toBe(201);
    });

    it('GET /api/progress/:subscriberId returns weight delta and 7-day adherence', async () => {
      // 1. Log weight entries
      await app.inject({
        method: 'POST',
        url: '/api/progress/weight',
        payload: { subscriberId, weight_kg: 80.0, loggedOn: '2026-09-01' },
      });
      await app.inject({
        method: 'POST',
        url: '/api/progress/weight',
        payload: { subscriberId, weight_kg: 78.2, loggedOn: '2026-09-08' },
      });

      // 2. Log food for today to produce adherence
      const today = new Date().toISOString().split('T')[0];
      await app.inject({
        method: 'POST',
        url: '/api/food-logs',
        payload: {
          subscriberId,
          loggedOn: today,
          mealSlot: 'lunch',
          foodId: 'food_bengali_sada_bhat',
          quantity: 250,
          unit: 'g',
        },
      });

      // 3. Fetch progress summary
      const progressRes = await app.inject({
        method: 'GET',
        url: `/api/progress/${subscriberId}`,
      });

      expect(progressRes.statusCode).toBe(200);
      const progress = JSON.parse(progressRes.body);

      expect(progress.subscriberId).toBe(subscriberId);
      expect(progress.startingWeight_kg).toBe(80.0);
      expect(progress.currentWeight_kg).toBe(78.2);
      expect(progress.weightDelta_kg).toBe(-1.8);
      expect(progress.targetWeight_kg).toBe(74);

      // Weekly adherence
      expect(progress.weeklyAdherence.totalDays).toBe(7);
      expect(progress.weeklyAdherence.daysLoggedCount).toBeGreaterThanOrEqual(1);
      expect(progress.weeklyAdherence.days.length).toBe(7);
    });
  });

  describe('Admin Food Catalog Management API', () => {
    it('POST /api/admin/foods adds a new food item and makes it immediately searchable', async () => {
      const newFoodPayload = {
        canonicalName: 'Dragon Fruit Smoothie Bowl',
        localNames: ['ড্রাগন ফ্রুট স্মুদি'],
        aliases: ['Pitaya Bowl', 'Pink Smoothie'],
        cuisineTags: ['breakfast', 'fruit', 'dessert'],
        category: 'fruit',
        caloriesPer100g: 95,
        proteinPer100g: 2.2,
        carbsPer100g: 18.5,
        fatPer100g: 1.1,
        fiberPer100g: 3.0,
        commonServings: [
          { label: '1 medium bowl', grams: 250 },
        ],
      };

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/admin/foods',
        payload: newFoodPayload,
      });

      expect(createRes.statusCode).toBe(201);
      const createdFood = JSON.parse(createRes.body);
      expect(createdFood.id).toBeDefined();
      expect(createdFood.canonicalName).toBe('Dragon Fruit Smoothie Bowl');

      // Search immediately via standard search endpoint
      const searchRes = await app.inject({
        method: 'GET',
        url: '/api/foods/search?q=dragon',
      });

      expect(searchRes.statusCode).toBe(200);
      const searchBody = JSON.parse(searchRes.body);
      expect(searchBody.foods.length).toBeGreaterThan(0);
      expect(searchBody.foods[0].id).toBe(createdFood.id);
      expect(searchBody.foods[0].canonicalName).toBe('Dragon Fruit Smoothie Bowl');
    });

    it('PATCH /api/admin/foods/:id updates existing food item nutrition and info', async () => {
      // 1. Create a food item
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/admin/foods',
        payload: {
          canonicalName: 'Test Energy Bar',
          cuisineTags: ['snack', 'packaged'],
          category: 'packaged',
          caloriesPer100g: 350,
          proteinPer100g: 10,
          carbsPer100g: 45,
          fatPer100g: 12,
          fiberPer100g: 5,
          commonServings: [{ label: '1 bar', grams: 45 }],
        },
      });
      const created = JSON.parse(createRes.body);

      // 2. Patch calories and protein
      const patchRes = await app.inject({
        method: 'PATCH',
        url: `/api/admin/foods/${created.id}`,
        payload: {
          caloriesPer100g: 380,
          proteinPer100g: 15,
        },
      });

      expect(patchRes.statusCode).toBe(200);
      const patched = JSON.parse(patchRes.body);
      expect(patched.caloriesPer100g).toBe(380);
      expect(patched.proteinPer100g).toBe(15);

      // 3. Verify in lookup
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/foods/${created.id}`,
      });
      const fetched = JSON.parse(getRes.body);
      expect(fetched.caloriesPer100g).toBe(380);
      expect(fetched.proteinPer100g).toBe(15);
    });
  });
});
