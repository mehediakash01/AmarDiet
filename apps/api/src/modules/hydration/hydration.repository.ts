import { eq, and } from 'drizzle-orm';
import type { FastingSession, WaterLog } from '@thali/types';
import type { AppDatabase } from '../../infrastructure/db/index.js';
import { waterLogs, fastingSessions } from '../../infrastructure/db/schema.js';

export interface IHydrationRepository {
  getWaterLog(subscriberId: string, date: string): Promise<WaterLog | null>;
  upsertWaterLog(log: WaterLog): Promise<WaterLog>;
  getFastingSession(subscriberId: string): Promise<FastingSession | null>;
  saveFastingSession(session: FastingSession): Promise<FastingSession>;
}

export class DrizzleHydrationRepository implements IHydrationRepository {
  constructor(private db: AppDatabase) {}

  async getWaterLog(subscriberId: string, date: string): Promise<WaterLog | null> {
    const rows = await this.db
      .select()
      .from(waterLogs)
      .where(and(eq(waterLogs.subscriberId, subscriberId), eq(waterLogs.loggedOn, date)))
      .limit(1);

    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      subscriberId: r.subscriberId,
      loggedOn: r.loggedOn,
      amount_ml: r.amount_ml,
      target_ml: r.target_ml,
    };
  }

  async upsertWaterLog(log: WaterLog): Promise<WaterLog> {
    const values = {
      id: log.id,
      subscriberId: log.subscriberId,
      loggedOn: log.loggedOn,
      amount_ml: log.amount_ml,
      target_ml: log.target_ml,
      updatedAt: new Date(),
    };

    const existing = await this.getWaterLog(log.subscriberId, log.loggedOn);
    if (existing) {
      await this.db
        .update(waterLogs)
        .set({
          amount_ml: log.amount_ml,
          target_ml: log.target_ml,
          updatedAt: new Date(),
        })
        .where(eq(waterLogs.id, existing.id));
      return { ...log, id: existing.id };
    }

    await this.db.insert(waterLogs).values(values);
    return log;
  }

  async getFastingSession(subscriberId: string): Promise<FastingSession | null> {
    const rows = await this.db
      .select()
      .from(fastingSessions)
      .where(eq(fastingSessions.subscriberId, subscriberId))
      .limit(1);

    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      subscriberId: r.subscriberId,
      mode: r.mode as FastingSession['mode'],
      startTime: r.startTime.toISOString(),
      targetHours: r.targetHours,
      isActive: r.isActive,
    };
  }

  async saveFastingSession(session: FastingSession): Promise<FastingSession> {
    const values = {
      subscriberId: session.subscriberId,
      mode: session.mode,
      startTime: new Date(session.startTime),
      targetHours: session.targetHours,
      isActive: session.isActive,
      updatedAt: new Date(),
    };

    await this.db
      .insert(fastingSessions)
      .values(values)
      .onConflictDoUpdate({
        target: fastingSessions.subscriberId,
        set: values,
      });

    return session;
  }
}

export class InMemoryHydrationRepository implements IHydrationRepository {
  private water = new Map<string, WaterLog>(); // key: `${subscriberId}_${date}`
  private fasting = new Map<string, FastingSession>(); // key: subscriberId

  async getWaterLog(subscriberId: string, date: string): Promise<WaterLog | null> {
    return this.water.get(`${subscriberId}_${date}`) ?? null;
  }

  async upsertWaterLog(log: WaterLog): Promise<WaterLog> {
    this.water.set(`${log.subscriberId}_${log.loggedOn}`, { ...log });
    return log;
  }

  async getFastingSession(subscriberId: string): Promise<FastingSession | null> {
    return this.fasting.get(subscriberId) ?? null;
  }

  async saveFastingSession(session: FastingSession): Promise<FastingSession> {
    this.fasting.set(session.subscriberId, { ...session });
    return session;
  }
}
