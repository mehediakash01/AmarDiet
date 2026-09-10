import { randomUUID } from 'crypto';
import { FOOD_DATASET } from '@thali/food-data';
import type { CuisinePreference, FoodItem } from '@thali/types';
import type { AdminCreateFoodInput, AdminPatchFoodInput } from '@thali/schemas';

export interface SearchFoodsOptions {
  q?: string;
  cuisinePreference?: CuisinePreference;
  limit?: number;
}

export class FoodService {
  private customFoods = new Map<string, FoodItem>();

  constructor() {
    // Pre-populate with base dataset
    for (const food of FOOD_DATASET) {
      this.customFoods.set(food.id, { ...food });
    }
  }

  /**
   * Search across the unified food catalog.
   * Cuisine tags and user preference are used ONLY for score boosting / ranking,
   * never as an exclusion filter.
   */
  searchFoods(options: SearchFoodsOptions = {}): FoodItem[] {
    const query = (options.q || '').trim().toLowerCase();
    const cuisinePref = options.cuisinePreference;
    const limit = options.limit || 50;

    const allFoods = Array.from(this.customFoods.values());

    if (!query) {
      // If no search query, return default dataset, slightly prioritizing preferred cuisine if provided
      if (!cuisinePref || cuisinePref === 'mixed') {
        return allFoods.slice(0, limit);
      }
      return [...allFoods]
        .sort((a, b) => {
          const aMatch = a.cuisineTags.includes(cuisinePref) ? 1 : 0;
          const bMatch = b.cuisineTags.includes(cuisinePref) ? 1 : 0;
          return bMatch - aMatch;
        })
        .slice(0, limit);
    }

    // Score and rank each food
    const scoredFoods: Array<{ food: FoodItem; score: number }> = [];

    for (const food of allFoods) {
      let score = 0;
      const canonicalLower = food.canonicalName.toLowerCase();
      const localMatches = food.localNames.some((n: string) => n.toLowerCase().includes(query));
      const aliasMatches = food.aliases.some((a: string) => a.toLowerCase().includes(query));
      const categoryMatches = food.category.toLowerCase().includes(query);
      const tagMatches = food.cuisineTags.some((t: string) => t.toLowerCase().includes(query));

      if (canonicalLower === query) {
        score += 100;
      } else if (canonicalLower.startsWith(query)) {
        score += 75;
      } else if (canonicalLower.includes(query)) {
        score += 50;
      }

      if (localMatches) score += 40;
      if (aliasMatches) score += 30;
      if (categoryMatches) score += 20;
      if (tagMatches) score += 15;

      if (score > 0) {
        // Soft bias boost: if user has a cuisine preference and food matches, boost rank slightly
        if (cuisinePref && cuisinePref !== 'mixed' && food.cuisineTags.includes(cuisinePref)) {
          score += 5;
        }

        scoredFoods.push({ food, score });
      }
    }

    // Sort descending by score
    scoredFoods.sort((a, b) => b.score - a.score);

    return scoredFoods.map((item) => item.food).slice(0, limit);
  }

  getFoodById(id: string): FoodItem | null {
    return this.customFoods.get(id) ?? null;
  }

  /**
   * Add a new food item into the universal catalog.
   * Immediately searchable without application rebuild.
   */
  addCustomFood(input: AdminCreateFoodInput): FoodItem {
    const id = input.id || `food_custom_${Date.now()}_${randomUUID().substring(0, 6)}`;
    const food: FoodItem = {
      id,
      canonicalName: input.canonicalName,
      localNames: input.localNames || [],
      aliases: input.aliases || [],
      cuisineTags: input.cuisineTags,
      category: input.category,
      caloriesPer100g: input.caloriesPer100g,
      proteinPer100g: input.proteinPer100g,
      carbsPer100g: input.carbsPer100g,
      fatPer100g: input.fatPer100g,
      fiberPer100g: input.fiberPer100g ?? 0,
      commonServings: input.commonServings,
      source: input.source || 'Admin Entry',
      sourceVersion: input.sourceVersion || '1.0',
      verifiedAt: input.verifiedAt || new Date().toISOString().split('T')[0],
    };

    this.customFoods.set(id, food);
    return food;
  }

  /**
   * Update existing food item in catalog.
   */
  updateCustomFood(id: string, updates: AdminPatchFoodInput): FoodItem | null {
    const existing = this.customFoods.get(id);
    if (!existing) return null;

    const updated: FoodItem = {
      ...existing,
      ...updates,
      localNames: updates.localNames || existing.localNames,
      aliases: updates.aliases || existing.aliases,
      cuisineTags: updates.cuisineTags || existing.cuisineTags,
      commonServings: updates.commonServings || existing.commonServings,
      verifiedAt: new Date().toISOString().split('T')[0],
    };

    this.customFoods.set(id, updated);
    return updated;
  }
}
