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
