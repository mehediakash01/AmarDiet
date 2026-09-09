/**
 * Food Data Validation Script
 *
 * Validates that all items in packages/food-data satisfy schema requirements:
 *  - Required nutrition fields (calories, protein, carbs, fat, fiber) present, non-null, and non-negative (>= 0).
 *  - Unique food IDs.
 *  - Valid serving portions (grams > 0).
 *  - Cuisine treated as metadata tags, not data silos.
 *
 * Throws an Error and exits with code 1 if any validation failure is found.
 */

import { FOOD_DATASET } from '../packages/food-data/src/foods.js';
import { FoodItemSchema } from '../packages/schemas/src/index.js';

interface ValidationError {
  foodId: string;
  foodName?: string;
  field: string;
  issue: string;
  value?: unknown;
}

export function validateFoodDataset(): { totalCount: number; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const seenIds = new Set<string>();

  if (!Array.isArray(FOOD_DATASET) || FOOD_DATASET.length === 0) {
    throw new Error('Validation failed: FOOD_DATASET is empty or not an array.');
  }

  const requiredNutritionFields = [
    'caloriesPer100g',
    'proteinPer100g',
    'carbsPer100g',
    'fatPer100g',
    'fiberPer100g',
  ] as const;

  for (let i = 0; i < FOOD_DATASET.length; i++) {
    const item = FOOD_DATASET[i];
    const indexLabel = `item[${i}]`;

    if (!item || typeof item !== 'object') {
      errors.push({
        foodId: indexLabel,
        field: 'item',
        issue: 'Food item is null or not an object',
      });
      continue;
    }

    const foodId = item.id || `${indexLabel}_missing_id`;
    const foodName = item.canonicalName || 'UNKNOWN_NAME';

    // 1. Unique ID check
    if (!item.id || typeof item.id !== 'string' || item.id.trim() === '') {
      errors.push({
        foodId,
        foodName,
        field: 'id',
        issue: 'id must be a non-empty string',
        value: item.id,
      });
    } else if (seenIds.has(item.id)) {
      errors.push({
        foodId,
        foodName,
        field: 'id',
        issue: `Duplicate food ID "${item.id}" detected`,
        value: item.id,
      });
    } else {
      seenIds.add(item.id);
    }

    // 2. Canonical Name
    if (!item.canonicalName || typeof item.canonicalName !== 'string' || item.canonicalName.trim() === '') {
      errors.push({
        foodId,
        foodName,
        field: 'canonicalName',
        issue: 'canonicalName must be a non-empty string',
        value: item.canonicalName,
      });
    }

    // 3. Category
    if (!item.category || typeof item.category !== 'string' || item.category.trim() === '') {
      errors.push({
        foodId,
        foodName,
        field: 'category',
        issue: 'category must be a non-empty string',
        value: item.category,
      });
    }

    // 4. Array fields
    if (!Array.isArray(item.localNames)) {
      errors.push({
        foodId,
        foodName,
        field: 'localNames',
        issue: 'localNames must be an array',
        value: item.localNames,
      });
    }

    if (!Array.isArray(item.aliases)) {
      errors.push({
        foodId,
        foodName,
        field: 'aliases',
        issue: 'aliases must be an array',
        value: item.aliases,
      });
    }

    if (!Array.isArray(item.cuisineTags) || item.cuisineTags.length === 0) {
      errors.push({
        foodId,
        foodName,
        field: 'cuisineTags',
        issue: 'cuisineTags must be a non-empty array of metadata tags',
        value: item.cuisineTags,
      });
    }

    // 5. Strict Nutrition Fields Check (missing, null, non-number, NaN, or negative)
    for (const field of requiredNutritionFields) {
      const val = item[field];
      if (val === undefined || val === null) {
        errors.push({
          foodId,
          foodName,
          field,
          issue: `Required nutrition field "${field}" is missing or null`,
          value: val,
        });
      } else if (typeof val !== 'number' || !Number.isFinite(val)) {
        errors.push({
          foodId,
          foodName,
          field,
          issue: `Nutrition field "${field}" must be a finite number`,
          value: val,
        });
      } else if (val < 0) {
        errors.push({
          foodId,
          foodName,
          field,
          issue: `Nutrition field "${field}" cannot be negative (got ${val})`,
          value: val,
        });
      }
    }

    // 6. Common Servings Check
    if (!Array.isArray(item.commonServings) || item.commonServings.length === 0) {
      errors.push({
        foodId,
        foodName,
        field: 'commonServings',
        issue: 'commonServings must have at least one valid portion',
        value: item.commonServings,
      });
    } else {
      item.commonServings.forEach((serving, sIdx) => {
        if (!serving || typeof serving !== 'object') {
          errors.push({
            foodId,
            foodName,
            field: `commonServings[${sIdx}]`,
            issue: 'Serving entry is null or not an object',
            value: serving,
          });
        } else {
          if (!serving.label || typeof serving.label !== 'string' || serving.label.trim() === '') {
            errors.push({
              foodId,
              foodName,
              field: `commonServings[${sIdx}].label`,
              issue: 'Serving label must be non-empty string',
              value: serving.label,
            });
          }
          if (typeof serving.grams !== 'number' || !Number.isFinite(serving.grams) || serving.grams <= 0) {
            errors.push({
              foodId,
              foodName,
              field: `commonServings[${sIdx}].grams`,
              issue: `Serving grams must be positive number, got ${serving.grams}`,
              value: serving.grams,
            });
          }
        }
      });
    }

    // 7. Schema parser check (Zod)
    const zodResult = FoodItemSchema.safeParse(item);
    if (!zodResult.success) {
      zodResult.error.errors.forEach((zErr) => {
        errors.push({
          foodId,
          foodName,
          field: `zod:${zErr.path.join('.')}`,
          issue: zErr.message,
        });
      });
    }
  }

  return { totalCount: FOOD_DATASET.length, errors };
}

// Execute if run directly
function main() {
  console.log('--- Starting Food Data Validation ---');
  const { totalCount, errors } = validateFoodDataset();

  if (errors.length > 0) {
    console.error(`\n❌ Validation FAILED with ${errors.length} error(s):`);
    errors.forEach((err, i) => {
      console.error(
        `  ${i + 1}. [${err.foodId}] (${err.foodName || 'N/A'}) -> ${err.field}: ${err.issue} (Value: ${JSON.stringify(err.value)})`
      );
    });
    throw new Error(`Food dataset validation failed with ${errors.length} errors.`);
  }

  // Count tags and categories
  const categories = new Set(FOOD_DATASET.map((f) => f.category));
  const cuisineTags = new Set(FOOD_DATASET.flatMap((f) => f.cuisineTags));

  console.log(`\n✅ Validation PASSED for all ${totalCount} food items.`);
  console.log(`   - Unique Categories (${categories.size}): ${Array.from(categories).join(', ')}`);
  console.log(`   - Unique Cuisine Tags (${cuisineTags.size}): ${Array.from(cuisineTags).join(', ')}`);
  console.log('   - 0 missing, null, or negative nutrition fields.');
  console.log('   - Dataset is clean, normalized, and unified in a single collection.\n');
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
