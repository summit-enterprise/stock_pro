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

interface BillingData {
  serviceName: string;
  aggregationDate: string;
  totalCost: number;
  totalUsage: number;
  usageUnit: string;
  currency: string;
}

interface Service {
  serviceName: string;
  serviceId: string;
}

interface BillingChartsProps {
  token: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export default function BillingCharts({ token }: BillingChartsProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<string>('all');
  const [viewType, setViewType] = useState<'cost' | 'usage'>('cost');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [aggregatedData, setAggregatedData] = useState<BillingData[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadServices();
    loadBillingData();
  }, [token]);

  useEffect(() => {
    loadBillingData();
  }, [selectedService, dateRange, token]);

  const loadServices = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/admin/billing/services', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setServices(data.services || []);
      }
    } catch (error) {
      console.error('Failed to load services:', error);
    }
  };

  const loadBillingData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.start,
        endDate: dateRange.end,
      });
      if (selectedService !== 'all') {
        params.append('serviceName', selectedService);
      }

      const response = await fetch(
        `http://localhost:3001/api/admin/billing/aggregates?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAggregatedData(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch('http://localhost:3001/api/admin/billing/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: dateRange.start,
          endDate: dateRange.end,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Synced ${data.recordCount} billing records`);
        loadBillingData();
      } else {
        alert('Failed to sync billing data');
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert('Failed to sync billing data');
    } finally {
      setSyncing(false);
    }
  };

  // Prepare chart data
  const prepareChartData = () => {
    // Group by date
    const byDate: Record<string, { date: string; [key: string]: any }> = {};

    aggregatedData.forEach((item) => {
      const date = item.aggregationDate;
      if (!byDate[date]) {
        byDate[date] = { date };
      }
      byDate[date][item.serviceName] = viewType === 'cost' ? item.totalCost : item.totalUsage;
    });

    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  };

  // Prepare pie chart data (aggregate by service)
  const preparePieData = () => {
    const byService: Record<string, number> = {};

    aggregatedData.forEach((item) => {
      if (!byService[item.serviceName]) {
        byService[item.serviceName] = 0;
      }
      byService[item.serviceName] += viewType === 'cost' ? item.totalCost : item.totalUsage;
    });

    return Object.entries(byService)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  const chartData = prepareChartData();
  const pieData = preparePieData();

  const formatValue = (value: number) => {
    if (viewType === 'cost') {
      return `$${value.toFixed(2)}`;
    }
    // Format usage based on unit
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(2)}B`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(2)}K`;
    return value.toFixed(2);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Service Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Service
            </label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Services</option>
              {services.map((service) => (
                <option key={service.serviceName} value={service.serviceName}>
                  {service.serviceName}
                </option>
              ))}
            </select>
          </div>

          {/* View Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              View Type
            </label>
            <select
              value={viewType}
              onChange={(e) => setViewType(e.target.value as 'cost' | 'usage')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="cost">Cost</option>
              <option value="usage">Usage</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Sync Button */}
        <div className="mt-4">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
          >
            {syncing ? 'Syncing...' : 'Sync from GCP'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
      ) : aggregatedData.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No billing data available for the selected date range.
          </p>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
          >
            {syncing ? 'Syncing...' : 'Sync from GCP'}
          </button>
        </div>
      ) : (
        <>
          {/* Time Series Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {viewType === 'cost' ? 'Cost' : 'Usage'} Over Time
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={formatValue} />
                <Tooltip formatter={(value: number) => formatValue(value)} />
                <Legend />
                {selectedService === 'all'
                  ? Array.from(new Set(aggregatedData.map(d => d.serviceName)))
                      .slice(0, 8)
                      .map((serviceName, index) => (
                        <Line
                          key={serviceName}
                          type="monotone"
                          dataKey={serviceName}
                          stroke={COLORS[index % COLORS.length]}
                          strokeWidth={2}
                        />
                      ))
                  : (
                    <Line
                      type="monotone"
                      dataKey={selectedService}
                      stroke={COLORS[0]}
                      strokeWidth={2}
                    />
                  )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart - Aggregate by Service */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Total {viewType === 'cost' ? 'Cost' : 'Usage'} by Service
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={pieData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis tickFormatter={formatValue} />
                <Tooltip formatter={(value: number) => formatValue(value)} />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart - Service Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {viewType === 'cost' ? 'Cost' : 'Usage'} Distribution by Service
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatValue(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

