import type { FastifyPluginAsync } from 'fastify';
import { SaveProfileSchema } from '@thali/schemas';
import type { ProfileService } from './profile.service.js';

export const profileRoutes = (service: ProfileService): FastifyPluginAsync => {
  return async (fastify) => {
    fastify.post('/api/profile', async (request, reply) => {
      const parseResult = SaveProfileSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parseResult.error.errors,
        });
      }

      const result = await service.saveProfile(parseResult.data);
      return reply.status(200).send(result);
    });

    fastify.get('/api/profile/:subscriberId', async (request, reply) => {
      const { subscriberId } = request.params as { subscriberId: string };
      const result = await service.getProfile(subscriberId);
      if (!result) {
        return reply.status(404).send({
          error: 'Profile not found for subscriber',
        });
      }
      return reply.send(result);
    });
  };
};
