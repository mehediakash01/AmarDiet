import { ChatProviderError, type ChatProvider, type ChatProviderMessage } from './chat-types.js';

/**
 * OpenRouter chat — aggregates hundreds of models, many free.
 * Model name from OPENROUTER_CHAT_MODEL. Good free choices:
 *   meta-llama/llama-3.1-8b-instruct:free
 *   mistralai/mistral-7b-instruct:free
 *   google/gemma-2-9b-it:free
 * Check https://openrouter.ai/models?q=free for current free models.
 */
export class OpenRouterChatProvider implements ChatProvider {
  readonly name = 'openrouter';

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
      res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://amardiet.app',
          'X-Title': 'AmarDiet Nutrition Assistant',
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
