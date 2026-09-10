import {
  pgTable,
  varchar,
  integer,
  doublePrecision,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core';

/**
 * Subscribers table — identity & subscription record
 */
export const subscribers = pgTable('subscribers', {
  id: varchar('id', { length: 64 }).primaryKey(),
  phone: varchar('phone', { length: 32 }),
  status: varchar('status', { length: 16 }).default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Profiles table — user anthropometric & onboarding targets
 * cuisine_preference is stored purely as user metadata / AI suggestion bias,
 * never a database divider or exclusionary filter.
 */
export const profiles = pgTable('profiles', {
  subscriberId: varchar('subscriber_id', { length: 64 })
    .primaryKey()
    .references(() => subscribers.id, { onDelete: 'cascade' }),
  age: integer('age').notNull(),
  sex: varchar('sex', { length: 16 }).notNull(),
  height_cm: doublePrecision('height_cm').notNull(),
  weight_kg: doublePrecision('weight_kg').notNull(),
  activity_level: varchar('activity_level', { length: 32 }).notNull(),
  goal: varchar('goal', { length: 32 }).notNull(),
  target_weight_kg: doublePrecision('target_weight_kg'),
  dietary_preferences: jsonb('dietary_preferences'),
  cuisine_preference: varchar('cuisine_preference', { length: 32 })
    .default('mixed')
    .notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type SubscriberRow = typeof subscribers.$inferSelect;
export type NewSubscriberRow = typeof subscribers.$inferInsert;

export type ProfileRow = typeof profiles.$inferSelect;
export type NewProfileRow = typeof profiles.$inferInsert;

/**
 * Food Logs table — per-meal item tracking
 */
export const foodLogs = pgTable('food_logs', {
  id: varchar('id', { length: 64 }).primaryKey(),
  subscriberId: varchar('subscriber_id', { length: 64 })
    .notNull()
    .references(() => subscribers.id, { onDelete: 'cascade' }),
  loggedOn: varchar('logged_on', { length: 16 }).notNull(), // YYYY-MM-DD
  mealSlot: varchar('meal_slot', { length: 16 }).notNull(), // breakfast | lunch | dinner | snack
  foodId: varchar('food_id', { length: 64 }).notNull(),
  foodName: varchar('food_name', { length: 256 }),
  quantity: doublePrecision('quantity').notNull(),
  unit: varchar('unit', { length: 64 }).notNull().default('g'),
  calculatedNutrition: jsonb('calculated_nutrition').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type FoodLogRow = typeof foodLogs.$inferSelect;
export type NewFoodLogRow = typeof foodLogs.$inferInsert;

/**
 * Diet Plans table — 7-day adaptive plan structure & per-meal customization state
 */
export const dietPlans = pgTable('diet_plans', {
  id: varchar('id', { length: 64 }).primaryKey(),
  subscriberId: varchar('subscriber_id', { length: 64 })
    .notNull()
    .references(() => subscribers.id, { onDelete: 'cascade' }),
  version: integer('version').default(1).notNull(),
  calorieTarget: doublePrecision('calorie_target').notNull(),
  proteinTarget_g: doublePrecision('protein_target_g').notNull(),
  carbsTarget_g: doublePrecision('carbs_target_g').notNull(),
  fatTarget_g: doublePrecision('fat_target_g').notNull(),
  planJson: jsonb('plan_json').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type DietPlanRow = typeof dietPlans.$inferSelect;
export type NewDietPlanRow = typeof dietPlans.$inferInsert;

/**
 * Weight Logs table — body weight tracking over time
 */
export const weightLogs = pgTable('weight_logs', {
  id: varchar('id', { length: 64 }).primaryKey(),
  subscriberId: varchar('subscriber_id', { length: 64 })
    .notNull()
    .references(() => subscribers.id, { onDelete: 'cascade' }),
  weight_kg: doublePrecision('weight_kg').notNull(),
  loggedOn: varchar('logged_on', { length: 16 }).notNull(), // YYYY-MM-DD
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type WeightLogRow = typeof weightLogs.$inferSelect;
export type NewWeightLogRow = typeof weightLogs.$inferInsert;


