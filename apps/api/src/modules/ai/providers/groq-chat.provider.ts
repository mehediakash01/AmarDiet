import { ChatProviderError, type ChatProvider, type ChatProviderMessage } from './chat-types.js';
import {
  CHAT_MAX_TOKENS,
  explainEmptyOpenAiResponse,
  extractOpenAiText,
  type OpenAiChatResponse,
} from './openai-compat.js';

/**
 * Groq chat completions — OpenAI-compatible API, very fast (LPU inference).
 * Model name from GROQ_CHAT_MODEL. Groq retires models often (llama-3.1-8b-instant,
 * llama-3.3-70b-versatile and llama-4-scout were all scheduled for shutdown in
 * mid-2026), so don't copy a name from an old tutorial — run `pnpm ai:check`
 * or open https://console.groq.com/docs/models for what is live today.
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
      max_tokens: CHAT_MAX_TOKENS,
      // gpt-oss models reason before answering; "low" keeps that short so the
      // reply is fast and the token budget goes to the actual answer.
      ...(/gpt-oss/i.test(this.model) ? { reasoning_effort: 'low' } : {}),
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

    const data = (await res.json()) as OpenAiChatResponse;
    const text = extractOpenAiText(data);
    if (!text) throw new ChatProviderError(this.name, explainEmptyOpenAiResponse(data));
    return text;
  }
}
