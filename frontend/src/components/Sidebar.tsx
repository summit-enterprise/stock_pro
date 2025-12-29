'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSidebar } from '@/contexts/SidebarContext';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar } = useSidebar();

  const menuItems = [
    { icon: '🏠', label: 'Dashboard', path: '/dashboard' },
    { icon: '📈', label: 'Markets', path: '/markets' },
    { icon: '⭐', label: 'Watchlist', path: '/watchlist' },
    { icon: '💼', label: 'Portfolio', path: '/portfolio' },
    { icon: '📊', label: 'Analytics', path: '/analytics' },
    { icon: '😨', label: 'Fear/Greed Index', path: '/fear-greed' },
    { icon: '📄', label: 'Filings', path: '/filings' },
    { icon: '👔', label: 'Analysts', path: '/analysts' },
    { icon: '₿', label: 'Crypto', path: '/crypto' },
    { icon: '📈', label: 'Equities', path: '/equities' },
    { icon: '⚡', label: 'Commodities', path: '/commodities' },
    { icon: '🎴', label: 'Alternative', path: '/alternative' },
    { icon: '🔔', label: 'Alerts', path: '/alerts' },
    { icon: '📰', label: 'News', path: '/news' },
    { icon: '⚙️', label: 'Settings', path: '/settings' },
  ];

  const quickActions = [
    { icon: '🔍', label: 'Compare', path: '/compare' },
    { icon: '🔎', label: 'Screener', path: '/screener' },
    { icon: '📅', label: 'Calendar', path: '/calendar' },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname?.startsWith(path);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
      
      <aside
        className={`bg-gray-900 dark:bg-zinc-950 border-r border-gray-800 dark:border-zinc-800 transition-all duration-300 ${
          isCollapsed ? 'w-16' : 'w-64'
        } fixed left-0 top-16 h-[calc(100vh-4rem)] z-40 ${
          isCollapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`border-b border-gray-800 dark:border-zinc-800 flex items-center ${
            isCollapsed ? 'justify-center p-2' : 'justify-between p-4'
          }`}>
            {!isCollapsed && (
              <h2 className="text-xl font-bold text-white">StockPro</h2>
            )}
            <button
              onClick={toggleSidebar}
              className={`rounded-lg hover:bg-gray-800 dark:hover:bg-zinc-800 transition-colors text-gray-400 hover:text-white ${
                isCollapsed ? 'p-2' : 'p-2'
              }`}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg
                className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 overflow-y-auto">
            <div className={`${isCollapsed ? 'p-2 space-y-2' : 'p-4 space-y-1'}`}>
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center rounded-lg transition-colors ${
                    isCollapsed 
                      ? `justify-center w-12 h-12 mx-auto ${isActive(item.path) ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 dark:hover:bg-zinc-800 hover:text-white'}`
                      : `gap-3 px-4 py-3 ${isActive(item.path) ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 dark:hover:bg-zinc-800 hover:text-white'}`
                  }`}
                  title={isCollapsed ? item.label : ''}
                >
                  <span className={`${isCollapsed ? 'text-2xl' : 'text-xl'} flex-shrink-0`}>{item.icon}</span>
                  {!isCollapsed && <span className="font-medium">{item.label}</span>}
                </Link>
              ))}
            </div>

            {/* Quick Actions */}
            {!isCollapsed && (
              <>
                <div className="mt-8 pt-4 border-t border-gray-800 dark:border-zinc-800">
                  <p className="px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                    Quick Actions
                  </p>
                  <div className="space-y-1">
                    {quickActions.map((action) => (
                      <Link
                        key={action.path}
                        href={action.path}
                        className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-400 hover:bg-gray-800 dark:hover:bg-zinc-800 hover:text-white transition-colors"
                      >
                        <span className="text-lg">{action.icon}</span>
                        <span className="text-sm">{action.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            )}
          </nav>
        </div>
      </aside>
    </>
  );
}

