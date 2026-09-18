import type { MealScanResult } from '@thali/schemas';

/**
 * Every vision provider (Gemini, Groq, OpenRouter, or anything added later)
 * implements exactly this. The gateway doesn't know or care which provider
 * it's talking to — that's the whole point: adding a 4th or 5th free
 * provider later is just writing one more class that implements this
 * interface and registering it, nothing else changes.
 */
export interface VisionProvider {
  /** Short identifier used in logs and the meal_scan_events table. */
  readonly name: string;

  analyzeMealPhoto(imageBase64: string, mimeType: string): Promise<MealScanResult>;
}

/**
 * Thrown by a provider implementation for ANY failure — network error,
 * non-200 response, malformed JSON, or a response that fails Zod
 * validation. The gateway treats all of these identically: this provider
 * didn't come through, move to the next one. A provider must never
 * swallow a bad response and return something that merely LOOKS valid.
 */
export class VisionProviderError extends Error {
  constructor(
    public readonly providerName: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(`[${providerName}] ${message}`);
    this.name = 'VisionProviderError';
  }
}

/**
 * The prompt instruction shared across all providers, so the "allowed to
 * say I don't know" contract is consistent regardless of which model
 * ends up answering. Individual providers may wrap this in their own
 * system/user message structure, but the substance stays identical.
 */
export const MEAL_SCAN_INSTRUCTION = `You are analyzing a single photo for a food-tracking app.

Identify each distinct food item visible in the photo, and estimate its
quantity using a plain unit (grams, pieces, cups, etc).

Respond with ONLY a JSON object matching this exact shape, no other text:
{
  "isFood": boolean,
  "confidence": number between 0 and 1 (your overall confidence this is a clear, identifiable food photo),
  "items": [
    {
      "name": string (plain food name, e.g. "steamed rice", "grilled chicken breast"),
      "estimatedQuantity": number,
      "estimatedUnit": string (e.g. "g", "piece", "cup"),
      "confidence": number between 0 and 1 (your confidence in THIS item specifically)
    }
  ],
  "notes": string (optional, e.g. "portion size hard to judge from this angle")
}

IMPORTANT: If the photo is not food, is too blurry or unclear to identify,
or you are not reasonably confident, set "isFood": false and "items": [].
Do NOT guess or invent items you are not reasonably confident about. An
honest "isFood": false is far more useful than a fabricated guess.

Do NOT include calorie counts, macros, or any nutrition numbers — only
identify the food and estimate quantity. Nutrition values are computed
separately from a verified database.`;
