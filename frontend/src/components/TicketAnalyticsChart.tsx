'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface AnalyticsDataPoint {
  period: string;
  count?: number;
  completed?: number;
  total?: number;
  completion_rate?: number;
  avg_resolution_hours?: number;
  status?: string;
  category?: string;
  priority?: string;
}

interface TicketAnalyticsChartProps {
  token: string;
}

export default function TicketAnalyticsChart({ token }: TicketAnalyticsChartProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<string>('30d');
  const [groupBy, setGroupBy] = useState<string>('day');
  const [metric, setMetric] = useState<string>('count');
  const [filterBy, setFilterBy] = useState<string>('all');

  useEffect(() => {
    if (token) {
      fetchAnalytics();
    }
  }, [timeRange, groupBy, metric, filterBy, token]);

  const fetchAnalytics = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        timeRange,
        groupBy,
        metric,
        filterBy,
      });

      const response = await fetch(
        `http://localhost:3001/api/support/admin/tickets/analytics?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data.data || []);
      setLoading(false);
      } else {
        console.error('Error fetching analytics:', response.status);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setLoading(false);
    }
  };

  // Format data for chart based on filterBy
  const formatChartData = () => {
    if (filterBy === 'status') {
      // Group by status
      const statusMap = new Map<string, { [key: string]: number }>();
      
      analyticsData.forEach((point) => {
        const period = point.period;
        const status = point.status || 'unknown';
        const count = point.count || 0;

        if (!statusMap.has(period)) {
          statusMap.set(period, { period });
        }
        statusMap.get(period)![status] = count;
      });

      return Array.from(statusMap.values());
    } else if (filterBy === 'category') {
      // Group by category
      const categoryMap = new Map<string, { [key: string]: number }>();
      
      analyticsData.forEach((point) => {
        const period = point.period;
        const category = point.category || 'unknown';
        const count = point.count || 0;

        if (!categoryMap.has(period)) {
          categoryMap.set(period, { period });
        }
        categoryMap.get(period)![category] = count;
      });

      return Array.from(categoryMap.values());
    } else if (filterBy === 'priority') {
      // Group by priority
      const priorityMap = new Map<string, { [key: string]: number }>();
      
      analyticsData.forEach((point) => {
        const period = point.period;
        const priority = point.priority || 'unknown';
        const count = point.count || 0;

        if (!priorityMap.has(period)) {
          priorityMap.set(period, { period });
        }
        priorityMap.get(period)![priority] = count;
      });

      return Array.from(priorityMap.values());
    } else {
      // Simple count or metric
      return analyticsData.map((point) => ({
        period: point.period,
        value: metric === 'completion_rate' 
          ? point.completion_rate 
          : metric === 'avg_resolution_time'
          ? point.avg_resolution_hours
          : point.count || 0,
      }));
    }
  };

  const chartData = formatChartData();
  const isDarkMode = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Get unique keys for bars (statuses, categories, or priorities)
  const getBarKeys = () => {
    if (filterBy === 'status') {
      return ['open', 'in_progress', 'resolved', 'closed'];
    } else if (filterBy === 'category') {
      const categories = new Set<string>();
      analyticsData.forEach((point) => {
        if (point.category) categories.add(point.category);
      });
      return Array.from(categories);
    } else if (filterBy === 'priority') {
      return ['unknown', 'low', 'medium', 'high', 'urgent'];
    }
    return ['value'];
  };

  const barKeys = getBarKeys();
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (groupBy === 'day') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (groupBy === 'week') {
      return `Week ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
  };

  const formatTooltipValue = (value: any, name: string) => {
    // Recharts may pass value as array, number, or string
    let numValue: number;
    
    if (Array.isArray(value)) {
      // If value is an array, take the first element
      numValue = typeof value[0] === 'number' ? value[0] : parseFloat(String(value[0])) || 0;
    } else if (typeof value === 'number') {
      numValue = value;
    } else {
      // Try to parse as number
      numValue = parseFloat(String(value)) || 0;
    }
    
    // Handle NaN or invalid numbers
    if (isNaN(numValue) || !isFinite(numValue)) {
      numValue = 0;
    }
    
    if (metric === 'completion_rate') {
      return [`${numValue.toFixed(1)}%`, name || 'Completion Rate'];
    } else if (metric === 'avg_resolution_time') {
      return [`${numValue.toFixed(1)} hours`, name || 'Avg Resolution Time'];
    }
    return [numValue, name];
  };

  if (loading) {
    return (
      <div className="bg-blue-50 dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Loading analytics...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Ticket Analytics
        </h3>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Time Range
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="180d">Last 180 Days</option>
              <option value="1y">Last Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Group By
            </label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Metric
            </label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="count">Ticket Count</option>
              <option value="completion_rate">Completion Rate</option>
              <option value="avg_resolution_time">Avg Resolution Time</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter By
            </label>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="all">All Tickets</option>
              <option value="status">By Status</option>
              <option value="category">By Category</option>
              <option value="priority">By Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length === 0 ? (
        <div className="h-96 flex items-center justify-center">
          <div className="text-gray-600 dark:text-gray-400">No analytics data available</div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart 
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={isDarkMode ? '#3f3f46' : '#e4e4e7'} 
            />
            <XAxis 
              dataKey="period"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fill: isDarkMode ? '#a1a1aa' : '#71717a', fontSize: 12 }}
              tickFormatter={formatDate}
            />
            <YAxis 
              tick={{ fill: isDarkMode ? '#a1a1aa' : '#71717a', fontSize: 12 }}
              label={{ 
                value: metric === 'completion_rate' ? 'Completion Rate (%)' : 
                       metric === 'avg_resolution_time' ? 'Hours' : 'Count',
                angle: -90, 
                position: 'insideLeft',
                style: { fill: isDarkMode ? '#a1a1aa' : '#71717a' }
              }}
            />
            <Tooltip 
              formatter={formatTooltipValue}
              contentStyle={{
                backgroundColor: isDarkMode ? '#27272a' : '#ffffff',
                border: `1px solid ${isDarkMode ? '#3f3f46' : '#e4e4e7'}`,
                color: isDarkMode ? '#ffffff' : '#000000',
              }}
              labelFormatter={(label) => formatDate(label)}
            />
            <Legend 
              wrapperStyle={{ color: isDarkMode ? '#ffffff' : '#000000' }}
            />
            {barKeys.map((key, index) => (
              <Bar 
                key={key}
                dataKey={key}
                fill={colors[index % colors.length]}
                name={key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

