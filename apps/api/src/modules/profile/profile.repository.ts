import { eq } from 'drizzle-orm';
import type {
  ActivityLevel,
  CuisinePreference,
  Goal,
  Sex,
  UserProfile,
} from '@thali/types';
import type { AppDatabase } from '../../infrastructure/db/index.js';
import { profiles } from '../../infrastructure/db/schema.js';

export interface IProfileRepository {
  findBySubscriberId(subscriberId: string): Promise<UserProfile | null>;
  upsert(profile: Omit<UserProfile, 'updated_at'>): Promise<UserProfile>;
}

export class DrizzleProfileRepository implements IProfileRepository {
  constructor(private db: AppDatabase) {}

  async findBySubscriberId(subscriberId: string): Promise<UserProfile | null> {
    const rows = await this.db
      .select()
      .from(profiles)
      .where(eq(profiles.subscriberId, subscriberId))
      .limit(1);

    if (!rows || rows.length === 0) return null;
    const r = rows[0];

    return {
      subscriberId: r.subscriberId,
      age: r.age,
      sex: r.sex as Sex,
      height_cm: Number(r.height_cm),
      weight_kg: Number(r.weight_kg),
      activity_level: r.activity_level as ActivityLevel,
      goal: r.goal as Goal,
      target_weight_kg: r.target_weight_kg ? Number(r.target_weight_kg) : undefined,
      dietary_preferences: (r.dietary_preferences as Record<string, unknown>) ?? undefined,
      cuisine_preference: r.cuisine_preference as CuisinePreference,
      updated_at: r.updated_at.toISOString(),
    };
  }

  async upsert(data: Omit<UserProfile, 'updated_at'>): Promise<UserProfile> {
    const now = new Date();
    const values = {
      subscriberId: data.subscriberId,
      age: data.age,
      sex: data.sex,
      height_cm: data.height_cm,
      weight_kg: data.weight_kg,
      activity_level: data.activity_level,
      goal: data.goal,
      target_weight_kg: data.target_weight_kg ?? null,
      dietary_preferences: data.dietary_preferences ?? null,
      cuisine_preference: data.cuisine_preference,
      updated_at: now,
    };

    const [row] = await this.db
      .insert(profiles)
      .values(values)
      .onConflictDoUpdate({
        target: profiles.subscriberId,
        set: values,
      })
      .returning();

    return {
      subscriberId: row.subscriberId,
      age: row.age,
      sex: row.sex as Sex,
      height_cm: Number(row.height_cm),
      weight_kg: Number(row.weight_kg),
      activity_level: row.activity_level as ActivityLevel,
      goal: row.goal as Goal,
      target_weight_kg: row.target_weight_kg ? Number(row.target_weight_kg) : undefined,
      dietary_preferences: (row.dietary_preferences as Record<string, unknown>) ?? undefined,
      cuisine_preference: row.cuisine_preference as CuisinePreference,
      updated_at: row.updated_at.toISOString(),
    };
  }
}

export class InMemoryProfileRepository implements IProfileRepository {
  private items = new Map<string, UserProfile>();

  async findBySubscriberId(subscriberId: string): Promise<UserProfile | null> {
    return this.items.get(subscriberId) ?? null;
  }

  async upsert(data: Omit<UserProfile, 'updated_at'>): Promise<UserProfile> {
    const profile: UserProfile = {
      ...data,
      updated_at: new Date().toISOString(),
    };
    this.items.set(data.subscriberId, profile);
    return profile;
  }
}
