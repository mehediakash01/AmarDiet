import { describe, it, expect, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../apps/api/src/app.js';
import { InMemorySubscriberRepository } from '../../apps/api/src/modules/subscriber/subscriber.repository.js';
import { InMemoryProfileRepository } from '../../apps/api/src/modules/profile/profile.repository.js';
import { InMemoryExerciseLogRepository } from '../../apps/api/src/modules/exercise/exercise.repository.js';
import { calculateExerciseCalories, getExerciseActivity } from '@thali/nutrition-engine';

describe('API Integration: Exercise Logs Module', () => {
  let app: FastifyInstance;
  const subscriberId = 'test-sub-exercise-1';
  const otherSubscriberId = 'test-sub-exercise-2';
  const today = '2026-10-30';
  const yesterday = '2026-10-29';

  const post = (payload: Record<string, unknown>) =>
    app.inject({ method: 'POST', url: '/api/exercise-logs', payload });

  const list = async (sub: string, date: string) => {
    const res = await app.inject({ method: 'GET', url: `/api/exercise-logs?subscriberId=${sub}&date=${date}` });
    return { res, body: JSON.parse(res.body) };
  };

  beforeEach(async () => {
    const subscriberRepo = new InMemorySubscriberRepository();
    const profileRepo = new InMemoryProfileRepository();
    const exerciseRepo = new InMemoryExerciseLogRepository();

    await subscriberRepo.create({ id: subscriberId });
    await subscriberRepo.create({ id: otherSubscriberId });

    // Subscriber 1 has a profile (70 kg). Subscriber 2 deliberately has none.
    await profileRepo.upsert({
      subscriberId,
      age: 28,
      sex: 'male',
      height_cm: 172,
      weight_kg: 70,
      activity_level: 'lightly_active',
      goal: 'maintain',
      target_weight_kg: 70,
      cuisine_preference: 'bengali',
      created_at: new Date().toISOString(),
    });

    app = await buildApp({ subscriberRepo, profileRepo, exerciseRepo });
  });

  it('POST /api/exercise-logs computes calories on the server from the catalog MET and profile weight', async () => {
    const res = await post({ subscriberId, loggedOn: today, activityKey: 'running_10kmh', minutes: 30 });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    // 9.8 METs x 70 kg x 0.5 h = 343 kcal
    expect(body.met).toBe(9.8);
    expect(body.calories_burned).toBe(343);
    expect(body.minutes).toBe(30);
    expect(body.activityKey).toBe('running_10kmh');
    expect(body.activityName).toBe(getExerciseActivity('running_10kmh')!.name);
    expect(body.loggedOn).toBe(today);
    expect(typeof body.id).toBe('string');
    expect(typeof body.createdAt).toBe('string');
  });

  it('matches the nutrition engine exactly', async () => {
    const res = await post({ subscriberId, loggedOn: today, activityKey: 'yoga_hatha', minutes: 45 });
    const body = JSON.parse(res.body);
    expect(body.calories_burned).toBe(calculateExerciseCalories({ met: 2.5, weight_kg: 70, minutes: 45 }));
  });

  it('never trusts met or calories sent by the client', async () => {
    const res = await post({
      subscriberId,
      loggedOn: today,
      activityKey: 'walk_brisk',
      minutes: 60,
      met: 99,
      calories_burned: 99999,
      caloriesBurned: 99999,
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.met).toBe(4.3);
    expect(body.calories_burned).toBe(301); // 4.3 x 70 x 1 h
  });

  it('rejects an unknown activity with 400', async () => {
    const res = await post({ subscriberId, loggedOn: today, activityKey: 'teleporting', minutes: 30 });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/unknown activity/i);
  });

  it('rejects invalid minutes with 400 (0, 601, fractional, text)', async () => {
    for (const minutes of [0, 601, -5, 12.5, '30']) {
      const res = await post({ subscriberId, loggedOn: today, activityKey: 'jogging', minutes });
      expect(res.statusCode).toBe(400);
    }
  });

  it('rejects a bad date and a missing subscriberId with 400', async () => {
    expect((await post({ subscriberId, loggedOn: '30-10-2026', activityKey: 'jogging', minutes: 30 })).statusCode).toBe(400);
    expect((await post({ loggedOn: today, activityKey: 'jogging', minutes: 30 })).statusCode).toBe(400);
  });

  it('rejects logging when the user has no profile (weight unknown) with a helpful message', async () => {
    const res = await post({ subscriberId: otherSubscriberId, loggedOn: today, activityKey: 'jogging', minutes: 30 });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/profile/i);

    const { body } = await list(otherSubscriberId, today);
    expect(body.logs).toHaveLength(0);
  });

  it('GET returns only that subscriber\'s entries for that date, oldest first', async () => {
    await post({ subscriberId, loggedOn: today, activityKey: 'jogging', minutes: 20 });
    await post({ subscriberId, loggedOn: today, activityKey: 'yoga_hatha', minutes: 30 });
    await post({ subscriberId, loggedOn: yesterday, activityKey: 'cricket', minutes: 60 });

    const t = await list(subscriberId, today);
    expect(t.res.statusCode).toBe(200);
    expect(t.body.logs.map((l: { activityKey: string }) => l.activityKey)).toEqual(['jogging', 'yoga_hatha']);

    const y = await list(subscriberId, yesterday);
    expect(y.body.logs).toHaveLength(1);
    expect(y.body.logs[0].activityKey).toBe('cricket');

    const other = await list(otherSubscriberId, today);
    expect(other.body.logs).toHaveLength(0);
  });

  it('GET returns an empty list when nothing is logged, and 400 for a bad query', async () => {
    const empty = await list(subscriberId, today);
    expect(empty.res.statusCode).toBe(200);
    expect(empty.body.logs).toEqual([]);

    const bad = await app.inject({ method: 'GET', url: `/api/exercise-logs?subscriberId=${subscriberId}&date=nope` });
    expect(bad.statusCode).toBe(400);
  });

  it('stores calories at logging time: a later weight change does not rewrite history', async () => {
    const first = JSON.parse((await post({ subscriberId, loggedOn: today, activityKey: 'jogging', minutes: 60 })).body);
    expect(first.calories_burned).toBe(490); // 7.0 x 70 x 1 h

    const { body } = await list(subscriberId, today);
    expect(body.logs[0].calories_burned).toBe(490);
  });

  it('DELETE removes the entry for its owner', async () => {
    const created = JSON.parse((await post({ subscriberId, loggedOn: today, activityKey: 'jogging', minutes: 20 })).body);

    const del = await app.inject({
      method: 'DELETE',
      url: `/api/exercise-logs/${created.id}?subscriberId=${subscriberId}`,
    });
    expect(del.statusCode).toBe(200);
    expect(JSON.parse(del.body)).toEqual({ success: true, id: created.id });

    const { body } = await list(subscriberId, today);
    expect(body.logs).toHaveLength(0);
  });

  it('DELETE returns 404 for another subscriber\'s entry (and leaves it in place) or an unknown id', async () => {
    const created = JSON.parse((await post({ subscriberId, loggedOn: today, activityKey: 'jogging', minutes: 20 })).body);

    const wrongOwner = await app.inject({
      method: 'DELETE',
      url: `/api/exercise-logs/${created.id}?subscriberId=${otherSubscriberId}`,
    });
    expect(wrongOwner.statusCode).toBe(404);
    expect((await list(subscriberId, today)).body.logs).toHaveLength(1);

    const unknown = await app.inject({
      method: 'DELETE',
      url: `/api/exercise-logs/does-not-exist?subscriberId=${subscriberId}`,
    });
    expect(unknown.statusCode).toBe(404);
  });

  it('DELETE without subscriberId is rejected with 400', async () => {
    const created = JSON.parse((await post({ subscriberId, loggedOn: today, activityKey: 'jogging', minutes: 20 })).body);
    const res = await app.inject({ method: 'DELETE', url: `/api/exercise-logs/${created.id}` });
    expect(res.statusCode).toBe(400);
    expect((await list(subscriberId, today)).body.logs).toHaveLength(1);
  });
});
