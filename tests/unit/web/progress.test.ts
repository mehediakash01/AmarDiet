import { describe, it, expect } from 'vitest';
import {
  ADHERENCE_TOLERANCE_KCAL,
  buildWeeklyAdherenceFromLogs,
  isCalorieDayOnTrack,
} from '../../../apps/web/lib/progress';
import { addDaysToDateString, localDateString } from '../../../apps/web/lib/date';

function log(loggedOn: string, calories: number) {
  return { loggedOn, calculatedNutrition: { calories } };
}

describe('localDateString / addDaysToDateString', () => {
  it('formats the local calendar date, not the UTC date', () => {
    expect(localDateString(new Date(2026, 0, 1, 23, 30))).toBe('2026-01-01');
    expect(localDateString(new Date(2026, 11, 31, 0, 15))).toBe('2026-12-31');
  });

  it('adds days across month and year boundaries', () => {
    expect(addDaysToDateString('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDaysToDateString('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDaysToDateString('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('isCalorieDayOnTrack', () => {
  it('uses the same ±350 kcal window as the API', () => {
    expect(ADHERENCE_TOLERANCE_KCAL).toBe(350);
    expect(isCalorieDayOnTrack(2000, 2000)).toBe(true);
    expect(isCalorieDayOnTrack(2350, 2000)).toBe(true);
    expect(isCalorieDayOnTrack(1650, 2000)).toBe(true);
    expect(isCalorieDayOnTrack(2351, 2000)).toBe(false);
    expect(isCalorieDayOnTrack(1649, 2000)).toBe(false);
    expect(isCalorieDayOnTrack(0, 0)).toBe(false);
  });
});

describe('buildWeeklyAdherenceFromLogs', () => {
  const today = new Date(2026, 9, 30, 12);

  it('returns the last seven local days, oldest first', () => {
    const days = buildWeeklyAdherenceFromLogs([], 2000, today);
    expect(days.map((d) => d.date)).toEqual([
      '2026-10-24',
      '2026-10-25',
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
    ]);
    expect(days.every((d) => !d.isLogged && !d.adherent)).toBe(true);
  });

  it('sums multiple entries and marks a day on track only inside ±350 kcal', () => {
    const days = buildWeeklyAdherenceFromLogs(
      [log('2026-10-30', 1200), log('2026-10-30', 800), log('2026-10-29', 1600)],
      2000,
      today,
    );

    const todayLog = days[6];
    expect(todayLog.isLogged).toBe(true);
    expect(todayLog.totalCalories).toBe(2000);
    expect(todayLog.adherent).toBe(true);

    const yesterday = days[5];
    expect(yesterday.isLogged).toBe(true);
    expect(yesterday.totalCalories).toBe(1600);
    expect(yesterday.adherent).toBe(false);
  });

  it('does not treat zero-calorie entries as a logged day', () => {
    const days = buildWeeklyAdherenceFromLogs([log('2026-10-30', 0)], 2000, today);
    expect(days[6].isLogged).toBe(false);
    expect(days[6].adherent).toBe(false);
  });
});
