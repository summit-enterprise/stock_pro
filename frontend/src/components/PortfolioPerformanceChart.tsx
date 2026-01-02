'use client';

import { useState, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import AssetIcon from './AssetIcon';

interface PerformanceDataPoint {
  date: string;
  totalValue: number;
  totalCost: number;
  profitLoss: number;
  profitLossPercent: number;
  positions: { [symbol: string]: number };
}

interface PortfolioPerformanceChartProps {
  token: string;
  portfolioItems: Array<{ 
    symbol: string; 
    name: string; 
    type?: string; 
    category?: string;
    totalMarketValue?: number;
    logoUrl?: string | null;
  }>;
  onSelectionChange?: (selectedSymbols: Set<string>) => void;
}

const TIME_RANGES = [
  { label: '1 Day', value: '1D' },
  { label: '7 Days', value: '7D' },
  { label: '1 Month', value: '1M' },
  { label: '3 Months', value: '3M' },
  { label: '6 Months', value: '6M' },
  { label: 'YTD', value: 'YTD' },
  { label: '3 Years', value: '3Y' },
  { label: '5 Years', value: '5Y' },
  { label: 'MAX', value: 'MAX' },
];

const CHART_TYPES = [
  { label: 'Line', value: 'line' },
  { label: 'Bar', value: 'bar' },
  { label: 'Pie', value: 'pie' },
];

const COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Orange
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#6366F1', // Indigo
];

export default function PortfolioPerformanceChart({ token, portfolioItems, onSelectionChange }: PortfolioPerformanceChartProps) {
  const [timeRange, setTimeRange] = useState('1Y');
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set());
  const [chartType, setChartType] = useState<'line' | 'bar' | 'pie'>('line');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [performanceData, setPerformanceData] = useState<PerformanceDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPositionDropdownOpen, setIsPositionDropdownOpen] = useState(false);
  const [useCustomDates, setUseCustomDates] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const positionDropdownRef = useRef<HTMLDivElement>(null);
  
  // Initialize default dates (1 year ago to today)
  useEffect(() => {
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(oneYearAgo.toISOString().split('T')[0]);
  }, []);
  
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
  
  // Get unique categories from portfolio items (normalized)
  const categories = Array.from(new Set(
    portfolioItems.map(item => normalizeCategory(item.category || item.type || 'Unknown')).filter(Boolean)
  )).sort();
  
  // Filter portfolio items by category
  const filteredPortfolioItems = selectedCategory === 'all' 
    ? portfolioItems 
    : portfolioItems.filter(item => normalizeCategory(item.category || item.type || 'Unknown') === selectedCategory);

  // Convert selectedPositions Set to string for dependency tracking
  const selectedPositionsKey = Array.from(selectedPositions).sort().join(',');
  
  useEffect(() => {
    if (filteredPortfolioItems.length > 0 && chartType !== 'pie') {
      fetchPerformanceData();
    }
  }, [timeRange, selectedPositionsKey, token, selectedCategory, chartType, portfolioItems, useCustomDates, startDate, endDate]);
  
  // Update selected positions when category or portfolio items change
  useEffect(() => {
    if (selectedCategory !== 'all') {
      // If current selection includes items not in filtered category, remove them
      const filteredSymbols = new Set(filteredPortfolioItems.map(item => item.symbol));
      const newSelection = new Set(Array.from(selectedPositions).filter(symbol => filteredSymbols.has(symbol)));
      if (newSelection.size !== selectedPositions.size) {
        setSelectedPositions(newSelection);
      }
    }
    
    // If portfolio items change, refresh data
    if (timeRange && token && chartType !== 'pie') {
      fetchPerformanceData();
    }
  }, [selectedCategory, filteredPortfolioItems, portfolioItems]);

  // Notify parent of selection changes
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedPositions);
    }
  }, [selectedPositions, onSelectionChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (positionDropdownRef.current && !positionDropdownRef.current.contains(event.target as Node)) {
        setIsPositionDropdownOpen(false);
      }
    };

    if (isPositionDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPositionDropdownOpen]);

  const fetchPerformanceData = async () => {
    // Check if user is banned/restricted before fetching
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        if (parsedUser.is_banned || parsedUser.is_restricted) {
          setLoading(false);
          return; // Don't fetch data for banned/restricted users
        }
      } catch (e) {
        // Continue if parsing fails
      }
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      // Use custom dates if enabled, otherwise use time range
      if (useCustomDates && startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      } else {
        params.append('timeRange', timeRange);
      }
      
      if (selectedPositions.size > 0 && selectedPositions.size < filteredPortfolioItems.length) {
        params.append('symbols', Array.from(selectedPositions).join(','));
      }

      const response = await fetch(
        `http://localhost:3001/api/portfolio/performance?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.status === 403) {
        // User is banned/restricted, don't process response
        setLoading(false);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setPerformanceData(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format chart data for line/bar charts
  const formatChartData = () => {
    const isAllSelected = selectedPositions.size === 0 || selectedPositions.size === filteredPortfolioItems.length;
    
    if (isAllSelected) {
      return performanceData.map(point => ({
        date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        'Portfolio Value': Math.round(point.totalValue * 100) / 100,
        'Total Cost': Math.round(point.totalCost * 100) / 100,
        'Profit/Loss': Math.round(point.profitLoss * 100) / 100,
      }));
    } else {
      // Show individual positions
      const symbols = Array.from(selectedPositions);
      return performanceData.map(point => {
        const dataPoint: any = {
          date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        };
        
        symbols.forEach((symbol) => {
          const value = point.positions[symbol] || 0;
          dataPoint[symbol] = Math.round(value * 100) / 100;
        });
        
        return dataPoint;
      });
    }
  };

  // Format pie chart data (current portfolio allocation)
  const formatPieChartData = () => {
    // Calculate total value from current portfolio items
    const totalValue = filteredPortfolioItems.reduce((sum, item) => {
      return sum + (item.totalMarketValue || 0);
    }, 0);
    
    if (totalValue === 0) return [];
    
    const pieData = filteredPortfolioItems
      .map(item => {
        const value = item.totalMarketValue || 0;
        const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
        return {
          name: item.symbol,
          value: Math.round(value * 100) / 100,
          percentage: Math.round(percentage * 100) / 100,
          category: normalizeCategory(item.category || item.type || 'Unknown'),
        };
      })
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
    
    return pieData;
  };

  const chartData = formatChartData();
  const pieChartData = formatPieChartData();
  const isDarkMode = typeof window !== 'undefined' && 
    (document.documentElement.classList.contains('dark') ||
     window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  // Get bars to render (for bar chart)
  const getBars = () => {
    const isAllSelected = selectedPositions.size === 0 || selectedPositions.size === filteredPortfolioItems.length;
    
    if (isAllSelected) {
      return [
        <Bar key="portfolio-value" dataKey="Portfolio Value" fill="#3B82F6" name="Portfolio Value" />,
        <Bar key="total-cost" dataKey="Total Cost" fill="#6B7280" name="Total Cost" />,
        <Bar key="profit-loss" dataKey="Profit/Loss" fill="#10B981" name="Profit/Loss" />,
      ];
    } else {
      const symbols = Array.from(selectedPositions);
      return symbols.map((symbol, index) => (
        <Bar
          key={symbol}
          dataKey={symbol}
          fill={COLORS[index % COLORS.length]}
          name={symbol}
        />
      ));
    }
  };

  // Get lines to render
  const getLines = () => {
    const isAllSelected = selectedPositions.size === 0 || selectedPositions.size === filteredPortfolioItems.length;
    
    if (isAllSelected) {
      return [
        <Line 
          key="portfolio-value" 
          type="linear" 
          dataKey="Portfolio Value" 
          stroke="#3B82F6" 
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: '#3B82F6', fill: '#fff' }}
          isAnimationActive={false}
          connectNulls={false}
          name="Portfolio Value"
        />,
        <Line 
          key="total-cost" 
          type="linear" 
          dataKey="Total Cost" 
          stroke="#6B7280" 
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: '#6B7280', fill: '#fff' }}
          isAnimationActive={false}
          connectNulls={false}
          name="Total Cost"
        />,
        <Line 
          key="profit-loss" 
          type="linear" 
          dataKey="Profit/Loss" 
          stroke="#10B981" 
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: '#10B981', fill: '#fff' }}
          isAnimationActive={false}
          connectNulls={false}
          name="Profit/Loss"
        />,
      ];
    } else {
      const symbols = Array.from(selectedPositions);
      return symbols.map((symbol, index) => (
        <Line
          key={symbol}
          type="linear"
          dataKey={symbol}
          stroke={COLORS[index % COLORS.length]}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: COLORS[index % COLORS.length], fill: '#fff' }}
          isAnimationActive={false}
          connectNulls={false}
          name={symbol}
        />
      ));
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={`bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg shadow-lg p-3`}>
          <p className="font-semibold text-gray-900 dark:text-white mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (portfolioItems.length === 0) {
    return (
      <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-6">
        <p className="text-gray-600 dark:text-gray-400 text-center">
          Add assets to your portfolio to view performance charts
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-6 mb-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Portfolio Performance
        </h2>
        
        {/* Controls */}
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            {/* Time Range Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Time Range:
              </label>
              <select
                value={timeRange}
                onChange={(e) => {
                  setTimeRange(e.target.value);
                  setUseCustomDates(false);
                }}
                disabled={useCustomDates}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-600 rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {TIME_RANGES.map(range => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Date Range Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={useCustomDates}
                onChange={(e) => setUseCustomDates(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
              />
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Custom Dates
              </label>
            </div>

            {/* Custom Date Inputs */}
            {useCustomDates && (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    From:
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={endDate || new Date().toISOString().split('T')[0]}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-600 rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    To:
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    max={new Date().toISOString().split('T')[0]}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-600 rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {/* Chart Type Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Chart Type:
              </label>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value as 'line' | 'bar' | 'pie')}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-600 rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CHART_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Category:
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

          {/* Position Selector with Dropdown - Only show for line/bar charts */}
          {chartType !== 'pie' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Positions:
                </label>
                <button
                  onClick={() => {
                    const allSymbols = new Set(filteredPortfolioItems.map(item => item.symbol));
                    setSelectedPositions(allSymbols);
                  }}
                  className="px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={() => {
                    setSelectedPositions(new Set());
                  }}
                  className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-colors"
                >
                  Clear All
                </button>
              </div>
              <div className="relative" ref={positionDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsPositionDropdownOpen(!isPositionDropdownOpen)}
                  className="w-full px-3 py-2 text-sm text-left border border-gray-300 dark:border-zinc-600 rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
                >
                  <span className="truncate">
                    {selectedPositions.size === 0
                      ? 'All positions'
                      : selectedPositions.size === filteredPortfolioItems.length
                      ? 'All positions selected'
                      : `${selectedPositions.size} position${selectedPositions.size === 1 ? '' : 's'} selected`}
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${
                      isPositionDropdownOpen ? 'transform rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isPositionDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded-md shadow-lg max-h-64 overflow-y-auto">
                    <div className="p-2 space-y-1">
                      {filteredPortfolioItems.map((item) => {
                        const category = normalizeCategory(item.category || item.type || 'Unknown');
                        const isSelected = selectedPositions.has(item.symbol);
                        return (
                          <label
                            key={item.symbol}
                            className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-zinc-700 rounded cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const newSelection = new Set(selectedPositions);
                                if (e.target.checked) {
                                  newSelection.add(item.symbol);
                                } else {
                                  newSelection.delete(item.symbol);
                                }
                                setSelectedPositions(newSelection);
                              }}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                            />
                            <span className="text-sm text-gray-900 dark:text-white flex-1">
                              <span className="font-medium">{item.symbol}</span>
                              <span className="text-gray-600 dark:text-gray-400 ml-2">
                                - {item.name} ({category})
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-96 flex items-center justify-center">
          <div className="text-gray-600 dark:text-gray-400">Loading performance data...</div>
        </div>
      ) : chartType === 'pie' ? (
        // Pie Chart
        pieChartData.length === 0 ? (
          <div className="h-96 flex items-center justify-center">
            <div className="text-gray-600 dark:text-gray-400">No portfolio data available</div>
          </div>
        ) : (
          <div>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => {
                    const percentage = entry.percentage || 0;
                    if (percentage < 3) return ''; // Don't show label for very small slices
                    return `${entry.name}\n${percentage.toFixed(1)}%`;
                  }}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number | undefined) => formatCurrency(value || 0)}
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
                    border: `1px solid ${isDarkMode ? '#3f3f46' : '#e4e4e7'}`,
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Custom Legend with Icons */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pieChartData.map((entry, index) => {
                const portfolioItem = filteredPortfolioItems.find(p => p.symbol === entry.name);
                return (
                  <div key={entry.name} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <AssetIcon
                      symbol={entry.name}
                      name={portfolioItem?.name}
                      type={portfolioItem?.type}
                      category={portfolioItem?.category}
                      logoUrl={portfolioItem?.logoUrl}
                      size={20}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {entry.name}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {entry.category} • {entry.percentage}%
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(entry.value)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : chartType === 'bar' ? (
        // Bar Chart
        chartData.length === 0 ? (
          <div className="h-96 flex items-center justify-center">
            <div className="text-gray-600 dark:text-gray-400">No performance data available</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart 
              data={chartData} 
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              syncId="portfolio-performance"
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={isDarkMode ? '#3f3f46' : '#e4e4e7'} 
              />
              <XAxis 
                dataKey="date" 
                stroke={isDarkMode ? '#a1a1aa' : '#71717a'}
                tick={{ fill: isDarkMode ? '#a1a1aa' : '#71717a' }}
                type="category"
                allowDuplicatedCategory={false}
              />
              <YAxis 
                stroke={isDarkMode ? '#a1a1aa' : '#71717a'}
                tick={{ fill: isDarkMode ? '#a1a1aa' : '#71717a' }}
                tickFormatter={(value) => formatCurrency(value)}
                domain={['auto', 'auto']}
              />
              <Tooltip 
                content={<CustomTooltip />}
                cursor={{ fill: isDarkMode ? 'rgba(63, 63, 70, 0.2)' : 'rgba(228, 228, 231, 0.2)' }}
              />
              <Legend 
                wrapperStyle={{ color: isDarkMode ? '#ffffff' : '#000000' }}
              />
              {getBars()}
            </BarChart>
          </ResponsiveContainer>
        )
      ) : (
        // Line Chart
        chartData.length === 0 ? (
          <div className="h-96 flex items-center justify-center">
            <div className="text-gray-600 dark:text-gray-400">No performance data available</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart 
              data={chartData} 
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              syncId="portfolio-performance"
              throttleDelay={16}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={isDarkMode ? '#3f3f46' : '#e4e4e7'} 
              />
              <XAxis 
                dataKey="date" 
                stroke={isDarkMode ? '#a1a1aa' : '#71717a'}
                tick={{ fill: isDarkMode ? '#a1a1aa' : '#71717a' }}
                type="category"
                allowDuplicatedCategory={false}
              />
              <YAxis 
                stroke={isDarkMode ? '#a1a1aa' : '#71717a'}
                tick={{ fill: isDarkMode ? '#a1a1aa' : '#71717a' }}
                tickFormatter={(value) => formatCurrency(value)}
                domain={['auto', 'auto']}
              />
              <Tooltip 
                content={<CustomTooltip />}
                cursor={{ stroke: isDarkMode ? '#71717a' : '#a1a1aa', strokeWidth: 1, strokeDasharray: '3 3' }}
                allowEscapeViewBox={{ x: true, y: true }}
              />
              <Legend 
                wrapperStyle={{ color: isDarkMode ? '#ffffff' : '#000000' }}
              />
              {getLines()}
            </LineChart>
          </ResponsiveContainer>
        )
      )}
    </div>
  );
}

