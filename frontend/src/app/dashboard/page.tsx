'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SearchBar from '@/components/SearchBar';
import MarketTiles from '@/components/MarketTiles';
import WatchlistSection from '@/components/WatchlistSection';
import MarketMovers from '@/components/MarketMovers';
import PortfolioSummary from '@/components/PortfolioSummary';
import MarketNews from '@/components/MarketNews';

interface User {
  id: number;
  email: string;
  name: string | null;
  auth_type: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      // Not logged in, redirect to home
      router.push('/');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black pt-16">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black pt-16">
      {/* Main Content */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome back{user.name ? `, ${user.name}` : ''}!
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Track markets, analyze trends, and make informed decisions.
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-12">
            <SearchBar />
          </div>

          {/* Market Tiles */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Market Overview
            </h2>
            <MarketTiles />
          </div>

          {/* Watchlist and Portfolio Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <WatchlistSection />
            <PortfolioSummary />
          </div>

          {/* Market Movers */}
          <div className="mb-6">
            <MarketMovers />
          </div>

          {/* Market News */}
          <div className="mb-6">
            <MarketNews />
          </div>
        </div>
      </div>
    </div>
  );
}

