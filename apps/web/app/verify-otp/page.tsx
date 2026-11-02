'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2, Utensils } from 'lucide-react';
import { useNutritionStore } from '@/lib/store/useNutritionStore';

export default function VerifyOtpPage() {
  const verifySubscription = useNutritionStore((s) => s.verifySubscription);
  const loadSubscription = useNutritionStore((s) => s.loadSubscription);
  const [otp, setOtp] = useState('');
  const [phone, setPhone] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPhone(window.localStorage.getItem('thali_subscription_phone') || '');
    setReferenceNo(window.localStorage.getItem('thali_subscription_reference') || '');
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!referenceNo || !phone) {
      setError('Subscription session expired. Start again.');
      return;
    }
    setLoading(true);
    try {
      const result = await verifySubscription(referenceNo, otp.trim());
      await loadSubscription();
      if (!result.verified || !useNutritionStore.getState().subscription?.isSubscribed) {
        setMessage('OTP accepted. Confirm the carrier prompt, then check status again.');
        return;
      }
      window.localStorage.removeItem('thali_subscription_reference');
      window.location.assign('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-slate-950 sm:py-14">
      <div className="mx-auto max-w-md">
        <Link href="/subscribe" className="mb-10 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-950">
          <ArrowLeft className="h-4 w-4" /> Change number
        </Link>
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
            <Utensils className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold text-slate-950">AmarDiet</span>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Verification</p>
          <h1 className="mb-3 text-3xl font-black text-slate-950">Enter your OTP</h1>
          <p className="mb-7 text-sm leading-relaxed text-slate-500">
            Enter OTP sent to <span className="font-semibold text-slate-800">{phone || 'your number'}</span>.
          </p>
          <form onSubmit={submit} className="space-y-4">
            <input
              required
              autoFocus
              inputMode="numeric"
              pattern="[0-9]*"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              placeholder="Enter OTP"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-xl tracking-[0.4em] text-slate-950 outline-none focus:border-slate-950"
            />
            {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            {message && (
              <p className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {message}
              </p>
            )}
            <button
              disabled={loading}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-base font-bold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : 'Verify and continue'}
            </button>
          </form>
          <p className="mt-5 text-center text-xs text-text-muted">
            Didn&apos;t receive OTP? <Link href="/subscribe" className="text-slate-950 underline hover:no-underline">Request again</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
