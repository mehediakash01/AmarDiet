import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VisionGateway } from '../../../apps/api/src/modules/ai/gateway.js';
import { VisionProviderError, type VisionProvider } from '../../../apps/api/src/modules/ai/providers/types.js';
import type { MealScanResult } from '@thali/schemas';

const SUCCESS_RESULT: MealScanResult = {
  isFood: true,
  confidence: 0.9,
  items: [{ name: 'rice', estimatedQuantity: 200, estimatedUnit: 'g', confidence: 0.9 }],
};

function fakeProvider(
  name: string,
  behavior: (() => Promise<MealScanResult>) | (() => Promise<MealScanResult>)[],
): VisionProvider {
  let callIndex = 0;
  const behaviors = Array.isArray(behavior) ? behavior : [behavior];
  return {
    name,
    analyzeMealPhoto: vi.fn(async () => {
      const b = behaviors[Math.min(callIndex, behaviors.length - 1)];
      callIndex++;
      return b();
    }),
  };
}

function alwaysFails(name: string): () => Promise<MealScanResult> {
  return async () => {
    throw new VisionProviderError(name, 'simulated failure');
  };
}

function alwaysSucceeds(): () => Promise<MealScanResult> {
  return async () => SUCCESS_RESULT;
}

describe('VisionGateway', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('returns success from the first provider when it works', async () => {
    const primary = fakeProvider('primary', alwaysSucceeds());
    const secondary = fakeProvider('secondary', alwaysSucceeds());
    const gateway = new VisionGateway([primary, secondary]);

    const outcome = await gateway.scan('base64', 'image/jpeg');

    expect(outcome.outcome).toBe('success');
    if (outcome.outcome === 'success') {
      expect(outcome.providerUsed).toBe('primary');
    }
    expect(secondary.analyzeMealPhoto).not.toHaveBeenCalled();
  });

  it('falls back to the second provider when the first fails', async () => {
    const primary = fakeProvider('primary', alwaysFails('primary'));
    const secondary = fakeProvider('secondary', alwaysSucceeds());
    const gateway = new VisionGateway([primary, secondary]);

    const outcome = await gateway.scan('base64', 'image/jpeg');

    expect(outcome.outcome).toBe('success');
    if (outcome.outcome === 'success') {
      expect(outcome.providerUsed).toBe('secondary');
    }
  });

  it('falls back through three providers in order', async () => {
    const first = fakeProvider('first', alwaysFails('first'));
    const second = fakeProvider('second', alwaysFails('second'));
    const third = fakeProvider('third', alwaysSucceeds());
    const gateway = new VisionGateway([first, second, third]);

    const outcome = await gateway.scan('base64', 'image/jpeg');

    expect(outcome.outcome).toBe('success');
    if (outcome.outcome === 'success') {
      expect(outcome.providerUsed).toBe('third');
    }
  });

  it('returns an honest all_providers_failed outcome when every provider fails — never a fabricated result', async () => {
    const first = fakeProvider('first', alwaysFails('first'));
    const second = fakeProvider('second', alwaysFails('second'));
    const gateway = new VisionGateway([first, second]);

    const outcome = await gateway.scan('base64', 'image/jpeg');

    expect(outcome.outcome).toBe('all_providers_failed');
    if (outcome.outcome === 'all_providers_failed') {
      expect(outcome.attemptedProviders).toEqual(['first', 'second']);
    }
  });

  it('opens the circuit after repeated consecutive failures and skips that provider on the next request', async () => {
    const flaky = fakeProvider('flaky', alwaysFails('flaky'));
    const backup = fakeProvider('backup', alwaysSucceeds());
    const gateway = new VisionGateway([flaky, backup]);

    // Three consecutive failures trips the circuit (FAILURE_THRESHOLD = 3).
    await gateway.scan('base64', 'image/jpeg');
    await gateway.scan('base64', 'image/jpeg');
    await gateway.scan('base64', 'image/jpeg');
    expect(flaky.analyzeMealPhoto).toHaveBeenCalledTimes(3);

    // Circuit should now be open — the next call must skip straight to
    // backup without even attempting flaky again.
    const outcome = await gateway.scan('base64', 'image/jpeg');
    expect(flaky.analyzeMealPhoto).toHaveBeenCalledTimes(3); // unchanged
    expect(outcome.outcome).toBe('success');
    if (outcome.outcome === 'success') {
      expect(outcome.providerUsed).toBe('backup');
    }
  });

  it('a successful call resets the failure count, so occasional single failures never trip the circuit', async () => {
    const results: (() => Promise<MealScanResult>)[] = [
      alwaysFails('sometimes'),
      alwaysSucceeds(),
      alwaysFails('sometimes'),
      alwaysSucceeds(),
    ];
    const sometimes = fakeProvider('sometimes', results);
    const gateway = new VisionGateway([sometimes]);

    const first = await gateway.scan('base64', 'image/jpeg'); // fails -> all_providers_failed (only provider)
    expect(first.outcome).toBe('all_providers_failed');

    const second = await gateway.scan('base64', 'image/jpeg'); // succeeds, resets failure count
    expect(second.outcome).toBe('success');

    const third = await gateway.scan('base64', 'image/jpeg'); // fails again (count is 1, not tripped)
    expect(third.outcome).toBe('all_providers_failed');

    const fourth = await gateway.scan('base64', 'image/jpeg'); // succeeds — proves circuit never opened
    expect(fourth.outcome).toBe('success');
    expect(sometimes.analyzeMealPhoto).toHaveBeenCalledTimes(4);
  });

  it('times out a provider that hangs, and moves on to the next one', async () => {
    const hanging = fakeProvider('hanging', () => new Promise<MealScanResult>(() => {
      // never resolves
    }));
    const backup = fakeProvider('backup', alwaysSucceeds());
    const gateway = new VisionGateway([hanging, backup], { perCallTimeoutMs: 50 });

    const outcome = await gateway.scan('base64', 'image/jpeg');

    expect(outcome.outcome).toBe('success');
    if (outcome.outcome === 'success') {
      expect(outcome.providerUsed).toBe('backup');
    }
  });
});
