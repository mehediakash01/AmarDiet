import type { FoodItem } from '@thali/types';
import type { ScannedFoodItem } from '@thali/schemas';
import type { VisionGateway } from './gateway.js';
import type { IMealScanRepository, MealScanStatus } from './meal-scan.repository.js';
import type { FoodService } from '../food/food.service.js';

const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6MB decoded — well under Groq's 20MB cap,
// generous relative to the ~150KB the client is expected to send after
// compression, but still a real ceiling rather than trusting the client.

const LOW_CONFIDENCE_THRESHOLD = 0.35;

export interface ScannedItemWithMatches extends ScannedFoodItem {
  /** Best-effort matches from our real, trusted food database — never
   *  invented nutrition numbers, always sourced the same way as every
   *  other food in this app. May be empty if nothing matched well; the
   *  user can always fall back to manual search. */
  matchedFoodCandidates: FoodItem[];
}

export interface ScanMealResult {
  status: MealScanStatus;
  providerUsed: string | null;
  confidence: number | null;
  items: ScannedItemWithMatches[];
  notes?: string;
  message: string;
}

export class AiService {
  constructor(
    private gateway: VisionGateway,
    private mealScanRepo: IMealScanRepository,
    private foodService: FoodService,
  ) {}

  /**
   * Rough, non-decoding size check on the base64 string itself (decoded
   * bytes are ~0.75x the base64 length) — cheap enough to run before doing
   * anything else, and rejects an oversized upload before it ever reaches
   * a provider (and their per-request cost/quota).
   */
  private isImageTooLarge(imageBase64: string): boolean {
    const approxDecodedBytes = imageBase64.length * 0.75;
    return approxDecodedBytes > MAX_IMAGE_BYTES;
  }

  async scanMeal(
    subscriberId: string,
    imageBase64: string,
    mimeType: string,
  ): Promise<{ ok: true; data: ScanMealResult } | { ok: false; status: number; error: string }> {
    if (this.isImageTooLarge(imageBase64)) {
      return {
        ok: false,
        status: 413,
        error: 'Image is too large. Please retake or use a smaller photo.',
      };
    }

    const startedAt = Date.now();
    const outcome = await this.gateway.scan(imageBase64, mimeType);
    const latencyMs = Date.now() - startedAt;

    if (outcome.outcome === 'all_providers_failed') {
      await this.mealScanRepo.record({
        subscriberId,
        providerUsed: null,
        status: 'all_providers_failed',
        confidence: null,
        identifiedItems: null,
        latencyMs,
      });

      return {
        ok: true,
        data: {
          status: 'all_providers_failed',
          providerUsed: null,
          confidence: null,
          items: [],
          message:
            "We couldn't analyze this photo right now. You can search and log this meal manually instead.",
        },
      };
    }

    const { result, providerUsed } = outcome;

    if (!result.isFood || result.items.length === 0) {
      await this.mealScanRepo.record({
        subscriberId,
        providerUsed,
        status: 'not_food',
        confidence: result.confidence,
        identifiedItems: [],
        latencyMs,
      });

      return {
        ok: true,
        data: {
          status: 'not_food',
          providerUsed,
          confidence: result.confidence,
          items: [],
          notes: result.notes,
          message:
            "We couldn't identify food in this photo clearly enough. Try a clearer shot, or search and log manually.",
        },
      };
    }

    const status: MealScanStatus =
      result.confidence < LOW_CONFIDENCE_THRESHOLD ? 'low_confidence' : 'success';

    // Best-effort match each identified item against the real food
    // database — this is what lets the review screen show real nutrition
    // per item instead of nothing. Never blocks on a miss; an item with
    // no good match just gets an empty candidate list, and the user
    // searches for it manually like they would for anything else.
    const itemsWithMatches: ScannedItemWithMatches[] = result.items.map((item) => ({
      ...item,
      matchedFoodCandidates: this.foodService.searchFoods({ q: item.name, limit: 3 }),
    }));

    await this.mealScanRepo.record({
      subscriberId,
      providerUsed,
      status,
      confidence: result.confidence,
      identifiedItems: result.items,
      latencyMs,
    });

    return {
      ok: true,
      data: {
        status,
        providerUsed,
        confidence: result.confidence,
        items: itemsWithMatches,
        notes: result.notes,
        message:
          status === 'low_confidence'
            ? "We identified this, but we're not fully confident — please double-check before logging."
            : 'Review the identified items below, then log the ones you want.',
      },
    };
  }
}
