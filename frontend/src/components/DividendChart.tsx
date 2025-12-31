'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface Dividend {
  exDate: string;
  paymentDate: string | null;
  recordDate: string | null;
  declaredDate: string | null;
  amount: number;
  currency: string;
  frequency: string | null;
}

interface DividendChartProps {
  dividends: Dividend[];
  symbol: string;
  isDarkMode?: boolean;
}

const TIME_RANGES = [
  { label: '1 Month', value: '1M' },
  { label: '3 Months', value: '3M' },
  { label: '6 Months', value: '6M' },
  { label: '1 Year', value: '1Y' },
  { label: '5 Years', value: '5Y' },
  { label: 'Max', value: 'MAX' },
];

export default function DividendChart({ dividends, symbol, isDarkMode = false }: DividendChartProps) {
  const [timeRange, setTimeRange] = useState('1Y');
  const [showCumulative, setShowCumulative] = useState(true);

  // Filter and format dividend data based on time range
  const chartData = useMemo(() => {
    if (dividends.length === 0) return [];

    const now = new Date();
    let startDate = new Date();

    switch (timeRange) {
      case '1M':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3M':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6M':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1Y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case '5Y':
        startDate.setFullYear(now.getFullYear() - 5);
        break;
      case 'MAX':
        startDate = new Date(0); // All time
        break;
    }

    // Sort dividends by ex-date
    const sortedDividends = [...dividends]
      .filter(div => new Date(div.exDate) >= startDate)
      .sort((a, b) => new Date(a.exDate).getTime() - new Date(b.exDate).getTime());

    if (showCumulative) {
      // Cumulative dividends over time
      let cumulativeAmount = 0;
      return sortedDividends.map(div => {
        cumulativeAmount += div.amount;
        return {
          date: new Date(div.exDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          timestamp: new Date(div.exDate).getTime(),
          amount: div.amount,
          cumulative: cumulativeAmount,
          exDate: div.exDate,
          paymentDate: div.paymentDate,
          recordDate: div.recordDate,
          frequency: div.frequency,
        };
      });
    } else {
      // Individual dividend amounts
      return sortedDividends.map(div => ({
        date: new Date(div.exDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        timestamp: new Date(div.exDate).getTime(),
        amount: div.amount,
        cumulative: div.amount,
        exDate: div.exDate,
        paymentDate: div.paymentDate,
        recordDate: div.recordDate,
        frequency: div.frequency,
      }));
    }
  }, [dividends, timeRange, showCumulative]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;

    const amounts = chartData.map(d => d.amount);
    const total = amounts.reduce((sum, amt) => sum + amt, 0);
    const avg = total / amounts.length;
    const max = Math.max(...amounts);
    const min = Math.min(...amounts);
    const latest = chartData[chartData.length - 1];

    return {
      total,
      avg,
      max,
      min,
      count: chartData.length,
      latest,
    };
  }, [chartData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-3 shadow-lg`}>
          <p className="font-semibold text-gray-900 dark:text-white mb-2">{data.date}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {showCumulative ? 'Cumulative' : 'Dividend'}: <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(data.amount)}</span>
          </p>
          {showCumulative && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total: <span className="font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(data.cumulative)}</span>
            </p>
          )}
          {data.frequency && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Frequency: {data.frequency}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (dividends.length === 0) {
    return (
      <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-12 text-center">
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          No dividend data available for {symbol}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-black rounded-xl shadow-lg p-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            Dividend History
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {showCumulative ? 'Cumulative' : 'Individual'} dividend payments over time
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Time Range Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Period:</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TIME_RANGES.map(range => (
                <option key={range.value} value={range.value}>{range.label}</option>
              ))}
            </select>
          </div>

          {/* Cumulative Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showCumulative}
              onChange={(e) => setShowCumulative(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Cumulative</span>
          </label>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-100 dark:bg-zinc-900 rounded-lg p-3">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total ({timeRange})</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {formatCurrency(stats.total)}
            </p>
          </div>
          <div className="bg-gray-100 dark:bg-zinc-900 rounded-lg p-3">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Average</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {formatCurrency(stats.avg)}
            </p>
          </div>
          <div className="bg-gray-100 dark:bg-zinc-900 rounded-lg p-3">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Max</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              {formatCurrency(stats.max)}
            </p>
          </div>
          <div className="bg-gray-100 dark:bg-zinc-900 rounded-lg p-3">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Min</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {formatCurrency(stats.min)}
            </p>
          </div>
          <div className="bg-gray-100 dark:bg-zinc-900 rounded-lg p-3">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Count</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {stats.count}
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="w-full" style={{ height: '400px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
            <XAxis
              dataKey="date"
              stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
              tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
              tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {showCumulative ? (
              <Line
                type="monotone"
                dataKey="cumulative"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="Cumulative Dividends"
                isAnimationActive={false}
              />
            ) : (
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="Dividend Amount"
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Dividend Details Table */}
      <div className="mt-6 overflow-x-auto">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Dividend Details ({chartData.length} payments)
        </h4>
        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-zinc-900">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Ex-Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Payment Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Record Date</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Amount</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Frequency</th>
                {showCumulative && (
                  <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Cumulative</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
              {chartData.map((data, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-zinc-900">
                  <td className="py-3 px-4 text-gray-900 dark:text-white">{data.date}</td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                    {data.paymentDate ? new Date(data.paymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                    {data.recordDate ? new Date(data.recordDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(data.amount)}
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400 capitalize">
                    {data.frequency || 'N/A'}
                  </td>
                  {showCumulative && (
                    <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">
                      {formatCurrency(data.cumulative)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
