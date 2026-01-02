'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        
        // Check if user is banned/restricted - redirect to restricted page
        if (user.is_banned || user.is_restricted) {
          router.replace('/restricted');
          return;
        }
        
        // Redirect admins to admin panel, regular users to dashboard
        if (user.is_admin || user.is_superuser) {
          router.replace('/admin');
        } else {
          router.replace('/dashboard');
        }
        return;
      } catch (error) {
        // If parsing fails, continue to show landing page
        console.error('Error parsing user data:', error);
      }
    }
    
    // User is not logged in, show landing page
    setLoading(false);
  }, [router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Hero Section */}
      <section className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Welcome to StockPro
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
            Your comprehensive stock trading platform. Track markets, analyze trends, and make informed decisions.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-100 dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 dark:bg-zinc-800 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Real-Time Data
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Get up-to-date stock information and market data.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-zinc-800 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Advanced Analytics
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Analyze trends and patterns with powerful tools.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-zinc-800 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Portfolio Tracking
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Monitor your investments and track performance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            About
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto text-center">
            StockPro is designed to help both beginners and experienced traders make better investment decisions.
            Our platform provides comprehensive market data, analysis tools, and insights to keep you ahead of the market.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-600">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of traders using StockPro today.
          </p>
        </div>
      </section>
    </div>
  );
}
