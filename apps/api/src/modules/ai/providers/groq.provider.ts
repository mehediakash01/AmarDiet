import { MealScanResultSchema, type MealScanResult } from '@thali/schemas';
import { MEAL_SCAN_INSTRUCTION, VisionProviderError, type VisionProvider } from './types.js';
import { extractJsonObject } from './parseJson.js';

/**
 * IMPORTANT: the model name comes entirely from GROQ_VISION_MODEL — no
 * default is hardcoded here. Groq's own docs state their multimodal
 * lineup "changes frequently" (Llama 3.2 Vision is already gone as of
 * writing this). Check https://console.groq.com/docs/vision for the
 * current production-ready (not Preview) vision model before setting this.
 */
export class GroqVisionProvider implements VisionProvider {
  readonly name = 'groq';

  constructor(
    private apiKey: string,
    private model: string,
  ) {}

  async analyzeMealPhoto(imageBase64: string, mimeType: string): Promise<MealScanResult> {
    let res: Response;
    try {
      res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: MEAL_SCAN_INSTRUCTION },
                { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
              ],
            },
          ],
          response_format: { type: 'json_object' },
        }),
      });
    } catch (e) {
      throw new VisionProviderError(this.name, 'network request failed', e);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new VisionProviderError(this.name, `HTTP ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const rawText = data.choices?.[0]?.message?.content;
    if (!rawText) {
      throw new VisionProviderError(this.name, 'response contained no message content');
    }

    let parsedJson: unknown;
    try {
      parsedJson = extractJsonObject(rawText);
    } catch (e) {
      throw new VisionProviderError(this.name, 'could not extract JSON from response', e);
    }

    const validated = MealScanResultSchema.safeParse(parsedJson);
    if (!validated.success) {
      throw new VisionProviderError(
        this.name,
        `response failed schema validation: ${validated.error.message}`,
      );
    }

    return validated.data;
  }
}
