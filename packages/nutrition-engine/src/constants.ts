// Activity multipliers per Mifflin-St Jeor convention.
// Source: Mifflin MD et al., "A new predictive equation for resting energy
// expenditure in healthy individuals." Am J Clin Nutr. 1990;51(2):241-7.
export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,       // little or no exercise
  lightly_active: 1.375, // light exercise 1-3 days/week
  active: 1.55,         // moderate exercise 3-5 days/week
  very_active: 1.725,   // hard exercise 6-7 days/week
} as const;

export type ActivityLevel = keyof typeof ACTIVITY_MULTIPLIERS;

export type Sex = 'male' | 'female';

export type Goal = 'lose_weight' | 'maintain' | 'gain_weight' | 'build_muscle';

// kcal/day adjustment applied to TDEE per goal.
export const GOAL_ADJUSTMENTS = {
  lose_weight:   -500, // moderate deficit; 0.45 kg/week fat loss
  maintain:         0,
  gain_weight:    300, // lean bulk surplus
  build_muscle:   200, // smaller surplus, emphasis on protein
} as const;

// Absolute minimum safe calorie floor (kcal/day).
// Applies to lose_weight only; other goals add to TDEE so floor not needed.
export const CALORIE_SAFETY_FLOOR = 1200;

// Flag returned when calculated target would breach floor.
export const CALORIE_FLOOR_BREACHED_FLAG = '__floor_applied__' as const;
