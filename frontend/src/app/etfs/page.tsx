'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import AssetIcon from '@/components/AssetIcon';
import PulsatingDot from '@/components/PulsatingDot';
import { normalizeAssetName } from '@/utils/assetNameUtils';
import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface ETFMarketData {
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

interface ChartDataPoint {
  date: string;
  price: number;
  marketCap: number;
  volume: number;
}

export default function ETFsPage() {
  const router = useRouter();
  const [etfData, setEtfData] = useState<ETFMarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedETF, setSelectedETF] = useState<ETFMarketData | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [sortBy, setSortBy] = useState<'rank' | 'name' | 'price' | 'marketCap' | 'volume'>('rank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [timeRange, setTimeRange] = useState('1Y');
  const itemsPerPage = 50;

  const TIME_RANGES = [
    { label: '1D', value: '1D' },
    { label: '7D', value: '7D' },
    { label: '1M', value: '1M' },
    { label: '3M', value: '3M' },
    { label: '6M', value: '6M' },
    { label: 'YTD', value: 'YTD' },
    { label: '1Y', value: '1Y' },
    { label: '3Y', value: '3Y' },
    { label: '5Y', value: '5Y' },
    { label: 'MAX', value: 'MAX' },
  ];

  useEffect(() => {
    fetchETFData();
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

  useEffect(() => {
    if (selectedETF) {
      fetchChartData(selectedETF.symbol, timeRange);
    }
  }, [selectedETF, timeRange]);

  const fetchETFData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/etfs/market?limit=250', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setEtfData(result.data);
          // Select first ETF by default
          if (result.data.length > 0 && !selectedETF) {
            setSelectedETF(result.data[0]);
          }
        }
      } else {
        console.error('Error fetching ETF data:', response.status);
      }
    } catch (error) {
      console.error('Error fetching ETF data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async (symbol: string, range: string = '1Y') => {
    try {
      setChartLoading(true);
      const token = localStorage.getItem('token');
      const encodedSymbol = encodeURIComponent(symbol);
      
      const response = await fetch(
        `http://localhost:3001/api/assets/${encodedSymbol}?range=${range}`,
        {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.historicalData && Array.isArray(result.historicalData)) {
          const formatted = result.historicalData.map((point: any) => ({
            date: new Date(point.timestamp).toISOString().split('T')[0],
            price: parseFloat(point.close) || 0,
            marketCap: 0, // Market cap not available in historical data
            volume: parseFloat(point.volume) || 0,
          }));
          setChartData(formatted);
        }
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  };

  // Filter and sort ETF data
  const filteredAndSortedData = useMemo(() => {
    let filtered = etfData.filter(
      (etf) =>
        etf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        etf.symbol.toLowerCase().includes(searchQuery.toLowerCase())
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
  }, [etfData, searchQuery, sortBy, sortOrder]);

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
              📊 ETFs Market
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Real-time ETF prices, market caps, and trading volumes
            </p>
          </div>

          {/* Price Chart */}
          {selectedETF && (
            <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-6 mb-6">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <AssetIcon
                      symbol={selectedETF.symbol}
                      name={selectedETF.name}
                      type="etf"
                      category="ETF"
                      logoUrl={selectedETF.logoUrl}
                      size={48}
                      className="flex-shrink-0"
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {normalizeAssetName(selectedETF.name)} ({selectedETF.symbol})
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatPrice(selectedETF.price)}
                        <span className={`ml-2 ${getChangeColor(selectedETF.priceChange24h)}`}>
                          {formatPercent(selectedETF.priceChange24h)} (24h)
                        </span>
                      </p>
                    </div>
                  </div>
                  {/* Time Range Selector */}
                  <div className="flex items-center gap-2">
                    {TIME_RANGES.map((range) => (
                      <button
                        key={range.value}
                        onClick={() => setTimeRange(range.value)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                          timeRange === range.value
                            ? 'bg-blue-600 text-white dark:bg-blue-500'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {chartLoading ? (
                <div className="h-96 flex items-center justify-center">
                  <div className="animate-pulse text-gray-600 dark:text-gray-400">
                    Loading chart data...
                  </div>
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-96 flex items-center justify-center">
                  <p className="text-gray-600 dark:text-gray-400">
                    No chart data available
                  </p>
                </div>
              ) : (
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={isDarkMode ? '#3f3f46' : '#e4e4e7'}
                        opacity={0.5}
                      />
                      <XAxis
                        dataKey="date"
                        stroke={isDarkMode ? '#6b7280' : '#9ca3af'}
                        tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        stroke={isDarkMode ? '#6b7280' : '#9ca3af'}
                        tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 12 }}
                        tickFormatter={(value) => formatPrice(value)}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="none"
                        fill="#3b82f6"
                        fillOpacity={0.25}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={(props) => <PulsatingDot {...props} data={chartData} fill="#3b82f6" />}
                        activeDot={{ r: 5, fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 2 }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
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
                {paginatedData.map((etf) => (
                  <tr
                    key={etf.symbol}
                    onClick={() => setSelectedETF(etf)}
                    className={`border-b border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors ${
                      selectedETF?.symbol === etf.symbol
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                      {etf.rank}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <AssetIcon
                          symbol={etf.symbol}
                          name={etf.name}
                          type="etf"
                          category="ETF"
                          logoUrl={etf.logoUrl}
                          size={32}
                        />
                        <div>
                          <Link
                            href={`/asset/${etf.symbol}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {normalizeAssetName(etf.name)}
                          </Link>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {etf.symbol}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-white font-medium">
                      {formatPrice(etf.price)}
                    </td>
                    <td className={`py-3 px-4 text-sm text-right font-medium ${getChangeColor(etf.priceChange1h)}`}>
                      {formatPercent(etf.priceChange1h)}
                    </td>
                    <td className={`py-3 px-4 text-sm text-right font-medium ${getChangeColor(etf.priceChange24h)}`}>
                      {formatPercent(etf.priceChange24h)}
                    </td>
                    <td className={`py-3 px-4 text-sm text-right font-medium ${getChangeColor(etf.priceChange7d)}`}>
                      {formatPercent(etf.priceChange7d)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-white">
                      {formatLargeNumber(etf.marketCap)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-white">
                      {formatLargeNumber(etf.volume24h)}
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
                Showing {startIndex + 1} to {Math.min(endIndex, filteredAndSortedData.length)} of {filteredAndSortedData.length} ETFs
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

