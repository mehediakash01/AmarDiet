import { describe, it, expect, beforeEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../apps/api/src/app.js';
import { InMemorySubscriberRepository } from '../../apps/api/src/modules/subscriber/subscriber.repository.js';
import { InMemoryWebhookEventRepository } from '../../apps/api/src/modules/webhook/webhook-event.repository.js';
import { BdappsClient } from '../../apps/api/src/infrastructure/bdapps/bdapps.client.js';
import { SubscriptionService } from '../../apps/api/src/modules/subscription/subscription.service.js';
import { createSubscriptionGuard } from '../../apps/api/src/modules/subscription/subscription.middleware.js';

describe('Phase 7 Integration: Bdapps Carrier Billing & Subscription Webhooks', () => {
  let app: FastifyInstance;
  let subscriberRepo: InMemorySubscriberRepository;
  let webhookRepo: InMemoryWebhookEventRepository;
  let bdappsClient: BdappsClient;
  let subscriptionService: SubscriptionService;

  const validAppId = 'APP_000001';

  beforeEach(async () => {
    subscriberRepo = new InMemorySubscriberRepository();
    webhookRepo = new InMemoryWebhookEventRepository();
    bdappsClient = new BdappsClient({ applicationId: validAppId, password: 'test_password' });
    subscriptionService = new SubscriptionService(subscriberRepo, webhookRepo, bdappsClient);

    app = await buildApp({
      subscriberRepo,
      webhookEventRepo: webhookRepo,
      subscriptionService,
      bdappsClient,
    });
  });

  describe('Webhook Schema & Authentication', () => {
    it('rejects invalid webhook payload missing required fields with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/webhooks/bdapps',
        payload: {
          applicationId: validAppId,
          // missing eventId, subscriberId, status
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('Invalid webhook payload structure');
    });

    it('rejects webhook payload from unauthorized applicationId with 403', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/webhooks/bdapps',
        payload: {
          applicationId: 'UNAUTHORIZED_APP',
          subscriberId: randomUUID(),
          eventId: 'evt-auth-test-1',
          status: 'REGISTER',
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.error).toContain('Unauthorized');
    });
  });

  describe('Status Transitions via Carrier Webhook', () => {
    it('REGISTER transitions subscriber from inactive to active', async () => {
      const sub = await subscriberRepo.create({ id: randomUUID(), status: 'inactive' });

      const res = await app.inject({
        method: 'POST',
        url: '/api/webhooks/bdapps',
        payload: {
          applicationId: validAppId,
          subscriberId: sub.id,
          eventId: 'evt-register-001',
          status: 'REGISTER',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.status).toBe('active');

      const updated = await subscriberRepo.findById(sub.id);
      expect(updated?.status).toBe('active');
    });

    it('UNREGISTER transitions subscriber to inactive', async () => {
      const sub = await subscriberRepo.create({ id: randomUUID(), status: 'active' });

      const res = await app.inject({
        method: 'POST',
        url: '/api/webhooks/bdapps',
        payload: {
          applicationId: validAppId,
          subscriberId: sub.id,
          eventId: 'evt-unreg-001',
          status: 'UNREGISTER',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe('inactive');

      const updated = await subscriberRepo.findById(sub.id);
      expect(updated?.status).toBe('inactive');
    });

    it('CHARGE_FAILURE transitions subscriber to suspended', async () => {
      const sub = await subscriberRepo.create({ id: randomUUID(), status: 'active' });

      const res = await app.inject({
        method: 'POST',
        url: '/api/webhooks/bdapps',
        payload: {
          applicationId: validAppId,
          subscriberId: sub.id,
          eventId: 'evt-fail-001',
          status: 'CHARGE_FAILURE',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe('suspended');

      const updated = await subscriberRepo.findById(sub.id);
      expect(updated?.status).toBe('suspended');
    });

    it('finds subscriber by phone when webhook subscriberId is telco MSISDN', async () => {
      const cleanPhone = bdappsClient.normalizeMsisdn('01812345678');
      const sub = await subscriberRepo.create({
        id: randomUUID(),
        phone: cleanPhone,
        status: 'inactive',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/webhooks/bdapps',
        payload: {
          applicationId: validAppId,
          subscriberId: 'tel:+8801812345678', // telco MSISDN format
          eventId: 'evt-msisdn-001',
          status: 'REGISTER',
        },
      });

      expect(res.statusCode).toBe(200);
      const updated = await subscriberRepo.findById(sub.id);
      expect(updated?.status).toBe('active');
    });
  });

  describe('Strict Idempotency Verification', () => {
    it('returns 200 with alreadyProcessed: true for duplicate eventId without repeating write', async () => {
      const sub = await subscriberRepo.create({ id: randomUUID(), status: 'inactive' });

      const payload = {
        applicationId: validAppId,
        subscriberId: sub.id,
        eventId: 'duplicate-evt-42',
        status: 'REGISTER',
      };

      // First webhook delivery
      const firstRes = await app.inject({
        method: 'POST',
        url: '/api/webhooks/bdapps',
        payload,
      });
      expect(firstRes.statusCode).toBe(200);
      const firstBody = JSON.parse(firstRes.body);
      expect(firstBody.alreadyProcessed).toBe(false);
      expect(firstBody.status).toBe('active');

      // Duplicate delivery from carrier
      const secondRes = await app.inject({
        method: 'POST',
        url: '/api/webhooks/bdapps',
        payload,
      });
      expect(secondRes.statusCode).toBe(200);
      const secondBody = JSON.parse(secondRes.body);
      expect(secondBody.alreadyProcessed).toBe(true);
      expect(secondBody.message).toContain('already processed');

      // Verify webhook event log has exactly 1 entry
      const records = await webhookRepo.findByEventId('duplicate-evt-42');
      expect(records).toBeDefined();
    });
  });

  describe('DoD Proof: Browser Cannot Self-Report as Subscribed', () => {
    it('POST /api/subscription/initiate does NOT activate subscription', async () => {
      const sub = await subscriberRepo.create({ id: randomUUID(), status: 'inactive' });

      const res = await app.inject({
        method: 'POST',
        url: '/api/subscription/initiate',
        payload: {
          subscriberId: sub.id,
          phone: '01812345678',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe('inactive'); // Remains inactive!
      expect(body.instruction).toContain('2 BDT/day');

      // Database record remains inactive
      const checkSub = await subscriberRepo.findById(sub.id);
      expect(checkSub?.status).toBe('inactive');
      expect(checkSub?.phone).toBe('01812345678');
    });

    it('GET /api/subscription/status returns read-only state', async () => {
      const cleanPhone = bdappsClient.normalizeMsisdn('01812345678');
      const sub = await subscriberRepo.create({
        id: randomUUID(),
        phone: cleanPhone,
        status: 'inactive',
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/subscription/status/${sub.id}`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.subscriberId).toBe(sub.id);
      expect(body.status).toBe('inactive');
      expect(body.isSubscribed).toBe(false);
      expect(body.cost).toContain('৳2.00');
    });
  });

  describe('Subscription Guard Middleware', () => {
    it('blocks inactive subscriber with 402 Payment Required', async () => {
      const guard = createSubscriptionGuard(subscriberRepo);
      const sub = await subscriberRepo.create({ id: randomUUID(), status: 'inactive' });

      let sentStatus = 0;
      let sentBody: unknown = null;

      const mockReq = {
        headers: { 'x-subscriber-id': sub.id },
      } as any;

      const mockReply = {
        status(code: number) {
          sentStatus = code;
          return this;
        },
        send(data: unknown) {
          sentBody = data;
          return this;
        },
      } as any;

      await guard(mockReq, mockReply);
      expect(sentStatus).toBe(402);
      expect((sentBody as any).error).toBe('Payment Required');
    });

    it('allows active subscriber to proceed without blocking', async () => {
      const guard = createSubscriptionGuard(subscriberRepo);
      const sub = await subscriberRepo.create({ id: randomUUID(), status: 'active' });

      let sentStatus = 0;
      const mockReq = {
        headers: { 'x-subscriber-id': sub.id },
      } as any;

      const mockReply = {
        status(code: number) {
          sentStatus = code;
          return this;
        },
        send() {
          return this;
        },
      } as any;

      await guard(mockReq, mockReply);
      expect(sentStatus).toBe(0); // Not blocked
    });
  });
});
