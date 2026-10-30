import { db, type LocalFoodLogEntry, type SyncQueueItem } from '../db/db';
import { buildFoodLogPayload } from './payload';

export class SyncEngine {
  private isSyncing = false;
  private apiBaseUrl: string;

  constructor(apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') {
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * Queue a local food log mutation and trigger sync attempt
   */
  async queueFoodLogMutation(
    action: 'create' | 'update' | 'delete',
    entry: LocalFoodLogEntry,
  ): Promise<void> {
    await this.queueFoodLogMutations(action, [entry]);
  }

  async queueFoodLogMutations(
    action: 'create' | 'update' | 'delete',
    entries: LocalFoodLogEntry[],
  ): Promise<void> {
    if (entries.length === 0) return;

    const timestamp = new Date().toISOString();
    const queueItems: SyncQueueItem[] = entries.map((entry) => ({
      id: `${entry.id}_${Date.now()}`,
      entity: 'food_log',
      action,
      payload: buildFoodLogPayload(entry),
      timestamp,
      status: 'pending',
    }));

    await db.syncQueue.bulkAdd(queueItems);
    this.triggerSync();
  }

  /**
   * Attempt to sync all pending items to the server
   */
  async triggerSync(): Promise<{ syncedCount: number; failedCount: number }> {
    if (this.isSyncing) return { syncedCount: 0, failedCount: 0 };
    if (typeof window !== 'undefined' && !navigator.onLine) {
      return { syncedCount: 0, failedCount: 0 };
    }

    this.isSyncing = true;
    let syncedCount = 0;
    let failedCount = 0;

    try {
      const pendingItems = await db.syncQueue.where('status').equals('pending').toArray();

      for (const item of pendingItems) {
        try {
          if (item.entity === 'food_log') {
            if (item.action === 'create') {
              const res = await fetch(`${this.apiBaseUrl}/api/food-logs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item.payload),
              });
              if (res.ok) {
                await db.foodLogs.update(item.payload.id as string, { synced: true });
                await db.syncQueue.delete(item.id);
                syncedCount++;
              } else {
                failedCount++;
              }
            } else if (item.action === 'update') {
              const res = await fetch(`${this.apiBaseUrl}/api/food-logs/${item.payload.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item.payload),
              });
              if (res.ok) {
                await db.foodLogs.update(item.payload.id as string, { synced: true });
                await db.syncQueue.delete(item.id);
                syncedCount++;
              } else {
                failedCount++;
              }
            } else if (item.action === 'delete') {
              const res = await fetch(`${this.apiBaseUrl}/api/food-logs/${item.payload.id}`, {
                method: 'DELETE',
              });
              if (res.ok || res.status === 404) {
                await db.syncQueue.delete(item.id);
                syncedCount++;
              } else {
                failedCount++;
              }
            }
          }
        } catch {
          // Network failure — retain item in queue for next sync
          failedCount++;
        }
      }
    } finally {
      this.isSyncing = false;
    }

    return { syncedCount, failedCount };
  }
}

export const syncEngine = new SyncEngine();

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncEngine.triggerSync().catch(console.error);
  });
}
