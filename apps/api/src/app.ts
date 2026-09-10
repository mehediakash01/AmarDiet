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

  // Health check endpoint
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  let subscriberRepo = options.subscriberRepo;
  let profileRepo = options.profileRepo;
  let foodLogRepo = options.foodLogRepo;
  let dietPlanRepo = options.dietPlanRepo;
  let weightLogRepo = options.weightLogRepo;

  if (!subscriberRepo || !profileRepo || !foodLogRepo || !dietPlanRepo || !weightLogRepo) {
    const db = getDatabase(options.databaseUrl);
    if (db) {
      subscriberRepo = subscriberRepo || new DrizzleSubscriberRepository(db);
      profileRepo = profileRepo || new DrizzleProfileRepository(db);
      foodLogRepo = foodLogRepo || new DrizzleFoodLogRepository(db);
      dietPlanRepo = dietPlanRepo || new DrizzleDietPlanRepository(db);
      weightLogRepo = weightLogRepo || new DrizzleWeightLogRepository(db);
    } else {
      subscriberRepo = subscriberRepo || new InMemorySubscriberRepository();
      profileRepo = profileRepo || new InMemoryProfileRepository();
      foodLogRepo = foodLogRepo || new InMemoryFoodLogRepository();
      dietPlanRepo = dietPlanRepo || new InMemoryDietPlanRepository();
      weightLogRepo = weightLogRepo || new InMemoryWeightLogRepository();
    }
  }

  const subscriberService = new SubscriberService(subscriberRepo);
  const profileService = new ProfileService(profileRepo, subscriberRepo);
  const foodService = options.foodService || new FoodService();
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
