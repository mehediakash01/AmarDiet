import type { FastingSession } from '@thali/types';

export interface FastingProgress {
  /** Mirrors session.isActive (false when there is no session). */
  isActive: boolean;
  /** Hours fasted so far, rounded to 1 decimal. 0 when not active. */
  elapsedHours: number;
  /** The session's target length in hours. 0 when there is no active session. */
  targetHours: number;
  /** Milliseconds until the target is reached (never negative). 0 when not active. */
  remainingMs: number;
  /** True once the elapsed time has reached the target. */
  isCompleted: boolean;
}

const HOUR_MS = 60 * 60 * 1000;

/**
 * Pure fasting-timer math, shared by the dashboard card and the Quick Add menu
 * so both always agree. `nowMs` is passed in (not read from the clock) so the
 * function stays deterministic and unit-testable.
 */
export function getFastingProgress(
  session: Pick<FastingSession, 'isActive' | 'startTime' | 'targetHours'> | null | undefined,
  nowMs: number,
): FastingProgress {
  const idle: FastingProgress = {
    isActive: !!session?.isActive,
    elapsedHours: 0,
    targetHours: 0,
    remainingMs: 0,
    isCompleted: false,
  };
  if (!session || !session.isActive) return idle;

  const startMs = new Date(session.startTime).getTime();
  // Missing / unparseable start time: still an active fast (as the session says),
  // but with no measurable progress. Keep the real target so the UI reads "0h of 16h".
  if (!(startMs > 0)) return { ...idle, targetHours: session.targetHours };

  const elapsedMs = Math.max(0, nowMs - startMs);
  const targetMs = session.targetHours * HOUR_MS;
  return {
    isActive: true,
    elapsedHours: Math.round((elapsedMs / HOUR_MS) * 10) / 10,
    targetHours: session.targetHours,
    remainingMs: Math.max(0, targetMs - elapsedMs),
    isCompleted: elapsedMs >= targetMs,
  };
}
