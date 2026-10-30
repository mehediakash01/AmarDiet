import type { ProgressSummary, WeeklyAdherenceDay } from '@thali/types';
import { addDaysToDateString, localDateString, parseLocalDate } from './date';

/** Same on-track window the API uses in ProgressService. */
export const ADHERENCE_TOLERANCE_KCAL = 350;

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function isCalorieDayOnTrack(calories: number, targetCalories: number): boolean {
  return targetCalories > 0 && Math.abs(calories - targetCalories) <= ADHERENCE_TOLERANCE_KCAL;
}

interface CalorieLog {
  loggedOn: string;
  calculatedNutrition: { calories: number };
}

/**
 * Offline fallback for the API's weekly adherence. A day is logged when it has
 * food entries, and on-track only when its calories are within 350 kcal of the
 * target — the same rule the server applies.
 */
export function buildWeeklyAdherenceFromLogs(
  logs: CalorieLog[],
  targetCalories: number,
  today: Date = new Date(),
): WeeklyAdherenceDay[] {
  const caloriesByDate = new Map<string, number>();
  for (const log of logs) {
    caloriesByDate.set(
      log.loggedOn,
      (caloriesByDate.get(log.loggedOn) ?? 0) + log.calculatedNutrition.calories,
    );
  }

  const todayString = localDateString(today);
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDaysToDateString(todayString, index - 6);
    const totalCalories = caloriesByDate.get(date) ?? 0;
    const isLogged = totalCalories > 0;
    return {
      date,
      dayLabel: DAY_NAMES[parseLocalDate(date).getDay()],
      isLogged,
      totalCalories,
      targetCalories,
      adherent: isLogged && isCalorieDayOnTrack(totalCalories, targetCalories),
    };
  });
}

export function buildWeeklyAdherenceSummaryFromLogs(
  logs: CalorieLog[],
  targetCalories: number,
  today: Date = new Date(),
): ProgressSummary['weeklyAdherence'] {
  const days = buildWeeklyAdherenceFromLogs(logs, targetCalories, today);
  const logged = days.filter((day) => day.isLogged);
  const totalCalories = logged.reduce((sum, day) => sum + day.totalCalories, 0);

  return {
    days,
    adherencePercent: Math.round((logged.length / 7) * 100),
    daysLoggedCount: logged.length,
    totalDays: 7,
    averageCalories: logged.length > 0 ? Math.round(totalCalories / logged.length) : 0,
  };
}
