import type { FastifyPluginAsync } from 'fastify';
import { ScanMealRequestSchema } from '@thali/schemas';
import type { AiService } from './ai.service.js';

export const aiRoutes = (service: AiService): FastifyPluginAsync => {
  return async (fastify) => {
    fastify.post(
      '/api/ai/scan-meal',
      {
        // Base64-encoded images inflate ~33% over raw bytes, plus JSON
        // wrapping — this covers our expected payload with real headroom
        // without raising the global default limit for every other route.
        bodyLimit: 10 * 1024 * 1024, // 10MB
      },
      async (request, reply) => {
        const parseResult = ScanMealRequestSchema.safeParse(request.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: 'Validation failed',
            details: parseResult.error.issues,
          });
        }

        const { subscriberId, imageBase64, mimeType } = parseResult.data;
        const result = await service.scanMeal(subscriberId, imageBase64, mimeType);

        if (!result.ok) {
          return reply.status(result.status).send({ error: result.error });
        }

        return reply.send(result.data);
      },
    );
  };
};
