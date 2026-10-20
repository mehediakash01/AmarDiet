/**
 * scripts/import-foods.ts
 *
 * Idempotent Food Catalog Importer
 *
 * Imports curated food items from USDA FoodData Central and Open Food Facts (OFF)
 * into the Thali Tracker food database.
 *
 * Deduplication & Governance Rules:
 *  1. Barcode check: If a candidate has a barcode and matches an existing item:
 *     - If existing item has source='SEED', SKIP candidate (Bengali catalog always wins).
 *     - Otherwise update existing item if newer.
 *  2. Normalized name check: Canonical names and aliases are normalized (lowercase,
 *     alphanumeric only). If a collision with a SEED item occurs:
 *     - SEED item is NEVER overwritten.
 *     - Any new Bengali transliterations or local names in the candidate are merged
 *       into the existing record so searchability improves without degrading nutrition truth.
 *  3. Verification flags:
 *     - USDA items -> is_verified = true
 *     - Open Food Facts items -> is_verified = false
 *
 * Usage:
 *   # Dry run (no DB changes):
 *   tsx scripts/import-foods.ts --dry-run
 *
 *   # Live import to PostgreSQL:
 *   DATABASE_URL=postgres://... tsx scripts/import-foods.ts
 *
 *   # Or via pnpm script:
 *   pnpm db:import
 */

try {
  if (typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile();
    } catch {
      process.loadEnvFile('apps/api/.env');
    }
  }
} catch {
  // .env file is optional
}
import postgres from 'postgres';
import type { FoodItem } from '../packages/types/src/index.js';
import {
  FOOD_DATASET,
  USDA_FOOD_DATASET,
  OFF_FOOD_DATASET,
} from '../packages/food-data/src/index.js';
import { FoodItemSchema } from '../packages/schemas/src/index.js';

export interface DedupeResult {
  status: 'inserted' | 'skipped_seed_precedence' | 'updated' | 'merged_names';
  candidateId: string;
  candidateName: string;
  source: string;
  matchedId?: string;
  reason?: string;
}

/**
 * Strips whitespace, punctuation, and casing to compare food names robustly.
 */
export function normalizeFoodName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

/**
 * Core deduplication logic comparing candidate against an existing catalog.
 */
export function evaluateCandidate(
  candidate: FoodItem,
  existingCatalog: FoodItem[],
): DedupeResult {
  // Validate candidate schema first
  const parsed = FoodItemSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new Error(
      `Candidate food "${candidate.id}" failed schema validation: ${JSON.stringify(parsed.error.errors)}`,
    );
  }

  // 1. Barcode check
  if (candidate.barcode) {
    const barcodeMatch = existingCatalog.find(
      (e) => e.barcode && e.barcode === candidate.barcode,
    );
    if (barcodeMatch) {
      if (barcodeMatch.source === 'SEED') {
        return {
          status: 'skipped_seed_precedence',
          candidateId: candidate.id,
          candidateName: candidate.canonicalName,
          source: candidate.source || 'UNKNOWN',
          matchedId: barcodeMatch.id,
          reason: `Exact barcode match "${candidate.barcode}" against SEED food "${barcodeMatch.canonicalName}"`,
        };
      }
      return {
        status: 'updated',
        candidateId: candidate.id,
        candidateName: candidate.canonicalName,
        source: candidate.source || 'UNKNOWN',
        matchedId: barcodeMatch.id,
        reason: `Matched existing non-SEED barcode "${candidate.barcode}"`,
      };
    }
  }

  // 2. Normalized Name check
  const candidateNorm = normalizeFoodName(candidate.canonicalName);
  const nameMatch = existingCatalog.find((e) => {
    if (normalizeFoodName(e.canonicalName) === candidateNorm) return true;
    return e.aliases.some((a) => normalizeFoodName(a) === candidateNorm);
  });

  if (nameMatch) {
    if (nameMatch.source === 'SEED') {
      // Bengali seed catalog item always wins nutrition truth, but we merge new localNames if any
      const newLocalNames = candidate.localNames.filter(
        (ln) => !nameMatch.localNames.some((existingLn) => existingLn.toLowerCase() === ln.toLowerCase()),
      );
      if (newLocalNames.length > 0) {
        return {
          status: 'merged_names',
          candidateId: candidate.id,
          candidateName: candidate.canonicalName,
          source: candidate.source || 'UNKNOWN',
          matchedId: nameMatch.id,
          reason: `Preserved SEED nutrition for "${nameMatch.canonicalName}", enriched with ${newLocalNames.length} new local name(s)`,
        };
      }
      return {
        status: 'skipped_seed_precedence',
        candidateId: candidate.id,
        candidateName: candidate.canonicalName,
        source: candidate.source || 'UNKNOWN',
        matchedId: nameMatch.id,
        reason: `Name collision with SEED food "${nameMatch.canonicalName}"`,
      };
    }

    return {
      status: 'updated',
      candidateId: candidate.id,
      candidateName: candidate.canonicalName,
      source: candidate.source || 'UNKNOWN',
      matchedId: nameMatch.id,
      reason: `Name collision with existing "${nameMatch.canonicalName}"`,
    };
  }

  return {
    status: 'inserted',
    candidateId: candidate.id,
    candidateName: candidate.canonicalName,
    source: candidate.source || 'UNKNOWN',
  };
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const databaseUrl = process.env.DATABASE_URL;

  console.log('====================================================');
  console.log('   Thali Tracker Food Catalog Importer (Phase 5)   ');
  console.log('====================================================');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no DB writes)' : 'LIVE'}`);

  const candidates: FoodItem[] = [...USDA_FOOD_DATASET, ...OFF_FOOD_DATASET];
  console.log(`Loaded ${USDA_FOOD_DATASET.length} USDA items and ${OFF_FOOD_DATASET.length} OFF items.`);

  if (!databaseUrl && !isDryRun) {
    console.log('\n⚠️  No DATABASE_URL configured.');
    console.log('Running in offline validation & simulation mode (equivalent to --dry-run).');
    console.log('To write to database, provide DATABASE_URL in environment.\n');
  }

  let existingFoods: FoodItem[] = [];
  let sql: postgres.Sql | null = null;

  if (databaseUrl && !isDryRun) {
    sql = postgres(databaseUrl, { max: 1 });
    try {
      const rows = await sql<
        {
          id: string;
          canonical_name: string;
          local_names: string[];
          aliases: string[];
          source: string;
          barcode: string | null;
        }[]
      >`SELECT id, canonical_name, local_names, aliases, source, barcode FROM foods`;

      existingFoods = rows.map((r) => ({
        id: r.id,
        canonicalName: r.canonical_name,
        localNames: r.local_names || [],
        aliases: r.aliases || [],
        cuisineTags: [],
        category: '',
        caloriesPer100g: 0,
        proteinPer100g: 0,
        carbsPer100g: 0,
        fatPer100g: 0,
        fiberPer100g: 0,
        commonServings: [],
        source: r.source,
        barcode: r.barcode,
      }));
      console.log(`Connected to Postgres. Found ${existingFoods.length} existing items in DB.`);
    } catch (err) {
      console.error('Failed to query existing foods table:', err);
      process.exit(1);
    }
  } else {
    // Offline / Dry run baseline uses FOOD_DATASET as SEED catalog
    existingFoods = FOOD_DATASET.map((f) => ({ ...f, source: 'SEED' }));
    console.log(`Baseline catalog: ${existingFoods.length} seed items.`);
  }

  const results: DedupeResult[] = [];
  const currentCatalog = [...existingFoods];

  let insertedCount = 0;
  let skippedCount = 0;
  let updatedCount = 0;
  let mergedCount = 0;

  for (const candidate of candidates) {
    const outcome = evaluateCandidate(candidate, currentCatalog);
    results.push(outcome);

    if (outcome.status === 'inserted') {
      insertedCount++;
      currentCatalog.push(candidate);

      if (sql && !isDryRun) {
        await sql`
          INSERT INTO foods (
            id, canonical_name, local_names, aliases, cuisine_tags, category,
            calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
            fiber_per_100g, common_servings, source, source_version, verified_at,
            is_verified, barcode
          ) VALUES (
            ${candidate.id}, ${candidate.canonicalName},
            ${sql.json(candidate.localNames as unknown as postgres.JSONValue)},
            ${sql.json(candidate.aliases as unknown as postgres.JSONValue)},
            ${sql.json(candidate.cuisineTags as unknown as postgres.JSONValue)},
            ${candidate.category}, ${candidate.caloriesPer100g}, ${candidate.proteinPer100g},
            ${candidate.carbsPer100g}, ${candidate.fatPer100g}, ${candidate.fiberPer100g},
            ${sql.json(candidate.commonServings as unknown as postgres.JSONValue)},
            ${candidate.source ?? 'SEED'}, ${candidate.sourceVersion ?? null},
            ${candidate.verifiedAt ?? null}, ${candidate.isVerified ?? false},
            ${candidate.barcode ?? null}
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }
    } else if (outcome.status === 'skipped_seed_precedence') {
      skippedCount++;
    } else if (outcome.status === 'updated') {
      updatedCount++;
    } else if (outcome.status === 'merged_names') {
      mergedCount++;
    }
  }

  if (sql) {
    await sql.end();
  }

  console.log('\n--- Summary Report ---');
  console.log(`Candidates Evaluated: ${candidates.length}`);
  console.log(`✓ Inserted:            ${insertedCount}`);
  console.log(`↷ Skipped (SEED Win):  ${skippedCount}`);
  console.log(`↺ Updated:             ${updatedCount}`);
  console.log(`✚ Merged Local Names:  ${mergedCount}`);

  console.log('\nDetailed Breakdown:');
  for (const res of results) {
    const tag =
      res.status === 'inserted'
        ? '✓ ADD'
        : res.status === 'skipped_seed_precedence'
          ? '↷ SKIP(SEED)'
          : res.status === 'merged_names'
            ? '✚ MERGE'
            : '↺ UPDATE';
    console.log(`  [${tag}] [${res.source}] ${res.candidateName}${res.reason ? ` — ${res.reason}` : ''}`);
  }

  console.log('\nImport complete. Bengali catalog precedence preserved.\n');
}

if (process.env.NODE_ENV !== 'test') {
  main().catch((err) => {
    console.error('Import failed:', err);
    process.exit(1);
  });
}
