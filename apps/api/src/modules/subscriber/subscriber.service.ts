import { randomUUID } from 'crypto';
import type { Subscriber } from '@thali/types';
import type { ISubscriberRepository } from './subscriber.repository.js';

export class SubscriberService {
  constructor(private repository: ISubscriberRepository) {}

  async getOrCreateSubscriber(data?: { id?: string; phone?: string }): Promise<Subscriber> {
    if (data?.id) {
      const existing = await this.repository.findById(data.id);
      if (existing) return existing;
    }

    if (data?.phone) {
      const existing = await this.repository.findByPhone(data.phone);
      if (existing) return existing;
    }

    const newId = data?.id || randomUUID();
    return this.repository.create({
      id: newId,
      phone: data?.phone,
      status: 'active',
    });
  }

  async getSubscriberById(id: string): Promise<Subscriber | null> {
    return this.repository.findById(id);
  }
}
