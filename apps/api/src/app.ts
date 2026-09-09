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

export interface AppOptions {
  subscriberRepo?: ISubscriberRepository;
  profileRepo?: IProfileRepository;
  foodLogRepo?: IFoodLogRepository;
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

  if (!subscriberRepo || !profileRepo || !foodLogRepo) {
    const db = getDatabase(options.databaseUrl);
    if (db) {
      subscriberRepo = subscriberRepo || new DrizzleSubscriberRepository(db);
      profileRepo = profileRepo || new DrizzleProfileRepository(db);
      foodLogRepo = foodLogRepo || new DrizzleFoodLogRepository(db);
    } else {
      subscriberRepo = subscriberRepo || new InMemorySubscriberRepository();
      profileRepo = profileRepo || new InMemoryProfileRepository();
      foodLogRepo = foodLogRepo || new InMemoryFoodLogRepository();
    }
  }

  const subscriberService = new SubscriberService(subscriberRepo);
  const profileService = new ProfileService(profileRepo, subscriberRepo);
  const foodService = options.foodService || new FoodService();
  const foodLogService = new FoodLogService(foodLogRepo, foodService);

  await app.register(subscriberRoutes(subscriberService));
  await app.register(profileRoutes(profileService));
  await app.register(foodRoutes(foodService));
  await app.register(foodLogRoutes(foodLogService));

  return app;
}
