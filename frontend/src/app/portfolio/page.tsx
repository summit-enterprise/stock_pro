'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import PortfolioPerformanceChart from '@/components/PortfolioPerformanceChart';
import AssetIcon from '@/components/AssetIcon';
import ConfirmationModal from '@/components/ConfirmationModal';

interface PortfolioItem {
  symbol: string;
  name: string;
  type?: string;
  category?: string;
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
  category?: string;
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
  const [selectedChartPositions, setSelectedChartPositions] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkEditData, setBulkEditData] = useState<{ [symbol: string]: { shares: string; price: string } }>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
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
        // Dispatch event to refresh portfolio cards
        window.dispatchEvent(new Event('portfolio-changed'));
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
        // Show success feedback
        console.log('Added to watchlist');
        // Dispatch event to refresh watchlist cards
        window.dispatchEvent(new Event('watchlist-changed'));
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to add to watchlist. Please try again.');
      }
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      alert('Failed to add to watchlist. Please try again.');
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
    setDeleteTarget(symbol);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`http://localhost:3001/api/portfolio/${deleteTarget}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Remove from local state
        setPortfolio(portfolio.filter(item => item.symbol !== deleteTarget));
        // Remove from selected items if it was selected
        const newSelected = new Set(selectedItems);
        newSelected.delete(deleteTarget);
        setSelectedItems(newSelected);
        // Dispatch event to refresh portfolio cards
        window.dispatchEvent(new Event('portfolio-changed'));
      }
    } catch (error) {
      console.error('Error removing from portfolio:', error);
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
        fetch(`http://localhost:3001/api/portfolio/${symbol}`, {
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
        setPortfolio(portfolio.filter(item => !selectedItems.has(item.symbol)));
        // Clear selection
        setSelectedItems(new Set());
        // Dispatch event to refresh portfolio cards
        window.dispatchEvent(new Event('portfolio-changed'));
      }
    } catch (error) {
      console.error('Error removing items from portfolio:', error);
    }
  };

  const handleBulkEdit = () => {
    if (selectedItems.size === 0) return;
    setBulkEditMode(true);
    // Initialize bulk edit data with current values
    const editData: { [symbol: string]: { shares: string; price: string } } = {};
    portfolio
      .filter(item => selectedItems.has(item.symbol))
      .forEach(item => {
        editData[item.symbol] = {
          shares: item.sharesOwned.toString(),
          price: item.avgSharePrice.toString(),
        };
      });
    setBulkEditData(editData);
  };

  const handleBulkSave = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const savePromises = Object.entries(bulkEditData)
        .filter(([symbol]) => selectedItems.has(symbol))
        .map(([symbol, data]) =>
          fetch(`http://localhost:3001/api/portfolio/${symbol}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sharesOwned: parseFloat(data.shares) || 0,
              avgSharePrice: parseFloat(data.price) || 0,
            }),
          })
        );

      await Promise.all(savePromises);
      // Refresh portfolio data
      await fetchPortfolio();
      // Clear bulk edit mode and selection
      setBulkEditMode(false);
      setBulkEditData({});
      setSelectedItems(new Set());
    } catch (error) {
      console.error('Error saving bulk edits:', error);
      alert('Failed to save edits. Please try again.');
    }
  };

  const handleBulkCancel = () => {
    setBulkEditMode(false);
    setBulkEditData({});
  };

  // Filter portfolio based on search query and chart selection
  const filteredPortfolio = portfolio.filter(item => {
    const matchesSearch = item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // If chart has selections, filter by those as well
    if (selectedChartPositions.size > 0) {
      return matchesSearch && selectedChartPositions.has(item.symbol);
    }
    
    return matchesSearch;
  });

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
    <ProtectedRoute>
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
          <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Market Value</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalMarketValue)}
            </div>
          </div>
          <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Cost</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalCost)}
            </div>
          </div>
          <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total P/L</div>
            <div className={`text-2xl font-bold ${
              totalProfitLoss >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {totalProfitLoss >= 0 ? '+' : ''}{formatCurrency(totalProfitLoss)}
            </div>
          </div>
          <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-4">
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
            key={portfolio.map(item => item.symbol).join(',')} // Force re-render when portfolio changes
            token={token}
            portfolioItems={portfolio.map(item => ({
              symbol: item.symbol,
              name: item.name,
              type: item.type,
              category: item.category || item.type || 'Unknown', // Use category field
              totalMarketValue: item.totalMarketValue,
              logoUrl: item.logoUrl,
            }))}
            onSelectionChange={setSelectedChartPositions}
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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

        {/* Portfolio Table */}
        <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-6 mb-6">
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
              {/* Bulk Action Buttons - Show when items are selected */}
              {selectedItems.size > 0 && !bulkEditMode && (
                <div className="mb-4 flex items-center justify-end gap-2">
                  <button
                    onClick={handleBulkEdit}
                    className="px-5 py-2.5 text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:shadow-md rounded-xl transition-all duration-300 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
                  >
                    Edit ({selectedItems.size})
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="px-5 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 hover:shadow-md rounded-xl transition-all duration-300 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
                  >
                    Delete ({selectedItems.size})
                  </button>
                  <button
                    onClick={() => setSelectedItems(new Set())}
                    className="px-5 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-700 hover:shadow-md rounded-xl transition-all duration-300 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
                  >
                    Clear Selection
                  </button>
                </div>
              )}

              {/* Bulk Edit Save/Cancel Buttons */}
              {bulkEditMode && (
                <div className="mb-4 flex items-center justify-end gap-2">
                  <button
                    onClick={handleBulkCancel}
                    className="px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-700 hover:shadow-md rounded-xl transition-all duration-300 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkSave}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-600 hover:shadow-xl hover:shadow-green-500/30 rounded-xl transition-all duration-300 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
                  >
                    Save All Changes
                  </button>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-300 dark:border-zinc-700">
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 w-12">
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
                    {currentItems.map((item) => {
                      const isSelected = selectedItems.has(item.symbol);
                      const isInBulkEdit = bulkEditMode && isSelected;
                      return (
                      <tr
                        key={item.symbol}
                        className={`border-b border-gray-200 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors ${
                          isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                      >
                        <td className="py-4 px-4 text-center">
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
                          <div className="flex items-center gap-2">
                            <AssetIcon
                              symbol={item.symbol}
                              name={item.name}
                              type={item.type}
                              category={item.category || item.type || 'Unknown'}
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
                                {item.symbol}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                            {item.category || item.type || 'Unknown'}
                          </span>
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
                          {isInBulkEdit ? (
                            <input
                              type="number"
                              step="0.00000001"
                              value={bulkEditData[item.symbol]?.shares || item.sharesOwned.toString()}
                              onChange={(e) => {
                                setBulkEditData({
                                  ...bulkEditData,
                                  [item.symbol]: {
                                    ...bulkEditData[item.symbol],
                                    shares: e.target.value,
                                  },
                                });
                              }}
                              className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-zinc-600 rounded bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="0"
                            />
                          ) : editingItem === item.symbol ? (
                            <input
                              type="number"
                              step="0.00000001"
                              value={editShares}
                              onChange={(e) => setEditShares(e.target.value)}
                              className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-zinc-600 rounded bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="0"
                            />
                          ) : (
                            <div className="font-medium text-gray-900 dark:text-white">
                              {formatNumber(item.sharesOwned, 8)}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right">
                          {isInBulkEdit ? (
                            <input
                              type="number"
                              step="0.01"
                              value={bulkEditData[item.symbol]?.price || item.avgSharePrice.toString()}
                              onChange={(e) => {
                                setBulkEditData({
                                  ...bulkEditData,
                                  [item.symbol]: {
                                    ...bulkEditData[item.symbol],
                                    price: e.target.value,
                                  },
                                });
                              }}
                              className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-zinc-600 rounded bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="0.00"
                            />
                          ) : editingItem === item.symbol ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editAvgPrice}
                              onChange={(e) => setEditAvgPrice(e.target.value)}
                              className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-zinc-600 rounded bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="0.00"
                            />
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
                            {!bulkEditMode && editingItem === item.symbol ? (
                              <>
                                <button
                                  onClick={() => handleSave(item.symbol)}
                                  disabled={saving === item.symbol}
                                  className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 disabled:opacity-50 transition-colors"
                                  title="Save"
                                >
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                                  title="Cancel"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </>
                            ) : !bulkEditMode ? (
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
                            ) : null}
                          </div>
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
                    of {filteredPortfolio.length} assets
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
      </div>

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        title="Remove from Portfolio"
        message={`Are you sure you want to remove ${deleteTarget} from your portfolio?`}
        confirmText="Remove"
        cancelText="Cancel"
        confirmButtonColor="red"
      />

      <ConfirmationModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={confirmBulkDelete}
        title="Remove Multiple Items"
        message={`Are you sure you want to remove ${selectedItems.size} item${selectedItems.size === 1 ? '' : 's'} from your portfolio? This action cannot be undone.`}
        confirmText="Remove All"
        cancelText="Cancel"
        confirmButtonColor="red"
      />
    </ProtectedRoute>
  );
}

