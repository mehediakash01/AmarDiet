/**
 * Database Backup Script for AmarDiet (Thali Tracker)
 * Exports database state across all tables into a timestamped JSON snapshot.
 *
 * Usage:
 *   pnpm db:backup
 *   or: tsx scripts/backup-db.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

try {
  if (typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile();
    } catch {
      process.loadEnvFile('apps/api/.env');
    }
  }
} catch {
  // optional
}

const DATABASE_URL = process.env.DATABASE_URL;

async function runBackup() {
  if (!DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL is not set. Backup skipped (running in-memory).');
    process.exit(0);
  }

  console.log('📦 Starting database backup...');
  const sql = postgres(DATABASE_URL, { max: 1 });

  try {
    const tables = [
      'subscribers',
      'profiles',
      'foods',
      'food_logs',
      'diet_plans',
      'weight_logs',
      'webhook_events',
      'meal_scan_events',
    ];

    const backupData: Record<string, unknown> = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      counts: {},
      data: {},
    };

    const counts: Record<string, number> = {};
    const data: Record<string, unknown[]> = {};

    for (const table of tables) {
      try {
        const rows = await sql`SELECT * FROM ${sql(table)}`;
        counts[table] = rows.length;
        data[table] = rows;
        console.log(`  ✓ Exported ${rows.length} rows from "${table}"`);
      } catch (err) {
        console.warn(`  ⚠️ Could not export "${table}":`, (err as Error).message);
      }
    }

    backupData.counts = counts;
    backupData.data = data;

    const backupDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(backupDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2), 'utf-8');
    console.log(`\n✅ Backup successfully created: ${filepath}`);
    console.log(`   Total tables backed up: ${Object.keys(counts).length}`);
  } catch (err) {
    console.error('❌ Backup failed:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runBackup();
