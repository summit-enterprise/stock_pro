'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RestrictedPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      if (!token || !userStr) {
        router.push('/login');
        return;
      }

      try {
        const parsedUser = JSON.parse(userStr);
        setUser(parsedUser);

        // Verify user status with backend
        const response = await fetch('http://localhost:3001/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setUser(data.user);
            // Update localStorage with fresh user data to ensure status is current
            localStorage.setItem('user', JSON.stringify(data.user));
            // If user is no longer banned/restricted, redirect to dashboard
            if (!data.user.is_banned && !data.user.is_restricted) {
              router.push('/dashboard');
            }
          }
        } else if (response.status === 403) {
          // User is banned/restricted - stay on this page
          const errorData = await response.json();
          console.log('Account restricted:', errorData);
        } else {
          // Other error - redirect to login
          router.push('/login');
        }
      } catch (error) {
        console.error('Error checking user status:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
            <svg
              className="h-8 w-8 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Account Restricted
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your account has been {user?.is_banned ? 'banned' : 'restricted'} and is currently inaccessible.
          </p>
          {user?.ban_reason && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-yellow-800 dark:text-yellow-200 text-sm">
              <strong>Reason:</strong> {user.ban_reason}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            If you believe this is an error, please contact our support team to file a request.
          </p>
          
          <Link
            href="/support"
            className="inline-block w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
          >
            Contact Support
          </Link>

          <button
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              router.push('/login');
            }}
            className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium rounded-md transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

