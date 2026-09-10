import './globals.css';
import type { Metadata } from 'next';
import { Navbar } from '../components/Navbar';
import { FoodSearchModal } from '../features/food-search/FoodSearchModal';

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
    <html lang="en">
      <body className="bg-background text-dark min-h-screen flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8">
          {children}
        </main>
        <FoodSearchModal />
      </body>
    </html>
  );
}
