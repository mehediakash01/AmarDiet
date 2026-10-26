/**
 * Every chat provider implements this. The gateway tries each in order,
 * skipping ones whose circuit is open, so adding a new provider is just
 * implementing this interface and registering it — nothing else changes.
 */
export interface ChatProvider {
  readonly name: string;
  chat(systemPrompt: string, messages: ChatProviderMessage[]): Promise<string>;
}

export interface ChatProviderMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class ChatProviderError extends Error {
  constructor(
    public readonly providerName: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(`[${providerName}] ${message}`);
    this.name = 'ChatProviderError';
  }
}
