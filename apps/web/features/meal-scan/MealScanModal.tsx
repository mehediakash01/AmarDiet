'use client';

import React, { useRef, useState } from 'react';
import { Camera, X, Loader2, AlertTriangle, Search, Trash2 } from 'lucide-react';
import type { FoodItem } from '@thali/types';
import { useNutritionStore } from '@/lib/store/useNutritionStore';
import { compressImageFile } from '@/lib/image/compressImage';
import { getApiBaseUrl } from '@/lib/identity/subscriberId';

type ScanStatus = 'success' | 'not_food' | 'low_confidence' | 'all_providers_failed';

interface ScannedItemApi {
  name: string;
  estimatedQuantity: number;
  estimatedUnit: string;
  confidence: number;
  matchedFoodCandidates: FoodItem[];
}

interface ScanMealApiResponse {
  status: ScanStatus;
  providerUsed: string | null;
  confidence: number | null;
  items: ScannedItemApi[];
  notes?: string;
  message: string;
}

interface ReviewRow {
  scannedName: string;
  scannedConfidence: number;
  candidates: FoodItem[];
  selectedFood: FoodItem | null;
  quantity: number;
  unit: string;
  included: boolean;
}

type Step = 'capture' | 'analyzing' | 'review' | 'no-result';

export function MealScanModal() {
  const isScanModalOpen = useNutritionStore((s) => s.isScanModalOpen);
  const activeMealSlot = useNutritionStore((s) => s.activeMealSlot);
  const closeMealScan = useNutritionStore((s) => s.closeMealScan);
  const openFoodSearch = useNutritionStore((s) => s.openFoodSearch);
  const logFood = useNutritionStore((s) => s.logFood);
  const subscriberId = useNutritionStore((s) => s.subscriberId);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('capture');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [resultMessage, setResultMessage] = useState<string>('');
  const [isLogging, setIsLogging] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  if (!isScanModalOpen) return null;

  function reset() {
    setStep('capture');
    setPreviewUrl(null);
    setRows([]);
    setResultMessage('');
    setCaptureError(null);
  }

  function handleClose() {
    reset();
    closeMealScan();
  }

  function handleSearchInstead() {
    reset();
    closeMealScan();
    openFoodSearch(activeMealSlot);
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // allow re-selecting the same file later

    setCaptureError(null);
    setPreviewUrl(URL.createObjectURL(file));
    setStep('analyzing');

    try {
      const { base64, mimeType } = await compressImageFile(file);

      const res = await fetch(`${getApiBaseUrl()}/api/ai/scan-meal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriberId, imageBase64: base64, mimeType }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }));
        setResultMessage(body.error || "Couldn't analyze this photo. Please try again.");
        setStep('no-result');
        return;
      }

      const data: ScanMealApiResponse = await res.json();
      setResultMessage(data.message);

      if (data.status === 'all_providers_failed' || data.status === 'not_food') {
        setStep('no-result');
        return;
      }

      // 'success' or 'low_confidence' — build editable review rows
      setRows(
        data.items.map((item) => ({
          scannedName: item.name,
          scannedConfidence: item.confidence,
          candidates: item.matchedFoodCandidates,
          selectedFood: item.matchedFoodCandidates[0] ?? null,
          quantity: item.estimatedQuantity,
          unit: item.estimatedUnit,
          included: true,
        })),
      );
      setStep('review');
    } catch (err) {
      console.error('Meal scan failed:', err);
      setResultMessage(
        "Couldn't reach the server to analyze this photo. Check your connection and try again, or search and log manually.",
      );
      setStep('no-result');
    }
  }

  function updateRow(index: number, patch: Partial<ReviewRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleConfirmLog() {
    const toLog = rows.filter((r) => r.included && r.selectedFood && r.quantity > 0);
    if (toLog.length === 0) {
      handleClose();
      return;
    }
    setIsLogging(true);
    try {
      for (const row of toLog) {
        // eslint-disable-next-line no-await-in-loop -- logging sequentially
        // keeps this simple and matches how the rest of the app logs one
        // item at a time; these are a handful of items, not worth the
        // added complexity of a batch endpoint yet.
        await logFood(row.selectedFood as FoodItem, row.quantity, row.unit, activeMealSlot);
      }
      handleClose();
    } finally {
      setIsLogging(false);
    }
  }

  const slotTitle = activeMealSlot.charAt(0).toUpperCase() + activeMealSlot.slice(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/50 backdrop-blur-xs">
      <div className="bg-surface border border-border rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-serif font-bold text-lg text-primary">Scan {slotTitle}</h2>
            <p className="text-xs text-muted">Take or upload a photo — you&apos;ll review before logging</p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-muted hover:text-dark rounded hover:bg-background transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {step === 'capture' && (
            <div className="p-8 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-secondary-light flex items-center justify-center">
                <Camera className="w-7 h-7 text-secondary" />
              </div>
              <div>
                <p className="font-medium text-dark mb-1">Photo of your {activeMealSlot}</p>
                <p className="text-sm text-muted max-w-xs">
                  We&apos;ll identify what&apos;s on the plate — you confirm quantities and what
                  gets logged, nothing is added automatically.
                </p>
              </div>
              {captureError && (
                <p className="text-sm text-warning flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> {captureError}
                </p>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-secondary hover:bg-secondary-hover text-surface font-medium px-5 py-2.5 rounded-lg"
              >
                Take or Choose Photo
              </button>
              <button
                onClick={handleSearchInstead}
                className="text-sm text-muted hover:text-dark underline underline-offset-2"
              >
                Search for food manually instead
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={handleFileSelected}
                className="hidden"
              />
            </div>
          )}

          {step === 'analyzing' && (
            <div className="p-8 flex flex-col items-center justify-center text-center gap-4">
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- local
                // object URL preview, not worth Next/Image config for this
                <img
                  src={previewUrl}
                  alt="Selected meal photo"
                  className="w-40 h-40 object-cover rounded-lg border border-border"
                />
              )}
              <Loader2 className="w-6 h-6 text-secondary animate-spin" />
              <p className="text-sm text-muted">Identifying what&apos;s in the photo…</p>
            </div>
          )}

          {step === 'no-result' && (
            <div className="p-8 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-background border border-border flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-muted" />
              </div>
              <p className="text-dark font-medium max-w-sm">{resultMessage}</p>
              <div className="flex gap-3">
                <button
                  onClick={reset}
                  className="border border-border hover:bg-background text-dark font-medium px-4 py-2 rounded-lg"
                >
                  Try Another Photo
                </button>
                <button
                  onClick={handleSearchInstead}
                  className="bg-primary hover:bg-primary-hover text-surface font-medium px-4 py-2 rounded-lg flex items-center gap-1.5"
                >
                  <Search className="w-4 h-4" /> Search Manually
                </button>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="p-4 space-y-3">
              {resultMessage && (
                <p className="text-sm text-secondary bg-secondary-light rounded-lg px-3 py-2">
                  {resultMessage}
                </p>
              )}

              {rows.length === 0 && (
                <p className="text-sm text-muted text-center py-6">
                  No items left to log. Search manually to add something instead.
                </p>
              )}

              {rows.map((row, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-3 space-y-2 ${
                    row.included ? 'border-border bg-background/40' : 'border-border/50 opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={row.included}
                        onChange={(e) => updateRow(index, { included: e.target.checked })}
                        className="flex-shrink-0"
                      />
                      <span className="font-medium text-sm text-dark truncate">{row.scannedName}</span>
                      {row.scannedConfidence < 0.5 && (
                        <span className="text-[10px] uppercase font-bold tracking-wide text-warning bg-warning/10 px-1.5 py-0.5 rounded flex-shrink-0">
                          Unsure
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeRow(index)}
                      className="p-1 text-muted hover:text-warning rounded flex-shrink-0"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {row.candidates.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {row.candidates.map((candidate) => (
                        <button
                          key={candidate.id}
                          onClick={() => updateRow(index, { selectedFood: candidate })}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            row.selectedFood?.id === candidate.id
                              ? 'bg-primary text-surface border-primary'
                              : 'border-border text-dark hover:bg-background'
                          }`}
                        >
                          {candidate.canonicalName}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted">
                      No close match in our food database —{' '}
                      <button
                        onClick={handleSearchInstead}
                        className="underline underline-offset-2 hover:text-dark"
                      >
                        search for it manually
                      </button>{' '}
                      instead.
                    </p>
                  )}

                  {row.selectedFood && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={row.quantity}
                        onChange={(e) => updateRow(index, { quantity: Number(e.target.value) })}
                        className="w-20 px-2 py-1 border border-border rounded bg-surface text-sm text-dark"
                      />
                      <input
                        type="text"
                        value={row.unit}
                        onChange={(e) => updateRow(index, { unit: e.target.value })}
                        className="w-20 px-2 py-1 border border-border rounded bg-surface text-sm text-dark"
                      />
                      <span className="text-xs text-muted">
                        ≈{' '}
                        {Math.round(
                          (row.selectedFood.caloriesPer100g * row.quantity) / 100,
                        )}{' '}
                        kcal
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {step === 'review' && (
          <div className="p-4 border-t border-border flex items-center justify-between gap-3">
            <button
              onClick={handleSearchInstead}
              className="text-sm text-muted hover:text-dark underline underline-offset-2"
            >
              Add something else manually
            </button>
            <button
              onClick={handleConfirmLog}
              disabled={isLogging}
              className="bg-primary hover:bg-primary-hover disabled:opacity-60 text-surface font-semibold px-5 py-2.5 rounded-lg"
            >
              {isLogging
                ? 'Logging…'
                : `Log ${rows.filter((r) => r.included && r.selectedFood).length} Item${
                    rows.filter((r) => r.included && r.selectedFood).length === 1 ? '' : 's'
                  }`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
