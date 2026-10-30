import { and, asc, eq } from 'drizzle-orm';
import type { ExerciseLog } from '@thali/types';
import type { AppDatabase } from '../../infrastructure/db/index.js';
import { exerciseLogs } from '../../infrastructure/db/schema.js';

export interface IExerciseLogRepository {
  create(log: Omit<ExerciseLog, 'createdAt'>): Promise<ExerciseLog>;
  findBySubscriberAndDate(subscriberId: string, date: string): Promise<ExerciseLog[]>;
  /** Deletes the entry only if it belongs to this subscriber. Returns whether a row was removed. */
  delete(id: string, subscriberId: string): Promise<boolean>;
}

type ExerciseLogDbRow = typeof exerciseLogs.$inferSelect;

function toExerciseLog(r: ExerciseLogDbRow): ExerciseLog {
  return {
    id: r.id,
    subscriberId: r.subscriberId,
    loggedOn: r.loggedOn,
    activityKey: r.activityKey,
    activityName: r.activityName,
    minutes: r.minutes,
    met: Number(r.met),
    calories_burned: r.calories_burned,
    createdAt: r.createdAt.toISOString(),
  };
}

export class DrizzleExerciseLogRepository implements IExerciseLogRepository {
  constructor(private db: AppDatabase) {}

  async create(log: Omit<ExerciseLog, 'createdAt'>): Promise<ExerciseLog> {
    const [row] = await this.db
      .insert(exerciseLogs)
      .values({
        id: log.id,
        subscriberId: log.subscriberId,
        loggedOn: log.loggedOn,
        activityKey: log.activityKey,
        activityName: log.activityName,
        minutes: log.minutes,
        met: log.met,
        calories_burned: log.calories_burned,
      })
      .returning();
    return toExerciseLog(row);
  }

  async findBySubscriberAndDate(subscriberId: string, date: string): Promise<ExerciseLog[]> {
    const rows = await this.db
      .select()
      .from(exerciseLogs)
      .where(and(eq(exerciseLogs.subscriberId, subscriberId), eq(exerciseLogs.loggedOn, date)))
      .orderBy(asc(exerciseLogs.createdAt));
    return rows.map(toExerciseLog);
  }

  async delete(id: string, subscriberId: string): Promise<boolean> {
    const result = await this.db
      .delete(exerciseLogs)
      .where(and(eq(exerciseLogs.id, id), eq(exerciseLogs.subscriberId, subscriberId)))
      .returning({ id: exerciseLogs.id });
    return result.length > 0;
  }
}

export class InMemoryExerciseLogRepository implements IExerciseLogRepository {
  private items: ExerciseLog[] = [];

  async create(log: Omit<ExerciseLog, 'createdAt'>): Promise<ExerciseLog> {
    const created: ExerciseLog = { ...log, createdAt: new Date().toISOString() };
    this.items.push(created);
    return { ...created };
  }

  async findBySubscriberAndDate(subscriberId: string, date: string): Promise<ExerciseLog[]> {
    // items are pushed in creation order, which is the order we want to return.
    return this.items
      .filter((i) => i.subscriberId === subscriberId && i.loggedOn === date)
      .map((i) => ({ ...i }));
  }

  async delete(id: string, subscriberId: string): Promise<boolean> {
    const index = this.items.findIndex((i) => i.id === id && i.subscriberId === subscriberId);
    if (index === -1) return false;
    this.items.splice(index, 1);
    return true;
  }
}
