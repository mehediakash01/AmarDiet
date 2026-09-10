import { buildApp } from './app.js';

export * from './app.js';
export * from './infrastructure/db/index.js';
export * from './modules/subscriber/subscriber.repository.js';
export * from './modules/subscriber/subscriber.service.js';
export * from './modules/subscriber/subscriber.routes.js';
export * from './modules/profile/profile.repository.js';
export * from './modules/profile/profile.service.js';
export * from './modules/profile/profile.routes.js';
export * from './modules/food/food.service.js';
export * from './modules/food/food.routes.js';
export * from './modules/food-log/food-log.repository.js';
export * from './modules/food-log/food-log.service.js';
export * from './modules/food-log/food-log.routes.js';
export * from './modules/diet-plan/diet-plan.repository.js';
export * from './modules/diet-plan/diet-plan.service.js';
export * from './modules/diet-plan/diet-plan.routes.js';
export * from './modules/progress/progress.repository.js';
export * from './modules/progress/progress.service.js';
export * from './modules/progress/progress.routes.js';
export * from './modules/admin/admin.routes.js';

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
  const app = await buildApp({
    logger: process.env.NODE_ENV !== 'test',
  });

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`Server listening on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Auto-start if executed directly
if (
  process.argv[1] &&
  (process.argv[1].endsWith('index.js') ||
    process.argv[1].endsWith('index.ts') ||
    process.argv[1].includes('src/index') ||
    process.argv[1].includes('src\\index'))
) {
  startServer();
}
