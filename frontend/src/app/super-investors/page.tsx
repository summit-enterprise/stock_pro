'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function SuperInvestorsPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white dark:bg-black pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              💎 Super Investors
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Track the investment strategies and holdings of top institutional investors, 
              hedge funds, and investment managers
            </p>
          </div>

          {/* Coming Soon Section */}
          <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="text-6xl mb-4">💎</div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Coming Soon
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                This section will display holdings, trades, and investment strategies of 
                top institutional investors, hedge funds, and investment managers based on 
                13F filings and other regulatory disclosures.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}



