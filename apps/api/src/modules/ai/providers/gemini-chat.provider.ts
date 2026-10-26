import { ChatProviderError, type ChatProvider, type ChatProviderMessage } from './chat-types.js';

/**
 * Model name from GEMINI_CHAT_MODEL — no default hardcoded.
 * Use a text-only model (e.g. gemini-2.0-flash or gemini-1.5-flash),
 * NOT the same model as GEMINI_VISION_MODEL unless it is also text-capable.
 * Check https://ai.google.dev/gemini-api/docs/models for current names.
 */
export class GeminiChatProvider implements ChatProvider {
  readonly name = 'gemini';

  constructor(
    private apiKey: string,
    private model: string,
  ) {}

  async chat(systemPrompt: string, messages: ChatProviderMessage[]): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
        }),
      });
    } catch (e) {
      throw new ChatProviderError(this.name, 'network request failed', e);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new ChatProviderError(this.name, `HTTP ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) throw new ChatProviderError(this.name, 'response contained no text');
    return text;
  }
}
