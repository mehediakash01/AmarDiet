import { eq } from 'drizzle-orm';
import type { DietPlan, DietPlanDay } from '@thali/types';
import type { AppDatabase } from '../../infrastructure/db/index.js';
import { dietPlans } from '../../infrastructure/db/schema.js';

export interface IDietPlanRepository {
  findBySubscriberId(subscriberId: string): Promise<DietPlan | null>;
  save(dietPlan: DietPlan): Promise<DietPlan>;
}

export class DrizzleDietPlanRepository implements IDietPlanRepository {
  constructor(private db: AppDatabase) {}

  async findBySubscriberId(subscriberId: string): Promise<DietPlan | null> {
    const rows = await this.db
      .select()
      .from(dietPlans)
      .where(eq(dietPlans.subscriberId, subscriberId))
      .limit(1);

    if (!rows || rows.length === 0) return null;
    const r = rows[0];

    const parsedJson = r.planJson as { days: DietPlanDay[] };

    return {
      id: r.id,
      subscriberId: r.subscriberId,
      version: r.version,
      calorieTarget: Number(r.calorieTarget),
      proteinTarget_g: Number(r.proteinTarget_g),
      carbsTarget_g: Number(r.carbsTarget_g),
      fatTarget_g: Number(r.fatTarget_g),
      days: parsedJson.days || [],
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  async save(plan: DietPlan): Promise<DietPlan> {
    const now = new Date();
    const values = {
      id: plan.id,
      subscriberId: plan.subscriberId,
      version: plan.version,
      calorieTarget: plan.calorieTarget,
      proteinTarget_g: plan.proteinTarget_g,
      carbsTarget_g: plan.carbsTarget_g,
      fatTarget_g: plan.fatTarget_g,
      planJson: { days: plan.days },
      updatedAt: now,
    };

    const [row] = await this.db
      .insert(dietPlans)
      .values({
        ...values,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: dietPlans.id,
        set: values,
      })
      .returning();

    const parsedJson = row.planJson as { days: DietPlanDay[] };

    return {
      id: row.id,
      subscriberId: row.subscriberId,
      version: row.version,
      calorieTarget: Number(row.calorieTarget),
      proteinTarget_g: Number(row.proteinTarget_g),
      carbsTarget_g: Number(row.carbsTarget_g),
      fatTarget_g: Number(row.fatTarget_g),
      days: parsedJson.days || [],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

export class InMemoryDietPlanRepository implements IDietPlanRepository {
  private items = new Map<string, DietPlan>();

  async findBySubscriberId(subscriberId: string): Promise<DietPlan | null> {
    for (const plan of this.items.values()) {
      if (plan.subscriberId === subscriberId) return { ...plan };
    }
    return null;
  }

  async save(plan: DietPlan): Promise<DietPlan> {
    const now = new Date().toISOString();
    const saved: DietPlan = {
      ...plan,
      createdAt: plan.createdAt || now,
      updatedAt: now,
    };
    this.items.set(plan.id, saved);
    return { ...saved };
  }
}
