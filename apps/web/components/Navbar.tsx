'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Utensils,
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  TrendingUp,
  ShieldCheck,
  Settings,
  Camera,
} from 'lucide-react';
import { useNutritionStore } from '@/lib/store/useNutritionStore';

export function Navbar() {
  const pathname = usePathname();
  const isAdmin = useNutritionStore((s) => s.isAdmin);
  const openMealScan = useNutritionStore((s) => s.openMealScan);

  // Core navigation links (Admin is conditionally rendered only for verified admins)
  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/tracker', label: 'Diary', icon: BookOpen },
    { href: '/plan', label: 'Diet Plan', icon: CalendarDays },
    { href: '/progress', label: 'Progress', icon: TrendingUp },
  ];

  if (isAdmin) {
    navLinks.push({ href: '/admin', label: 'Admin', icon: ShieldCheck });
  }

  return (
    <>
      {/* ─── Desktop & Tablet Slim Top Bar ────────────────────────────── */}
      <header className="border-b border-border/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link
            href="/dashboard"
            className="flex items-center space-x-2.5 group transition-transform active:scale-95"
          >
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-sm shadow-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors">
              <Utensils className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-text-primary">
                AmarDiet
              </span>
              <span className="text-[10px] text-text-muted -mt-0.5 tracking-wider uppercase font-semibold">
                Thali Tracker
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1.5 text-sm font-medium">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl transition-all duration-200 min-h-[44px] ${
                    isActive
                      ? 'bg-zinc-800 text-cyan-400 font-semibold shadow-inner border border-zinc-700/80'
                      : 'text-text-secondary hover:text-text-primary hover:bg-zinc-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-text-muted'}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Desktop Right Quick Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              type="button"
              onClick={() => openMealScan('lunch')}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold transition-all shadow-sm active:scale-95 min-h-[44px]"
            >
              <Camera className="w-4 h-4" />
              <span>Scan Meal</span>
            </button>

            <Link
              href="/onboarding"
              aria-label="Profile and Nutrition Targets"
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors min-h-[44px] ${
                pathname === '/onboarding'
                  ? 'bg-zinc-800 border-zinc-700 text-cyan-400'
                  : 'bg-zinc-900 border-border text-text-secondary hover:text-text-primary hover:border-zinc-700'
              }`}
            >
              <Settings className="w-4 h-4 text-text-muted" />
              <span className="hidden lg:inline">Profile</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Mobile Bottom Tab Bar ────────────────────────────────────────── */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-lg border-t border-border/80 md:hidden flex items-center justify-around px-2 py-1 pb-safe shadow-2xl shadow-black"
      >
        {/* 1. Dashboard */}
        <Link
          href="/dashboard"
          className={`flex flex-col items-center justify-center flex-1 py-1.5 min-h-[48px] rounded-lg transition-colors ${
            pathname === '/dashboard' ? 'text-cyan-400 font-semibold' : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Home</span>
        </Link>

        {/* 2. Diary */}
        <Link
          href="/tracker"
          className={`flex flex-col items-center justify-center flex-1 py-1.5 min-h-[48px] rounded-lg transition-colors ${
            pathname === '/tracker' ? 'text-cyan-400 font-semibold' : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          <BookOpen className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Diary</span>
        </Link>

        {/* 3. Center Raised Scan Action */}
        <div className="flex flex-col items-center justify-center px-1">
          <button
            type="button"
            onClick={() => openMealScan('lunch')}
            aria-label="Scan food with camera"
            className="w-12 h-12 -mt-4 rounded-full bg-cyan-500 hover:bg-cyan-400 text-zinc-950 flex items-center justify-center shadow-lg shadow-cyan-500/30 transition-transform active:scale-95 border-2 border-zinc-950"
          >
            <Camera className="w-5 h-5" />
          </button>
          <span className="text-[10px] text-text-secondary font-medium mt-0.5">Scan</span>
        </div>

        {/* 4. Plan */}
        <Link
          href="/plan"
          className={`flex flex-col items-center justify-center flex-1 py-1.5 min-h-[48px] rounded-lg transition-colors ${
            pathname === '/plan' ? 'text-cyan-400 font-semibold' : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          <CalendarDays className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Plan</span>
        </Link>

        {/* 5. Progress */}
        <Link
          href="/progress"
          className={`flex flex-col items-center justify-center flex-1 py-1.5 min-h-[48px] rounded-lg transition-colors ${
            pathname === '/progress' ? 'text-cyan-400 font-semibold' : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          <TrendingUp className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Progress</span>
        </Link>
      </nav>
    </>
  );
}
