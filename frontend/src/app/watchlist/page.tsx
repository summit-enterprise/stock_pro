'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface WatchlistItem {
  symbol: string;
  name: string;
  category?: string;
  price: number;
  change: number;
  changePercent: number;
  added_at?: string;
  shortTermRating?: {
    signal: string;
    strength: number;
  };
  longTermRating?: {
    signal: string;
    strength: number;
  };
}

export default function WatchlistPage() {
  const router = useRouter();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const fetchWatchlist = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch('http://localhost:3001/api/watchlist', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const items = data.items || [];
        
        // Fetch ratings for each item (only for equities)
        const itemsWithRatings = await Promise.all(
          items.map(async (item: WatchlistItem) => {
            // Only fetch ratings for equities
            if (item.category?.toLowerCase() !== 'equities') {
              return item;
            }

            try {
              const ratingsResponse = await fetch(
                `http://localhost:3001/api/ratings/${item.symbol}`,
                {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                  },
                }
              );
              
              if (ratingsResponse.ok) {
                const ratingsData = await ratingsResponse.json();
                // Only add ratings if they exist
                if (ratingsData.shortTerm || ratingsData.longTerm) {
                  return {
                    ...item,
                    shortTermRating: ratingsData.shortTerm,
                    longTermRating: ratingsData.longTerm,
                  };
                }
              }
            } catch (error) {
              console.error(`Error fetching ratings for ${item.symbol}:`, error);
            }
            return item;
          })
        );
        
        setWatchlist(itemsWithRatings);
      }
    } catch (error) {
      console.error('Error fetching watchlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromWatchlist = async (symbol: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`http://localhost:3001/api/watchlist/${symbol}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Remove from local state
        setWatchlist(watchlist.filter(item => item.symbol !== symbol));
      }
    } catch (error) {
      console.error('Error removing from watchlist:', error);
    }
  };

  // Filter watchlist based on search query
  const filteredWatchlist = watchlist.filter(item =>
    item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredWatchlist.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredWatchlist.slice(startIndex, endIndex);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  const getRatingColor = (signal: string) => {
    switch (signal) {
      case 'Strong Buy':
        return 'text-green-600 dark:text-green-400';
      case 'Buy':
        return 'text-green-500 dark:text-green-500';
      case 'Hold':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'Sell':
        return 'text-red-500 dark:text-red-500';
      case 'Strong Sell':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getRatingIcon = (signal: string) => {
    switch (signal) {
      case 'Strong Buy':
        return '🟢';
      case 'Buy':
        return '🟢';
      case 'Hold':
        return '🟡';
      case 'Sell':
        return '🔴';
      case 'Strong Sell':
        return '🔴';
      default:
        return '⚪';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-zinc-800 rounded w-48 mb-6"></div>
            <div className="h-96 bg-gray-200 dark:bg-zinc-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            My Watchlist
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your favorite assets and monitor their performance
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by symbol or company name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-96 px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Watchlist Table */}
        <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-6 mb-6">
          {filteredWatchlist.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchQuery ? 'No assets found matching your search.' : 'Your watchlist is empty.'}
              </p>
              <Link
                href="/dashboard"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Browse assets to add to your watchlist
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-300 dark:border-zinc-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Company
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Ratings
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Price
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Change
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Change %
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((item) => (
                      <tr
                        key={item.symbol}
                        className="border-b border-gray-200 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <Link
                            href={`/asset/${item.symbol}`}
                            className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {item.name || item.symbol}
                          </Link>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {item.symbol}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            {/* Short-term rating */}
                            {item.shortTermRating && (
                              <div className="flex items-center gap-1" title={`Short-term: ${item.shortTermRating.signal}`}>
                                <span className="text-lg">{getRatingIcon(item.shortTermRating.signal)}</span>
                                <span className={`text-xs font-medium ${getRatingColor(item.shortTermRating.signal)}`}>
                                  ST
                                </span>
                              </div>
                            )}
                            {/* Long-term rating */}
                            {item.longTermRating && (
                              <div className="flex items-center gap-1" title={`Long-term: ${item.longTermRating.signal}`}>
                                <span className="text-lg">{getRatingIcon(item.longTermRating.signal)}</span>
                                <span className={`text-xs font-medium ${getRatingColor(item.longTermRating.signal)}`}>
                                  LT
                                </span>
                              </div>
                            )}
                            {!item.shortTermRating && !item.longTermRating && (
                              <span className="text-xs text-gray-500 dark:text-gray-500">N/A</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right font-semibold text-gray-900 dark:text-white">
                          ${item.price.toFixed(2)}
                        </td>
                        <td className={`py-4 px-4 text-right font-medium ${
                          item.change >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}
                        </td>
                        <td className={`py-4 px-4 text-right font-medium ${
                          item.changePercent >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => handleRemoveFromWatchlist(item.symbol)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                            title="Remove from watchlist"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination and Items Per Page */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-zinc-700">
                {/* Items Per Page Selector */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 dark:text-gray-400">
                    Show:
                  </label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={75}>75</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    of {filteredWatchlist.length} assets
                  </span>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded-md hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    
                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-700'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded-md hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

