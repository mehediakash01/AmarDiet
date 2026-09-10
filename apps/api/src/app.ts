import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
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

export interface AppOptions {
  subscriberRepo?: ISubscriberRepository;
  profileRepo?: IProfileRepository;
  foodLogRepo?: IFoodLogRepository;
  dietPlanRepo?: IDietPlanRepository;
  foodService?: FoodService;
  databaseUrl?: string;
  logger?: boolean;
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

  // Health check endpoint
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  let subscriberRepo = options.subscriberRepo;
  let profileRepo = options.profileRepo;
  let foodLogRepo = options.foodLogRepo;
  let dietPlanRepo = options.dietPlanRepo;

  if (!subscriberRepo || !profileRepo || !foodLogRepo || !dietPlanRepo) {
    const db = getDatabase(options.databaseUrl);
    if (db) {
      subscriberRepo = subscriberRepo || new DrizzleSubscriberRepository(db);
      profileRepo = profileRepo || new DrizzleProfileRepository(db);
      foodLogRepo = foodLogRepo || new DrizzleFoodLogRepository(db);
      dietPlanRepo = dietPlanRepo || new DrizzleDietPlanRepository(db);
    } else {
      subscriberRepo = subscriberRepo || new InMemorySubscriberRepository();
      profileRepo = profileRepo || new InMemoryProfileRepository();
      foodLogRepo = foodLogRepo || new InMemoryFoodLogRepository();
      dietPlanRepo = dietPlanRepo || new InMemoryDietPlanRepository();
    }
  }

  const subscriberService = new SubscriberService(subscriberRepo);
  const profileService = new ProfileService(profileRepo, subscriberRepo);
  const foodService = options.foodService || new FoodService();
  const foodLogService = new FoodLogService(foodLogRepo, foodService);
  const dietPlanService = new DietPlanService(dietPlanRepo, profileService, foodService);

  await app.register(subscriberRoutes(subscriberService));
  await app.register(profileRoutes(profileService));
  await app.register(foodRoutes(foodService));
  await app.register(foodLogRoutes(foodLogService));
  await app.register(dietPlanRoutes(dietPlanService));

  return app;
}
