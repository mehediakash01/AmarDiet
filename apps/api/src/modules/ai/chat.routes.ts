import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { ChatService } from './chat.service.js';

const ChatRequestBodySchema = z.object({
  subscriberId: z.string().min(1),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(30),
});

export const chatRoutes = (service: ChatService): FastifyPluginAsync => {
  return async (fastify) => {
    fastify.post('/api/ai/chat', async (request, reply) => {
      const parseResult = ChatRequestBodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parseResult.error.issues,
        });
      }

      const result = await service.chat(parseResult.data);

      if (!result.ok) {
        return reply.status(result.status).send({ error: result.error });
      }

      return reply.send(result.data);
    });
  };
};
