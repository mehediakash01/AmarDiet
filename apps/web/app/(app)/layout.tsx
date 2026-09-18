'use client';

import { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { FoodSearchModal } from '@/features/food-search/FoodSearchModal';
import { MealScanModal } from '@/features/meal-scan/MealScanModal';
import { useNutritionStore } from '@/lib/store/useNutritionStore';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const initSubscriber = useNutritionStore((s) => s.initSubscriber);
  const isSubscriberReady = useNutritionStore((s) => s.isSubscriberReady);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isSubscriberReady) return;
    initSubscriber().catch((e) => {
      setError(e instanceof Error ? e.message : 'Could not set up your account.');
    });
    // Only run once on mount — initSubscriber itself is stable from the
    // store, and isSubscriberReady flips to true after this resolves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-sm text-center">
          <p className="text-warning font-semibold mb-2">Couldn&apos;t connect</p>
          <p className="text-sm text-muted mb-5">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary hover:bg-primary-hover text-surface font-medium px-5 py-2.5 rounded-lg"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  if (!isSubscriberReady) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <p className="text-sm text-muted">Setting things up…</p>
      </main>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8">{children}</main>
      <FoodSearchModal />
      <MealScanModal />
    </>
  );
}
