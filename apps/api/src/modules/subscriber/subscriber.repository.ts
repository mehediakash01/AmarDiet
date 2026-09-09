import { eq } from 'drizzle-orm';
import type { Subscriber } from '@thali/types';
import type { AppDatabase } from '../../infrastructure/db/index.js';
import { subscribers } from '../../infrastructure/db/schema.js';

export interface ISubscriberRepository {
  findById(id: string): Promise<Subscriber | null>;
  findByPhone(phone: string): Promise<Subscriber | null>;
  create(subscriber: { id: string; phone?: string; status?: 'active' | 'inactive' | 'suspended' }): Promise<Subscriber>;
  update(id: string, updates: Partial<Subscriber>): Promise<Subscriber | null>;
}

export class DrizzleSubscriberRepository implements ISubscriberRepository {
  constructor(private db: AppDatabase) {}

  async findById(id: string): Promise<Subscriber | null> {
    const rows = await this.db.select().from(subscribers).where(eq(subscribers.id, id)).limit(1);
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      phone: r.phone ?? undefined,
      status: r.status as 'active' | 'inactive' | 'suspended',
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  async findByPhone(phone: string): Promise<Subscriber | null> {
    const rows = await this.db.select().from(subscribers).where(eq(subscribers.phone, phone)).limit(1);
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      phone: r.phone ?? undefined,
      status: r.status as 'active' | 'inactive' | 'suspended',
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  async create(data: { id: string; phone?: string; status?: 'active' | 'inactive' | 'suspended' }): Promise<Subscriber> {
    const now = new Date();
    const [inserted] = await this.db
      .insert(subscribers)
      .values({
        id: data.id,
        phone: data.phone,
        status: data.status ?? 'active',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return {
      id: inserted.id,
      phone: inserted.phone ?? undefined,
      status: inserted.status as 'active' | 'inactive' | 'suspended',
      createdAt: inserted.createdAt.toISOString(),
      updatedAt: inserted.updatedAt.toISOString(),
    };
  }

  async update(id: string, updates: Partial<Subscriber>): Promise<Subscriber | null> {
    const values: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (updates.phone !== undefined) values.phone = updates.phone;
    if (updates.status !== undefined) values.status = updates.status;

    const [updated] = await this.db
      .update(subscribers)
      .set(values)
      .where(eq(subscribers.id, id))
      .returning();

    if (!updated) return null;

    return {
      id: updated.id,
      phone: updated.phone ?? undefined,
      status: updated.status as 'active' | 'inactive' | 'suspended',
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}

export class InMemorySubscriberRepository implements ISubscriberRepository {
  private items = new Map<string, Subscriber>();

  async findById(id: string): Promise<Subscriber | null> {
    return this.items.get(id) ?? null;
  }

  async findByPhone(phone: string): Promise<Subscriber | null> {
    for (const sub of this.items.values()) {
      if (sub.phone === phone) return sub;
    }
    return null;
  }

  async create(data: { id: string; phone?: string; status?: 'active' | 'inactive' | 'suspended' }): Promise<Subscriber> {
    const now = new Date().toISOString();
    const sub: Subscriber = {
      id: data.id,
      phone: data.phone,
      status: data.status ?? 'active',
      createdAt: now,
      updatedAt: now,
    };
    this.items.set(sub.id, sub);
    return sub;
  }

  async update(id: string, updates: Partial<Subscriber>): Promise<Subscriber | null> {
    const existing = this.items.get(id);
    if (!existing) return null;
    const updated: Subscriber = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.items.set(id, updated);
    return updated;
  }
}
