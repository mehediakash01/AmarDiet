import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

export * from './schema.js';

export type AppDatabase = PostgresJsDatabase<typeof schema>;

let dbInstance: AppDatabase | null = null;
let sqlClient: postgres.Sql | null = null;

export function getDatabase(connectionString?: string): AppDatabase | null {
  const url = connectionString || process.env.DATABASE_URL;
  if (!url) {
    return dbInstance;
  }

  if (!dbInstance) {
    sqlClient = postgres(url, { max: 10 });
    dbInstance = drizzle(sqlClient, { schema });
  }

  return dbInstance;
}

export async function closeDatabase(): Promise<void> {
  if (sqlClient) {
    await sqlClient.end();
    sqlClient = null;
    dbInstance = null;
  }
}
