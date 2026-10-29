import { ChatProviderError, type ChatProvider, type ChatProviderMessage } from './chat-types.js';
import {
  explainEmptyGeminiResponse,
  extractGeminiText,
  type GeminiGenerateContentResponse,
} from './gemini-response.js';
import { normalizeGeminiModel } from '../ai-config.js';

/**
 * Model name from GEMINI_CHAT_MODEL — no default hardcoded.
 * Any current Flash / Flash-Lite model works (they are multimodal, so the
 * same name can be used for GEMINI_VISION_MODEL too). Older names such as
 * gemini-1.5-flash and gemini-2.0-flash are shut down and return 404.
 * Run `pnpm ai:check` to list the models your key can actually use.
 */
export class GeminiChatProvider implements ChatProvider {
  readonly name = 'gemini';

  constructor(
    private apiKey: string,
    private model: string,
  ) {}

  async chat(systemPrompt: string, messages: ChatProviderMessage[]): Promise<string> {
    // Key goes in a header, not the URL, so it can never leak into logs.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${normalizeGeminiModel(this.model)}:generateContent`;

    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          // Thinking tokens count against maxOutputTokens on current Gemini
          // models; 800 could be consumed entirely by thinking, leaving an
          // empty reply. Keep generous headroom.
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
        }),
      });
    } catch (e) {
      throw new ChatProviderError(this.name, 'network request failed', e);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new ChatProviderError(this.name, `HTTP ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = (await res.json()) as GeminiGenerateContentResponse;
    const text = extractGeminiText(data);
    if (!text) throw new ChatProviderError(this.name, explainEmptyGeminiResponse(data));
    return text;
  }
}
