import type { WeightLog } from '@thali/types';

/** Sensible human range for the weight input (kg). The API itself only enforces 0 < kg <= 400. */
export const MIN_WEIGHT_KG = 20;
export const MAX_WEIGHT_KG = 300;

/** Only offer to update calorie targets when the new weight differs from the profile by at least this much. */
export const TARGET_UPDATE_THRESHOLD_KG = 1;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Sorts oldest -> newest and keeps ONE entry per day (the most recently
 * created). The API stores every POST as a new row, so logging twice on the
 * same day would otherwise draw two points on the chart.
 */
export function normalizeWeightLogs(logs: WeightLog[]): WeightLog[] {
  const byDate = new Map<string, WeightLog>();
  for (const log of logs) {
    const existing = byDate.get(log.loggedOn);
    if (!existing || log.createdAt >= existing.createdAt) byDate.set(log.loggedOn, log);
  }
  return [...byDate.values()].sort((a, b) => (a.loggedOn > b.loggedOn ? 1 : a.loggedOn < b.loggedOn ? -1 : 0));
}

/** Change between the two most recent entries (kg, 1 decimal), or null if there are fewer than two. */
export function latestWeightDelta(sortedLogs: WeightLog[]): number | null {
  if (sortedLogs.length < 2) return null;
  const last = sortedLogs[sortedLogs.length - 1].weight_kg;
  const prev = sortedLogs[sortedLogs.length - 2].weight_kg;
  return round1(last - prev);
}

/** "+0.3", "−0.3" (real minus sign) or "0.0". */
export function formatSignedKg(delta: number): string {
  const d = round1(delta);
  if (d > 0) return `+${d.toFixed(1)}`;
  if (d < 0) return `\u2212${Math.abs(d).toFixed(1)}`;
  return '0.0';
}

/**
 * Hint line for the Quick Add Weight tile, e.g. "72.4 kg · −0.3".
 * Falls back to the profile weight, then to a call to action.
 */
export function formatWeightHint(sortedLogs: WeightLog[], profileWeightKg?: number | null): string {
  if (sortedLogs.length === 0) {
    return profileWeightKg ? `${round1(profileWeightKg).toFixed(1)} kg` : 'Log your weight';
  }
  const latest = round1(sortedLogs[sortedLogs.length - 1].weight_kg).toFixed(1);
  const delta = latestWeightDelta(sortedLogs);
  return delta === null ? `${latest} kg` : `${latest} kg \u00b7 ${formatSignedKg(delta)}`;
}

/**
 * Should we ask "Update my calorie targets?" after a weight was logged?
 * Only when the profile exists, the difference is >= 1 kg, and the entry is the
 * newest one (backdating an old weight must not suggest changing today's targets).
 */
export function shouldOfferTargetUpdate(args: {
  newWeightKg: number;
  profileWeightKg?: number | null;
  loggedOn: string;
  latestLoggedOn: string | null;
}): boolean {
  const { newWeightKg, profileWeightKg, loggedOn, latestLoggedOn } = args;
  if (!profileWeightKg) return false;
  if (latestLoggedOn !== loggedOn) return false;
  return Math.abs(round1(newWeightKg) - round1(profileWeightKg)) >= TARGET_UPDATE_THRESHOLD_KG - 1e-9;
}

/** Client-side check for the weight field. Returns an error message, or null when valid. */
export function validateWeightInput(raw: string): string | null {
  const value = Number(raw);
  if (raw.trim() === '' || Number.isNaN(value)) return 'Enter your weight in kg.';
  if (value < MIN_WEIGHT_KG || value > MAX_WEIGHT_KG) {
    return `Weight should be between ${MIN_WEIGHT_KG} and ${MAX_WEIGHT_KG} kg.`;
  }
  return null;
}
