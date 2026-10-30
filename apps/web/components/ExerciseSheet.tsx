'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Dumbbell, Minus, Plus, Search } from 'lucide-react';
import { calculateExerciseCalories, type ExerciseActivity } from '@thali/nutrition-engine';
import { useNutritionStore } from '@/lib/store/useNutritionStore';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { useToast } from '@/components/ui/Toast';
import {
  DEFAULT_EXERCISE_MINUTES,
  MINUTES_STEP,
  QUICK_MINUTES,
  filterExerciseCatalog,
  groupExerciseByCategory,
  stepMinutes,
  validateMinutesInput,
} from '@/lib/exercise';

/**
 * Log an exercise session. Opened from the Quick Add "+" menu and from the
 * Diary's Exercise card (both call openExerciseSheet() in the store). Mounted
 * once in app/(app)/layout.tsx.
 */
export function ExerciseSheet() {
  const isOpen = useNutritionStore((s) => s.isExerciseSheetOpen);
  const close = useNutritionStore((s) => s.closeExerciseSheet);

  return (
    <ModalSheet isOpen={isOpen} onClose={close} title="Log exercise" maxWidth="sm">
      {/* ModalSheet renders nothing while closed, so this mounts fresh on every open. */}
      <ExerciseContent onDone={close} />
    </ModalSheet>
  );
}

function dateLabel(date: string): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (date === today) return 'today';
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function ExerciseContent({ onDone }: { onDone: () => void }) {
  const profile = useNutritionStore((s) => s.profile);
  const selectedDate = useNutritionStore((s) => s.selectedDate);
  const logExercise = useNutritionStore((s) => s.logExercise);
  const { toast } = useToast();

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ExerciseActivity | null>(null);
  const [minutes, setMinutes] = useState(String(DEFAULT_EXERCISE_MINUTES));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const weightKg = profile?.weight_kg;
  const groups = useMemo(() => groupExerciseByCategory(filterExerciseCatalog(query)), [query]);

  // Calories burned depend on body weight, so without a profile there is nothing to estimate.
  if (!weightKg) {
    return (
      <div className="space-y-4 text-center py-2">
        <p className="text-sm text-text-secondary">
          Calories burned depend on your weight. Set up your profile first, then you can log exercise.
        </p>
        <Link
          href="/onboarding"
          onClick={onDone}
          className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-sm font-bold transition-colors"
        >
          Set up profile
        </Link>
      </div>
    );
  }

  // ── Step 2: minutes + live preview ─────────────────────────────────────────
  if (selected) {
    const minutesError = validateMinutesInput(minutes);
    const preview = minutesError
      ? null
      : calculateExerciseCalories({ met: selected.met, weight_kg: weightKg, minutes: Number(minutes) });

    const handleSave = async () => {
      if (saving) return;
      const invalid = validateMinutesInput(minutes);
      if (invalid) {
        setError(invalid);
        return;
      }
      setError(null);
      setSaving(true);
      const result = await logExercise(selected.key, Number(minutes));
      setSaving(false);

      if (!result.ok) {
        // Stay open with the input as typed so the user can retry.
        setError(result.error);
        toast(result.error, 'error');
        return;
      }
      toast(`Logged ${result.log.activityName}: ${result.log.calories_burned} kcal burned`, 'success');
      onDone();
    };

    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => {
            setSelected(null);
            setError(null);
          }}
          className="inline-flex items-center gap-1 min-h-[44px] -ml-1 pr-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Change activity
        </button>

        <div>
          <p className="text-base font-semibold text-text-primary leading-snug">{selected.name}</p>
          <p className="text-xs text-text-muted mt-0.5">Logging for {dateLabel(selectedDate)}</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="exercise-minutes" className="text-xs font-semibold text-text-secondary block">
            Minutes
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={`Subtract ${MINUTES_STEP} minutes`}
              onClick={() => setMinutes((m) => stepMinutes(m, -MINUTES_STEP))}
              className="w-11 h-11 flex-shrink-0 rounded-xl border border-border bg-zinc-950 text-text-secondary hover:text-text-primary hover:border-zinc-700 flex items-center justify-center transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              id="exercise-minutes"
              type="number"
              inputMode="numeric"
              step={1}
              min={1}
              max={600}
              value={minutes}
              onChange={(e) => {
                setMinutes(e.target.value);
                if (error) setError(null);
              }}
              aria-invalid={minutesError ? true : undefined}
              className="w-full min-w-0 px-3 py-2.5 border border-zinc-700 rounded-xl bg-zinc-800 text-zinc-100 focus:outline-none focus:border-cyan-500 text-center text-xl font-tabular font-bold"
            />
            <button
              type="button"
              aria-label={`Add ${MINUTES_STEP} minutes`}
              onClick={() => setMinutes((m) => stepMinutes(m, MINUTES_STEP))}
              className="w-11 h-11 flex-shrink-0 rounded-xl border border-border bg-zinc-950 text-text-secondary hover:text-text-primary hover:border-zinc-700 flex items-center justify-center transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2" role="group" aria-label="Quick durations">
            {QUICK_MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={minutes === String(m)}
                onClick={() => {
                  setMinutes(String(m));
                  setError(null);
                }}
                className={`min-h-[40px] rounded-xl border text-xs font-medium transition-colors ${
                  minutes === String(m)
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 font-semibold'
                    : 'bg-zinc-950 border-border text-text-secondary hover:text-text-primary hover:border-zinc-700'
                }`}
              >
                {m} min
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-zinc-950 p-3 text-center" aria-live="polite">
          <p className="text-[11px] uppercase tracking-wider text-text-muted mb-1">Estimated burn</p>
          <p className="text-2xl font-bold font-tabular text-text-primary">
            {preview === null ? '\u2014' : `${preview} kcal`}
          </p>
          <p className="text-[11px] text-text-muted mt-1">
            {selected.met} METs &times; {weightKg} kg. A typical estimate, not a measurement.
          </p>
        </div>

        {(error || minutesError) && (
          <p role="alert" className="text-xs text-red-400">
            {error ?? minutesError}
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || minutesError !== null}
          className="w-full min-h-[44px] bg-cyan-500 hover:bg-cyan-400 text-zinc-950 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Dumbbell className="w-4 h-4" />
          <span>{saving ? 'Saving\u2026' : 'Save exercise'}</span>
        </button>
      </div>
    );
  }

  // ── Step 1: search and pick an activity ────────────────────────────────────
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search: walking, cricket, yoga"
          aria-label="Search activities"
          autoFocus
          className="w-full pl-9 pr-3 py-2.5 min-h-[44px] border border-zinc-700 rounded-xl bg-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-cyan-500"
        />
      </div>

      <div className="max-h-[50vh] overflow-y-auto -mx-1 px-1 space-y-4">
        {groups.length === 0 && (
          <p className="text-sm text-text-muted text-center py-6">No activity matches &ldquo;{query.trim()}&rdquo;.</p>
        )}
        {groups.map((group) => (
          <div key={group.category} className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{group.label}</p>
            <ul className="space-y-1.5">
              {group.items.map((a) => (
                <li key={a.key}>
                  <button
                    type="button"
                    onClick={() => setSelected(a)}
                    className="w-full min-h-[48px] flex items-center justify-between gap-3 rounded-xl border border-border bg-zinc-950 px-3 py-2 text-left hover:border-cyan-500/40 hover:bg-zinc-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                  >
                    <span className="text-sm text-text-primary leading-snug">{a.name}</span>
                    <span className="text-[11px] text-text-muted font-tabular flex-shrink-0">
                      ~{calculateExerciseCalories({ met: a.met, weight_kg: weightKg, minutes: 60 })} kcal/h
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
