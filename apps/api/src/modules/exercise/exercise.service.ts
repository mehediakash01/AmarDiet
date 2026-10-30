import { randomUUID } from 'crypto';
import { calculateExerciseCalories, getExerciseActivity } from '@thali/nutrition-engine';
import type { ExerciseLog } from '@thali/types';
import type { LogExerciseInput } from '@thali/schemas';
import type { IExerciseLogRepository } from './exercise.repository.js';
import type { ProfileService } from '../profile/profile.service.js';

/** The request was understood but cannot be fulfilled as sent. Routes turn this into a 400. */
export class ExerciseInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExerciseInputError';
  }
}

export class ExerciseService {
  constructor(
    private exerciseRepo: IExerciseLogRepository,
    private profileService: ProfileService,
  ) {}

  /**
   * Logs one session. Calories are ALWAYS computed here from the catalog MET and
   * the profile weight — nothing about MET or kcal is accepted from the client.
   */
  async logExercise(input: LogExerciseInput): Promise<ExerciseLog> {
    const activity = getExerciseActivity(input.activityKey);
    if (!activity) {
      throw new ExerciseInputError(`Unknown activity: ${input.activityKey}`);
    }

    const data = await this.profileService.getProfile(input.subscriberId);
    const weight_kg = data?.profile?.weight_kg;
    if (!weight_kg) {
      throw new ExerciseInputError('Complete your profile first: calories burned depend on your weight.');
    }

    let calories_burned: number;
    try {
      calories_burned = calculateExerciseCalories({ met: activity.met, weight_kg, minutes: input.minutes });
    } catch (err) {
      throw new ExerciseInputError(err instanceof RangeError ? err.message : 'Invalid exercise values');
    }

    return this.exerciseRepo.create({
      id: `ex_${Date.now()}_${randomUUID().slice(0, 6)}`,
      subscriberId: input.subscriberId,
      loggedOn: input.loggedOn,
      activityKey: activity.key,
      activityName: activity.name,
      minutes: input.minutes,
      met: activity.met,
      calories_burned,
    });
  }

  async getLogsForDate(subscriberId: string, date: string): Promise<ExerciseLog[]> {
    return this.exerciseRepo.findBySubscriberAndDate(subscriberId, date);
  }

  async deleteLog(id: string, subscriberId: string): Promise<boolean> {
    return this.exerciseRepo.delete(id, subscriberId);
  }
}
