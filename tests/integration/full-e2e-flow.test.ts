import { describe, it, expect, beforeEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../apps/api/src/app.js';
import { InMemorySubscriberRepository } from '../../apps/api/src/modules/subscriber/subscriber.repository.js';
import { InMemoryProfileRepository } from '../../apps/api/src/modules/profile/profile.repository.js';
import { InMemoryFoodLogRepository } from '../../apps/api/src/modules/food-log/food-log.repository.js';
import { InMemoryDietPlanRepository } from '../../apps/api/src/modules/diet-plan/diet-plan.repository.js';
import { InMemoryWeightLogRepository } from '../../apps/api/src/modules/progress/progress.repository.js';
import { InMemoryWebhookEventRepository } from '../../apps/api/src/modules/webhook/webhook-event.repository.js';
import { InMemoryFoodRepository } from '../../apps/api/src/modules/food/food.repository.js';
import { FoodService } from '../../apps/api/src/modules/food/food.service.js';
import { BdappsClient } from '../../apps/api/src/infrastructure/bdapps/bdapps.client.js';
import { SubscriptionService } from '../../apps/api/src/modules/subscription/subscription.service.js';
import type { Goal } from '@thali/types';

describe('Phase 9 Production Hardening: Full E2E Flow Across All 4 Goals', () => {
  let app: FastifyInstance;
  let subscriberRepo: InMemorySubscriberRepository;
  let profileRepo: InMemoryProfileRepository;
  let foodLogRepo: InMemoryFoodLogRepository;
  let dietPlanRepo: InMemoryDietPlanRepository;
  let weightLogRepo: InMemoryWeightLogRepository;
  let webhookRepo: InMemoryWebhookEventRepository;
  let foodRepo: InMemoryFoodRepository;
  let foodService: FoodService;
  let bdappsClient: BdappsClient;
  let subscriptionService: SubscriptionService;

  const validAppId = 'APP_000001';

  beforeEach(async () => {
    subscriberRepo = new InMemorySubscriberRepository();
    profileRepo = new InMemoryProfileRepository();
    foodLogRepo = new InMemoryFoodLogRepository();
    dietPlanRepo = new InMemoryDietPlanRepository();
    weightLogRepo = new InMemoryWeightLogRepository();
    webhookRepo = new InMemoryWebhookEventRepository();
    foodRepo = new InMemoryFoodRepository();
    foodService = new FoodService(foodRepo);
    await foodService.init();

    bdappsClient = new BdappsClient({ applicationId: validAppId, password: 'test_password' });
    subscriptionService = new SubscriptionService(subscriberRepo, webhookRepo, bdappsClient);

    app = await buildApp({
      subscriberRepo,
      profileRepo,
      foodLogRepo,
      dietPlanRepo,
      weightLogRepo,
      webhookEventRepo: webhookRepo,
      foodService,
      subscriptionService,
      bdappsClient,
    });
  });

  const testGoals: Array<{
    goal: Goal;
    label: string;
    profileData: {
      age: number;
      sex: 'male' | 'female';
      height_cm: number;
      weight_kg: number;
      activity_level: 'sedentary' | 'lightly_active' | 'active' | 'very_active';
      target_weight_kg: number;
      cuisine_preference: 'bengali' | 'mixed' | 'western';
    };
    validateNutrition: (calories: number, macros: { protein_g: number; carbs_g: number; fat_g: number }) => void;
  }> = [
    {
      goal: 'lose_weight',
      label: 'Weight Loss (Caloric Deficit)',
      profileData: {
        age: 28,
        sex: 'male',
        height_cm: 175,
        weight_kg: 85,
        activity_level: 'active',
        target_weight_kg: 75,
        cuisine_preference: 'bengali',
      },
      validateNutrition: (cal, macros) => {
        expect(cal).toBeGreaterThanOrEqual(1500); // respects safety floor
        expect(macros.protein_g).toBeGreaterThanOrEqual(85 * 1.6); // elevated protein for muscle preservation
      },
    },
    {
      goal: 'maintain',
      label: 'Maintenance (Energy Balance)',
      profileData: {
        age: 30,
        sex: 'female',
        height_cm: 162,
        weight_kg: 58,
        activity_level: 'lightly_active',
        target_weight_kg: 58,
        cuisine_preference: 'mixed',
      },
      validateNutrition: (cal, macros) => {
        expect(cal).toBeGreaterThan(1600);
        expect(macros.protein_g).toBeGreaterThan(50);
      },
    },
    {
      goal: 'build_muscle',
      label: 'Muscle Gain (Hypertrophy Surplus + High Protein)',
      profileData: {
        age: 24,
        sex: 'male',
        height_cm: 180,
        weight_kg: 74,
        activity_level: 'active',
        target_weight_kg: 80,
        cuisine_preference: 'western',
      },
      validateNutrition: (cal, macros) => {
        expect(cal).toBeGreaterThan(2400); // caloric surplus
        expect(macros.protein_g).toBeGreaterThanOrEqual(74 * 2.0); // 2.0g/kg protein target
      },
    },
    {
      goal: 'gain_weight',
      label: 'Healthy Weight Gain (Hyper-Caloric Surplus)',
      profileData: {
        age: 22,
        sex: 'male',
        height_cm: 170,
        weight_kg: 52,
        activity_level: 'lightly_active',
        target_weight_kg: 60,
        cuisine_preference: 'bengali',
      },
      validateNutrition: (cal) => {
        expect(cal).toBeGreaterThan(2000); // surplus
      },
    },
  ];

  for (const { goal, label, profileData, validateNutrition } of testGoals) {
    it(`executes full E2E lifecycle for goal: ${label} (${goal})`, async () => {
      // ─── 1. SUBSCRIBE FLOW ───────────────────────────────────────────
      // 1.1 Create initial anonymous subscriber record
      const sub = await subscriberRepo.create({
        id: randomUUID(),
        status: 'inactive',
      });

      // 1.2 User initiates Bdapps subscription with phone
      const initRes = await app.inject({
        method: 'POST',
        url: '/api/subscription/initiate',
        payload: {
          subscriberId: sub.id,
          phone: '01812345678',
        },
      });
      expect(initRes.statusCode).toBe(200);
      const initBody = JSON.parse(initRes.body);
      expect(initBody.status).toBe('inactive'); // Cannot self-activate!

      // 1.3 Inbound Telco Webhook arrives from Bdapps confirming subscription
      const webhookRes = await app.inject({
        method: 'POST',
        url: '/api/webhooks/bdapps',
        payload: {
          applicationId: validAppId,
          subscriberId: sub.id,
          eventId: `evt-sub-${goal}-${Date.now()}`,
          status: 'REGISTER',
        },
      });
      expect(webhookRes.statusCode).toBe(200);
      const webhookBody = JSON.parse(webhookRes.body);
      expect(webhookBody.status).toBe('active');

      // 1.4 Verify subscription status check returns active
      const statusRes = await app.inject({
        method: 'GET',
        url: `/api/subscription/status/${sub.id}`,
      });
      expect(statusRes.statusCode).toBe(200);
      const statusBody = JSON.parse(statusRes.body);
      expect(statusBody.isSubscribed).toBe(true);
      expect(statusBody.status).toBe('active');

      // ─── 2. ONBOARDING & PROFILE CONFIGURATION ───────────────────────
      const profilePayload = {
        subscriberId: sub.id,
        goal,
        ...profileData,
      };

      const profileRes = await app.inject({
        method: 'POST',
        url: '/api/profile',
        payload: profilePayload,
      });
      expect(profileRes.statusCode).toBe(200);
      const profileBody = JSON.parse(profileRes.body);
      expect(profileBody.profile.goal).toBe(goal);
      expect(profileBody.nutrition.calorieTarget).toBeGreaterThan(0);

      // Validate goal-specific caloric target & macro split
      validateNutrition(profileBody.nutrition.calorieTarget, profileBody.nutrition.macros);

      // ─── 3. DIET PLAN GENERATION ────────────────────────────────────
      const planRes = await app.inject({
        method: 'POST',
        url: '/api/diet-plan/generate',
        payload: { subscriberId: sub.id },
      });
      expect(planRes.statusCode).toBe(201);
      const plan = JSON.parse(planRes.body);
      expect(plan.days.length).toBe(7);

      const day1 = plan.days[0];
      const dinnerMeal = day1.meals.find((m: any) => m.mealSlot === 'dinner');
      expect(dinnerMeal).toBeDefined();
      expect(dinnerMeal.items.length).toBeGreaterThan(0);

      const originalItem = dinnerMeal.items[0];
      const initialDinnerCalories = dinnerMeal.subtotal.calories;

      // ─── 4. MEAL CUSTOMIZATION (REMOVE & REPLACE) ───────────────────
      // 4.1 Remove existing item
      const removeRes = await app.inject({
        method: 'DELETE',
        url: '/api/diet-plan/item/remove',
        payload: {
          subscriberId: sub.id,
          day: day1.day,
          mealSlot: 'dinner',
          foodId: originalItem.foodId,
          itemIndex: 0,
        },
      });
      expect(removeRes.statusCode).toBe(200);
      const planAfterRemove = JSON.parse(removeRes.body);
      const dayAfterRemove = planAfterRemove.days.find((d: any) => d.day === day1.day);
      const dinnerAfterRemove = dayAfterRemove.meals.find((m: any) => m.mealSlot === 'dinner');

      expect(dinnerAfterRemove.isCustomized).toBe(true);
      expect(dinnerAfterRemove.subtotal.calories).toBeLessThan(initialDinnerCalories);

      // 4.2 Replace with new item (Egg)
      const addRes = await app.inject({
        method: 'POST',
        url: '/api/diet-plan/item/add',
        payload: {
          subscriberId: sub.id,
          day: day1.day,
          mealSlot: 'dinner',
          foodId: 'food_bengali_dimer_dalna',
          quantity: 100,
          unit: 'g',
        },
      });
      expect(addRes.statusCode).toBe(200);
      const planAfterAdd = JSON.parse(addRes.body);
      const dayAfterAdd = planAfterAdd.days.find((d: any) => d.day === day1.day);
      const dinnerAfterAdd = dayAfterAdd.meals.find((m: any) => m.mealSlot === 'dinner');

      expect(dinnerAfterAdd.isCustomized).toBe(true);
      expect(dinnerAfterAdd.deviationNote).toBeDefined();
      expect(dinnerAfterAdd.items.some((i: any) => i.foodId === 'food_bengali_dimer_dalna')).toBe(true);
      // Totals recalculated accurately
      expect(dinnerAfterAdd.subtotal.calories).toBeGreaterThan(0);

      // ─── 5. FOOD LOGGING & PROGRESS SYNC ───────────────────────────
      const today = new Date().toISOString().split('T')[0];

      // Log food for today
      const logRes = await app.inject({
        method: 'POST',
        url: '/api/food-logs',
        payload: {
          subscriberId: sub.id,
          loggedOn: today,
          mealSlot: 'breakfast',
          foodId: 'food_bengali_dimer_dalna',
          quantity: 100,
          unit: 'g',
        },
      });
      expect(logRes.statusCode).toBe(201);

      // Log body weight
      const weightRes = await app.inject({
        method: 'POST',
        url: '/api/progress/weight',
        payload: {
          subscriberId: sub.id,
          weight_kg: profileData.weight_kg - 0.5,
          loggedOn: today,
        },
      });
      expect(weightRes.statusCode).toBe(201);

      // Verify progress summary reflects both weight and adherence
      const progressRes = await app.inject({
        method: 'GET',
        url: `/api/progress/${sub.id}`,
      });
      expect(progressRes.statusCode).toBe(200);
      const progress = JSON.parse(progressRes.body);

      expect(progress.subscriberId).toBe(sub.id);
      expect(progress.currentWeight_kg).toBe(profileData.weight_kg - 0.5);
      expect(progress.weightHistory.length).toBeGreaterThanOrEqual(1);
      expect(progress.weeklyAdherence.daysLoggedCount).toBeGreaterThanOrEqual(1);
    });
  }

  describe('Production Security & Rate Limiting Hardening', () => {
    it('applies standard security headers on all responses', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/health',
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(res.headers['x-xss-protection']).toBe('1; mode=block');
    });

    it('enforces rate limiting when max requests threshold is exceeded', async () => {
      // Create an app instance with a tight rate limit for deterministic testing
      const rateLimitedApp = await buildApp({
        subscriberRepo,
        profileRepo,
        enableRateLimit: true,
        rateLimitMax: 5,
      });

      for (let i = 0; i < 5; i++) {
        const res = await rateLimitedApp.inject({ method: 'GET', url: '/health' });
        expect(res.statusCode).toBe(200);
      }

      // 6th request within window must be rejected with 429 Too Many Requests
      const blockedRes = await rateLimitedApp.inject({ method: 'GET', url: '/health' });
      expect(blockedRes.statusCode).toBe(429);
      const body = JSON.parse(blockedRes.body);
      expect(body.error).toBe('Too Many Requests');
    });
  });
});
