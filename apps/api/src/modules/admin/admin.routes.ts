import type { FastifyPluginAsync } from 'fastify';
import { AdminCreateFoodSchema, AdminPatchFoodSchema } from '@thali/schemas';
import type { FoodService } from '../food/food.service.js';

export const adminRoutes = (foodService: FoodService): FastifyPluginAsync => {
  return async (fastify) => {
    // Add new food to catalog
    fastify.post('/api/admin/foods', async (request, reply) => {
      const parseResult = AdminCreateFoodSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parseResult.error.errors,
        });
      }

      const food = foodService.addCustomFood(parseResult.data);
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

      const updated = foodService.updateCustomFood(id, parseResult.data);
      if (!updated) {
        return reply.status(404).send({
          error: `Food item with ID "${id}" not found`,
        });
      }

      return reply.send(updated);
    });
  };
};
