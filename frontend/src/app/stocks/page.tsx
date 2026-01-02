'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import AssetIcon from '@/components/AssetIcon';
import UnifiedPriceChart from '@/components/UnifiedPriceChart';
import { normalizeAssetName } from '@/utils/assetNameUtils';

interface StockMarketData {
  rank: number;
  symbol: string;
  name: string;
  price: number;
  priceChange1h: number;
  priceChange24h: number;
  priceChange7d: number;
  marketCap: number;
  volume24h: number;
  logoUrl: string | null;
  lastUpdated: string;
}


export default function StocksPage() {
  const router = useRouter();
  const [stockData, setStockData] = useState<StockMarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStock, setSelectedStock] = useState<StockMarketData | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [sortBy, setSortBy] = useState<'rank' | 'name' | 'price' | 'marketCap' | 'volume'>('rank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [timeRange, setTimeRange] = useState('1Y');
  const itemsPerPage = 50;

  useEffect(() => {
    fetchStockData();
    // Check for dark mode
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

  const fetchStockData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/stocks/market?limit=250', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setStockData(result.data);
          // Select first stock by default
          if (result.data.length > 0 && !selectedStock) {
            setSelectedStock(result.data[0]);
          }
        }
      } else {
        console.error('Error fetching stock data:', response.status);
      }
    } catch (error) {
      console.error('Error fetching stock data:', error);
    } finally {
      setLoading(false);
    }
  };


  // Filter and sort stock data
  const filteredAndSortedData = useMemo(() => {
    let filtered = stockData.filter(
      (stock) =>
        stock.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortBy) {
        case 'rank':
          aVal = a.rank;
          bVal = b.rank;
          break;
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'price':
          aVal = a.price;
          bVal = b.price;
          break;
        case 'marketCap':
          aVal = a.marketCap;
          bVal = b.marketCap;
          break;
        case 'volume':
          aVal = a.volume24h;
          bVal = b.volume24h;
          break;
        default:
          aVal = a.rank;
          bVal = b.rank;
      }

      if (typeof aVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal);
      } else {
        return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
      }
    });

    return filtered;
  }, [stockData, searchQuery, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredAndSortedData.slice(startIndex, endIndex);

  // Reset to page 1 when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, sortOrder]);

  const formatPrice = (price: number) => {
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatLargeNumber = (num: number) => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {new Date(data.date).toLocaleDateString()}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Price: {formatPrice(data.price)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-white dark:bg-black pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 dark:bg-zinc-800 rounded w-64 mb-6"></div>
              <div className="h-96 bg-gray-200 dark:bg-zinc-800 rounded mb-8"></div>
              <div className="h-64 bg-gray-200 dark:bg-zinc-800 rounded"></div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white dark:bg-black pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              📈 Equities/ETFs Market
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Real-time stock prices, market caps, and trading volumes
            </p>
          </div>

          {/* Price Chart */}
          {selectedStock && (
            <div className="mb-6">
              <UnifiedPriceChart
                symbol={selectedStock.symbol}
                name={normalizeAssetName(selectedStock.name)}
                timeRange={timeRange}
                onTimeRangeChange={setTimeRange}
                showTimeRangeSelector={true}
                showPriceInfo={true}
                currentPrice={selectedStock.price}
                change={selectedStock.priceChange24h}
                changePercent={selectedStock.priceChange24h}
                isDarkMode={isDarkMode}
                height={400}
              />
            </div>
          )}

          {/* Search and Sort Controls */}
          <div className="mb-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full sm:max-w-md">
              <input
                type="text"
                placeholder="Search by name or symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 items-center">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Sort by:
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-zinc-600 rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="rank">Rank</option>
                <option value="name">Name</option>
                <option value="price">Price</option>
                <option value="marketCap">Market Cap</option>
                <option value="volume">Volume</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-zinc-600 rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-zinc-700"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>

          {/* Equities Table */}
          <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-6 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-zinc-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Rank
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Asset
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Price
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    1h%
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    24h%
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    7d%
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Market Cap
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Volume
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((stock) => (
                  <tr
                    key={stock.symbol}
                    onClick={() => setSelectedStock(stock)}
                    className={`border-b border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors ${
                      selectedStock?.symbol === stock.symbol
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                      {stock.rank}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <AssetIcon
                          symbol={stock.symbol}
                          name={stock.name}
                          type="stock"
                          category="Equity"
                          logoUrl={stock.logoUrl}
                          size={32}
                        />
                        <div>
                          <Link
                            href={`/asset/${stock.symbol}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {normalizeAssetName(stock.name)}
                          </Link>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {stock.symbol}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-white font-medium">
                      {formatPrice(stock.price)}
                    </td>
                    <td className={`py-3 px-4 text-sm text-right font-medium ${getChangeColor(stock.priceChange1h)}`}>
                      {formatPercent(stock.priceChange1h)}
                    </td>
                    <td className={`py-3 px-4 text-sm text-right font-medium ${getChangeColor(stock.priceChange24h)}`}>
                      {formatPercent(stock.priceChange24h)}
                    </td>
                    <td className={`py-3 px-4 text-sm text-right font-medium ${getChangeColor(stock.priceChange7d)}`}>
                      {formatPercent(stock.priceChange7d)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-white">
                      {formatLargeNumber(stock.marketCap)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-white">
                      {formatLargeNumber(stock.volume24h)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAndSortedData.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">
                No equities found matching your search.
              </p>
            </div>
          )}

          {/* Pagination */}
          {filteredAndSortedData.length > itemsPerPage && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredAndSortedData.length)} of {filteredAndSortedData.length} stocks
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded-md hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(10, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 10) {
                      pageNum = i + 1;
                    } else if (currentPage <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 4) {
                      pageNum = totalPages - 9 + i;
                    } else {
                      pageNum = currentPage - 4 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded-md hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

