import { describe, it, expect, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../apps/api/src/app.js';
import { InMemorySubscriberRepository } from '../../apps/api/src/modules/subscriber/subscriber.repository.js';
import { InMemoryProfileRepository } from '../../apps/api/src/modules/profile/profile.repository.js';
import { InMemoryFoodRepository } from '../../apps/api/src/modules/food/food.repository.js';
import { FoodService } from '../../apps/api/src/modules/food/food.service.js';
import { VisionProviderError, type VisionProvider } from '../../apps/api/src/modules/ai/providers/types.js';
import type { MealScanResult } from '@thali/schemas';

function fakeProvider(name: string, result: () => Promise<MealScanResult>): VisionProvider {
  return { name, analyzeMealPhoto: result };
}

// A tiny valid base64 string is enough — the fake providers never actually
// decode or send it anywhere, they just return canned results. This test
// is about the route/service/gateway wiring, not real image processing.
const FAKE_IMAGE_BASE64 = Buffer.from('not a real image, just test bytes').toString('base64');

describe('API Integration: AI Meal Scan', () => {
  let app: FastifyInstance;
  let subscriberId: string;

  async function buildTestApp(visionProviders: VisionProvider[]) {
    const subscriberRepo = new InMemorySubscriberRepository();
    const profileRepo = new InMemoryProfileRepository();
    const foodService = new FoodService(new InMemoryFoodRepository());
    await foodService.init();

    const subscriber = await subscriberRepo.create({ id: crypto.randomUUID() });
    subscriberId = subscriber.id;

    return buildApp({
      subscriberRepo,
      profileRepo,
      foodService,
      visionProviders,
    });
  }

  it('returns success and real food-database matches when a provider identifies food confidently', async () => {
    app = await buildTestApp([
      fakeProvider('fake-primary', async () => ({
        isFood: true,
        confidence: 0.92,
        items: [{ name: 'rice', estimatedQuantity: 200, estimatedUnit: 'g', confidence: 0.9 }],
      })),
    ]);

    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/scan-meal',
      payload: { subscriberId, imageBase64: FAKE_IMAGE_BASE64, mimeType: 'image/jpeg' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('success');
    expect(body.providerUsed).toBe('fake-primary');
    expect(body.items).toHaveLength(1);
    // The item should carry real matches from our own food database, not
    // invented nutrition — "rice" should match something real.
    expect(body.items[0].matchedFoodCandidates.length).toBeGreaterThan(0);
  });

  it('falls back to the second provider when the first fails, and reports which one actually served it', async () => {
    app = await buildTestApp([
      fakeProvider('flaky', async () => {
        throw new VisionProviderError('flaky', 'simulated outage');
      }),
      fakeProvider('reliable', async () => ({
        isFood: true,
        confidence: 0.8,
        items: [{ name: 'egg', estimatedQuantity: 1, estimatedUnit: 'piece', confidence: 0.8 }],
      })),
    ]);

    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/scan-meal',
      payload: { subscriberId, imageBase64: FAKE_IMAGE_BASE64, mimeType: 'image/jpeg' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('success');
    expect(body.providerUsed).toBe('reliable');
  });

  it('returns an honest failure message when every provider fails — never a fabricated meal', async () => {
    app = await buildTestApp([
      fakeProvider('dead1', async () => {
        throw new VisionProviderError('dead1', 'down');
      }),
      fakeProvider('dead2', async () => {
        throw new VisionProviderError('dead2', 'also down');
      }),
    ]);

    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/scan-meal',
      payload: { subscriberId, imageBase64: FAKE_IMAGE_BASE64, mimeType: 'image/jpeg' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('all_providers_failed');
    expect(body.providerUsed).toBeNull();
    expect(body.items).toEqual([]);
    expect(body.message).toMatch(/manually/i);
  });

  it('respects an honest "not food" answer from the model rather than forcing a guess', async () => {
    app = await buildTestApp([
      fakeProvider('honest', async () => ({
        isFood: false,
        confidence: 0.95,
        items: [],
        notes: 'This appears to be a photo of a laptop, not food.',
      })),
    ]);

    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/scan-meal',
      payload: { subscriberId, imageBase64: FAKE_IMAGE_BASE64, mimeType: 'image/jpeg' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('not_food');
    expect(body.items).toEqual([]);
  });

  it('flags a low-confidence result distinctly from a confident success', async () => {
    app = await buildTestApp([
      fakeProvider('unsure', async () => ({
        isFood: true,
        confidence: 0.2,
        items: [{ name: 'something', estimatedQuantity: 1, estimatedUnit: 'serving', confidence: 0.2 }],
      })),
    ]);

    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/scan-meal',
      payload: { subscriberId, imageBase64: FAKE_IMAGE_BASE64, mimeType: 'image/jpeg' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('low_confidence');
    expect(body.message).toMatch(/not fully confident/i);
  });

  it('rejects a request with no vision providers configured as an honest failure, not a crash', async () => {
    app = await buildTestApp([]);

    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/scan-meal',
      payload: { subscriberId, imageBase64: FAKE_IMAGE_BASE64, mimeType: 'image/jpeg' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('all_providers_failed');
  });

  it('rejects an oversized image before ever calling a provider', async () => {
    let providerWasCalled = false;
    app = await buildTestApp([
      fakeProvider('shouldNotBeCalled', async () => {
        providerWasCalled = true;
        return { isFood: true, confidence: 0.9, items: [] };
      }),
    ]);

    // 9MB of base64 text decodes to ~6.75MB — clearly over the service's
    // 6MB decoded-size ceiling, while staying safely under the route's
    // own 10MB Fastify bodyLimit so this test isolates the service's
    // check specifically, not Fastify's separate body-size guard.
    const oversizedBase64 = 'A'.repeat(9 * 1024 * 1024);

    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/scan-meal',
      payload: { subscriberId, imageBase64: oversizedBase64, mimeType: 'image/jpeg' },
    });

    expect(res.statusCode).toBe(413);
    expect(providerWasCalled).toBe(false);
  });

  it('rejects a request missing required fields with a 400, not a 500', async () => {
    app = await buildTestApp([fakeProvider('unused', async () => ({ isFood: true, confidence: 0.9, items: [] }))]);

    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/scan-meal',
      payload: { subscriberId }, // missing imageBase64 and mimeType
    });

    expect(res.statusCode).toBe(400);
  });

  it('rejects an unsupported mime type', async () => {
    app = await buildTestApp([fakeProvider('unused', async () => ({ isFood: true, confidence: 0.9, items: [] }))]);

    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/scan-meal',
      payload: { subscriberId, imageBase64: FAKE_IMAGE_BASE64, mimeType: 'application/pdf' },
    });

    expect(res.statusCode).toBe(400);
  });
});
