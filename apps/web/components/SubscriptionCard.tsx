'use client';

import React, { useState } from 'react';
import {
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { useNutritionStore } from '@/lib/store/useNutritionStore';
import { useToast } from '@/components/ui/Toast';

export function SubscriptionCard() {
  const { toast } = useToast();
  const subscription = useNutritionStore((s) => s.subscription);
  const isSubscriptionLoading = useNutritionStore((s) => s.isSubscriptionLoading);
  const loadSubscription = useNutritionStore((s) => s.loadSubscription);
  const initiateSubscription = useNutritionStore((s) => s.initiateSubscription);

  const [phone, setPhone] = useState('');
  const [instruction, setInstruction] = useState<string | null>(null);

  const status = subscription?.status || 'inactive';
  const isActive = status === 'active';
  const isSuspended = status === 'suspended';

  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast('Please enter your Robi / Airtel phone number', 'error');
      return;
    }

    try {
      const res = await initiateSubscription(phone.trim());
      toast('Subscription prompt initiated on your phone', 'success');
      if (res.instruction) {
        setInstruction(res.instruction);
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not initiate subscription', 'error');
    }
  };

  const handleRefresh = async () => {
    await loadSubscription();
    toast('Subscription status updated', 'info');
  };

  return (
    <div className="bg-surface/90 border border-border/80 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-text-primary tracking-tight">
              Bdapps Daily Subscription
            </h3>
            <p className="text-[11px] text-text-muted">Robi &amp; Airtel Carrier Billing</p>
          </div>
        </div>

        {/* Status Pill */}
        {isActive ? (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Active (৳2/day)</span>
          </span>
        ) : isSuspended ? (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertCircle className="w-3 h-3" />
            <span>Suspended</span>
          </span>
        ) : (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-800 text-zinc-400 border border-border">
            <span>Free / Inactive</span>
          </span>
        )}
      </div>

      {/* Main Content */}
      {isActive ? (
        <div className="space-y-3">
          <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-3.5 flex items-start space-x-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-medium text-emerald-300">
                Premium Access Active
              </p>
              <p className="text-emerald-400/80 leading-relaxed text-[11px]">
                Your subscription is active via Bdapps. Billed at ৳2.00/day directly through your carrier.
                {subscription?.phone && ` Linked number: ${subscription.phone}`}
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center pt-1 text-xs">
            <span className="text-text-muted text-[11px]">Next renewal: Automatic daily</span>
            <button
              onClick={handleRefresh}
              disabled={isSubscriptionLoading}
              className="inline-flex items-center space-x-1.5 text-[11px] text-text-secondary hover:text-text-primary transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isSubscriptionLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Status</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          <div className="text-xs text-text-secondary space-y-1.5 leading-relaxed">
            <p>
              Subscribe for <span className="font-semibold text-text-primary">৳2.00 / day</span> via Robi or Airtel carrier billing to unlock full features, AI scans, and advanced nutrition insights.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleInitiate} className="space-y-2.5">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="tel"
                  placeholder="018XXXXXXXX or +88018..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-zinc-900 border border-border rounded-xl px-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubscriptionLoading}
                className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-50 shrink-0 min-h-[38px]"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{isSubscriptionLoading ? 'Sending...' : 'Subscribe'}</span>
              </button>
            </div>

            {instruction && (
              <div className="bg-cyan-950/20 border border-cyan-800/40 rounded-xl p-3 text-[11px] text-cyan-300 leading-relaxed">
                {instruction}
              </div>
            )}
          </form>

          {/* Verification notice */}
          <div className="flex items-start space-x-2 pt-1 text-[11px] text-text-muted">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
            <p className="leading-tight">
              Subscription activates automatically upon telco webhook verification. Browser cannot self-activate.
            </p>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={handleRefresh}
              disabled={isSubscriptionLoading}
              className="inline-flex items-center space-x-1.5 text-[11px] text-text-muted hover:text-text-primary transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isSubscriptionLoading ? 'animate-spin' : ''}`} />
              <span>Check Status</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
