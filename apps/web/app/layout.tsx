import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | Thali Tracker',
    default: 'Thali Tracker',
  },
  description:
    'Personalized diet and macro tracking — log meals, hit your goals, your way.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
