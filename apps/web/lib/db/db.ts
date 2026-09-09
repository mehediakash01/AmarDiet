import Dexie, { type Table } from 'dexie';
import type {
  CalculatedNutrition,
  FoodItem,
  FoodLogEntry,
  MealSlot,
  UserProfile,
} from '@thali/types';
import { FOOD_DATASET } from '@thali/food-data';

export interface LocalFoodLogEntry extends FoodLogEntry {
  synced: boolean;
}

export interface SyncQueueItem {
  id: string;
  entity: 'food_log' | 'profile';
  action: 'create' | 'update' | 'delete';
  payload: Record<string, unknown>;
  timestamp: string;
  status: 'pending' | 'syncing' | 'failed';
}

export class ThaliDexieDatabase extends Dexie {
  cachedProfile!: Table<UserProfile, string>;
  foods!: Table<FoodItem, string>;
  foodLogs!: Table<LocalFoodLogEntry, string>;
  syncQueue!: Table<SyncQueueItem, string>;

  constructor() {
    super('ThaliTrackerDB');

    this.version(1).stores({
      cachedProfile: 'subscriberId, goal, cuisine_preference',
      foods: 'id, canonicalName, category, *cuisineTags, *localNames, *aliases',
      foodLogs: 'id, subscriberId, loggedOn, mealSlot, foodId, synced',
      syncQueue: 'id, entity, action, status, timestamp',
    });

    this.on('populate', () => {
      this.foods.bulkAdd(FOOD_DATASET);
    });
  }

  async ensureSeeded(): Promise<void> {
    const count = await this.foods.count();
    if (count === 0) {
      await this.foods.bulkPut(FOOD_DATASET);
    }
  }
}

// Singleton database instance
export const db = new ThaliDexieDatabase();

// Seed if needed in browser
if (typeof window !== 'undefined') {
  db.ensureSeeded().catch((err) => console.error('Error seeding Dexie:', err));
}
