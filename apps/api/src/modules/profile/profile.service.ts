import {
  calculateBMR,
  calculateTDEE,
  calculateCalorieTarget,
  calculateMacroTargets,
} from '@thali/nutrition-engine';
import type {
  NutritionTargets,
  ProfileWithNutrition,
  UserProfile,
} from '@thali/types';
import type { SaveProfileInput } from '@thali/schemas';
import type { IProfileRepository } from './profile.repository.js';
import type { ISubscriberRepository } from '../subscriber/subscriber.repository.js';

export class ProfileService {
  constructor(
    private profileRepo: IProfileRepository,
    private subscriberRepo?: ISubscriberRepository,
  ) {}

  /**
   * Compute on-the-fly deterministic nutrition targets for a given profile
   */
  computeNutrition(profile: UserProfile): NutritionTargets {
    const nutritionProfile = {
      age: profile.age,
      sex: profile.sex,
      height_cm: profile.height_cm,
      weight_kg: profile.weight_kg,
      activity_level: profile.activity_level,
      goal: profile.goal,
      target_weight_kg: profile.target_weight_kg,
    };

    const bmrResult = calculateBMR(nutritionProfile);
    const tdeeResult = calculateTDEE(bmrResult, profile.activity_level);
    const calorieTargetResult = calculateCalorieTarget(tdeeResult, profile.goal);
    const macroTargets = calculateMacroTargets(
      calorieTargetResult,
      profile.goal,
      profile.weight_kg,
    );

    return {
      bmr: bmrResult.bmr_kcal,
      tdee: tdeeResult.tdee_kcal,
      calorieTarget: calorieTargetResult.calorie_target_kcal,
      macros: {
        protein_g: macroTargets.protein_g,
        carbs_g: macroTargets.carbs_g,
        fat_g: macroTargets.fat_g,
      },
      safetyFloorApplied: calorieTargetResult.floor_applied,
    };
  }

  /**
   * Save / update profile data and calculate on-the-fly nutrition targets
   */
  async saveProfile(input: SaveProfileInput): Promise<ProfileWithNutrition> {
    if (this.subscriberRepo) {
      const sub = await this.subscriberRepo.findById(input.subscriberId);
      if (!sub) {
        // Auto-create subscriber if not present
        await this.subscriberRepo.create({
          id: input.subscriberId,
          status: 'active',
        });
      }
    }

    const savedProfile = await this.profileRepo.upsert({
      subscriberId: input.subscriberId,
      age: input.age,
      sex: input.sex,
      height_cm: input.height_cm,
      weight_kg: input.weight_kg,
      activity_level: input.activity_level,
      goal: input.goal,
      target_weight_kg: input.target_weight_kg,
      dietary_preferences: input.dietary_preferences,
      cuisine_preference: input.cuisine_preference,
    });

    const nutrition = this.computeNutrition(savedProfile);

    return {
      profile: savedProfile,
      nutrition,
    };
  }

  /**
   * Retrieve a user profile alongside freshly calculated nutrition targets
   */
  async getProfile(subscriberId: string): Promise<ProfileWithNutrition | null> {
    const profile = await this.profileRepo.findBySubscriberId(subscriberId);
    if (!profile) return null;

    const nutrition = this.computeNutrition(profile);

    return {
      profile,
      nutrition,
    };
  }
}
