import { describe, it, expect } from 'vitest';
import type { WeightLog } from '@thali/types';
import {
  normalizeWeightLogs,
  latestWeightDelta,
  formatSignedKg,
  formatWeightHint,
  shouldOfferTargetUpdate,
  validateWeightInput,
} from '../../../apps/web/lib/weight';

function log(loggedOn: string, weight_kg: number, createdAt = `${loggedOn}T08:00:00.000Z`): WeightLog {
  return { id: `${loggedOn}_${createdAt}`, subscriberId: 's1', weight_kg, loggedOn, createdAt };
}

describe('normalizeWeightLogs', () => {
  it('sorts oldest to newest', () => {
    const out = normalizeWeightLogs([log('2026-10-03', 71), log('2026-10-01', 73), log('2026-10-02', 72)]);
    expect(out.map((l) => l.loggedOn)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
  });

  it('keeps only the most recently created entry per day', () => {
    const out = normalizeWeightLogs([
      log('2026-10-01', 73, '2026-10-01T07:00:00.000Z'),
      log('2026-10-01', 72.6, '2026-10-01T21:00:00.000Z'),
      log('2026-10-01', 73.4, '2026-10-01T06:00:00.000Z'),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].weight_kg).toBe(72.6);
  });

  it('does not mutate its input', () => {
    const input = [log('2026-10-02', 72), log('2026-10-01', 73)];
    normalizeWeightLogs(input);
    expect(input[0].loggedOn).toBe('2026-10-02');
  });
});

describe('latestWeightDelta / formatSignedKg', () => {
  it('is null with fewer than two entries', () => {
    expect(latestWeightDelta([])).toBeNull();
    expect(latestWeightDelta([log('2026-10-01', 70)])).toBeNull();
  });

  it('is last minus previous, rounded to 1 decimal', () => {
    expect(latestWeightDelta([log('2026-10-01', 72.7), log('2026-10-02', 72.4)])).toBe(-0.3);
    expect(latestWeightDelta([log('2026-10-01', 72.1), log('2026-10-02', 72.4)])).toBe(0.3);
  });

  it('formats with sign and a real minus', () => {
    expect(formatSignedKg(0.3)).toBe('+0.3');
    expect(formatSignedKg(-0.3)).toBe('\u22120.3');
    expect(formatSignedKg(0)).toBe('0.0');
    expect(formatSignedKg(0.04)).toBe('0.0');
  });
});

describe('formatWeightHint', () => {
  it('prompts to log when there is no data at all', () => {
    expect(formatWeightHint([], null)).toBe('Log your weight');
  });

  it('falls back to the profile weight when nothing is logged', () => {
    expect(formatWeightHint([], 75)).toBe('75.0 kg');
  });

  it('shows just the weight for a single entry', () => {
    expect(formatWeightHint([log('2026-10-01', 72.4)], 80)).toBe('72.4 kg');
  });

  it('shows weight and change vs the previous entry', () => {
    const logs = [log('2026-10-01', 72.7), log('2026-10-02', 72.4)];
    expect(formatWeightHint(logs, 80)).toBe('72.4 kg \u00b7 \u22120.3');
  });
});

describe('shouldOfferTargetUpdate', () => {
  const base = { profileWeightKg: 75, loggedOn: '2026-10-30', latestLoggedOn: '2026-10-30' };

  it('offers when the change is 1 kg or more', () => {
    expect(shouldOfferTargetUpdate({ ...base, newWeightKg: 74 })).toBe(true);
    expect(shouldOfferTargetUpdate({ ...base, newWeightKg: 76.5 })).toBe(true);
  });

  it('does not offer for a change under 1 kg', () => {
    expect(shouldOfferTargetUpdate({ ...base, newWeightKg: 74.2 })).toBe(false);
    expect(shouldOfferTargetUpdate({ ...base, newWeightKg: 75 })).toBe(false);
  });

  it('does not offer when there is no profile', () => {
    expect(shouldOfferTargetUpdate({ ...base, profileWeightKg: null, newWeightKg: 60 })).toBe(false);
  });

  it('does not offer when the entry is not the newest (backdated)', () => {
    expect(shouldOfferTargetUpdate({ ...base, loggedOn: '2026-10-01', newWeightKg: 70 })).toBe(false);
  });
});

describe('validateWeightInput', () => {
  it('rejects empty and non-numeric input', () => {
    expect(validateWeightInput('')).not.toBeNull();
    expect(validateWeightInput('abc')).not.toBeNull();
  });

  it('rejects values outside 20-300 kg', () => {
    expect(validateWeightInput('19.9')).not.toBeNull();
    expect(validateWeightInput('301')).not.toBeNull();
  });

  it('accepts normal values', () => {
    expect(validateWeightInput('72.4')).toBeNull();
    expect(validateWeightInput('20')).toBeNull();
    expect(validateWeightInput('300')).toBeNull();
  });
});
