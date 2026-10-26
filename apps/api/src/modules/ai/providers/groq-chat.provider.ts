import { ChatProviderError, type ChatProvider, type ChatProviderMessage } from './chat-types.js';

/**
 * Groq chat completions — OpenAI-compatible API, very fast (LPU inference).
 * Model name from GROQ_CHAT_MODEL. Good free-tier choices:
 *   llama-3.1-8b-instant  (fastest, lowest latency)
 *   llama-3.3-70b-versatile (higher quality)
 * Check https://console.groq.com/docs/models for current names.
 */
export class GroqChatProvider implements ChatProvider {
  readonly name = 'groq';

  constructor(
    private apiKey: string,
    private model: string,
  ) {}

  async chat(systemPrompt: string, messages: ChatProviderMessage[]): Promise<string> {
    const payload = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.7,
      max_tokens: 800,
    };

    let res: Response;
    try {
      res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      throw new ChatProviderError(this.name, 'network request failed', e);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new ChatProviderError(this.name, `HTTP ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new ChatProviderError(this.name, 'response contained no message content');
    return text;
  }
}
