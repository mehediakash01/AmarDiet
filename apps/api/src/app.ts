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
import { adminRoutes } from './modules/admin/admin.routes.js';

export interface AppOptions {
  subscriberRepo?: ISubscriberRepository;
  profileRepo?: IProfileRepository;
  foodLogRepo?: IFoodLogRepository;
  dietPlanRepo?: IDietPlanRepository;
  weightLogRepo?: IWeightLogRepository;
  foodRepo?: IFoodRepository;
  foodService?: FoodService;
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

  let subscriberRepo = options.subscriberRepo;
  let profileRepo = options.profileRepo;
  let foodLogRepo = options.foodLogRepo;
  let dietPlanRepo = options.dietPlanRepo;
  let weightLogRepo = options.weightLogRepo;
  let foodRepo = options.foodRepo;

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
    !foodRepo
  ) {
    if (db) {
      subscriberRepo = subscriberRepo || new DrizzleSubscriberRepository(db);
      profileRepo = profileRepo || new DrizzleProfileRepository(db);
      foodLogRepo = foodLogRepo || new DrizzleFoodLogRepository(db);
      dietPlanRepo = dietPlanRepo || new DrizzleDietPlanRepository(db);
      weightLogRepo = weightLogRepo || new DrizzleWeightLogRepository(db);
      foodRepo = foodRepo || new DrizzleFoodRepository(db);
    } else {
      subscriberRepo = subscriberRepo || new InMemorySubscriberRepository();
      profileRepo = profileRepo || new InMemoryProfileRepository();
      foodLogRepo = foodLogRepo || new InMemoryFoodLogRepository();
      dietPlanRepo = dietPlanRepo || new InMemoryDietPlanRepository();
      weightLogRepo = weightLogRepo || new InMemoryWeightLogRepository();
      foodRepo = foodRepo || new InMemoryFoodRepository();
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

  await app.register(subscriberRoutes(subscriberService));
  await app.register(profileRoutes(profileService));
  await app.register(foodRoutes(foodService));
  await app.register(foodLogRoutes(foodLogService));
  await app.register(dietPlanRoutes(dietPlanService));
  await app.register(progressRoutes(progressService));
  await app.register(adminRoutes(foodService));

  return app;
}
