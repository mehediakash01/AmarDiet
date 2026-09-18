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

/**
 * Foods table — the universal, cuisine-agnostic food catalog.
 * This did not previously exist: the food catalog lived only in a static
 * TypeScript array and an in-memory Map, so admin edits and any food added
 * beyond the seed set were lost on every server restart. This table is the
 * real source of truth; the static dataset is now just the seed data used
 * to populate it once.
 */
export const foods = pgTable('foods', {
  id: varchar('id', { length: 64 }).primaryKey(),
  canonicalName: varchar('canonical_name', { length: 256 }).notNull(),
  localNames: jsonb('local_names').notNull().default([]),
  aliases: jsonb('aliases').notNull().default([]),
  cuisineTags: jsonb('cuisine_tags').notNull().default([]),
  category: varchar('category', { length: 64 }).notNull(),
  caloriesPer100g: doublePrecision('calories_per_100g').notNull(),
  proteinPer100g: doublePrecision('protein_per_100g').notNull(),
  carbsPer100g: doublePrecision('carbs_per_100g').notNull(),
  fatPer100g: doublePrecision('fat_per_100g').notNull(),
  fiberPer100g: doublePrecision('fiber_per_100g').notNull().default(0),
  commonServings: jsonb('common_servings').notNull().default([]),
  source: varchar('source', { length: 128 }),
  sourceVersion: varchar('source_version', { length: 32 }),
  verifiedAt: varchar('verified_at', { length: 32 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type FoodRow = typeof foods.$inferSelect;
export type NewFoodRow = typeof foods.$inferInsert;

/**
 * Observability log for the AI meal-scan feature. Deliberately does NOT
 * store the photo itself — decided against keeping images at all (not
 * even temporarily), so there's nothing sensitive sitting in this table
 * beyond the identified food names.
 */
export const mealScanEvents = pgTable('meal_scan_events', {
  id: varchar('id', { length: 64 }).primaryKey(),
  subscriberId: varchar('subscriber_id', { length: 64 })
    .notNull()
    .references(() => subscribers.id, { onDelete: 'cascade' }),
  providerUsed: varchar('provider_used', { length: 32 }), // null if every provider failed
  status: varchar('status', { length: 32 }).notNull(), // success | not_food | low_confidence | all_providers_failed
  confidence: doublePrecision('confidence'),
  identifiedItems: jsonb('identified_items'), // ScannedFoodItem[] — names/quantities only, no image
  latencyMs: integer('latency_ms'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type MealScanEventRow = typeof mealScanEvents.$inferSelect;
export type NewMealScanEventRow = typeof mealScanEvents.$inferInsert;


