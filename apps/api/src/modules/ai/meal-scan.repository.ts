import { randomUUID } from 'crypto';
import type { MealScanResult } from '@thali/schemas';
import type { AppDatabase } from '../../infrastructure/db/index.js';
import { mealScanEvents } from '../../infrastructure/db/schema.js';

export type MealScanStatus = 'success' | 'not_food' | 'low_confidence' | 'all_providers_failed';

export interface MealScanEvent {
  id: string;
  subscriberId: string;
  providerUsed: string | null;
  status: MealScanStatus;
  confidence: number | null;
  identifiedItems: MealScanResult['items'] | null;
  latencyMs: number | null;
  createdAt: string;
}

export interface IMealScanRepository {
  record(event: Omit<MealScanEvent, 'id' | 'createdAt'>): Promise<MealScanEvent>;
}

export class DrizzleMealScanRepository implements IMealScanRepository {
  constructor(private db: AppDatabase) {}

  async record(event: Omit<MealScanEvent, 'id' | 'createdAt'>): Promise<MealScanEvent> {
    const id = `scan_${Date.now()}_${randomUUID().substring(0, 8)}`;
    const [row] = await this.db
      .insert(mealScanEvents)
      .values({
        id,
        subscriberId: event.subscriberId,
        providerUsed: event.providerUsed,
        status: event.status,
        confidence: event.confidence,
        identifiedItems: event.identifiedItems,
        latencyMs: event.latencyMs,
      })
      .returning();

    return {
      id: row.id,
      subscriberId: row.subscriberId,
      providerUsed: row.providerUsed,
      status: row.status as MealScanStatus,
      confidence: row.confidence,
      identifiedItems: row.identifiedItems as MealScanResult['items'] | null,
      latencyMs: row.latencyMs,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

/** Dev-only fallback, mirrors the pattern used for every other module. */
export class InMemoryMealScanRepository implements IMealScanRepository {
  private events: MealScanEvent[] = [];

  async record(event: Omit<MealScanEvent, 'id' | 'createdAt'>): Promise<MealScanEvent> {
    const record: MealScanEvent = {
      ...event,
      id: `scan_${Date.now()}_${randomUUID().substring(0, 8)}`,
      createdAt: new Date().toISOString(),
    };
    this.events.push(record);
    return record;
  }
}
