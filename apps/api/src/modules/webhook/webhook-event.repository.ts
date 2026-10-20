import { eq } from 'drizzle-orm';
import type { WebhookEventRecord } from '@thali/types';
import type { AppDatabase } from '../../infrastructure/db/index.js';
import { webhookEvents } from '../../infrastructure/db/schema.js';

export interface IWebhookEventRepository {
  findByEventId(eventId: string): Promise<WebhookEventRecord | null>;
  record(event: {
    id: string;
    eventId: string;
    provider: string;
    payload: Record<string, unknown>;
  }): Promise<WebhookEventRecord>;
}

export class DrizzleWebhookEventRepository implements IWebhookEventRepository {
  constructor(private db: AppDatabase) {}

  async findByEventId(eventId: string): Promise<WebhookEventRecord | null> {
    const rows = await this.db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.eventId, eventId))
      .limit(1);

    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      eventId: r.eventId,
      provider: r.provider,
      payload: r.payload as Record<string, unknown>,
      processedAt: r.processedAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
    };
  }

  async record(data: {
    id: string;
    eventId: string;
    provider: string;
    payload: Record<string, unknown>;
  }): Promise<WebhookEventRecord> {
    const now = new Date();
    const [inserted] = await this.db
      .insert(webhookEvents)
      .values({
        id: data.id,
        eventId: data.eventId,
        provider: data.provider,
        payload: data.payload,
        processedAt: now,
        createdAt: now,
      })
      .onConflictDoNothing()
      .returning();

    if (!inserted) {
      // Conflict happened, return existing record
      const existing = await this.findByEventId(data.eventId);
      if (!existing) throw new Error('Failed to record or retrieve webhook event');
      return existing;
    }

    return {
      id: inserted.id,
      eventId: inserted.eventId,
      provider: inserted.provider,
      payload: inserted.payload as Record<string, unknown>,
      processedAt: inserted.processedAt.toISOString(),
      createdAt: inserted.createdAt.toISOString(),
    };
  }
}

export class InMemoryWebhookEventRepository implements IWebhookEventRepository {
  private eventsByEventId = new Map<string, WebhookEventRecord>();

  async findByEventId(eventId: string): Promise<WebhookEventRecord | null> {
    return this.eventsByEventId.get(eventId) ?? null;
  }

  async record(data: {
    id: string;
    eventId: string;
    provider: string;
    payload: Record<string, unknown>;
  }): Promise<WebhookEventRecord> {
    const existing = this.eventsByEventId.get(data.eventId);
    if (existing) return existing;

    const now = new Date().toISOString();
    const rec: WebhookEventRecord = {
      id: data.id,
      eventId: data.eventId,
      provider: data.provider,
      payload: data.payload,
      processedAt: now,
      createdAt: now,
    };
    this.eventsByEventId.set(data.eventId, rec);
    return rec;
  }
}
