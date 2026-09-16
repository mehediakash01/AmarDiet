'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Utensils,
  Wallet,
  WifiOff,
  Search,
  SlidersHorizontal,
  Target,
  Sparkles,
  ChevronDown,
  Languages,
  Quote,
  Droplets,
  Beef,
  Salad,
  Dumbbell,
  Wind,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { homepageCopy, type Lang } from '@/lib/i18n/homepage-copy';

const TOP_ICONS = [Utensils, Wallet, WifiOff];
const BOTTOM_ICONS = [Search, SlidersHorizontal, Target];

// ─── Daily Quotes ─────────────────────────────────────────────────────────────
const DAILY_QUOTES = [
  { quote: 'Every healthy meal is a vote for the body you want to live in.', author: 'Anonymous' },
  { quote: 'Consistency beats perfection. Show up today.', author: 'Thali Tracker' },
  { quote: 'You don\'t have to eat less — you just have to eat right.', author: 'Anonymous' },
  { quote: 'Small daily improvements lead to staggering long-term results.', author: 'Robin Sharma' },
  { quote: 'Take care of your body — it\'s the only place you have to live.', author: 'Jim Rohn' },
  { quote: 'Nutrition is not a punishment. It\'s a gift you give yourself daily.', author: 'Thali Tracker' },
  { quote: 'Your future self will thank you for every disciplined choice you make today.', author: 'Anonymous' },
];

function MotivationalBanner() {
  const [quoteIdx, setQuoteIdx] = useState(0);

  useEffect(() => {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
    );
    setQuoteIdx(dayOfYear % DAILY_QUOTES.length);
  }, []);

  const q = DAILY_QUOTES[quoteIdx];

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-10">
      <div className="bg-gradient-to-br from-primary to-primary-hover rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        {/* decorative rings */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full border border-surface/10 pointer-events-none" />
        <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full border border-surface/10 pointer-events-none" />
        <div className="flex gap-4 items-start">
          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
            <Quote className="w-5 h-5 text-accent" />
          </div>
          <div>
            <div className="text-xs font-semibold text-accent uppercase tracking-widest mb-2">
              Daily Mindset
            </div>
            <blockquote className="text-surface font-serif font-semibold text-lg sm:text-xl leading-snug mb-2">
              &ldquo;{q.quote}&rdquo;
            </blockquote>
            <cite className="text-surface/60 text-sm not-italic">— {q.author}</cite>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Fitness Tips ─────────────────────────────────────────────────────────────
const FITNESS_TIPS = [
  {
    icon: Beef,
    color: '#1F4D3E',
    bg: '#E2ECE7',
    title: 'Protein Timing',
    body: 'Spread protein intake across 3–4 meals. Aim for 25–40 g per meal for optimal muscle protein synthesis.',
  },
  {
    icon: Salad,
    color: '#5A3E85',
    bg: '#EFEBF5',
    title: 'Fiber Every Meal',
    body: 'Target 25–35 g fiber/day from vegetables, lentils, and whole grains to support digestion and satiety.',
  },
  {
    icon: Droplets,
    color: '#C98A2C',
    bg: '#F8F1E4',
    title: 'Hydration First',
    body: 'Drink 35 ml per kg of bodyweight daily. Start each meal with a full glass of water to manage appetite.',
  },
  {
    icon: Zap,
    color: '#B0472F',
    bg: '#F8ECE9',
    title: 'Pre-Workout Fuel',
    body: 'Eat 30–60 g carbs and 15–20 g protein 60–90 min before training for sustained energy and recovery.',
  },
  {
    icon: Target,
    color: '#1F4D3E',
    bg: '#E2ECE7',
    title: 'Calorie Deficit Safely',
    body: 'A 300–500 kcal/day deficit is sustainable. Larger cuts spike cortisol and muscle loss — stay patient.',
  },
  {
    icon: Sparkles,
    color: '#5A3E85',
    bg: '#EFEBF5',
    title: 'Micronutrient Variety',
    body: 'Eat at least 5 different colored vegetables/fruits per day to cover vitamins, minerals, and antioxidants.',
  },
];

function FitnessTips() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 border-t border-border">
      <div className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-widest text-accent">Science-backed</span>
        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-dark mt-2">
          Nutrition Rules That Actually Work
        </h2>
        <p className="text-muted mt-2 max-w-xl">
          Simple, evidence-based principles built into how Thali Tracker calculates your daily targets.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FITNESS_TIPS.map((tip) => {
          const Icon = tip.icon;
          return (
            <div
              key={tip.title}
              className="bg-surface border border-border rounded-xl p-5 hover:shadow-md transition-shadow"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                style={{ backgroundColor: tip.bg }}
              >
                <Icon className="w-4.5 h-4.5" style={{ color: tip.color }} />
              </div>
              <h3 className="font-serif font-bold text-dark mb-1.5">{tip.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{tip.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Home Workouts ────────────────────────────────────────────────────────────
const WORKOUTS = [
  {
    icon: Dumbbell,
    tag: 'Full Body',
    title: 'Full Body Circuit',
    duration: '25 min',
    level: 'Beginner–Intermediate',
    description:
      'A complete no-equipment circuit that hits every major muscle group. Perfect for days when you cannot get to a gym.',
    exercises: [
      { name: 'Jumping Jacks', sets: '3 × 30 reps', note: 'Warm-up' },
      { name: 'Push-Ups', sets: '3 × 12–15 reps', note: 'Chest, triceps' },
      { name: 'Bodyweight Squats', sets: '3 × 20 reps', note: 'Quads, glutes' },
      { name: 'Mountain Climbers', sets: '3 × 30 s', note: 'Core + cardio' },
      { name: 'Reverse Lunges', sets: '3 × 10 each leg', note: 'Hamstrings, balance' },
      { name: 'Plank Hold', sets: '3 × 45 s', note: 'Core stability' },
    ],
  },
  {
    icon: Target,
    tag: 'Core',
    title: 'Core Strength',
    duration: '15 min',
    level: 'All Levels',
    description:
      'A focused core session to build functional abdominal and lower-back strength with zero equipment needed.',
    exercises: [
      { name: 'Dead Bug', sets: '3 × 10 each side', note: 'Deep core activation' },
      { name: 'Plank', sets: '3 × 60 s', note: 'Anti-extension' },
      { name: 'Side Plank', sets: '2 × 30 s each side', note: 'Lateral stability' },
      { name: 'Bicycle Crunches', sets: '3 × 20 reps', note: 'Obliques' },
      { name: 'Glute Bridge', sets: '3 × 15 reps', note: 'Posterior chain' },
      { name: 'Superman Hold', sets: '3 × 10 reps 3 s hold', note: 'Lower back' },
    ],
  },
  {
    icon: Wind,
    tag: 'Mobility',
    title: 'Morning Mobility',
    duration: '10 min',
    level: 'All Levels',
    description:
      'A gentle daily mobility flow to reduce stiffness, improve posture, and set a focused tone for the day.',
    exercises: [
      { name: 'Cat-Cow Stretch', sets: '10 slow reps', note: 'Spine mobility' },
      { name: 'Hip 90/90 Stretch', sets: '60 s each side', note: 'Hip flexors & rotators' },
      { name: 'World\'s Greatest Stretch', sets: '5 each side', note: 'Full chain' },
      { name: 'Thoracic Rotation', sets: '10 each side', note: 'Mid-back mobility' },
      { name: 'Ankle Circles', sets: '10 each direction', note: 'Joint prep' },
      { name: 'Child\'s Pose', sets: '60 s hold', note: 'Recovery & breath' },
    ],
  },
];

function HomeWorkouts() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 border-t border-border">
      <div className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-widest text-secondary">No Equipment Needed</span>
        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-dark mt-2">
          Home Workout Library
        </h2>
        <p className="text-muted mt-2 max-w-xl">
          Structured sessions designed to pair with your nutrition plan. Tap any card to expand the full routine.
        </p>
      </div>
      <div className="space-y-3">
        {WORKOUTS.map((w, i) => {
          const Icon = w.icon;
          const isOpen = openIdx === i;
          return (
            <div
              key={w.title}
              className="bg-surface border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors"
            >
              {/* Header row — always visible */}
              <button
                onClick={() => setOpenIdx(isOpen ? null : i)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-secondary-light flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-secondary bg-secondary-light px-2 py-0.5 rounded-full">
                      {w.tag}
                    </span>
                    <span className="text-[10px] text-muted">{w.duration} · {w.level}</span>
                  </div>
                  <div className="font-serif font-bold text-dark text-base mt-0.5">{w.title}</div>
                  <p className="text-xs text-muted mt-0.5 leading-relaxed line-clamp-1">{w.description}</p>
                </div>
                <ChevronRight
                  className={`w-4 h-4 text-muted flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                />
              </button>

              {/* Expanded exercise table */}
              {isOpen && (
                <div className="border-t border-border px-5 pb-5 pt-4 bg-background/40">
                  <p className="text-sm text-muted mb-4 leading-relaxed">{w.description}</p>
                  <div className="divide-y divide-border/50 rounded-lg border border-border overflow-hidden">
                    {w.exercises.map((ex) => (
                      <div
                        key={ex.name}
                        className="flex items-center justify-between px-4 py-2.5 bg-surface text-xs"
                      >
                        <div>
                          <span className="font-semibold text-dark">{ex.name}</span>
                          <span className="text-muted ml-2">— {ex.note}</span>
                        </div>
                        <span className="font-mono text-primary font-bold whitespace-nowrap ml-3">
                          {ex.sets}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Decorative ring (hero) ────────────────────────────────────────────────────
function HeroRing() {
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const segments = [
    { pct: 50, color: '#C98A2C' },
    { pct: 25, color: '#1F4D3E' },
    { pct: 15, color: '#8FBFA8' },
    { pct: 10, color: '#4A3418' },
  ];
  let offsetAccum = 0;

  return (
    <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} stroke="#EFE9D9" strokeWidth="14" fill="transparent" />
        {segments.map((seg, i) => {
          const dash = (seg.pct / 100) * circumference;
          const gap = circumference - dash;
          const el = (
            <circle
              key={i}
              cx="70"
              cy="70"
              r={radius}
              stroke={seg.color}
              strokeWidth="14"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offsetAccum}
              strokeLinecap="round"
              fill="transparent"
            />
          );
          offsetAccum += dash;
          return el;
        })}
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center px-4">
        <span className="text-4xl font-serif font-bold text-primary">645</span>
        <span className="text-xs text-muted mt-1">kcal</span>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [lang, setLang] = useState<Lang>('bn');

  useEffect(() => {
    const stored = window.localStorage.getItem('thali_lang');
    if (stored === 'bn' || stored === 'en') setLang(stored);
  }, []);

  const toggleLang = () => {
    const next: Lang = lang === 'bn' ? 'en' : 'bn';
    setLang(next);
    window.localStorage.setItem('thali_lang', next);
  };

  const t = homepageCopy[lang];
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="flex-1 flex flex-col" dir="ltr">
      {/* ── Standalone Landing Header (no app Navbar) ── */}
      <header className="border-b border-border bg-surface sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 font-serif font-bold text-lg text-primary">
            <div className="w-8 h-8 rounded bg-primary text-surface flex items-center justify-center">
              <Utensils className="w-4 h-4 text-accent" />
            </div>
            <span>Thali Tracker</span>
          </Link>

          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-dark">
            <a href="#top" className="hover:text-primary transition-colors">{t.nav.overview}</a>
            <a href="#how-it-works" className="hover:text-primary transition-colors">{t.nav.howItWorks}</a>
            <a href="#workouts" className="hover:text-primary transition-colors">Workouts</a>
            <a href="#faq" className="hover:text-primary transition-colors">{t.nav.faq}</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 text-sm font-medium text-dark border border-border rounded-full px-3 py-1.5 hover:bg-background transition-colors"
              aria-label="Toggle language"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{t.langToggleLabel}</span>
            </button>
            <Link
              href="/onboarding"
              className="hidden sm:inline-block bg-accent hover:bg-accent-hover text-surface text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {t.hero.ctaPrimary}
            </Link>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* ── Hero ── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-block text-xs font-semibold tracking-wide text-accent bg-accent-light px-3 py-1 rounded-full mb-4">
              {t.hero.eyebrow}
            </span>
            <h1 className="text-3xl sm:text-5xl font-serif font-bold text-dark leading-tight mb-5">
              {t.hero.headline}
            </h1>
            <p className="text-base sm:text-lg text-muted mb-8 max-w-lg">{t.hero.subhead}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/onboarding"
                className="bg-accent hover:bg-accent-hover text-surface font-semibold px-6 py-3 rounded-lg text-center transition-colors"
              >
                {t.hero.ctaPrimary}
              </Link>
              <a
                href="#how-it-works"
                className="border border-border hover:bg-surface text-dark font-medium px-6 py-3 rounded-lg text-center transition-colors"
              >
                {t.hero.ctaSecondary}
              </a>
            </div>
          </div>

          <div className="flex justify-center md:justify-end">
            <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 flex flex-col items-center gap-2">
              <HeroRing />
              <div className="text-center">
                <div className="text-sm font-semibold text-dark">{t.hero.ringCaption}</div>
                <div className="text-xs text-muted">{t.hero.ringSubcaption}</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Motivational Banner ── */}
        <MotivationalBanner />

        {/* ── Top feature row ── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-14 grid sm:grid-cols-3 gap-5">
          {t.featuresTop.map((f, i) => {
            const Icon = TOP_ICONS[i];
            return (
              <div key={i} className="bg-surface border border-border rounded-xl p-5">
                <div className="w-9 h-9 rounded-lg bg-primary-light flex items-center justify-center mb-3">
                  <Icon className="w-4.5 h-4.5 text-primary" />
                </div>
                <h3 className="font-serif font-bold text-dark mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{f.body}</p>
              </div>
            );
          })}
        </section>

        {/* ── Designed for section ── */}
        <section id="how-it-works" className="bg-primary-light/40 border-y border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-16">
            <div className="max-w-2xl mb-10">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-dark mb-3">
                {t.designedFor.heading}
              </h2>
              <p className="text-muted">{t.designedFor.subheading}</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-5">
              {t.featuresBottom.map((f, i) => {
                const Icon = BOTTOM_ICONS[i];
                return (
                  <div key={i} className="bg-surface border border-border rounded-xl p-5">
                    <div className="w-9 h-9 rounded-lg bg-secondary-light flex items-center justify-center mb-3">
                      <Icon className="w-4.5 h-4.5 text-secondary" />
                    </div>
                    <h3 className="font-serif font-bold text-dark mb-1.5">{f.title}</h3>
                    <p className="text-sm text-muted leading-relaxed">{f.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Fitness Tips ── */}
        <FitnessTips />

        {/* ── Home Workouts ── */}
        <div id="workouts">
          <HomeWorkouts />
        </div>

        {/* ── Insight strip ── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 border-t border-border">
          <div className="bg-secondary-light border border-secondary/20 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-surface" />
              </div>
              <div>
                <span className="text-xs font-semibold text-secondary uppercase tracking-wide">
                  {t.insight.tag}
                </span>
                <h3 className="font-serif font-bold text-dark text-lg mt-1 mb-1.5">
                  {t.insight.heading}
                </h3>
                <p className="text-sm text-muted max-w-xl leading-relaxed">{t.insight.body}</p>
              </div>
            </div>
            <Link
              href="/onboarding"
              className="bg-primary hover:bg-primary-hover text-surface font-semibold px-5 py-2.5 rounded-lg whitespace-nowrap transition-colors"
            >
              {t.insight.cta}
            </Link>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-dark mb-8 text-center">
            {t.faq.heading}
          </h2>
          <div className="space-y-3">
            {t.faq.items.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={i} className="border border-border rounded-lg bg-surface overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left font-medium text-dark"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-muted flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-sm text-muted leading-relaxed">{item.a}</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-primary text-surface">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid sm:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center space-x-2 font-serif font-bold text-lg mb-3">
              <div className="w-8 h-8 rounded bg-surface text-primary flex items-center justify-center">
                <Utensils className="w-4 h-4 text-accent" />
              </div>
              <span>Thali Tracker</span>
            </div>
            <p className="text-sm text-surface/70 max-w-xs leading-relaxed">{t.footer.tagline}</p>
          </div>
          <div>
            <div className="text-sm font-semibold mb-3 text-surface/90">{t.footer.quickLinks}</div>
            <ul className="space-y-2 text-sm text-surface/70">
              <li><a href="#how-it-works" className="hover:text-surface transition-colors">{t.footer.howItWorks}</a></li>
              <li><a href="#workouts" className="hover:text-surface transition-colors">Home Workouts</a></li>
              <li><a href="#faq" className="hover:text-surface transition-colors">{t.footer.faq}</a></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold mb-3 text-surface/90">{t.footer.support}</div>
            <p className="text-sm text-surface/70">support@thalitracker.bd</p>
          </div>
        </div>
        <div className="border-t border-surface/10 py-4 text-center text-xs text-surface/60">
          © {new Date().getFullYear()} Thali Tracker. {t.footer.rights}
        </div>
      </footer>
    </div>
  );
}
