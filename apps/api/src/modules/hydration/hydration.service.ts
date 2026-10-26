import { randomUUID } from 'crypto';
import type { FastingSession, HydrationSummary, WaterLog } from '@thali/types';
import type { LogWaterInput, UpdateFastingInput } from '@thali/schemas';
import type { IHydrationRepository } from './hydration.repository.js';
import type { ProfileService } from '../profile/profile.service.js';

export class HydrationService {
  constructor(
    private hydrationRepo: IHydrationRepository,
    private profileService?: ProfileService,
  ) {}

  /**
   * Deterministically calculate daily water target based on user's weight (35ml / kg)
   * rounded to nearest 250ml glass. Default 2500ml.
   */
  async computeDailyTarget(subscriberId: string): Promise<number> {
    if (!this.profileService) return 2500;
    try {
      const data = await this.profileService.getProfile(subscriberId);
      if (data?.profile?.weight_kg) {
        const ml = data.profile.weight_kg * 35;
        return Math.max(1500, Math.round(ml / 250) * 250);
      }
    } catch {
      // fallback
    }
    return 2500;
  }

  async getHydrationData(subscriberId: string, date: string): Promise<HydrationSummary> {
    let water = await this.hydrationRepo.getWaterLog(subscriberId, date);
    if (!water) {
      const target_ml = await this.computeDailyTarget(subscriberId);
      water = {
        id: `water_${randomUUID().slice(0, 8)}`,
        subscriberId,
        loggedOn: date,
        amount_ml: 0,
        target_ml,
      };
    }

    const fasting = await this.hydrationRepo.getFastingSession(subscriberId);

    return { water, fasting };
  }

  async logWater(input: LogWaterInput): Promise<WaterLog> {
    let existing = await this.hydrationRepo.getWaterLog(input.subscriberId, input.date);
    const target_ml = input.target_ml || existing?.target_ml || (await this.computeDailyTarget(input.subscriberId));

    const currentAmount = existing ? existing.amount_ml : 0;
    const newAmount = Math.max(0, currentAmount + input.delta_ml);

    const updated: WaterLog = {
      id: existing ? existing.id : `water_${Date.now()}_${randomUUID().slice(0, 6)}`,
      subscriberId: input.subscriberId,
      loggedOn: input.date,
      amount_ml: newAmount,
      target_ml,
    };

    return this.hydrationRepo.upsertWaterLog(updated);
  }

  async updateFasting(input: UpdateFastingInput): Promise<FastingSession> {
    const session: FastingSession = {
      subscriberId: input.subscriberId,
      mode: input.mode,
      startTime: input.startTime,
      targetHours: input.targetHours,
      isActive: input.isActive,
    };

    return this.hydrationRepo.saveFastingSession(session);
  }
}
