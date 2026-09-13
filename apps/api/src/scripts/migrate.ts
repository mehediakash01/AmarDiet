/**
 * Database migration runner.
 *
 * Applies every .sql file in /database/migrations, in filename order,
 * exactly once. Tracks what has already been applied in a
 * `schema_migrations` table so this script is always safe to re-run.
 *
 * Usage:
 *   DATABASE_URL=postgres://... pnpm --filter @thali/api db:migrate
 */
import 'dotenv/config';
import { readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import postgres from 'postgres';

// database/migrations lives at the repo root, three levels up from
// apps/api/src/scripts. This project compiles to CommonJS (no "type":
// "module" in package.json), so __dirname is available natively — no
// import.meta needed here.
const MIGRATIONS_DIR = resolve(__dirname, '../../../../database/migrations');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(
      '✖ DATABASE_URL is not set. Add it to apps/api/.env or your environment before running migrations.',
    );
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { max: 1 });

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    const applied = new Set(
      (await sql<{ filename: string }[]>`SELECT filename FROM schema_migrations`).map(
        (r) => r.filename,
      ),
    );

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No migration files found in', MIGRATIONS_DIR);
      return;
    }

    let appliedCount = 0;

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`↷ Skipping already-applied migration: ${file}`);
        continue;
      }

      const fullPath = join(MIGRATIONS_DIR, file);
      const sqlText = readFileSync(fullPath, 'utf-8');

      console.log(`→ Applying migration: ${file}`);

      await sql.begin(async (tx) => {
        await tx.unsafe(sqlText);
        await tx`INSERT INTO schema_migrations (filename) VALUES (${file})`;
      });

      appliedCount++;
      console.log(`✓ Applied: ${file}`);
    }

    if (appliedCount === 0) {
      console.log('Database is already up to date. Nothing to apply.');
    } else {
      console.log(`\nDone. Applied ${appliedCount} migration(s).`);
    }
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error('✖ Migration failed:', err);
  process.exit(1);
});
