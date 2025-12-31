'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
} from 'recharts';

interface WatchlistPriceChartProps {
  selectedSymbol?: string;
  isDarkMode?: boolean;
  watchlistItems?: Array<{
    symbol: string;
    name: string;
    category?: string;
    type?: string;
  }>;
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
}

interface ChartDataPoint {
  date: string;
  dateObj?: Date;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  change?: number;
  changePercent?: number;
}

const TIME_RANGES = [
  { label: '1D', value: '1D' },
  { label: '5D', value: '5D' },
  { label: '1W', value: '1W' },
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '6M', value: '6M' },
  { label: '1Y', value: '1Y' },
  { label: '3Y', value: '3Y' },
  { label: '5Y', value: '5Y' },
  { label: '10Y', value: '10Y' },
  { label: 'MAX', value: 'MAX' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg shadow-lg p-3">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{label}</p>
        <p className="text-sm text-green-600 dark:text-green-400">
          Price: ${data.close?.toFixed(2) || payload[0].value.toFixed(2)}
        </p>
        {data.change !== undefined && (
          <p className={`text-xs mt-1 ${data.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)} ({data.changePercent >= 0 ? '+' : ''}{data.changePercent?.toFixed(2)}%)
          </p>
        )}
      </div>
    );
  }
  return null;
};

// Format X-axis labels based on time range
const formatXAxisLabel = (value: string, timeRange: string) => {
  const date = new Date(value);
  if (timeRange === '1D' || timeRange === '5D') {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } else if (timeRange === '1W' || timeRange === '1M') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
};

export default function WatchlistPriceChart({ 
  selectedSymbol, 
  isDarkMode = false,
  watchlistItems = [],
  selectedCategory = 'all',
  onCategoryChange
}: WatchlistPriceChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('1Y');
  const [allHistoricalData, setAllHistoricalData] = useState<ChartDataPoint[]>([]);
  // Cache for multiple symbols' data
  const [dataCache, setDataCache] = useState<Map<string, ChartDataPoint[]>>(new Map());
  const [isTransitioning, setIsTransitioning] = useState(false);
  
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
    watchlistItems.map(item => normalizeCategory(item.category || item.type || 'Unknown')).filter(Boolean)
  )).sort();
  
  // Filter watchlist items by category
  const filteredWatchlistItems = selectedCategory === 'all' 
    ? watchlistItems 
    : watchlistItems.filter(item => normalizeCategory(item.category || item.type || 'Unknown') === selectedCategory);

  // Filter data based on selected time range (client-side for smooth transitions)
  const filterDataByTimeRange = useCallback((data: ChartDataPoint[], range: string): ChartDataPoint[] => {
    if (!data || data.length === 0) return [];
    
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (range) {
      case '1D':
        cutoffDate.setDate(now.getDate() - 1);
        break;
      case '5D':
        cutoffDate.setDate(now.getDate() - 5);
        break;
      case '1W':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '1M':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case '3M':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case '6M':
        cutoffDate.setMonth(now.getMonth() - 6);
        break;
      case '1Y':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      case '3Y':
        cutoffDate.setFullYear(now.getFullYear() - 3);
        break;
      case '5Y':
        cutoffDate.setFullYear(now.getFullYear() - 5);
        break;
      case '10Y':
        cutoffDate.setFullYear(now.getFullYear() - 10);
        break;
      case 'MAX':
        return data; // Return all data
      default:
        cutoffDate.setFullYear(now.getFullYear() - 1);
    }
    
    return data.filter(point => {
      const pointDate = point.dateObj || new Date(point.date);
      return pointDate >= cutoffDate;
    });
  }, []);

  // Fetch chart data from API
  const fetchChartData = useCallback(async (symbol: string, range: string, useCache: boolean = true) => {
    if (!symbol) return;
    
    // Check cache first for instant transitions
    if (useCache && dataCache.has(symbol)) {
      setIsTransitioning(true);
      // Small delay for smooth transition effect
      setTimeout(() => {
        const cachedData = dataCache.get(symbol)!;
        setAllHistoricalData(cachedData);
        const filtered = filterDataByTimeRange(cachedData, range);
        setChartData(filtered);
        setLoading(false);
        setIsTransitioning(false);
      }, 50);
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const encodedSymbol = encodeURIComponent(symbol);
      
      // Fetch MAX range once, then filter client-side for smooth transitions
      const rangeToFetch = 'MAX';
      
      const response = await fetch(
        `http://localhost:3001/api/watchlist/chart/${encodedSymbol}?timeRange=${rangeToFetch}`,
        {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to fetch chart data:', response.status, errorData);
        throw new Error(`Failed to fetch chart data: ${response.status} - ${errorData.error || errorData.message || 'Unknown error'}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Handle empty data gracefully
        if (!result.data || result.data.length === 0) {
          console.log(`No chart data available for ${symbol}`);
          setAllHistoricalData([]);
          setChartData([]);
          setLoading(false);
          return;
        }
        
        // Parse dates and format data
        const formattedData = result.data
          .map((point: any) => {
            try {
              // Handle date parsing - backend returns date as string or dateObj
              let date: Date;
              if (point.dateObj) {
                date = new Date(point.dateObj);
              } else if (point.date) {
                date = new Date(point.date);
              } else {
                console.warn('Missing date in data point:', point);
                return null;
              }
              
              // Validate date
              if (isNaN(date.getTime())) {
                console.warn('Invalid date in data point:', point);
                return null;
              }
              
              const close = parseFloat(point.close);
              if (isNaN(close) || close <= 0) {
                console.warn('Invalid close price in data point:', point);
                return null;
              }
              
              return {
                date: point.date || date.toISOString().split('T')[0],
                dateObj: date,
                close: close,
                open: parseFloat(point.open) || close,
                high: parseFloat(point.high) || close,
                low: parseFloat(point.low) || close,
                volume: parseFloat(point.volume) || 0,
                change: parseFloat(point.change) || 0,
                changePercent: parseFloat(point.changePercent) || 0,
              };
            } catch (error) {
              console.error('Error parsing data point:', error, point);
              return null;
            }
          })
          .filter((point: any): point is ChartDataPoint => point !== null); // Filter out null entries
        
        console.log(`Loaded ${formattedData.length} data points for ${symbol}`);
        
        if (formattedData.length === 0) {
          console.warn(`No valid data points after filtering for ${symbol}`);
          setAllHistoricalData([]);
          setChartData([]);
          setLoading(false);
          return;
        }
        
        // Cache the data
        setDataCache(prev => new Map(prev).set(symbol, formattedData));
        setIsTransitioning(true);
        setTimeout(() => {
          setAllHistoricalData(formattedData);
          // Filter by current time range
          const filtered = filterDataByTimeRange(formattedData, range);
          setChartData(filtered);
          console.log(`Filtered to ${filtered.length} data points for ${symbol} (${range})`);
          setLoading(false);
          setIsTransitioning(false);
        }, 50);
      } else {
        console.error(`API returned success=false for ${symbol}:`, result);
        setChartData([]);
        setAllHistoricalData([]);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching watchlist chart data:', error);
      setChartData([]);
      setAllHistoricalData([]);
      setLoading(false);
    }
  }, [filterDataByTimeRange, dataCache]);

  // Fetch data when symbol changes (use cache for smooth transitions)
  useEffect(() => {
    if (selectedSymbol) {
      fetchChartData(selectedSymbol, timeRange, true);
    } else {
      setChartData([]);
      setAllHistoricalData([]);
    }
  }, [selectedSymbol, fetchChartData]);
  
  // Pre-fetch data for all watchlist items in the background
  useEffect(() => {
    if (watchlistItems.length > 0) {
      const token = localStorage.getItem('token');
      const symbolsToFetch = watchlistItems
        .map(item => item.symbol)
        .filter(symbol => !dataCache.has(symbol));
      
      if (symbolsToFetch.length === 0) return;
      
      // Fetch data for uncached symbols
      symbolsToFetch.forEach((symbol) => {
        const encodedSymbol = encodeURIComponent(symbol);
        fetch(
          `http://localhost:3001/api/watchlist/chart/${encodedSymbol}?timeRange=MAX`,
          {
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
            },
          }
        )
          .then(response => response.json())
          .then(result => {
            if (result.success && result.data && result.data.length > 0) {
              const formattedData = result.data
                .map((point: any) => {
                  try {
                    let date: Date;
                    if (point.dateObj) {
                      date = new Date(point.dateObj);
                    } else if (point.date) {
                      date = new Date(point.date);
                    } else {
                      return null;
                    }
                    
                    if (isNaN(date.getTime())) return null;
                    
                    const close = parseFloat(point.close);
                    if (isNaN(close) || close <= 0) return null;
                    
                    return {
                      date: point.date || date.toISOString().split('T')[0],
                      dateObj: date,
                      close: close,
                      open: parseFloat(point.open) || close,
                      high: parseFloat(point.high) || close,
                      low: parseFloat(point.low) || close,
                      volume: parseFloat(point.volume) || 0,
                      change: parseFloat(point.change) || 0,
                      changePercent: parseFloat(point.changePercent) || 0,
                    };
                  } catch {
                    return null;
                  }
                })
                .filter((point: any): point is ChartDataPoint => point !== null);
              
              if (formattedData.length > 0) {
                setDataCache(prev => {
                  const newCache = new Map(prev);
                  newCache.set(symbol, formattedData);
                  return newCache;
                });
              }
            }
          })
          .catch(error => {
            console.error(`Error pre-fetching data for ${symbol}:`, error);
          });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlistItems.map(item => item.symbol).join(',')]);

  // Filter data when time range changes (client-side for smooth transitions)
  useEffect(() => {
    if (allHistoricalData.length > 0) {
      const filtered = filterDataByTimeRange(allHistoricalData, timeRange);
      setChartData(filtered);
    }
  }, [timeRange, allHistoricalData, filterDataByTimeRange]);

  if (!selectedSymbol) {
    return (
      <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-6 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📈</div>
          <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
            Select an asset to view price performance
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
            Click on any asset in the watchlist to see its chart
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-6 h-full flex items-center justify-center">
        <div className="animate-pulse text-gray-600 dark:text-gray-400">
          Loading chart data...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl px-6 pt-6 pb-2 flex flex-col" style={{ minHeight: '580px', height: '100%' }}>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Price Performance: {selectedSymbol || 'Select an asset'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {selectedSymbol ? `Historical price data` : 'Click on any asset in the watchlist to see its chart'}
            </p>
          </div>
          
          {/* Time Range Selector */}
          {selectedSymbol && (
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-600 rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TIME_RANGES.map(range => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          )}
        </div>
        
        {/* Category Filter */}
        {categories.length > 0 && onCategoryChange && (
          <div className="mt-3 flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filter by Category:
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
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
      
      <div className="flex-1" style={{ minHeight: '500px', height: '500px' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse text-gray-600 dark:text-gray-400">
              Loading chart data...
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-600 dark:text-gray-400">
              {selectedSymbol ? `No chart data available for ${selectedSymbol}` : 'Select an asset to view chart'}
            </p>
          </div>
        ) : (
          <div 
            className="transition-opacity duration-300 ease-in-out" 
            style={{ 
              height: '100%', 
              width: '100%', 
              opacity: isTransitioning ? 0.6 : 1,
              transform: isTransitioning ? 'scale(0.98)' : 'scale(1)',
              transition: 'opacity 300ms ease-in-out, transform 300ms ease-in-out'
            }}
          >
            <ResponsiveContainer width="100%" height="100%" minHeight={450}>
              <LineChart
                key={`${selectedSymbol}-${timeRange}`}
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: timeRange === '1D' || timeRange === '5D' ? 5 : 40 }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={isDarkMode ? '#3f3f46' : '#e4e4e7'}
                  opacity={0.5}
                />
                <XAxis
                  dataKey="date"
                  stroke={isDarkMode ? '#6b7280' : '#9ca3af'}
                  tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 13, fontWeight: 500 }}
                  angle={timeRange === '1D' || timeRange === '5D' ? 0 : -45}
                  textAnchor={timeRange === '1D' || timeRange === '5D' ? 'middle' : 'end'}
                  height={timeRange === '1D' || timeRange === '5D' ? 25 : 40}
                  tickFormatter={(value) => formatXAxisLabel(value, timeRange)}
                  interval={timeRange === '1D' || timeRange === '5D' ? 'preserveStartEnd' : undefined}
                  padding={{ top: 0, bottom: 0 }}
                />
                <YAxis
                  stroke={isDarkMode ? '#6b7280' : '#9ca3af'}
                  tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 13, fontWeight: 500 }}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                  domain={['dataMin', 'dataMax']}
                  axisLine={{ stroke: isDarkMode ? '#6b7280' : '#9ca3af', strokeWidth: 1 }}
                  tickLine={{ stroke: isDarkMode ? '#6b7280' : '#9ca3af', strokeWidth: 1 }}
                />
                <Tooltip content={<CustomTooltip />} />
                {/* Area fill - solid green matching the line color - must be before Line */}
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke="none"
                  fill="#10B981"
                  fillOpacity={0.25}
                  isAnimationActive={false}
                />
                {/* Line on top of the area */}
                <Line
                  type="monotone"
                  dataKey="close"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5, fill: '#10B981', stroke: '#ffffff', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

