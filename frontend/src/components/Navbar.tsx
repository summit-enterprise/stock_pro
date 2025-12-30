'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import LoginModal from './LoginModal';
import RegisterModal from './RegisterModal';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check if user is logged in (regular user or admin)
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const adminToken = localStorage.getItem('adminToken'); // Fixed: was 'admin_token'
      const userStr = localStorage.getItem('user');
      
      setIsAuthenticated(!!token || !!adminToken);
      
      // Load user data if available
      if (userStr) {
        try {
          setUser(JSON.parse(userStr));
        } catch (e) {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };

    checkAuth();

    // Listen for storage changes (when user logs in/out in another tab)
    window.addEventListener('storage', checkAuth);

    // Listen for custom auth event (when user logs in/out in same tab)
    const handleAuthChange = () => checkAuth();
    window.addEventListener('auth-change', handleAuthChange);

    // Check when window gains focus (in case auth changed)
    window.addEventListener('focus', checkAuth);

    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('auth-change', handleAuthChange);
      window.removeEventListener('focus', checkAuth);
    };
  }, [pathname]);

  // Initialize dark mode from localStorage or system preference
  useEffect(() => {
    const initializeTheme = () => {
      const storedTheme = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      // Determine initial theme
      const shouldBeDark = storedTheme === 'dark' || (!storedTheme && prefersDark);
      
      setIsDarkMode(shouldBeDark);
      
      // Update DOM immediately
      if (shouldBeDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    // Initialize immediately
    initializeTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // Only update if user hasn't set a preference
      if (!localStorage.getItem('theme')) {
        const shouldBeDark = e.matches;
        setIsDarkMode(shouldBeDark);
        if (shouldBeDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        // Dispatch event for other components
        window.dispatchEvent(new Event('theme-change'));
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    // Also listen for DOM changes to keep state in sync
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
      observer.disconnect();
    };
  }, []);

  const toggleDarkMode = () => {
    // Get current theme state from DOM (most reliable)
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    const newDarkMode = !isCurrentlyDark;
    
    // Update state
    setIsDarkMode(newDarkMode);
    
    // Update DOM immediately - this is the source of truth
    // Update both html and body to ensure theme is applied everywhere
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    
    // Force a reflow to ensure DOM updates are applied
    document.documentElement.offsetHeight;
    
    // Dispatch event for other components to react to theme change
    window.dispatchEvent(new Event('theme-change'));
    
    // Force multiple dispatches to ensure all components catch it
    setTimeout(() => {
      window.dispatchEvent(new Event('theme-change'));
    }, 10);
    setTimeout(() => {
      window.dispatchEvent(new Event('theme-change'));
    }, 100);
  };

  const handleHomeNavigation = () => {
    const adminToken = localStorage.getItem('adminToken');
    const regularUser = localStorage.getItem('user');
    
    // Check if user is admin/superuser
    if (adminToken && regularUser) {
      try {
        const user = JSON.parse(regularUser);
        if (user.is_admin || user.is_superuser) {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      } catch {
        router.push('/dashboard');
      }
    } else if (regularUser) {
      try {
        const user = JSON.parse(regularUser);
        if (user.is_admin || user.is_superuser) {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      } catch {
        router.push('/dashboard');
      }
    } else {
      router.push('/dashboard');
    }
  };

  const handleLogout = () => {
    // Clear both admin and regular user sessions completely
    localStorage.removeItem('adminToken');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    // Dispatch event to notify Navbar of auth change
    window.dispatchEvent(new Event('auth-change'));
    router.push('/');
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 dark:bg-zinc-900/80 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => {
                  if (isAuthenticated) {
                    handleHomeNavigation();
                  } else {
                    router.push('/');
                  }
                }}
                className="text-2xl font-bold text-gray-900 dark:text-white hover:opacity-80 transition-opacity cursor-pointer"
              >
                StockPro
              </button>
            </div>
            <div className="flex items-center gap-4">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? (
                  // Sun icon for light mode
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                ) : (
                  // Moon icon for dark mode
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                )}
              </button>

              {isAuthenticated ? (
                <>
                  {user && (
                    <span className="text-sm text-gray-600 dark:text-gray-400 px-2">
                      {user.email}
                      {user.is_superuser ? (
                        <span className="ml-1 text-purple-600 dark:text-purple-400">(Superuser)</span>
                      ) : user.is_admin ? (
                        <span className="ml-1 text-blue-600 dark:text-blue-400">(Admin)</span>
                      ) : (
                        <span className="ml-1 text-gray-500 dark:text-gray-500">(User)</span>
                      )}
                    </span>
                  )}
                  {(user?.is_admin || user?.is_superuser) && (
                    <button
                      onClick={() => router.push('/admin')}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      Admin
                    </button>
                  )}
                  <button
                    onClick={handleHomeNavigation}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    Home
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowLogin(true)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setShowRegister(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Register
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {!isAuthenticated && (
        <>
          <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
          <RegisterModal isOpen={showRegister} onClose={() => setShowRegister(false)} />
        </>
      )}
    </>
  );
}

