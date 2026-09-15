import './globals.css';
import type { Metadata } from 'next';
// Self-hosted Bengali fonts (bundled at build time, no live fetch to
// Google's CDN required) — more robust than next/font/google for
// deployment targets with uncertain outbound network access at build time.
import '@fontsource/noto-sans-bengali/400.css';
import '@fontsource/noto-sans-bengali/500.css';
import '@fontsource/noto-sans-bengali/600.css';
import '@fontsource/noto-sans-bengali/700.css';
import '@fontsource/noto-serif-bengali/500.css';
import '@fontsource/noto-serif-bengali/600.css';
import '@fontsource/noto-serif-bengali/700.css';

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
    <html lang="bn">
      <body className="bg-background text-dark min-h-screen flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
