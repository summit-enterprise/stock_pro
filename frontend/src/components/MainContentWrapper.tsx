'use client';

import { useEffect } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';
import { ReactNode } from 'react';

interface MainContentWrapperProps {
  children: ReactNode;
}

export default function MainContentWrapper({ children }: MainContentWrapperProps) {
  const { isCollapsed } = useSidebar();

  useEffect(() => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      if (isCollapsed) {
        mainContent.classList.remove('lg:ml-64');
        mainContent.classList.add('lg:ml-16');
      } else {
        mainContent.classList.remove('lg:ml-16');
        mainContent.classList.add('lg:ml-64');
      }
    }
  }, [isCollapsed]);

  return (
    <div 
      id="main-content" 
      className="lg:ml-64 transition-all duration-300"
    >
      {children}
    </div>
  );
}

