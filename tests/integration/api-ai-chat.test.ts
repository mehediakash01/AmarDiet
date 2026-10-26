import { describe, it, expect } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../apps/api/src/app.js';
import { InMemorySubscriberRepository } from '../../apps/api/src/modules/subscriber/subscriber.repository.js';
import { InMemoryProfileRepository } from '../../apps/api/src/modules/profile/profile.repository.js';
import { InMemoryFoodRepository } from '../../apps/api/src/modules/food/food.repository.js';
import { FoodService } from '../../apps/api/src/modules/food/food.service.js';
import { ChatProviderError, type ChatProvider } from '../../apps/api/src/modules/ai/providers/chat-types.js';

function fakeChatProvider(name: string, handler: (prompt: string) => Promise<string>): ChatProvider {
  return {
    name,
    chat: async (systemPrompt, _messages) => handler(systemPrompt),
  };
}

describe('API Integration: AI Nutrition Chatbot with Fallback Gateway', () => {
  let app: FastifyInstance;

  async function buildTestApp(chatProviders: ChatProvider[]) {
    const subscriberRepo = new InMemorySubscriberRepository();
    const profileRepo = new InMemoryProfileRepository();
    const foodService = new FoodService(new InMemoryFoodRepository());
    await foodService.init();

    const subscriber = await subscriberRepo.create({ id: crypto.randomUUID() });

    const fastifyApp = await buildApp({
      subscriberRepo,
      profileRepo,
      foodService,
      chatProviders,
    });

    const profRes = await fastifyApp.inject({
      method: 'POST',
      url: '/api/profile',
      payload: {
        subscriberId: subscriber.id,
        age: 28,
        sex: 'male',
        height_cm: 175,
        weight_kg: 80,
        activity_level: 'active',
        goal: 'lose_weight',
        target_weight_kg: 72,
        dietary_preferences: { allergies: ['none'] },
        cuisine_preference: 'bengali',
      },
    });
    if (profRes.statusCode !== 200) {
      throw new Error(`Profile save failed: ${profRes.body}`);
    }

    return { app: fastifyApp, subscriberId: subscriber.id };
  }

  it('answers chat grounded in user profile with primary provider', async () => {
    let capturedPrompt = '';
    const { app: testApp, subscriberId } = await buildTestApp([
      fakeChatProvider('gemini', async (prompt) => {
        capturedPrompt = prompt;
        return 'Based on your 72kg target weight, eating high protein helps preserve muscle.';
      }),
    ]);
    app = testApp;

    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/chat',
      payload: {
        subscriberId,
        messages: [{ role: 'user', content: 'What should I eat?' }],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.providerUsed).toBe('gemini');
    expect(body.reply).toContain('72kg target weight');
    expect(capturedPrompt).toContain('lose_weight');
    expect(capturedPrompt).toContain('target weight: 72 kg');
  });

  it('automatically falls back to secondary provider when primary fails', async () => {
    const { app: testApp, subscriberId } = await buildTestApp([
      fakeChatProvider('gemini', async () => {
        throw new ChatProviderError('gemini', 'Rate limit exceeded (429)');
      }),
      fakeChatProvider('groq', async () => {
        return 'Groq fallback response: Focus on whole foods and vegetables.';
      }),
    ]);
    app = testApp;

    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/chat',
      payload: {
        subscriberId,
        messages: [{ role: 'user', content: 'Any meal tips?' }],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.providerUsed).toBe('groq');
    expect(body.reply).toBe('Groq fallback response: Focus on whole foods and vegetables.');
  });

  it('returns 503 with attempted providers list when all providers fail', async () => {
    const { app: testApp, subscriberId } = await buildTestApp([
      fakeChatProvider('gemini', async () => {
        throw new ChatProviderError('gemini', 'Gemini down');
      }),
      fakeChatProvider('groq', async () => {
        throw new ChatProviderError('groq', 'Groq down');
      }),
      fakeChatProvider('openrouter', async () => {
        throw new ChatProviderError('openrouter', 'OpenRouter down');
      }),
      fakeChatProvider('mistral', async () => {
        throw new ChatProviderError('mistral', 'Mistral down');
      }),
    ]);
    app = testApp;

    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/chat',
      payload: {
        subscriberId,
        messages: [{ role: 'user', content: 'Hello' }],
      },
    });

    expect(res.statusCode).toBe(503);
    const body = JSON.parse(res.body);
    expect(body.error).toContain('All AI providers are currently unavailable');
    expect(body.error).toContain('gemini, groq, openrouter, mistral');
  });

  it('validates request payload rejects invalid message sequence', async () => {
    const { app: testApp, subscriberId } = await buildTestApp([
      fakeChatProvider('gemini', async () => 'ok'),
    ]);
    app = testApp;

    const emptyRes = await app.inject({
      method: 'POST',
      url: '/api/ai/chat',
      payload: { subscriberId, messages: [] },
    });
    expect(emptyRes.statusCode).toBe(400);

    const nonUserRes = await app.inject({
      method: 'POST',
      url: '/api/ai/chat',
      payload: {
        subscriberId,
        messages: [{ role: 'assistant', content: 'assistant message' }],
      },
    });
    expect(nonUserRes.statusCode).toBe(400);
  });
});
