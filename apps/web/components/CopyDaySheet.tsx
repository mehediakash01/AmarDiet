'use client';

import React, { useState } from 'react';
import { Copy } from 'lucide-react';
import { useNutritionStore } from '@/lib/store/useNutritionStore';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { useToast } from '@/components/ui/Toast';
import { addDaysToDateString, localDateString } from '@/lib/date';

function formatDate(date: string): string {
  if (date === localDateString()) return 'today';
  if (date === addDaysToDateString(localDateString(), -1)) return 'yesterday';
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function CopyDaySheet() {
  const isOpen = useNutritionStore((s) => s.isCopyDaySheetOpen);
  const close = useNutritionStore((s) => s.closeCopyDaySheet);

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={close}
      title="Copy a day's meals"
      description="Add every food entry from an earlier day to this day."
      maxWidth="sm"
    >
      <CopyDayContent onDone={close} />
    </ModalSheet>
  );
}

function CopyDayContent({ onDone }: { onDone: () => void }) {
  const selectedDate = useNutritionStore((s) => s.selectedDate);
  const copyDayMeals = useNutritionStore((s) => s.copyDayMeals);
  const { toast } = useToast();

  const [sourceDate, setSourceDate] = useState(() => addDaysToDateString(selectedDate, -1));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (!sourceDate) {
      setError('Choose a day to copy from.');
      return;
    }
    if (sourceDate >= selectedDate) {
      setError('Choose a day before this diary day.');
      return;
    }

    setError(null);
    setSaving(true);
    const copied = await copyDayMeals(sourceDate);
    setSaving(false);

    if (copied === 0) {
      const message = `No meals logged on ${formatDate(sourceDate)}.`;
      setError(message);
      toast(message, 'error');
      return;
    }

    toast(
      `Copied ${copied} ${copied === 1 ? 'entry' : 'entries'} to ${formatDate(selectedDate)}`,
      'success',
    );
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="rounded-xl border border-border bg-zinc-950 px-3 py-2.5 text-xs text-text-secondary">
        Copying into{' '}
        <span className="font-semibold text-text-primary">{formatDate(selectedDate)}</span>
        <span className="text-text-muted"> ({selectedDate})</span>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="copy-source-date"
          className="text-xs font-semibold text-text-secondary block"
        >
          Copy meals from
        </label>
        <input
          id="copy-source-date"
          type="date"
          value={sourceDate}
          max={addDaysToDateString(selectedDate, -1)}
          onChange={(e) => {
            setSourceDate(e.target.value);
            if (error) setError(null);
          }}
          className="w-full px-3 py-2 min-h-[44px] border border-zinc-700 rounded-xl bg-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-cyan-500"
        />
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving || !sourceDate}
        className="w-full min-h-[44px] bg-cyan-500 hover:bg-cyan-400 text-zinc-950 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Copy className="w-4 h-4" />
        <span>{saving ? 'Copying…' : "Copy day's meals"}</span>
      </button>
    </form>
  );
}
