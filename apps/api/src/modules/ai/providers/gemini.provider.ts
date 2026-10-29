import { MealScanResultSchema, type MealScanResult } from '@thali/schemas';
import { MEAL_SCAN_INSTRUCTION, VisionProviderError, type VisionProvider } from './types.js';
import { extractJsonObject } from './parseJson.js';
import {
  explainEmptyGeminiResponse,
  extractGeminiText,
  type GeminiGenerateContentResponse,
} from './gemini-response.js';
import { normalizeGeminiModel } from '../ai-config.js';

/**
 * IMPORTANT: the model name comes entirely from GEMINI_VISION_MODEL — no
 * default is hardcoded here. Google's Gemini model lineup turns over every
 * few months (1.5 Flash is already gone as of writing this). Check
 * https://ai.google.dev/gemini-api/docs/models for the current
 * vision-capable model name before setting this.
 */
export class GeminiVisionProvider implements VisionProvider {
  readonly name = 'gemini';

  constructor(
    private apiKey: string,
    private model: string,
  ) {}

  async analyzeMealPhoto(imageBase64: string, mimeType: string): Promise<MealScanResult> {
    // Key goes in a header, not the URL, so it can never leak into logs
    // or error messages that print the request URL.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${normalizeGeminiModel(this.model)}:generateContent`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: MEAL_SCAN_INSTRUCTION },
                { inline_data: { mime_type: mimeType, data: imageBase64 } },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            // Thinking tokens count against this cap on current Gemini
            // models, so leave generous headroom for the JSON answer.
            maxOutputTokens: 4096,
          },
        }),
      });
    } catch (e) {
      throw new VisionProviderError(this.name, 'network request failed', e);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new VisionProviderError(this.name, `HTTP ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = (await res.json()) as GeminiGenerateContentResponse;
    const rawText = extractGeminiText(data);
    if (!rawText) {
      throw new VisionProviderError(this.name, explainEmptyGeminiResponse(data));
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
