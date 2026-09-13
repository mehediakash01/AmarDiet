/**
 * Seeds the `foods` table from the static FOOD_DATASET.
 *
 * This is a one-time (but safe-to-repeat) bootstrap: it upserts every food
 * in the static dataset into the real database. After this runs, the
 * database is the source of truth — the static dataset is only ever used
 * again if you intentionally want to reset/reseed.
 *
 * Usage:
 *   DATABASE_URL=postgres://... pnpm --filter @thali/api db:seed
 */
import 'dotenv/config';
import postgres from 'postgres';
import { FOOD_DATASET } from '@thali/food-data';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(
      '✖ DATABASE_URL is not set. Add it to apps/api/.env or your environment before seeding.',
    );
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { max: 1 });

  try {
    let count = 0;

    for (const food of FOOD_DATASET) {
      await sql`
        INSERT INTO foods (
          id, canonical_name, local_names, aliases, cuisine_tags, category,
          calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
          fiber_per_100g, common_servings, source, source_version, verified_at
        ) VALUES (
          ${food.id}, ${food.canonicalName}, ${sql.json(food.localNames as unknown as postgres.JSONValue)},
          ${sql.json(food.aliases as unknown as postgres.JSONValue)}, ${sql.json(food.cuisineTags as unknown as postgres.JSONValue)}, ${food.category},
          ${food.caloriesPer100g}, ${food.proteinPer100g}, ${food.carbsPer100g},
          ${food.fatPer100g}, ${food.fiberPer100g}, ${sql.json(food.commonServings as unknown as postgres.JSONValue)},
          ${food.source ?? null}, ${food.sourceVersion ?? null}, ${food.verifiedAt ?? null}
        )
        ON CONFLICT (id) DO UPDATE SET
          canonical_name = EXCLUDED.canonical_name,
          local_names = EXCLUDED.local_names,
          aliases = EXCLUDED.aliases,
          cuisine_tags = EXCLUDED.cuisine_tags,
          category = EXCLUDED.category,
          calories_per_100g = EXCLUDED.calories_per_100g,
          protein_per_100g = EXCLUDED.protein_per_100g,
          carbs_per_100g = EXCLUDED.carbs_per_100g,
          fat_per_100g = EXCLUDED.fat_per_100g,
          fiber_per_100g = EXCLUDED.fiber_per_100g,
          common_servings = EXCLUDED.common_servings,
          source = EXCLUDED.source,
          source_version = EXCLUDED.source_version,
          verified_at = EXCLUDED.verified_at,
          updated_at = now()
      `;
      count++;
    }

    console.log(`✓ Seeded/updated ${count} foods in the database.`);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error('✖ Seed failed:', err);
  process.exit(1);
});
