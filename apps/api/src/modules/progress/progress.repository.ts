import { desc, eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { WeightLog } from '@thali/types';
import type { AppDatabase } from '../../infrastructure/db/index.js';
import { weightLogs } from '../../infrastructure/db/schema.js';

export interface IWeightLogRepository {
  create(data: { subscriberId: string; weight_kg: number; loggedOn: string }): Promise<WeightLog>;
  findBySubscriber(subscriberId: string): Promise<WeightLog[]>;
}

export class DrizzleWeightLogRepository implements IWeightLogRepository {
  constructor(private db: AppDatabase) {}

  async create(data: { subscriberId: string; weight_kg: number; loggedOn: string }): Promise<WeightLog> {
    const id = `wlog_${Date.now()}_${randomUUID().substring(0, 6)}`;
    const now = new Date();

    const [row] = await this.db
      .insert(weightLogs)
      .values({
        id,
        subscriberId: data.subscriberId,
        weight_kg: data.weight_kg,
        loggedOn: data.loggedOn,
        createdAt: now,
      })
      .returning();

    return {
      id: row.id,
      subscriberId: row.subscriberId,
      weight_kg: Number(row.weight_kg),
      loggedOn: row.loggedOn,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async findBySubscriber(subscriberId: string): Promise<WeightLog[]> {
    const rows = await this.db
      .select()
      .from(weightLogs)
      .where(eq(weightLogs.subscriberId, subscriberId))
      .orderBy(desc(weightLogs.loggedOn));

    return rows.map((r) => ({
      id: r.id,
      subscriberId: r.subscriberId,
      weight_kg: Number(r.weight_kg),
      loggedOn: r.loggedOn,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}

export class InMemoryWeightLogRepository implements IWeightLogRepository {
  private items: WeightLog[] = [];

  async create(data: { subscriberId: string; weight_kg: number; loggedOn: string }): Promise<WeightLog> {
    const log: WeightLog = {
      id: `wlog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      subscriberId: data.subscriberId,
      weight_kg: data.weight_kg,
      loggedOn: data.loggedOn,
      createdAt: new Date().toISOString(),
    };
    this.items.push(log);
    return log;
  }

  async findBySubscriber(subscriberId: string): Promise<WeightLog[]> {
    return this.items
      .filter((i) => i.subscriberId === subscriberId)
      .sort((a, b) => (a.loggedOn > b.loggedOn ? 1 : -1));
  }
}
