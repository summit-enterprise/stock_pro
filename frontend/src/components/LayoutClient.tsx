'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import MainContentWrapper from '@/components/MainContentWrapper';
import Footer from '@/components/Footer';

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLandingPage = pathname === '/';

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-black transition-colors">
      <Navbar />
      {!isLandingPage && <Sidebar />}
      <MainContentWrapper hideSidebar={isLandingPage}>
        {children}
      </MainContentWrapper>
      <Footer />
    </div>
  );
}



