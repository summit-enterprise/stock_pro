'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SidebarContextType {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load sidebar preference from database on mount
  useEffect(() => {
    const loadSidebarPreference = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setIsLoading(false);
          return;
        }

        const response = await fetch('http://localhost:3001/api/user/preferences', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.sidebarCollapsed !== undefined) {
            setIsCollapsed(data.sidebarCollapsed);
          }
        }
      } catch (error) {
        console.error('Error loading sidebar preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSidebarPreference();
  }, []);

  const toggleSidebar = async () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);

    // Save to database
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await fetch('http://localhost:3001/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sidebarCollapsed: newState }),
      });
    } catch (error) {
      console.error('Error saving sidebar preference:', error);
    }
  };

  const setSidebarCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    
    // Save to database
    const token = localStorage.getItem('token');
    if (token) {
      fetch('http://localhost:3001/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sidebarCollapsed: collapsed }),
      }).catch(error => {
        console.error('Error saving sidebar preference:', error);
      });
    }
  };

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggleSidebar, setSidebarCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

