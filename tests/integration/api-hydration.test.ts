import { describe, it, expect, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../apps/api/src/app.js';
import { InMemorySubscriberRepository } from '../../apps/api/src/modules/subscriber/subscriber.repository.js';
import { InMemoryProfileRepository } from '../../apps/api/src/modules/profile/profile.repository.js';
import { InMemoryHydrationRepository } from '../../apps/api/src/modules/hydration/hydration.repository.js';

describe('API Integration: Hydration & Fasting Module', () => {
  let app: FastifyInstance;
  const subscriberId = 'test-sub-hydration-1';
  const today = '2026-10-27';

  beforeEach(async () => {
    const subscriberRepo = new InMemorySubscriberRepository();
    const profileRepo = new InMemoryProfileRepository();
    const hydrationRepo = new InMemoryHydrationRepository();

    await subscriberRepo.create({ id: subscriberId });
    // User is 80kg -> 80 * 35 = 2800ml -> rounded to nearest 250ml = 2750ml
    await profileRepo.upsert({
      subscriberId,
      age: 26,
      sex: 'male',
      height_cm: 175,
      weight_kg: 80,
      activity_level: 'active',
      goal: 'lose_weight',
      target_weight_kg: 72,
      cuisine_preference: 'bengali',
      created_at: new Date().toISOString(),
    });

    app = await buildApp({
      subscriberRepo,
      profileRepo,
      hydrationRepo,
    });
  });

  it('GET /api/hydration/:subscriberId returns daily water target based on user weight and null fasting', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/hydration/${subscriberId}?date=${today}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.water).toBeDefined();
    expect(body.water.subscriberId).toBe(subscriberId);
    expect(body.water.amount_ml).toBe(0);
    expect(body.water.target_ml).toBe(2750); // 80kg * 35 = 2800ml -> 2750ml rounded to 250ml
    expect(body.fasting).toBeNull();
  });

  it('POST /api/hydration/water increments water intake and clamps to minimum 0', async () => {
    // Log +500ml
    const log1 = await app.inject({
      method: 'POST',
      url: '/api/hydration/water',
      payload: {
        subscriberId,
        date: today,
        delta_ml: 500,
      },
    });
    expect(log1.statusCode).toBe(200);
    expect(JSON.parse(log1.body).amount_ml).toBe(500);

    // Log another +250ml -> 750ml
    const log2 = await app.inject({
      method: 'POST',
      url: '/api/hydration/water',
      payload: {
        subscriberId,
        date: today,
        delta_ml: 250,
      },
    });
    expect(log2.statusCode).toBe(200);
    expect(JSON.parse(log2.body).amount_ml).toBe(750);

    // Decrement by 1000ml -> should clamp to 0, never negative
    const log3 = await app.inject({
      method: 'POST',
      url: '/api/hydration/water',
      payload: {
        subscriberId,
        date: today,
        delta_ml: -1000,
      },
    });
    expect(log3.statusCode).toBe(200);
    expect(JSON.parse(log3.body).amount_ml).toBe(0);
  });

  it('POST /api/hydration/fasting starts intermittent / Ramadan fasting session', async () => {
    const startTime = new Date().toISOString();
    const res = await app.inject({
      method: 'POST',
      url: '/api/hydration/fasting',
      payload: {
        subscriberId,
        mode: '16_8',
        startTime,
        targetHours: 16,
        isActive: true,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.mode).toBe('16_8');
    expect(body.targetHours).toBe(16);
    expect(body.isActive).toBe(true);

    // Verify GET returns this active session
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/hydration/${subscriberId}?date=${today}`,
    });
    const getBody = JSON.parse(getRes.body);
    expect(getBody.fasting).not.toBeNull();
    expect(getBody.fasting.mode).toBe('16_8');
  });

  it('validates request payloads rejecting invalid dates and unknown fasting modes', async () => {
    const invalidDateRes = await app.inject({
      method: 'POST',
      url: '/api/hydration/water',
      payload: {
        subscriberId,
        date: 'not-a-date',
        delta_ml: 250,
      },
    });
    expect(invalidDateRes.statusCode).toBe(400);

    const invalidModeRes = await app.inject({
      method: 'POST',
      url: '/api/hydration/fasting',
      payload: {
        subscriberId,
        mode: 'invalid_mode',
        startTime: new Date().toISOString(),
        targetHours: 16,
        isActive: true,
      },
    });
    expect(invalidModeRes.statusCode).toBe(400);
  });
});
