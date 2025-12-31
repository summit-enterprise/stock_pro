'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
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

interface Filing {
  id?: number;
  symbol: string;
  companyName: string;
  category: string;
  exchange?: string;
  filingType: string;
  filingDate: string;
  reportDate: string | null;
  accessionNumber: string;
  documentUrl: string | null;
  description: string | null;
  formType: string | null;
  periodEnd: string | null;
}

interface FilingStats {
  filingType: string;
  count: number;
  lastFiling: string;
}

export default function SECFilingsPage() {
  const router = useRouter();
  const [filings, setFilings] = useState<Filing[]>([]);
  const [stats, setStats] = useState<FilingStats[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [timeRange, setTimeRange] = useState('1Y');
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check dark mode
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
    fetchFilings();
    fetchChartData();
  }, [filterType, searchQuery, sortOrder, timeRange]);

  const fetchFilings = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const params = new URLSearchParams();
      params.append('limit', '50');
      if (filterType) params.append('type', filterType);
      if (searchQuery) params.append('search', searchQuery);
      params.append('sortOrder', sortOrder);
      
      const url = `http://localhost:3001/api/filings?${params.toString()}`;
      
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in.');
        }
        throw new Error(`Failed to fetch filings data: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setFilings(data.filings || []);
        setStats(data.statistics || []);
      } else {
        throw new Error(data.message || 'Failed to load filings data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load filings data');
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        `http://localhost:3001/api/filings/chart?timeRange=${timeRange}`,
        { headers }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Transform data for Recharts
          const transformed: any[] = [];
          const months = Object.keys(data.data).sort();
          
          months.forEach(month => {
            const entry: any = { month };
            Object.keys(data.data[month]).forEach(type => {
              entry[type] = data.data[month][type];
            });
            transformed.push(entry);
          });
          
          setChartData(transformed);
        }
      }
    } catch (err) {
      console.error('Error fetching chart data:', err);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getFilingTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      '13F': 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      '10-K': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      '10-Q': 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
      '8-K': 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
      'DEF 14A': 'bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200',
    };
    return colors[type] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
  };

  const uniqueFilingTypes = Array.from(new Set(filings.map(f => f.filingType))).sort();

  if (loading && filings.length === 0) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-white dark:bg-black pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 dark:bg-zinc-800 rounded w-64 mb-6"></div>
              <div className="h-96 bg-gray-200 dark:bg-zinc-800 rounded"></div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error && filings.length === 0) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-white dark:bg-black pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg p-4">
              {error}
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
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              SEC Filings
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Most recent SEC filings across all companies
            </p>
          </div>

          {/* Statistics Cards */}
          {stats.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {stats.map((stat) => (
                <div key={stat.filingType} className="bg-gray-100 dark:bg-zinc-900 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{stat.filingType}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stat.count.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Last: {formatDate(stat.lastFiling)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Filings Over Time
                </h2>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-600 rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1M">1 Month</option>
                  <option value="3M">3 Months</option>
                  <option value="6M">6 Months</option>
                  <option value="1Y">1 Year</option>
                  <option value="3Y">3 Years</option>
                  <option value="5Y">5 Years</option>
                </select>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#3f3f46' : '#e4e4e7'} />
                  <XAxis 
                    dataKey="month" 
                    stroke={isDarkMode ? '#6b7280' : '#9ca3af'}
                    tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke={isDarkMode ? '#6b7280' : '#9ca3af'}
                    tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
                      border: `1px solid ${isDarkMode ? '#3f3f46' : '#e4e4e7'}`,
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  {uniqueFilingTypes.map((type, index) => {
                    const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#ef4444', '#06b6d4', '#84cc16', '#f97316', '#a855f7'];
                    return (
                      <Bar
                        key={type}
                        dataKey={type}
                        stackId="filings"
                        fill={colors[index % colors.length]}
                      />
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Search and Filter Controls */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search:
              </label>
              <input
                type="text"
                placeholder="Search by company, symbol, or filing type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Filter by Type */}
            {uniqueFilingTypes.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filter by Filing Type:
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  {uniqueFilingTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort by Date:
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Filings Table */}
          <div className="bg-gray-100 dark:bg-zinc-900 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                <thead className="bg-gray-50 dark:bg-zinc-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Document
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-zinc-800">
                  {filings.map((filing) => (
                    <tr key={filing.id || `${filing.symbol}-${filing.filingDate}-${filing.accessionNumber}`} className="hover:bg-gray-50 dark:hover:bg-zinc-800">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatDate(filing.filingDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/asset/${filing.symbol}`}
                          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {filing.companyName}
                        </Link>
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          {filing.symbol} • {filing.category}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getFilingTypeColor(filing.filingType)}`}>
                          {filing.filingType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {filing.description || filing.formType || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {filing.documentUrl ? (
                          <a
                            href={filing.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-600">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

