/**
 * Unified Price Chart Component
 * 
 * A clean, simple chart component for all pages (watchlist, portfolio, markets, etc.)
 * 
 * Architecture:
 * - When an asset is selected, fetch ALL historical data (MAX range) and cache it
 * - Charts filter from cached data (client-side) for smooth transitions
 * - Real-time and batch services update the cache, charts react automatically
 * 
 * Features:
 * - Blue line graph
 * - Pulsating dot on most recent data point
 * - Proper X-axis date labels based on time period
 * - Smooth transitions (no API calls when switching time ranges)
 * - Normalized Y-axis scale
 */

'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import PulsatingDot from '@/components/PulsatingDot';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export interface UnifiedPriceChartProps {
  symbol: string;
  name?: string;
  timeRange?: string;
  onTimeRangeChange?: (range: string) => void;
  showTimeRangeSelector?: boolean;
  height?: number;
  isDarkMode?: boolean;
  showPriceInfo?: boolean;
  currentPrice?: number;
  change?: number;
  changePercent?: number;
  className?: string;
}

export interface ChartDataPoint {
  timestamp: number;
  date: string;
  dateObj: Date;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
}

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

// Global cache for chart data (shared across all chart instances)
const chartDataCache = new Map<string, {
  data: ChartDataPoint[];
  timestamp: number;
  symbol: string;
}>();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

// Export function to invalidate cache for a symbol (can be called by real-time services)
export function invalidateChartCache(symbol: string) {
  chartDataCache.delete(symbol);
}

// Export function to update cache with new data (can be called by real-time services)
export function updateChartCache(symbol: string, newData: ChartDataPoint[]) {
  chartDataCache.set(symbol, {
    data: newData.sort((a, b) => a.timestamp - b.timestamp),
    timestamp: Date.now(),
    symbol: symbol,
  });
}

export default function UnifiedPriceChart({
  symbol,
  name,
  timeRange: externalTimeRange,
  onTimeRangeChange,
  showTimeRangeSelector = true,
  height = 400,
  isDarkMode = false,
  showPriceInfo = false,
  currentPrice,
  change,
  changePercent,
  className = '',
}: UnifiedPriceChartProps) {
  const [internalTimeRange, setInternalTimeRange] = useState('1Y');
  const [cachedHistoricalData, setCachedHistoricalData] = useState<ChartDataPoint[]>([]);
  const [filteredData, setFilteredData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previousSymbolRef = useRef<string>('');

  // Use external timeRange if provided, otherwise use internal state
  const timeRange = externalTimeRange || internalTimeRange;

  const handleTimeRangeChange = (newRange: string) => {
    if (onTimeRangeChange) {
      onTimeRangeChange(newRange);
    } else {
      setInternalTimeRange(newRange);
    }
  };

  // Fetch ALL historical data (MAX range) and cache it
  const fetchAndCacheHistoricalData = useCallback(async (symbol: string) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const encodedSymbol = encodeURIComponent(symbol);
      
      // Check global cache first
      const cached = chartDataCache.get(symbol);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < CACHE_TTL) {
        // Use cached data
        setCachedHistoricalData(cached.data);
        setLoading(false);
        return cached.data;
      }
      
      // Fetch MAX range to get all historical data
      const response = await fetch(
        `http://localhost:3001/api/assets/${encodedSymbol}?range=MAX`,
        {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch chart data: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.historicalData && Array.isArray(result.historicalData)) {
        // Transform data to ChartDataPoint format
        const formatted = result.historicalData
          .map((point: any) => {
            let date: Date;
            let timestamp: number;

            if (point.timestamp) {
              date = new Date(point.timestamp);
              timestamp = date.getTime();
            } else if (point.date) {
              date = new Date(point.date);
              timestamp = date.getTime();
            } else {
              return null;
            }

            if (isNaN(timestamp)) return null;

            const close = parseFloat(point.close);
            if (isNaN(close) || close <= 0) return null;

            return {
              timestamp,
              date: date.toISOString().split('T')[0],
              dateObj: date,
              close,
              open: parseFloat(point.open) || close,
              high: parseFloat(point.high) || close,
              low: parseFloat(point.low) || close,
              volume: parseFloat(point.volume) || 0,
            };
          })
          .filter((point: ChartDataPoint | null): point is ChartDataPoint => point !== null)
          .sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp ascending

        // Cache the data globally
        chartDataCache.set(symbol, {
          data: formatted,
          timestamp: now,
          symbol: symbol,
        });

        setCachedHistoricalData(formatted);
        return formatted;
      }

      setCachedHistoricalData([]);
      return [];
    } catch (error: any) {
      console.error('Error fetching chart data:', error);
      setError(error.message || 'Failed to load chart data');
      setCachedHistoricalData([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch and cache data when symbol changes
  useEffect(() => {
    if (symbol && symbol !== previousSymbolRef.current) {
      previousSymbolRef.current = symbol;
      fetchAndCacheHistoricalData(symbol);
    }
  }, [symbol, fetchAndCacheHistoricalData]);

  // For 1D range, fetch hourly data separately from Redis cache
  useEffect(() => {
    if (symbol && timeRange === '1D') {
      fetch1DHourlyData(symbol);
    }
  }, [symbol, timeRange]);

  // Fetch 1D hourly data from Redis cache
  const fetch1DHourlyData = useCallback(async (symbol: string) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const encodedSymbol = encodeURIComponent(symbol);
      
      // Fetch 1D range which should return hourly data from Redis
      const response = await fetch(
        `http://localhost:3001/api/assets/${encodedSymbol}?range=1D`,
        {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch 1D hourly data: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.historicalData && Array.isArray(result.historicalData)) {
        const now = new Date();
        const currentHour = now.getHours();
        
        // Transform and filter hourly data up to current hour
        const formatted = result.historicalData
          .map((point: any) => {
            let date: Date;
            let timestamp: number;

            if (point.timestamp) {
              date = new Date(point.timestamp);
              timestamp = date.getTime();
            } else if (point.date) {
              date = new Date(point.date);
              timestamp = date.getTime();
            } else {
              return null;
            }

            if (isNaN(timestamp)) return null;

            const close = parseFloat(point.close);
            if (isNaN(close) || close <= 0) return null;

            // Only include data up to current hour (not future hours)
            const pointHour = date.getHours();
            const pointDate = date.toDateString();
            const today = now.toDateString();
            
            if (pointDate === today && pointHour > currentHour) {
              return null; // Skip future hours
            }

            return {
              timestamp,
              date: date.toISOString(), // For 1D hourly data, use full ISO string to include time
              dateObj: date,
              close,
              open: parseFloat(point.open) || close,
              high: parseFloat(point.high) || close,
              low: parseFloat(point.low) || close,
              volume: parseFloat(point.volume) || 0,
            };
          })
          .filter((point: ChartDataPoint | null): point is ChartDataPoint => point !== null)
          .sort((a, b) => a.timestamp - b.timestamp);

        // Update cache with hourly data for 1D
        chartDataCache.set(`${symbol}_1D`, {
          data: formatted,
          timestamp: Date.now(),
          symbol: symbol,
        });

        // For 1D, use the hourly data directly
        setFilteredData(formatted);
        setLoading(false);
      } else {
        setFilteredData([]);
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Error fetching 1D hourly data:', error);
      setError(error.message || 'Failed to load 1D hourly data');
      setFilteredData([]);
      setLoading(false);
    }
  }, []);

  // Filter cached data based on time range (client-side, instant)
  useEffect(() => {
    // For 1D, hourly data is handled separately
    if (timeRange === '1D') {
      return; // Don't filter here, hourly data is already set
    }

    if (cachedHistoricalData.length === 0) {
      setFilteredData([]);
      return;
    }

    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now);
    endDate.setHours(23, 59, 59, 999);
    
    switch (timeRange) {
        
      case '7D':
        // Today + 6 previous days
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        break;
        
      case '1M':
        // Exactly 1 month ago to today
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
        
      case '3M':
        // Exactly 3 months ago to today
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 3);
        startDate.setHours(0, 0, 0, 0);
        break;
        
      case '6M':
        // Exactly 6 months ago to today
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 6);
        startDate.setHours(0, 0, 0, 0);
        break;
        
      case 'YTD':
        // January 1st of current year to today
        startDate = new Date(now.getFullYear(), 0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
        
      case '1Y':
        // Exactly 1 year ago to today
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
        
      case '3Y':
        // Exactly 3 years ago to today
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 3);
        startDate.setHours(0, 0, 0, 0);
        break;
        
      case '5Y':
        // Exactly 5 years ago to today
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 5);
        startDate.setHours(0, 0, 0, 0);
        break;
        
      case 'MAX':
      default:
        // Show all cached data
        setFilteredData(cachedHistoricalData);
        return;
    }
    
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    
    const filtered = cachedHistoricalData.filter(point => 
      point.timestamp >= startTime && point.timestamp <= endTime
    );
    
    setFilteredData(filtered);
  }, [cachedHistoricalData, timeRange]);

  // Format X-axis labels based on time range
  const formatXAxisLabel = useCallback((value: string, range: string) => {
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return value;
      
      switch (range) {
        case '1D':
          // Show hour in 12-hour format (e.g., "12 AM", "2 PM")
          const hour = date.getHours();
          const period = hour >= 12 ? 'PM' : 'AM';
          const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
          return `${displayHour} ${period}`;
        case '7D':
          return date.toLocaleDateString('en-US', { 
            weekday: 'short',
            month: 'short', 
            day: 'numeric'
          });
        case '1M':
        case '3M':
        case '6M':
          return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          });
        case 'YTD':
        case '1Y':
        case '3Y':
        case '5Y':
          return date.toLocaleDateString('en-US', { 
            month: 'short', 
            year: '2-digit' 
          });
        case 'MAX':
        default:
          return date.toLocaleDateString('en-US', { 
            month: 'short', 
            year: '2-digit' 
          });
      }
    } catch {
      return value;
    }
  }, []);

  // Calculate X-axis interval to show appropriate number of labels
  const getXAxisInterval = useCallback((range: string, dataLength: number) => {
    if (dataLength === 0) return 0;
    
    // Calculate how many labels we want to show
    let desiredLabels = 8; // Default
    
    switch (range) {
      case '1D':
        // For 1D, show label every 2 hours (12 labels for 24 hours)
        // Since we have hourly data, interval of 2 means every 2 hours
        return 2; // Show every 2 hours
      case '7D':
        desiredLabels = 7; // One per day
        break;
      case '1M':
        desiredLabels = 8; // Roughly weekly
        break;
      case '3M':
        desiredLabels = 10; // Roughly every 9 days
        break;
      case '6M':
        desiredLabels = 12; // Roughly every 2 weeks
        break;
      case 'YTD':
      case '1Y':
        desiredLabels = 12; // Monthly
        break;
      case '3Y':
        desiredLabels = 12; // Quarterly
        break;
      case '5Y':
        desiredLabels = 10; // Semi-annually
        break;
      case 'MAX':
        desiredLabels = 12; // Yearly or quarterly
        break;
    }
    
    // Calculate interval
    const interval = Math.max(0, Math.floor(dataLength / desiredLabels));
    return interval;
  }, []);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const date = new Date(data.dateObj || data.date);
      
      let dateLabel: string;
      if (timeRange === '1D') {
        dateLabel = date.toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      } else {
        dateLabel = date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });
      }

      return (
        <div className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            {dateLabel}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Price: ${data.close.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Format price for display
  const formatPrice = (price: number) => {
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Get display price (latest in filtered range)
  const displayPrice = useMemo(() => {
    if (currentPrice !== undefined) return currentPrice;
    if (filteredData.length > 0) {
      return filteredData[filteredData.length - 1].close;
    }
    return 0;
  }, [filteredData, currentPrice]);

  // Calculate period change
  const periodChange = useMemo(() => {
    if (change !== undefined && changePercent !== undefined) {
      return { change, changePercent };
    }
    if (filteredData.length >= 2) {
      const first = filteredData[0].close;
      const last = filteredData[filteredData.length - 1].close;
      const change = last - first;
      const changePercent = first !== 0 ? (change / first) * 100 : 0;
      return { change, changePercent };
    }
    return { change: 0, changePercent: 0 };
  }, [filteredData, change, changePercent]);

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  // Calculate normalized Y-axis domain with padding
  const yAxisDomain = useMemo(() => {
    if (filteredData.length === 0) return ['auto', 'auto'];
    
    const values = filteredData.map(d => d.close);
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Add 5% padding on top and bottom for better visualization
    const padding = (max - min) * 0.05;
    const minValue = Math.max(0, min - padding);
    const maxValue = max + padding;
    
    return [minValue, maxValue];
  }, [filteredData]);

  if (loading && cachedHistoricalData.length === 0) {
    return (
      <div className={`${className} bg-gray-100 dark:bg-zinc-900 rounded-xl p-6`}>
        <div className="h-96 flex items-center justify-center">
          <div className="animate-pulse text-gray-600 dark:text-gray-400">
            Loading chart data...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} bg-gray-100 dark:bg-zinc-900 rounded-xl p-6`}>
        <div className="h-96 flex items-center justify-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (filteredData.length === 0) {
    return (
      <div className={`${className} bg-gray-100 dark:bg-zinc-900 rounded-xl p-6`}>
        <div className="h-96 flex items-center justify-center">
          <p className="text-gray-600 dark:text-gray-400">
            No chart data available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Price Info (optional) */}
      {showPriceInfo && (
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              {name && (
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  {name} ({symbol})
                </h3>
              )}
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {formatPrice(displayPrice)}
                <span className={`ml-2 ${getChangeColor(periodChange.change)}`}>
                  {periodChange.change >= 0 ? '+' : ''}
                  {periodChange.changePercent.toFixed(2)}%
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Time Range Selector */}
      {showTimeRangeSelector && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          {TIME_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => handleTimeRangeChange(range.value)}
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
      )}

      {/* Chart */}
      <div 
        className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-6"
        style={{ height: `${height}px` }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={filteredData} 
            margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDarkMode ? '#3f3f46' : '#e4e4e7'}
              opacity={0.5}
            />
            <XAxis
              dataKey="date"
              stroke={isDarkMode ? '#6b7280' : '#9ca3af'}
              tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 12 }}
              angle={timeRange === '1D' || timeRange === '7D' ? 0 : -45}
              textAnchor={timeRange === '1D' || timeRange === '7D' ? 'middle' : 'end'}
              height={timeRange === '1D' || timeRange === '7D' ? 40 : 60}
              interval={timeRange === '1D' ? 2 : getXAxisInterval(timeRange, filteredData.length)}
              tickFormatter={(value) => formatXAxisLabel(value, timeRange)}
              minTickGap={timeRange === '1D' ? 0 : 30}
            />
            <YAxis
              stroke={isDarkMode ? '#6b7280' : '#9ca3af'}
              tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 12 }}
              tickFormatter={(value) => formatPrice(value)}
              domain={yAxisDomain}
              allowDataOverflow={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="linear"
              dataKey="close"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#3b82f6' }}
              isAnimationActive={true}
              animationDuration={300}
              animationEasing="ease-in-out"
            />
            {/* Pulsating dot on last point only */}
            {filteredData.length > 0 && (
              <Line
                type="linear"
                dataKey="close"
                stroke="none"
                dot={(props: any) => {
                  // Only render on the last point
                  if (props.index === filteredData.length - 1) {
                    return (
                      <PulsatingDot
                        {...props}
                        data={filteredData}
                        fill="#3b82f6"
                      />
                    );
                  }
                  return null;
                }}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
