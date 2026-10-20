import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ISubscriberRepository } from '../subscriber/subscriber.repository.js';

export function createSubscriptionGuard(
  subscriberRepo: ISubscriberRepository,
  options: { enabled?: boolean } = {},
) {
  return async function requireSubscription(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    if (options.enabled === false) {
      return;
    }

    const subscriberId =
      (request.headers['x-subscriber-id'] as string) ||
      (request.params as { subscriberId?: string })?.subscriberId ||
      (request.body as { subscriberId?: string })?.subscriberId;

    if (!subscriberId) {
      return reply.status(401).send({
        error: 'Missing subscriber identity',
        message: 'Header "x-subscriber-id" or subscriberId param is required',
      });
    }

    const subscriber = await subscriberRepo.findById(subscriberId);
    if (!subscriber) {
      return reply.status(404).send({
        error: 'Subscriber not found',
      });
    }

    if (subscriber.status !== 'active') {
      return reply.status(402).send({
        error: 'Payment Required',
        status: subscriber.status,
        message:
          'Active Bdapps carrier subscription (৳2.00/day) required. Browser cannot self-report as subscribed.',
        upgradeUrl: '/settings#subscription',
      });
    }
  };
}
