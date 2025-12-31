'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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

interface HistoricalDataPoint {
  timestamp: number;
  date: string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
}

interface MarketChartProps {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  category?: string;
  isDarkMode?: boolean;
}

const TIME_RANGES = [
  { label: '1D', value: '1D' },
  { label: '5D', value: '5D' },
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '6M', value: '6M' },
  { label: 'YTD', value: 'YTD' },
  { label: '1Y', value: '1Y' },
  { label: '3Y', value: '3Y' },
  { label: '5Y', value: '5Y' },
  { label: '10Y', value: '10Y' },
  { label: 'MAX', value: 'MAX' },
];

export default function MarketChart({ symbol, name, currentPrice, change, changePercent, category, isDarkMode = false }: MarketChartProps) {
  const [timeRange, setTimeRange] = useState('1Y'); // Start with 1Y for faster initial load
  const [allHistoricalData, setAllHistoricalData] = useState<HistoricalDataPoint[]>([]); // Store all data
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]); // Filtered data for current time range
  const [loading, setLoading] = useState(true);
  const [minDate, setMinDate] = useState<string>('');
  const [maxDate, setMaxDate] = useState<string>('');

  // Filter data based on selected time range (no API call needed)
  const filterDataByTimeRange = useCallback(() => {
    if (allHistoricalData.length === 0) return;

    const now = new Date();
    let cutoffDate: Date;
    
    switch (timeRange) {
      case '1D':
        cutoffDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
        break;
      case '5D':
        cutoffDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
        break;
      case '1M':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3M':
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '6M':
        cutoffDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case 'YTD':
        cutoffDate = new Date(now.getFullYear(), 0, 1);
        break;
      case '1Y':
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case '3Y':
        cutoffDate = new Date(now.getTime() - 3 * 365 * 24 * 60 * 60 * 1000);
        break;
      case '5Y':
        cutoffDate = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000);
        break;
      case '10Y':
        cutoffDate = new Date(now.getTime() - 10 * 365 * 24 * 60 * 60 * 1000);
        break;
      case 'MAX':
      default:
        cutoffDate = new Date(0); // Show all data
        break;
    }

    // Filter data points after cutoff date
    let filtered = allHistoricalData.filter(point => point.timestamp >= cutoffDate.getTime());

    // Format dates based on time range for display
    filtered = filtered.map(point => {
      const date = point.dateObj;
      let dateString: string;
      
      if (timeRange === '1D') {
        dateString = date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
      } else if (timeRange === '5D') {
        dateString = date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
      } else {
        dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      
      return {
        ...point,
        date: dateString,
      };
    });

    // For 1D and 5D, sample data points to avoid overcrowding
    if (timeRange === '1D' && filtered.length > 50) {
      const step = Math.ceil(filtered.length / 50);
      filtered = filtered.filter((_, index) => index % step === 0 || index === filtered.length - 1);
    } else if (timeRange === '5D' && filtered.length > 100) {
      const step = Math.ceil(filtered.length / 100);
      filtered = filtered.filter((_, index) => index % step === 0 || index === filtered.length - 1);
    }

    setHistoricalData(filtered);
    
    // Set min/max dates
    if (filtered.length > 0) {
      setMinDate(filtered[0].date);
      setMaxDate(filtered[filtered.length - 1].date);
    }
  }, [timeRange, allHistoricalData]);

  // Track previous symbol to detect changes
  const [prevSymbol, setPrevSymbol] = useState<string>('');

  // Fetch data when symbol changes - keep old data visible during transition
  useEffect(() => {
    if (symbol && symbol !== prevSymbol) {
      setPrevSymbol(symbol);
      // Don't clear data immediately - keep old chart visible while loading new data
      // This prevents the jarring refresh effect
      setLoading(true);
      // Fetch new data for the new symbol
      fetchAllChartData();
    }
  }, [symbol, prevSymbol]);

  // Handle time range changes - only fetch more data if needed
  useEffect(() => {
    if (symbol && allHistoricalData.length > 0) {
      // If switching to MAX or 10Y, check if we need more data
      if (timeRange === 'MAX' || timeRange === '10Y') {
        const currentMaxDate = allHistoricalData.length > 0 
          ? new Date(Math.max(...allHistoricalData.map(d => d.timestamp)))
          : null;
        const needsMoreData = timeRange === 'MAX' || 
          (timeRange === '10Y' && currentMaxDate && (Date.now() - currentMaxDate.getTime()) < 10 * 365 * 24 * 60 * 60 * 1000);
        
        if (needsMoreData) {
          fetchAllChartData();
        }
      }
    }
  }, [timeRange]);

  // Filter data when time range changes or when new data is loaded (no reload needed)
  useEffect(() => {
    if (allHistoricalData.length > 0) {
      // Use requestAnimationFrame for smoother updates
      requestAnimationFrame(() => {
        filterDataByTimeRange();
        // Small delay before clearing loading to ensure smooth transition
        requestAnimationFrame(() => {
          setLoading(false);
        });
      });
    }
  }, [timeRange, allHistoricalData, filterDataByTimeRange]);
  
  // Initial fetch when component mounts
  useEffect(() => {
    if (symbol && allHistoricalData.length === 0) {
      fetchAllChartData();
    }
  }, [symbol]);

  // Fetch chart data - start with current time range, then load more if needed
  const fetchAllChartData = async () => {
    // Don't set loading to true immediately - keep old data visible
    // Only show loading if we have no data at all
    const wasEmpty = allHistoricalData.length === 0;
    if (wasEmpty) {
      setLoading(true);
    }
    
    try {
      // URL encode the symbol to handle special characters like ^
      const encodedSymbol = encodeURIComponent(symbol);
      const token = localStorage.getItem('token');
      
      // For initial load, fetch based on timeRange (faster)
      // If user selects MAX later, we'll fetch that
      const rangeToFetch = timeRange === 'MAX' ? 'MAX' : (timeRange === '10Y' ? '10Y' : '5Y');
      
      const response = await fetch(`http://localhost:3001/api/assets/${encodedSymbol}?range=${rangeToFetch}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`API error for ${symbol}:`, response.status, errorData);
        if (wasEmpty) {
          setLoading(false);
        }
        return;
      }
      
      const data = await response.json();
      
      if (data.error) {
        console.error(`API returned error for ${symbol}:`, data.error, data.message);
        if (wasEmpty) {
          setLoading(false);
        }
        return;
      }
      
      if (data.historicalData && data.historicalData.length > 0) {
        // Format all data - store with full date info
        const formatted = data.historicalData.map((point: any) => {
          const timestamp = point.timestamp || (point.date ? new Date(point.date).getTime() : Date.now());
          const date = new Date(timestamp);
          
          return {
            timestamp: timestamp,
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            dateObj: date,
            close: parseFloat(point.close),
            open: point.open ? parseFloat(point.open) : undefined,
            high: point.high ? parseFloat(point.high) : undefined,
            low: point.low ? parseFloat(point.low) : undefined,
            volume: point.volume ? parseFloat(point.volume) : undefined,
          };
        }).sort((a, b) => a.timestamp - b.timestamp);

        // Update data atomically to prevent partial rendering
        // Use a small delay to ensure smooth visual transition
        requestAnimationFrame(() => {
          setAllHistoricalData(formatted);
          // Initial filter will be triggered by useEffect when allHistoricalData is set
        });
      } else {
        console.warn(`No historical data returned for ${symbol}. Response:`, data);
        if (wasEmpty) {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
      if (wasEmpty) {
        setLoading(false);
      }
    } finally {
      // Only set loading to false if we were showing loading state
      if (wasEmpty) {
        setLoading(false);
      }
    }
  };

  // Calculate price change for the selected period
  const periodChange = useMemo(() => {
    if (historicalData.length < 2) return { value: 0, percent: 0 };
    const firstPrice = historicalData[historicalData.length - 1].close;
    const lastPrice = historicalData[0].close;
    const changeValue = lastPrice - firstPrice;
    const changePercent = firstPrice !== 0 ? (changeValue / firstPrice) * 100 : 0;
    return { value: changeValue, percent: changePercent };
  }, [historicalData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return dateString;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-3 shadow-lg`}>
          <p className="font-semibold text-gray-900 dark:text-white mb-2">{data.date}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Price: <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(data.close)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Calculate appropriate interval for X-axis based on time range and data length
  // Interval in Recharts means "show every Nth tick" (0 = all, 1 = every other, etc.)
  const getXAxisInterval = () => {
    const dataLength = historicalData.length;
    const maxLabels = 12; // Maximum number of labels to show
    
    if (timeRange === '1D') {
      // For 1 day, show ~8-10 labels max
      return dataLength <= maxLabels ? 0 : Math.max(1, Math.floor(dataLength / 10));
    } else if (timeRange === '5D') {
      // For 5 days, show ~6-8 labels max
      return dataLength <= maxLabels ? 0 : Math.max(1, Math.floor(dataLength / 8));
    } else if (timeRange === '1M' || timeRange === '3M') {
      // For 1-3 months, show ~8-10 labels max
      return dataLength <= maxLabels ? 0 : Math.max(1, Math.floor(dataLength / 10));
    } else if (timeRange === '6M' || timeRange === 'YTD' || timeRange === '1Y') {
      // For 6 months to 1 year, show ~6-8 labels max
      return dataLength <= maxLabels ? 0 : Math.max(1, Math.floor(dataLength / 8));
    } else if (timeRange === '3Y' || timeRange === '5Y') {
      // For 3-5 years, show ~8-10 labels max
      return dataLength <= maxLabels ? 0 : Math.max(1, Math.floor(dataLength / 10));
    } else {
      // For 10Y and MAX, show ~10-12 labels max
      return dataLength <= maxLabels ? 0 : Math.max(1, Math.floor(dataLength / 12));
    }
  };

  // Format X-axis labels based on time range
  const formatXAxisLabel = (tickItem: string, payload?: any) => {
    if (!tickItem) return '';
    
    // Try to get dateObj from payload if available
    let date: Date;
    if (payload && payload.dateObj) {
      date = payload.dateObj;
    } else {
      // Fallback to parsing the string
      date = new Date(tickItem);
      if (isNaN(date.getTime())) {
        // If parsing fails, return the original string
        return tickItem;
      }
    }
    
    if (timeRange === '1D') {
      // For 1 day, show time (hour:minute)
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else if (timeRange === '5D') {
      // For 5 days, show day and time
      return date.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
    } else if (timeRange === '1M' || timeRange === '3M') {
      // For 1-3 months, show month and day
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (timeRange === '6M' || timeRange === 'YTD' || timeRange === '1Y') {
      // For 6 months to 1 year, show month and year
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    } else if (timeRange === '3Y' || timeRange === '5Y') {
      // For 3-5 years, show month and year (abbreviated)
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    } else {
      // For 10Y and MAX, show year only or month/year
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
  };

  // Get appropriate angle and height for X-axis based on time range
  const getXAxisConfig = () => {
    if (timeRange === '1D' || timeRange === '5D') {
      return { angle: 0, textAnchor: 'middle' as const, height: 50 };
    } else if (timeRange === '1M' || timeRange === '3M') {
      return { angle: -45, textAnchor: 'end' as const, height: 70 };
    } else {
      return { angle: -45, textAnchor: 'end' as const, height: 80 };
    }
  };

  const xAxisConfig = getXAxisConfig();

  // Only show loading skeleton if we have no data at all
  if (loading && historicalData.length === 0 && allHistoricalData.length === 0) {
    return (
      <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-8 animate-pulse">
        <div className="h-96 bg-gray-200 dark:bg-zinc-800 rounded"></div>
      </div>
    );
  }

  // If we have no data after loading, show message
  if (!loading && historicalData.length === 0 && allHistoricalData.length === 0) {
    return (
      <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">No chart data available for {name}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-6 border border-gray-200 dark:border-zinc-800">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {name}
            </h3>
            {category && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                {category}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>Min Date: {minDate}</span>
            <span>Max Date: {maxDate}</span>
            <span>Price</span>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex flex-wrap gap-2">
          {TIME_RANGES.map(range => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                timeRange === range.value
                  ? 'bg-blue-600 dark:bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-700'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Price Information */}
      <div className="mb-6 flex items-baseline gap-4">
        <div>
          <p className="text-4xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(currentPrice)}
          </p>
          <p className={`text-lg font-semibold mt-1 ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {change >= 0 ? '+' : ''}{formatCurrency(change)} ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
          </p>
          {periodChange.value !== 0 && (
            <p className={`text-sm mt-1 ${periodChange.value >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {periodChange.value >= 0 ? '+' : ''}{formatCurrency(periodChange.value)} ({periodChange.percent >= 0 ? '+' : ''}{periodChange.percent.toFixed(1)}%) past {TIME_RANGES.find(r => r.value === timeRange)?.label.toLowerCase() || timeRange}
            </p>
          )}
        </div>
      </div>

      {/* Chart */}
      <div 
        className="w-full transition-opacity duration-200 ease-in-out" 
        style={{ 
          height: '500px', 
          opacity: loading && historicalData.length > 0 ? 0.4 : 1 
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={historicalData}
            margin={{ 
              top: 20, 
              right: 30, 
              left: 20, 
              bottom: Math.max(30, xAxisConfig.height - 30) // Further reduced bottom margin
            }}
            syncId={symbol}
          >
            {/* Beautiful grid lines */}
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={isDarkMode ? '#3f3f46' : '#e4e4e7'}
              opacity={0.5}
            />
            <XAxis
              dataKey="date"
              stroke={isDarkMode ? '#6b7280' : '#9ca3af'}
              tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 13, fontWeight: 500 }}
              angle={xAxisConfig.angle}
              textAnchor={xAxisConfig.textAnchor}
              height={xAxisConfig.height}
              tickFormatter={(value, index) => {
                // Find the corresponding data point to access dateObj
                const dataPoint = historicalData.find(d => d.date === value);
                if (dataPoint && dataPoint.dateObj) {
                  return formatXAxisLabel(value, { dateObj: dataPoint.dateObj });
                }
                return formatXAxisLabel(value);
              }}
              axisLine={{ stroke: isDarkMode ? '#6b7280' : '#9ca3af', strokeWidth: 1 }}
              tickLine={{ stroke: isDarkMode ? '#6b7280' : '#9ca3af', strokeWidth: 1 }}
              interval={getXAxisInterval()}
            />
            <YAxis
              stroke={isDarkMode ? '#6b7280' : '#9ca3af'}
              tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 13, fontWeight: 500 }}
              tickFormatter={(value) => formatCurrency(value)}
              domain={['auto', 'auto']}
              axisLine={{ stroke: isDarkMode ? '#6b7280' : '#9ca3af', strokeWidth: 1 }}
              tickLine={{ stroke: isDarkMode ? '#6b7280' : '#9ca3af', strokeWidth: 1 }}
            />
            <Tooltip 
              content={<CustomTooltip />}
              cursor={{ stroke: '#10B981', strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            {/* Area fill - solid green matching the line color */}
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
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}

