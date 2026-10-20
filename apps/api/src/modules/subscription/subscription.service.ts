import { randomUUID } from 'crypto';
import type { BdappsWebhookPayload, Subscriber } from '@thali/types';
import type { ISubscriberRepository } from '../subscriber/subscriber.repository.js';
import type { IWebhookEventRepository } from '../webhook/webhook-event.repository.js';
import { BdappsClient } from '../../infrastructure/bdapps/bdapps.client.js';

export interface WebhookProcessingResult {
  success: boolean;
  eventId: string;
  alreadyProcessed?: boolean;
  subscriberId?: string;
  status?: 'active' | 'inactive' | 'suspended';
  message: string;
}

export class SubscriptionService {
  constructor(
    private subscriberRepo: ISubscriberRepository,
    private webhookEventRepo: IWebhookEventRepository,
    private bdappsClient: BdappsClient = new BdappsClient(),
  ) {}

  /**
   * Handle incoming Bdapps carrier webhook.
   *
   * Idempotent & Authoritative:
   * 1. If eventId already processed, returns immediately with 200/alreadyProcessed.
   * 2. Status transitions occur EXCLUSIVELY here, never from browser self-reporting.
   */
  async handleWebhook(
    payload: BdappsWebhookPayload,
  ): Promise<WebhookProcessingResult> {
    // 1. Verify application identity
    if (!this.bdappsClient.isValidApplication(payload.applicationId)) {
      throw new Error(`Unauthorized webhook applicationId: "${payload.applicationId}"`);
    }

    // 2. Idempotency Check
    const existing = await this.webhookEventRepo.findByEventId(payload.eventId);
    if (existing) {
      return {
        success: true,
        eventId: payload.eventId,
        alreadyProcessed: true,
        message: 'Webhook event was already processed previously.',
      };
    }

    // 3. Locate subscriber
    let subscriber: Subscriber | null = null;

    // Check direct subscriber UUID first
    subscriber = await this.subscriberRepo.findById(payload.subscriberId);

    // If not found, check phone / MSISDN (e.g. "tel:01812345678" or "8801812345678")
    if (!subscriber) {
      const normalizedPhone = this.bdappsClient.normalizeMsisdn(payload.subscriberId);
      subscriber = await this.subscriberRepo.findByPhone(normalizedPhone);
    }

    // 4. Map carrier event status to domain subscription status
    let newStatus: 'active' | 'inactive' | 'suspended';
    switch (payload.status) {
      case 'REGISTER':
      case 'RENEW':
      case 'CHARGE_SUCCESS':
        newStatus = 'active';
        break;
      case 'UNREGISTER':
        newStatus = 'inactive';
        break;
      case 'CHARGE_FAILURE':
        newStatus = 'suspended';
        break;
      default:
        newStatus = 'inactive';
    }

    // 5. Update subscriber state if subscriber exists
    if (subscriber) {
      await this.subscriberRepo.update(subscriber.id, {
        status: newStatus,
        phone: subscriber.phone || this.bdappsClient.normalizeMsisdn(payload.subscriberId),
      });
    }

    // 6. Record event for idempotency audit log
    await this.webhookEventRepo.record({
      id: randomUUID(),
      eventId: payload.eventId,
      provider: 'bdapps',
      payload: payload as unknown as Record<string, unknown>,
    });

    return {
      success: true,
      eventId: payload.eventId,
      alreadyProcessed: false,
      subscriberId: subscriber?.id,
      status: newStatus,
      message: `Processed ${payload.status} -> subscription status is now ${newStatus}`,
    };
  }

  /**
   * Initiates carrier billing prompt for user's phone.
   * NOTE: Does NOT set status to 'active'. Only the telco webhook can do that.
   */
  async initiate(subscriberId: string, phone: string) {
    const subscriber = await this.subscriberRepo.findById(subscriberId);
    if (!subscriber) {
      throw new Error(`Subscriber with ID "${subscriberId}" not found`);
    }

    const cleanPhone = this.bdappsClient.normalizeMsisdn(phone);

    // Link phone to subscriber
    await this.subscriberRepo.update(subscriberId, { phone: cleanPhone });

    // Request telco OTP / USSD
    const result = await this.bdappsClient.initiateSubscription(cleanPhone);
    return {
      subscriberId,
      phone: cleanPhone,
      referenceNo: result.referenceNo,
      status: subscriber.status, // stays current status until webhook arrives!
      instruction:
        'Please confirm the SMS or USSD prompt on your phone (2 BDT/day). Your subscription will activate automatically.',
    };
  }

  /**
   * Get public subscription status for client display.
   */
  async getStatus(subscriberId: string) {
    const subscriber = await this.subscriberRepo.findById(subscriberId);
    if (!subscriber) {
      throw new Error(`Subscriber with ID "${subscriberId}" not found`);
    }

    return {
      subscriberId: subscriber.id,
      status: subscriber.status,
      isSubscribed: subscriber.status === 'active',
      phone: subscriber.phone ? this.maskPhone(subscriber.phone) : undefined,
      plan: 'daily_2bdt',
      carrier: 'Bdapps (Robi / Airtel)',
      cost: '৳2.00 / day + VAT/SD',
      updatedAt: subscriber.updatedAt,
    };
  }

  private maskPhone(phone: string): string {
    if (phone.length < 8) return phone;
    return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
  }
}
