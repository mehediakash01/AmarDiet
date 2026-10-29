import { ChatProviderError, type ChatProvider, type ChatProviderMessage } from './chat-types.js';
import {
  CHAT_MAX_TOKENS,
  explainEmptyOpenAiResponse,
  extractOpenAiText,
  type OpenAiChatResponse,
} from './openai-compat.js';

/**
 * Mistral AI chat — OpenAI-compatible, strong multilingual support
 * (good for Bengali-language users). Model name from MISTRAL_CHAT_MODEL.
 * Free-tier choices: mistral-small-latest, open-mistral-7b
 * Check https://docs.mistral.ai/getting-started/models for current names.
 */
export class MistralChatProvider implements ChatProvider {
  readonly name = 'mistral';

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
      res = await fetch('https://api.mistral.ai/v1/chat/completions', {
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

    const data = (await res.json()) as OpenAiChatResponse;
    const text = extractOpenAiText(data);
    if (!text) throw new ChatProviderError(this.name, explainEmptyOpenAiResponse(data));
    return text;
  }
}
