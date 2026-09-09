import { z } from 'zod';

export const CommonServingSchema = z.object({
  label: z.string().min(1, 'Serving label is required'),
  grams: z.number().positive('Serving grams must be positive'),
});

export const FoodItemSchema = z.object({
  id: z.string().min(1, 'Food ID is required'),
  canonicalName: z.string().min(1, 'Canonical name is required'),
  localNames: z.array(z.string()),
  aliases: z.array(z.string()),
  cuisineTags: z.array(z.string()),
  category: z.string().min(1, 'Category is required'),
  caloriesPer100g: z.number().nonnegative('Calories per 100g must be non-negative'),
  proteinPer100g: z.number().nonnegative('Protein per 100g must be non-negative'),
  carbsPer100g: z.number().nonnegative('Carbs per 100g must be non-negative'),
  fatPer100g: z.number().nonnegative('Fat per 100g must be non-negative'),
  fiberPer100g: z.number().nonnegative('Fiber per 100g must be non-negative'),
  commonServings: z.array(CommonServingSchema).min(1, 'At least one common serving required'),
  source: z.string().optional(),
  sourceVersion: z.string().optional(),
  verifiedAt: z.string().optional(),
});

export type FoodItemInput = z.infer<typeof FoodItemSchema>;
export type CommonServingInput = z.infer<typeof CommonServingSchema>;

