import type {
  ProgressSummary,
  WeeklyAdherenceDay,
  WeightLog,
} from '@thali/types';
import type { LogWeightInput } from '@thali/schemas';
import type { IWeightLogRepository } from './progress.repository.js';
import type { ProfileService } from '../profile/profile.service.js';
import type { FoodLogService } from '../food-log/food-log.service.js';

export class ProgressService {
  constructor(
    private weightRepo: IWeightLogRepository,
    private profileService: ProfileService,
    private foodLogService: FoodLogService,
  ) {}

  async logWeight(input: LogWeightInput): Promise<WeightLog> {
    return this.weightRepo.create({
      subscriberId: input.subscriberId,
      weight_kg: input.weight_kg,
      loggedOn: input.loggedOn,
    });
  }

  async getProgressSummary(subscriberId: string): Promise<ProgressSummary> {
    const profileWithNutrition = await this.profileService.getProfile(subscriberId);
    const weightHistory = await this.weightRepo.findBySubscriber(subscriberId);

    const currentWeight = weightHistory.length > 0
      ? weightHistory[weightHistory.length - 1].weight_kg
      : profileWithNutrition?.profile.weight_kg;

    const startingWeight = weightHistory.length > 0
      ? weightHistory[0].weight_kg
      : profileWithNutrition?.profile.weight_kg;

    const targetWeight = profileWithNutrition?.profile.target_weight_kg;
    const weightDelta = currentWeight && startingWeight
      ? Math.round((currentWeight - startingWeight) * 10) / 10
      : 0;

    const dailyTargetKcal = profileWithNutrition?.nutrition.calorieTarget || 2000;

    // Generate last 7 days adherence
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const adherenceDays: WeeklyAdherenceDay[] = [];
    let loggedDaysCount = 0;
    let totalKcalLogged = 0;

    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = dayNames[d.getDay()];

      const diary = await this.foodLogService.getDailyDiary(subscriberId, dateStr);
      const dayCalories = diary.totals.calories;
      const isLogged = dayCalories > 0;

      // Adherent if logged and within reasonable boundary of target
      const adherent = isLogged && Math.abs(dayCalories - dailyTargetKcal) <= 350;

      if (isLogged) {
        loggedDaysCount++;
        totalKcalLogged += dayCalories;
      }

      adherenceDays.push({
        date: dateStr,
        dayLabel,
        isLogged,
        totalCalories: dayCalories,
        targetCalories: dailyTargetKcal,
        adherent,
      });
    }

    const averageCalories = loggedDaysCount > 0
      ? Math.round(totalKcalLogged / loggedDaysCount)
      : 0;

    const adherencePercent = Math.round((loggedDaysCount / 7) * 100);

    return {
      subscriberId,
      currentWeight_kg: currentWeight,
      startingWeight_kg: startingWeight,
      targetWeight_kg: targetWeight,
      weightDelta_kg: weightDelta,
      weightHistory,
      weeklyAdherence: {
        days: adherenceDays,
        adherencePercent,
        daysLoggedCount: loggedDaysCount,
        totalDays: 7,
        averageCalories,
      },
    };
  }
}
