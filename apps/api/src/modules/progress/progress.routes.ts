import type { FastifyPluginAsync } from 'fastify';
import { LogWeightSchema } from '@thali/schemas';
import type { ProgressService } from './progress.service.js';

export const progressRoutes = (service: ProgressService): FastifyPluginAsync => {
  return async (fastify) => {
    fastify.post('/api/progress/weight', async (request, reply) => {
      const parseResult = LogWeightSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parseResult.error.errors,
        });
      }

      const log = await service.logWeight(parseResult.data);
      return reply.status(201).send(log);
    });

    fastify.get('/api/progress/:subscriberId', async (request, reply) => {
      const { subscriberId } = request.params as { subscriberId: string };
      const summary = await service.getProgressSummary(subscriberId);
      return reply.send(summary);
    });
  };
};
