import { describe, it, expect, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../apps/api/src/app.js';
import { InMemorySubscriberRepository } from '../../apps/api/src/modules/subscriber/subscriber.repository.js';
import { InMemoryProfileRepository } from '../../apps/api/src/modules/profile/profile.repository.js';

describe('API Integration: Subscriber & Profile Modules', () => {
  let app: FastifyInstance;
  let subscriberRepo: InMemorySubscriberRepository;
  let profileRepo: InMemoryProfileRepository;

  beforeEach(async () => {
    subscriberRepo = new InMemorySubscriberRepository();
    profileRepo = new InMemoryProfileRepository();
    app = await buildApp({
      subscriberRepo,
      profileRepo,
    });
  });

  describe('Health Check', () => {
    it('GET /health returns 200 with ok status', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/health',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
    });
  });

  describe('Subscriber Module', () => {
    it('POST /api/subscribers creates a new subscriber with generated UUID', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/subscribers',
        payload: {},
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.id).toBeDefined();
      expect(body.status).toBe('active');
      expect(body.createdAt).toBeDefined();
    });

    it('POST /api/subscribers with specific phone saves and retrieves', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/subscribers',
        payload: {
          phone: '+8801700000000',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.phone).toBe('+8801700000000');

      // Retrieve via GET
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/subscribers/${body.id}`,
      });
      expect(getRes.statusCode).toBe(200);
      const getBody = JSON.parse(getRes.body);
      expect(getBody.id).toBe(body.id);
      expect(getBody.phone).toBe('+8801700000000');
    });

    it('GET /api/subscribers/:id returns 404 for non-existent subscriber', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/subscribers/non-existent-id',
      });
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('Subscriber not found');
    });
  });

  describe('Profile & Onboarding Module', () => {
    it('POST /api/profile saves profile and returns on-the-fly calculated nutrition targets', async () => {
      // 1. Create a subscriber
      const subRes = await app.inject({
        method: 'POST',
        url: '/api/subscribers',
        payload: { phone: '+8801811111111' },
      });
      const sub = JSON.parse(subRes.body);

      // 2. Save profile: Male, 25, 75kg, 175cm, sedentary, lose_weight
      const profilePayload = {
        subscriberId: sub.id,
        age: 25,
        sex: 'male',
        height_cm: 175,
        weight_kg: 75,
        activity_level: 'sedentary',
        goal: 'lose_weight',
        target_weight_kg: 68,
        cuisine_preference: 'bengali',
        dietary_preferences: {
          allergies: ['peanuts'],
        },
      };

      const saveRes = await app.inject({
        method: 'POST',
        url: '/api/profile',
        payload: profilePayload,
      });

      expect(saveRes.statusCode).toBe(200);
      const result = JSON.parse(saveRes.body);

      // Verify profile saved properly with cuisine metadata
      expect(result.profile.subscriberId).toBe(sub.id);
      expect(result.profile.age).toBe(25);
      expect(result.profile.sex).toBe('male');
      expect(result.profile.cuisine_preference).toBe('bengali');
      expect(result.profile.updated_at).toBeDefined();

      // Verify on-the-fly calculated nutrition targets
      // BMR = 10 * 75 + 6.25 * 175 - 5 * 25 + 5 = 750 + 1093.75 - 125 + 5 = 1723.75
      expect(result.nutrition.bmr).toBe(1723.75);
      // TDEE = 1723.75 * 1.2 = 2068.5
      expect(result.nutrition.tdee).toBe(2068.5);
      // CalorieTarget (lose_weight) = 2068.5 - 500 = 1568.5
      expect(result.nutrition.calorieTarget).toBe(1568.5);
      expect(result.nutrition.safetyFloorApplied).toBe(false);

      // Protein = 2.2 * 75 = 165g
      expect(result.nutrition.macros.protein_g).toBe(165);
      expect(result.nutrition.macros.fat_g).toBeGreaterThan(0);
      expect(result.nutrition.macros.carbs_g).toBeGreaterThan(0);

      // Verify caloric sum approximately matches total
      const macroCalories =
        result.nutrition.macros.protein_g * 4 +
        result.nutrition.macros.carbs_g * 4 +
        result.nutrition.macros.fat_g * 9;
      expect(Math.abs(macroCalories - result.nutrition.calorieTarget)).toBeLessThanOrEqual(5);
    });

    it('GET /api/profile/:subscriberId returns saved profile and fresh nutrition calculation', async () => {
      // Direct POST profile (auto-creates subscriber if not exists)
      const subId = 'test-sub-12345';
      const profilePayload = {
        subscriberId: subId,
        age: 30,
        sex: 'female',
        height_cm: 160,
        weight_kg: 55,
        activity_level: 'active',
        goal: 'build_muscle',
        cuisine_preference: 'western',
      };

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/profile',
        payload: profilePayload,
      });
      expect(postRes.statusCode).toBe(200);

      // Fetch via GET
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/profile/${subId}`,
      });
      expect(getRes.statusCode).toBe(200);
      const getResult = JSON.parse(getRes.body);

      expect(getResult.profile.subscriberId).toBe(subId);
      expect(getResult.profile.cuisine_preference).toBe('western');
      expect(getResult.nutrition.calorieTarget).toBeGreaterThan(0);
      // build_muscle protein = 2.4 * 55 = 132g
      expect(getResult.nutrition.macros.protein_g).toBe(132);
    });

    it('GET /api/profile/:subscriberId returns 404 for unknown profile', async () => {
      const getRes = await app.inject({
        method: 'GET',
        url: '/api/profile/unknown-subscriber-id',
      });
      expect(getRes.statusCode).toBe(404);
      const body = JSON.parse(getRes.body);
      expect(body.error).toBe('Profile not found for subscriber');
    });

    it('POST /api/profile rejects invalid input with 400 and validation errors', async () => {
      const invalidPayload = {
        subscriberId: 'sub-invalid',
        age: 5, // < 10 minimum
        sex: 'other', // invalid enum
        height_cm: -100, // negative
        weight_kg: 0, // not positive
        activity_level: 'super_hero', // invalid enum
        goal: 'flying', // invalid enum
      };

      const res = await app.inject({
        method: 'POST',
        url: '/api/profile',
        payload: invalidPayload,
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('Validation failed');
      expect(body.details).toBeInstanceOf(Array);
      expect(body.details.length).toBeGreaterThan(0);
    });

    it('Supports all 4 goals across Bengali, Western, and Mixed cuisine preferences', async () => {
      const testCases = [
        { goal: 'lose_weight', cuisine: 'bengali', sex: 'male' },
        { goal: 'maintain', cuisine: 'western', sex: 'female' },
        { goal: 'gain_weight', cuisine: 'mixed', sex: 'male' },
        { goal: 'build_muscle', cuisine: 'bengali', sex: 'female' },
      ] as const;

      for (const tc of testCases) {
        const id = `sub-goal-${tc.goal}-${tc.cuisine}`;
        const res = await app.inject({
          method: 'POST',
          url: '/api/profile',
          payload: {
            subscriberId: id,
            age: 28,
            sex: tc.sex,
            height_cm: 170,
            weight_kg: 70,
            activity_level: 'lightly_active',
            goal: tc.goal,
            cuisine_preference: tc.cuisine,
          },
        });

        expect(res.statusCode).toBe(200);
        const data = JSON.parse(res.body);
        expect(data.profile.goal).toBe(tc.goal);
        expect(data.profile.cuisine_preference).toBe(tc.cuisine);
        expect(data.nutrition.calorieTarget).toBeGreaterThan(1000);
        expect(data.nutrition.macros.protein_g).toBeGreaterThan(0);
        expect(data.nutrition.macros.carbs_g).toBeGreaterThan(0);
        expect(data.nutrition.macros.fat_g).toBeGreaterThan(0);
      }
    });
  });
});
