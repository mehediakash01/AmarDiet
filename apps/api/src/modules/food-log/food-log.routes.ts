import type { FastifyPluginAsync } from 'fastify';
import {
  CreateFoodLogSchema,
  FoodLogQuerySchema,
  PatchFoodLogSchema,
} from '@thali/schemas';
import type { FoodLogService } from './food-log.service.js';

export const foodLogRoutes = (service: FoodLogService): FastifyPluginAsync => {
  return async (fastify) => {
    // Add food log entry
    fastify.post('/api/food-logs', async (request, reply) => {
      const parseResult = CreateFoodLogSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parseResult.error.errors,
        });
      }

      try {
        const entry = await service.addLogEntry(parseResult.data);
        return reply.status(201).send(entry);
      } catch (err) {
        return reply.status(400).send({
          error: err instanceof Error ? err.message : 'Failed to add food log',
        });
      }
    });

    // Retrieve daily diary with meal groupings and daily totals
    fastify.get('/api/food-logs', async (request, reply) => {
      const parseResult = FoodLogQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parseResult.error.errors,
        });
      }

      const { subscriberId, date } = parseResult.data;
      const diary = await service.getDailyDiary(subscriberId, date);
      return reply.send(diary);
    });

    // Update food log quantity or unit
    fastify.patch('/api/food-logs/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const parseResult = PatchFoodLogSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parseResult.error.errors,
        });
      }

      const updated = await service.updateLogEntry(id, parseResult.data);
      if (!updated) {
        return reply.status(404).send({
          error: 'Food log entry not found',
        });
      }

      return reply.send(updated);
    });

    // Delete food log entry
    fastify.delete('/api/food-logs/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const deleted = await service.deleteLogEntry(id);
      if (!deleted) {
        return reply.status(404).send({
          error: 'Food log entry not found',
        });
      }

      return reply.send({ success: true, id });
    });
  };
};
