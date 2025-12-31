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

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/register'];

  useEffect(() => {
    if (!requireAuth) {
      setIsAuthenticated(true);
      return;
    }

    // Check if current route is public
    if (publicRoutes.includes(pathname)) {
      setIsAuthenticated(true);
      return;
    }

    // Check authentication
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const adminToken = localStorage.getItem('adminToken');
      const isAuth = !!(token || adminToken);
      setIsAuthenticated(isAuth);

      // If not authenticated and trying to access protected route, redirect to login
      if (!isAuth && !publicRoutes.includes(pathname)) {
        router.push('/login');
      }
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

  // Show loading state while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  // If not authenticated and trying to access protected route, don't render children
  // (redirect will happen in useEffect)
  if (!isAuthenticated && requireAuth && !publicRoutes.includes(pathname)) {
    return null;
  }

  return <>{children}</>;
}

