import type { FastifyPluginAsync } from 'fastify';
import { DeleteExerciseQuerySchema, ExerciseLogsQuerySchema, LogExerciseSchema } from '@thali/schemas';
import { ExerciseInputError, type ExerciseService } from './exercise.service.js';

export const exerciseRoutes = (service: ExerciseService): FastifyPluginAsync => {
  return async (fastify) => {
    // Log an exercise session. Body: { subscriberId, loggedOn, activityKey, minutes }.
    // met and calories_burned are computed on the server.
    fastify.post('/api/exercise-logs', async (request, reply) => {
      const parseResult = LogExerciseSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parseResult.error.errors,
        });
      }

      try {
        const log = await service.logExercise(parseResult.data);
        return reply.status(201).send(log);
      } catch (err) {
        if (err instanceof ExerciseInputError) {
          return reply.status(400).send({ error: err.message });
        }
        return reply.status(500).send({
          error: err instanceof Error ? err.message : 'Failed to log exercise',
        });
      }
    });

    // List one day's sessions: GET /api/exercise-logs?subscriberId=...&date=YYYY-MM-DD
    fastify.get('/api/exercise-logs', async (request, reply) => {
      const parseResult = ExerciseLogsQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parseResult.error.errors,
        });
      }

      const { subscriberId, date } = parseResult.data;
      const logs = await service.getLogsForDate(subscriberId, date);
      return reply.send({ logs });
    });

    // Delete one session: DELETE /api/exercise-logs/:id?subscriberId=...
    // subscriberId is required so one device cannot delete another's entries by guessing an id.
    fastify.delete('/api/exercise-logs/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const parseResult = DeleteExerciseQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parseResult.error.errors,
        });
      }

      const deleted = await service.deleteLog(id, parseResult.data.subscriberId);
      if (!deleted) {
        return reply.status(404).send({ error: 'Exercise log not found' });
      }
      return reply.send({ success: true, id });
    });
  };
};
