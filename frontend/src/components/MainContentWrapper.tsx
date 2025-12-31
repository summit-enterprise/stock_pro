'use client';

import { useEffect } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface MainContentWrapperProps {
  children: ReactNode;
  hideSidebar?: boolean;
}

export default function MainContentWrapper({ children, hideSidebar = false }: MainContentWrapperProps) {
  const { isCollapsed } = useSidebar();
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/admin');

  useEffect(() => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      if (hideSidebar) {
        mainContent.classList.remove('lg:ml-64', 'lg:ml-16');
      } else if (isCollapsed) {
        mainContent.classList.remove('lg:ml-64');
        mainContent.classList.add('lg:ml-16');
      } else {
        mainContent.classList.remove('lg:ml-16');
        mainContent.classList.add('lg:ml-64');
      }
      
      // Force blue background for admin pages
      if (isAdminPage) {
        mainContent.style.setProperty('background-color', '#eff6ff', 'important');
        mainContent.style.setProperty('background', '#eff6ff', 'important');
        // Also set on the parent if needed
        const parent = mainContent.parentElement;
        if (parent && pathname?.startsWith('/admin')) {
          parent.style.setProperty('background-color', '#eff6ff', 'important');
        }
      } else {
        mainContent.style.removeProperty('background-color');
        mainContent.style.removeProperty('background');
      }
    }
  }, [isCollapsed, hideSidebar, isAdminPage]);

  useEffect(() => {
    if (isAdminPage) {
      // Inject a style tag to override everything
      const styleId = 'admin-page-background-override';
      let styleElement = document.getElementById(styleId) as HTMLStyleElement;
      
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }
      
      styleElement.textContent = `
        html.dark [id="main-content"] {
          background-color: #eff6ff !important;
          background: #eff6ff !important;
        }
      `;
      
      return () => {
        const element = document.getElementById(styleId);
        if (element) {
          element.remove();
        }
      };
    }
  }, [isAdminPage]);

  return (
    <div 
      id="main-content" 
      className={`${hideSidebar ? '' : 'lg:ml-64'} transition-all duration-300 min-h-screen ${
        isAdminPage ? 'bg-blue-50 admin-page-bg' : 'bg-gray-100 dark:bg-black'
      }`}
      style={isAdminPage ? { backgroundColor: '#eff6ff', background: '#eff6ff' } : undefined}
    >
      {children}
    </div>
  );
}

