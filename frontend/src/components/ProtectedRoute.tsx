'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export default function ProtectedRoute({ children, requireAuth = true }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isCheckingRestriction, setIsCheckingRestriction] = useState(true);

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/register'];
  const allowedRoutes = ['/support', '/restricted', '/account'];

  useEffect(() => {
    if (!requireAuth) {
      setIsAuthenticated(true);
      setIsCheckingRestriction(false);
      return;
    }

    // Check if current route is public
    if (publicRoutes.includes(pathname)) {
      setIsAuthenticated(true);
      setIsCheckingRestriction(false);
      return;
    }

    // Synchronously check localStorage first to prevent flash
    const token = localStorage.getItem('token');
    const adminToken = localStorage.getItem('adminToken');
    const userStr = localStorage.getItem('user');

    // If no token, redirect immediately
    if (!token && !adminToken) {
      setIsAuthenticated(false);
      setIsCheckingRestriction(false);
      router.push('/login');
      return;
    }

    // Check if user is banned/restricted from localStorage (synchronous check)
    if (token && !adminToken && userStr) {
      try {
        const user = JSON.parse(userStr);
        // If user is banned or restricted and not on allowed route, redirect immediately
        if ((user.is_banned || user.is_restricted) && !allowedRoutes.includes(pathname)) {
          setIsAuthenticated(false);
          setIsCheckingRestriction(false);
          router.replace('/restricted'); // Use replace to prevent back button issues
          return;
        }
      } catch (e) {
        // Continue if parsing fails
      }
    }

    // Set authenticated to true for now (will verify with backend)
    setIsAuthenticated(true);

    // Check authentication and verify with backend
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const adminToken = localStorage.getItem('adminToken');

      // If not authenticated and trying to access protected route, redirect to login
      if (!token && !adminToken && !publicRoutes.includes(pathname)) {
        setIsAuthenticated(false);
        setIsCheckingRestriction(false);
        router.push('/login');
        return;
      }

      // Check if user is banned/restricted (only for regular users, not admins)
      if (token && !adminToken && !publicRoutes.includes(pathname)) {
        try {
          // Verify with backend
          const response = await fetch('http://localhost:3001/api/user/profile', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.status === 403) {
            // User is banned/restricted
            if (!allowedRoutes.includes(pathname)) {
              setIsAuthenticated(false);
              setIsCheckingRestriction(false);
              router.replace('/restricted');
              return;
            }
          } else if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
              // Update user in localStorage
              localStorage.setItem('user', JSON.stringify(data.user));
              // If user is banned/restricted, redirect to restricted page
              if ((data.user.is_banned || data.user.is_restricted) && !allowedRoutes.includes(pathname)) {
                setIsAuthenticated(false);
                setIsCheckingRestriction(false);
                router.replace('/restricted');
                return;
              }
            }
          }
        } catch (error) {
          console.error('Error checking user status:', error);
          // Continue with normal flow on error
        }
      }

      setIsCheckingRestriction(false);
    };

    checkAuth();

    // Listen for auth changes
    const handleAuthChange = () => checkAuth();
    window.addEventListener('auth-change', handleAuthChange);
    window.addEventListener('storage', checkAuth);

    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
      window.removeEventListener('storage', checkAuth);
    };
  }, [pathname, requireAuth, router]);

  // Show loading state while checking auth and restrictions
  if (isAuthenticated === null || isCheckingRestriction) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  // If not authenticated and trying to access protected route, don't render children
  // (redirect will happen in useEffect)
  if (!isAuthenticated && requireAuth && !publicRoutes.includes(pathname)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="text-gray-500 dark:text-gray-400">Redirecting...</div>
      </div>
    );
  }

  return <>{children}</>;
}


