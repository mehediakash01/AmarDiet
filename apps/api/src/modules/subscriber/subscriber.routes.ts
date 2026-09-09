import type { FastifyPluginAsync } from 'fastify';
import { CreateSubscriberSchema } from '@thali/schemas';
import type { SubscriberService } from './subscriber.service.js';

export const subscriberRoutes = (service: SubscriberService): FastifyPluginAsync => {
  return async (fastify) => {
    fastify.post('/api/subscribers', async (request, reply) => {
      const parseResult = CreateSubscriberSchema.safeParse(request.body || {});
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parseResult.error.errors,
        });
      }

      const subscriber = await service.getOrCreateSubscriber(parseResult.data);
      return reply.status(201).send(subscriber);
    });

    fastify.get('/api/subscribers/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const subscriber = await service.getSubscriberById(id);
      if (!subscriber) {
        return reply.status(404).send({
          error: 'Subscriber not found',
        });
      }
      return reply.send(subscriber);
    });
  };
};
