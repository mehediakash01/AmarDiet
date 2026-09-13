import { randomUUID } from 'crypto';
import type { CuisinePreference, FoodItem } from '@thali/types';
import type { AdminCreateFoodInput, AdminPatchFoodInput } from '@thali/schemas';
import type { IFoodRepository } from './food.repository.js';

export interface SearchFoodsOptions {
  q?: string;
  cuisinePreference?: CuisinePreference;
  limit?: number;
}

export class FoodService {
  // In-memory read cache kept in sync with the repository so search stays
  // fast and synchronous. The repository (Drizzle or InMemory) is always
  // the source of truth — this cache is rebuilt from it on init() and
  // after every mutation.
  private cache: Map<string, FoodItem> = new Map();
  private initialized = false;

  constructor(private repository: IFoodRepository) {}

  /**
   * Must be awaited once at startup before the food routes are registered.
   */
  async init(): Promise<void> {
    const all = await this.repository.findAll();
    this.cache = new Map(all.map((f) => [f.id, f]));
    this.initialized = true;
  }

  private assertInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        'FoodService.init() must be awaited before use — the food catalog has not been loaded yet.',
      );
    }
  }

  /**
   * Search across the unified food catalog.
   * Cuisine tags and user preference are used ONLY for score boosting / ranking,
   * never as an exclusion filter.
   */
  searchFoods(options: SearchFoodsOptions = {}): FoodItem[] {
    this.assertInitialized();
    const query = (options.q || '').trim().toLowerCase();
    const cuisinePref = options.cuisinePreference;
    const limit = options.limit || 50;

    const allFoods = Array.from(this.cache.values());

    if (!query) {
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
        if (cuisinePref && cuisinePref !== 'mixed' && food.cuisineTags.includes(cuisinePref)) {
          score += 5;
        }
        scoredFoods.push({ food, score });
      }
    }

    scoredFoods.sort((a, b) => b.score - a.score);
    return scoredFoods.map((item) => item.food).slice(0, limit);
  }

  getFoodById(id: string): FoodItem | null {
    this.assertInitialized();
    return this.cache.get(id) ?? null;
  }

  /**
   * Add a new food item into the universal catalog.
   * Persists to the repository, then updates the search cache — immediately
   * searchable without an application rebuild AND surviving a restart.
   */
  async addCustomFood(input: AdminCreateFoodInput): Promise<FoodItem> {
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

    const saved = await this.repository.upsert(food);
    this.cache.set(saved.id, saved);
    return saved;
  }

  /**
   * Update existing food item in catalog. Persists to the repository, then
   * updates the search cache.
   */
  async updateCustomFood(id: string, updates: AdminPatchFoodInput): Promise<FoodItem | null> {
    const existing = this.cache.get(id);
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

    const saved = await this.repository.upsert(updated);
    this.cache.set(saved.id, saved);
    return saved;
  }
}
