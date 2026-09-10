import type { FastifyPluginAsync } from 'fastify';
import {
  AddDietPlanItemSchema,
  GenerateDietPlanSchema,
  RemoveDietPlanItemSchema,
} from '@thali/schemas';
import type { DietPlanService } from './diet-plan.service.js';

export const dietPlanRoutes = (service: DietPlanService): FastifyPluginAsync => {
  return async (fastify) => {
    // Generate new 7-day adaptive plan
    fastify.post('/api/diet-plan/generate', async (request, reply) => {
      const parseResult = GenerateDietPlanSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parseResult.error.errors,
        });
      }

      try {
        const plan = await service.generatePlan(parseResult.data.subscriberId);
        return reply.status(201).send(plan);
      } catch (err) {
        return reply.status(400).send({
          error: err instanceof Error ? err.message : 'Failed to generate plan',
        });
      }
    });

    // Retrieve active diet plan for subscriber
    fastify.get('/api/diet-plan/:subscriberId', async (request, reply) => {
      const { subscriberId } = request.params as { subscriberId: string };
      let plan = await service.getPlanBySubscriberId(subscriberId);
      if (!plan) {
        try {
          plan = await service.generatePlan(subscriberId);
        } catch {
          return reply.status(404).send({
            error: 'Diet plan not found, and could not auto-generate (missing profile)',
          });
        }
      }
      return reply.send(plan);
    });

    // Add food item to a specific day / meal slot
    fastify.post('/api/diet-plan/item/add', async (request, reply) => {
      const parseResult = AddDietPlanItemSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parseResult.error.errors,
        });
      }

      try {
        const updated = await service.addItemToMeal(parseResult.data);
        return reply.send(updated);
      } catch (err) {
        return reply.status(400).send({
          error: err instanceof Error ? err.message : 'Failed to add item to meal',
        });
      }
    });

    // Remove food item from a meal slot
    fastify.delete('/api/diet-plan/item/remove', async (request, reply) => {
      const parseResult = RemoveDietPlanItemSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parseResult.error.errors,
        });
      }

      try {
        const updated = await service.removeItemFromMeal(parseResult.data);
        return reply.send(updated);
      } catch (err) {
        return reply.status(400).send({
          error: err instanceof Error ? err.message : 'Failed to remove item from meal',
        });
      }
    });

    // Also support POST for client convenience if DELETE body is not supported in some clients
    fastify.post('/api/diet-plan/item/remove', async (request, reply) => {
      const parseResult = RemoveDietPlanItemSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parseResult.error.errors,
        });
      }

      try {
        const updated = await service.removeItemFromMeal(parseResult.data);
        return reply.send(updated);
      } catch (err) {
        return reply.status(400).send({
          error: err instanceof Error ? err.message : 'Failed to remove item from meal',
        });
      }
    });
  };
};
