import { eq, and } from 'drizzle-orm';
import type { CalculatedNutrition, FoodLogEntry, MealSlot } from '@thali/types';
import type { AppDatabase } from '../../infrastructure/db/index.js';
import { foodLogs } from '../../infrastructure/db/schema.js';

export interface IFoodLogRepository {
  findById(id: string): Promise<FoodLogEntry | null>;
  findBySubscriberAndDate(subscriberId: string, date: string): Promise<FoodLogEntry[]>;
  create(entry: Omit<FoodLogEntry, 'createdAt' | 'updatedAt'>): Promise<FoodLogEntry>;
  update(
    id: string,
    updates: Partial<Pick<FoodLogEntry, 'quantity' | 'unit' | 'mealSlot' | 'calculatedNutrition'>>,
  ): Promise<FoodLogEntry | null>;
  delete(id: string): Promise<boolean>;
}

export class DrizzleFoodLogRepository implements IFoodLogRepository {
  constructor(private db: AppDatabase) {}

  async findById(id: string): Promise<FoodLogEntry | null> {
    const rows = await this.db.select().from(foodLogs).where(eq(foodLogs.id, id)).limit(1);
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      subscriberId: r.subscriberId,
      loggedOn: r.loggedOn,
      mealSlot: r.mealSlot as MealSlot,
      foodId: r.foodId,
      foodName: r.foodName ?? undefined,
      quantity: Number(r.quantity),
      unit: r.unit,
      calculatedNutrition: r.calculatedNutrition as CalculatedNutrition,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  async findBySubscriberAndDate(subscriberId: string, date: string): Promise<FoodLogEntry[]> {
    const rows = await this.db
      .select()
      .from(foodLogs)
      .where(and(eq(foodLogs.subscriberId, subscriberId), eq(foodLogs.loggedOn, date)));

    return rows.map((r) => ({
      id: r.id,
      subscriberId: r.subscriberId,
      loggedOn: r.loggedOn,
      mealSlot: r.mealSlot as MealSlot,
      foodId: r.foodId,
      foodName: r.foodName ?? undefined,
      quantity: Number(r.quantity),
      unit: r.unit,
      calculatedNutrition: r.calculatedNutrition as CalculatedNutrition,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async create(entry: Omit<FoodLogEntry, 'createdAt' | 'updatedAt'>): Promise<FoodLogEntry> {
    const now = new Date();
    const [row] = await this.db
      .insert(foodLogs)
      .values({
        id: entry.id,
        subscriberId: entry.subscriberId,
        loggedOn: entry.loggedOn,
        mealSlot: entry.mealSlot,
        foodId: entry.foodId,
        foodName: entry.foodName,
        quantity: entry.quantity,
        unit: entry.unit,
        calculatedNutrition: entry.calculatedNutrition,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return {
      id: row.id,
      subscriberId: row.subscriberId,
      loggedOn: row.loggedOn,
      mealSlot: row.mealSlot as MealSlot,
      foodId: row.foodId,
      foodName: row.foodName ?? undefined,
      quantity: Number(row.quantity),
      unit: row.unit,
      calculatedNutrition: row.calculatedNutrition as CalculatedNutrition,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async update(
    id: string,
    updates: Partial<Pick<FoodLogEntry, 'quantity' | 'unit' | 'mealSlot' | 'calculatedNutrition'>>,
  ): Promise<FoodLogEntry | null> {
    const values: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (updates.quantity !== undefined) values.quantity = updates.quantity;
    if (updates.unit !== undefined) values.unit = updates.unit;
    if (updates.mealSlot !== undefined) values.mealSlot = updates.mealSlot;
    if (updates.calculatedNutrition !== undefined) {
      values.calculatedNutrition = updates.calculatedNutrition;
    }

    const [row] = await this.db
      .update(foodLogs)
      .set(values)
      .where(eq(foodLogs.id, id))
      .returning();

    if (!row) return null;

    return {
      id: row.id,
      subscriberId: row.subscriberId,
      loggedOn: row.loggedOn,
      mealSlot: row.mealSlot as MealSlot,
      foodId: row.foodId,
      foodName: row.foodName ?? undefined,
      quantity: Number(row.quantity),
      unit: row.unit,
      calculatedNutrition: row.calculatedNutrition as CalculatedNutrition,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.delete(foodLogs).where(eq(foodLogs.id, id)).returning({ id: foodLogs.id });
    return result.length > 0;
  }
}

export class InMemoryFoodLogRepository implements IFoodLogRepository {
  private items = new Map<string, FoodLogEntry>();

  async findById(id: string): Promise<FoodLogEntry | null> {
    return this.items.get(id) ?? null;
  }

  async findBySubscriberAndDate(subscriberId: string, date: string): Promise<FoodLogEntry[]> {
    const results: FoodLogEntry[] = [];
    for (const log of this.items.values()) {
      if (log.subscriberId === subscriberId && log.loggedOn === date) {
        results.push({ ...log });
      }
    }
    return results;
  }

  async create(entry: Omit<FoodLogEntry, 'createdAt' | 'updatedAt'>): Promise<FoodLogEntry> {
    const now = new Date().toISOString();
    const created: FoodLogEntry = {
      ...entry,
      createdAt: now,
      updatedAt: now,
    };
    this.items.set(created.id, created);
    return created;
  }

  async update(
    id: string,
    updates: Partial<Pick<FoodLogEntry, 'quantity' | 'unit' | 'mealSlot' | 'calculatedNutrition'>>,
  ): Promise<FoodLogEntry | null> {
    const existing = this.items.get(id);
    if (!existing) return null;

    const updated: FoodLogEntry = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.items.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
}
