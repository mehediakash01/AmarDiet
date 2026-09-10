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

// Subscriber Schemas
export const CreateSubscriberSchema = z.object({
  id: z.string().uuid().optional(),
  phone: z.string().min(5).max(20).optional(),
});

export const SubscriberSchema = z.object({
  id: z.string(),
  phone: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended']),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateSubscriberInput = z.infer<typeof CreateSubscriberSchema>;
export type SubscriberOutput = z.infer<typeof SubscriberSchema>;

// Profile Schemas
export const SexSchema = z.enum(['male', 'female']);
export const ActivityLevelSchema = z.enum([
  'sedentary',
  'lightly_active',
  'active',
  'very_active',
]);
export const GoalSchema = z.enum([
  'lose_weight',
  'maintain',
  'gain_weight',
  'build_muscle',
]);
export const CuisinePreferenceSchema = z.enum(['bengali', 'mixed', 'western']);

export const SaveProfileSchema = z.object({
  subscriberId: z.string().min(1, 'subscriberId is required'),
  age: z.number().int().min(10, 'Age must be at least 10').max(120, 'Age must be at most 120'),
  sex: SexSchema,
  height_cm: z.number().positive('height_cm must be positive').max(300, 'height_cm must be realistic'),
  weight_kg: z.number().positive('weight_kg must be positive').max(500, 'weight_kg must be realistic'),
  activity_level: ActivityLevelSchema,
  goal: GoalSchema,
  target_weight_kg: z.number().positive('target_weight_kg must be positive').optional(),
  dietary_preferences: z.record(z.unknown()).optional(),
  cuisine_preference: CuisinePreferenceSchema.default('mixed'),
});

export type SaveProfileInput = z.infer<typeof SaveProfileSchema>;

export const NutritionTargetsSchema = z.object({
  bmr: z.number(),
  tdee: z.number(),
  calorieTarget: z.number(),
  macros: z.object({
    protein_g: z.number(),
    carbs_g: z.number(),
    fat_g: z.number(),
  }),
  safetyFloorApplied: z.boolean(),
});

export const ProfileWithNutritionSchema = z.object({
  profile: SaveProfileSchema.extend({
    updated_at: z.string(),
  }),
  nutrition: NutritionTargetsSchema,
});

export type ProfileWithNutritionOutput = z.infer<typeof ProfileWithNutritionSchema>;

// Food Log Schemas
export const MealSlotSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);

export const CalculatedNutritionSchema = z.object({
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  fiber: z.number().nonnegative(),
});

export const CreateFoodLogSchema = z.object({
  subscriberId: z.string().min(1, 'subscriberId is required'),
  loggedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'loggedOn must be YYYY-MM-DD format'),
  mealSlot: MealSlotSchema,
  foodId: z.string().min(1, 'foodId is required'),
  quantity: z.number().positive('quantity must be positive'),
  unit: z.string().min(1, 'unit is required').default('g'),
});

export const PatchFoodLogSchema = z.object({
  quantity: z.number().positive('quantity must be positive').optional(),
  unit: z.string().min(1).optional(),
  mealSlot: MealSlotSchema.optional(),
});

export const FoodLogQuerySchema = z.object({
  subscriberId: z.string().min(1, 'subscriberId is required'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD format'),
});

export const FoodSearchQuerySchema = z.object({
  q: z.string().optional().default(''),
  cuisinePreference: CuisinePreferenceSchema.optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});

export type CreateFoodLogInput = z.infer<typeof CreateFoodLogSchema>;
export type PatchFoodLogInput = z.infer<typeof PatchFoodLogSchema>;
export type FoodLogQueryInput = z.infer<typeof FoodLogQuerySchema>;
export type FoodSearchQueryInput = z.infer<typeof FoodSearchQuerySchema>;

// Diet Plan Schemas
export const DietPlanItemSchema = z.object({
  id: z.string().optional(),
  foodId: z.string().min(1, 'foodId is required'),
  foodName: z.string().min(1, 'foodName is required'),
  quantity: z.number().positive('quantity must be positive'),
  unit: z.string().min(1, 'unit is required').default('g'),
  calculatedNutrition: CalculatedNutritionSchema,
});

export const DietPlanMealSchema = z.object({
  mealSlot: MealSlotSchema,
  items: z.array(DietPlanItemSchema),
  isCustomized: z.boolean().default(false),
  subtotal: CalculatedNutritionSchema,
  targetNutrition: CalculatedNutritionSchema.optional(),
  deviationNote: z.string().optional(),
});

export const DietPlanDaySchema = z.object({
  day: z.string().min(1, 'day is required'),
  meals: z.array(DietPlanMealSchema),
  totals: CalculatedNutritionSchema,
});

export const DietPlanSchema = z.object({
  id: z.string(),
  subscriberId: z.string(),
  version: z.number().int().positive().default(1),
  calorieTarget: z.number().positive(),
  proteinTarget_g: z.number().nonnegative(),
  carbsTarget_g: z.number().nonnegative(),
  fatTarget_g: z.number().nonnegative(),
  days: z.array(DietPlanDaySchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const GenerateDietPlanSchema = z.object({
  subscriberId: z.string().min(1, 'subscriberId is required'),
});

export const AddDietPlanItemSchema = z.object({
  subscriberId: z.string().min(1, 'subscriberId is required'),
  day: z.string().min(1, 'day is required'),
  mealSlot: MealSlotSchema,
  foodId: z.string().min(1, 'foodId is required'),
  quantity: z.number().positive('quantity must be positive'),
  unit: z.string().min(1).default('g'),
});

export const RemoveDietPlanItemSchema = z.object({
  subscriberId: z.string().min(1, 'subscriberId is required'),
  day: z.string().min(1, 'day is required'),
  mealSlot: MealSlotSchema,
  foodId: z.string().min(1, 'foodId is required'),
  itemIndex: z.number().int().nonnegative().optional(),
});

export type DietPlanItemInput = z.infer<typeof DietPlanItemSchema>;
export type DietPlanMealInput = z.infer<typeof DietPlanMealSchema>;
export type DietPlanDayInput = z.infer<typeof DietPlanDaySchema>;
export type DietPlanOutput = z.infer<typeof DietPlanSchema>;
export type GenerateDietPlanInput = z.infer<typeof GenerateDietPlanSchema>;
export type AddDietPlanItemInput = z.infer<typeof AddDietPlanItemSchema>;
export type RemoveDietPlanItemInput = z.infer<typeof RemoveDietPlanItemSchema>;

