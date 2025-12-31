'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSidebar } from '@/contexts/SidebarContext';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [marketsHovered, setMarketsHovered] = useState(false);
  const [submenuPosition, setSubmenuPosition] = useState({ top: 0, left: 0 });
  const marketsRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const marketsSubmenu = [
    { icon: '₿', label: 'Crypto', path: '/crypto' },
    { icon: '📈', label: 'Equities', path: '/equities' },
    { icon: '⚡', label: 'Commodities', path: '/commodities' },
    { icon: '🎴', label: 'Alternative', path: '/alternative' },
  ];

  const menuItems = [
    { icon: '🏠', label: 'Dashboard', path: '/dashboard' },
    { icon: '📈', label: 'Markets', path: '/markets', hasSubmenu: true },
    { icon: '⭐', label: 'Watchlist', path: '/watchlist' },
    { icon: '💼', label: 'Portfolio', path: '/portfolio' },
    { icon: '📊', label: 'Analytics', path: '/analytics' },
    { icon: '📉', label: 'Charting', path: '/charting' },
    { icon: '😨', label: 'Fear/Greed Index', path: '/fear-greed' },
    { icon: '📄', label: 'SEC Filings', path: '/filings' },
    { icon: '🏛️', label: 'Disclosures', path: '/disclosures' },
    { icon: '💎', label: 'Super Investors', path: '/super-investors' },
    { icon: '👔', label: 'Analysts', path: '/analysts' },
    { icon: '🔔', label: 'Alerts', path: '/alerts' },
    { icon: '📰', label: 'News', path: '/news' },
    { icon: '📺', label: 'Live Streams', path: '/live-streams' },
    { icon: '💬', label: 'Support/Contact', path: '/support' },
    { icon: '👤', label: 'Account', path: '/account' },
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

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
        className={`bg-gray-100 dark:bg-zinc-950 border-r border-gray-200 dark:border-zinc-800 transition-all duration-300 ${
          isCollapsed ? 'w-16' : 'w-64'
        } fixed left-0 top-16 h-[calc(100vh-4rem)] z-40 ${
          isCollapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'
        }`}
        style={{ overflow: 'visible' }}
      >
        <div className="flex flex-col h-full" style={{ overflow: 'visible' }}>
          {/* Header */}
          <div className={`border-b border-gray-200 dark:border-zinc-800 flex items-center ${
            isCollapsed ? 'justify-center p-2' : 'justify-between p-4'
          }`}>
            {!isCollapsed && (
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Navigation</h2>
            )}
            <button
              onClick={toggleSidebar}
              className={`rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white ${
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
          <nav className="flex-1" style={{ overflowY: 'auto', overflowX: 'visible' }}>
            <div className={`${isCollapsed ? 'p-2 space-y-2' : 'p-4 space-y-1'}`} style={{ position: 'relative', overflow: 'visible' }}>
              {menuItems.map((item) => {
                if (item.hasSubmenu && !isCollapsed) { // Only show submenu when sidebar is expanded
                  // Markets with submenu
                  const isMarketsActive = pathname === '/markets' || 
                    pathname === '/crypto' || 
                    pathname === '/equities' || 
                    pathname === '/commodities' || 
                    pathname === '/alternative';
                  
                  return (
                    <div
                      key={item.path}
                      ref={marketsRef}
                      className="relative"
                      onMouseEnter={() => {
                        // Clear any pending timeout
                        if (hoverTimeoutRef.current) {
                          clearTimeout(hoverTimeoutRef.current);
                          hoverTimeoutRef.current = null;
                        }
                        setMarketsHovered(true);
                        if (marketsRef.current) {
                          const rect = marketsRef.current.getBoundingClientRect();
                          setSubmenuPosition({
                            top: rect.top - 8, // Align top with Markets name (slightly above for better alignment)
                            left: rect.right + 4,
                          });
                        }
                      }}
                      onMouseLeave={(e) => {
                        // Check if mouse is moving to submenu
                        const relatedTarget = e.relatedTarget as HTMLElement | null;
                        if (relatedTarget && submenuRef.current && (
                          (relatedTarget instanceof Node && submenuRef.current.contains(relatedTarget)) || 
                          (relatedTarget instanceof Element && relatedTarget.closest('.markets-submenu'))
                        )) {
                          return; // Don't hide if moving to submenu
                        }
                        // Add small delay to allow mouse to move to submenu
                        hoverTimeoutRef.current = setTimeout(() => {
                          setMarketsHovered(false);
                        }, 100);
                      }}
                    >
                      <Link
                        href={item.path}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                          isMarketsActive ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <span className="text-xl flex-shrink-0">{item.icon}</span>
                        <span className="font-medium flex-1">{item.label}</span>
                        <svg
                          className={`w-4 h-4 transition-transform ${marketsHovered ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                      
                      {/* Submenu - positioned fixed to extend past sidebar */}
                      {marketsHovered && (
                        <div 
                          ref={submenuRef}
                          className="markets-submenu fixed w-52 bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg shadow-2xl z-[100] py-2 overflow-hidden"
                          style={{
                            top: `${submenuPosition.top}px`,
                            left: `${submenuPosition.left}px`,
                          }}
                          onMouseEnter={() => {
                            // Clear timeout when entering submenu
                            if (hoverTimeoutRef.current) {
                              clearTimeout(hoverTimeoutRef.current);
                              hoverTimeoutRef.current = null;
                            }
                            setMarketsHovered(true);
                          }}
                          onMouseLeave={() => {
                            setMarketsHovered(false);
                          }}
                        >
                          {marketsSubmenu.map((subItem) => (
                            <Link
                              key={subItem.path}
                              href={subItem.path}
                              onClick={() => setMarketsHovered(false)}
                              className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors ${
                                isActive(subItem.path) 
                                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold' 
                                  : 'text-gray-700 dark:text-gray-400'
                              }`}
                            >
                              <span className="text-lg flex-shrink-0">{subItem.icon}</span>
                              <span className="text-sm font-medium">{subItem.label}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                } else {
                  // Regular menu item
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`flex items-center rounded-lg transition-colors ${
                        isCollapsed 
                          ? `justify-center w-12 h-12 mx-auto ${isActive(item.path) ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white'}`
                          : `gap-3 px-4 py-3 ${isActive(item.path) ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white'}`
                      }`}
                      title={isCollapsed ? item.label : ''}
                    >
                      <span className={`${isCollapsed ? 'text-2xl' : 'text-xl'} flex-shrink-0`}>{item.icon}</span>
                      {!isCollapsed && <span className="font-medium">{item.label}</span>}
                    </Link>
                  );
                }
              })}
            </div>

            {/* Quick Actions */}
            {!isCollapsed && (
              <>
                <div className="mt-8 pt-4 border-t border-gray-200 dark:border-zinc-800">
                  <p className="px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">
                    Quick Actions
                  </p>
                  <div className="space-y-1">
                    {quickActions.map((action) => (
                      <Link
                        key={action.path}
                        href={action.path}
                        className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white transition-colors"
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

