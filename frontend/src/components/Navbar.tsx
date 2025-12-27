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

  useEffect(() => {
    // Check if user is logged in (regular user or admin)
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const adminToken = localStorage.getItem('admin_token');
      setIsAuthenticated(!!token || !!adminToken);
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

  const handleHomeNavigation = () => {
    const adminToken = localStorage.getItem('admin_token');
    const adminUser = localStorage.getItem('admin_user');
    const regularUser = localStorage.getItem('user');
    
    // Check if user is admin/superuser
    if (adminToken && adminUser) {
      router.push('/admin/home');
    } else if (regularUser) {
      try {
        const user = JSON.parse(regularUser);
        if (user.is_admin || user.is_superuser) {
          router.push('/admin/home');
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
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
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
              {isAuthenticated ? (
                <>
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

