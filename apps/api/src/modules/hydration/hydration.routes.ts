import type { FastifyPluginAsync } from 'fastify';
import { LogWaterSchema, UpdateFastingSchema } from '@thali/schemas';
import type { HydrationService } from './hydration.service.js';

export const hydrationRoutes = (service: HydrationService): FastifyPluginAsync => {
  return async (fastify) => {
    // Get daily hydration & current fasting session
    fastify.get('/api/hydration/:subscriberId', async (request, reply) => {
      const { subscriberId } = request.params as { subscriberId: string };
      const { date } = request.query as { date?: string };
      const today = date || new Date().toISOString().slice(0, 10);

      const summary = await service.getHydrationData(subscriberId, today);
      return reply.send(summary);
    });

    // Log water intake (delta_ml e.g. +250 or -250)
    fastify.post('/api/hydration/water', async (request, reply) => {
      const parseResult = LogWaterSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parseResult.error.errors,
        });
      }

      try {
        const updated = await service.logWater(parseResult.data);
        return reply.send(updated);
      } catch (err) {
        return reply.status(500).send({
          error: err instanceof Error ? err.message : 'Failed to log water',
        });
      }
    });

    // Update fasting session / start or stop fasting timer
    fastify.post('/api/hydration/fasting', async (request, reply) => {
      const parseResult = UpdateFastingSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parseResult.error.errors,
        });
      }

      try {
        const session = await service.updateFasting(parseResult.data);
        return reply.send(session);
      } catch (err) {
        return reply.status(500).send({
          error: err instanceof Error ? err.message : 'Failed to update fasting session',
        });
      }
    });
  };
};
