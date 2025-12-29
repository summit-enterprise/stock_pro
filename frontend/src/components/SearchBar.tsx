'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  symbol: string;
  name: string;
  market: string;
  type: string;
  exchange: string;
  currency: string;
}

interface RecentSearch {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
  timestamp: number;
}

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [autocompleteResults, setAutocompleteResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
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
      const response = await fetch(
        `http://localhost:3001/api/search/autocomplete?query=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();
      setAutocompleteResults(data.results || []);
    } catch (error) {
      console.error('Error fetching autocomplete:', error);
      setAutocompleteResults([]);
    } finally {
      setLoading(false);
    }
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
                {recentSearches.map((search, index) => (
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
                          {getExchangeLabel(search.exchange)}:{search.symbol}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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
                ))}
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
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 dark:bg-zinc-700 flex items-center justify-center text-sm">
                      {getAssetIcon(result.type, result.symbol)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">{result.name}</div>
                      <div className="text-sm text-gray-400">
                        {getExchangeLabel(result.exchange)}:{result.symbol}
                      </div>
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

