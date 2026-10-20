import type { FastifyPluginAsync } from 'fastify';
import {
  BdappsWebhookSchema,
  InitiateSubscriptionSchema,
} from '@thali/schemas';
import type { SubscriptionService } from './subscription.service.js';

export const subscriptionRoutes = (
  service: SubscriptionService,
): FastifyPluginAsync => {
  return async (fastify) => {
    /**
     * POST /api/webhooks/bdapps
     *
     * Inbound carrier webhook from Bdapps telco platform.
     * This is the SOLE authority for subscription state changes.
     * Guaranteed idempotent by unique eventId.
     */
    fastify.post('/api/webhooks/bdapps', async (request, reply) => {
      const parseResult = BdappsWebhookSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid webhook payload structure',
          details: parseResult.error.errors,
        });
      }

      try {
        const result = await service.handleWebhook(parseResult.data);
        return reply.status(200).send(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Webhook error';
        if (message.includes('Unauthorized')) {
          return reply.status(403).send({ error: message });
        }
        return reply.status(500).send({ error: message });
      }
    });

    /**
     * POST /api/subscription/initiate
     *
     * Initiates mobile carrier billing for a subscriber.
     * Does NOT activate subscription — only telco webhook can activate.
     */
    fastify.post('/api/subscription/initiate', async (request, reply) => {
      const parseResult = InitiateSubscriptionSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parseResult.error.errors,
        });
      }

      try {
        const result = await service.initiate(
          parseResult.data.subscriberId,
          parseResult.data.phone,
        );
        return reply.status(200).send(result);
      } catch (err) {
        return reply.status(400).send({
          error: err instanceof Error ? err.message : 'Failed to initiate subscription',
        });
      }
    });

    /**
     * GET /api/subscription/status/:subscriberId
     *
     * Read-only subscription status check for a subscriber.
     */
    fastify.get('/api/subscription/status/:subscriberId', async (request, reply) => {
      const { subscriberId } = request.params as { subscriberId: string };
      try {
        const status = await service.getStatus(subscriberId);
        return reply.status(200).send(status);
      } catch (err) {
        return reply.status(404).send({
          error: err instanceof Error ? err.message : 'Subscriber not found',
        });
      }
    });
  };
};
