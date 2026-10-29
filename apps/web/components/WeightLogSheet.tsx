'use client';

import React, { useState } from 'react';
import { Scale, Check } from 'lucide-react';
import { useNutritionStore, computeLocalNutrition } from '@/lib/store/useNutritionStore';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { useToast } from '@/components/ui/Toast';
import {
  MAX_WEIGHT_KG,
  MIN_WEIGHT_KG,
  shouldOfferTargetUpdate,
  validateWeightInput,
} from '@/lib/weight';

function localToday(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * The one place weight is logged. Opened from the Quick Add "+" menu and from
 * the Progress page (both call openWeightSheet() in the store). Mounted once in
 * app/(app)/layout.tsx.
 */
export function WeightLogSheet() {
  const isOpen = useNutritionStore((s) => s.isWeightSheetOpen);
  const close = useNutritionStore((s) => s.closeWeightSheet);

  return (
    <ModalSheet isOpen={isOpen} onClose={close} title="Log weight" maxWidth="sm">
      {/* ModalSheet renders nothing while closed, so this mounts fresh on every
          open: empty input, date reset to the diary's selected date. */}
      <WeightLogContent onDone={close} />
    </ModalSheet>
  );
}

function WeightLogContent({ onDone }: { onDone: () => void }) {
  const selectedDate = useNutritionStore((s) => s.selectedDate);
  const profile = useNutritionStore((s) => s.profile);
  const nutrition = useNutritionStore((s) => s.nutrition);
  const logWeight = useNutritionStore((s) => s.logWeight);
  const setProfile = useNutritionStore((s) => s.setProfile);
  const { toast } = useToast();

  const today = localToday();
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(selectedDate > today ? today : selectedDate);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // After a save that differs from the profile weight by >= 1 kg we ask, once,
  // whether to update the calorie targets. Nothing changes unless the user taps.
  const [offerKg, setOfferKg] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const inputError = validateWeightInput(weight);
    if (inputError) {
      setError(inputError);
      return;
    }
    if (!date || date > today) {
      setError('Pick today or an earlier date.');
      return;
    }

    const kg = Math.round(Number(weight) * 10) / 10;
    setError(null);
    setSaving(true);
    const result = await logWeight(kg, date);
    setSaving(false);

    if (!result.ok) {
      // Keep the sheet open and the input as typed so the user can retry.
      setError(result.error);
      toast(result.error, 'error');
      return;
    }

    const logs = useNutritionStore.getState().weightLogs;
    const latestLoggedOn = logs.length > 0 ? logs[logs.length - 1].loggedOn : null;
    toast(`Weight saved: ${kg.toFixed(1)} kg`, 'success');
    if (shouldOfferTargetUpdate({ newWeightKg: kg, profileWeightKg: profile?.weight_kg, loggedOn: date, latestLoggedOn })) {
      setOfferKg(kg);
      return;
    }
    onDone();
  };

  // ── Step 2: optional "update my targets?" ──────────────────────────────────
  if (offerKg !== null && profile) {
    const newTarget = computeLocalNutrition({ ...profile, weight_kg: offerKg }).calorieTarget;
    const oldTarget = nutrition?.calorieTarget;

    const handleUpdate = async () => {
      setSaving(true);
      await setProfile({ ...profile, weight_kg: offerKg });
      setSaving(false);
      toast('Calorie targets updated', 'success');
      onDone();
    };

    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 flex-shrink-0 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
            <Check className="w-4 h-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-text-primary">Weight saved</p>
            <p className="text-xs text-text-secondary mt-0.5">
              Your profile says {profile.weight_kg} kg, you logged {offerKg.toFixed(1)} kg. Update your calorie
              targets to match?
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-zinc-950 p-3 text-center">
          <p className="text-[11px] uppercase tracking-wider text-text-muted mb-1">Daily calorie target</p>
          <p className="text-lg font-bold font-tabular text-text-primary">
            {oldTarget !== undefined ? `${oldTarget} → ` : ''}
            {newTarget} kcal
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onDone}
            disabled={saving}
            className="min-h-[44px] rounded-xl border border-border bg-zinc-950 text-sm font-medium text-text-secondary hover:text-text-primary hover:border-zinc-700 transition-colors disabled:opacity-50"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={handleUpdate}
            disabled={saving}
            className="min-h-[44px] rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-sm font-bold transition-colors disabled:opacity-50"
          >
            {saving ? 'Updating…' : 'Update targets'}
          </button>
        </div>
      </div>
    );
  }

  // ── Step 1: the form ───────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="weight-kg" className="text-xs font-semibold text-text-secondary block">
          Weight (kg)
        </label>
        <input
          id="weight-kg"
          type="number"
          inputMode="decimal"
          step="0.1"
          min={MIN_WEIGHT_KG}
          max={MAX_WEIGHT_KG}
          placeholder="e.g. 72.5"
          value={weight}
          onChange={(e) => {
            setWeight(e.target.value);
            if (error) setError(null);
          }}
          autoFocus
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'weight-error' : undefined}
          className="w-full px-3 py-2.5 border border-zinc-700 rounded-xl bg-zinc-800 text-zinc-100 focus:outline-none focus:border-cyan-500 text-center text-xl font-tabular font-bold"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="weight-date" className="text-xs font-semibold text-text-secondary block">
          Date
        </label>
        <input
          id="weight-date"
          type="date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-3 py-2 min-h-[44px] border border-zinc-700 rounded-xl bg-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-cyan-500"
        />
      </div>

      {error && (
        <p id="weight-error" role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving || weight.trim() === ''}
        className="w-full min-h-[44px] bg-cyan-500 hover:bg-cyan-400 text-zinc-950 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Scale className="w-4 h-4" />
        <span>{saving ? 'Saving…' : 'Save weight'}</span>
      </button>
    </form>
  );
}
