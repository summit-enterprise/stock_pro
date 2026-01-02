'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import LoginModal from './LoginModal';
import RegisterModal from './RegisterModal';
import EmailLoginHandler from './EmailLoginHandler';
import { normalizeAvatarUrl } from '@/utils/imageUtils';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    // Check if user is logged in (regular user or admin)
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const adminToken = localStorage.getItem('adminToken'); // Fixed: was 'admin_token'
      const userStr = localStorage.getItem('user');
      
      setIsAuthenticated(!!token || !!adminToken);
      
      // Load user data if available
      if (userStr) {
        try {
          const parsedUser = JSON.parse(userStr);
          setUser(parsedUser);
          
          // Fetch latest profile to get updated avatar_url
          if (token) {
            try {
              const response = await fetch('http://localhost:3001/api/user/profile', {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });
              
              if (response.ok) {
                const data = await response.json();
                if (data.success && data.user) {
                  // Update user with latest data, especially avatar_url
                  setUser(data.user);
                  // Update localStorage
                  localStorage.setItem('user', JSON.stringify(data.user));
                }
              }
            } catch (error) {
              // Silently fail - use cached user data
              console.debug('Failed to fetch profile in navbar:', error);
            }
          }
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

  // Ensure dark mode is always enabled
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

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
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 dark:bg-zinc-900/80 dark:border-zinc-800 font-sans" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif" }}>
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 w-full">
            {/* Logo - Far Left */}
            <div className="flex items-center flex-shrink-0">
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

            {/* Desktop Menu - Far Right */}
            <div className="hidden md:flex items-center gap-3 flex-shrink-0">
              {isAuthenticated ? (
                <>
                  {user && (
                    <div className="flex items-center gap-2 px-2">
                      <Link
                        href="/account"
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                      >
                        {user.avatar_url && !avatarError ? (
                          <Image
                            src={normalizeAvatarUrl(user.avatar_url) || ''}
                            alt="Avatar"
                            width={32}
                            height={32}
                            className="rounded-full object-cover border border-gray-300 dark:border-zinc-700 cursor-pointer"
                            onError={() => setAvatarError(true)}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-zinc-700 flex items-center justify-center cursor-pointer">
                            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        )}
                      </Link>
                      {(user.is_superuser || user.is_admin) && (
                        <span className="flex items-center gap-1">
                          <span 
                            className={`w-2 h-2 rounded-full ${
                              user.is_superuser 
                                ? 'bg-purple-600 dark:bg-purple-400' 
                                : 'bg-blue-600 dark:bg-blue-400'
                            }`}
                            title={user.is_superuser ? 'Superuser' : 'Admin'}
                          ></span>
                          <span className={`text-xs ${
                            user.is_superuser 
                              ? 'text-purple-600 dark:text-purple-400' 
                              : 'text-blue-600 dark:text-blue-400'
                          }`}>
                            {user.is_superuser ? 'Superuser' : 'Admin'}
                          </span>
                        </span>
                      )}
                    </div>
                  )}
                  {(user?.is_admin || user?.is_superuser) && (
                    <button
                      onClick={() => router.push('/admin')}
                      className="group relative px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 rounded-xl overflow-hidden transition-all duration-300 whitespace-nowrap
                        bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700
                        hover:bg-gray-200 dark:hover:bg-zinc-700 hover:shadow-md hover:border-gray-300 dark:hover:border-zinc-600
                        active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
                    >
                      <span className="relative z-10">Admin</span>
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                        translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="group relative px-5 py-2.5 text-sm font-semibold text-white rounded-xl overflow-hidden transition-all duration-300 whitespace-nowrap
                      bg-red-600 dark:bg-red-700
                      hover:bg-red-700 dark:hover:bg-red-600 hover:shadow-xl hover:shadow-red-500/30
                      active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
                  >
                    <span className="relative z-10">Logout</span>
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                      translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowLogin(true)}
                    className="group relative px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 rounded-xl overflow-hidden transition-all duration-300 whitespace-nowrap
                      bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700
                      hover:bg-gray-200 dark:hover:bg-zinc-700 hover:shadow-md hover:border-gray-300 dark:hover:border-zinc-600
                      active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
                  >
                    <span className="relative z-10">Login</span>
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                      translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                  </button>
                  <button
                    onClick={() => setShowRegister(true)}
                    className="group relative px-5 py-2.5 text-sm font-semibold text-white rounded-xl overflow-hidden transition-all duration-300 whitespace-nowrap
                      bg-blue-600 dark:bg-blue-700
                      hover:bg-blue-700 dark:hover:bg-blue-600 hover:shadow-xl hover:shadow-blue-500/30
                      active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
                  >
                    <span className="relative z-10">Register</span>
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                      translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                  </button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="group relative p-2 rounded-lg text-gray-700 dark:text-gray-300 overflow-hidden transition-all duration-300
                  hover:bg-gray-100 dark:hover:bg-zinc-800 hover:scale-110
                  active:scale-95"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 dark:border-zinc-800 py-4">
              <div className="flex flex-col gap-3">
                {isAuthenticated ? (
                  <>
                    {user && (
                      <div className="px-4 py-2 flex items-center gap-2">
                        <Link
                          href="/account"
                          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {user.avatar_url ? (
                            <Image
                              src={normalizeAvatarUrl(user.avatar_url) || ''}
                              alt="Avatar"
                              width={32}
                              height={32}
                              className="rounded-full object-cover border border-gray-300 dark:border-zinc-700 cursor-pointer"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-zinc-700 flex items-center justify-center cursor-pointer">
                              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          )}
                        </Link>
                        {(user.is_superuser || user.is_admin) && (
                          <span className="flex items-center gap-1">
                            <span 
                              className={`w-2 h-2 rounded-full ${
                                user.is_superuser 
                                  ? 'bg-purple-600 dark:bg-purple-400' 
                                  : 'bg-blue-600 dark:bg-blue-400'
                              }`}
                              title={user.is_superuser ? 'Superuser' : 'Admin'}
                            ></span>
                            <span className={`text-xs ${
                              user.is_superuser 
                                ? 'text-purple-600 dark:text-purple-400' 
                                : 'text-blue-600 dark:text-blue-400'
                            }`}>
                              {user.is_superuser ? 'Superuser' : 'Admin'}
                            </span>
                          </span>
                        )}
                      </div>
                    )}
                    {(user?.is_admin || user?.is_superuser) && (
                      <button
                        onClick={() => {
                          router.push('/admin');
                          setIsMobileMenuOpen(false);
                        }}
                        className="group relative px-5 py-2.5 text-sm font-semibold text-left text-gray-700 dark:text-gray-200 rounded-xl overflow-hidden transition-all duration-300
                          bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700
                          hover:bg-gray-200 dark:hover:bg-zinc-700 hover:shadow-md hover:border-gray-300 dark:hover:border-zinc-600
                          active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
                      >
                        <span className="relative z-10">Admin</span>
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                          translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="group relative px-5 py-2.5 text-sm font-semibold text-left bg-red-600 dark:bg-red-700 text-white rounded-xl overflow-hidden transition-all duration-300
                        hover:bg-red-700 dark:hover:bg-red-600 hover:shadow-xl hover:shadow-red-500/30
                        active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
                    >
                      <span className="relative z-10">Logout</span>
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                        translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setShowLogin(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="group relative px-5 py-2.5 text-sm font-semibold text-left text-gray-700 dark:text-gray-200 rounded-xl overflow-hidden transition-all duration-300
                        bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700
                        hover:bg-gray-200 dark:hover:bg-zinc-700 hover:shadow-md hover:border-gray-300 dark:hover:border-zinc-600
                        active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
                    >
                      <span className="relative z-10">Login</span>
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                        translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                    </button>
                    <button
                      onClick={() => {
                        setShowRegister(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="group relative px-5 py-2.5 text-sm font-semibold text-left bg-blue-600 dark:bg-blue-700 text-white rounded-xl overflow-hidden transition-all duration-300
                        hover:bg-blue-700 dark:hover:bg-blue-600 hover:shadow-xl hover:shadow-blue-500/30
                        active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
                    >
                      <span className="relative z-10">Register</span>
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                        translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {!isAuthenticated && (
        <>
          <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
          <RegisterModal isOpen={showRegister} onClose={() => setShowRegister(false)} />
        </>
      )}
      
      {/* Auto-open login modal if email parameter is in URL */}
      {!isAuthenticated && typeof window !== 'undefined' && (
        <EmailLoginHandler 
          onOpenLogin={() => setShowLogin(true)} 
        />
      )}
    </>
  );
}

