import type { FoodItem } from '@thali/types';
import { FOOD_DATASET } from './foods.js';

export { FOOD_DATASET } from './foods.js';
export type { FoodItem, CommonServing } from '@thali/types';

/**
 * Retrieve all foods in the static dataset.
 */
export function getAllFoods(): FoodItem[] {
  return FOOD_DATASET;
}

/**
 * Find a specific food item by its unique ID.
 */
export function getFoodById(id: string): FoodItem | undefined {
  return FOOD_DATASET.find((food) => food.id === id);
}

/**
 * Cuisine-agnostic search across canonical names, Bengali/local names, aliases, and tags.
 * Treats cuisine purely as metadata tags rather than a filter barrier.
 */
export function searchFoods(query: string): FoodItem[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return FOOD_DATASET;
  }

  return FOOD_DATASET.filter((food) => {
    if (food.canonicalName.toLowerCase().includes(trimmed)) {
      return true;
    }
    if (food.category.toLowerCase().includes(trimmed)) {
      return true;
    }
    if (food.localNames.some((n) => n.toLowerCase().includes(trimmed))) {
      return true;
    }
    if (food.aliases.some((a) => a.toLowerCase().includes(trimmed))) {
      return true;
    }
    if (food.cuisineTags.some((tag) => tag.toLowerCase().includes(trimmed))) {
      return true;
    }
    return false;
  });
}
