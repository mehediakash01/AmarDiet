'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ShieldCheck, Smartphone, Utensils } from 'lucide-react';
import { useNutritionStore } from '@/lib/store/useNutritionStore';

export default function SubscribePage() {
  const initiateSubscription = useNutritionStore((s) => s.initiateSubscription);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await initiateSubscription(phone.trim());
      if (!result.referenceNo) throw new Error('OTP reference was not returned');
      window.localStorage.setItem('thali_subscription_phone', phone.trim());
      window.localStorage.setItem('thali_subscription_reference', result.referenceNo);
      window.location.assign('/verify-otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-slate-950 sm:py-14">
      <div className="mx-auto max-w-md">
        <Link href="/" className="mb-10 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-950">
          <ArrowLeft className="h-4 w-4" /> Back home
        </Link>
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
            <Utensils className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold text-slate-950">AmarDiet</span>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Sign in</p>
          <h1 className="mb-4 max-w-xs text-4xl font-black leading-tight text-slate-950">Verify your number</h1>
          <p className="mb-8 text-base leading-relaxed text-slate-500">
            Enter your Robi or Circle number. We&apos;ll send an OTP to verify your subscription.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm font-semibold text-slate-800">
              Mobile number
              <div className="mt-2 flex overflow-hidden rounded-2xl border border-slate-200">
                <span className="flex items-center border-r border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800">BD&nbsp;&nbsp;+88</span>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="min-w-0 flex-1 px-4 py-4 text-base text-slate-950 outline-none placeholder:text-slate-300"
                />
              </div>
            </label>
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-800">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Subscription</p>
              <p className="text-sm font-semibold">
                Charging: 4 BDT incl. VAT + SC + SD — Robi &amp; Circle only
              </p>
              <p className="mt-2 text-sm leading-relaxed">
                প্রতিদিন চার্জ ৪ টাকা (ভ্যাট+এসসি+এসডি সহ) — শুধুমাত্র রবি ও সার্কেল গ্রাহক
              </p>
            </div>
            {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            <button
              disabled={loading}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-base font-bold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'} <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-slate-400">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <span>OTP verification is handled securely through your mobile operator.</span>
          </div>
        </section>
      </div>
    </main>
  );
}
