'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import WatchlistPriceChart from '@/components/WatchlistPriceChart';
import ConfirmationModal from '@/components/ConfirmationModal';

interface WatchlistItem {
  symbol: string;
  name: string;
  category?: string;
  price: number;
  change: number;
  changePercent: number;
  added_at?: string;
}

interface SearchResult {
  symbol: string;
  name: string;
  market: string;
  type: string;
  exchange: string;
  currency: string;
  category?: string;
}

export default function WatchlistPage() {
  const router = useRouter();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(7);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'category'>('name');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | undefined>(undefined);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  // Normalize categories to standard format
  const normalizeCategory = (cat: string | undefined): string => {
    if (!cat) return 'Unknown';
    const lower = cat.toLowerCase();
    const categoryMap: { [key: string]: string } = {
      'equity': 'Equity',
      'equities': 'Equity',
      'stock': 'Equity',
      'stocks': 'Equity',
      'etf': 'ETF',
      'exchange traded fund': 'ETF',
      'forex': 'Forex',
      'fx': 'Forex',
      'currency': 'Forex',
      'mutual fund': 'MutualFund',
      'mutualfund': 'MutualFund',
      'fund': 'MutualFund',
      'international stock': 'InternationalStock',
      'internationalstock': 'InternationalStock',
      'intl stock': 'InternationalStock',
      'bond': 'Bond',
      'bonds': 'Bond',
      'treasury': 'Bond',
      'index': 'Index',
      'indices': 'Index',
      'crypto': 'Crypto',
      'cryptocurrency': 'Crypto',
      'cryptocurrencies': 'Crypto',
      'commodity': 'Commodity',
      'commodities': 'Commodity',
      'prediction': 'Predictions',
      'predictions': 'Predictions',
      'unknown': 'Unknown',
    };
    return categoryMap[lower] || cat;
  };
  
  // Get unique categories from watchlist items (normalized)
  const categories = Array.from(new Set(
    watchlist.map(item => normalizeCategory(item.category || 'Unknown')).filter(Boolean)
  )).sort();
  
  // Filter watchlist by category
  const filteredWatchlistByCategory = selectedCategory === 'all' 
    ? watchlist 
    : watchlist.filter(item => normalizeCategory(item.category || 'Unknown') === selectedCategory);

  useEffect(() => {
    fetchWatchlist();
    // Check for dark mode
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };
    checkDarkMode();
    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  // Fetch search results when typing
  useEffect(() => {
    if (searchQuery.length >= 1) {
      const debounceTimer = setTimeout(() => {
        fetchSearchResults(searchQuery);
      }, 300);
      return () => clearTimeout(debounceTimer);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchQuery]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSearchResults = async (query: string) => {
    setSearchLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        `http://localhost:3001/api/search/autocomplete?query=${encodeURIComponent(query)}`,
        { headers }
      );
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('Authentication required for search');
          setSearchResults([]);
          return;
        }
        throw new Error(`Search failed: ${response.status}`);
      }
      
      const data = await response.json();
      // Get current watchlist symbols to filter results
      const watchlistSymbols = new Set(watchlist.map(item => item.symbol));
      const filtered = (data.results || []).filter((result: SearchResult) => 
        !watchlistSymbols.has(result.symbol)
      );
      setSearchResults(filtered);
      setShowSearchResults(filtered.length > 0);
    } catch (error) {
      console.error('Error fetching search results:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddToWatchlist = async (result: SearchResult, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to add assets to your watchlist');
        return;
      }

      const response = await fetch('http://localhost:3001/api/watchlist', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbol: result.symbol }),
      });

      if (response.ok) {
        // Dispatch event to refresh watchlist cards
        window.dispatchEvent(new Event('watchlist-changed'));
        // Refresh watchlist
        await fetchWatchlist();
        // Remove from search results
        setSearchResults(searchResults.filter(r => r.symbol !== result.symbol));
        if (searchResults.length === 1) {
          setShowSearchResults(false);
        }
      }
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      alert('Failed to add to watchlist. Please try again.');
    }
  };

  const handleAddToPortfolio = async (result: SearchResult, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to add assets to your portfolio');
        return;
      }

      const response = await fetch('http://localhost:3001/api/portfolio', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: result.symbol,
          sharesOwned: 0,
          avgSharePrice: 0,
        }),
      });

      if (response.ok) {
        // Dispatch event to refresh portfolio cards
        window.dispatchEvent(new Event('portfolio-changed'));
        // Remove from search results
        setSearchResults(searchResults.filter(r => r.symbol !== result.symbol));
        if (searchResults.length === 1) {
          setShowSearchResults(false);
        }
        // Navigate to portfolio page
        router.push('/portfolio');
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to add to portfolio. Please try again.');
      }
    } catch (error) {
      console.error('Error adding to portfolio:', error);
      alert('Failed to add to portfolio. Please try again.');
    }
  };

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
        setWatchlist(items);
        // Set default selected symbol to first item if none selected
        if (items.length > 0 && !selectedSymbol) {
          setSelectedSymbol(items[0].symbol);
        }
      }
    } catch (error) {
      console.error('Error fetching watchlist:', error);
    } finally {
      setLoading(false);
    }
  };

  // Set default selected symbol to first item when watchlist loads
  useEffect(() => {
    if (watchlist.length > 0 && !selectedSymbol) {
      setSelectedSymbol(watchlist[0].symbol);
    }
  }, [watchlist, selectedSymbol]);

  const handleRemoveFromWatchlist = async (symbol: string) => {
    setDeleteTarget(symbol);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`http://localhost:3001/api/watchlist/${deleteTarget}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Remove from local state
        setWatchlist(watchlist.filter(item => item.symbol !== deleteTarget));
        // Remove from selected items if it was selected
        const newSelected = new Set(selectedItems);
        newSelected.delete(deleteTarget);
        setSelectedItems(newSelected);
        // Clear selected symbol if it was removed
        if (selectedSymbol === deleteTarget) {
          setSelectedSymbol(undefined);
        }
        // Dispatch event to refresh watchlist cards
        window.dispatchEvent(new Event('watchlist-changed'));
      }
    } catch (error) {
      console.error('Error removing from watchlist:', error);
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleBulkDelete = () => {
    if (selectedItems.size === 0) return;
    setShowBulkDeleteModal(true);
  };

  const confirmBulkDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const deletePromises = Array.from(selectedItems).map(symbol =>
        fetch(`http://localhost:3001/api/watchlist/${symbol}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
      );

      const results = await Promise.all(deletePromises);
      const successful = results.filter(r => r.ok);

      if (successful.length > 0) {
        // Remove from local state
        setWatchlist(watchlist.filter(item => !selectedItems.has(item.symbol)));
        // Clear selected symbol if it was removed
        if (selectedSymbol && selectedItems.has(selectedSymbol)) {
          setSelectedSymbol(undefined);
        }
        // Clear selection
        setSelectedItems(new Set());
        // Dispatch event to refresh watchlist cards
        window.dispatchEvent(new Event('watchlist-changed'));
      }
    } catch (error) {
      console.error('Error removing items from watchlist:', error);
    }
  };

  // Filter watchlist based on search query and category
  let filteredWatchlist = filteredWatchlistByCategory.filter(item =>
    item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort watchlist
  filteredWatchlist = [...filteredWatchlist].sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else if (sortBy === 'category') {
      const catA = normalizeCategory(a.category);
      const catB = normalizeCategory(b.category);
      if (catA === catB) {
        return a.name.localeCompare(b.name); // Secondary sort by name
      }
      return catA.localeCompare(catB);
    }
    return 0;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredWatchlist.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredWatchlist.slice(startIndex, endIndex);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);


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
    <ProtectedRoute>
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

        {/* Category Filter and Search Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filter by Category:
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-600 rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-6 relative" ref={searchRef}>
          <input
            type="text"
            placeholder="Search assets to add to watchlist..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.length > 0) {
                setShowSearchResults(true);
              }
            }}
            onFocus={() => {
              if (searchResults.length > 0) {
                setShowSearchResults(true);
              }
            }}
            className="w-full md:w-96 px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute z-50 w-full md:w-96 mt-1 bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg shadow-lg max-h-96 overflow-y-auto">
              {searchLoading ? (
                <div className="p-4 text-center text-gray-600 dark:text-gray-400">
                  Searching...
                </div>
              ) : (
                <div className="py-2">
                  {searchResults.map((result) => (
                    <div
                      key={result.symbol}
                      className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-zinc-700 flex items-center justify-between cursor-pointer group"
                      onClick={() => router.push(`/asset/${result.symbol}`)}
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {result.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {result.symbol} • {result.exchange} • {result.type}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {/* Watchlist Icon */}
                        <button
                          onClick={(e) => handleAddToWatchlist(result, e)}
                          className="p-1.5 rounded-full bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-blue-600 hover:text-white transition-all"
                          title="Add to watchlist"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                        {/* Portfolio Icon */}
                        <button
                          onClick={(e) => handleAddToPortfolio(result, e)}
                          disabled={result.category?.toLowerCase() === 'index' || result.market?.toLowerCase() === 'indices' || result.type?.toLowerCase() === 'index'}
                          className={`p-1.5 rounded-full transition-all ${
                            result.category?.toLowerCase() === 'index' || result.market?.toLowerCase() === 'indices' || result.type?.toLowerCase() === 'index'
                              ? 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50'
                              : 'bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-green-600 hover:text-white'
                          }`}
                          title={result.category?.toLowerCase() === 'index' || result.market?.toLowerCase() === 'indices' || result.type?.toLowerCase() === 'index' ? 'Indices cannot be added to portfolio' : 'Add to portfolio'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Price Performance Chart - Full Width Above Table */}
        <div className="mb-6">
          <WatchlistPriceChart 
            selectedSymbol={selectedSymbol} 
            isDarkMode={isDarkMode}
            watchlistItems={watchlist}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        </div>

        {/* Sort and Filter Controls */}
        <div className="mb-4 flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Sort by:
          </label>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as 'name' | 'category');
              setCurrentPage(1); // Reset to first page when sorting changes
            }}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-600 rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">Company Name</option>
            <option value="category">Category</option>
          </select>
        </div>

        {/* Watchlist Table */}
        <div className="mb-6">
          <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-6">
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
                        <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300 w-12">
                          <input
                            type="checkbox"
                            checked={selectedItems.size === currentItems.length && currentItems.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedItems(new Set(currentItems.map(item => item.symbol)));
                              } else {
                                setSelectedItems(new Set());
                              }
                            }}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                          />
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Company
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Category
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
                      {currentItems.map((item) => {
                        const isSelected = selectedItems.has(item.symbol);
                        return (
                          <tr
                            key={item.symbol}
                            className={`border-b border-gray-200 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer ${
                              selectedSymbol === item.symbol || isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                            onClick={() => setSelectedSymbol(item.symbol)}
                          >
                            <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  const newSelected = new Set(selectedItems);
                                  if (e.target.checked) {
                                    newSelected.add(item.symbol);
                                  } else {
                                    newSelected.delete(item.symbol);
                                  }
                                  setSelectedItems(newSelected);
                                }}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                              />
                            </td>
                            <td className="py-4 px-4">
                              <Link
                                href={`/asset/${item.symbol}`}
                                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {item.name || item.symbol}
                              </Link>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {item.symbol}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                {item.category || 'Unknown'}
                              </span>
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveFromWatchlist(item.symbol);
                                }}
                                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                                title="Remove from watchlist"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
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
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-zinc-600 rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-700 hover:shadow-md hover:border-gray-300 dark:hover:border-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
                    >
                      Previous
                    </button>
                    
                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-300 tracking-tight ${
                            currentPage === page
                              ? 'bg-blue-600 dark:bg-blue-700 text-white hover:shadow-xl hover:shadow-blue-500/30'
                              : 'text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-700 hover:shadow-md hover:border-gray-300 dark:hover:border-zinc-600'
                          } active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-zinc-900`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-700 hover:shadow-md hover:border-gray-300 dark:hover:border-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
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

        {/* Confirmation Modals */}
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setDeleteTarget(null);
          }}
          onConfirm={confirmDelete}
          title="Remove from Watchlist"
          message={`Are you sure you want to remove ${deleteTarget} from your watchlist?`}
          confirmText="Remove"
          cancelText="Cancel"
          confirmButtonColor="red"
        />

        <ConfirmationModal
          isOpen={showBulkDeleteModal}
          onClose={() => setShowBulkDeleteModal(false)}
          onConfirm={confirmBulkDelete}
          title="Remove Multiple Items"
          message={`Are you sure you want to remove ${selectedItems.size} item${selectedItems.size === 1 ? '' : 's'} from your watchlist? This action cannot be undone.`}
          confirmText="Remove All"
          cancelText="Cancel"
          confirmButtonColor="red"
        />
      </div>
      </div>
    </ProtectedRoute>
  );
}

