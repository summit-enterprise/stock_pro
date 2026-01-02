'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export default function WatchlistSection() {
  const router = useRouter();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWatchlist();
    
    // Listen for watchlist changes
    const handleWatchlistChange = () => {
      fetchWatchlist();
    };
    
    window.addEventListener('watchlist-changed', handleWatchlistChange);
    return () => {
      window.removeEventListener('watchlist-changed', handleWatchlistChange);
    };
  }, []);

  const fetchWatchlist = async () => {
    // Check if user is banned/restricted before fetching
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        if (parsedUser.is_banned || parsedUser.is_restricted) {
          setLoading(false);
          return; // Don't fetch data for banned/restricted users
        }
      } catch (e) {
        // Continue if parsing fails
      }
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch('http://localhost:3001/api/watchlist', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 403) {
        // User is banned/restricted, don't process response
        setLoading(false);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setWatchlist(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching watchlist:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-32 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-zinc-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (watchlist.length === 0) {
    return (
      <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>⭐</span> Watchlist
          </h2>
          <Link
            href="/watchlist"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View All →
          </Link>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-center py-8">
          No items in watchlist. Add assets to track them here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <span>⭐</span> Watchlist
        </h2>
        <Link
          href="/watchlist"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          View All →
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {watchlist.slice(0, 5).map((item) => (
          <div
            key={item.symbol}
            onClick={() => router.push(`/asset/${item.symbol}`)}
            className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow border border-gray-200 dark:border-zinc-700 flex flex-col"
          >
            <div className="font-semibold text-gray-900 dark:text-white mb-1 truncate">
              {item.symbol}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2 min-h-[2.5rem]">
              {item.name}
            </div>
            <div className="text-sm font-bold text-gray-900 dark:text-white mb-1 truncate" title={item.price ? `$${item.price.toFixed(2)}` : 'N/A'}>
              ${item.price ? (item.price > 1000 ? item.price.toFixed(0) : item.price.toFixed(2)) : 'N/A'}
            </div>
            <div
              className={`text-sm font-medium ${
                (item.change ?? 0) >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {(item.change ?? 0) >= 0 ? '+' : ''}
              {item.changePercent ? item.changePercent.toFixed(2) : '0.00'}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

