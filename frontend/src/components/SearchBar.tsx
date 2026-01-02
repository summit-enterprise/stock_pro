'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  symbol: string;
  name: string;
  ticker?: string;
  market: string;
  type: string;
  exchange: string;
  currency: string;
  category?: string;
}

interface RecentSearch {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
  timestamp: number;
}

interface RecentSearchStatus {
  [symbol: string]: {
    inWatchlist: boolean;
    inPortfolio: boolean;
  };
}

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [autocompleteResults, setAutocompleteResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [recentSearchStatus, setRecentSearchStatus] = useState<RecentSearchStatus>({});
  const [autocompleteStatus, setAutocompleteStatus] = useState<RecentSearchStatus>({});
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      try {
        const searches = JSON.parse(stored);
        setRecentSearches(searches.slice(0, 10)); // Keep only last 10
      } catch (err) {
        console.error('Error loading recent searches:', err);
      }
    }
  }, []);

  // Check watchlist/portfolio status for recent searches
  useEffect(() => {
    const checkRecentSearchStatus = async () => {
      if (recentSearches.length === 0) return;
      
      const token = localStorage.getItem('token');
      if (!token) return;

      const statusPromises = recentSearches.map(async (search) => {
        try {
          const [watchlistRes, portfolioRes] = await Promise.all([
            fetch(`http://localhost:3001/api/watchlist/check/${encodeURIComponent(search.symbol)}`, {
              headers: { 'Authorization': `Bearer ${token}` },
            }),
            fetch(`http://localhost:3001/api/portfolio/check/${encodeURIComponent(search.symbol)}`, {
              headers: { 'Authorization': `Bearer ${token}` },
            }),
          ]);

          const watchlistData = watchlistRes.ok ? await watchlistRes.json() : { inWatchlist: false };
          const portfolioData = portfolioRes.ok ? await portfolioRes.json() : { inPortfolio: false };

          return {
            symbol: search.symbol,
            status: {
              inWatchlist: watchlistData.inWatchlist || false,
              inPortfolio: portfolioData.inPortfolio || false,
            },
          };
        } catch (error) {
          return {
            symbol: search.symbol,
            status: { inWatchlist: false, inPortfolio: false },
          };
        }
      });

      const results = await Promise.all(statusPromises);
      const statusMap: RecentSearchStatus = {};
      results.forEach(({ symbol, status }) => {
        statusMap[symbol] = status;
      });
      setRecentSearchStatus(statusMap);
    };

    if (showRecent && recentSearches.length > 0) {
      checkRecentSearchStatus();
    }
  }, [showRecent, recentSearches]);

  // Fetch autocomplete results
  useEffect(() => {
    if (query.length >= 1) {
      const debounceTimer = setTimeout(() => {
        fetchAutocomplete(query);
      }, 300); // Debounce for 300ms

      return () => clearTimeout(debounceTimer);
    } else {
      setAutocompleteResults([]);
    }
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsFocused(false);
        setShowRecent(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAutocomplete = async (searchQuery: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        `http://localhost:3001/api/search/autocomplete?query=${encodeURIComponent(searchQuery)}`,
        { headers }
      );
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('Authentication required for search');
          setAutocompleteResults([]);
          return;
        }
        throw new Error(`Search failed: ${response.status}`);
      }
      
      const data = await response.json();
      setAutocompleteResults(data.results || []);
      
      // Check status for autocomplete results
      if (data.results && data.results.length > 0 && token) {
        checkAutocompleteStatus(data.results);
      }
    } catch (error) {
      console.error('Error fetching autocomplete:', error);
      setAutocompleteResults([]);
    } finally {
      setLoading(false);
    }
  };

  const checkAutocompleteStatus = async (results: SearchResult[]) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const statusPromises = results.map(async (result) => {
      try {
        const [watchlistRes, portfolioRes] = await Promise.all([
          fetch(`http://localhost:3001/api/watchlist/check/${encodeURIComponent(result.symbol)}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          }),
          fetch(`http://localhost:3001/api/portfolio/check/${encodeURIComponent(result.symbol)}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          }),
        ]);

        const watchlistData = watchlistRes.ok ? await watchlistRes.json() : { inWatchlist: false };
        const portfolioData = portfolioRes.ok ? await portfolioRes.json() : { inPortfolio: false };

        return {
          symbol: result.symbol,
          status: {
            inWatchlist: watchlistData.inWatchlist || false,
            inPortfolio: portfolioData.inPortfolio || false,
          },
        };
      } catch (error) {
        return {
          symbol: result.symbol,
          status: { inWatchlist: false, inPortfolio: false },
        };
      }
    });

    const statusResults = await Promise.all(statusPromises);
    const statusMap: RecentSearchStatus = {};
    statusResults.forEach(({ symbol, status }) => {
      statusMap[symbol] = status;
    });
    setAutocompleteStatus(statusMap);
  };

  const addToRecentSearches = (result: SearchResult) => {
    const newSearch: RecentSearch = {
      symbol: result.symbol,
      name: result.name,
      type: result.type,
      exchange: result.exchange,
      timestamp: Date.now(),
    };

    const updated = [
      newSearch,
      ...recentSearches.filter(s => s.symbol !== result.symbol)
    ].slice(0, 10); // Keep only last 10

    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const handleSelect = (result: SearchResult) => {
    addToRecentSearches(result);
    setQuery('');
    setIsFocused(false);
    setShowRecent(false);
    // Navigate to asset detail page
    router.push(`/asset/${result.symbol}`);
  };

  const handleAddToWatchlist = async (result: SearchResult | RecentSearch, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to add assets to your watchlist');
        return;
      }

      const symbol = result.symbol;
      const isInWatchlist = recentSearchStatus[symbol]?.inWatchlist || autocompleteStatus[symbol]?.inWatchlist || false;

      if (isInWatchlist) {
        // Remove from watchlist
        const response = await fetch(`http://localhost:3001/api/watchlist/${encodeURIComponent(symbol)}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          setRecentSearchStatus(prev => ({
            ...prev,
            [symbol]: { ...prev[symbol], inWatchlist: false },
          }));
          setAutocompleteStatus(prev => ({
            ...prev,
            [symbol]: { ...prev[symbol], inWatchlist: false },
          }));
          // Dispatch event to refresh watchlist cards
          window.dispatchEvent(new Event('watchlist-changed'));
        }
      } else {
        // Add to watchlist
        const response = await fetch('http://localhost:3001/api/watchlist', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ symbol }),
        });

        if (response.ok) {
          setRecentSearchStatus(prev => ({
            ...prev,
            [symbol]: { ...prev[symbol], inWatchlist: true },
          }));
          setAutocompleteStatus(prev => ({
            ...prev,
            [symbol]: { ...prev[symbol], inWatchlist: true },
          }));
          // Dispatch event to refresh watchlist cards
          window.dispatchEvent(new Event('watchlist-changed'));
        } else {
          const data = await response.json();
          alert(data.message || 'Failed to add to watchlist. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      alert('Failed to add to watchlist. Please try again.');
    }
  };

  const handleAddToPortfolio = async (result: SearchResult | RecentSearch, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to add assets to your portfolio');
        return;
      }

      const symbol = result.symbol;
      const isInPortfolio = recentSearchStatus[symbol]?.inPortfolio || autocompleteStatus[symbol]?.inPortfolio || false;

      if (isInPortfolio) {
        // Navigate to portfolio page if already in portfolio
        router.push('/portfolio');
      } else {
        // Add to portfolio
        const response = await fetch('http://localhost:3001/api/portfolio', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            symbol,
            sharesOwned: 0,
            avgSharePrice: 0,
          }),
        });

        if (response.ok) {
          setRecentSearchStatus(prev => ({
            ...prev,
            [symbol]: { ...prev[symbol], inPortfolio: true },
          }));
          setAutocompleteStatus(prev => ({
            ...prev,
            [symbol]: { ...prev[symbol], inPortfolio: true },
          }));
          // Dispatch event to refresh portfolio cards
          window.dispatchEvent(new Event('portfolio-changed'));
          // Navigate to portfolio page to edit
          router.push('/portfolio');
        } else {
          const data = await response.json();
          alert(data.message || 'Failed to add to portfolio. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error adding to portfolio:', error);
      alert('Failed to add to portfolio. Please try again.');
    }
  };

  const handleRecentSelect = (search: RecentSearch) => {
    const result: SearchResult = {
      symbol: search.symbol,
      name: search.name,
      market: search.exchange,
      type: search.type,
      exchange: search.exchange,
      currency: 'USD',
    };
    handleSelect(result);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const removeRecentSearch = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s.symbol !== symbol);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (query.length === 0 && recentSearches.length > 0) {
      setShowRecent(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setShowRecent(false);
  };

  const getAssetIcon = (type: string, symbol: string) => {
    // Simple icon based on type - can be enhanced with actual logos
    if (type === 'crypto' || symbol.includes('BTC') || symbol.includes('ETH')) {
      return '₿';
    }
    return '📈';
  };

  const getExchangeLabel = (exchange: string) => {
    if (!exchange) return '';
    const labels: { [key: string]: string } = {
      'XNAS': 'NasdaqGS',
      'XNYS': 'NYSE',
      'XTSX': 'TSX',
      'XNSE': 'NSE',
      'XTSE': 'TSE',
    };
    return labels[exchange] || exchange;
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-3xl mx-auto">
      <div className="relative">
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder="Search 50,000+ stocks, crypto, indices..."
          className="w-full pl-12 pr-4 py-4 bg-gray-800 dark:bg-zinc-800 border border-gray-700 dark:border-zinc-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {/* Dropdown */}
      {(isFocused && (showRecent || autocompleteResults.length > 0 || query.length > 0)) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 dark:bg-zinc-900 border border-gray-700 dark:border-zinc-700 rounded-xl shadow-2xl max-h-96 overflow-y-auto z-50">
          {/* Recent Searches */}
          {showRecent && recentSearches.length > 0 && (
            <div>
              <div className="flex justify-between items-center px-4 py-3 border-b border-gray-700 dark:border-zinc-700">
                <h3 className="text-sm font-semibold text-gray-300">Recent Searches</h3>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Clear All
                </button>
              </div>
              <div className="py-2">
                {recentSearches.map((search, index) => {
                  const status = recentSearchStatus[search.symbol] || { inWatchlist: false, inPortfolio: false };
                  return (
                    <div
                      key={`${search.symbol}-${index}`}
                      onClick={() => handleRecentSelect(search)}
                      className="flex items-center justify-between px-4 py-3 hover:bg-gray-700 dark:hover:bg-zinc-800 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 dark:bg-zinc-700 flex items-center justify-center text-sm">
                          {getAssetIcon(search.type, search.symbol)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium truncate">{search.name}</div>
                          <div className="text-sm text-gray-400">
                            {search.symbol.startsWith('X:') ? search.symbol.replace('X:', '').replace('USD', '') : search.symbol}
                            {search.exchange && ` • ${getExchangeLabel(search.exchange)}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Watchlist Icon */}
                          <button
                            onClick={(e) => handleAddToWatchlist(search, e)}
                            className={`p-1.5 rounded-full transition-all ${
                              status.inWatchlist
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 dark:bg-zinc-700 text-gray-300 hover:bg-blue-600 hover:text-white'
                            }`}
                            title={status.inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
                          >
                            {status.inWatchlist ? (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            )}
                          </button>
                          {/* Portfolio Icon */}
                          <button
                            onClick={(e) => handleAddToPortfolio(search, e)}
                            disabled={search.type?.toLowerCase() === 'index' || search.market?.toLowerCase() === 'indices'}
                            className={`p-1.5 rounded-full transition-all ${
                              search.type?.toLowerCase() === 'index' || search.market?.toLowerCase() === 'indices'
                                ? 'bg-gray-600 dark:bg-zinc-800 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50'
                                : status.inPortfolio
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-700 dark:bg-zinc-700 text-gray-300 hover:bg-green-600 hover:text-white'
                            }`}
                            title={search.type?.toLowerCase() === 'index' || search.market?.toLowerCase() === 'indices' ? 'Indices cannot be added to portfolio' : (status.inPortfolio ? 'View in portfolio' : 'Add to portfolio')}
                          >
                            {status.inPortfolio ? (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                                <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            )}
                          </button>
                        </div>
                        <button
                          onClick={(e) => removeRecentSearch(search.symbol, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-600 rounded transition-all"
                        >
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Autocomplete Results */}
          {!showRecent && query.length > 0 && (
            <div className="py-2">
              {autocompleteResults.length > 0 ? (
                autocompleteResults.map((result, index) => (
                  <div
                    key={`${result.symbol}-${index}`}
                    onClick={() => handleSelect(result)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700 dark:hover:bg-zinc-800 cursor-pointer transition-colors group"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 dark:bg-zinc-700 flex items-center justify-center text-sm">
                      {getAssetIcon(result.type, result.symbol)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">{result.name}</div>
                      <div className="text-sm text-gray-400">
                        {result.ticker || (result.symbol.startsWith('X:') ? result.symbol.replace('X:', '').replace('USD', '') : result.symbol)}
                        {result.exchange && ` • ${getExchangeLabel(result.exchange)}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Watchlist Icon */}
                      {(() => {
                        const status = autocompleteStatus[result.symbol] || { inWatchlist: false, inPortfolio: false };
                        return (
                          <button
                            onClick={(e) => handleAddToWatchlist(result, e)}
                            className={`p-1.5 rounded-full transition-all ${
                              status.inWatchlist
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 dark:bg-zinc-700 text-gray-300 hover:bg-blue-600 hover:text-white'
                            }`}
                            title={status.inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
                          >
                            {status.inWatchlist ? (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            )}
                          </button>
                        );
                      })()}
                      {/* Portfolio Icon */}
                      {(() => {
                        const status = autocompleteStatus[result.symbol] || { inWatchlist: false, inPortfolio: false };
                        const isIndex = result.category?.toLowerCase() === 'index' || result.market?.toLowerCase() === 'indices';
                        return (
                          <button
                            onClick={(e) => handleAddToPortfolio(result, e)}
                            disabled={isIndex}
                            className={`p-1.5 rounded-full transition-all ${
                              isIndex
                                ? 'bg-gray-600 dark:bg-zinc-800 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50'
                                : status.inPortfolio
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-700 dark:bg-zinc-700 text-gray-300 hover:bg-green-600 hover:text-white'
                            }`}
                            title={isIndex ? 'Indices cannot be added to portfolio' : (status.inPortfolio ? 'View in portfolio' : 'Add to portfolio')}
                          >
                            {status.inPortfolio ? (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                                <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            )}
                          </button>
                        );
                      })()}
                    </div>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-gray-400">
                  {loading ? 'Searching...' : 'No results found'}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

