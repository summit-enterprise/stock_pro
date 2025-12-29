'use client';

import { useSidebar } from '@/contexts/SidebarContext';
import { ReactNode } from 'react';

interface PageWrapperProps {
  children: ReactNode;
}

export default function PageWrapper({ children }: PageWrapperProps) {
  const { isCollapsed } = useSidebar();

  return (
    <div className={`transition-all duration-300 ${
      isCollapsed ? 'lg:ml-16' : 'lg:ml-64'
    }`}>
      {children}
    </div>
  );
}

