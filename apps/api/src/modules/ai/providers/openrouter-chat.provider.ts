import { ChatProviderError, type ChatProvider, type ChatProviderMessage } from './chat-types.js';
import {
  CHAT_MAX_TOKENS,
  explainEmptyOpenAiResponse,
  extractOpenAiText,
  type OpenAiChatResponse,
} from './openai-compat.js';

/**
 * OpenRouter chat — aggregates hundreds of models, many free.
 * Model name from OPENROUTER_CHAT_MODEL. Free models rotate constantly (older
 * examples like mistral-7b-instruct:free no longer exist), so run
 * `pnpm ai:check` or see https://openrouter.ai/models?q=free for what is live.
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
      max_tokens: CHAT_MAX_TOKENS,
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

    const data = (await res.json()) as OpenAiChatResponse;
    const text = extractOpenAiText(data);
    if (!text) throw new ChatProviderError(this.name, explainEmptyOpenAiResponse(data));
    return text;
  }
}
