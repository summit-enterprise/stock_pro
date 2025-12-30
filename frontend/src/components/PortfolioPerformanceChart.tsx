'use client';

import { useState, useEffect } from 'react';
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
}

const TIME_RANGES = [
  { label: '1 Day', value: '1D' },
  { label: '1 Week', value: '1W' },
  { label: '1 Month', value: '1M' },
  { label: '3 Months', value: '3M' },
  { label: '6 Months', value: '6M' },
  { label: '1 Year', value: '1Y' },
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

export default function PortfolioPerformanceChart({ token, portfolioItems }: PortfolioPerformanceChartProps) {
  const [timeRange, setTimeRange] = useState('1Y');
  const [selectedPositions, setSelectedPositions] = useState<string>('all');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'pie'>('line');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [performanceData, setPerformanceData] = useState<PerformanceDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Get unique categories from portfolio items
  const categories = Array.from(new Set(portfolioItems.map(item => item.category || item.type || 'Unknown').filter(Boolean)));
  
  // Filter portfolio items by category
  const filteredPortfolioItems = selectedCategory === 'all' 
    ? portfolioItems 
    : portfolioItems.filter(item => (item.category || item.type || 'Unknown') === selectedCategory);

  useEffect(() => {
    if (filteredPortfolioItems.length > 0 && chartType !== 'pie') {
      fetchPerformanceData();
    }
  }, [timeRange, selectedPositions, token, selectedCategory, chartType]);
  
  // Update selected positions when category changes
  useEffect(() => {
    if (selectedCategory !== 'all') {
      // If current selection includes items not in filtered category, reset to 'all'
      if (selectedPositions !== 'all') {
        const selectedSymbols = selectedPositions.split(',').map(s => s.trim());
        const filteredSymbols = filteredPortfolioItems.map(item => item.symbol);
        const hasInvalidSelection = selectedSymbols.some(symbol => !filteredSymbols.includes(symbol));
        if (hasInvalidSelection) {
          setSelectedPositions('all');
        }
      }
    }
  }, [selectedCategory, filteredPortfolioItems, selectedPositions]);

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        timeRange: timeRange,
      });
      
      if (selectedPositions !== 'all') {
        params.append('symbols', selectedPositions);
      }

      const response = await fetch(
        `http://localhost:3001/api/portfolio/performance?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

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
    if (selectedPositions === 'all') {
      return performanceData.map(point => ({
        date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        'Portfolio Value': Math.round(point.totalValue * 100) / 100,
        'Total Cost': Math.round(point.totalCost * 100) / 100,
        'Profit/Loss': Math.round(point.profitLoss * 100) / 100,
      }));
    } else {
      // Show individual positions
      const symbols = selectedPositions.split(',').map(s => s.trim());
      return performanceData.map(point => {
        const dataPoint: any = {
          date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        };
        
        symbols.forEach((symbol) => {
          const trimmedSymbol = symbol.trim();
          const value = point.positions[trimmedSymbol] || 0;
          dataPoint[trimmedSymbol] = Math.round(value * 100) / 100;
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
          category: item.category || item.type || 'Unknown',
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
    if (selectedPositions === 'all') {
      return [
        <Bar key="portfolio-value" dataKey="Portfolio Value" fill="#3B82F6" name="Portfolio Value" />,
        <Bar key="total-cost" dataKey="Total Cost" fill="#6B7280" name="Total Cost" />,
        <Bar key="profit-loss" dataKey="Profit/Loss" fill="#10B981" name="Profit/Loss" />,
      ];
    } else {
      const symbols = selectedPositions.split(',').map(s => s.trim());
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
    if (selectedPositions === 'all') {
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
      const symbols = selectedPositions.split(',').map(s => s.trim());
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
        <div className={`bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg shadow-lg p-3`}>
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
      <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-6">
        <p className="text-gray-600 dark:text-gray-400 text-center">
          Add assets to your portfolio to view performance charts
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-6 mb-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Portfolio Performance
        </h2>
        
        {/* Controls */}
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Time Range Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Time Range:
              </label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TIME_RANGES.map(range => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Chart Type Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Chart Type:
              </label>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value as 'line' | 'bar' | 'pie')}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          {/* Position Selector - Only show for line/bar charts */}
          {chartType !== 'pie' && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Positions:
              </label>
              <select
                value={selectedPositions}
                onChange={(e) => setSelectedPositions(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
              >
                <option value="all">All Positions</option>
                {filteredPortfolioItems.map(item => (
                  <option key={item.symbol} value={item.symbol}>
                    {item.symbol} - {item.name} ({item.category || item.type || 'Unknown'})
                  </option>
                ))}
                {filteredPortfolioItems.length > 1 && (
                  <>
                    <optgroup label="Multiple Positions">
                      {filteredPortfolioItems.slice(0, 5).map((item, index) => {
                        if (index === 0) return null;
                        const selected = filteredPortfolioItems.slice(0, index + 1).map(i => i.symbol).join(',');
                        return (
                          <option key={selected} value={selected}>
                            First {index + 1} positions
                          </option>
                        );
                      })}
                    </optgroup>
                  </>
                )}
              </select>
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
                  label={({ name, percentage }) => {
                    if (percentage < 3) return ''; // Don't show label for very small slices
                    return `${name}\n${percentage}%`;
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
                  formatter={(value: number) => formatCurrency(value)}
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
                  <div key={entry.name} className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700">
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

