import { Navbar } from '@/components/Navbar';
import { FoodSearchModal } from '@/features/food-search/FoodSearchModal';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8">{children}</main>
      <FoodSearchModal />
    </>
  );
}
