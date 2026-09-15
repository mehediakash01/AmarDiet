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
} from 'lucide-react';
import { homepageCopy, type Lang } from '@/lib/i18n/homepage-copy';

const TOP_ICONS = [Utensils, Wallet, WifiOff];
const BOTTOM_ICONS = [Search, SlidersHorizontal, Target];

function HeroRing() {
  // Decorative only — sample numbers, not tied to a real logged-in user.
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const segments = [
    { pct: 50, color: '#C98A2C' }, // carbs
    { pct: 25, color: '#1F4D3E' }, // protein
    { pct: 15, color: '#8FBFA8' }, // veg
    { pct: 10, color: '#4A3418' }, // fat
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
      {/* Header */}
      <header className="border-b border-border bg-surface sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 font-serif font-bold text-lg text-primary">
            <div className="w-8 h-8 rounded bg-primary text-surface flex items-center justify-center">
              <Utensils className="w-4 h-4 text-accent" />
            </div>
            <span>Thali Tracker</span>
          </Link>

          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-dark">
            <a href="#top" className="hover:text-primary transition-colors">
              {t.nav.overview}
            </a>
            <a href="#how-it-works" className="hover:text-primary transition-colors">
              {t.nav.howItWorks}
            </a>
            <a href="#faq" className="hover:text-primary transition-colors">
              {t.nav.faq}
            </a>
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
        {/* Hero */}
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

        {/* Top feature row */}
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

        {/* Designed for section */}
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

        {/* Insight strip */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
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

        {/* FAQ */}
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

      {/* Footer */}
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
              <li>
                <a href="#how-it-works" className="hover:text-surface transition-colors">
                  {t.footer.howItWorks}
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-surface transition-colors">
                  {t.footer.faq}
                </a>
              </li>
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
