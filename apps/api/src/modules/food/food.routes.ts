import type { FastifyPluginAsync } from 'fastify';
import { FoodSearchQuerySchema } from '@thali/schemas';
import type { FoodService } from './food.service.js';

export const foodRoutes = (service: FoodService): FastifyPluginAsync => {
  return async (fastify) => {
    fastify.get('/api/foods/search', async (request, reply) => {
      const parseResult = FoodSearchQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parseResult.error.errors,
        });
      }

      const results = service.searchFoods(parseResult.data);
      return reply.send({
        query: parseResult.data.q,
        total: results.length,
        foods: results,
      });
    });

    fastify.get('/api/foods/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const food = service.getFoodById(id);
      if (!food) {
        return reply.status(404).send({
          error: 'Food item not found',
        });
      }
      return reply.send(food);
    });
  };
};
