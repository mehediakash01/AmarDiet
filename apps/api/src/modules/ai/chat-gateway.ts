import { ChatProviderError, type ChatProvider, type ChatProviderMessage } from './providers/chat-types.js';

export interface ChatGatewaySuccess {
  outcome: 'success';
  reply: string;
  providerUsed: string;
}

export interface ChatGatewayFailure {
  outcome: 'all_providers_failed';
  attemptedProviders: string[];
}

export type ChatGatewayOutcome = ChatGatewaySuccess | ChatGatewayFailure;

interface CircuitState {
  consecutiveFailures: number;
  openUntil: number; // epoch ms; 0 = closed
}

const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Tries each chat provider in registration order.
 * A provider that fails FAILURE_THRESHOLD times in a row has its circuit
 * opened for COOLDOWN_MS — it is skipped entirely rather than timing out
 * every request while it is clearly having a bad day.
 *
 * This means: if Gemini hits its rate limit, Groq answers. If Groq also
 * fails, OpenRouter answers. If all fail, the user gets an honest error
 * rather than a silent hang. Circuit resets after cooldown.
 */
export class ChatGateway {
  private circuits = new Map<string, CircuitState>();
  private timeoutMs: number;

  constructor(
    private providers: ChatProvider[],
    options: { timeoutMs?: number } = {},
  ) {
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async chat(systemPrompt: string, messages: ChatProviderMessage[]): Promise<ChatGatewayOutcome> {
    const attempted: string[] = [];

    for (const provider of this.providers) {
      if (this.isOpen(provider.name)) continue;

      attempted.push(provider.name);
      try {
        const reply = await this.withTimeout(
          provider.chat(systemPrompt, messages),
          this.timeoutMs,
          provider.name,
        );
        this.recordSuccess(provider.name);
        return { outcome: 'success', reply, providerUsed: provider.name };
      } catch (e) {
        this.recordFailure(provider.name);
        console.error(
          `[chat/gateway] ${provider.name} failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    return { outcome: 'all_providers_failed', attemptedProviders: attempted };
  }

  private isOpen(name: string): boolean {
    const state = this.circuits.get(name);
    if (!state || state.openUntil === 0) return false;
    if (Date.now() >= state.openUntil) {
      this.circuits.set(name, { consecutiveFailures: 0, openUntil: 0 });
      return false;
    }
    return true;
  }

  private recordSuccess(name: string): void {
    this.circuits.set(name, { consecutiveFailures: 0, openUntil: 0 });
  }

  private recordFailure(name: string): void {
    const state = this.circuits.get(name) ?? { consecutiveFailures: 0, openUntil: 0 };
    const consecutiveFailures = state.consecutiveFailures + 1;
    const openUntil = consecutiveFailures >= FAILURE_THRESHOLD ? Date.now() + COOLDOWN_MS : 0;
    this.circuits.set(name, { consecutiveFailures, openUntil });
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number, name: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new ChatProviderError(name, `timed out after ${ms}ms`)),
        ms,
      );
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timer!);
    }
  }

  /** For health checks / admin visibility. */
  getCircuitStates(): Record<string, CircuitState> {
    return Object.fromEntries(this.circuits);
  }
}
