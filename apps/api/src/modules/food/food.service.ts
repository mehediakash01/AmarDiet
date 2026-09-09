import { getAllFoods, getFoodById } from '@thali/food-data';
import type { CuisinePreference, FoodItem } from '@thali/types';

export interface SearchFoodsOptions {
  q?: string;
  cuisinePreference?: CuisinePreference;
  limit?: number;
}

export class FoodService {
  /**
   * Search across the unified food catalog.
   * Cuisine tags and user preference are used ONLY for score boosting / ranking,
   * never as an exclusion filter.
   */
  searchFoods(options: SearchFoodsOptions = {}): FoodItem[] {
    const query = (options.q || '').trim().toLowerCase();
    const cuisinePref = options.cuisinePreference;
    const limit = options.limit || 50;

    const allFoods = getAllFoods();

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
    return getFoodById(id) ?? null;
  }
}
