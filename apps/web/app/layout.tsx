import './globals.css';
import type { Metadata } from 'next';
// Self-hosted Bengali fonts (bundled at build time, no live fetch to
// Google's CDN required) — more robust than next/font/google for
// deployment targets with uncertain outbound network access at build time.
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/noto-sans-bengali/400.css';
import '@fontsource/noto-sans-bengali/500.css';
import '@fontsource/noto-sans-bengali/600.css';
import '@fontsource/noto-sans-bengali/700.css';
import '@fontsource/noto-serif-bengali/500.css';
import '@fontsource/noto-serif-bengali/600.css';
import '@fontsource/noto-serif-bengali/700.css';

import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: {
    template: '%s | Thali Tracker',
    default: 'Thali Tracker — Personalized Diet & Macro Engine',
  },
  description:
    'Local-first personalized diet and macro tracking across Bengali, Western, and packaged foods.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn" className="dark">
      <body className="bg-background text-text-primary min-h-screen flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
