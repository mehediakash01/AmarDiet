import { describe, it, expect } from 'vitest';
import { getFastingProgress } from '../../../apps/web/lib/fasting';

const HOUR = 60 * 60 * 1000;
const START = Date.UTC(2026, 9, 30, 8, 0, 0); // 08:00 UTC
const session = (over: Partial<{ isActive: boolean; startTime: string; targetHours: number }> = {}) => ({
  isActive: true,
  startTime: new Date(START).toISOString(),
  targetHours: 16,
  ...over,
});

describe('getFastingProgress', () => {
  it('is idle when there is no session', () => {
    expect(getFastingProgress(null, START)).toEqual({
      isActive: false, elapsedHours: 0, targetHours: 0, remainingMs: 0, isCompleted: false,
    });
    expect(getFastingProgress(undefined, START).isActive).toBe(false);
  });

  it('is idle when the session is not active', () => {
    const p = getFastingProgress(session({ isActive: false }), START + 5 * HOUR);
    expect(p).toEqual({ isActive: false, elapsedHours: 0, targetHours: 0, remainingMs: 0, isCompleted: false });
  });

  it('reports elapsed hours (1 decimal) and remaining time mid-fast', () => {
    const p = getFastingProgress(session(), START + 5.25 * HOUR);
    expect(p.isActive).toBe(true);
    expect(p.elapsedHours).toBe(5.3); // 5.25 rounds to 5.3
    expect(p.targetHours).toBe(16);
    expect(p.remainingMs).toBe(10.75 * HOUR);
    expect(p.isCompleted).toBe(false);
  });

  it('is completed exactly when the target is reached, with zero remaining', () => {
    const atTarget = getFastingProgress(session(), START + 16 * HOUR);
    expect(atTarget.isCompleted).toBe(true);
    expect(atTarget.remainingMs).toBe(0);
    const justBefore = getFastingProgress(session(), START + 16 * HOUR - 1);
    expect(justBefore.isCompleted).toBe(false);
  });

  it('keeps counting past the target without negative remaining time', () => {
    const p = getFastingProgress(session(), START + 20 * HOUR);
    expect(p.elapsedHours).toBe(20);
    expect(p.remainingMs).toBe(0);
    expect(p.isCompleted).toBe(true);
  });

  it('never reports negative elapsed time if the clock is behind the start time', () => {
    const p = getFastingProgress(session(), START - 3 * HOUR);
    expect(p.elapsedHours).toBe(0);
    expect(p.isCompleted).toBe(false);
  });

  it('survives an unparseable start time: still active, zero progress, no NaN', () => {
    const p = getFastingProgress(session({ startTime: 'not-a-date' }), START);
    expect(p).toEqual({ isActive: true, elapsedHours: 0, targetHours: 16, remainingMs: 0, isCompleted: false });
  });

  it('respects other protocols (14h, 18h targets)', () => {
    expect(getFastingProgress(session({ targetHours: 14 }), START + 14 * HOUR).isCompleted).toBe(true);
    expect(getFastingProgress(session({ targetHours: 18 }), START + 14 * HOUR).isCompleted).toBe(false);
  });
});
