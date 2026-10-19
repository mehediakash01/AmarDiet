import type { FastifyPluginAsync } from 'fastify';
import { AdminCreateFoodSchema, AdminPatchFoodSchema } from '@thali/schemas';
import type { FoodService } from '../food/food.service.js';

export const adminRoutes = (
  foodService: FoodService,
  expectedAdminKey = process.env.ADMIN_SECRET_KEY || 'amardiet-admin-secret-2026',
): FastifyPluginAsync => {
  return async (fastify) => {
    // Authenticate all /api/admin routes
    fastify.addHook('preHandler', async (request, reply) => {
      const authHeader = request.headers['x-admin-key'] || request.headers['authorization'];
      let token: string | undefined;

      if (typeof authHeader === 'string') {
        token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
      }

      if (!token || token !== expectedAdminKey) {
        return reply.status(401).send({
          error: 'Unauthorized: Admin access required',
        });
      }
    });

    // Add new food to catalog
    fastify.post('/api/admin/foods', async (request, reply) => {
      const parseResult = AdminCreateFoodSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parseResult.error.errors,
        });
      }

      const food = await foodService.addCustomFood(parseResult.data);
      return reply.status(201).send(food);
    });

    // Update food in catalog
    fastify.patch('/api/admin/foods/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const parseResult = AdminPatchFoodSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parseResult.error.errors,
        });
      }

      const updated = await foodService.updateCustomFood(id, parseResult.data);
      if (!updated) {
        return reply.status(404).send({
          error: `Food item with ID "${id}" not found`,
        });
      }

      return reply.send(updated);
    });
  };
};
