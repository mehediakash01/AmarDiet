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

export interface AppOptions {
  subscriberRepo?: ISubscriberRepository;
  profileRepo?: IProfileRepository;
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

  if (!subscriberRepo || !profileRepo) {
    const db = getDatabase(options.databaseUrl);
    if (db) {
      subscriberRepo = subscriberRepo || new DrizzleSubscriberRepository(db);
      profileRepo = profileRepo || new DrizzleProfileRepository(db);
    } else {
      subscriberRepo = subscriberRepo || new InMemorySubscriberRepository();
      profileRepo = profileRepo || new InMemoryProfileRepository();
    }
  }

  const subscriberService = new SubscriberService(subscriberRepo);
  const profileService = new ProfileService(profileRepo, subscriberRepo);

  await app.register(subscriberRoutes(subscriberService));
  await app.register(profileRoutes(profileService));

  return app;
}
