/**
 * Exercise — deterministic calories-burned calculation + activity catalog.
 *
 * Formula (one, on purpose):
 *
 *     kcal = MET × weight_kg × hours        (hours = minutes / 60)
 *
 * Why this one: the Compendium of Physical Activities defines 1 MET as roughly
 * 1 kcal per kg of body weight per hour, so this is the formula its MET values
 * were written for, and it is easy to explain ("a 70 kg person walking briskly,
 * 4.3 METs, for an hour burns about 301 kcal"). The other common form,
 * MET × 3.5 × kg / 200 × minutes, assumes 5 kcal per litre of oxygen and gives
 * values about 5% higher; we do not mix the two.
 *
 * MET values: 2011 Compendium of Physical Activities
 *   Ainsworth BE, Haskell WL, Herrmann SD, et al. "2011 Compendium of Physical
 *   Activities: a second update of codes and MET values." Med Sci Sports Exerc.
 *   2011;43(8):1575-81. https://pacompendium.com
 * Each catalog entry keeps its Compendium code so a value can be audited.
 *
 * These are population averages, not a measurement: real burn varies with
 * fitness, terrain, technique and body composition. The result is an estimate.
 */

export const EXERCISE_MIN_MINUTES = 1;
export const EXERCISE_MAX_MINUTES = 600;
/** Highest MET in the Compendium is 23.0 (running 14 mph); anything above this is a data error. */
export const EXERCISE_MAX_MET = 25;
/** Matches the profile schema's weight ceiling. */
export const EXERCISE_MAX_WEIGHT_KG = 500;

export type ExerciseCategory =
  | 'walking'
  | 'running'
  | 'cycling'
  | 'swimming'
  | 'sports'
  | 'gym'
  | 'mind_body'
  | 'dance'
  | 'household';

export const EXERCISE_CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  walking: 'Walking',
  running: 'Running',
  cycling: 'Cycling',
  swimming: 'Swimming',
  sports: 'Sports',
  gym: 'Gym',
  mind_body: 'Yoga & stretching',
  dance: 'Dance',
  household: 'Household',
};

export interface ExerciseActivity {
  /** Stable id stored in the database. Never rename a key once shipped. */
  key: string;
  /** Name shown to the user. */
  name: string;
  category: ExerciseCategory;
  /** Metabolic equivalent of task (multiples of resting energy use). */
  met: number;
  /** 2011 Compendium of Physical Activities code this MET comes from. */
  compendiumCode: string;
}

export interface ExerciseCaloriesInput {
  met: number;
  weight_kg: number;
  minutes: number;
}

// Order = display order inside each category (easy to hard).
export const EXERCISE_CATALOG: readonly ExerciseActivity[] = [
  // Walking
  { key: 'walk_slow', name: 'Walking, slow (3 km/h)', category: 'walking', met: 2.8, compendiumCode: '17152' },
  { key: 'walk_moderate', name: 'Walking, moderate (4.5\u20135 km/h)', category: 'walking', met: 3.5, compendiumCode: '17190' },
  { key: 'walk_brisk', name: 'Walking, brisk (5.6 km/h)', category: 'walking', met: 4.3, compendiumCode: '17200' },
  { key: 'walk_very_brisk', name: 'Walking, very brisk (6.4 km/h)', category: 'walking', met: 5.0, compendiumCode: '17220' },
  { key: 'hiking', name: 'Hiking, cross-country', category: 'walking', met: 6.0, compendiumCode: '17080' },
  { key: 'stairs_slow', name: 'Climbing stairs, slow pace', category: 'walking', met: 4.0, compendiumCode: '17133' },
  { key: 'stairs_fast', name: 'Climbing stairs, fast pace', category: 'walking', met: 8.8, compendiumCode: '17134' },

  // Running
  { key: 'jogging', name: 'Jogging', category: 'running', met: 7.0, compendiumCode: '12020' },
  { key: 'running_8kmh', name: 'Running, 8 km/h (12 min/mile)', category: 'running', met: 8.3, compendiumCode: '12030' },
  { key: 'running_10kmh', name: 'Running, 9.7 km/h (10 min/mile)', category: 'running', met: 9.8, compendiumCode: '12050' },

  // Cycling
  { key: 'cycling_leisure', name: 'Cycling, leisure (under 16 km/h)', category: 'cycling', met: 4.0, compendiumCode: '01010' },
  { key: 'cycling_moderate', name: 'Cycling, moderate (19\u201322 km/h)', category: 'cycling', met: 8.0, compendiumCode: '01030' },
  { key: 'cycling_fast', name: 'Cycling, fast (22\u201326 km/h)', category: 'cycling', met: 10.0, compendiumCode: '01040' },
  { key: 'cycling_stationary', name: 'Stationary bike', category: 'cycling', met: 7.0, compendiumCode: '02010' },

  // Swimming
  { key: 'swim_leisure', name: 'Swimming, leisurely', category: 'swimming', met: 6.0, compendiumCode: '18310' },
  { key: 'swim_laps_easy', name: 'Swimming laps, easy to moderate', category: 'swimming', met: 5.8, compendiumCode: '18240' },
  { key: 'swim_laps_fast', name: 'Swimming laps, fast', category: 'swimming', met: 9.8, compendiumCode: '18230' },

  // Sports
  { key: 'cricket', name: 'Cricket (batting, bowling, fielding)', category: 'sports', met: 4.8, compendiumCode: '15150' },
  { key: 'table_tennis', name: 'Table tennis', category: 'sports', met: 4.0, compendiumCode: '15660' },
  { key: 'badminton_social', name: 'Badminton, social', category: 'sports', met: 5.5, compendiumCode: '15030' },
  { key: 'badminton_competitive', name: 'Badminton, competitive', category: 'sports', met: 7.0, compendiumCode: '15020' },
  { key: 'basketball', name: 'Basketball', category: 'sports', met: 6.5, compendiumCode: '15055' },
  { key: 'football_casual', name: 'Football (soccer), casual', category: 'sports', met: 7.0, compendiumCode: '15610' },
  { key: 'football_competitive', name: 'Football (soccer), competitive', category: 'sports', met: 10.0, compendiumCode: '15605' },
  { key: 'tennis', name: 'Tennis', category: 'sports', met: 7.3, compendiumCode: '15675' },
  { key: 'rope_jumping', name: 'Skipping rope, moderate pace', category: 'sports', met: 11.8, compendiumCode: '15551' },

  // Gym
  { key: 'weights_general', name: 'Weight training, general', category: 'gym', met: 3.5, compendiumCode: '02054' },
  { key: 'weights_vigorous', name: 'Weight training, vigorous', category: 'gym', met: 6.0, compendiumCode: '02050' },
  { key: 'calisthenics_moderate', name: 'Calisthenics (push-ups, sit-ups), moderate', category: 'gym', met: 3.8, compendiumCode: '02022' },
  { key: 'calisthenics_vigorous', name: 'Calisthenics, vigorous', category: 'gym', met: 8.0, compendiumCode: '02020' },
  { key: 'rowing_machine', name: 'Rowing machine, moderate', category: 'gym', met: 4.8, compendiumCode: '02071' },
  { key: 'elliptical', name: 'Elliptical trainer, moderate', category: 'gym', met: 5.0, compendiumCode: '02048' },

  // Yoga & stretching
  { key: 'stretching', name: 'Stretching, mild', category: 'mind_body', met: 2.3, compendiumCode: '02101' },
  { key: 'yoga_hatha', name: 'Yoga, Hatha', category: 'mind_body', met: 2.5, compendiumCode: '02150' },
  { key: 'pilates', name: 'Pilates', category: 'mind_body', met: 3.0, compendiumCode: '02105' },
  { key: 'yoga_surya_namaskar', name: 'Yoga, Surya Namaskar', category: 'mind_body', met: 3.3, compendiumCode: '02180' },

  // Dance
  { key: 'dance_cultural', name: 'Dancing, ethnic or cultural', category: 'dance', met: 4.5, compendiumCode: '03025' },
  { key: 'dance_aerobic', name: 'Aerobic dance', category: 'dance', met: 7.3, compendiumCode: '03015' },

  // Household
  { key: 'house_cleaning', name: 'House cleaning, general', category: 'household', met: 3.3, compendiumCode: '05030' },
  { key: 'mopping', name: 'Mopping floors', category: 'household', met: 3.5, compendiumCode: '05021' },
  { key: 'cooking', name: 'Cooking, moderate effort', category: 'household', met: 3.5, compendiumCode: '05049' },
  { key: 'playing_with_children', name: 'Playing with children, moderate', category: 'household', met: 3.5, compendiumCode: '05175' },
  { key: 'gardening', name: 'Gardening, general', category: 'household', met: 3.8, compendiumCode: '08245' },
  { key: 'washing_clothes_by_hand', name: 'Washing clothes by hand, hanging wash', category: 'household', met: 4.0, compendiumCode: '05092' },
];

/** Look up a catalog activity by its stable key. */
export function getExerciseActivity(key: string): ExerciseActivity | undefined {
  return EXERCISE_CATALOG.find((a) => a.key === key);
}

/**
 * Estimated calories burned (whole kcal, rounded half up) for one exercise session.
 *
 * @throws RangeError when met, weight_kg or minutes is outside its valid range.
 */
export function calculateExerciseCalories(input: ExerciseCaloriesInput): number {
  const { met, weight_kg, minutes } = input;

  if (!Number.isFinite(met) || met <= 0 || met > EXERCISE_MAX_MET) {
    throw new RangeError(`met must be a finite number above 0 and at most ${EXERCISE_MAX_MET}, got ${met}`);
  }
  if (!Number.isFinite(weight_kg) || weight_kg <= 0 || weight_kg > EXERCISE_MAX_WEIGHT_KG) {
    throw new RangeError(
      `weight_kg must be a finite number above 0 and at most ${EXERCISE_MAX_WEIGHT_KG}, got ${weight_kg}`,
    );
  }
  if (!Number.isInteger(minutes) || minutes < EXERCISE_MIN_MINUTES || minutes > EXERCISE_MAX_MINUTES) {
    throw new RangeError(
      `minutes must be a whole number from ${EXERCISE_MIN_MINUTES} to ${EXERCISE_MAX_MINUTES}, got ${minutes}`,
    );
  }

  return Math.round(met * weight_kg * (minutes / 60));
}
