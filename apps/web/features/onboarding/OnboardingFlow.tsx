'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ActivityLevel,
  CuisinePreference,
  Goal,
  Sex,
  UserProfile,
} from '@thali/types';
import { useNutritionStore, computeLocalNutrition } from '../../lib/store/useNutritionStore';
import { BmiSpectrumChart } from '../../components/BmiSpectrumChart';
import { Check, ArrowRight, ArrowLeft } from 'lucide-react';

export function OnboardingFlow() {
  const router = useRouter();
  const setProfile = useNutritionStore((s) => s.setProfile);
  const currentProfile = useNutritionStore((s) => s.profile);
  const subscriberId = useNutritionStore((s) => s.subscriberId);

  const [step, setStep] = useState<number>(1);

  // Form State
  const [goal, setGoal] = useState<Goal>(currentProfile?.goal || 'lose_weight');
  const [sex, setSex] = useState<Sex>(currentProfile?.sex || 'male');
  const [age, setAge] = useState<number>(currentProfile?.age || 25);
  const [heightCm, setHeightCm] = useState<number>(currentProfile?.height_cm || 175);
  const [weightKg, setWeightKg] = useState<number>(currentProfile?.weight_kg || 72);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    currentProfile?.activity_level || 'lightly_active',
  );
  const [targetWeightKg, setTargetWeightKg] = useState<number>(
    currentProfile?.target_weight_kg || 68,
  );
  const [cuisinePreference, setCuisinePreference] = useState<CuisinePreference>(
    currentProfile?.cuisine_preference || 'bengali',
  );

  const draftProfile: UserProfile = useMemo(() => ({
    subscriberId,
    age,
    sex,
    height_cm: heightCm,
    weight_kg: weightKg,
    activity_level: activityLevel,
    goal,
    target_weight_kg: targetWeightKg,
    cuisine_preference: cuisinePreference,
    updated_at: new Date().toISOString(),
  }), [subscriberId, age, sex, heightCm, weightKg, activityLevel, goal, targetWeightKg, cuisinePreference]);

  const liveNutrition = useMemo(() => computeLocalNutrition(draftProfile), [draftProfile]);

  const handleFinish = async () => {
    await setProfile(draftProfile);
    router.push('/dashboard');
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-8">
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted mb-2">
          <span>Step {step} of 4</span>
          <span>
            {step === 1 && 'Primary Goal'}
            {step === 2 && 'Body & Activity'}
            {step === 3 && 'Food Preferences'}
            {step === 4 && 'Calculated Targets'}
          </span>
        </div>
        <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 sm:p-8 shadow-sm">
        {/* STEP 1: GOAL */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif font-bold text-2xl text-primary">
                What is your primary nutrition goal?
              </h2>
              <p className="text-sm text-muted mt-1">
                Your daily calories and macronutrient ratios will adapt deterministically.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  id: 'lose_weight',
                  label: 'Lose Weight',
                  desc: '500 kcal/day safe deficit with high protein retention',
                },
                {
                  id: 'maintain',
                  label: 'Maintain Weight',
                  desc: 'Balanced energy intake for steady body composition',
                },
                {
                  id: 'gain_weight',
                  label: 'Gain Weight',
                  desc: '300 kcal/day clean caloric surplus',
                },
                {
                  id: 'build_muscle',
                  label: 'Build Muscle',
                  desc: '200 kcal/day surplus with 2.4g/kg maximum protein',
                },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setGoal(item.id as Goal)}
                  className={`p-4 rounded-lg border text-left transition ${
                    goal === item.id
                      ? 'border-primary bg-primary-light/50 ring-2 ring-primary/20'
                      : 'border-border bg-surface hover:bg-background'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-dark text-base">{item.label}</span>
                    {goal === item.id && <Check className="w-4 h-4 text-primary" />}
                  </div>
                  <p className="text-xs text-muted mt-1">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: ANTHROPOMETRICS */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif font-bold text-2xl text-primary">
                Your Body & Activity Metrics
              </h2>
              <p className="text-sm text-muted mt-1">
                Used in the Mifflin-St Jeor equation to calculate your exact resting energy expenditure.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Sex */}
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Sex
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['male', 'female'] as Sex[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSex(s)}
                      className={`py-2 px-3 rounded border text-sm font-medium capitalize transition ${
                        sex === s
                          ? 'border-primary bg-primary-light text-primary'
                          : 'border-border bg-background text-dark'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age */}
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Age (years)
                </label>
                <input
                  type="number"
                  min="10"
                  max="120"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-border rounded bg-background text-sm text-dark focus:outline-none focus:border-primary"
                />
              </div>

              {/* Height */}
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Height (cm)
                </label>
                <input
                  type="number"
                  min="50"
                  max="250"
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-border rounded bg-background text-sm text-dark focus:outline-none focus:border-primary"
                />
              </div>

              {/* Weight */}
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Current Weight (kg)
                </label>
                <input
                  type="number"
                  min="20"
                  max="300"
                  step="0.5"
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-border rounded bg-background text-sm text-dark focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Activity Level */}
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Daily Activity Level
              </label>
              <div className="space-y-2">
                {[
                  {
                    id: 'sedentary',
                    label: 'Sedentary',
                    desc: 'Little or no exercise (desk job, 1.2x)',
                  },
                  {
                    id: 'lightly_active',
                    label: 'Lightly Active',
                    desc: 'Light exercise 1–3 days/week (1.375x)',
                  },
                  {
                    id: 'active',
                    label: 'Moderately Active',
                    desc: 'Moderate exercise 3–5 days/week (1.55x)',
                  },
                  {
                    id: 'very_active',
                    label: 'Very Active',
                    desc: 'Hard exercise 6–7 days/week (1.725x)',
                  },
                ].map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => setActivityLevel(act.id as ActivityLevel)}
                    className={`w-full p-3 rounded-lg border text-left flex items-center justify-between transition ${
                      activityLevel === act.id
                        ? 'border-primary bg-primary-light/50'
                        : 'border-border bg-surface hover:bg-background'
                    }`}
                  >
                    <div>
                      <div className="font-medium text-sm text-dark">{act.label}</div>
                      <div className="text-xs text-muted">{act.desc}</div>
                    </div>
                    {activityLevel === act.id && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: FOOD PREFERENCE */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif font-bold text-2xl text-primary">
                Food & Cuisine Style
              </h2>
              <p className="text-sm text-muted mt-1">
                This biases search ranking suggestions to your favorite dishes. You can still search and log any food from any cuisine anytime.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  id: 'bengali',
                  label: 'Bengali Home Food',
                  desc: 'Prioritizes Bhat, Dal, Macher Jhol, Bhaji, Roti, and local market staples',
                },
                {
                  id: 'mixed',
                  label: 'Mixed / Flexible',
                  desc: 'Equal balance of Bengali home cooking, Western classics, and packaged items',
                },
                {
                  id: 'western',
                  label: 'Western Staples',
                  desc: 'Prioritizes oats, eggs, grilled chicken breast, salads, bread, and yogurt',
                },
              ].map((pref) => (
                <button
                  key={pref.id}
                  type="button"
                  onClick={() => setCuisinePreference(pref.id as CuisinePreference)}
                  className={`w-full p-4 rounded-lg border text-left flex items-center justify-between transition ${
                    cuisinePreference === pref.id
                      ? 'border-primary bg-primary-light/50 ring-2 ring-primary/20'
                      : 'border-border bg-surface hover:bg-background'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-dark text-base">{pref.label}</div>
                    <div className="text-xs text-muted mt-0.5">{pref.desc}</div>
                  </div>
                  {cuisinePreference === pref.id && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: TARGETS REVIEW */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif font-bold text-2xl text-primary">
                Your Calculated Nutrition Plan
              </h2>
              <p className="text-sm text-muted mt-1">
                Deterministic calculation via Mifflin-St Jeor formula. Zero AI arithmetic.
              </p>
            </div>

            {/* Key figures banner */}
            <div className="grid grid-cols-3 gap-3 bg-background border border-border p-4 rounded-lg text-center">
              <div>
                <div className="text-xs uppercase font-bold text-muted tracking-wider">BMR</div>
                <div className="text-xl font-bold font-serif text-dark mt-1">
                  {Math.round(liveNutrition.bmr)}
                </div>
                <div className="text-[10px] text-muted">kcal/day</div>
              </div>
              <div>
                <div className="text-xs uppercase font-bold text-muted tracking-wider">TDEE</div>
                <div className="text-xl font-bold font-serif text-dark mt-1">
                  {Math.round(liveNutrition.tdee)}
                </div>
                <div className="text-[10px] text-muted">kcal/day</div>
              </div>
              <div>
                <div className="text-xs uppercase font-bold text-primary tracking-wider">Target</div>
                <div className="text-xl font-bold font-serif text-primary mt-1">
                  {Math.round(liveNutrition.calorieTarget)}
                </div>
                <div className="text-[10px] text-primary">kcal/day</div>
              </div>
            </div>

            {/* Visual BMI Spectrum Chart */}
            <BmiSpectrumChart heightCm={heightCm} weightKg={weightKg} />

            {/* Macro distribution card */}
            <div className="border border-border rounded-lg p-4 space-y-3 bg-surface">
              <div className="text-xs uppercase font-bold tracking-wider text-muted">
                Daily Macro Targets
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-primary-light/40 border border-primary/20 p-3 rounded text-center">
                  <div className="text-xs text-primary font-semibold">Protein</div>
                  <div className="text-2xl font-bold font-serif text-primary mt-0.5">
                    {Math.round(liveNutrition.macros.protein_g)}g
                  </div>
                  <div className="text-[10px] text-muted">
                    {Math.round(liveNutrition.macros.protein_g * 4)} kcal
                  </div>
                </div>

                <div className="bg-accent-light border border-accent/20 p-3 rounded text-center">
                  <div className="text-xs text-accent font-semibold">Carbs</div>
                  <div className="text-2xl font-bold font-serif text-accent mt-0.5">
                    {Math.round(liveNutrition.macros.carbs_g)}g
                  </div>
                  <div className="text-[10px] text-muted">
                    {Math.round(liveNutrition.macros.carbs_g * 4)} kcal
                  </div>
                </div>

                <div className="bg-secondary-light border border-secondary/20 p-3 rounded text-center">
                  <div className="text-xs text-secondary font-semibold">Fat</div>
                  <div className="text-2xl font-bold font-serif text-secondary mt-0.5">
                    {Math.round(liveNutrition.macros.fat_g)}g
                  </div>
                  <div className="text-[10px] text-muted">
                    {Math.round(liveNutrition.macros.fat_g * 9)} kcal
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 pt-4 border-t border-border flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="px-4 py-2 border border-border rounded-lg text-sm text-dark font-medium hover:bg-background transition flex items-center space-x-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="px-5 py-2 bg-primary hover:bg-primary-hover text-surface rounded-lg text-sm font-medium transition shadow flex items-center space-x-1.5"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-surface rounded-lg text-sm font-medium transition shadow flex items-center space-x-2"
            >
              <Check className="w-4 h-4" />
              <span>Save & Go to Dashboard</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
