'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PortfolioPerformanceChart from '@/components/PortfolioPerformanceChart';
import AssetIcon from '@/components/AssetIcon';

interface PortfolioItem {
  symbol: string;
  name: string;
  type?: string;
  exchange?: string;
  logoUrl?: string | null;
  sharesOwned: number;
  avgSharePrice: number;
  currentPrice: number;
  change: number;
  changePercent: number;
  totalMarketValue: number;
  totalCost: number;
  profitLoss: number;
  profitLossPercent: number;
  updatedAt?: string;
}

interface SearchResult {
  symbol: string;
  name: string;
  market: string;
  type: string;
  exchange: string;
  currency: string;
}

export default function PortfolioPage() {
  const router = useRouter();
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editShares, setEditShares] = useState<string>('');
  const [editAvgPrice, setEditAvgPrice] = useState<string>('');
  const [saving, setSaving] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [token, setToken] = useState<string>('');
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    }
    fetchPortfolio();
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
  }, [searchQuery, portfolio]);

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
      const response = await fetch(
        `http://localhost:3001/api/search/autocomplete?query=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      // Get current portfolio symbols to filter results
      const portfolioSymbols = new Set(portfolio.map(item => item.symbol));
      const filtered = (data.results || []).filter((result: SearchResult) => 
        !portfolioSymbols.has(result.symbol)
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
        // Refresh portfolio
        await fetchPortfolio();
        // Remove from search results
        setSearchResults(searchResults.filter(r => r.symbol !== result.symbol));
        if (searchResults.length === 1) {
          setShowSearchResults(false);
        }
      }
    } catch (error) {
      console.error('Error adding to portfolio:', error);
      alert('Failed to add to portfolio. Please try again.');
    }
  };

  const fetchPortfolio = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch('http://localhost:3001/api/portfolio', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPortfolio(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: PortfolioItem) => {
    setEditingItem(item.symbol);
    setEditShares(item.sharesOwned.toString());
    setEditAvgPrice(item.avgSharePrice.toString());
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditShares('');
    setEditAvgPrice('');
  };

  const handleSave = async (symbol: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      setSaving(symbol);
      const shares = parseFloat(editShares) || 0;
      const avgPrice = parseFloat(editAvgPrice) || 0;

      const response = await fetch(`http://localhost:3001/api/portfolio/${symbol}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sharesOwned: shares,
          avgSharePrice: avgPrice,
        }),
      });

      if (response.ok) {
        // Refresh portfolio data
        await fetchPortfolio();
        setEditingItem(null);
        setEditShares('');
        setEditAvgPrice('');
      }
    } catch (error) {
      console.error('Error saving portfolio item:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  const handleRemoveFromPortfolio = async (symbol: string) => {
    if (!confirm(`Are you sure you want to remove ${symbol} from your portfolio?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`http://localhost:3001/api/portfolio/${symbol}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Remove from local state
        setPortfolio(portfolio.filter(item => item.symbol !== symbol));
      }
    } catch (error) {
      console.error('Error removing from portfolio:', error);
    }
  };

  // Filter portfolio based on search query
  const filteredPortfolio = portfolio.filter(item =>
    item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredPortfolio.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredPortfolio.slice(startIndex, endIndex);

  // Calculate totals
  const totalMarketValue = portfolio.reduce((sum, item) => sum + item.totalMarketValue, 0);
  const totalCost = portfolio.reduce((sum, item) => sum + item.totalCost, 0);
  const totalProfitLoss = totalMarketValue - totalCost;
  const totalProfitLossPercent = totalCost !== 0 ? ((totalProfitLoss / totalCost) * 100) : 0;

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number, decimals: number = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
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
            My Portfolio
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your holdings, profit/loss, and portfolio performance
          </p>
        </div>

        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Market Value</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalMarketValue)}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Cost</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalCost)}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total P/L</div>
            <div className={`text-2xl font-bold ${
              totalProfitLoss >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {totalProfitLoss >= 0 ? '+' : ''}{formatCurrency(totalProfitLoss)}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total P/L %</div>
            <div className={`text-2xl font-bold ${
              totalProfitLossPercent >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {totalProfitLossPercent >= 0 ? '+' : ''}{formatNumber(totalProfitLossPercent)}%
            </div>
          </div>
        </div>

        {/* Portfolio Performance Chart */}
        {portfolio.length > 0 && token && (
          <PortfolioPerformanceChart
            token={token}
            portfolioItems={portfolio.map(item => ({
              symbol: item.symbol,
              name: item.name,
              type: item.type,
              category: item.type, // Use type as category for now
              totalMarketValue: item.totalMarketValue,
              logoUrl: item.logoUrl,
            }))}
          />
        )}

        {/* Search Bar */}
        <div className="mb-6 relative" ref={searchRef}>
          <input
            type="text"
            placeholder="Search assets to add to portfolio..."
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
            <div className="absolute z-50 w-full md:w-96 mt-1 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg shadow-lg max-h-96 overflow-y-auto">
              {searchLoading ? (
                <div className="p-4 text-center text-gray-600 dark:text-gray-400">
                  Searching...
                </div>
              ) : (
                <div className="py-2">
                  {searchResults.map((result) => (
                    <div
                      key={result.symbol}
                      className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-zinc-700 flex items-center justify-between cursor-pointer"
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
                      <button
                        onClick={(e) => handleAddToPortfolio(result, e)}
                        className="ml-4 px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                        title="Add to portfolio"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Portfolio Table */}
        <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-6 mb-6">
          {filteredPortfolio.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchQuery ? 'No assets found matching your search.' : 'Your portfolio is empty.'}
              </p>
              <Link
                href="/dashboard"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Browse assets to add to your portfolio
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-300 dark:border-zinc-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Company / Category
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Current Price
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Shares Owned
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Avg Share Price
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Total Market Value
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Total Cost
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Profit/Loss
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
                          <div className="flex items-center gap-2">
                            <AssetIcon
                              symbol={item.symbol}
                              name={item.name}
                              type={item.type}
                              category={item.type}
                              logoUrl={item.logoUrl}
                              size={32}
                            />
                            <div>
                              <Link
                                href={`/asset/${item.symbol}`}
                                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {item.name || item.symbol}
                              </Link>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {item.symbol} • {item.type || 'Unknown'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(item.currentPrice)}
                          </div>
                          <div className={`text-xs ${
                            item.change >= 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {item.change >= 0 ? '+' : ''}{formatCurrency(item.change)} ({item.changePercent >= 0 ? '+' : ''}{formatNumber(item.changePercent)}%)
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          {editingItem === item.symbol ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                step="0.00000001"
                                value={editShares}
                                onChange={(e) => setEditShares(e.target.value)}
                                className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0"
                              />
                              <button
                                onClick={() => handleSave(item.symbol)}
                                disabled={saving === item.symbol}
                                className="p-1 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 disabled:opacity-50"
                                title="Save"
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <div className="font-medium text-gray-900 dark:text-white">
                              {formatNumber(item.sharesOwned, 8)}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right">
                          {editingItem === item.symbol ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                step="0.01"
                                value={editAvgPrice}
                                onChange={(e) => setEditAvgPrice(e.target.value)}
                                className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0.00"
                              />
                              <button
                                onClick={() => handleSave(item.symbol)}
                                disabled={saving === item.symbol}
                                className="p-1 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 disabled:opacity-50"
                                title="Save"
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <div className="font-medium text-gray-900 dark:text-white">
                              {formatCurrency(item.avgSharePrice)}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(item.totalMarketValue)}
                        </td>
                        <td className="py-4 px-4 text-right font-medium text-gray-900 dark:text-white">
                          {formatCurrency(item.totalCost)}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className={`font-semibold ${
                            item.profitLoss >= 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {item.profitLoss >= 0 ? '+' : ''}{formatCurrency(item.profitLoss)}
                          </div>
                          <div className={`text-xs ${
                            item.profitLossPercent >= 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            ({item.profitLossPercent >= 0 ? '+' : ''}{formatNumber(item.profitLossPercent)}%)
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center gap-2">
                            {editingItem === item.symbol ? (
                              <button
                                onClick={handleCancelEdit}
                                className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                                title="Cancel"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEdit(item)}
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                                  title="Edit"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleRemoveFromPortfolio(item.symbol)}
                                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                                  title="Remove from portfolio"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
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
                    of {filteredPortfolio.length} assets
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

