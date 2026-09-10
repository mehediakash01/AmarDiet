'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Utensils, LayoutDashboard, BookOpen, CalendarDays, TrendingUp, ShieldCheck, Settings } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/tracker', label: 'Diary', icon: BookOpen },
    { href: '/plan', label: 'Diet Plan', icon: CalendarDays },
    { href: '/progress', label: 'Progress', icon: TrendingUp },
    { href: '/admin', label: 'Admin', icon: ShieldCheck },
    { href: '/onboarding', label: 'Profile', icon: Settings },
  ];

  return (
    <header className="border-b border-border bg-surface sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center space-x-2 font-serif font-bold text-lg text-primary">
          <div className="w-8 h-8 rounded bg-primary text-surface flex items-center justify-center">
            <Utensils className="w-4 h-4 text-accent" />
          </div>
          <span>Thali Tracker</span>
        </Link>

        <nav className="flex items-center space-x-1 sm:space-x-4 text-sm font-medium">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded transition-colors ${
                  isActive
                    ? 'bg-primary text-surface'
                    : 'text-dark hover:bg-background hover:text-primary'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
