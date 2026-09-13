import { eq } from 'drizzle-orm';
import type { FoodItem } from '@thali/types';
import type { AppDatabase } from '../../infrastructure/db/index.js';
import { foods, type FoodRow } from '../../infrastructure/db/schema.js';
import { FOOD_DATASET } from '@thali/food-data';

export interface IFoodRepository {
  findAll(): Promise<FoodItem[]>;
  findById(id: string): Promise<FoodItem | null>;
  upsert(food: FoodItem): Promise<FoodItem>;
}

function rowToFoodItem(row: FoodRow): FoodItem {
  return {
    id: row.id,
    canonicalName: row.canonicalName,
    localNames: (row.localNames as string[]) ?? [],
    aliases: (row.aliases as string[]) ?? [],
    cuisineTags: (row.cuisineTags as string[]) ?? [],
    category: row.category,
    caloriesPer100g: row.caloriesPer100g,
    proteinPer100g: row.proteinPer100g,
    carbsPer100g: row.carbsPer100g,
    fatPer100g: row.fatPer100g,
    fiberPer100g: row.fiberPer100g,
    commonServings: (row.commonServings as FoodItem['commonServings']) ?? [],
    source: row.source ?? undefined,
    sourceVersion: row.sourceVersion ?? undefined,
    verifiedAt: row.verifiedAt ?? undefined,
  };
}

/**
 * Real, persistent food catalog backed by Postgres. This is the path used
 * whenever DATABASE_URL is configured — food data (including admin edits)
 * survives restarts and is shared across every server instance.
 */
export class DrizzleFoodRepository implements IFoodRepository {
  constructor(private db: AppDatabase) {}

  async findAll(): Promise<FoodItem[]> {
    const rows = await this.db.select().from(foods);
    return rows.map(rowToFoodItem);
  }

  async findById(id: string): Promise<FoodItem | null> {
    const rows = await this.db.select().from(foods).where(eq(foods.id, id)).limit(1);
    if (!rows || rows.length === 0) return null;
    return rowToFoodItem(rows[0]);
  }

  async upsert(food: FoodItem): Promise<FoodItem> {
    const now = new Date();
    const [row] = await this.db
      .insert(foods)
      .values({
        id: food.id,
        canonicalName: food.canonicalName,
        localNames: food.localNames,
        aliases: food.aliases,
        cuisineTags: food.cuisineTags,
        category: food.category,
        caloriesPer100g: food.caloriesPer100g,
        proteinPer100g: food.proteinPer100g,
        carbsPer100g: food.carbsPer100g,
        fatPer100g: food.fatPer100g,
        fiberPer100g: food.fiberPer100g,
        commonServings: food.commonServings,
        source: food.source,
        sourceVersion: food.sourceVersion,
        verifiedAt: food.verifiedAt,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: foods.id,
        set: {
          canonicalName: food.canonicalName,
          localNames: food.localNames,
          aliases: food.aliases,
          cuisineTags: food.cuisineTags,
          category: food.category,
          caloriesPer100g: food.caloriesPer100g,
          proteinPer100g: food.proteinPer100g,
          carbsPer100g: food.carbsPer100g,
          fatPer100g: food.fatPer100g,
          fiberPer100g: food.fiberPer100g,
          commonServings: food.commonServings,
          source: food.source,
          sourceVersion: food.sourceVersion,
          verifiedAt: food.verifiedAt,
          updatedAt: now,
        },
      })
      .returning();

    return rowToFoodItem(row);
  }
}

/**
 * Dev-only fallback used when no DATABASE_URL is configured. Seeded from
 * the static dataset so local development still works without Postgres,
 * but nothing written here survives a restart — app.ts logs a clear
 * warning whenever this path is used so it's never a silent surprise.
 */
export class InMemoryFoodRepository implements IFoodRepository {
  private items = new Map<string, FoodItem>();

  constructor() {
    for (const food of FOOD_DATASET) {
      this.items.set(food.id, { ...food });
    }
  }

  async findAll(): Promise<FoodItem[]> {
    return Array.from(this.items.values());
  }

  async findById(id: string): Promise<FoodItem | null> {
    return this.items.get(id) ?? null;
  }

  async upsert(food: FoodItem): Promise<FoodItem> {
    this.items.set(food.id, food);
    return food;
  }
}
