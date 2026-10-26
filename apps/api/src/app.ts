import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { getDatabase } from './infrastructure/db/index.js';
import {
  type ISubscriberRepository,
  DrizzleSubscriberRepository,
  InMemorySubscriberRepository,
} from './modules/subscriber/subscriber.repository.js';
import { SubscriberService } from './modules/subscriber/subscriber.service.js';
import { subscriberRoutes } from './modules/subscriber/subscriber.routes.js';
import {
  type IProfileRepository,
  DrizzleProfileRepository,
  InMemoryProfileRepository,
} from './modules/profile/profile.repository.js';
import { ProfileService } from './modules/profile/profile.service.js';
import { profileRoutes } from './modules/profile/profile.routes.js';
import { FoodService } from './modules/food/food.service.js';
import {
  type IFoodRepository,
  DrizzleFoodRepository,
  InMemoryFoodRepository,
} from './modules/food/food.repository.js';
import { foodRoutes } from './modules/food/food.routes.js';
import {
  type IFoodLogRepository,
  DrizzleFoodLogRepository,
  InMemoryFoodLogRepository,
} from './modules/food-log/food-log.repository.js';
import { FoodLogService } from './modules/food-log/food-log.service.js';
import { foodLogRoutes } from './modules/food-log/food-log.routes.js';
import {
  type IDietPlanRepository,
  DrizzleDietPlanRepository,
  InMemoryDietPlanRepository,
} from './modules/diet-plan/diet-plan.repository.js';
import { DietPlanService } from './modules/diet-plan/diet-plan.service.js';
import { dietPlanRoutes } from './modules/diet-plan/diet-plan.routes.js';
import {
  type IWeightLogRepository,
  DrizzleWeightLogRepository,
  InMemoryWeightLogRepository,
} from './modules/progress/progress.repository.js';
import { ProgressService } from './modules/progress/progress.service.js';
import { progressRoutes } from './modules/progress/progress.routes.js';
import {
  type IHydrationRepository,
  DrizzleHydrationRepository,
  InMemoryHydrationRepository,
} from './modules/hydration/hydration.repository.js';
import { HydrationService } from './modules/hydration/hydration.service.js';
import { hydrationRoutes } from './modules/hydration/hydration.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { GeminiVisionProvider } from './modules/ai/providers/gemini.provider.js';
import { GroqVisionProvider } from './modules/ai/providers/groq.provider.js';
import { OpenRouterVisionProvider } from './modules/ai/providers/openrouter.provider.js';
import type { VisionProvider } from './modules/ai/providers/types.js';
import { VisionGateway } from './modules/ai/gateway.js';
import {
  type IMealScanRepository,
  DrizzleMealScanRepository,
  InMemoryMealScanRepository,
} from './modules/ai/meal-scan.repository.js';
import { AiService } from './modules/ai/ai.service.js';
import { aiRoutes } from './modules/ai/ai.routes.js';
import { ChatService } from './modules/ai/chat.service.js';
import { chatRoutes } from './modules/ai/chat.routes.js';
import { ChatGateway } from './modules/ai/chat-gateway.js';
import { GeminiChatProvider } from './modules/ai/providers/gemini-chat.provider.js';
import { GroqChatProvider } from './modules/ai/providers/groq-chat.provider.js';
import { OpenRouterChatProvider } from './modules/ai/providers/openrouter-chat.provider.js';
import { MistralChatProvider } from './modules/ai/providers/mistral-chat.provider.js';
import type { ChatProvider } from './modules/ai/providers/chat-types.js';
import {
  type IWebhookEventRepository,
  DrizzleWebhookEventRepository,
  InMemoryWebhookEventRepository,
} from './modules/webhook/webhook-event.repository.js';
import { SubscriptionService } from './modules/subscription/subscription.service.js';
import { subscriptionRoutes } from './modules/subscription/subscription.routes.js';
import { BdappsClient } from './infrastructure/bdapps/bdapps.client.js';

export interface AppOptions {
  subscriberRepo?: ISubscriberRepository;
  profileRepo?: IProfileRepository;
  foodLogRepo?: IFoodLogRepository;
  dietPlanRepo?: IDietPlanRepository;
  weightLogRepo?: IWeightLogRepository;
  foodRepo?: IFoodRepository;
  mealScanRepo?: IMealScanRepository;
  webhookEventRepo?: IWebhookEventRepository;
  hydrationRepo?: IHydrationRepository;
  subscriptionService?: SubscriptionService;
  bdappsClient?: BdappsClient;
  foodService?: FoodService;
  visionProviders?: VisionProvider[];
  aiService?: AiService;
  chatService?: ChatService;
  chatProviders?: ChatProvider[];
  databaseUrl?: string;
  logger?: boolean;
  enableRateLimit?: boolean;
  rateLimitMax?: number;
}

/**
 * Fastify Application Factory
 * Modular monolith composition root.
 */
export async function buildApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? false,
  });

  await app.register(cors, {
    origin: true,
  });

  if (options.enableRateLimit !== false) {
    await app.register(rateLimit, {
      max: options.rateLimitMax ?? 120,
      timeWindow: '1 minute',
      errorResponseBuilder: (_req, context) => ({
        statusCode: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded, retry in ${context.after}`,
      }),
    });
  }

  // Security headers for production hardening
  app.addHook('onSend', async (_request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('X-XSS-Protection', '1; mode=block');
  });

  let subscriberRepo = options.subscriberRepo;
  let profileRepo = options.profileRepo;
  let foodLogRepo = options.foodLogRepo;
  let dietPlanRepo = options.dietPlanRepo;
  let weightLogRepo = options.weightLogRepo;
  let foodRepo = options.foodRepo;
  let mealScanRepo = options.mealScanRepo;
  let webhookEventRepo = options.webhookEventRepo;
  let hydrationRepo = options.hydrationRepo;

  const db = getDatabase(options.databaseUrl);
  const usingRealDatabase = db !== null;

  if (!usingRealDatabase) {
    // This is the single place that decides between real persistence and
    // in-memory fallback. Every server restart wipes in-memory data, so
    // this must never be a silent decision.
    // eslint-disable-next-line no-console
    console.warn(
      '\n⚠️  No DATABASE_URL configured — running on IN-MEMORY storage.\n' +
        '    All data (subscribers, profiles, food logs, plans, weight logs,\n' +
        '    and the food catalog) will be LOST on restart. This is only\n' +
        '    appropriate for local development or tests.\n' +
        '    Set DATABASE_URL and run `pnpm db:migrate` to use a real database.\n',
    );
  }

  if (
    !subscriberRepo ||
    !profileRepo ||
    !foodLogRepo ||
    !dietPlanRepo ||
    !weightLogRepo ||
    !foodRepo ||
    !mealScanRepo ||
    !webhookEventRepo ||
    !hydrationRepo
  ) {
    if (db) {
      subscriberRepo = subscriberRepo || new DrizzleSubscriberRepository(db);
      profileRepo = profileRepo || new DrizzleProfileRepository(db);
      foodLogRepo = foodLogRepo || new DrizzleFoodLogRepository(db);
      dietPlanRepo = dietPlanRepo || new DrizzleDietPlanRepository(db);
      weightLogRepo = weightLogRepo || new DrizzleWeightLogRepository(db);
      foodRepo = foodRepo || new DrizzleFoodRepository(db);
      mealScanRepo = mealScanRepo || new DrizzleMealScanRepository(db);
      webhookEventRepo = webhookEventRepo || new DrizzleWebhookEventRepository(db);
      hydrationRepo = hydrationRepo || new DrizzleHydrationRepository(db);
    } else {
      subscriberRepo = subscriberRepo || new InMemorySubscriberRepository();
      profileRepo = profileRepo || new InMemoryProfileRepository();
      foodLogRepo = foodLogRepo || new InMemoryFoodLogRepository();
      dietPlanRepo = dietPlanRepo || new InMemoryDietPlanRepository();
      weightLogRepo = weightLogRepo || new InMemoryWeightLogRepository();
      foodRepo = foodRepo || new InMemoryFoodRepository();
      mealScanRepo = mealScanRepo || new InMemoryMealScanRepository();
      webhookEventRepo = webhookEventRepo || new InMemoryWebhookEventRepository();
      hydrationRepo = hydrationRepo || new InMemoryHydrationRepository();
    }
  }

  // Health check endpoint — reports the REAL persistence mode, so it's
  // always possible to verify from outside whether data will survive a
  // restart, rather than having to read server logs to find out.
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: usingRealDatabase ? 'connected' : 'in-memory (not persistent)',
  }));

  const subscriberService = new SubscriberService(subscriberRepo);
  const profileService = new ProfileService(profileRepo, subscriberRepo);
  const foodService = options.foodService || new FoodService(foodRepo);
  await foodService.init();
  const foodLogService = new FoodLogService(foodLogRepo, foodService);
  const dietPlanService = new DietPlanService(dietPlanRepo, profileService, foodService);
  const progressService = new ProgressService(weightLogRepo, profileService, foodLogService);

  // AI meal-scan providers — each one only gets registered if BOTH its API
  // key and model name are actually configured. No default model name is
  // ever hardcoded (see providers/*.ts for why): an unconfigured provider
  // is silently skipped from the fallback chain rather than crashing the
  // whole feature, which is exactly what lets more providers get added
  // later just by setting env vars, nothing else.
  const visionProviders: VisionProvider[] = options.visionProviders ?? [];
  if (!options.visionProviders) {
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_VISION_MODEL) {
      visionProviders.push(
        new GeminiVisionProvider(process.env.GEMINI_API_KEY, process.env.GEMINI_VISION_MODEL),
      );
    }
    if (process.env.GROQ_API_KEY && process.env.GROQ_VISION_MODEL) {
      visionProviders.push(
        new GroqVisionProvider(process.env.GROQ_API_KEY, process.env.GROQ_VISION_MODEL),
      );
    }
    if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_VISION_MODEL) {
      visionProviders.push(
        new OpenRouterVisionProvider(
          process.env.OPENROUTER_API_KEY,
          process.env.OPENROUTER_VISION_MODEL,
        ),
      );
    }
    if (visionProviders.length === 0) {
      console.warn(
        '\n⚠️  No AI vision providers configured — /api/ai/scan-meal will always report\n' +
          '    "all_providers_failed". Set at least one of GEMINI_API_KEY+GEMINI_VISION_MODEL,\n' +
          '    GROQ_API_KEY+GROQ_VISION_MODEL, or OPENROUTER_API_KEY+OPENROUTER_VISION_MODEL.\n',
      );
    }
  }
  const visionGateway = new VisionGateway(visionProviders);
  const aiService = options.aiService || new AiService(visionGateway, mealScanRepo, foodService);

  // Nutrition chatbot — multi-provider fallback chain: Gemini → Groq → OpenRouter → Mistral.
  // Each provider is registered only if its API key AND model name are configured.
  // The chat route stays active as long as at least one provider is configured.
  // When a provider hits its rate limit or fails 3 times in a row, the gateway
  // automatically skips it (circuit open) and falls through to the next one.
  const chatProviders: ChatProvider[] = options.chatProviders ?? [];
  if (!options.chatProviders) {
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_CHAT_MODEL) {
      chatProviders.push(
        new GeminiChatProvider(process.env.GEMINI_API_KEY, process.env.GEMINI_CHAT_MODEL),
      );
    }
    if (process.env.GROQ_API_KEY && process.env.GROQ_CHAT_MODEL) {
      chatProviders.push(
        new GroqChatProvider(process.env.GROQ_API_KEY, process.env.GROQ_CHAT_MODEL),
      );
    }
    if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_CHAT_MODEL) {
      chatProviders.push(
        new OpenRouterChatProvider(
          process.env.OPENROUTER_API_KEY,
          process.env.OPENROUTER_CHAT_MODEL,
        ),
      );
    }
    if (process.env.MISTRAL_API_KEY && process.env.MISTRAL_CHAT_MODEL) {
      chatProviders.push(
        new MistralChatProvider(process.env.MISTRAL_API_KEY, process.env.MISTRAL_CHAT_MODEL),
      );
    }
    if (chatProviders.length === 0) {
      console.warn(
        '\n⚠️  No chat providers configured — /api/ai/chat will return 503.\n' +
          '    Set at least one of:\n' +
          '      GEMINI_API_KEY + GEMINI_CHAT_MODEL\n' +
          '      GROQ_API_KEY + GROQ_CHAT_MODEL\n' +
          '      OPENROUTER_API_KEY + OPENROUTER_CHAT_MODEL\n' +
          '      MISTRAL_API_KEY + MISTRAL_CHAT_MODEL\n',
      );
    }
  }
  const chatGateway = new ChatGateway(chatProviders);
  const chatService =
    options.chatService ||
    (chatProviders.length > 0
      ? new ChatService(chatGateway, profileService, foodLogService, dietPlanService)
      : null);

  const bdappsClient = options.bdappsClient || new BdappsClient();
  const subscriptionService =
    options.subscriptionService ||
    new SubscriptionService(subscriberRepo, webhookEventRepo, bdappsClient);

  await app.register(subscriberRoutes(subscriberService));
  await app.register(subscriptionRoutes(subscriptionService));
  await app.register(profileRoutes(profileService));
  await app.register(foodRoutes(foodService));
  await app.register(foodLogRoutes(foodLogService));
  await app.register(dietPlanRoutes(dietPlanService));
  await app.register(progressRoutes(progressService));
  const hydrationService = new HydrationService(hydrationRepo, profileService);
  await app.register(hydrationRoutes(hydrationService));
  await app.register(adminRoutes(foodService));
  await app.register(aiRoutes(aiService));
  if (chatService) {
    await app.register(chatRoutes(chatService));
  } else {
    // Register stub so clients get a clear 503 rather than a 404
    app.post('/api/ai/chat', async (_req, reply) =>
      reply.status(503).send({ error: 'Nutrition chatbot not configured on this server.' }),
    );
  }

  return app;
}
