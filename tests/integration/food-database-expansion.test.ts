import { describe, it, expect } from 'vitest';
import { FoodItemSchema, AdminCreateFoodSchema } from '@thali/schemas';
import {
  FOOD_DATASET,
  USDA_FOOD_DATASET,
  OFF_FOOD_DATASET,
} from '../../packages/food-data/src/index.js';
import {
  evaluateCandidate,
  normalizeFoodName,
} from '../../scripts/import-foods.js';
import type { FoodItem } from '@thali/types';

describe('Phase 5: Food Database Expansion & Governance', () => {
  describe('Schema Validation & New Fields', () => {
    it('accepts valid food sources: SEED, USDA, OPEN_FOOD_FACTS, USER', () => {
      const baseFood: FoodItem = {
        id: 'test_food_1',
        canonicalName: 'Test Food',
        localNames: ['টেস্ট খাবার'],
        aliases: ['Testing Item'],
        cuisineTags: ['generic'],
        category: 'protein',
        caloriesPer100g: 100,
        proteinPer100g: 20,
        carbsPer100g: 0,
        fatPer100g: 2,
        fiberPer100g: 0,
        commonServings: [{ label: '1 serving', grams: 100 }],
        source: 'USDA',
        isVerified: true,
        barcode: '123456789012',
      };

      const result = FoodItemSchema.safeParse(baseFood);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.source).toBe('USDA');
        expect(result.data.isVerified).toBe(true);
        expect(result.data.barcode).toBe('123456789012');
      }
    });

    it('AdminCreateFoodSchema defaults source to USER and isVerified to false', () => {
      const adminInput = {
        canonicalName: 'Admin Custom Protein Bar',
        cuisineTags: ['western'],
        category: 'protein',
        caloriesPer100g: 250,
        proteinPer100g: 20,
        carbsPer100g: 25,
        fatPer100g: 5,
        commonServings: [{ label: '1 bar', grams: 60 }],
      };

      const result = AdminCreateFoodSchema.safeParse(adminInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.source).toBe('USER');
        expect(result.data.isVerified).toBe(false);
      }
    });

    it('all static seed items pass validation', () => {
      for (const food of FOOD_DATASET) {
        const parsed = FoodItemSchema.safeParse(food);
        expect(parsed.success).toBe(true);
      }
    });

    it('all curated USDA items have isVerified=true and source=USDA', () => {
      expect(USDA_FOOD_DATASET.length).toBeGreaterThan(0);
      for (const food of USDA_FOOD_DATASET) {
        expect(food.source).toBe('USDA');
        expect(food.isVerified).toBe(true);
        const parsed = FoodItemSchema.safeParse(food);
        expect(parsed.success).toBe(true);
      }
    });

    it('all curated Open Food Facts items have barcodes and source=OPEN_FOOD_FACTS', () => {
      expect(OFF_FOOD_DATASET.length).toBeGreaterThan(0);
      for (const food of OFF_FOOD_DATASET) {
        expect(food.source).toBe('OPEN_FOOD_FACTS');
        expect(food.isVerified).toBe(false);
        expect(food.barcode).toBeTruthy();
        expect(typeof food.barcode).toBe('string');
        const parsed = FoodItemSchema.safeParse(food);
        expect(parsed.success).toBe(true);
      }
    });
  });

  describe('Deduplication & Bengali SEED Precedence', () => {
    const existingSeedCatalog: FoodItem[] = [
      {
        id: 'seed_bhat',
        canonicalName: 'Steamed White Rice',
        localNames: ['ভাত', 'সাদা ভাত', 'Sada Bhat'],
        aliases: ['Boiled Rice', 'Cooked White Rice'],
        cuisineTags: ['bengali', 'staple'],
        category: 'grain',
        caloriesPer100g: 130,
        proteinPer100g: 2.7,
        carbsPer100g: 28.2,
        fatPer100g: 0.3,
        fiberPer100g: 0.4,
        commonServings: [{ label: '1 cup', grams: 150 }],
        source: 'SEED',
        isVerified: true,
        barcode: '894100000001',
      },
    ];

    it('normalizes names correctly for fuzzy comparison', () => {
      expect(normalizeFoodName('Steamed White Rice')).toBe('steamedwhiterice');
      expect(normalizeFoodName('Steamed  White - Rice!')).toBe('steamedwhiterice');
    });

    it('skips import candidate when exact barcode matches a SEED item (SEED wins)', () => {
      const candidate: FoodItem = {
        id: 'off_rice_box',
        canonicalName: 'Brand X Steamed Rice',
        localNames: ['চাল'],
        aliases: [],
        cuisineTags: ['generic'],
        category: 'grain',
        caloriesPer100g: 140, // Different nutrition
        proteinPer100g: 3.0,
        carbsPer100g: 30.0,
        fatPer100g: 0.5,
        fiberPer100g: 0.5,
        commonServings: [{ label: '1 pack', grams: 200 }],
        source: 'OPEN_FOOD_FACTS',
        barcode: '894100000001', // Same barcode as SEED item
      };

      const outcome = evaluateCandidate(candidate, existingSeedCatalog);
      expect(outcome.status).toBe('skipped_seed_precedence');
      expect(outcome.matchedId).toBe('seed_bhat');
    });

    it('protects SEED nutrition truth but merges local transliterations on name match', () => {
      const candidate: FoodItem = {
        id: 'usda_white_rice',
        canonicalName: 'Steamed White Rice',
        localNames: ['সাদা চালের ভাত', 'Bhat'], // Contains new local name
        aliases: ['Cooked Rice'],
        cuisineTags: ['generic'],
        category: 'grain',
        caloriesPer100g: 130,
        proteinPer100g: 2.7,
        carbsPer100g: 28.2,
        fatPer100g: 0.3,
        fiberPer100g: 0.4,
        commonServings: [{ label: '1 cup', grams: 150 }],
        source: 'USDA',
        isVerified: true,
      };

      const outcome = evaluateCandidate(candidate, existingSeedCatalog);
      expect(outcome.status).toBe('merged_names');
      expect(outcome.matchedId).toBe('seed_bhat');
    });

    it('inserts candidate cleanly when no barcode or name collision exists', () => {
      const candidate: FoodItem = {
        id: 'usda_quinoa',
        canonicalName: 'Quinoa Grain Cooked',
        localNames: ['কিনোয়া'],
        aliases: ['Cooked Quinoa'],
        cuisineTags: ['western'],
        category: 'grain',
        caloriesPer100g: 120,
        proteinPer100g: 4.4,
        carbsPer100g: 21.3,
        fatPer100g: 1.9,
        fiberPer100g: 2.8,
        commonServings: [{ label: '1 cup', grams: 185 }],
        source: 'USDA',
        isVerified: true,
        barcode: '012345678999',
      };

      const outcome = evaluateCandidate(candidate, existingSeedCatalog);
      expect(outcome.status).toBe('inserted');
    });

    it('updates non-SEED items when barcode collides with previous non-SEED entry', () => {
      const catalogWithOff: FoodItem[] = [
        ...existingSeedCatalog,
        {
          id: 'off_maggi_old',
          canonicalName: 'Maggi Noodles Old',
          localNames: ['ম্যাগি'],
          aliases: [],
          cuisineTags: ['packaged'],
          category: 'packaged',
          caloriesPer100g: 400,
          proteinPer100g: 7,
          carbsPer100g: 60,
          fatPer100g: 14,
          fiberPer100g: 2,
          commonServings: [{ label: '1 pack', grams: 70 }],
          source: 'OPEN_FOOD_FACTS',
          barcode: '8901058852899',
        },
      ];

      const candidate: FoodItem = {
        id: 'off_maggi_new',
        canonicalName: 'Maggi Noodles 2026',
        localNames: ['ম্যাগি ২ মিনিট'],
        aliases: [],
        cuisineTags: ['packaged'],
        category: 'packaged',
        caloriesPer100g: 427,
        proteinPer100g: 8,
        carbsPer100g: 63.5,
        fatPer100g: 15.7,
        fiberPer100g: 3.6,
        commonServings: [{ label: '1 pack', grams: 70 }],
        source: 'OPEN_FOOD_FACTS',
        barcode: '8901058852899',
      };

      const outcome = evaluateCandidate(candidate, catalogWithOff);
      expect(outcome.status).toBe('updated');
      expect(outcome.matchedId).toBe('off_maggi_old');
    });
  });
});
