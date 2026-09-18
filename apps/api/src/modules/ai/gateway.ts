import type { MealScanResult } from '@thali/schemas';
import { VisionProviderError, type VisionProvider } from './providers/types.js';

export interface GatewayScanSuccess {
  outcome: 'success';
  result: MealScanResult;
  providerUsed: string;
}

export interface GatewayScanFailure {
  outcome: 'all_providers_failed';
  attemptedProviders: string[];
}

export type GatewayScanOutcome = GatewayScanSuccess | GatewayScanFailure;

interface CircuitState {
  consecutiveFailures: number;
  openUntil: number; // epoch ms; 0 means not open
}

const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes
const DEFAULT_PER_CALL_TIMEOUT_MS = 15_000;

/**
 * Tries each registered provider in order. A provider that has failed
 * FAILURE_THRESHOLD times in a row gets skipped (its "circuit" is open)
 * for COOLDOWN_MS, rather than being retried — and timed out — on every
 * single request while it's clearly having a bad day. After the cooldown
 * it gets one attempt to prove it's recovered.
 *
 * This never fabricates a result. If every provider fails or is
 * cooling down, it returns an honest failure outcome — the caller decides
 * what the user sees, but it is never a synthesized meal.
 */
export class VisionGateway {
  private circuits = new Map<string, CircuitState>();
  private perCallTimeoutMs: number;

  constructor(
    private providers: VisionProvider[],
    options: { perCallTimeoutMs?: number } = {},
  ) {
    this.perCallTimeoutMs = options.perCallTimeoutMs ?? DEFAULT_PER_CALL_TIMEOUT_MS;
  }

  async scan(imageBase64: string, mimeType: string): Promise<GatewayScanOutcome> {
    const attempted: string[] = [];

    for (const provider of this.providers) {
      if (this.isOpen(provider.name)) continue;

      attempted.push(provider.name);
      try {
        const result = await this.withTimeout(
          provider.analyzeMealPhoto(imageBase64, mimeType),
          this.perCallTimeoutMs,
          provider.name,
        );
        this.recordSuccess(provider.name);
        return { outcome: 'success', result, providerUsed: provider.name };
      } catch (e) {
        this.recordFailure(provider.name);
        console.error(
          `[ai/gateway] ${provider.name} failed: ${e instanceof Error ? e.message : String(e)}`,
        );
        continue;
      }
    }

    return { outcome: 'all_providers_failed', attemptedProviders: attempted };
  }

  private isOpen(providerName: string): boolean {
    const state = this.circuits.get(providerName);
    if (!state) return false;
    if (state.openUntil === 0) return false;
    if (Date.now() >= state.openUntil) {
      // Cooldown elapsed — allow one attempt (half-open) by resetting.
      this.circuits.set(providerName, { consecutiveFailures: 0, openUntil: 0 });
      return false;
    }
    return true;
  }

  private recordSuccess(providerName: string): void {
    this.circuits.set(providerName, { consecutiveFailures: 0, openUntil: 0 });
  }

  private recordFailure(providerName: string): void {
    const state = this.circuits.get(providerName) ?? { consecutiveFailures: 0, openUntil: 0 };
    const consecutiveFailures = state.consecutiveFailures + 1;
    const openUntil =
      consecutiveFailures >= FAILURE_THRESHOLD ? Date.now() + COOLDOWN_MS : 0;
    this.circuits.set(providerName, { consecutiveFailures, openUntil });
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number, providerName: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new VisionProviderError(providerName, `timed out after ${ms}ms`)),
        ms,
      );
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timer!);
    }
  }

  /** Exposed for tests and admin/debug visibility, not used in the hot path. */
  getCircuitStates(): Record<string, CircuitState> {
    return Object.fromEntries(this.circuits);
  }
}
